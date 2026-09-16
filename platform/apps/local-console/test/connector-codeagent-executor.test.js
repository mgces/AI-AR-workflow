import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { join } from 'node:path';
import test from 'node:test';
import { ConnectorCodeAgentExecutor } from '../src/connector-codeagent-executor.js';
import { LocalCodeAgentExecutor } from '../src/codeagent-executor.js';
import { LocalConnectorAgentService } from '../src/connector-agent.js';
import { ConnectorWebSocketHub, WebSocketConnectorClient } from '../../../../workspace-gateway/src/connector/websocket.js';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';

test('cloud ConnectorCodeAgentExecutor sends a relative mounted-workspace request', async () => {
  const calls = [];
  const executor = new ConnectorCodeAgentExecutor({
    connector: {
      async request(workspaceId, command) {
        calls.push({ workspaceId, command });
        return { status: 'completed', artifact_refs: ['reports/design.md'], stdout: 'ok', stderr: '', exit_code: 0,
          duration_ms: 12, usage: { input_tokens: 4, output_tokens: 3, total_tokens: 7, status: 'complete' } };
      },
    },
    workspaceId: 'workspace-1',
    remoteRoot: '/srv/openharmony',
  });
  const result = await executor.run({
    definition: { id: 'opencode', adapter: 'opencode-cli', model: 'test/model' },
    context: {
      run_id: 'run-1', attempt_id: 'attempt-1', phase: 'P2', role: 'developer',
      workspace_root: '/srv/openharmony', pipeline_dir: '/srv/openharmony/pipeline',
      constraints: ['run tests'], environment_profile: 'openharmony',
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].workspaceId, 'workspace-1');
  assert.equal(calls[0].command.kind, 'agent.start');
  assert.equal(calls[0].command.payload.repo_relative, '.');
  assert.equal(calls[0].command.payload.pipeline_relative, 'pipeline');
  assert.equal(calls[0].command.payload.agent_id, 'opencode');
  assert.equal(calls[0].command.payload.model, 'test/model');
  assert.equal(result.artifactRefs[0], 'reports/design.md');
  assert.equal(result.usage.total_tokens, 7);
  assert.equal(result.invocation.execution, 'local_connector');
});

test('cloud ConnectorCodeAgentExecutor refuses a workspace outside the SSH binding', async () => {
  const executor = new ConnectorCodeAgentExecutor({
    connector: { async request() { throw new Error('must not call connector'); } },
    workspaceId: 'workspace-1', remoteRoot: '/srv/openharmony',
  });
  await assert.rejects(
    executor.run({
      definition: { id: 'codex', adapter: 'codex-cli' },
      context: { run_id: 'r', attempt_id: 'a', phase: 'P2', role: 'developer',
        workspace_root: '/tmp/outside', pipeline_dir: join('/tmp/outside', 'pipeline') },
    }),
    (error) => error.code === 'connector_workspace_outside_root',
  );
});

test('cloud ConnectorCodeAgentExecutor forwards cancellation to the local Connector', async () => {
  const calls = [];
  const executor = new ConnectorCodeAgentExecutor({
    connector: {
      async request(_workspaceId, command, { signal }) {
        calls.push(command);
        if (command.kind === 'agent.cancel') return { cancelled: true };
        await new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { code: 'connector_aborted' })), { once: true });
        });
      },
    },
    workspaceId: 'workspace-1', remoteRoot: '/srv/code', requestTimeoutMs: 200,
  });
  const controller = new AbortController();
  const running = executor.run({
    definition: { id: 'opencode', adapter: 'opencode-cli' },
    context: { run_id: 'r', attempt_id: 'a', phase: 'P2', role: 'developer',
      workspace_root: '/srv/code', pipeline_dir: '/srv/code/pipeline' },
    signal: controller.signal,
  });
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  await assert.rejects(running, (error) => error.code === 'codeagent_cancelled');
  assert.equal(calls.at(-1).kind, 'agent.cancel');
});

test('cloud ConnectorCodeAgentExecutor cancels a local process after a response timeout', async () => {
  const calls = [];
  const executor = new ConnectorCodeAgentExecutor({
    connector: {
      async request(_workspaceId, command) {
        calls.push(command.kind);
        if (command.kind === 'agent.cancel') return { status: 'cancelling', cancelled: true };
        throw Object.assign(new Error('response timed out'), { code: 'connector_timeout' });
      },
    },
    workspaceId: 'workspace-1', remoteRoot: '/srv/code', timeoutMs: 50,
  });
  await assert.rejects(
    executor.run({
      definition: { id: 'opencode', adapter: 'opencode-cli' },
      context: { run_id: 'r', attempt_id: 'timeout-attempt', phase: 'P2', role: 'developer',
        workspace_root: '/srv/code', pipeline_dir: '/srv/code/pipeline' },
    }),
    (error) => error.code === 'connector_timeout',
  );
  assert.deepEqual(calls, ['agent.start', 'agent.cancel']);
});

test('cloud executor and local service form a complete mounted-workspace edit loop', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-e2e-'));
  try {
    const service = new LocalConnectorAgentService({
      workspaceId: 'workspace-1', localRoot: root, remoteRoot: '/srv/code',
      executor: {
        async run({ context }) {
          await mkdir(join(context.pipeline_dir, 'reports'), { recursive: true });
          await writeFile(join(context.workspace_root, 'src.txt'), 'changed by local codeagent\n', 'utf8');
          return { artifactRefs: ['reports/result.json'], stdout: 'changed', stderr: '', exitCode: 0, durationMs: 5,
            usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3, status: 'complete' } };
        },
      },
      agentCatalog: async () => ({ opencode: { available: true, command: 'opencode' } }),
    });
    const hub = new ConnectorWebSocketHub({ heartbeatMs: 0 });
    const peer = {
      onMessage: null, onClose: null,
      send(message) {
        if (message.type === 'command') {
          Promise.resolve(service.handleCommand(message.command)).then((result) => this.onMessage?.({ type: 'response', id: message.id, ok: true, result })).catch((error) => this.onMessage?.({ type: 'response', id: message.id, ok: false, error: { code: error.code, message: error.message, details: error.details } }));
        }
      },
      close() { this.onClose?.(); },
    };
    hub.attachPeer(peer, { deviceId: 'device-1', workspaceId: 'workspace-1', capabilities: { agents: { opencode: { available: true, command: 'opencode' } } } });
    const executor = new ConnectorCodeAgentExecutor({ connector: hub, workspaceId: 'workspace-1', remoteRoot: '/srv/code' });
    const result = await executor.run({
      definition: { id: 'opencode', adapter: 'opencode-cli' },
      context: { run_id: 'r', attempt_id: 'a', phase: 'P2', role: 'developer', workspace_root: '/srv/code', pipeline_dir: '/srv/code/pipeline' },
    });
    assert.equal(result.invocation.execution, 'local_connector');
    assert.equal(await readFile(join(root, 'src.txt'), 'utf8'), 'changed by local codeagent\n');
    assert.deepEqual(result.artifactRefs, ['reports/result.json']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('cloud executor reaches a real local Connector WebSocket and edits the mounted workspace', async () => {
  assert.equal(typeof globalThis.WebSocket, 'function', 'the supported Node runtime must expose WebSocket');
  const root = await mkdtemp(join(tmpdir(), 'dsh-connector-network-'));
  const agent = join(root, 'fake-codeagent.mjs');
  const server = createServer();
  const hub = new ConnectorWebSocketHub({ authToken: 'connector-secret', heartbeatMs: 0, requestTimeoutMs: 30_000 });
  let client;
  try {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'before.txt'), 'before\n', 'utf8');
    await writeFile(agent, [
      "import { mkdirSync, writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
      "const workspace = process.env.DSH_WORKSPACE_ROOT;",
      "const pipeline = process.env.DSH_PIPELINE_DIR;",
      "writeFileSync(join(workspace, 'src', 'before.txt'), 'edited by local CodeAgent over WebSocket\\n');",
      "mkdirSync(join(pipeline, 'reports'), { recursive: true });",
      "writeFileSync(join(pipeline, 'reports', 'result.json'), JSON.stringify({ stage: 'P2', source: 'local-codeagent' }));",
      "process.stdout.write(JSON.stringify({ usage: { input_tokens: 11, output_tokens: 7, total_tokens: 18 } }) + '\\n');",
    ].join('\n'), 'utf8');

    server.on('upgrade', (request, socket, head) => {
      void hub.handleUpgrade(request, socket, head);
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object' && Number.isInteger(address.port));

    const service = new LocalConnectorAgentService({
      workspaceId: 'workspace-network', deviceId: 'device-network', localRoot: root, remoteRoot: '/srv/code',
      executor: new LocalCodeAgentExecutor({ timeoutMs: 30_000 }),
      settings: { snapshot() { return { custom: { name: 'network-test-agent', command: process.execPath, args: [agent] } }; } },
      agentCatalog: async () => ({}),
    });
    client = new WebSocketConnectorClient({
      url: `ws://127.0.0.1:${address.port}/v1/connect`,
      deviceId: 'device-network', workspaceId: 'workspace-network', token: 'connector-secret',
      capabilities: { workspace_access: 'sshfs_mount', remote_root: '/srv/code' },
      commandHandler: (command, metadata) => service.handleCommand(command, metadata),
    });
    await client.connect();
    const executor = new ConnectorCodeAgentExecutor({ connector: hub, workspaceId: 'workspace-network', remoteRoot: '/srv/code' });
    const result = await executor.run({
      definition: { id: 'custom', adapter: 'argv-cli' },
      context: {
        run_id: 'network-run', attempt_id: 'network-attempt', phase: 'P2', role: 'developer',
        workspace_root: '/srv/code', pipeline_dir: '/srv/code/pipeline', constraints: ['edit source'],
      },
    });
    assert.equal(result.invocation.execution, 'local_connector');
    assert.equal(result.invocation.workspace_mode, 'sshfs_mount');
    assert.equal(result.usage.total_tokens, 18);
    assert.deepEqual(result.artifactRefs, ['evidence/P2/codeagent.stderr.log', 'evidence/P2/codeagent.stdout.log', 'reports/result.json']);
    assert.equal(await readFile(join(root, 'src', 'before.txt'), 'utf8'), 'edited by local CodeAgent over WebSocket\n');
    assert.deepEqual(hub.snapshot().workspaces.map(({ workspace_id, device_id }) => ({ workspace_id, device_id })), [
      { workspace_id: 'workspace-network', device_id: 'device-network' },
    ]);
  } finally {
    client?.close();
    hub.close();
    await new Promise((resolve) => server.close(() => resolve())).catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
});
