import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { RemoteToolsBroker, createRemoteToolsMcpStdio } from '../../src/connector/remote-tools-mcp.js';

function fakeConnector(calls) {
  return {
    async execute(envelope) {
      calls.push(envelope);
      return { status: 'completed', result: { operation: envelope.payload.operation_kind, ...envelope.payload } };
    },
  };
}

test('remote tools broker translates allowlisted MCP calls to signed workspace operations', async () => {
  const calls = [];
  const broker = new RemoteToolsBroker({
    connector: fakeConnector(calls), workspaceId: 'workspace-1', allowedProfiles: ['build'],
  });
  const read = await broker.handleTool('dsh_workspace_read', { path: 'src/main.cpp' });
  assert.equal(read.operation, 'workspace.read');
  assert.equal(read.path, 'src/main.cpp');
  assert.equal(calls[0].workspace_id, 'workspace-1');
  assert.equal(calls[0].signature.key_id, 'local-connector');
  const profile = await broker.handleTool('dsh_workspace_exec_profile', { profile_id: 'build', variables: { target: 'x' } });
  assert.equal(profile.profile_id, 'build');
  await assert.rejects(() => broker.handleTool('dsh_workspace_exec_profile', { profile_id: 'publish' }), (error) => error.code === 'remote_tools_profile_not_allowed');
  await assert.rejects(() => broker.handleTool('workspace_read', { path: 'src/main.cpp' }), (error) => error.code === 'remote_tools_tool_not_allowed');
});

test('MCP stdio exposes tools/list and returns tool failures as isError results', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const server = createRemoteToolsMcpStdio({
    input, output,
    requestTool: async (name, args) => {
      if (name === 'dsh_workspace_read') return { path: args.path, content: 'ok' };
      const error = new Error('denied');
      error.code = 'denied';
      throw error;
    },
  }).start();
  const responses = [];
  output.on('data', (chunk) => responses.push(...chunk.toString('utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))));
  input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })}\n`);
  input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })}\n`);
  input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'dsh_workspace_read', arguments: { path: 'a' } } })}\n`);
  input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'dsh_workspace_write', arguments: { path: 'a', content: 'x' } } })}\n`);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(responses.find((item) => item.id === 1).result.protocolVersion, '2024-11-05');
  assert.ok(responses.find((item) => item.id === 2).result.tools.some((item) => item.name === 'dsh_workspace_search'));
  assert.equal(JSON.parse(responses.find((item) => item.id === 3).result.content[0].text).content, 'ok');
  assert.equal(responses.find((item) => item.id === 4).result.isError, true);
  server.stop();
});

test('remote tools abort propagates an operation.cancel to the SSH connector', async () => {
  const calls = [];
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const connector = {
    async execute(envelope) {
      calls.push(envelope);
      if (envelope.message_type === 'operation.cancel') {
        release({ status: 'completed', result: { status: 'cancellation_requested' } });
        return { status: 'completed', result: { status: 'cancellation_requested' } };
      }
      return pending;
    },
  };
  const broker = new RemoteToolsBroker({ connector, workspaceId: 'workspace-cancel' });
  const controller = new AbortController();
  const running = broker.handleTool('dsh_workspace_read', { path: 'src/main.cpp' }, {
    signal: controller.signal, operationId: 'mcp-request-1',
  });
  controller.abort();
  await assert.rejects(running, (error) => error.code === 'remote_tools_cancelled');
  await new Promise((resolve) => setTimeout(resolve, 5));
  const cancel = calls.find((item) => item.message_type === 'operation.cancel');
  assert.equal(cancel?.payload?.target_operation_id, 'mcp-request-1');
});
