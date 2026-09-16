import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import test from 'node:test';
import { createDeliveryRouteHandler } from '../src/dsh/web-routes.js';

function request(method, url, body = null, headers = {}) {
  const chunks = body === null ? [] : [Buffer.from(JSON.stringify(body))];
  return {
    method,
    url,
    headers,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    writeHead(status, headers = {}) {
      this.statusCode = status;
      this.headers = headers;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value = '') {
      this.body = value;
    },
  };
}

test('official DSH AR route exposes overview and delegates run creation', async () => {
  const calls = [];
  const service = {
    listRuns() { return [{ run_id: 'ar-1', status: 'running' }]; },
    async start(input) { calls.push(input); return { run_id: 'ar-2', status: 'accepted' }; },
  };
  const handler = createDeliveryRouteHandler({
    service,
    repoRoot: process.cwd(),
    defaultArPath: 'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json',
    connection: { requestRejection: () => undefined },
    subagents: { getProvider(name) { return name === 'claude-code' ? {} : undefined; } },
    codeAgents: {
      async snapshot() {
        return {
          selected: 'claude-code',
          selected_config: { id: 'claude-code', name: 'Claude Code', available: true },
          options: [{ id: 'claude-code', name: 'Claude Code', available: true }],
          claude_code: { id: 'claude-code', name: 'Claude Code', available: true, tool: 'subagent_claude_code' },
        };
      },
      async update(input) { return { selected: input.selected, options: [] }; },
      async refresh() { return { selected: 'claude-code', options: [], refreshed: true }; },
      async resolveSelected(requested) { return { id: requested ?? 'claude-code', name: requested ?? 'Claude Code', available: true }; },
    },
  });

  const overviewResponse = response();
  await handler(request('GET', '/api/ohos-ar/overview'), overviewResponse);
  assert.equal(overviewResponse.statusCode, 200);
  const overview = JSON.parse(overviewResponse.body);
  assert.deepEqual(overview.runs, [{ run_id: 'ar-1', status: 'running' }]);
  assert.equal(overview.codeagents.claude_code.available, true);
  assert.equal(overview.codeagents.claude_code.tool, 'subagent_claude_code');

  const healthResponse = response();
  await handler(request('GET', '/api/ohos-ar/healthz'), healthResponse);
  assert.equal(healthResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(healthResponse.body), {
    status: 'ok', service: 'dsh-ohos-delivery', workspace_mode: 'local',
  });

  const settingsResponse = response();
  await handler(request('PUT', '/api/ohos-ar/codeagents', { selected: 'opencode' }), settingsResponse);
  assert.equal(settingsResponse.statusCode, 200);
  assert.equal(JSON.parse(settingsResponse.body).selected, 'opencode');

  const refreshResponse = response();
  await handler(request('POST', '/api/ohos-ar/codeagents/refresh'), refreshResponse);
  assert.equal(refreshResponse.statusCode, 200);
  assert.equal(JSON.parse(refreshResponse.body).refreshed, true);

  const startResponse = response();
  await handler(request('POST', '/api/ohos-ar/runs', {
    input_ref: 'local://ar/test',
    environment: 'openharmony',
    component_type: 'system',
    publication: {
      backend: 'gitcode',
      repo_slug: 'mgce1/AI-AR-workflow',
      branch: 'codex/ar-run-42',
      base: 'main',
      issue: '#42',
      local_review_report: 'reports/local-review.json',
      pr_review_report: 'reports/pr-review.json',
    },
    idempotency_key: 'test-start',
  }), startResponse);
  assert.equal(startResponse.statusCode, 202);
  assert.equal(JSON.parse(startResponse.body).run_id, 'ar-2');
  assert.equal(calls[0].repoRoot, process.cwd());
  assert.equal(calls[0].arPath, resolve(process.cwd(), 'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json'));
  assert.equal(calls[0].agent, 'claude-code');
  assert.deepEqual(calls[0].publication, {
    backend: 'gitcode',
    repo_slug: 'mgce1/AI-AR-workflow',
    branch: 'codex/ar-run-42',
    base: 'main',
    issue: '#42',
    local_review_report: 'reports/local-review.json',
    pr_review_report: 'reports/pr-review.json',
  });
  assert.equal(JSON.parse(startResponse.body).codeagent.id, 'claude-code');
});

test('official DSH AR route exposes and refreshes the local Connector status', async () => {
  const calls = [];
  const connector = {
    snapshot() {
      return { transport: 'websocket', workspaces: [{ workspace_id: 'workspace-1', connected: true }] };
    },
    async probeWorkspace(workspaceId, options) {
      calls.push([workspaceId, options]);
      return { status: 'ready', workspace_id: workspaceId, local_root_writable: true };
    },
  };
  const handler = createDeliveryRouteHandler({
    service: { listRuns() { return []; } },
    connector,
    connectorWorkspaceId: 'workspace-1',
    remoteRoot: '/srv/project',
    remoteMode: true,
    connection: { requestRejection: () => undefined },
  });
  const status = response();
  await handler(request('GET', '/api/ohos-ar/connector'), status);
  assert.equal(status.statusCode, 200);
  assert.equal(JSON.parse(status.body).workspace_id, 'workspace-1');
  const probe = response();
  await handler(request('POST', '/api/ohos-ar/connector/probe'), probe);
  assert.equal(probe.statusCode, 200);
  const probeBody = JSON.parse(probe.body);
  assert.equal(probeBody.last_probe.status, 'ready');
  assert.equal('local_root' in probeBody.last_probe, false);
  assert.equal('local_root_realpath' in probeBody.last_probe, false);
  assert.deepEqual(calls, [['workspace-1', { timeoutMs: 30_000 }]]);
});

test('official DSH AR route exposes the prerequisite and execution plan before starting a run', async () => {
  const expected = {
    schema_version: 1,
    status: 'ready_for_p0',
    can_start_p0: true,
    can_complete_p8: false,
    execution_plan: { workspace_mode: 'workspace_gateway', codeagent_host: 'ssh_code_host' },
    checks: [{ id: 'workspace_binding', status: 'pass' }],
  };
  const handler = createDeliveryRouteHandler({
    service: { listRuns() { return []; } },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
    preflight: async (input) => {
      assert.equal(input.environment, 'openharmony');
      assert.equal(input.componentType, null);
      return expected;
    },
  });
  const result = response();
  await handler(request('GET', '/api/ohos-ar/preflight?environment=openharmony'), result);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), expected);
});

test('preflight keeps HarmonyOS component selection explicit at the route boundary', async () => {
  let received;
  const handler = createDeliveryRouteHandler({
    service: { listRuns() { return []; } },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
    preflight: async (input) => {
      received = input;
      assert.equal(input.environment, 'harmonyos');
      assert.equal(input.componentType, 'chip');
      assert.equal(input.deviceType, 'rk3568');
      assert.equal(input.agent, 'opencode');
      assert.equal(input.model, 'qwen3-coder');
      return { status: 'blocked', can_start_p0: false, can_complete_p8: false, checks: [], execution_plan: {} };
    },
  });
  const result = response();
  await handler(request('POST', '/api/ohos-ar/preflight', {
    environment: 'harmonyos', component_type: 'chip', device_type: 'rk3568',
    agent: 'opencode', model: 'qwen3-coder',
  }), result);
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).status, 'blocked');
  assert.equal(received.deviceSerial, null);
});

test('run creation rechecks P0 prerequisites and refuses a blocked preflight', async () => {
  let started = false;
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async start() { started = true; return { run_id: 'must-not-start' }; },
    },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
    preflight: async (input) => {
      assert.equal(input.environment, 'openharmony');
      return {
        status: 'blocked', can_start_p0: false, can_complete_p8: false,
        checks: [{ id: 'workspace_binding', label: '代码工作区绑定', status: 'blocked', reason: 'workspace_unreachable' }],
      };
    },
    codeAgents: {
      async resolveSelected() { return { id: 'claude-code', name: 'Claude Code', available: true, dispatchable: true }; },
    },
  });
  const result = response();
  await handler(request('POST', '/api/ohos-ar/runs', {
    input_ref: 'local://ar/preflight-blocked', environment: 'openharmony', idempotency_key: 'preflight-blocked',
  }), result);
  assert.equal(result.statusCode, 400);
  assert.equal(JSON.parse(result.body).error.code, 'preflight_blocked');
  assert.equal(started, false);
});

test('run creation treats explicitly blank AR text as invalid instead of using the host sample', async () => {
  let preflightInput;
  let started = false;
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async start() { started = true; return { run_id: 'must-not-start' }; },
    },
    repoRoot: process.cwd(),
    defaultArPath: 'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json',
    connection: { requestRejection: () => undefined },
    codeAgents: {
      async resolveSelected() { return { id: 'claude-code', name: 'Claude Code', available: true, dispatchable: true }; },
    },
    preflight: async (input) => {
      preflightInput = input;
      return {
        status: 'blocked', can_start_p0: false, can_complete_p8: false,
        checks: [{ id: 'ar_input', label: 'AR 需求输入', status: 'blocked', reason: 'ar_input_required' }],
      };
    },
  });
  const result = response();
  await handler(request('POST', '/api/ohos-ar/runs', {
    input_ref: 'local://ar/blank', environment: 'openharmony', ar_text: ' \n\t', idempotency_key: 'blank-ar',
  }), result);
  assert.equal(result.statusCode, 400);
  assert.equal(JSON.parse(result.body).error.code, 'preflight_blocked');
  assert.equal(preflightInput.arPath, null);
  assert.equal(preflightInput.arText, ' \n\t');
  assert.equal(started, false);
});

test('official DSH AR route exposes a redacted process-supervisor snapshot', async () => {
  const calls = [];
  const processSupervisor = {
    snapshot(options) {
      calls.push(options);
      return {
        durable: true,
        generated_at: '2026-09-15T00:00:00.000Z',
        counts: { starting: 0, running: 1, unknown: 0, completed: 0, failed: 0, cancelled: 0 },
        operations: [{ operation_id: 'codeagent-attempt-1', state: 'running', pid: 1234 }],
      };
    },
  };
  const handler = createDeliveryRouteHandler({
    service: { listRuns() { return []; } },
    processSupervisor,
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });

  const overview = response();
  await handler(request('GET', '/api/ohos-ar/overview'), overview);
  assert.equal(JSON.parse(overview.body).process_supervisor.durable, true);
  assert.equal(JSON.parse(overview.body).process_supervisor.operations[0].pid, 1234);

  const snapshot = response();
  await handler(request('GET', '/api/ohos-ar/processes?limit=25&operation_id=codeagent-attempt-1'), snapshot);
  assert.equal(snapshot.statusCode, 200);
  assert.equal(JSON.parse(snapshot.body).counts.running, 1);
  assert.deepEqual(calls.at(-1), { limit: 25, operationId: 'codeagent-attempt-1' });
});

test('official DSH AR process snapshot can be filtered to one run', async () => {
  const calls = [];
  const handler = createDeliveryRouteHandler({
    service: { listRuns() { return []; } },
    processSupervisor: {
      snapshot(options) {
        calls.push(options);
        return { durable: true, generated_at: '2026-09-15T00:00:00.000Z', counts: {}, operations: [] };
      },
    },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });
  const result = response();
  await handler(request('GET', '/api/ohos-ar/processes?limit=25&run_id=run-42'), result);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(calls, [{ limit: 25, runId: 'run-42' }]);
});

test('official DSH AR route delegates browser authentication before serving data', async () => {
  const handler = createDeliveryRouteHandler({
    service: { listRuns() { throw new Error('must not run'); } },
    connection: { requestRejection: () => 401 },
  });
  const result = response();
  await handler(request('GET', '/api/ohos-ar/overview'), result);
  assert.equal(result.statusCode, 401);
});

test('official DSH AR route maps idempotency conflicts to a client retry status', async () => {
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async start() {
        throw Object.assign(new Error('The idempotency key was already used with different input.'), {
          code: 'idempotency_conflict',
        });
      },
    },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
    codeAgents: {
      async resolveSelected() {
        return { id: 'claude-code', name: 'Claude Code', available: true, dispatchable: true };
      },
    },
  });
  const result = response();
  await handler(request('POST', '/api/ohos-ar/runs', {
    input_ref: 'local://ar/idempotency',
    environment: 'openharmony',
    idempotency_key: 'conflict-start',
  }), result);
  assert.equal(result.statusCode, 409);
  assert.equal(JSON.parse(result.body).error.code, 'idempotency_conflict');
});

test('official DSH AR route maps Workspace Gateway operation replay conflicts to a client retry status', async () => {
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async sync() {
        throw Object.assign(new Error('The operation id was already used with a different request.'), {
          code: 'operation_replay_conflict',
        });
      },
    },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });
  const result = response();
  await handler(request('POST', '/api/ohos-ar/runs/run-1/sync'), result);
  assert.equal(result.statusCode, 400);
  assert.equal(JSON.parse(result.body).error.code, 'operation_replay_conflict');
});

test('official DSH AR route rejects AR, pipeline and git paths outside the workspace', async () => {
  const service = {
    listRuns() { return []; },
    async start() { throw new Error('must not start an unsafe run'); },
  };
  const handler = createDeliveryRouteHandler({
    service,
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
    codeAgents: {
      async resolveSelected() { return { id: 'claude-code', name: 'Claude Code', available: true }; },
    },
  });

  for (const body of [
    { ar_path: '/etc/passwd' },
    { pipeline_dir: '/tmp/dsh-pipeline' },
    { git_dir: '/tmp/source' },
  ]) {
    const result = response();
    await handler(request('POST', '/api/ohos-ar/runs', {
      input_ref: 'local://ar/unsafe', environment: 'openharmony',
      idempotency_key: `unsafe-${Object.keys(body)[0]}`, ...body,
    }), result);
    assert.equal(result.statusCode, 400);
    assert.equal(JSON.parse(result.body).error.code, 'path_outside_workspace');
  }
});

test('official DSH AR route accepts a registered remote workspace without local filesystem access', async () => {
  const calls = [];
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async start(input) { calls.push(input); return { run_id: 'remote-run', status: 'accepted' }; },
    },
    remoteRoot: '/srv/project',
    defaultArPath: 'docs/ar.md',
    remoteMode: true,
    workspaceGateway: { enabled: true, base_url: 'https://gateway.internal' },
    connection: { requestRejection: () => undefined },
    codeAgents: {
      async resolveSelected() { return { id: 'opencode', name: 'OpenCode', available: true, dispatchable: true }; },
    },
  });
  const overview = response();
  await handler(request('GET', '/api/ohos-ar/overview'), overview);
  const overviewBody = JSON.parse(overview.body);
  assert.equal(overviewBody.workspace_mode, 'workspace_gateway');
  assert.equal(overviewBody.repo_root, '/srv/project');
  assert.equal(overviewBody.workspace_gateway.enabled, true);
  assert.equal(overviewBody.workspace_gateway.registered_root, '/srv/project');

  const started = response();
  await handler(request('POST', '/api/ohos-ar/runs', {
    input_ref: 'remote://ar/test', repo_root: '/srv/project', ar_path: 'docs/ar.md',
    pipeline_dir: 'specs/pipeline/remote-run', git_dir: '.git', environment: 'openharmony',
    idempotency_key: 'remote-start',
  }), started);
  assert.equal(started.statusCode, 202);
  assert.equal(calls[0].repoRoot, '/srv/project');
  assert.equal(calls[0].arPath, '/srv/project/docs/ar.md');
  assert.equal(calls[0].pipelineDir, '/srv/project/specs/pipeline/remote-run');
  assert.equal(calls[0].gitDir, '/srv/project/.git');

  const unsafe = response();
  await handler(request('POST', '/api/ohos-ar/runs', {
    input_ref: 'remote://ar/unsafe', repo_root: '/etc', environment: 'openharmony',
    idempotency_key: 'remote-unsafe',
  }), unsafe);
  assert.equal(unsafe.statusCode, 400);
  assert.equal(JSON.parse(unsafe.body).error.code, 'remote_workspace_outside_root');
});

test('remote route does not turn a local example AR path into a remote default', async () => {
  const preflightInputs = [];
  const starts = [];
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async start(input) { starts.push(input); return { run_id: 'remote-inline', status: 'accepted' }; },
    },
    remoteRoot: '/srv/workspaces',
    // This value is retained as display metadata for backwards-compatible
    // embedders, but must not be probed on the SSH host unless explicitly
    // configured as remoteDefaultArPath.
    defaultArPath: 'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json',
    remoteMode: true,
    connection: { requestRejection: () => undefined },
    preflight: async (input) => {
      preflightInputs.push(input);
      return { status: 'ready_for_p0', can_start_p0: true, can_complete_p8: false, checks: [], execution_plan: {} };
    },
    codeAgents: {
      async resolveSelected() { return { id: 'opencode', name: 'OpenCode', available: true, dispatchable: true }; },
    },
  });
  const result = response();
  await handler(request('POST', '/api/ohos-ar/runs', {
    input_ref: 'remote://ar/inline', repo_root: '/srv/workspaces/project',
    ar_text: '# Inline AR\n', environment: 'openharmony', idempotency_key: 'remote-inline',
  }), result);
  assert.equal(result.statusCode, 202);
  assert.equal(preflightInputs[0].arPath, null);
  assert.equal(preflightInputs[0].arText, '# Inline AR\n');
  assert.equal(starts[0].arPath, null);
  assert.equal(starts[0].arText, '# Inline AR\n');
  assert.equal(starts[0].repoRoot, '/srv/workspaces/project');
});

test('remote default AR paths stay relative to the selected project root', async () => {
  const preflightInputs = [];
  const starts = [];
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async start(input) { starts.push(input); return { run_id: 'remote-default', status: 'accepted' }; },
    },
    remoteRoot: '/srv/workspaces',
    remoteDefaultArPath: 'docs/AR.md',
    remoteMode: true,
    connection: { requestRejection: () => undefined },
    preflight: async (input) => {
      preflightInputs.push(input);
      return { status: 'ready_for_p0', can_start_p0: true, can_complete_p8: false, checks: [], execution_plan: {} };
    },
    codeAgents: {
      async resolveSelected() { return { id: 'opencode', name: 'OpenCode', available: true, dispatchable: true }; },
    },
  });
  const result = response();
  await handler(request('POST', '/api/ohos-ar/runs', {
    input_ref: 'remote://ar/default', repo_root: '/srv/workspaces/project',
    environment: 'openharmony', idempotency_key: 'remote-default',
  }), result);
  assert.equal(result.statusCode, 202);
  assert.equal(preflightInputs[0].arPath, 'docs/AR.md');
  assert.equal(starts[0].arPath, '/srv/workspaces/project/docs/AR.md');
});

test('official DSH AR route drives the durable scheduler and exposes job controls', async () => {
  const calls = [];
  const scheduler = {
    async start(input) {
      calls.push(['start', input]);
      return { run_id: 'ar-scheduled', status: 'accepted', scheduler: { status: 'queued' } };
    },
    job(runId) {
      calls.push(['job', runId]);
      return { run_id: runId, status: 'awaiting_consent' };
    },
    listJobs() {
      return [{ run_id: 'ar-scheduled', status: 'awaiting_consent' }];
    },
    async consent(input) {
      calls.push(['consent', input]);
      return { run_id: input.runId, status: 'dispatch_needed' };
    },
    async resume(runId) {
      calls.push(['resume', runId]);
      return { run_id: runId, status: 'queued' };
    },
    async cancel(runId, reason) {
      calls.push(['cancel', runId, reason]);
      return { run_id: runId, status: 'cancelled' };
    },
  };
  const service = {
    listRuns() { return []; },
    async start() { throw new Error('scheduler must own start'); },
  };
  const handler = createDeliveryRouteHandler({
    service,
    scheduler,
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
    codeAgents: {
      async resolveSelected() {
        return { id: 'codex', name: 'Codex', available: true, dispatchable: true };
      },
    },
  });

  const startResponse = response();
  await handler(request('POST', '/api/ohos-ar/runs', {
    input_ref: 'local://ar/scheduled',
    environment: 'openharmony',
    component_type: 'system',
    agent: 'codex',
    idempotency_key: 'schedule-start',
  }), startResponse);
  assert.equal(startResponse.statusCode, 202);
  assert.equal(JSON.parse(startResponse.body).scheduler.status, 'queued');
  assert.equal(calls[0][0], 'start');

  const jobResponse = response();
  await handler(request('GET', '/api/ohos-ar/runs/ar-scheduled/scheduler'), jobResponse);
  assert.equal(jobResponse.statusCode, 200);
  assert.equal(JSON.parse(jobResponse.body).status, 'awaiting_consent');

  const consentResponse = response();
  await handler(request('POST', '/api/ohos-ar/runs/ar-scheduled/consent', {
    task_id: 'task-1', phase: 'P0', token: 'opaque-token', content: '审核通过，继续执行。', actor: 'reviewer-1',
  }), consentResponse);
  assert.equal(consentResponse.statusCode, 200);
  assert.deepEqual(calls.find((entry) => entry[0] === 'consent'), [
    'consent', {
      runId: 'ar-scheduled', taskId: 'task-1', phase: 'P0', token: 'opaque-token',
      content: '审核通过，继续执行。', actor: 'reviewer-1',
    },
  ]);

  const resumeResponse = response();
  await handler(request('POST', '/api/ohos-ar/runs/ar-scheduled/resume'), resumeResponse);
  assert.equal(resumeResponse.statusCode, 200);
  assert.equal(JSON.parse(resumeResponse.body).status, 'queued');

  const cancelResponse = response();
  await handler(request('POST', '/api/ohos-ar/runs/ar-scheduled/cancel', { reason: 'operator stop' }), cancelResponse);
  assert.equal(cancelResponse.statusCode, 200);
  assert.equal(JSON.parse(cancelResponse.body).status, 'cancelled');

  const overviewResponse = response();
  await handler(request('GET', '/api/ohos-ar/overview'), overviewResponse);
  assert.deepEqual(JSON.parse(overviewResponse.body).scheduler.jobs, scheduler.listJobs());
});

test('official DSH AR route serves an authorized artifact body by relative path', async () => {
  const calls = [];
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async artifactContent(runId, path) {
        calls.push([runId, path]);
        return { run_id: runId, relative_path: path, role: 'report', content: 'full report' };
      },
    },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });
  const result = response();
  await handler(request('GET', '/api/ohos-ar/runs/run-1/artifacts/content?path=reports%2Flarge.txt'), result);
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).content, 'full report');
  assert.deepEqual(calls, [['run-1', 'reports/large.txt']]);
});

test('official DSH AR route downloads a binary artifact only after hash verification', async () => {
  const bytes = Buffer.from([0, 1, 2, 127, 255]);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const calls = [];
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async artifactContent(runId, path) {
        calls.push([runId, path]);
        return {
          run_id: runId, relative_path: path, filename: 'app.hap', role: 'evidence',
          binary: true, content_available: true, content_base64: bytes.toString('base64'),
          size_bytes: bytes.length, sha256: digest, content_type: 'application/octet-stream',
        };
      },
    },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });
  const result = response();
  await handler(request('GET', '/api/ohos-ar/runs/run-1/artifacts/download?path=evidence%2Fapp.hap'), result);
  assert.equal(result.statusCode, 200);
  assert.equal(result.headers['content-type'], 'application/octet-stream');
  assert.match(result.headers['content-disposition'], /app\.hap/u);
  assert.equal(result.headers.etag, `"${digest}"`);
  assert.deepEqual(result.body, bytes);
  assert.deepEqual(calls, [['run-1', 'evidence/app.hap']]);
});

test('official DSH AR route rejects a binary artifact with a malformed declared hash', async () => {
  const bytes = Buffer.from([0, 1, 2]);
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async artifactContent() {
        return {
          relative_path: 'evidence/app.hap', binary: true, content_available: true,
          content_base64: bytes.toString('base64'), size_bytes: bytes.length, sha256: 'not-a-sha256',
        };
      },
    },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });
  const result = response();
  await handler(request('GET', '/api/ohos-ar/runs/run-1/artifacts/download?path=evidence%2Fapp.hap'), result);
  assert.equal(result.statusCode, 422);
  assert.equal(JSON.parse(result.body).error.code, 'artifact_integrity_mismatch');
});

test('official DSH AR route exports an auditable run as JSON or CSV', async () => {
  const status = {
    run_id: 'run-1',
    status: 'completed',
    workflow: 'ar-delivery',
    environment_profile: 'openharmony/rk3568',
    observability: {
      human_intervention_count: 2,
      failure_count: 0,
      stages: [{
        phase: 'P0', status: 'passed', elapsed_ms: 1200,
        codeagent_duration_ms: 300, token_usage: { total_tokens: 42 },
      }],
      human_inputs: [{ content: '=reviewer-note', actor: 'reviewer-1' }],
    },
    events: [{ seq: 1, type: 'run.started', payload: { note: 'ok' } }],
    next_cursor: 1,
  };
  const artifacts = {
    artifacts: [{ relative_path: 'reports/result.json', sha256: 'a'.repeat(64), size_bytes: 12, role: 'report' }],
    complete: true,
  };
  const scheduler = { job(runId) { return { run_id: runId, status: 'completed', attempts: 1 }; } };
  const handler = createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async status(runId) { assert.equal(runId, 'run-1'); return status; },
      async artifacts(runId) { assert.equal(runId, 'run-1'); return artifacts; },
    },
    scheduler,
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });

  const jsonResponse = response();
  await handler(request('GET', '/api/ohos-ar/runs/run-1/export?format=json'), jsonResponse);
  assert.equal(jsonResponse.statusCode, 200);
  assert.match(jsonResponse.headers['content-type'], /application\/json/u);
  assert.match(jsonResponse.headers['content-disposition'], /ar-run-run-1\.json/u);
  const exported = JSON.parse(jsonResponse.body);
  assert.equal(exported.run.run_id, 'run-1');
  assert.equal(exported.observability.human_intervention_count, 2);
  assert.equal(exported.artifacts.artifacts[0].sha256, 'a'.repeat(64));
  assert.equal(exported.scheduler.attempts, 1);
  assert.equal(exported.export_schema_version, 1);

  const csvResponse = response();
  await handler(request('GET', '/api/ohos-ar/runs/run-1/export?format=csv'), csvResponse);
  assert.equal(csvResponse.statusCode, 200);
  assert.match(csvResponse.headers['content-type'], /text\/csv/u);
  assert.match(csvResponse.headers['content-disposition'], /ar-run-run-1\.csv/u);
  assert.match(csvResponse.body, /"run_id","status","workflow"/u);
  assert.match(csvResponse.body, /"human_wait_ms","effective_elapsed_ms","codeagent_duration_ms","total_tokens","human_intervention_count"/u);
  assert.match(csvResponse.body, /"human_wait_count","human_wait_open_count","gate_pass_count","stage_completion_count","run_success_count","run_success_rate"/u);
  assert.match(csvResponse.body, /'=?reviewer-note/u);

  const invalidResponse = response();
  await handler(request('GET', '/api/ohos-ar/runs/run-1/export?format=xml'), invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(JSON.parse(invalidResponse.body).error.code, 'invalid_input');
});

test('official DSH AR route exposes RAG status, indexing and workspace-scoped search', async () => {
  const calls = [];
  const rag = {
    status() { return { state: 'ready', mode: 'local_lexical', file_count: 3 }; },
    profile() { return { mode: 'local_lexical', execution: 'active' }; },
    async refresh() { calls.push(['index']); return { state: 'ready', file_count: 4 }; },
    async search(query) { calls.push(['search', query]); return { status: 'ready', query, results: [] }; },
    async updateProfile(input) { calls.push(['profile', input]); return { model_profile: { ...input, execution: 'planned' } }; },
  };
  const handler = createDeliveryRouteHandler({
    service: { listRuns() { return []; } },
    rag,
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });

  const overviewResponse = response();
  await handler(request('GET', '/api/ohos-ar/overview'), overviewResponse);
  assert.deepEqual(JSON.parse(overviewResponse.body).rag, rag.status());

  const statusResponse = response();
  await handler(request('GET', '/api/ohos-ar/rag/status'), statusResponse);
  assert.deepEqual(JSON.parse(statusResponse.body), rag.status());

  const indexResponse = response();
  await handler(request('POST', '/api/ohos-ar/rag/index'), indexResponse);
  assert.equal(indexResponse.statusCode, 200);
  assert.equal(JSON.parse(indexResponse.body).file_count, 4);

  const searchResponse = response();
  await handler(request('POST', '/api/ohos-ar/rag/search', { query: 'environment profile' }), searchResponse);
  assert.equal(searchResponse.statusCode, 200);
  assert.equal(JSON.parse(searchResponse.body).query, 'environment profile');
  assert.deepEqual(calls, [['index'], ['search', 'environment profile']]);

  const profileResponse = response();
  await handler(request('GET', '/api/ohos-ar/rag/profile'), profileResponse);
  assert.equal(profileResponse.statusCode, 200);
  assert.equal(JSON.parse(profileResponse.body).mode, 'local_lexical');
  const updateProfileResponse = response();
  await handler(request('PUT', '/api/ohos-ar/rag/profile', { mode: 'embedding_reranker', embedding_model: 'qwen3-embedding' }), updateProfileResponse);
  assert.equal(updateProfileResponse.statusCode, 200);
  assert.equal(JSON.parse(updateProfileResponse.body).model_profile.execution, 'planned');
  assert.deepEqual(calls.at(-1), ['profile', { mode: 'embedding_reranker', embedding_model: 'qwen3-embedding' }]);
});

test('official DSH AR route rejects RAG operations when the service is unavailable', async () => {
  const handler = createDeliveryRouteHandler({
    service: { listRuns() { return []; } },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });
  const statusResponse = response();
  await handler(request('GET', '/api/ohos-ar/rag/status'), statusResponse);
  assert.equal(statusResponse.statusCode, 400);
  assert.equal(JSON.parse(statusResponse.body).error.code, 'rag_unavailable');
});

test('official DSH AR route maps RAG model failures to actionable HTTP statuses', async () => {
  const makeHandler = (code) => createDeliveryRouteHandler({
    service: { listRuns() { return []; } },
    rag: { async search() { throw Object.assign(new Error(code), { code }); } },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });
  for (const [code, expectedStatus] of [
    ['rag_model_request_failed', 503],
    ['rag_model_response_invalid', 502],
  ]) {
    const result = response();
    await makeHandler(code)(request('POST', '/api/ohos-ar/rag/search', { query: 'environment' }), result);
    assert.equal(result.statusCode, expectedStatus);
    assert.equal(JSON.parse(result.body).error.code, code);
  }
});

test('official DSH AR route exposes read-only device and artifact debugging status', async () => {
  const calls = [];
  const debug = {
    async status() { calls.push('status'); return { status: 'partial', artifacts: [], device_probe: { status: 'missing' } }; },
    async scan() { calls.push('scan'); return { status: 'ready', artifacts: [{ relative_path: 'out/app.hap' }] }; },
  };
  const handler = createDeliveryRouteHandler({
    service: { listRuns() { return []; } },
    debug,
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
  });
  const overview = response();
  await handler(request('GET', '/api/ohos-ar/overview'), overview);
  assert.deepEqual(JSON.parse(overview.body).debug, await debug.status());
  const status = response();
  await handler(request('GET', '/api/ohos-ar/debug/status'), status);
  assert.equal(status.statusCode, 200);
  const scan = response();
  await handler(request('POST', '/api/ohos-ar/debug/scan'), scan);
  assert.equal(scan.statusCode, 200);
  assert.deepEqual(calls, ['status', 'status', 'scan']);
});

test('official DSH AR route maps remote execution configuration failures to actionable statuses', async () => {
  const makeHandler = (code) => createDeliveryRouteHandler({
    service: {
      listRuns() { return []; },
      async start() { throw Object.assign(new Error(code), { code }); },
    },
    repoRoot: process.cwd(),
    connection: { requestRejection: () => undefined },
    codeAgents: {
      async resolveSelected() { return { id: 'opencode', name: 'OpenCode', available: true, dispatchable: true }; },
    },
  });
  for (const [code, expectedStatus] of [
    ['remote_workspace_outside_root', 400],
    ['remote_profile_required', 422],
    ['gateway_signature_unconfigured', 503],
  ]) {
    const result = response();
    await makeHandler(code)(request('POST', '/api/ohos-ar/runs', {
      input_ref: `local://ar/${code}`,
      environment: 'openharmony',
      idempotency_key: `start-${code}`,
    }), result);
    assert.equal(result.statusCode, expectedStatus);
    assert.equal(JSON.parse(result.body).error.code, code);
  }
});
