import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { createGatewayHttpServer, createJsonlGateway, WorkspaceGatewayService } from '../../src/connector/jsonl-gateway.js';

test('gateway service turns connector failures into bounded protocol responses', async () => {
  const service = new WorkspaceGatewayService({
    connector: {
      async execute() {
        throw Object.assign(new Error('path rejected'), {
          code: 'path_outside_workspace',
          details: { path: '../secret' },
        });
      },
    },
  });
  const result = await service.handle({ operation_id: 'op-1' });
  assert.deepEqual(result, {
    ok: false,
    error: { code: 'path_outside_workspace', message: 'path rejected', details: { path: '../secret' } },
  });
});

test('JSONL gateway handles concurrent envelopes, malformed input and clean shutdown', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const chunks = [];
  output.on('data', (chunk) => chunks.push(chunk.toString('utf8')));
  const service = new WorkspaceGatewayService({
    connector: {
      async execute(envelope) {
        await new Promise((resolve) => setImmediate(resolve));
        return { operation_id: envelope.operation_id, status: 'completed' };
      },
    },
  });
  const gateway = createJsonlGateway({ input, output, service });
  gateway.start();
  input.write('{not-json}\n');
  input.write(`${JSON.stringify({ operation_id: 'op-1' })}\n`);
  input.write(`${JSON.stringify({ operation_id: 'op-2' })}\n`);
  await gateway.waitForIdle();
  const responses = chunks.join('').trim().split(/\r?\n/u).map((line) => JSON.parse(line));
  assert.equal(responses.length, 3);
  assert.equal(responses[0].ok, false);
  assert.equal(responses[0].error.code, 'invalid_json');
  assert.deepEqual(responses.slice(1).map((item) => item.result.operation_id).sort(), ['op-1', 'op-2']);
  gateway.stop();
  assert.equal(gateway.closed, true);
});

test('JSONL gateway refuses new input after shutdown and enforces line bounds', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const chunks = [];
  output.on('data', (chunk) => chunks.push(chunk.toString('utf8')));
  const service = new WorkspaceGatewayService({ connector: { async execute() { return { status: 'completed' }; } } });
  const gateway = createJsonlGateway({ input, output, service, maxLineBytes: 256 });
  gateway.start();
  input.write(`${'x'.repeat(280)}\n`);
  await gateway.waitForIdle();
  assert.equal(JSON.parse(chunks.join('').trim()).error.code, 'line_too_large');
  gateway.stop();
  input.write('{"operation_id":"late"}\n');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(chunks.join('').includes('late'), false);
});

test('HTTP gateway exposes health, authorization hook and the same envelope response contract', async () => {
  const service = new WorkspaceGatewayService({
    connector: { async execute(envelope) { return { operation_id: envelope.operation_id, status: 'completed' }; } },
  });
  const server = createGatewayHttpServer({ service, authorize: async (req) => req.headers['x-gateway-test'] === 'ok' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/healthz`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'ok');
    const unauthorized = await fetch(`${base}/v1/envelope`, { method: 'POST', body: '{}' });
    assert.equal(unauthorized.status, 401);
    const authorized = await fetch(`${base}/v1/envelope`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-gateway-test': 'ok' },
      body: JSON.stringify({ operation_id: 'http-op' }),
    });
    assert.equal(authorized.status, 200);
    assert.deepEqual((await authorized.json()).result, { operation_id: 'http-op', status: 'completed' });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
