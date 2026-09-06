import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createToolCatalog,
  McpServer,
  MCP_PROTOCOL_VERSION,
  OhosController,
  SqliteStore,
  TaskCredentials,
} from '../../src/index.js';

describe('MCP façade', () => {
  let store;
  let controller;
  let docsRoot;

  beforeEach(() => {
    store = new SqliteStore(':memory:');
    docsRoot = mkdtempSync(join(tmpdir(), 'ohos-mcp-requirement-'));
    controller = new OhosController({
      store,
      credentials: new TaskCredentials(Buffer.alloc(32, 9)),
      requirementPreflight: () => {},
    });
  });

  afterEach(() => { store.close(); rmSync(docsRoot, { recursive: true, force: true }); });

  test('initializes and advertises only tools visible to the principal', async () => {
    const parent = new McpServer({
      catalog: createToolCatalog(controller, { principal: 'parent' }),
    });
    const initialized = await parent.receive({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'test', version: '1' },
      },
    });
    assert.equal(initialized.result.protocolVersion, MCP_PROTOCOL_VERSION);

    await parent.receive({ jsonrpc: '2.0', method: 'notifications/initialized' });

    const listed = await parent.receive({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const names = listed.result.tools.map((tool) => tool.name);
    assert(names.includes('ohos_requirement_start'));
    assert(names.includes('ohos_host_register'));
    assert(!names.includes('ohos_task_submit'));
  });

  test('tool calls return structured content and domain errors use isError', async () => {
    const server = new McpServer({
      catalog: createToolCatalog(controller, { principal: 'all' }),
    });
    await initialize(server);
    const started = await server.receive({
      jsonrpc: '2.0', id: 'start', method: 'tools/call',
      params: {
        name: 'ohos_requirement_start',
        arguments: { input_ref: 'user:req', input_text: '需求输入', docs_root: docsRoot, idempotency_key: 'mcp-start' },
      },
    });
    assert.equal(started.result.isError, false);
    assert.equal(started.result.structuredContent.workflow, 'requirement');

    const missing = await server.receive({
      jsonrpc: '2.0', id: 'status', method: 'tools/call',
      params: { name: 'ohos_run_status', arguments: { run_id: 'missing-run' } },
    });
    assert.equal(missing.result.isError, true);
    assert.equal(missing.result.structuredContent.error.code, 'run_not_found');
  });

  test('unknown tool is a JSON-RPC protocol error', async () => {
    const server = new McpServer({
      catalog: createToolCatalog(controller, { principal: 'all' }),
    });
    await initialize(server);
    const response = await server.receive({
      jsonrpc: '2.0', id: 7, method: 'tools/call',
      params: { name: 'unknown', arguments: {} },
    });
    assert.equal(response.error.code, -32601);
  });

  test('tool discovery is rejected before initialization completes', async () => {
    const server = new McpServer({
      catalog: createToolCatalog(controller, { principal: 'all' }),
    });
    const response = await server.receive({ jsonrpc: '2.0', id: 8, method: 'tools/list' });
    assert.equal(response.error.code, -32002);
  });
});

async function initialize(server) {
  await server.receive({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {}, clientInfo: { name: 'test', version: '1' },
    },
  });
  await server.receive({ jsonrpc: '2.0', method: 'notifications/initialized' });
}
