import {
  cloneWithout,
  isSha256Digest,
  sha256Hex,
} from '../../contracts/src/canonical.js';

const AR_STAGE_IDS = Object.freeze([
  'P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8-precheck', 'P8-publish',
]);

const AR_CONSENTS = Object.freeze({
  P0: null,
  P1: 'design',
  P2: null,
  P3: null,
  P4: null,
  P5: null,
  P6: 'device_result',
  P7: 'quality',
  'P8-precheck': 'publish',
  'P8-publish': null,
});

const MANIFEST_KEYS = new Set([
  'schema_version', 'kind', 'workflow_id', 'version', 'display_name', 'digest',
  'source_lock_status', 'installable', 'source_lock', 'entry_adapter', 'input_schema',
  'parameters_schema', 'stages', 'authority', 'observability', 'execution_profile',
  'execution_profiles', 'capabilities', 'signature', 'validation_notice', 'design_version',
  'initialization', 'rag', 'debug', 'publication_backends', 'policy',
]);
const SOURCE_LOCK_KEYS = new Set([
  'repository_commit', 'runtime_path', 'gate_scripts_path', 'runtime_digest',
  'skills_digest', 'dsh_version', 'gate_protocol_version',
]);
const STAGE_KEYS = new Set([
  'id', 'physical_phase', 'task_key', 'gate', 'depends_on', 'required_capabilities',
  'consent_kind', 'artifact_roles', 'authority', 'timeout_policy', 'retry_policy',
  'allow_push', 'requires_valid_publish_receipt',
]);

export class ManifestValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ManifestValidationError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new ManifestValidationError(code, message, details);
}

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('manifest_field_required', `${field} must be a non-empty string`, { field });
  }
}

function rejectUnknownKeys(value, allowed, scope) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail('unknown_field', `${scope}.${key} is not in the manifest contract`, { scope, key });
  }
}

function validateDigest(value, field) {
  if (!isSha256Digest(value)) fail(`${field}_invalid`, `${field} must be a lowercase SHA-256 digest`);
}

function validateStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    fail('stages_required', 'manifest must contain at least one stage');
  }
  const byId = new Map();
  for (const stage of stages) {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) {
      fail('stage_invalid', 'each stage must be an object');
    }
    rejectUnknownKeys(stage, STAGE_KEYS, `stage[${stage.id ?? '?'}]`);
    requiredText(stage.id, 'stage.id');
    if (byId.has(stage.id)) fail('stage_duplicate', `duplicate stage id: ${stage.id}`);
    byId.set(stage.id, stage);
    if (!Number.isInteger(stage.physical_phase) || stage.physical_phase < 0
      || stage.physical_phase > 8) {
      fail('stage_phase_invalid', `stage ${stage.id} has an invalid physical phase`);
    }
    requiredText(stage.task_key, `stage ${stage.id}.task_key`);
    requiredText(stage.gate, `stage ${stage.id}.gate`);
    if (stage.gate.startsWith('/') || stage.gate.includes('\\')
      || stage.gate.split('/').includes('..')) {
      fail('unsafe_gate_path', `stage ${stage.id} gate path escapes the gate directory`);
    }
    if (!Array.isArray(stage.depends_on)) {
      fail('stage_dependencies_invalid', `stage ${stage.id}.depends_on must be an array`);
    }
    for (const dependency of stage.depends_on) {
      if (typeof dependency !== 'string' || !byId.has(dependency)) {
        // Dependencies may refer to a stage declared later; defer the existence check.
        continue;
      }
    }
  }
  for (const stage of stages) {
    for (const dependency of stage.depends_on) {
      if (!byId.has(dependency)) {
        fail('stage_dependency_missing', `stage ${stage.id} depends on missing ${dependency}`);
      }
      if (dependency === stage.id) fail('stage_cycle', `stage ${stage.id} depends on itself`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) fail('stage_cycle', `stage dependency cycle includes ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id).depends_on) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const stage of stages) visit(stage.id);
  return byId;
}

export function computeManifestDigest(manifest) {
  return sha256Hex(cloneWithout(manifest, ['digest', 'signature']));
}

export function validateWorkflowManifest(input, { installable = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('manifest_invalid', 'workflow manifest must be an object');
  }
  const manifest = structuredClone(input);
  rejectUnknownKeys(manifest, MANIFEST_KEYS, 'manifest');
  if (!Number.isInteger(manifest.schema_version) || manifest.schema_version < 1) {
    fail('manifest_schema_version_invalid', 'schema_version must be a positive integer');
  }
  requiredText(manifest.workflow_id, 'workflow_id');
  requiredText(manifest.version, 'version');
  requiredText(manifest.entry_adapter, 'entry_adapter');
  requiredText(manifest.display_name, 'display_name');
  validateStages(manifest.stages);
  if (!manifest.source_lock || typeof manifest.source_lock !== 'object') {
    fail('source_lock_required', 'manifest.source_lock is required');
  }
  rejectUnknownKeys(manifest.source_lock, SOURCE_LOCK_KEYS, 'source_lock');
  if (installable) {
    if (!isSha256Digest(manifest.digest)) fail('manifest_digest_required', 'installable manifest digest is required');
    if (manifest.source_lock_status !== 'locked') {
      fail('source_lock_unlocked', 'installable manifests require a locked source_lock');
    }
    for (const field of ['repository_commit', 'runtime_path', 'gate_scripts_path']) {
      requiredText(manifest.source_lock[field], `source_lock.${field}`);
    }
    validateDigest(manifest.source_lock.runtime_digest, 'source_lock.runtime_digest');
    validateDigest(manifest.source_lock.skills_digest, 'source_lock.skills_digest');
    requiredText(manifest.source_lock.dsh_version, 'source_lock.dsh_version');
    if (manifest.digest !== computeManifestDigest(manifest)) {
      fail('manifest_digest_mismatch', 'manifest digest does not match its content');
    }
    if (!manifest.signature || typeof manifest.signature !== 'object') {
      fail('manifest_signature_required', 'installable manifest signature is required');
    }
    requiredText(manifest.signature.key_id, 'signature.key_id');
    requiredText(manifest.signature.value, 'signature.value');
  }
  return manifest;
}

export function validateArDeliveryManifest(input, options = {}) {
  const manifest = validateWorkflowManifest(input, options);
  if (manifest.workflow_id !== 'ar-delivery') {
    fail('workflow_id_mismatch', 'AR validator only accepts the ar-delivery workflow');
  }
  if (manifest.stages.length !== AR_STAGE_IDS.length) {
    fail('ar_stage_count', 'AR delivery must contain exactly P0-P8 plus P8 precheck/publish');
  }
  const ids = manifest.stages.map((stage) => stage.id);
  if (ids.some((id, index) => id !== AR_STAGE_IDS[index])) {
    fail('ar_stage_order', 'AR stages must remain in the fixed P0-P8 order');
  }
  for (const stage of manifest.stages) {
    if ((AR_CONSENTS[stage.id] ?? null) !== (stage.consent_kind ?? null)) {
      fail('ar_consent_policy', `stage ${stage.id} has an invalid consent kind`);
    }
    if (stage.id === 'P8-publish' && stage.requires_valid_publish_receipt !== true) {
      fail('publish_receipt_required', 'P8-publish must require a valid publish receipt');
    }
  }
  return manifest;
}

export class WorkflowRegistry {
  #manifests = new Map();

  register(input, options = {}) {
    const manifest = validateWorkflowManifest(input, options);
    const key = `${manifest.workflow_id}@${manifest.version}`;
    if (this.#manifests.has(key)) fail('workflow_version_exists', `workflow version already registered: ${key}`);
    this.#manifests.set(key, Object.freeze(manifest));
    return manifest;
  }

  get(workflowId, version) {
    return this.#manifests.get(`${workflowId}@${version}`) ?? null;
  }

  list() {
    return [...this.#manifests.values()];
  }
}
