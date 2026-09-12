import assert from 'node:assert/strict';
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
    repoRoot: '/workspace/AI-AR-workflow',
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
    idempotency_key: 'test-start',
  }), startResponse);
  assert.equal(startResponse.statusCode, 202);
  assert.equal(JSON.parse(startResponse.body).run_id, 'ar-2');
  assert.equal(calls[0].repoRoot, '/workspace/AI-AR-workflow');
  assert.equal(calls[0].arPath, '/workspace/AI-AR-workflow/docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json');
  assert.equal(calls[0].agent, 'claude-code');
  assert.equal(JSON.parse(startResponse.body).codeagent.id, 'claude-code');
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
