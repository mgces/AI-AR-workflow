import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { createDshRuntimeSupervisor } from '../../desktop/src/dsh-runtime-supervisor.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE_ROOT = resolve(HERE, '..');
const REPOSITORY_ROOT = resolve(HERE, '../../../../');
const callbackCalls = [];
let stateDirectory;
let server;
let endpoint;
let supervisor;

before(async () => {
  stateDirectory = await mkdtemp(join(tmpdir(), 'dsh-sdk-runtime-e2e-'));
  server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    callbackCalls.push({ path: req.url, authorization: req.headers.authorization, body });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(req.url.endsWith('/probe')
      ? { available: true }
      : { output: 'The selected local CodeAgent changed the source.', usage: { input_tokens: 18, output_tokens: 11 }, duration_ms: 900 }));
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  endpoint = `http://127.0.0.1:${server.address().port}`;
  supervisor = createDshRuntimeSupervisor({
    nodeExecutable: process.execPath,
    launcherPath: resolve(HERE, '../launcher.js'),
    cwd: REPOSITORY_ROOT,
    env: {
      ...process.env,
      DSH_HOME: stateDirectory,
      DSH_CLIENT_DSH_BUNDLE_ROOT: BUNDLE_ROOT,
      DSH_CLIENT_RUNTIME_ROOT: REPOSITORY_ROOT,
      DSH_CLIENT_CODEAGENT_ENDPOINT: endpoint,
      DSH_CLIENT_CODEAGENT_TOKEN: 'local-callback-token-which-is-long-enough',
      DSH_CLIENT_CODEAGENT_IDS: 'claude-code',
    },
  });
});

after(async () => {
  await supervisor?.close();
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  await rm(stateDirectory, { recursive: true, force: true });
});

test('official DSH SDK runs a real profile session through the selected local CodeAgent provider with no model fallback', async () => {
  const result = await supervisor.run({
    provider_id: 'claude-code', model: 'claude-sonnet-4', session_id: 'ar-run-1-P4',
    prompt: 'Fix the P4 compile failure using the current AR request.',
  });

  assert.equal(result.session_id, 'ar-run-1-P4');
  assert.equal(callbackCalls.some((call) => call.path.endsWith('/execute')), true, JSON.stringify(result.events));
  assert.ok(result.events.some((event) => event.type === 'assistant/message'), JSON.stringify(result.events));
  assert.match(result.final_response, /selected local CodeAgent changed the source/u);
  assert.equal(callbackCalls.every((call) => call.authorization === 'Bearer local-callback-token-which-is-long-enough'), true);
  const execute = callbackCalls.find((call) => call.path.endsWith('/execute'));
  assert.equal(execute.body.provider_id, 'claude-code');
  assert.equal(execute.body.session_id, 'ar-run-1-P4');
  assert.ok(execute.body.messages.some((message) => message.content.includes('Fix the P4 compile failure using the current AR request.')),
    JSON.stringify(execute.body.messages.map((message) => ({ role: message.role, tail: message.content.slice(-160) }))));
  assert.equal(callbackCalls.some((call) => call.body.provider_id === 'deepseek-official'), false);
});
