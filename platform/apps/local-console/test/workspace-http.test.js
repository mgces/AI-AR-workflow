import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createLocalConsoleServer } from '../src/server.js';

const repositoryRoot = new URL('../../../../', import.meta.url).pathname.replace(/\/$/u, '');
let stateDirectory;
let server;
let origin;
const calls = { workspaces: [], preflights: [], starts: [] };

const runtimeService = {
  async start(input) { calls.starts.push(input); return { run_id: input.runId, status: 'awaiting_host' }; },
  async status(runId) { return { run_id: runId, status: 'awaiting_host', tasks: [], events: [], observability: {} }; },
  async artifacts() { return { artifacts: [] }; },
  async artifactContent() { return { content: '' }; },
  listRuns() { return []; },
  close() {},
};

before(async () => {
  stateDirectory = await mkdtemp(join(tmpdir(), 'dsh-workspace-http-'));
  server = createLocalConsoleServer({
    repoRoot: repositoryRoot,
    runtimeRoot: repositoryRoot,
    workspaceRoot: repositoryRoot,
    stateFile: join(stateDirectory, 'state.json'),
    agentSettingsFile: join(stateDirectory, 'agents.json'),
    runtimeService,
    workspaceExecutionFactory: (options) => {
      calls.workspaces.push(options.workspace);
      return {
        workspaceId: options.workspace.workspace_id,
        transport: options.workspace.transport,
        remoteRoot: options.workspace.code_root,
        deliveryAdapter: { transport: options.workspace.transport },
        codeAgentExecutor: { run: async () => ({ artifactRefs: ['reports/agent.md'] }) },
        async probe() {
          return {
            status: 'available', transport: options.workspace.transport,
            workspace_id: options.workspace.workspace_id,
            workspace_root: options.workspace.code_root,
            workspace_reachable: true, workspace_writable: true,
            workflow: { installed: true, id: 'ar-delivery', sha256: 'a'.repeat(64) },
            runtime: { python: { status: 'available' }, git: { status: 'available' }, node: { status: 'available' } },
            device_probe: { status: 'available', targets: [{ id: 'device-1', state: 'Connected' }] },
            capabilities: { workspace_access: 'remote_tools', build_execution: true, device_access: true, network_publish: false },
            errors: [],
          };
        },
        async preflight(input) {
          calls.preflights.push(input);
          return { status: 'ready', can_start_p0: true, checks: [], execution_plan: { transport: options.workspace.transport } };
        },
      };
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(stateDirectory, { recursive: true, force: true });
});

async function request(path, body = undefined, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(`${origin}${path}`, {
    method,
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
  return { response, value: await response.json() };
}

test('WSL/SSH workspace probe connects the transport and remote preflight gates run creation', async () => {
  const configured = await request('/api/workspaces/wsl-local', {
    transport: 'wsl', target: 'Ubuntu-24.04', code_root: '/home/builder/OpenHarmony',
  }, 'PUT');
  assert.equal(configured.response.status, 200);
  assert.equal(configured.value.workspace.transport, 'wsl');

  const probe = await request('/api/workspaces/wsl-local/probe', {});
  assert.equal(probe.response.status, 200);
  assert.equal(probe.value.status, 'available');
  assert.equal(probe.value.workflow.installed, true);
  assert.equal(calls.workspaces.length, 1);
  assert.equal(calls.workspaces[0].connection.target, 'Ubuntu-24.04');

  const preflight = await request('/api/ar/preflight', {
    workspace_id: 'wsl-local', repo_root: '/home/builder/OpenHarmony',
    ar_text: 'Fix the build failure', agent: 'claude-code',
  });
  assert.equal(preflight.response.status, 200);
  assert.equal(preflight.value.can_start_p0, true);
  assert.equal(calls.preflights[0].repo_root, '/home/builder/OpenHarmony');

  const started = await request('/api/ar/runs', {
    run_id: 'remote-run-1', workspace_id: 'wsl-local',
    repo_root: '/home/builder/OpenHarmony', ar_text: 'Fix the build failure',
    environment: 'openharmony', agent: 'claude-code',
  });
  assert.equal(started.response.status, 202);
  assert.equal(calls.starts[0].repoRoot, '/home/builder/OpenHarmony');
  assert.equal(calls.starts[0].arText, 'Fix the build failure');
  assert.equal(calls.starts[0].agent, 'claude-code');
});
