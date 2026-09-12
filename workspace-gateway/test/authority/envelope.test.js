import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  AuthorityProtocolError,
  createAuthorityEnvelope,
  validateAuthorityEnvelope,
} from '../../src/authority/envelope.js';

const context = {
  tenant_id: 'tenant-1',
  workspace_id: 'workspace-1',
  cloud_run_id: 'run-1',
  authority_run_id: 'authority-run-1',
  revision: 3,
  phase_epoch: 'phase-3-a',
  connection_epoch: 7,
};

function validEnvelope(overrides = {}) {
  return createAuthorityEnvelope({
    message_type: 'operation.start',
    operation_id: 'operation-1',
    nonce: 'nonce-1',
    sent_at: '2026-09-12T00:00:00.000Z',
    signature: { key_id: 'gateway-key', value: 'detached-signature' },
    payload: { operation_kind: 'gate', action_ref: 'gate_env_init.py' },
    ...context,
    ...overrides,
  });
}

describe('Authority envelope contract', () => {
  test('creates and validates a bound operation envelope', () => {
    const envelope = validEnvelope();
    const validated = validateAuthorityEnvelope(envelope, { expected: context });
    assert.equal(validated.message_type, 'operation.start');
    assert.equal(validated.operation_id, 'operation-1');
    assert.equal(validated.schema_version, 1);
  });

  test('rejects cross-tenant or cross-workspace envelopes', () => {
    assert.throws(
      () => validateAuthorityEnvelope(validEnvelope({ tenant_id: 'tenant-2' }), { expected: context }),
      (error) => error instanceof AuthorityProtocolError && error.code === 'context_mismatch',
    );
    assert.throws(
      () => validateAuthorityEnvelope(validEnvelope({ workspace_id: 'workspace-2' }), { expected: context }),
      (error) => error instanceof AuthorityProtocolError && error.code === 'context_mismatch',
    );
  });

  test('fences stale revisions, phase epochs and connector sessions', () => {
    assert.throws(
      () => validateAuthorityEnvelope(validEnvelope({ revision: 2 }), { expected: context }),
      (error) => error instanceof AuthorityProtocolError && error.code === 'stale_revision',
    );
    assert.throws(
      () => validateAuthorityEnvelope(validEnvelope({ phase_epoch: 'phase-2-a' }), { expected: context }),
      (error) => error instanceof AuthorityProtocolError && error.code === 'stale_phase_epoch',
    );
    assert.throws(
      () => validateAuthorityEnvelope(validEnvelope({ connection_epoch: 6 }), { expected: context }),
      (error) => error instanceof AuthorityProtocolError && error.code === 'stale_connection_epoch',
    );
  });

  test('requires an operation id for side-effecting messages and rejects unknown fields', () => {
    assert.throws(
      () => validateAuthorityEnvelope(validEnvelope({ operation_id: undefined }), { expected: context }),
      (error) => error instanceof AuthorityProtocolError && error.code === 'operation_id_required',
    );
    const tampered = validEnvelope();
    tampered.elevate_to_root = true;
    assert.throws(
      () => validateAuthorityEnvelope(tampered, { expected: context }),
      (error) => error instanceof AuthorityProtocolError && error.code === 'unknown_field',
    );
  });
});
