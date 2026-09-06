import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PACKAGE_ROOT as packageRoot } from '../../src/core/paths.js';
import { test } from 'node:test';


test('stdio entrypoint completes an MCP initialize and tools/list exchange', async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), 'ohos-dsh-stdio-'));
  try {
    const child = spawn(process.execPath, ['src/mcp/stdio.js'], {
      cwd: packageRoot,
      env: {
        ...process.env,
        OHOS_DSH_DATA_ROOT: dataRoot,
        OHOS_DSH_PRINCIPAL: 'parent',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: '2025-06-18', capabilities: {},
        clientInfo: { name: 'integration-test', version: '1' },
      },
    })}\n`);
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0', method: 'notifications/initialized',
    })}\n`);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`);
    child.stdin.end();
    const exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', resolve);
    });
    assert.equal(exitCode, 0, stderr);
    const responses = stdout.trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(responses[0].result.protocolVersion, '2025-06-18');
    assert(responses[1].result.tools.some((tool) => tool.name === 'ohos_requirement_start'));
    assert(!responses[1].result.tools.some((tool) => tool.name === 'ohos_task_claim'));
    assert.match(stderr, /listening on stdio/);
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
  }
});
