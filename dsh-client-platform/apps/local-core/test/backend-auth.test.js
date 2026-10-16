import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { afterCloseAndRemove } from '../../../test/test-cleanup.js';
import { startLocalCore } from '../src/server.js';

test('the loopback backend port cannot bypass Local Core bearer authentication', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-local-backend-auth-'));
  const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
  const portProbe = createServer();
  await new Promise((resolveListen) => portProbe.listen(0, '127.0.0.1', resolveListen));
  const backendPort = portProbe.address().port;
  await new Promise((resolveClose, reject) => portProbe.close((error) => error ? reject(error) : resolveClose()));
  const core = await startLocalCore({
    runtimeRoot: repositoryRoot,
    workspaceRoot: repositoryRoot,
    stateFile: join(directory, 'state.json'),
    token: 'desktop-gateway-token-for-test',
    backendPort,
  });
  afterCloseAndRemove(t, () => core.close(), directory);

  const direct = await fetch(`http://127.0.0.1:${backendPort}/api/status`);
  assert.equal(direct.status, 401);

  const allowed = await fetch(`${core.origin}/api/status`, {
    headers: { authorization: `Bearer ${core.token}` },
  });
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).service, 'dsh-local-console');
});

test('Local Core forwards only the private DSH callback credential to internal routes', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-local-callback-auth-'));
  const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
  const callbackToken = 'private-dsh-callback-token-for-the-gateway-test';
  const core = await startLocalCore({
    runtimeRoot: repositoryRoot,
    workspaceRoot: repositoryRoot,
    stateFile: join(directory, 'state.json'),
    token: 'desktop-gateway-token-for-test',
    dshCallbackToken: callbackToken,
    localConsoleOptions: { dshSessionRegistry: new Map(), dshCallbackToken: callbackToken },
  });
  afterCloseAndRemove(t, () => core.close(), directory);

  const body = JSON.stringify({ provider_id: 'claude-code', session_id: 'missing-session', messages: [{ role: 'user', content: 'test' }] });
  const denied = await fetch(`${core.origin}/internal/dsh/codeagent/execute`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body,
  });
  assert.equal(denied.status, 401);

  const allowed = await fetch(`${core.origin}/internal/dsh/codeagent/execute`, {
    method: 'POST',
    headers: { authorization: `Bearer ${callbackToken}`, 'content-type': 'application/json' }, body,
  });
  assert.equal(allowed.status, 409);
  assert.equal((await allowed.json()).error.code, 'codeagent_session_unbound');
});
