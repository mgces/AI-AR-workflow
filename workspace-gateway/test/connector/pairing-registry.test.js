import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ConnectorPairingRegistry } from '../../src/connector/pairing-registry.js';

test('Connector pairing registry issues, authorizes and persists a one-time token record', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-pairing-'));
  const filePath = join(root, 'pairings.json');
  try {
    const registry = new ConnectorPairingRegistry({ filePath, clock: () => new Date('2026-09-15T00:00:00.000Z') });
    const issued = await registry.pair({ deviceId: 'device-1', workspaceId: 'workspace-1', label: 'Windows laptop' });
    assert.equal(issued.device_id, 'device-1');
    assert.equal(issued.workspace_id, 'workspace-1');
    assert.ok(issued.token.length >= 32);
    assert.equal(issued.token_hash, undefined);
    const authorized = await registry.authorize({ deviceId: 'device-1', workspaceId: 'workspace-1', token: issued.token });
    assert.equal(authorized.pairing_id, issued.pairing_id);
    assert.equal(authorized.label, 'Windows laptop');
    const persisted = JSON.parse(await readFile(filePath, 'utf8'));
    assert.equal(persisted.schema_version, 1);
    assert.equal(persisted.records.length, 1);
    assert.equal(typeof persisted.records[0].token_sha256, 'string');
    assert.equal(persisted.records[0].token, undefined);
    const restored = new ConnectorPairingRegistry({ filePath, clock: () => new Date('2026-09-15T00:00:00.000Z') });
    assert.equal((await restored.authorize({ deviceId: 'device-1', workspaceId: 'workspace-1', token: issued.token })).pairing_id, issued.pairing_id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Connector pairing registry rejects expired/revoked credentials and rotates them', async () => {
  let now = new Date('2026-09-15T00:00:00.000Z');
  const registry = new ConnectorPairingRegistry({ clock: () => now, defaultTtlMs: 60_000 });
  const first = await registry.pair({ deviceId: 'device-1', workspaceId: 'workspace-1' });
  assert.ok(await registry.authorize({ deviceId: 'device-1', workspaceId: 'workspace-1', token: first.token }));
  await registry.revoke({ pairingId: first.pairing_id, reason: 'manual test revoke' });
  assert.equal(await registry.authorize({ deviceId: 'device-1', workspaceId: 'workspace-1', token: first.token }), null);
  const second = await registry.rotate({ deviceId: 'device-1', workspaceId: 'workspace-1' });
  assert.notEqual(second.pairing_id, first.pairing_id);
  assert.equal(await registry.authorize({ deviceId: 'device-1', workspaceId: 'workspace-1', token: first.token }), null);
  assert.ok(await registry.authorize({ deviceId: 'device-1', workspaceId: 'workspace-1', token: second.token }));
  now = new Date('2026-09-15T00:01:01.000Z');
  assert.equal(await registry.authorize({ deviceId: 'device-1', workspaceId: 'workspace-1', token: second.token }), null);
});
