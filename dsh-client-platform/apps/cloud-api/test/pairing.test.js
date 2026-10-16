import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { afterCloseAndRemove } from '../../../test/test-cleanup.js';

const { createCloudApiServer } = await import('../src/server.js');
const { createSignedRunEvent } = await import('../../../packages/contracts/src/run-event.js');

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test('one-time browser pairing registers a signed device and supports immediate revocation', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-cloud-pairing-'));
  const server = createCloudApiServer({ databasePath: join(dir, 'cloud.sqlite3'), allowInsecureLocalUser: true });
  afterCloseAndRemove(t, () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())), dir);
  const origin = await listen(server);
  const portal = await fetch(origin);
  assert.match(await portal.text(), /生成一次性配对码/u);
  const pairing = await fetch(`${origin}/v1/pairing/sessions`, { method: 'POST' });
  assert.equal(pairing.status, 201);
  const session = await pairing.json();
  assert.ok(session.pairing_code);
  assert.match(session.pairing_code, /^[A-F0-9]{12}$/u);

  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const paired = await fetch(`${origin}/v1/devices/pair`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      pairing_code: session.pairing_code,
      device_id: 'desktop-test-1', key_id: 'desktop-key-1',
      public_key: publicKeyPem, device_name: 'Test Desktop', client_version: '0.1.0',
      workspace_id: 'workspace-test-1',
    }),
  });
  assert.equal(paired.status, 201);
  const credentials = await paired.json();
  assert.ok(credentials.access_token);
  assert.equal(credentials.workspace_id, 'workspace-test-1');

  const event = createSignedRunEvent({
    fields: {
      event_id: 'paired-run-created', tenant_id: credentials.tenant_id,
      device_id: credentials.device_id, workspace_id: credentials.workspace_id,
      run_id: 'run-paired', client_seq: 1, run_revision: 1,
      type: 'run.created', occurred_at: new Date().toISOString(),
      payload: { workflow_id: 'ar-delivery', status: 'running' },
    },
    privateKey, keyId: 'desktop-key-1',
  });
  const uploaded = await fetch(`${origin}/v1/devices/desktop-test-1/events:batch`, {
    method: 'POST',
    headers: { authorization: `Bearer ${credentials.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ events: [event] }),
  });
  assert.equal(uploaded.status, 200);

  const revoked = await fetch(`${origin}/v1/devices/desktop-test-1/revoke`, { method: 'POST' });
  assert.equal(revoked.status, 200);
  const afterRevoke = await fetch(`${origin}/v1/devices/desktop-test-1/sync-state`, {
    headers: { authorization: `Bearer ${credentials.access_token}` },
  });
  assert.equal(afterRevoke.status, 401);
});

test('device pairing limits repeated invalid codes from one client', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-cloud-pairing-limit-'));
  const server = createCloudApiServer({ databasePath: join(dir, 'cloud.sqlite3'), allowInsecureLocalUser: true });
  afterCloseAndRemove(t, () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())), dir);
  const origin = await listen(server);
  const { publicKey } = generateKeyPairSync('ed25519');

  const makeAttempt = () => fetch(`${origin}/v1/devices/pair`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      pairing_code: '000000000000', device_id: 'desktop-test-1', key_id: 'desktop-key-1',
      public_key: publicKey.export({ type: 'spki', format: 'pem' }), device_name: 'Test Desktop',
      client_version: '0.1.0', workspace_id: 'workspace-test-1',
    }),
  });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    assert.equal((await makeAttempt()).status, 400);
  }
  const limited = await makeAttempt();
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
});

test('device listing and revocation are scoped to owner or tenant administrator', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-cloud-device-owner-'));
  const server = createCloudApiServer({
    databasePath: join(dir, 'cloud.sqlite3'),
    authenticateUser: async (request) => ({ tenant_id: 'tenant-1', user_id: request.headers['x-user'] ?? 'alice' }),
  });
  afterCloseAndRemove(t, () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())), dir);
  const origin = await listen(server);
  const aliceHeaders = { 'x-user': 'alice', 'content-type': 'application/json' };
  const sessionResponse = await fetch(`${origin}/v1/pairing/sessions`, { method: 'POST', headers: aliceHeaders });
  assert.equal(sessionResponse.status, 201);
  const session = await sessionResponse.json();
  const { publicKey } = generateKeyPairSync('ed25519');
  const pairResponse = await fetch(`${origin}/v1/devices/pair`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pairing_code: session.pairing_code, device_id: 'alice-device', key_id: 'alice-key',
      public_key: publicKey.export({ type: 'spki', format: 'pem' }), device_name: 'Alice PC',
      client_version: '0.1.0', workspace_id: 'alice-workspace' }),
  });
  assert.equal(pairResponse.status, 201);

  const bobHeaders = { 'x-user': 'bob' };
  const bobDevices = await fetch(`${origin}/v1/devices`, { headers: bobHeaders });
  assert.equal(bobDevices.status, 200);
  assert.deepEqual((await bobDevices.json()).devices, []);
  const bobRevoke = await fetch(`${origin}/v1/devices/alice-device/revoke`, { method: 'POST', headers: bobHeaders });
  assert.equal(bobRevoke.status, 404);
  const aliceDevices = await fetch(`${origin}/v1/devices`, { headers: { 'x-user': 'alice' } });
  assert.equal((await aliceDevices.json()).devices.length, 1);
});

test('trusted reverse proxy IP keeps pairing rate limits isolated per actual client', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-cloud-pairing-proxy-ip-'));
  const server = createCloudApiServer({ databasePath: join(dir, 'cloud.sqlite3'), trustProxyClientIp: true });
  afterCloseAndRemove(t, () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())), dir);
  const origin = await listen(server);
  const { publicKey } = generateKeyPairSync('ed25519');
  const makeAttempt = (clientIp) => fetch(`${origin}/v1/devices/pair`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsh-client-ip': clientIp },
    body: JSON.stringify({ pairing_code: '000000000000', device_id: 'desktop-test-2', key_id: 'desktop-key-2',
      public_key: publicKey.export({ type: 'spki', format: 'pem' }), device_name: 'Test Desktop', client_version: '0.1.0', workspace_id: 'workspace-test-2' }),
  });
  for (let attempt = 0; attempt < 8; attempt += 1) assert.equal((await makeAttempt('198.51.100.10')).status, 400);
  assert.equal((await makeAttempt('198.51.100.10')).status, 429);
  assert.equal((await makeAttempt('198.51.100.11')).status, 400);
});
