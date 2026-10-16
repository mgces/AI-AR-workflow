import assert from 'node:assert/strict';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { afterCloseAndRemove } from '../../../test/test-cleanup.js';
import { startLocalCore } from '../src/server.js';

test('workspace API connects a remote code root, runs P0 preflight, and can create a remote workspace run', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-workspace-http-'));
  const sourceRoot = join(directory, 'openharmony');
  await mkdir(sourceRoot, { recursive: true });
  const runtimeRoot = fileURLToPath(new URL('../../../../', import.meta.url));
  const runtimeService = {
    starts: [],
    async start(input) { this.starts.push(input); return { run_id: input.runId, status: 'awaiting_host' }; },
    async status(runId) { return { run_id: runId, status: 'awaiting_host', tasks: [], events: [], observability: {} }; },
    async artifacts() { return { artifacts: [] }; },
    async artifactContent() { return { content: '' }; },
    listRuns() { return []; },
    close() {},
  };
  const core = await startLocalCore({
    runtimeRoot,
    workspaceRoot: sourceRoot,
    stateFile: join(directory, 'state.json'),
    token: 'test-local-core-token',
    localConsoleOptions: {
      runtimeService,
      workspaceExecutionFactory: ({ workspace }) => ({
        workspaceId: workspace.workspace_id,
        transport: workspace.transport,
        remoteRoot: workspace.code_root,
        deliveryAdapter: { transport: workspace.transport },
        codeAgentExecutor: { async run() { return { artifactRefs: ['reports/result.md'] }; } },
        async probe() {
          return {
            status: 'available', transport: workspace.transport, workspace_id: workspace.workspace_id,
            workspace_root: workspace.code_root, workspace_reachable: true, workspace_writable: true,
            workflow: { installed: true, id: 'ar-delivery', sha256: 'a'.repeat(64) },
            runtime: { python: { status: 'available' }, git: { status: 'available' }, node: { status: 'available' } },
            device_probe: { status: 'available', targets: [{ id: 'device-1', state: 'Connected' }] },
            capabilities: { workspace_access: 'remote_tools', build_execution: true, device_access: true }, errors: [],
          };
        },
        async preflight() { return { can_start_p0: true, status: 'ready', checks: [] }; },
      }),
    },
  });
  afterCloseAndRemove(t, () => core.close(), directory);
  const auth = { authorization: `Bearer ${core.token}` };

  const workspaces = await fetch(`${core.origin}/api/workspaces`, { headers: auth });
  assert.equal(workspaces.status, 200);
  assert.equal((await workspaces.json()).workspaces[0].code_root, sourceRoot);

  const example = await fetch(`${core.origin}/api/example/manifest`, { headers: auth });
  assert.equal(example.status, 200);
  assert.equal((await example.json()).workflow_id, 'ar-delivery');

  const configured = await fetch(`${core.origin}/api/workspaces/wsl-local`, {
    method: 'PUT', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ transport: 'wsl', target: 'Ubuntu-24.04', code_root: '/home/user/ohos' }),
  });
  assert.equal(configured.status, 200);
  assert.equal((await configured.json()).workspace.status, 'connector_required');

  const probe = await fetch(`${core.origin}/api/workspaces/wsl-local/probe`, {
    method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: '{}',
  });
  assert.equal(probe.status, 200);
  assert.equal((await probe.json()).status, 'available');

  const preflight = await fetch(`${core.origin}/api/ar/preflight`, {
    method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ workspace_id: 'wsl-local', environment: 'openharmony' }),
  });
  assert.equal(preflight.status, 200);
  assert.equal((await preflight.json()).can_start_p0, true);

  const start = await fetch(`${core.origin}/api/ar/runs`, {
    method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ workspace_id: 'wsl-local', workflow_id: 'ar-delivery', ar_text: 'test requirement' }),
  });
  assert.equal(start.status, 202);
  assert.equal(runtimeService.starts[0].repoRoot, '/home/user/ohos');
  assert.equal(runtimeService.starts[0].arText, 'test requirement');
});
