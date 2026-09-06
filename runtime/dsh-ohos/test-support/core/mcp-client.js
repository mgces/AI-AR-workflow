import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { PACKAGE_ROOT } from '../../src/core/paths.js';

export async function stdioClient(dataRoot, principal, pythonCommand) {
  const child = spawn(process.execPath, [resolve(PACKAGE_ROOT, 'src/mcp/stdio.js')], {
    windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, OHOS_DSH_DATA_ROOT: dataRoot, OHOS_DSH_PRINCIPAL: principal,
      OHOS_DSH_PYTHON: pythonCommand },
  });
  let serial = 0;
  let stderr = '';
  const pending = new Map();
  const reader = createInterface({ input: child.stdout });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  reader.on('line', (line) => {
    const response = JSON.parse(line);
    const item = pending.get(response.id);
    if (!item) return;
    pending.delete(response.id);
    if (response.error) item.reject(new Error(JSON.stringify(response.error)));
    else item.resolve(response.result);
  });
  const finished = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => {
      for (const item of pending.values()) item.reject(new Error(`MCP exited (${code}): ${stderr}`));
      resolve(code);
    });
  });
  const request = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`MCP timeout: ${method}`)); }, 10_000);
    pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); },
      reject: (error) => { clearTimeout(timer); reject(error); } });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
  try {
    await request('initialize', { protocolVersion: '2025-06-18', capabilities: {},
      clientInfo: { name: 'requirement-integration-test', version: '1' } });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  } catch (error) { child.kill(); await finished; throw error; }
  return {
    request,
    call: async (name, args) => {
      const response = await request('tools/call', { name, arguments: args });
      if (response.isError) throw new Error(JSON.stringify(response.structuredContent));
      return response.structuredContent;
    },
    close: async () => { child.stdin.end(); const code = await finished; reader.close(); return code; },
  };
}
