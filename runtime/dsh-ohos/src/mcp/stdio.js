#!/usr/bin/env node
import { createReadStream, createWriteStream, writeSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createRuntime } from '../runtime.js';
import { McpServer } from './server.js';

const runtime = createRuntime();
const server = new McpServer({ catalog: runtime.tools });
// Use explicit fd streams for child-process transports. In this WSL runtime
// Node's process.stdin/stdout wrappers can observe a socket EOF before the
// parent has written the first JSONL request, or buffer stdout past process
// shutdown. The fd streams preserve the connection and flush each response.
const input = createReadStream(null, { fd: 0, autoClose: false });
const output = createWriteStream(null, { fd: 1, autoClose: false });
const lines = createInterface({ input, crlfDelay: Infinity });

// Keep the startup diagnostic synchronous: when a parent closes a stdio
// child immediately after the final response, console.error's buffered write
// can otherwise be lost along with the process.stderr socket.
try { writeSync(2, 'ohos-dsh MCP server listening on stdio\n'); } catch { /* diagnostics are best effort */ }

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
  output.write(`${JSON.stringify(message)}\n`);
}
