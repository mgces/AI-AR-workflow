import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { afterCloseAndRemove } from '../../../test/test-cleanup.js';

const localCore = await import('../src/server.js').catch(() => null);

test('local core exposes an authenticated loopback service factory', () => {
  assert.equal(typeof localCore?.startLocalCore, 'function');
});

test('local core protects runtime routes and serves status only with its process token', async (t) => {
  assert.equal(typeof localCore?.startLocalCore, 'function');
  const dir = await mkdtemp(join(tmpdir(), 'dsh-local-core-'));
  const instance = await localCore.startLocalCore({
    repoRoot: resolve('..'),
    stateFile: join(dir, 'state.json'),
    token: 'one-time-test-token',
  });
  afterCloseAndRemove(t, () => instance.close(), dir);

  const health = await fetch(`${instance.origin}/healthz`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).service, 'dsh-agent-local-core');

  const denied = await fetch(`${instance.origin}/api/status`);
  assert.equal(denied.status, 401);

  const status = await fetch(`${instance.origin}/api/status`, {
    headers: { authorization: 'Bearer one-time-test-token' },
  });
  assert.equal(status.status, 200);
  assert.equal((await status.json()).service, 'dsh-local-console');
});
