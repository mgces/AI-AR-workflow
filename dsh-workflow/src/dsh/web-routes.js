import { realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { posix } from 'node:path';

const MAX_BODY_BYTES = 512 * 1024;
const PREFIX = '/api/ohos-ar';

function json(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(value));
}

function connectorProbeView(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  // A probe may contain the user's absolute local mount path. Keep the cloud
  // projection useful for readiness and Agent discovery without echoing that
  // host-specific path into the DSH response or persisted run view.
  return {
    status: value.status ?? null,
    workspace_id: value.workspace_id ?? null,
    device_id: value.device_id ?? null,
    remote_root: value.remote_root ?? null,
    workspace_access: value.workspace_access ?? null,
    local_root_exists: value.local_root_exists ?? null,
    local_root_writable: value.local_root_writable ?? null,
    remote_workspace_reachable: value.remote_workspace_reachable ?? null,
    remote_workspace_writable: value.remote_workspace_writable ?? null,
    remote_tools: value.workspace_access === 'remote_tools' || value.remote_tools === true,
    reason: value.reason ?? null,
    agents: value.agents && typeof value.agents === 'object' ? structuredClone(value.agents) : null,
  };
}

function exportFilename(runId, format) {
  const safeId = String(runId).replace(/[^a-zA-Z0-9._-]/gu, '_').slice(0, 96) || 'run';
  return `ar-run-${safeId}.${format}`;
}

function downloadFilename(runId, artifact) {
  const candidate = typeof artifact?.filename === 'string' && artifact.filename.trim() !== ''
    ? artifact.filename.trim()
    : (typeof artifact?.relative_path === 'string' ? artifact.relative_path.split('/').at(-1) : 'artifact.bin');
  const safeName = candidate.replace(/[^a-zA-Z0-9._-]/gu, '_').slice(0, 160) || 'artifact.bin';
  const safeRunId = String(runId).replace(/[^a-zA-Z0-9._-]/gu, '_').slice(0, 96) || 'run';
  return `${safeRunId}-${safeName}`;
}

function verifiedArtifactBytes(artifact) {
  let bytes;
  if (artifact?.binary === true) {
    if (typeof artifact.content_base64 !== 'string' || artifact.content_base64.length === 0
        || artifact.content_base64.length > 8 * 1024 * 1024
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(artifact.content_base64)) {
      throw Object.assign(new Error('binary artifact bytes are unavailable'), { code: 'artifact_binary_unavailable' });
    }
    bytes = Buffer.from(artifact.content_base64, 'base64');
  } else if (typeof artifact?.content === 'string') {
    bytes = Buffer.from(artifact.content, 'utf8');
  } else {
    throw Object.assign(new Error('artifact content is unavailable'), { code: 'artifact_binary_unavailable' });
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (Number.isSafeInteger(artifact.size_bytes) && artifact.size_bytes >= 0 && artifact.size_bytes !== bytes.length) {
    throw Object.assign(new Error('artifact byte length does not match its declared metadata'), {
      code: 'artifact_integrity_mismatch',
      details: { expected_bytes: artifact.size_bytes, actual_bytes: bytes.length },
    });
  }
  if (artifact.sha256 !== undefined && artifact.sha256 !== null
      && (typeof artifact.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(artifact.sha256)
        || artifact.sha256 !== digest)) {
    throw Object.assign(new Error('artifact SHA-256 does not match its content'), {
      code: 'artifact_integrity_mismatch',
      details: { expected_sha256: typeof artifact.sha256 === 'string' ? artifact.sha256 : null, actual_sha256: digest },
    });
  }
  return { bytes, sha256: digest };
}

function csvCell(value) {
  let text;
  if (value === null || value === undefined) text = '';
  else if (typeof value === 'string') text = value;
  else if (typeof value === 'object') text = JSON.stringify(value);
  else text = String(value);
  // Spreadsheet clients may interpret cells beginning with these characters
  // as formulas. Preserve the value while making an exported audit safe to
  // open in Excel, LibreOffice, or a similar viewer.
  if (/^[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""').replace(/[\r\n]/gu, ' ')}"`;
}

function csvRunExport(payload) {
  const run = payload.run ?? {};
  const observation = payload.observability ?? {};
  const scheduler = payload.scheduler ?? {};
  const stages = Array.isArray(observation.stages) ? observation.stages : [];
  const humanInputs = Array.isArray(observation.human_inputs) ? observation.human_inputs : [];
  const humanInputContent = humanInputs.map((item) => item?.content ?? '').filter(Boolean).join('\n');
  const headers = [
    'run_id', 'status', 'workflow', 'environment_profile', 'stage', 'stage_status',
    'elapsed_ms', 'wall_ms', 'human_wait_ms', 'effective_elapsed_ms',
    'codeagent_duration_ms', 'total_tokens', 'human_intervention_count',
    'human_wait_count', 'human_wait_open_count', 'gate_pass_count', 'stage_completion_count',
    'run_success_count', 'run_success_rate', 'raw_gate_fail_count',
    'normalized_gate_failure_count', 'execution_failure_count', 'human_input_count',
    'human_input_content', 'failure_count', 'artifact_count',
    'scheduler_status', 'exported_at',
  ];
  const common = [
    run.run_id, run.status, run.workflow, run.environment_profile,
    null, null, null, null, null, null, null, null,
    observation.human_intervention_count ?? 0, observation.human_wait_count ?? 0,
    observation.human_wait_open_count ?? 0, observation.gate_pass_count ?? 0,
    observation.stage_completion_count ?? 0, observation.run_success_count ?? observation.success_count ?? 0,
    observation.run_success_rate ?? null, observation.raw_gate_fail_count ?? 0,
    observation.normalized_gate_failure_count ?? 0, observation.execution_failure_count ?? 0,
    humanInputs.length, humanInputContent,
    observation.failure_count ?? 0, payload.artifacts?.artifacts?.length ?? 0,
    scheduler.status, payload.exported_at,
  ];
  const rows = stages.length > 0 ? stages.map((stage) => [
    ...common.slice(0, 4), stage.phase, stage.status, stage.elapsed_ms,
    stage.wall_ms ?? stage.elapsed_ms, stage.human_wait_ms, stage.effective_elapsed_ms,
    stage.codeagent_duration_ms, stage.token_usage?.total_tokens ?? null, ...common.slice(12),
  ]) : [common];
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function exportJsonValue(payload, includeInputs) {
  if (includeInputs) return payload;
  const value = structuredClone(payload);
  if (value.observability && Array.isArray(value.observability.human_inputs)) {
    value.observability.human_inputs = value.observability.human_inputs.map((item) => ({
      ...item,
      content: '[redacted by export request]',
    }));
  }
  if (Array.isArray(value.events)) {
    value.events = value.events.map((event) => event?.type === 'human.input_recorded'
      ? { ...event, payload: { ...(event.payload ?? {}), content: '[redacted by export request]' } }
      : event);
  }
  return value;
}

async function collectRunExport({ service, scheduler, runId, includeInputs = true }) {
  const run = await service.status(runId, 0);
  const artifacts = service.artifacts
    ? await service.artifacts(runId)
    : { pipeline_dir: run.pipeline_dir ?? null, artifacts: [], complete: false };
  const payload = {
    export_schema_version: 1,
    exported_at: new Date().toISOString(),
    run,
    observability: run.observability ?? null,
    artifacts,
    events: Array.isArray(run.events) ? run.events : [],
    scheduler: scheduler?.job ? scheduler.job(runId) : (run.scheduler ?? null),
  };
  return exportJsonValue(payload, includeInputs);
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

function remoteWorkspacePath(root, value, label) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  if (typeof root !== 'string' || !posix.isAbsolute(root)) {
    throw Object.assign(new Error('registered remote workspace root must be an absolute POSIX path'), {
      code: 'remote_workspace_invalid', details: { label: 'remoteRoot' },
    });
  }
  if (value.includes('\\') || value.includes('\0')) {
    throw Object.assign(new Error(`${label} contains an invalid remote path character`), {
      code: 'remote_workspace_invalid', details: { label },
    });
  }
  const normalizedRoot = posix.normalize(root);
  const candidate = posix.normalize(posix.isAbsolute(value)
    ? value
    : posix.join(normalizedRoot, value));
  const rootPrefix = normalizedRoot === '/' ? '/' : `${normalizedRoot}/`;
  if (candidate !== normalizedRoot && !candidate.startsWith(rootPrefix)) {
    throw Object.assign(new Error(`${label} must stay inside the registered remote workspace`), {
      code: 'remote_workspace_outside_root', details: { label, root: normalizedRoot, path: candidate },
    });
  }
  return candidate;
}

function normalizeRemoteDefaultArPath(root, value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\\') || value.includes('\0')) {
    throw Object.assign(new Error('remoteDefaultArPath must be a valid relative or absolute POSIX path'), {
      code: 'remote_workspace_invalid', details: { label: 'remoteDefaultArPath' },
    });
  }
  const trimmed = value.trim();
  // Keep relative defaults relative to the run's selected repo_root. This is
  // required when remoteRoot is a parent directory containing multiple
  // projects; resolving it at route construction would point at the wrong
  // project. Absolute defaults are validated once against remoteRoot.
  return isAbsolute(trimmed) ? remoteWorkspacePath(root, trimmed, 'remoteDefaultArPath') : trimmed;
}

async function realPathWithMissingLeaf(candidate) {
  let current = resolve(candidate);
  const missing = [];
  while (true) {
    try {
      const existing = await realpath(current);
      return resolve(existing, ...missing.reverse());
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const parent = resolve(current, '..');
      if (parent === current) throw error;
      missing.push(current.slice(parent.length + 1));
      current = parent;
    }
  }
}

async function workspacePath(root, value, label) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  let rootReal;
  try {
    rootReal = await realpath(root);
  } catch (error) {
    throw Object.assign(new Error('configured DSH workspace does not exist'), {
      code: 'workspace_unconfigured',
      details: { root, cause: error.message },
    });
  }
  const candidate = resolve(isAbsolute(value) ? value : resolve(root, value));
  let candidateReal;
  try {
    candidateReal = await realPathWithMissingLeaf(candidate);
  } catch (error) {
    throw Object.assign(new Error(`${label} cannot be resolved safely`), {
      code: 'path_outside_workspace',
      details: { label, path: value, cause: error.message },
    });
  }
  if (!inside(rootReal, candidateReal)) {
    throw Object.assign(new Error(`${label} must stay inside the configured DSH workspace`), {
      code: 'path_outside_workspace',
      details: { label, path: value, workspace: rootReal },
    });
  }
  return candidateReal;
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
    // Preserve an explicit null path when inline AR text was supplied. Using
    // `??` here would silently reintroduce the host sample after preflight.
    arPath: hasOwn(body, 'ar_path') ? body.ar_path : defaults.defaultArPath,
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
    publication: body.publication,
    idempotencyKey: body.idempotency_key,
  };
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function optionalBodyText(body, key) {
  if (!hasOwn(body, key)) return null;
  const value = body[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  return value;
}

function nonEmptyBodyPath(body, key) {
  const value = optionalBodyText(body, key);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
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
  remoteDefaultArPath = null,
  workspaceId = 'wsl-local',
  workflowId = 'ar-delivery',
  subagents = null,
  codeAgents = null,
  scheduler = null,
  processSupervisor = null,
  rag = null,
  debug = null,
  remoteRoot = null,
  remoteMode = false,
  connector = null,
  connectorWorkspaceId = null,
  workspaceGateway = null,
  preflight = null,
} = {}) {
  if (!service) throw new TypeError('service is required');
  const registeredRemoteRoot = remoteRoot === null || remoteRoot === undefined
    ? null : remoteWorkspacePath(remoteRoot, remoteRoot, 'remoteRoot');
  if (remoteMode === true && !registeredRemoteRoot) {
    throw new TypeError('remoteRoot is required when remoteMode is enabled');
  }
  const isConnector = connector !== null && connector !== undefined;
  const isRemote = remoteMode === true || registeredRemoteRoot !== null;
  const workspaceMode = isConnector ? 'local_connector' : isRemote ? 'workspace_gateway' : 'local';
  const defaults = {
    repoRoot: isRemote ? registeredRemoteRoot : (repoRoot ? resolve(repoRoot) : null),
    defaultArPath,
    runtimeDefaultArPath: isRemote
      ? normalizeRemoteDefaultArPath(registeredRemoteRoot, remoteDefaultArPath)
      : defaultArPath ? defaultsPath(repoRoot, defaultArPath) : null,
  };
  let debugSnapshot = null;
  let debugSnapshotAt = 0;
  const readDebugStatus = async ({ refresh = false } = {}) => {
    if (!debug?.status) return { state: 'unavailable', mode: 'debug-surface', reason: 'debug service unavailable' };
    if (!refresh && debugSnapshot && Date.now() - debugSnapshotAt < 1000) return debugSnapshot;
    debugSnapshot = await debug.status();
    debugSnapshotAt = Date.now();
    return debugSnapshot;
  };
  const readProcessSnapshot = async ({ operationId = null, runId = null, limit = 200 } = {}) => {
    if (!processSupervisor?.snapshot) {
      return {
        durable: false,
        generated_at: new Date().toISOString(),
        counts: { starting: 0, running: 0, unknown: 0, completed: 0, failed: 0, cancelled: 0 },
        operations: [],
      };
    }
    return await processSupervisor.snapshot({
      limit,
      ...(operationId ? { operationId } : {}),
      ...(runId ? { runId } : {}),
    });
  };
  const readConnectorStatus = async ({ probe = false } = {}) => {
    if (!isConnector) return { enabled: false, workspace_id: null, workspaces: [] };
    let probeResult = null;
    if (probe) {
      if (typeof connector.probeWorkspace === 'function') {
        probeResult = await connector.probeWorkspace(connectorWorkspaceId, { timeoutMs: 30_000 });
      } else if (typeof connector.request === 'function') {
        probeResult = await connector.request(connectorWorkspaceId, {
          kind: 'probe', payload: { workspace_id: connectorWorkspaceId },
        }, { timeoutMs: 30_000 });
      }
    }
    const snapshot = typeof connector.snapshot === 'function' ? await connector.snapshot() : {};
    return {
      ...(snapshot && typeof snapshot === 'object' ? snapshot : {}),
      ...(probeResult && typeof probeResult === 'object' ? { last_probe: connectorProbeView(probeResult) } : {}),
      enabled: true,
      workspace_id: connectorWorkspaceId,
    };
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
      if (req.method === 'GET' && url.pathname === `${PREFIX}/healthz`) {
        json(res, 200, {
          status: 'ok',
          service: 'dsh-ohos-delivery',
          workspace_mode: workspaceMode,
        });
        return;
      }
      if (req.method === 'GET' && url.pathname === `${PREFIX}/overview`) {
        const codeagentSnapshot = codeAgents?.snapshot
          ? await codeAgents.snapshot()
          : null;
        const connectorStatus = await readConnectorStatus();
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
          workspace_mode: workspaceMode,
          workspace_gateway: isRemote
            ? { ...(workspaceGateway ?? {}), enabled: workspaceGateway?.enabled === true, registered_root: registeredRemoteRoot }
            : { ...(workspaceGateway ?? {}), enabled: false },
          connector: connectorStatus,
          preflight_endpoint: `${PREFIX}/preflight`,
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
          scheduler: scheduler?.listJobs
            ? { enabled: true, jobs: scheduler.listJobs() }
            : { enabled: false, jobs: [] },
          process_supervisor: await readProcessSnapshot(),
          rag: rag?.status ? await rag.status() : { state: 'unavailable', mode: 'disabled' },
          debug: await readDebugStatus({ refresh: true }),
        });
        return;
      }
      if (req.method === 'GET' && url.pathname === `${PREFIX}/connector`) {
        json(res, 200, await readConnectorStatus());
        return;
      }
      if (req.method === 'POST' && url.pathname === `${PREFIX}/connector/probe`) {
        if (!isConnector) {
          json(res, 200, { enabled: false, workspace_id: null, status: 'disabled' });
          return;
        }
        json(res, 200, await readConnectorStatus({ probe: true }));
        return;
      }
      if ((req.method === 'GET' || req.method === 'POST') && url.pathname === `${PREFIX}/preflight`) {
        const body = req.method === 'POST' ? await readJson(req) : {};
        const environment = body.environment ?? url.searchParams.get('environment') ?? null;
        const componentType = body.component_type ?? url.searchParams.get('component_type') ?? null;
        const deviceType = body.device_type ?? url.searchParams.get('device_type') ?? null;
        const deviceSerial = body.device_serial ?? url.searchParams.get('device_serial') ?? null;
        const agent = body.agent ?? url.searchParams.get('agent') ?? null;
        const model = body.model ?? url.searchParams.get('model') ?? null;
        const publication = body.publication ?? null;
        const repoRoot = body.repo_root ?? url.searchParams.get('repo_root') ?? null;
        const arPath = body.ar_path ?? url.searchParams.get('ar_path') ?? null;
        const arText = body.ar_text ?? null;
        if (typeof preflight === 'function') {
          json(res, 200, await preflight({
            environment,
            componentType,
            deviceType,
            deviceSerial,
            agent,
            model,
            publication,
            repoRoot,
            arPath,
            arText,
          }));
        } else {
          // Embedders that do not provide a host probe still get a truthful
          // response instead of an empty panel. The authoritative P0 remains
          // the final source of truth.
          const connector = workspaceMode === 'local_connector' ? await readConnectorStatus() : null;
          const connectorRemoteTools = connector?.last_probe?.workspace_access === 'remote_tools'
            || connector?.workspaces?.some((item) => item?.workspace_id === connectorWorkspaceId
              && item?.capabilities?.workspace_access === 'remote_tools');
          json(res, 200, {
            schema_version: 1,
            status: 'blocked',
            can_start_p0: false,
            can_complete_p8: false,
            checks: [{
              id: 'preflight_provider', label: '宿主前置检查', status: 'blocked',
              required_for: ['P0', 'P8'], reason: 'preflight_provider_unconfigured',
            }],
            execution_plan: {
              workspace_mode: workspaceMode,
              source_root: defaults.repoRoot,
              codeagent_host: workspaceMode === 'local_connector' ? 'user_connector_host' : isRemote ? 'ssh_code_host' : 'dsh_host',
              agent_load_strategy: workspaceMode === 'local_connector' ? 'connector_local_agent' : isRemote ? 'gateway_registered_profile' : 'local_cli_path',
              agent_profile_id: null,
              agent_auth_source: workspaceMode === 'local_connector' ? 'user_connector_native_credentials' : isRemote ? 'ssh_code_host_native_credentials' : 'dsh_host_environment_or_cli_store',
              edit_strategy: workspaceMode === 'local_connector'
                ? (connectorRemoteTools ? 'connector_remote_tools_mcp' : 'connector_sshfs_mount')
                : isRemote ? 'remote_codeagent_profile' : 'local_cli',
            },
          });
        }
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
      if (req.method === 'GET' && url.pathname === `${PREFIX}/processes`) {
        const rawLimit = url.searchParams.get('limit');
        const limit = rawLimit === null ? 200 : Number(rawLimit);
        if (!Number.isSafeInteger(limit) || limit < 1 || limit > 2000) {
          throw Object.assign(new Error('process snapshot limit must be between 1 and 2000'), {
            code: 'supervisor_input_invalid',
          });
        }
        const operationId = url.searchParams.get('operation_id');
        if (operationId !== null && operationId.trim() === '') {
          throw Object.assign(new Error('operation_id must not be empty'), { code: 'supervisor_input_invalid' });
        }
        const runId = url.searchParams.get('run_id');
        if (runId !== null && runId.trim() === '') {
          throw Object.assign(new Error('run_id must not be empty'), { code: 'supervisor_input_invalid' });
        }
        json(res, 200, await readProcessSnapshot({ limit, operationId, runId }));
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
      if (url.pathname === `${PREFIX}/rag/status` && req.method === 'GET') {
        if (!rag?.status) throw Object.assign(new Error('RAG service is unavailable'), { code: 'rag_unavailable' });
        json(res, 200, await rag.status());
        return;
      }
      if (url.pathname === `${PREFIX}/rag/index` && req.method === 'POST') {
        if (!rag?.refresh) throw Object.assign(new Error('RAG service is unavailable'), { code: 'rag_unavailable' });
        json(res, 200, await rag.refresh());
        return;
      }
      if (url.pathname === `${PREFIX}/rag/profile` && req.method === 'GET') {
        if (!rag?.profile) throw Object.assign(new Error('RAG model configuration is unavailable'), { code: 'rag_unavailable' });
        json(res, 200, await rag.profile());
        return;
      }
      if (url.pathname === `${PREFIX}/rag/profile` && req.method === 'PUT') {
        if (!rag?.updateProfile) throw Object.assign(new Error('RAG model configuration is unavailable'), { code: 'rag_unavailable' });
        json(res, 200, await rag.updateProfile(await readJson(req)));
        return;
      }
      if (url.pathname === `${PREFIX}/rag/search` && req.method === 'POST') {
        if (!rag?.search) throw Object.assign(new Error('RAG service is unavailable'), { code: 'rag_unavailable' });
        const body = await readJson(req);
        json(res, 200, await rag.search(body.query));
        return;
      }
      if (url.pathname === `${PREFIX}/debug/status` && req.method === 'GET') {
        if (!debug?.status) throw Object.assign(new Error('device and artifact debugging is unavailable'), { code: 'debug_unavailable' });
        json(res, 200, await readDebugStatus());
        return;
      }
      if (url.pathname === `${PREFIX}/debug/scan` && req.method === 'POST') {
        if (!debug?.scan) throw Object.assign(new Error('device and artifact debugging is unavailable'), { code: 'debug_unavailable' });
        debugSnapshot = await debug.scan();
        debugSnapshotAt = Date.now();
        json(res, 200, debugSnapshot);
        return;
      }
      if (req.method === 'GET' && url.pathname === `${PREFIX}/runs`) {
        json(res, 200, {
          runs: service.listRuns?.() ?? [],
          scheduler: scheduler?.listJobs
            ? { enabled: true, jobs: scheduler.listJobs() }
            : { enabled: false, jobs: [] },
        });
        return;
      }
      if (req.method === 'POST' && url.pathname === `${PREFIX}/runs`) {
        const body = await readJson(req);
        const hasArText = hasOwn(body, 'ar_text');
        const arText = optionalBodyText(body, 'ar_text');
        const arPath = nonEmptyBodyPath(body, 'ar_path');
        const repoRootInput = nonEmptyBodyPath(body, 'repo_root');
        // An explicitly supplied blank ar_text is an invalid input, not a
        // signal to silently fall back to a host-local sample file.
        const effectiveDefaultArPath = hasArText ? null : defaults.runtimeDefaultArPath;
        const selectedCodeAgent = codeAgents?.resolveSelected
          ? await codeAgents.resolveSelected(body.agent, {
              requireDispatchable: true,
              ...(body.model ? { model: body.model } : {}),
            })
          : {
              id: body.agent ?? 'claude-code',
              name: body.agent ?? 'Claude Code',
              available: true,
            };
        if (defaults.repoRoot === null) {
          throw Object.assign(new Error('a configured DSH workspace is required before starting a run'), {
            code: 'workspace_unconfigured',
          });
        }
        // The browser rechecks this just before submit, but the REST endpoint
        // must enforce the same boundary for other DSH clients and stale UI
        // sessions.  P4/P6/P8 facts remain authoritative in their gates; this
        // check only prevents a known P0-dispatch failure from being queued.
        if (typeof preflight === 'function') {
          const preflightResult = await preflight({
            environment: body.environment ?? null,
            componentType: body.component_type ?? null,
            deviceType: body.device_type ?? null,
            deviceSerial: body.device_serial ?? null,
            publication: body.publication ?? null,
            agent: selectedCodeAgent.id,
            model: body.model ?? selectedCodeAgent.model ?? null,
            repoRoot: repoRootInput ?? defaults.repoRoot,
            arPath: arPath ?? effectiveDefaultArPath,
            arText,
          });
          if (preflightResult?.can_start_p0 !== true) {
            const blocked = (preflightResult?.checks ?? [])
              .filter((item) => ['blocked', 'failed'].includes(item.status))
              .map((item) => `${item.label ?? item.id}: ${item.reason ?? '需要处理'}`);
            throw Object.assign(new Error(`P0 前置检查未通过${blocked.length > 0 ? `：${blocked.join('；')}` : ''}`), {
              code: 'preflight_blocked',
              details: {
                status: preflightResult?.status ?? 'blocked',
                checks: preflightResult?.checks ?? [],
                execution_plan: preflightResult?.execution_plan ?? null,
              },
            });
          }
        }
        const requestedRoot = isRemote
          ? remoteWorkspacePath(registeredRemoteRoot, repoRootInput ?? defaults.repoRoot, 'repo_root')
          : await workspacePath(defaults.repoRoot, repoRootInput ?? defaults.repoRoot, 'repo_root');
        const requestedArPath = arPath ?? (hasArText ? null : defaults.runtimeDefaultArPath);
        const runtimeArPath = requestedArPath
          ? (isRemote
            ? remoteWorkspacePath(requestedRoot, requestedArPath, 'ar_path')
            : await workspacePath(requestedRoot, requestedArPath, 'ar_path'))
          : requestedArPath;
        const runtimePipelineDir = body.pipeline_dir
          ? (isRemote
            ? remoteWorkspacePath(requestedRoot, body.pipeline_dir, 'pipeline_dir')
            : await workspacePath(requestedRoot, body.pipeline_dir, 'pipeline_dir'))
          : undefined;
        const runtimeGitDir = body.git_dir
          ? (isRemote
            ? remoteWorkspacePath(requestedRoot, body.git_dir, 'git_dir')
            : await workspacePath(requestedRoot, body.git_dir, 'git_dir'))
          : undefined;
        const startInput = mapStart({
          ...body,
          ar_text: arText,
          repo_root: requestedRoot,
          ar_path: runtimeArPath,
          pipeline_dir: runtimePipelineDir,
          git_dir: runtimeGitDir,
          agent: selectedCodeAgent.id,
        }, {
          ...defaults,
          defaultArPath: defaults.runtimeDefaultArPath,
          selectedAgent: selectedCodeAgent.id,
          selectedModel: selectedCodeAgent.model || undefined,
        });
        const result = scheduler?.start
          ? await scheduler.start(startInput)
          : await service.start(startInput);
        json(res, 202, { ...result, codeagent: selectedCodeAgent });
        return;
      }

      const schedulerRunId = routeId(url.pathname, 'scheduler');
      if (schedulerRunId !== null && req.method === 'GET') {
        if (!scheduler?.job) {
          json(res, 404, { error: { code: 'scheduler_unavailable', message: 'scheduler is unavailable' } });
          return;
        }
        const job = scheduler.job(schedulerRunId);
        if (!job) {
          throw Object.assign(new Error(`scheduler job ${schedulerRunId} does not exist`), {
            code: 'scheduler_job_not_found',
          });
        }
        json(res, 200, job);
        return;
      }

      const exportRunId = routeId(url.pathname, 'export') ?? routeId(url.pathname, 'exports');
      if (exportRunId !== null && (req.method === 'GET' || req.method === 'POST')) {
        const body = req.method === 'POST' ? await readJson(req) : {};
        const requestedFormat = url.searchParams.get('format') ?? body.format ?? 'json';
        if (!['json', 'csv'].includes(requestedFormat)) {
          throw Object.assign(new Error('export format must be json or csv'), { code: 'invalid_input' });
        }
        const includeInputsValue = url.searchParams.get('include_inputs') ?? body.include_inputs;
        const includeInputs = includeInputsValue === undefined
          || includeInputsValue === null
          || includeInputsValue === true
          || includeInputsValue === 'true'
          || includeInputsValue === '1';
        const payload = await collectRunExport({ service, scheduler, runId: exportRunId, includeInputs });
        const filename = exportFilename(exportRunId, requestedFormat);
        if (requestedFormat === 'csv') {
          res.writeHead(200, {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': `attachment; filename="${filename}"`,
            'cache-control': 'no-store',
          });
          res.end(csvRunExport(payload));
        } else {
          res.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
            'content-disposition': `attachment; filename="${filename}"`,
            'cache-control': 'no-store',
          });
          res.end(JSON.stringify(payload));
        }
        return;
      }

      const runId = routeId(url.pathname);
      if (runId !== null && req.method === 'GET') {
        const cursor = Number(url.searchParams.get('cursor') ?? 0);
        json(res, 200, await service.status(runId, Number.isFinite(cursor) ? cursor : 0));
        return;
      }
      const artifactDownloadRunId = routeId(url.pathname, 'artifacts/download');
      if (artifactDownloadRunId !== null && req.method === 'GET') {
        if (!service.artifactContent) {
          throw Object.assign(new Error('artifact content is unavailable'), { code: 'runtime_tool_unavailable' });
        }
        const requestedPath = url.searchParams.get('path');
        if (!requestedPath) throw Object.assign(new Error('artifact path is required'), { code: 'invalid_input' });
        const artifact = await service.artifactContent(artifactDownloadRunId, requestedPath);
        const verified = verifiedArtifactBytes(artifact);
        res.writeHead(200, {
          'content-type': artifact.content_type ?? 'application/octet-stream',
          'content-disposition': `attachment; filename="${downloadFilename(artifactDownloadRunId, artifact)}"`,
          'content-length': String(verified.bytes.length),
          etag: `"${verified.sha256}"`,
          'x-content-sha256': verified.sha256,
          'cache-control': 'no-store',
        });
        res.end(verified.bytes);
        return;
      }
      const artifactContentRunId = routeId(url.pathname, 'artifacts/content');
      if (artifactContentRunId !== null && req.method === 'GET') {
        if (!service.artifactContent) {
          throw Object.assign(new Error('artifact content is unavailable'), { code: 'runtime_tool_unavailable' });
        }
        const requestedPath = url.searchParams.get('path');
        if (!requestedPath) throw Object.assign(new Error('artifact path is required'), { code: 'invalid_input' });
        json(res, 200, await service.artifactContent(artifactContentRunId, requestedPath));
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
        const consentInput = { runId: consentRunId, taskId: body.task_id,
          phase: body.phase, token: body.token };
        if (body.content !== undefined) consentInput.content = body.content;
        if (body.actor !== undefined) consentInput.actor = body.actor;
        if (body.kind !== undefined) consentInput.kind = body.kind;
        json(res, 200, await (scheduler?.consent
          ? scheduler.consent(consentInput)
          : service.consent(consentInput)));
        return;
      }
      const inputRunId = routeId(url.pathname, 'inputs');
      if (inputRunId !== null && req.method === 'POST') {
        if (!service.recordHumanInput) {
          throw Object.assign(new Error('human input recording is unavailable'), {
            code: 'runtime_tool_unavailable',
          });
        }
        const body = await readJson(req);
        json(res, 201, await service.recordHumanInput({
          runId: inputRunId,
          taskId: body.task_id,
          phase: body.phase,
          kind: body.kind,
          category: body.category,
          actor: body.actor,
          idempotencyKey: body.idempotency_key,
          content: body.content,
        }));
        return;
      }
      const resumeRunId = routeId(url.pathname, 'resume');
      if (resumeRunId !== null && req.method === 'POST') {
        if (!scheduler?.resume) {
          throw Object.assign(new Error('scheduler is unavailable'), { code: 'scheduler_unavailable' });
        }
        json(res, 200, await scheduler.resume(resumeRunId));
        return;
      }
      const cancelRunId = routeId(url.pathname, 'cancel');
      if (cancelRunId !== null && req.method === 'POST') {
        if (!scheduler?.cancel) {
          throw Object.assign(new Error('scheduler is unavailable'), { code: 'scheduler_unavailable' });
        }
        const body = await readJson(req);
        json(res, 200, await scheduler.cancel(cancelRunId, body.reason));
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
        'path_outside_workspace', 'workspace_unconfigured',
        'preflight_blocked',
        'run_not_found', 'runtime_tool_unavailable', 'invalid_input',
        'scheduler_job_not_found', 'scheduler_unavailable', 'scheduler_timeout',
        'input_content_required', 'input_content_too_large',
        'artifact_not_found',
        'rag_unavailable', 'rag_query_required', 'rag_query_too_long',
        'rag_query_invalid', 'rag_model_profile_invalid', 'rag_profile_busy',
        'remote_workspace_invalid', 'remote_workspace_outside_root',
        'connector_offline', 'connector_disconnected', 'connector_timeout', 'connector_aborted',
        'connector_workspace_invalid', 'connector_workspace_outside_root', 'connector_workspace_unavailable',
        'connector_agent_unavailable', 'connector_agent_unsupported', 'connector_agent_failed',
        'connector_command_invalid', 'connector_command_not_allowed', 'connector_remote_tools_config_invalid',
        'connector_remote_tools_unavailable', 'connector_codex_auth_copy_failed', 'connector_operation_in_progress',
        'connector_operation_unknown', 'connector_operation_replay_conflict', 'operation_replay_conflict', 'connector_operation_not_durable',
        'connector_operation_journal_corrupt', 'connector_operation_journal_missing',
        'connector_outbox_full', 'connector_outbox_load_failed', 'connector_hub_closed',
        'connector_pairing_config_invalid', 'connector_pairing_rejected',
        'supervisor_input_invalid',
        'debug_unavailable',
        'invalid_codeagent_settings'].includes(error?.code) ? 400
        : ['codeagent_adapter_unavailable', 'agent_artifacts_missing', 'rag_index_failed',
        'remote_profile_required', 'artifact_binary_unavailable', 'artifact_integrity_mismatch'].includes(error?.code) ? 422
          : ['rag_workspace_changed_during_index', 'rag_source_stale', 'source_changed', 'resource_busy',
            'resource_lock_reconcile_failed', 'idempotency_conflict', 'pipeline_conflict'].includes(error?.code) ? 409
            : ['rag_model_response_invalid'].includes(error?.code) ? 502
            : ['gateway_signature_unconfigured', 'gateway_network_error', 'gateway_timeout',
              'rag_model_request_failed'].includes(error?.code) ? 503 : 500;
      json(res, status, { error: errorBody(error) });
    }
  };
}

export function registerDeliveryWebRoutes(ctx, options) {
  const handler = createDeliveryRouteHandler(options);
  return ctx.webServer.register({ kind: 'prefix', path: PREFIX, handler });
}

export { PREFIX };
