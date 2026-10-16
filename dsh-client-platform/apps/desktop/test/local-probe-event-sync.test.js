import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';

const sync = await import('../src/local-event-sync.js');
const { DurableEventOutbox } = await import('../src/sync-outbox.js');
const { verifySignedRunEvent } = await import('../../../packages/contracts/src/run-event.js');

test('local connector probes become signed durable observability events without a projected run', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const outbox = new DurableEventOutbox(':memory:');
  const probes = [
    { seq: 1, id: 'probe-env-1', kind: 'environment', checked_at: '2026-09-22T01:00:00.000Z', capability_id: 'hdc', status: 'blocked', reason_code: 'executable_not_found', duration_ms: 13 },
    { seq: 1, id: 'probe-device-1', kind: 'device', checked_at: '2026-09-22T01:00:01.000Z', capability_id: 'hdc_device', device_alias: 'wsl-usb-1', product_family: 'openharmony', status: 'available', duration_ms: 38 },
  ];
  const count = await sync.enqueueLocalProbeEvents({
    listProbes: async () => ({ probes }), outbox,
    identity: { tenant_id: 'tenant-1', device_id: 'device-1', workspace_id: 'workspace-1' },
    privateKey, keyId: 'device-key-1',
  });
  assert.equal(count, 2);
  const events = await outbox.pending();
  assert.deepEqual(events.map((event) => event.type), ['environment.probed', 'device.probed']);
  assert.ok(events.every((event) => event.run_id === '__connector_telemetry__'));
  assert.equal(events[0].payload.reason_code, 'executable_not_found');
  assert.equal(events[1].payload.device_alias_hash.length, 64);
  assert.equal(JSON.stringify(events).includes('wsl-usb-1'), false);
  for (const event of events) assert.equal(verifySignedRunEvent(event, publicKey), true);
  assert.equal(await sync.enqueueLocalProbeEvents({
    listProbes: async () => ({ probes }), outbox,
    identity: { tenant_id: 'tenant-1', device_id: 'device-1', workspace_id: 'workspace-1' }, privateKey, keyId: 'device-key-1',
  }), 0);
});
