import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const DSH_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE = path.resolve(DSH_ROOT, '..');

test('MCP stdio server lists tools and resolves modules', async () => {
  const client = new Client({ name: 'ai-ar-test', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(DSH_ROOT, 'src/mcp/server.js')],
    env: {
      ...process.env,
      AI_AR_WORKSPACE: WORKSPACE,
      AI_AR_DSH_STATE_DIR: '/tmp/ai-ar-dsh-mcp-test',
    },
    stderr: 'pipe',
  });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.ok(tools.tools.some((item) => item.name === 'ar_dev_next'));
    assert.ok(tools.tools.some((item) => item.name === 'ar_requirement_next'));
    assert.ok(tools.tools.some((item) => item.name === 'ar_evolution_proposals'));
    const result = await client.callTool({
      name: 'ar_module_resolve',
      arguments: {
        workflow: 'development',
        phase: 'P2',
        taskTags: ['sa', 'cpp'],
      },
    });
    assert.equal(result.isError, undefined);
    const text = result.content.find((item) => item.type === 'text')?.text;
    const payload = JSON.parse(text);
    assert.ok(payload.modules.some((item) => item.id === 'ohos-dev-sa-codegen'));
  } finally {
    await client.close();
  }
});
