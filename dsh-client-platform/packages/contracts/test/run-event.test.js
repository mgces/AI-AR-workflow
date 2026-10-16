import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';

const protocol = await import('../src/run-event.js').catch(() => null);

test('client protocol exposes signed run event creation and verification', () => {
  assert.equal(typeof protocol?.createSignedRunEvent, 'function');
  assert.equal(typeof protocol?.verifySignedRunEvent, 'function');
});

test('signed event is verifiable and payload changes are rejected', () => {
  assert.equal(typeof protocol?.createSignedRunEvent, 'function');
  assert.equal(typeof protocol?.verifySignedRunEvent, 'function');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const event = protocol.createSignedRunEvent({
    fields: {
      event_id: 'event-1', tenant_id: 'tenant-1', device_id: 'device-1',
      workspace_id: 'workspace-1', run_id: 'run-1', client_seq: 1,
      run_revision: 1, type: 'run.created', occurred_at: '2026-09-21T00:00:00.000Z',
      payload: { workflow_id: 'ar-delivery', status: 'preflight' },
    },
    privateKey,
    keyId: 'device-key-1',
  });
  assert.equal(protocol.verifySignedRunEvent(event, publicKey), true);
  assert.throws(() => protocol.verifySignedRunEvent({
    ...event, payload: { ...event.payload, status: 'failed' },
  }, publicKey), { code: 'run_event_signature_invalid' });
});

test('event schema rejects unknown types and oversized payloads', () => {
  assert.equal(typeof protocol?.createSignedRunEvent, 'function');
  const { privateKey } = generateKeyPairSync('ed25519');
  const base = {
    event_id: 'event-2', tenant_id: 'tenant-1', device_id: 'device-1',
    workspace_id: 'workspace-1', run_id: 'run-1', client_seq: 2,
    run_revision: 1, occurred_at: '2026-09-21T00:00:00.000Z', payload: {},
  };
  assert.throws(() => protocol.createSignedRunEvent({
    fields: { ...base, type: 'shell.run' }, privateKey, keyId: 'device-key-1',
  }), { code: 'run_event_type_invalid' });
  assert.throws(() => protocol.createSignedRunEvent({
    fields: { ...base, type: 'run.created', payload: { text: 'x'.repeat(300_000) } },
    privateKey, keyId: 'device-key-1',
  }), { code: 'run_event_payload_too_large' });
});

test('event payloads reject unknown free-text fields and unsafe identifier values', () => {
  const { privateKey } = generateKeyPairSync('ed25519');
  const fields = {
    event_id: 'event-private', tenant_id: 'tenant-1', device_id: 'device-1',
    workspace_id: 'workspace-1', run_id: 'run-1', client_seq: 1,
    run_revision: 1, type: 'run.created', occurred_at: '2026-09-21T00:00:00.000Z',
    payload: { workflow_id: 'ar-delivery', status: 'running', note: 'private source path /home/user/code' },
  };
  assert.throws(() => protocol.createSignedRunEvent({ fields, privateKey, keyId: 'device-key-1' }),
    { code: 'run_event_payload_unknown_field' });
  assert.throws(() => protocol.createSignedRunEvent({
    fields: { ...fields, payload: { workflow_id: '../../private/source', status: 'running' } },
    privateKey, keyId: 'device-key-1',
  }), { code: 'run_event_payload_invalid' });
});

test('human input content is permitted only by explicit bounded full-diagnostics policy', () => {
  const { privateKey } = generateKeyPairSync('ed25519');
  const base = {
    event_id: 'event-human-input', tenant_id: 'tenant-1', device_id: 'device-1',
    workspace_id: 'workspace-1', run_id: 'run-1', client_seq: 1,
    run_revision: 1, type: 'human.input_recorded', occurred_at: '2026-09-21T00:00:00.000Z',
  };
  const metricsOnly = {
    action_type: 'input', content_sha256: 'a'.repeat(64), content_bytes: 6,
    content_policy: 'metrics_only', content_text: 'secret',
  };
  assert.throws(() => protocol.createSignedRunEvent({
    fields: { ...base, payload: metricsOnly }, privateKey, keyId: 'device-key-1',
  }), { code: 'run_event_payload_invalid' });
  assert.throws(() => protocol.createSignedRunEvent({
    fields: { ...base, payload: { ...metricsOnly, content_bytes: 3, content_policy: 'full_diagnostics' } },
    privateKey, keyId: 'device-key-1',
  }), { code: 'run_event_payload_invalid' });
  const optedIn = protocol.createSignedRunEvent({
    fields: { ...base, payload: { ...metricsOnly, content_policy: 'full_diagnostics', content_text: 'secret' } },
    privateKey, keyId: 'device-key-1',
  });
  assert.equal(optedIn.payload.content_text, 'secret');
  assert.throws(() => protocol.createSignedRunEvent({
    fields: { ...base, payload: { ...metricsOnly, content_policy: 'full_diagnostics', content_text: 'x'.repeat(16 * 1024 + 1) } },
    privateKey, keyId: 'device-key-1',
  }), { code: 'run_event_payload_invalid' });
});
