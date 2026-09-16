import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthorityEnvelope } from '../../src/authority/envelope.js';
import {
  canonicalAuthorityEnvelope,
  createHmacSigner,
  createHmacVerifier,
} from '../../src/authority/signature.js';

const context = {
  tenant_id: 'tenant-1', workspace_id: 'workspace-1', cloud_run_id: 'run-1',
  authority_run_id: 'authority-1', revision: 1, phase_epoch: 'P0-a', connection_epoch: 1,
};

function unsigned(overrides = {}) {
  return createAuthorityEnvelope({
    message_type: 'operation.start', operation_id: 'op-1', nonce: 'nonce-1',
    sent_at: '2026-09-14T00:00:00.000Z', payload: { operation_kind: 'workspace.inspect' },
    ...context, ...overrides,
  });
}

test('HMAC signer and verifier bind the complete Authority envelope', async () => {
  const secret = 'unit-test-secret-with-enough-entropy-0123456789';
  const sign = createHmacSigner({ secret, keyId: 'cloud-key' });
  const verify = createHmacVerifier({ secret, keyId: 'cloud-key' });
  const envelope = { ...unsigned(), signature: await sign(unsigned()) };
  assert.equal(await verify(envelope), true);
  const changed = { ...envelope, payload: { operation_kind: 'workspace.read', path: 'x' } };
  assert.equal(await verify(changed), false);
  assert.match(canonicalAuthorityEnvelope(envelope), /operation\.start/);
});

test('HMAC verifier rejects an unknown key id and malformed value', async () => {
  const sign = createHmacSigner({ secret: 'another-secret-with-enough-entropy-0123456789', keyId: 'known' });
  const verifier = createHmacVerifier({ secret: 'another-secret-with-enough-entropy-0123456789', keyId: 'known' });
  const envelope = { ...unsigned(), signature: await sign(unsigned()) };
  assert.equal(await verifier({ ...envelope, signature: { ...envelope.signature, key_id: 'other' } }), false);
  assert.equal(await verifier({ ...envelope, signature: { ...envelope.signature, value: 'not-base64' } }), false);
});
