import { isAbsolute, relative, resolve, sep } from 'node:path';

const MAX_BODY_BYTES = 512 * 1024;
const PREFIX = '/api/ohos-ar';

function json(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw Object.assign(new Error('request body too large'), { code: 'body_too_large' });
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('request body must be valid JSON'), { code: 'invalid_json' });
  }
}

function errorBody(error) {
  return {
    code: error?.code ?? 'ar_route_error',
    message: error instanceof Error ? error.message : String(error),
    details: error?.details ?? {},
  };
}

function inside(root, candidate) {
  const remainder = relative(root, candidate);
  return remainder === '' || (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !remainder.startsWith(sep));
}

function defaultsPath(root, path) {
  return root && !isAbsolute(path) ? resolve(root, path) : path;
}

function routeId(pathname, suffix = '') {
  const pattern = suffix
    ? new RegExp(`^${PREFIX}/runs/([^/]+)/${suffix}$`)
    : new RegExp(`^${PREFIX}/runs/([^/]+)$`);
  const match = pathname.match(pattern);
  return match?.[1] === undefined ? null : decodeURIComponent(match[1]);
}

function mapStart(body, defaults) {
  return {
    runId: body.run_id,
    inputRef: body.input_ref ?? `local://dsh/ar/${body.run_id ?? 'new'}`,
    arText: body.ar_text,
    arPath: body.ar_path ?? defaults.defaultArPath,
    pipelineDir: body.pipeline_dir,
    repoRoot: body.repo_root ?? defaults.repoRoot,
    environment: body.environment,
    componentType: body.component_type,
    deviceType: body.device_type,
    deviceSerial: body.device_serial,
    gitDir: body.git_dir,
    buildTarget: body.build_target,
    part: body.part,
    baseCommit: body.base_commit,
    agent: body.agent ?? defaults.selectedAgent,
    model: body.model ?? defaults.selectedModel,
    confirmDefaults: body.confirm_defaults,
    skills: body.skills,
    idempotencyKey: body.idempotency_key,
  };
}

/**
 * Create the authenticated REST surface used by the official DSH browser
 * extension. The browser and this route live on the same DSH Web Server; the
 * local-console server is not part of this request path.
 */
export function createDeliveryRouteHandler({
  service,
  connection,
  repoRoot = null,
  defaultArPath = null,
  workspaceId = 'wsl-local',
  workflowId = 'ar-delivery',
  subagents = null,
  codeAgents = null,
} = {}) {
  if (!service) throw new TypeError('service is required');
  const defaults = {
    repoRoot: repoRoot ? resolve(repoRoot) : null,
    defaultArPath,
    runtimeDefaultArPath: defaultArPath && defaultsPath(repoRoot, defaultArPath),
  };
  return async function deliveryRouteHandler(req, res) {
    const rejection = connection?.requestRejection?.(req);
    if (rejection !== undefined) {
      res.writeHead(rejection);
      res.end(rejection === 401 ? 'unauthorized' : 'forbidden');
      return;
    }
    const url = new URL(req.url ?? '/', 'http://dsh.local');
    if (!url.pathname.startsWith(PREFIX)) {
      json(res, 404, { error: { code: 'not_found', message: 'route not found' } });
      return;
    }
    try {
      if (req.method === 'GET' && url.pathname === `${PREFIX}/overview`) {
        const codeagentSnapshot = codeAgents?.snapshot
          ? await codeAgents.snapshot()
          : null;
        const fallbackClaudeCode = {
          id: 'claude-code',
          name: 'Claude Code',
          kind: 'official-provider',
          provider: 'claude-code',
          tool: 'subagent_claude_code',
          available: typeof subagents?.getProvider === 'function'
            ? subagents.getProvider('claude-code') !== undefined
            : false,
          status: 'unknown',
          auth: 'native-claude-settings-or-explicit-provider-env',
        };
        json(res, 200, {
          service: 'dsh-ohos-delivery',
          source: 'official-dsh-web',
          workflow_id: workflowId,
          workspace_id: workspaceId,
          repo_root: defaults.repoRoot,
          default_ar_path: defaults.defaultArPath,
          host: {
            binding_id: service.hostBindingId ?? null,
            kind: service.hostKind ?? null,
            version: service.hostVersion ?? null,
          },
          codeagents: codeagentSnapshot ?? {
            selected: 'claude-code',
            selected_config: fallbackClaudeCode,
            options: [fallbackClaudeCode],
            claude_code: fallbackClaudeCode,
          },
          runs: service.listRuns?.() ?? [],
        });
        return;
      }
      if (req.method === 'GET' && url.pathname === `${PREFIX}/codeagents`) {
        if (!codeAgents?.snapshot) {
          json(res, 200, {
            selected: 'claude-code',
            options: [],
            codeagents: {},
          });
          return;
        }
        json(res, 200, await codeAgents.snapshot());
        return;
      }
      if (req.method === 'POST' && url.pathname === `${PREFIX}/codeagents/refresh`) {
        if (!codeAgents?.refresh) {
          throw Object.assign(new Error('CodeAgent discovery is unavailable'), {
            code: 'codeagent_settings_unavailable',
          });
        }
        json(res, 200, await codeAgents.refresh());
        return;
      }
      if (req.method === 'PUT' && url.pathname === `${PREFIX}/codeagents`) {
        if (!codeAgents?.update) {
          throw Object.assign(new Error('CodeAgent settings are unavailable'), {
            code: 'codeagent_settings_unavailable',
          });
        }
        json(res, 200, await codeAgents.update(await readJson(req)));
        return;
      }
      if (req.method === 'GET' && url.pathname === `${PREFIX}/runs`) {
        json(res, 200, { runs: service.listRuns?.() ?? [] });
        return;
      }
      if (req.method === 'POST' && url.pathname === `${PREFIX}/runs`) {
        const body = await readJson(req);
        const selectedCodeAgent = codeAgents?.resolveSelected
          ? await codeAgents.resolveSelected(body.agent, { requireDispatchable: true })
          : {
              id: body.agent ?? 'claude-code',
              name: body.agent ?? 'Claude Code',
              available: true,
            };
        const requestedRoot = resolve(body.repo_root ?? defaults.repoRoot ?? process.cwd());
        if (defaults.repoRoot !== null && !inside(defaults.repoRoot, requestedRoot)) {
          throw Object.assign(new Error('repo_root must stay inside the configured DSH workspace'), {
            code: 'source_root_outside_workspace',
          });
        }
        const requestedArPath = body.ar_path ?? defaults.defaultArPath;
        const runtimeArPath = requestedArPath && !isAbsolute(requestedArPath) && inside(requestedRoot, resolve(requestedRoot, requestedArPath))
          ? resolve(requestedRoot, requestedArPath)
          : requestedArPath;
        const result = await service.start(mapStart({ ...body, repo_root: requestedRoot, ar_path: runtimeArPath, agent: selectedCodeAgent.id }, {
          ...defaults,
          defaultArPath: defaults.runtimeDefaultArPath,
          selectedAgent: selectedCodeAgent.id,
          selectedModel: selectedCodeAgent.model || undefined,
        }));
        json(res, 202, { ...result, codeagent: selectedCodeAgent });
        return;
      }

      const runId = routeId(url.pathname);
      if (runId !== null && req.method === 'GET') {
        const cursor = Number(url.searchParams.get('cursor') ?? 0);
        json(res, 200, await service.status(runId, Number.isFinite(cursor) ? cursor : 0));
        return;
      }
      const artifactRunId = routeId(url.pathname, 'artifacts');
      if (artifactRunId !== null && req.method === 'GET') {
        json(res, 200, await service.artifacts(artifactRunId));
        return;
      }
      const eventRunId = routeId(url.pathname, 'events');
      if (eventRunId !== null && req.method === 'GET') {
        const cursor = Number(url.searchParams.get('cursor') ?? 0);
        const status = await service.status(eventRunId, Number.isFinite(cursor) ? cursor : 0);
        json(res, 200, { run_id: eventRunId, events: status.events, next_cursor: status.next_cursor });
        return;
      }

      const claimRunId = routeId(url.pathname, 'claim');
      if (claimRunId !== null && req.method === 'POST') {
        const body = await readJson(req);
        json(res, 200, await service.claim({ runId: claimRunId, role: body.role,
          expectedRevision: body.expected_revision, contextId: body.context_id }));
        return;
      }
      const contextRunId = routeId(url.pathname, 'context');
      if (contextRunId !== null && req.method === 'POST') {
        json(res, 200, await service.context(await readJson(req)));
        return;
      }
      const heartbeatRunId = routeId(url.pathname, 'heartbeat');
      if (heartbeatRunId !== null && req.method === 'POST') {
        json(res, 200, await service.heartbeat(await readJson(req)));
        return;
      }
      const submitRunId = routeId(url.pathname, 'submit');
      if (submitRunId !== null && req.method === 'POST') {
        const body = await readJson(req);
        json(res, 200, await service.submit({ attemptId: body.attempt_id, leaseEpoch: body.lease_epoch,
          taskCredential: body.task_credential, revision: body.revision,
          artifactRefs: body.artifact_refs, summary: body.summary }));
        return;
      }
      const releaseRunId = routeId(url.pathname, 'release');
      if (releaseRunId !== null && req.method === 'POST') {
        const body = await readJson(req);
        json(res, 200, await service.release({ attemptId: body.attempt_id, leaseEpoch: body.lease_epoch,
          taskCredential: body.task_credential, reason: body.reason, artifactRefs: body.artifact_refs }));
        return;
      }
      const validateRunId = routeId(url.pathname, 'validate');
      if (validateRunId !== null && req.method === 'POST') {
        const body = await readJson(req);
        json(res, 200, await service.validate({ runId: validateRunId, taskId: body.task_id,
          expectedRevision: body.expected_revision }));
        return;
      }
      const consentRunId = routeId(url.pathname, 'consent');
      if (consentRunId !== null && req.method === 'POST') {
        const body = await readJson(req);
        json(res, 200, await service.consent({ runId: consentRunId, taskId: body.task_id,
          phase: body.phase, token: body.token }));
        return;
      }
      const syncRunId = routeId(url.pathname, 'sync');
      if (syncRunId !== null && req.method === 'POST') {
        json(res, 200, await service.sync(syncRunId));
        return;
      }
      json(res, 404, { error: { code: 'not_found', message: 'AR route not found' } });
    } catch (error) {
      const status = ['body_too_large', 'invalid_json', 'source_root_outside_workspace',
        'run_not_found', 'runtime_tool_unavailable', 'invalid_input',
        'invalid_codeagent_settings'].includes(error?.code) ? 400
        : error?.code === 'codeagent_adapter_unavailable' ? 422 : 500;
      json(res, status, { error: errorBody(error) });
    }
  };
}

export function registerDeliveryWebRoutes(ctx, options) {
  const handler = createDeliveryRouteHandler(options);
  return ctx.webServer.register({ kind: 'prefix', path: PREFIX, handler });
}

export { PREFIX };
