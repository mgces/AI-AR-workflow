#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { createRuntime } from '../runtime.js';
import { McpServer } from './server.js';

const runtime = createRuntime();
const server = new McpServer({ catalog: runtime.tools });
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });

console.error('ohos-dsh MCP server listening on stdio');

for await (const line of lines) {
  if (!line.trim()) continue;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error.' } });
    continue;
  }
  const response = await server.receive(request);
  if (response !== null) write(response);
}

runtime.close();

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
