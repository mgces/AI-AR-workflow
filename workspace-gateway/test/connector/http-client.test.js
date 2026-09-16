import assert from 'node:assert/strict';
import test from 'node:test';
import { createGatewayHttpServer, WorkspaceGatewayService } from '../../src/connector/jsonl-gateway.js';
import { WorkspaceGatewayClient, WorkspaceGatewayClientError } from '../../src/connector/http-client.js';

test('HTTP client calls the gateway and preserves structured remote errors', async () => {
  const service = new WorkspaceGatewayService({
    connector: {
      async execute(envelope) {
        if (envelope.operation_id === 'bad') throw Object.assign(new Error('rejected by connector'), { code: 'operation_not_allowed', details: { operation: 'x' } });
        return { operation_id: envelope.operation_id, status: 'completed' };
      },
    },
  });
  const server = createGatewayHttpServer({ service });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const client = new WorkspaceGatewayClient({ baseUrl: `http://127.0.0.1:${server.address().port}` });
  try {
    assert.deepEqual(await client.health(), { status: 'ok', service: 'workspace-gateway' });
    assert.deepEqual(await client.execute({ operation_id: 'good' }), { operation_id: 'good', status: 'completed' });
    await assert.rejects(
      client.execute({ operation_id: 'bad' }),
      (error) => error instanceof WorkspaceGatewayClientError
        && error.code === 'operation_not_allowed'
        && error.status === 400
        && error.details.operation === 'x',
    );
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('HTTP client validates base URLs and exposes timeout/abort as typed errors', async () => {
  assert.throws(() => new WorkspaceGatewayClient({ baseUrl: 'file:///tmp/gateway' }), { code: 'gateway_url_invalid' });
  const client = new WorkspaceGatewayClient({
    baseUrl: 'http://gateway.invalid',
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
    }),
    timeoutMs: 10,
  });
  await assert.rejects(client.health(), (error) => error.code === 'gateway_timeout');
});
