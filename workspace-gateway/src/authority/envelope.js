const ENVELOPE_KEYS = new Set([
  'schema_version', 'message_type', 'tenant_id', 'workspace_id', 'cloud_run_id',
  'authority_run_id', 'revision', 'phase_epoch', 'connection_epoch', 'operation_id',
  'nonce', 'sent_at', 'payload', 'signature',
]);

const MESSAGE_TYPES = new Set([
  'authority.hello',
  'authority.inspect',
  'authority.transition',
  'operation.start',
  'operation.ack',
  'operation.result',
  'operation.cancel',
  'approval.request',
  'approval.apply',
  'event.append',
]);

const SIDE_EFFECTING_MESSAGES = new Set([
  'authority.transition', 'operation.start', 'operation.ack', 'operation.result',
  'operation.cancel', 'approval.apply', 'event.append',
]);

export class AuthorityProtocolError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'AuthorityProtocolError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new AuthorityProtocolError(code, message, details);
}

function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('field_required', `${field} must be a non-empty string`, { field });
  }
}

function positiveInteger(value, field) {
  if (!Number.isInteger(value) || value < 1) {
    fail('field_invalid', `${field} must be a positive integer`, { field });
  }
}

function plainObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('field_invalid', `${field} must be a JSON object`, { field });
  }
}

function checkUnknownFields(envelope) {
  for (const key of Object.keys(envelope)) {
    if (!ENVELOPE_KEYS.has(key)) {
      fail('unknown_field', `${key} is not allowed in an Authority envelope`, { key });
    }
  }
}

export function createAuthorityEnvelope(fields) {
  return {
    schema_version: 1,
    ...structuredClone(fields),
  };
}

export function validateAuthorityEnvelope(input, { expected = {} } = {}) {
  plainObject(input, 'envelope');
  checkUnknownFields(input);
  const envelope = structuredClone(input);
  if (envelope.schema_version !== 1) {
    fail('schema_version_invalid', 'only Authority envelope schema version 1 is supported');
  }
  text(envelope.message_type, 'message_type');
  if (!MESSAGE_TYPES.has(envelope.message_type)) {
    fail('message_type_invalid', `unsupported Authority message type: ${envelope.message_type}`);
  }
  for (const field of ['tenant_id', 'workspace_id', 'cloud_run_id', 'authority_run_id', 'phase_epoch', 'nonce', 'sent_at']) {
    text(envelope[field], field);
  }
  positiveInteger(envelope.revision, 'revision');
  positiveInteger(envelope.connection_epoch, 'connection_epoch');
  if (!Number.isFinite(Date.parse(envelope.sent_at))) {
    fail('sent_at_invalid', 'sent_at must be an RFC3339 timestamp');
  }
  plainObject(envelope.payload, 'payload');
  plainObject(envelope.signature, 'signature');
  text(envelope.signature.key_id, 'signature.key_id');
  text(envelope.signature.value, 'signature.value');

  if (SIDE_EFFECTING_MESSAGES.has(envelope.message_type)) {
    if (envelope.operation_id === undefined || envelope.operation_id === null) {
      fail('operation_id_required', 'side-effecting Authority messages require operation_id');
    }
    text(envelope.operation_id, 'operation_id');
  }
  for (const field of ['tenant_id', 'workspace_id', 'cloud_run_id', 'authority_run_id']) {
    if (expected[field] !== undefined && envelope[field] !== expected[field]) {
      fail('context_mismatch', `${field} does not match the bound Authority context`, { field });
    }
  }
  if (expected.revision !== undefined) {
    positiveInteger(expected.revision, 'expected.revision');
    if (envelope.revision < expected.revision) {
      fail('stale_revision', 'Authority envelope revision is older than the current revision');
    }
    if (envelope.revision > expected.revision) {
      fail('future_revision', 'Authority envelope revision is newer than the current revision');
    }
  }
  if (expected.phase_epoch !== undefined && envelope.phase_epoch !== expected.phase_epoch) {
    fail('stale_phase_epoch', 'Authority envelope phase epoch is no longer current');
  }
  if (expected.connection_epoch !== undefined) {
    positiveInteger(expected.connection_epoch, 'expected.connection_epoch');
    if (envelope.connection_epoch < expected.connection_epoch) {
      fail('stale_connection_epoch', 'Authority envelope came from an older connector session');
    }
    if (envelope.connection_epoch > expected.connection_epoch) {
      fail('future_connection_epoch', 'Authority envelope came from an unknown connector session');
    }
  }
  return envelope;
}
