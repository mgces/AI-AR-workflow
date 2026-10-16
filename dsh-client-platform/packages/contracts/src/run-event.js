import { createHash, sign, verify } from 'node:crypto';

export const RUN_EVENT_TYPES = new Set([
  'run.created', 'run.completed', 'run.failed', 'run.cancelled',
  'stage.started', 'stage.task_claimed', 'stage.task_submitted', 'stage.gate_completed',
  'stage.blocked', 'stage.resumed', 'stage.cancelled',
  'human.input_recorded', 'human.wait_started', 'human.wait_completed',
  'review.requested', 'review.applied', 'review.rejected', 'review.stale',
  'artifact.registered', 'agent.execution_started', 'agent.execution_completed',
  'agent.execution_failed', 'environment.probed', 'device.probed',
]);

const EVENT_KEYS = new Set([
  'schema_version', 'event_id', 'tenant_id', 'device_id', 'workspace_id', 'run_id',
  'client_seq', 'run_revision', 'type', 'occurred_at', 'payload',
  'previous_event_hash', 'event_hash', 'device_signature',
]);
const PAYLOAD_FIELDS = {
  'run.created': ['workflow_id', 'workflow_digest', 'status', 'data_policy'],
  'run.completed': ['workflow_id', 'workflow_digest', 'status', 'duration_ms'],
  'run.failed': ['workflow_id', 'workflow_digest', 'status', 'duration_ms', 'failure_class', 'reason_code'],
  'run.cancelled': ['workflow_id', 'workflow_digest', 'status', 'duration_ms', 'reason_code'],
  'stage.started': ['phase', 'attempt', 'started_at'],
  'stage.task_claimed': ['phase', 'task_id', 'agent_id'],
  'stage.task_submitted': ['phase', 'task_id', 'artifact_refs'],
  'stage.gate_completed': ['phase', 'gate_id', 'status', 'failure_class', 'reason_code', 'duration_ms', 'evidence_refs'],
  'stage.blocked': ['phase', 'reason_code', 'failure_class'],
  'stage.resumed': ['phase', 'attempt'],
  'stage.cancelled': ['phase', 'reason_code'],
  'human.input_recorded': ['action_type', 'actor_hash', 'content_sha256', 'content_bytes', 'content_policy', 'content_text'],
  'human.wait_started': ['phase', 'wait_id', 'action_type'],
  'human.wait_completed': ['phase', 'wait_id', 'duration_ms', 'action_type', 'actor_hash'],
  'review.requested': ['bundle_digest', 'bundle_revision', 'artifact_refs'],
  'review.applied': ['decision', 'bundle_digest', 'bundle_revision', 'actor_hash', 'artifact_refs'],
  'review.rejected': ['decision', 'bundle_digest', 'bundle_revision', 'actor_hash', 'reason_code'],
  'review.stale': ['decision', 'bundle_digest', 'bundle_revision', 'actor_hash', 'reason_code'],
  'artifact.registered': ['artifact_id', 'sha256', 'size_bytes', 'content_type', 'classification', 'source_stage'],
  'agent.execution_started': ['agent_id', 'model_id', 'attempt'],
  'agent.execution_completed': ['agent_id', 'model_id', 'phase', 'duration_ms', 'input_tokens', 'output_tokens', 'total_tokens', 'usage_source', 'usage_complete'],
  'agent.execution_failed': ['agent_id', 'model_id', 'phase', 'duration_ms', 'failure_class', 'retryable'],
  'environment.probed': ['capability_id', 'status', 'reason_code', 'duration_ms'],
  'device.probed': ['device_alias_hash', 'product_family', 'status', 'reason_code', 'duration_ms'],
};
const INTEGER_FIELDS = new Set([
  'attempt', 'bundle_revision', 'content_bytes', 'duration_ms', 'input_tokens', 'output_tokens',
  'size_bytes', 'total_tokens',
]);
const HASH_FIELDS = new Set(['actor_hash', 'bundle_digest', 'content_sha256', 'device_alias_hash', 'sha256', 'workflow_digest']);
const HASH_LIST_FIELDS = new Set(['artifact_refs', 'evidence_refs']);
const BOOLEAN_FIELDS = new Set(['retryable', 'usage_complete']);
const TIMESTAMP_FIELDS = new Set(['started_at']);
const ENUM_FIELDS = {
  status: new Set(['available', 'blocked', 'cancelled', 'completed', 'created', 'failed', 'offline', 'online', 'passed', 'preflight', 'ready', 'running', 'unavailable', 'unknown', 'warning']),
  decision: new Set(['applied', 'approved', 'rejected', 'returned', 'stale']),
  data_policy: new Set(['metrics_only', 'review_bundle', 'full_diagnostics']),
  content_policy: new Set(['metrics_only', 'review_bundle', 'full_diagnostics']),
  classification: new Set(['public', 'internal', 'confidential', 'restricted']),
  usage_source: new Set(['provider_reported', 'agent_reported', 'unavailable']),
  action_type: new Set(['approve', 'cancel', 'continue', 'edit', 'input', 'reject', 'retry', 'skip', 'submit']),
  product_family: new Set(['harmonyos', 'openharmony', 'unknown', 'other']),
};
const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/u;
const MAX_PAYLOAD_BYTES = 256 * 1024;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function eventError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 512 || /[\0\r\n]/u.test(value)) {
    throw eventError('run_event_invalid', `${field} must be a bounded non-empty string`, { field });
  }
}

function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw eventError('run_event_invalid', 'event contains a non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw eventError('run_event_invalid', 'event contains a value that is not JSON data');
  }
  const entries = Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`);
  return `{${entries.join(',')}}`;
}

function eventDigest(event) {
  const { event_hash: _hash, device_signature: _signature, ...unsigned } = event;
  return createHash('sha256').update(canonical(unsigned), 'utf8').digest('hex');
}

function validatePayload(type, payload) {
  const allowed = new Set(PAYLOAD_FIELDS[type] ?? []);
  for (const [key, value] of Object.entries(payload)) {
    if (!allowed.has(key)) {
      throw eventError('run_event_payload_unknown_field', `payload.${key} is not allowed for ${type}`, { field: `payload.${key}`, type });
    }
    if (INTEGER_FIELDS.has(key)) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw eventError('run_event_payload_invalid', `payload.${key} must be a non-negative safe integer`, { field: `payload.${key}` });
      }
      continue;
    }
    if (key === 'content_text') {
      if (type !== 'human.input_recorded' || payload.content_policy !== 'full_diagnostics'
          || typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > 16 * 1024) {
        throw eventError('run_event_payload_invalid', 'payload.content_text requires explicit full_diagnostics policy and must not exceed 16 KiB', { field: 'payload.content_text' });
      }
      continue;
    }
    if (BOOLEAN_FIELDS.has(key)) {
      if (typeof value !== 'boolean') throw eventError('run_event_payload_invalid', `payload.${key} must be boolean`, { field: `payload.${key}` });
      continue;
    }
    if (HASH_FIELDS.has(key)) {
      if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
        throw eventError('run_event_payload_invalid', `payload.${key} must be a SHA-256 digest`, { field: `payload.${key}` });
      }
      continue;
    }
    if (HASH_LIST_FIELDS.has(key)) {
      if (!Array.isArray(value) || value.length > 100 || value.some((item) =>
        typeof item !== 'string' || !/^artifact:sha256:[a-f0-9]{64}$/u.test(item))) {
        throw eventError('run_event_payload_invalid', `payload.${key} must contain artifact digest references`, { field: `payload.${key}` });
      }
      continue;
    }
    if (TIMESTAMP_FIELDS.has(key)) {
      if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
        throw eventError('run_event_payload_invalid', `payload.${key} must be an RFC3339 timestamp`, { field: `payload.${key}` });
      }
      continue;
    }
    const validString = key === 'content_type'
      ? typeof value === 'string' && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/u.test(value) && value.length <= 127
      : key === 'model_id'
        ? typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/+-]{0,127}$/u.test(value)
        : typeof value === 'string' && TOKEN_PATTERN.test(value);
    if (!validString) {
      throw eventError('run_event_payload_invalid', `payload.${key} must be a bounded non-free-text identifier`, { field: `payload.${key}` });
    }
    if (key === 'phase' && !/^P[0-8]$/u.test(value)) {
      throw eventError('run_event_payload_invalid', 'payload.phase must be a workflow phase from P0 through P8', { field: 'payload.phase' });
    }
    if (ENUM_FIELDS[key] && !ENUM_FIELDS[key].has(value)) {
      throw eventError('run_event_payload_invalid', `payload.${key} is not a supported value`, { field: `payload.${key}` });
    }
    if (key === 'reason_code' && !/^[a-z][a-z0-9_]{0,63}$/u.test(value)) {
      throw eventError('run_event_payload_invalid', 'payload.reason_code must be a stable lower-case code', { field: 'payload.reason_code' });
    }
    if (key === 'failure_class' && !/^[a-z][a-z0-9_]{0,63}$/u.test(value)) {
      throw eventError('run_event_payload_invalid', 'payload.failure_class must be a stable lower-case code', { field: 'payload.failure_class' });
    }
  }
  if (Object.hasOwn(payload, 'content_text') && payload.content_policy !== 'full_diagnostics') {
    throw eventError('run_event_payload_invalid', 'payload.content_text is not allowed without full_diagnostics policy', { field: 'payload.content_text' });
  }
  if (Object.hasOwn(payload, 'content_text')
      && (!Number.isSafeInteger(payload.content_bytes)
        || payload.content_bytes < Buffer.byteLength(payload.content_text, 'utf8'))) {
    throw eventError('run_event_payload_invalid', 'payload.content_bytes must cover the transmitted content_text', { field: 'payload.content_bytes' });
  }
}

export function validateRunEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw eventError('run_event_invalid', 'event must be an object');
  }
  for (const key of Object.keys(event)) {
    if (!EVENT_KEYS.has(key)) throw eventError('run_event_unknown_field', `${key} is not an allowed event field`, { field: key });
  }
  if (event.schema_version !== 1) throw eventError('run_event_schema_unsupported', 'only run event schema version 1 is supported');
  for (const field of ['event_id', 'tenant_id', 'device_id', 'workspace_id', 'run_id']) requiredText(event[field], field);
  for (const field of ['client_seq', 'run_revision']) {
    if (!Number.isSafeInteger(event[field]) || event[field] < 1) {
      throw eventError('run_event_invalid', `${field} must be a positive safe integer`, { field });
    }
  }
  if (typeof event.type !== 'string' || !RUN_EVENT_TYPES.has(event.type)) {
    throw eventError('run_event_type_invalid', 'event type is not in the protocol allowlist', { type: event.type ?? null });
  }
  if (typeof event.occurred_at !== 'string' || !Number.isFinite(Date.parse(event.occurred_at))) {
    throw eventError('run_event_invalid', 'occurred_at must be an RFC3339 timestamp', { field: 'occurred_at' });
  }
  if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
    throw eventError('run_event_invalid', 'payload must be an object', { field: 'payload' });
  }
  const payloadBytes = Buffer.byteLength(canonical(event.payload), 'utf8');
  if (payloadBytes > MAX_PAYLOAD_BYTES) {
    throw eventError('run_event_payload_too_large', 'event payload exceeds the protocol limit', {
      max_bytes: MAX_PAYLOAD_BYTES, actual_bytes: payloadBytes,
    });
  }
  validatePayload(event.type, event.payload);
  if (event.previous_event_hash !== undefined && !HASH_PATTERN.test(event.previous_event_hash)) {
    throw eventError('run_event_invalid', 'previous_event_hash must be a SHA-256 digest', { field: 'previous_event_hash' });
  }
  if (event.event_hash !== undefined && !HASH_PATTERN.test(event.event_hash)) {
    throw eventError('run_event_invalid', 'event_hash must be a SHA-256 digest', { field: 'event_hash' });
  }
  if (event.device_signature !== undefined) {
    const value = event.device_signature;
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || value.algorithm !== 'ed25519' || typeof value.key_id !== 'string' || !value.key_id.trim()
        || typeof value.value !== 'string' || value.value.length > 512) {
      throw eventError('run_event_signature_invalid', 'device_signature must use a bounded Ed25519 signature');
    }
  }
  return structuredClone(event);
}

export function createSignedRunEvent({ fields, privateKey, keyId } = {}) {
  if (!privateKey) throw eventError('run_event_signer_missing', 'privateKey is required to sign an event');
  requiredText(keyId, 'key_id');
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw eventError('run_event_invalid', 'fields must be an object');
  }
  const event = validateRunEvent({ schema_version: 1, ...structuredClone(fields) });
  if (event.event_hash !== undefined || event.device_signature !== undefined) {
    throw eventError('run_event_invalid', 'signed fields cannot supply event_hash or device_signature');
  }
  const digest = eventDigest(event);
  const signature = sign(null, Buffer.from(digest, 'hex'), privateKey).toString('base64url');
  return {
    ...event,
    event_hash: digest,
    device_signature: { key_id: keyId, algorithm: 'ed25519', value: signature },
  };
}

export function verifySignedRunEvent(event, publicKey) {
  const value = validateRunEvent(event);
  if (!publicKey || !value.event_hash || !value.device_signature) {
    throw eventError('run_event_signature_invalid', 'event hash, signature, and public key are required');
  }
  const actualDigest = eventDigest(value);
  if (actualDigest !== value.event_hash) {
    throw eventError('run_event_signature_invalid', 'event digest does not match its content');
  }
  let valid = false;
  try {
    valid = verify(null, Buffer.from(actualDigest, 'hex'), publicKey, Buffer.from(value.device_signature.value, 'base64url'));
  } catch {
    valid = false;
  }
  if (!valid) throw eventError('run_event_signature_invalid', 'device signature verification failed');
  return true;
}

export const RUN_EVENT_MAX_PAYLOAD_BYTES = MAX_PAYLOAD_BYTES;
