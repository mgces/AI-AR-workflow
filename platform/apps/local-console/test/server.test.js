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
  server = createLocalConsoleServer({
    repoRoot,
    smokeReportPath,
    stateFile: join(stateDir, 'state.json'),
    runtimeService: fakeArRuntime,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await rm(stateDir, { recursive: true, force: true });
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
    const claim = await request('/api/ar/runs/ar-http-test/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'environment-analyst', expected_revision: 1 }),
    });
    assert.equal(claim.response.status, 200);
    assert.equal(claim.json().phase, 'P0');
  });
});
