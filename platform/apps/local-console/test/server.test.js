import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test, before, after } from 'node:test';
import { createLocalConsoleServer } from '../src/server.js';

const repoRoot = new URL('../../../../', import.meta.url).pathname.replace(/\/$/, '');
const smokeReportPath = `${repoRoot}/products/dsh-cloud-implementation/smoke-test-20260912.json`;
let server;
let baseUrl;
let stateDir;
let ragDir;

const fakeArRuntime = {
  starts: [],
  async start(input) {
    this.starts.push(input);
    return { run_id: input.runId, status: 'awaiting_host', next: { phase: 'P0', role: 'environment-analyst' } };
  },
  async status(runId) {
    return {
      run_id: runId,
      workflow: 'delivery',
      revision: 1,
      status: 'awaiting_host',
      tasks: [{ task_id: `${runId}:P0:1`, phase: 'P0', role: 'environment-analyst', status: 'queued' }],
      events: [{ seq: 1, type: 'run.started', created_at: '2026-09-12T00:00:00.000Z', payload: {} }],
      observability: { stage_count: 1, human_intervention_count: 0, token_usage: { status: 'unknown' } },
    };
  },
  async artifacts(runId) { return { pipeline_dir: `/tmp/${runId}`, artifacts: [], complete: false }; },
  async artifactContent(runId, path) { return { run_id: runId, relative_path: path, role: 'report', content: 'full report' }; },
  async claim(input) { return { run_id: input.runId, task_id: `${input.runId}:P0:1`, phase: 'P0', role: input.role, revision: 1, attempt_id: 'attempt-1', lease_epoch: 1, task_credential: 'credential' }; },
  async context() { return { pipeline_dir: '/tmp/ar', phase: 'P0' }; },
  async submit() { return { status: 'validating' }; },
  async validate() { return { status: 'needs_input', consent_phase: 1 }; },
  async consent() { return { status: 'dispatch_needed', next: { phase: 'P2' } }; },
  async sync() { return { status: 'awaiting_host' }; },
  close() {},
};

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.text();
  return { response, body, json: () => JSON.parse(body) };
}

before(async () => {
  stateDir = await mkdtemp(join(tmpdir(), 'dsh-local-console-test-'));
  ragDir = await mkdtemp(join(repoRoot, '.dsh-test-rag-'));
  server = createLocalConsoleServer({
    repoRoot,
    smokeReportPath,
    stateFile: join(stateDir, 'state.json'),
    ragIndexFile: join(ragDir, 'index.json'),
    runtimeService: fakeArRuntime,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await rm(stateDir, { recursive: true, force: true });
  await rm(ragDir, { recursive: true, force: true });
});

describe('local console HTTP surface', () => {
  test('serves health and current topology status', async () => {
    const health = await request('/healthz');
    assert.equal(health.response.status, 200);
    assert.deepEqual(health.json(), { status: 'ok', service: 'dsh-local-console' });

    const status = await request('/api/status');
    assert.equal(status.response.status, 200);
    const value = status.json();
    assert.equal(value.implementation_status, 'local_foundation');
    assert.equal(value.environment.status, 'unknown');
    assert.equal(value.ssh_smoke.status, 'passed_with_scope_limits');
    assert.ok(['available', 'missing', 'probe_failed'].includes(value.agents.claude_code.status));
    assert.ok(['available', 'missing', 'probe_failed'].includes(value.agents.opencode.status));
  });

  test('persists CodeAgent selection and model through the local API', async () => {
    const initial = await request('/api/agent-settings');
    assert.equal(initial.response.status, 200);
    assert.equal(initial.json().settings.selected, 'claude-code');
    const saved = await request('/api/agent-settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ selected: 'opencode', model: 'anthropic/claude-sonnet-4-5' }),
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.json().settings.selected, 'opencode');
    assert.equal(saved.json().settings.model, 'anthropic/claude-sonnet-4-5');
    const status = await request('/api/status');
    assert.equal(status.json().agent_settings.selected, 'opencode');
    const forbidden = await request('/api/agent-settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'must-not-be-stored' }),
    });
    assert.equal(forbidden.response.status, 400);
    assert.equal(forbidden.json().error.code, 'settings_secret_forbidden');
  });

  test('validates draft and installable AR manifests without starting work', async () => {
    const draft = JSON.parse(await readFile(
      `${repoRoot}/docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json`,
    ));
    const draftResult = await request('/api/validate/manifest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ manifest: draft, installable: false }),
    });
    assert.equal(draftResult.response.status, 200);
    assert.equal(draftResult.json().valid, true);

    const installResult = await request('/api/validate/manifest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ manifest: draft, installable: true }),
    });
    assert.equal(installResult.response.status, 200);
    assert.equal(installResult.json().valid, false);
    assert.equal(installResult.json().error.code, 'manifest_digest_required');
  });

  test('renders the console and rejects unknown routes', async () => {
    const page = await request('/');
    assert.equal(page.response.status, 200);
    assert.match(page.body, /AR Runtime Debug Surface/);
    assert.match(page.body, /启动真实 AR run/);
    assert.match(page.body, /\/api\/ar\/runs/);
    assert.match(page.body, /\/api\/ar\/preflight/);
    assert.match(page.body, /id="preflight-ar-run"/);
    assert.match(page.body, /device_serial/);
    assert.match(page.body, /id="start-ar-run" disabled/);
    const missing = await request('/missing');
    assert.equal(missing.response.status, 404);
  });

  test('creates a persisted environment-preflight run and records human input', async () => {
    const created = await request('/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workflow_id: 'ar-delivery',
        workspace_id: 'wsl-local',
        source_root: repoRoot,
      }),
    });
    assert.equal(created.response.status, 202);
    const runId = created.json().run_id;

    let run;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      run = (await request(`/api/runs/${runId}`)).json();
      if (run.status !== 'running') break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(run.status, 'blocked');
    assert.equal(run.current_stage, 'P0');
    assert.equal(run.blockers[0].code, 'ENVIRONMENT_UNKNOWN');
    assert.equal(run.metrics.stage_elapsed_ms.P0 >= 0, true);

    const artifacts = await request(`/api/runs/${runId}/artifacts`);
    assert.equal(artifacts.response.status, 200);
    assert.equal(artifacts.json().artifacts[0].role, 'environment_report');

    const input = await request(`/api/runs/${runId}/inputs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'environment_confirmation', content: '当前目录只是平台仓库，暂不确认环境。' }),
    });
    assert.equal(input.response.status, 201);
    const afterInput = (await request(`/api/runs/${runId}`)).json();
    assert.equal(afterInput.metrics.human_input_count, 1);
    assert.equal(afterInput.inputs[0].content, '当前目录只是平台仓库，暂不确认环境。');

    const events = await request(`/api/runs/${runId}/events`);
    assert.equal(events.response.status, 200);
    assert.equal(events.json().events.some((event) => event.type === 'run.blocked'), true);

    const rag = await request('/api/rag/status');
    assert.equal(rag.response.status, 200);
    assert.equal(rag.json().mode, 'local_lexical');

    const debug = await request('/api/debug/status');
    assert.equal(debug.response.status, 200);
    assert.ok(['ready', 'partial', 'unavailable'].includes(debug.json().status));

    const invalidRagQuery = await request('/api/rag/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '!!! --- ???' }),
    });
    assert.equal(invalidRagQuery.response.status, 400);
    assert.equal(invalidRagQuery.json().error.code, 'rag_query_invalid');
  });

  test('exposes a persisted RAG model configuration entry without accepting secrets', async () => {
    const initial = await request('/api/rag/profile');
    assert.equal(initial.response.status, 200);
    assert.equal(initial.json().mode, 'local_lexical');
    const saved = await request('/api/rag/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'embedding_reranker', provider: 'qwen-compatible',
        embedding_model: 'qwen3-embedding', reranker_model: 'qwen3-reranker',
        endpoint: 'https://rag.example.test/v1',
      }),
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.json().model_profile.execution, 'planned');
    const forbidden = await request('/api/rag/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: 'must-not-be-stored' }),
    });
    assert.equal(forbidden.response.status, 400);
    assert.equal(forbidden.json().error.code, 'rag_model_profile_invalid');
  });

  test('persists an explicit environment branch without claiming a complete profile', async () => {
    const selection = await request('/api/projects/local-project/environment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ environment: 'harmonyos', component_type: 'system' }),
    });
    assert.equal(selection.response.status, 200);
    assert.equal(selection.json().project.environment, 'harmonyos');
    assert.equal(selection.json().project.component_type, 'system');
    assert.equal(selection.json().project.status, 'profile_incomplete');
  });

  test('keeps a run source root inside the registered workspace', async () => {
    const response = await request('/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workflow_id: 'ar-delivery', workspace_id: 'wsl-local', source_root: '/tmp' }),
    });
    assert.equal(response.response.status, 400);
    assert.equal(response.json().error.code, 'source_root_outside_workspace');
  });

  test('keeps AR pipeline, git and manifest paths inside the registered workspace', async () => {
    for (const field of ['pipeline_dir', 'git_dir', 'ar_path']) {
      const response = await request('/api/ar/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: 'wsl-local', run_id: `unsafe-${field}`, environment: 'openharmony', [field]: '/tmp/outside' }),
      });
      assert.equal(response.response.status, 400);
      assert.equal(response.json().error.code, 'path_outside_workspace');
    }
  });

  test('checks local AR prerequisites before creating a real scheduler run', async () => {
    const preflightCalls = [];
    const guardedRuntime = {
      ...fakeArRuntime,
      starts: [],
    };
    const guardedServer = createLocalConsoleServer({
      repoRoot,
      smokeReportPath,
      stateFile: join(stateDir, 'preflight-state.json'),
      runtimeService: guardedRuntime,
      preflight: async (input) => {
        preflightCalls.push(input);
        return {
          status: 'blocked',
          can_start_p0: false,
          can_complete_p8: false,
          checks: [{ id: 'codeagent_selected', status: 'blocked', reason: 'agent_unavailable' }],
          execution_plan: { agent_load_strategy: 'local_cli_path' },
        };
      },
    });
    await new Promise((resolve) => guardedServer.listen(0, '127.0.0.1', resolve));
    const guardedUrl = `http://127.0.0.1:${guardedServer.address().port}`;
    try {
      const preflight = await fetch(`${guardedUrl}/api/ar/preflight`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: 'wsl-local', environment: 'openharmony', agent: 'opencode' }),
      });
      assert.equal(preflight.status, 200);
      assert.equal(preflightCalls.length, 1);
      assert.equal(preflightCalls[0].environment, 'openharmony');

      const blocked = await fetch(`${guardedUrl}/api/ar/runs`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: 'wsl-local', run_id: 'preflight-guarded', environment: 'openharmony', agent: 'opencode' }),
      });
      assert.equal(blocked.status, 400);
      const value = await blocked.json();
      assert.equal(value.error.code, 'preflight_blocked');
      assert.equal(guardedRuntime.starts.length, 0);
    } finally {
      await new Promise((resolve, reject) => guardedServer.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test('does not replace an explicitly empty AR input with the bundled sample', async () => {
    const preflightCalls = [];
    const guardedServer = createLocalConsoleServer({
      repoRoot,
      smokeReportPath,
      stateFile: join(stateDir, 'empty-ar-state.json'),
      runtimeService: { ...fakeArRuntime, starts: [] },
      preflight: async (input) => {
        preflightCalls.push(input);
        return {
          status: 'blocked',
          can_start_p0: false,
          can_complete_p8: false,
          checks: [{ id: 'ar_input', status: 'blocked', reason: 'ar_input_empty' }],
          execution_plan: { agent_load_strategy: 'local_cli_path' },
        };
      },
    });
    await new Promise((resolve) => guardedServer.listen(0, '127.0.0.1', resolve));
    const guardedUrl = `http://127.0.0.1:${guardedServer.address().port}`;
    try {
      const response = await fetch(`${guardedUrl}/api/ar/runs`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspace_id: 'wsl-local', run_id: 'empty-ar-input', environment: 'openharmony', ar_text: '',
        }),
      });
      assert.equal(response.status, 400);
      assert.equal(preflightCalls.length, 1);
      assert.equal(preflightCalls[0].ar_text, '');
      assert.equal(preflightCalls[0].ar_path, undefined);
    } finally {
      await new Promise((resolve, reject) => guardedServer.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test('exposes the authoritative AR runtime and its worker operations', async () => {
    const started = await request('/api/ar/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        run_id: 'ar-http-test',
        workspace_id: 'wsl-local',
        repo_root: repoRoot,
        ar_text: '# AR HTTP test',
        environment: 'openharmony',
      }),
    });
    assert.equal(started.response.status, 202);
    assert.equal(started.json().run_id, 'ar-http-test');
    assert.equal(fakeArRuntime.starts.length > 0, true);

    const status = await request('/api/ar/runs/ar-http-test');
    assert.equal(status.response.status, 200);
    assert.equal(status.json().observability.stage_count, 1);
    const artifacts = await request('/api/ar/runs/ar-http-test/artifacts');
    assert.equal(artifacts.response.status, 200);
    const artifactContent = await request('/api/ar/runs/ar-http-test/artifacts/content?path=reports%2Fsummary.md');
    assert.equal(artifactContent.response.status, 200);
    assert.equal(artifactContent.json().content, 'full report');
    const claim = await request('/api/ar/runs/ar-http-test/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'environment-analyst', expected_revision: 1 }),
    });
    assert.equal(claim.response.status, 200);
    assert.equal(claim.json().phase, 'P0');
  });

  test('routes AR runs through the durable scheduler when one is configured', async () => {
    const schedulerCalls = [];
    const scheduler = {
      async start(input) {
        schedulerCalls.push(['start', input]);
        return { run_id: input.runId, status: 'awaiting_host', scheduler: { status: 'queued' } };
      },
      job(runId) { return { run_id: runId, status: 'running' }; },
      async consent(input) { schedulerCalls.push(['consent', input]); return { status: 'queued' }; },
      async cancel(runId, reason) { schedulerCalls.push(['cancel', runId, reason]); return { run_id: runId, status: 'cancelled' }; },
      listJobs() { return [{ run_id: 'scheduled-local', status: 'running' }]; },
    };
    const schedulerServer = createLocalConsoleServer({
      repoRoot,
      smokeReportPath,
      stateFile: join(stateDir, 'scheduler-state.json'),
      runtimeService: fakeArRuntime,
      scheduler,
    });
    let schedulerUrl;
    await new Promise((resolve) => schedulerServer.listen(0, '127.0.0.1', resolve));
    schedulerUrl = `http://127.0.0.1:${schedulerServer.address().port}`;
    try {
      const start = await fetch(`${schedulerUrl}/api/ar/runs`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: 'wsl-local', repo_root: repoRoot, run_id: 'scheduled-local', environment: 'openharmony' }),
      });
      assert.equal(start.status, 202);
      assert.equal((await start.json()).scheduler.status, 'queued');
      assert.equal(schedulerCalls[0][0], 'start');

      const job = await fetch(`${schedulerUrl}/api/ar/runs/scheduled-local/scheduler`);
      assert.equal(job.status, 200);
      assert.equal((await job.json()).status, 'running');

      const consent = await fetch(`${schedulerUrl}/api/ar/runs/scheduled-local/consent`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task_id: 'task-1', phase: 1, token: 'review-token', content: '继续', actor: 'reviewer' }),
      });
      assert.equal(consent.status, 200);
      assert.deepEqual(schedulerCalls[1], ['consent', {
        runId: 'scheduled-local', taskId: 'task-1', phase: 1, token: 'review-token',
        content: '继续', actor: 'reviewer',
      }]);

      const cancel = await fetch(`${schedulerUrl}/api/ar/runs/scheduled-local/actions`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: 'operator stop' }),
      });
      assert.equal(cancel.status, 200);
      assert.deepEqual(schedulerCalls[2], ['cancel', 'scheduled-local', 'operator stop']);
    } finally {
      await new Promise((resolve, reject) => schedulerServer.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
