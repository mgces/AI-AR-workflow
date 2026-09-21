import assert from 'node:assert/strict';
import test from 'node:test';
import { ConnectorWorkspaceGatewayClient } from '../src/connector-workspace-gateway.js';

test('Connector workspace gateway sends all operations through the selected Local Connector', async () => {
  const calls = [];
  const client = new ConnectorWorkspaceGatewayClient({
    workspaceId: 'workspace-1',
    connector: {
      snapshot() {
        return { workspaces: [{ workspace_id: 'workspace-1', device_id: 'windows-1', connected: true }] };
      },
      async request(workspaceId, command) {
        calls.push({ workspaceId, command });
        return { operation_id: command.payload.operation_id, status: 'completed', result: { operation: 'probe' } };
      },
    },
  });

  assert.equal((await client.health()).transport, 'local_connector');
  const envelope = {
    schema_version: 1,
    message_type: 'operation.start',
    operation_id: 'operation-1',
    payload: { operation_kind: 'workspace.probe', path: '.' },
  };
  const result = await client.execute(envelope);
  assert.equal(result.result.operation, 'probe');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].workspaceId, 'workspace-1');
  assert.equal(calls[0].command.kind, 'workspace.execute');
  assert.deepEqual(calls[0].command.payload.envelope, envelope);
});

test('Connector workspace gateway fails closed while its local workspace is offline', async () => {
  const client = new ConnectorWorkspaceGatewayClient({
    workspaceId: 'workspace-1',
    connector: { snapshot() { return { workspaces: [] }; }, async request() { throw new Error('must not execute'); } },
  });
  await assert.rejects(client.health(), (error) => error.code === 'local_connector_required');
});
