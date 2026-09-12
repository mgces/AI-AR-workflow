import {
  cloneWithout,
  isSha256Digest,
  sha256Hex,
} from './canonical.js';

export const ENVIRONMENT_BRANCHES = Object.freeze([
  'openharmony',
  'harmonyos/system',
  'harmonyos/chip',
]);

const PLACEHOLDER_RE = /^(?:UNSET|TODO|TBD|REPLACE(?:_| )?ME|PENDING(?:_| )?PROBE)$/i;
const SAFE_TEMPLATE_TOKEN_RE = /^[A-Za-z0-9_./:${}+=,@%~-]+$/;

export class ProfileValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ProfileValidationError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new ProfileValidationError(code, message, details);
}

function requireObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('profile_field_type', `${field} must be an object`);
  }
}

function requireText(value, field, { allowPlaceholder = false } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('profile_field_required', `${field} must be a non-empty string`, { field });
  }
  if (!allowPlaceholder && PLACEHOLDER_RE.test(value.trim())) {
    fail('profile_placeholder', `${field} still contains an unresolved placeholder`, { field });
  }
}

function requireRelativePath(value, field) {
  requireText(value, field);
  if (value.startsWith('/') || value.includes('\\') || value.split('/').includes('..')) {
    fail('profile_path_unsafe', `${field} must be a relative path without parent traversal`, { field });
  }
}

function normalizeMarkers(markers, field, { installable }) {
  if (markers == null && !installable) return [];
  if (!Array.isArray(markers) || markers.length === 0) {
    fail('profile_markers_required', `${field} must contain at least one marker`, { field });
  }
  return markers.map((marker, index) => {
    requireRelativePath(marker, `${field}[${index}]`);
    return marker;
  });
}

export function computeProfileDigest(profile) {
  return sha256Hex(cloneWithout(profile, ['profile_digest', 'digest']));
}

export function validateEnvironmentProfile(input, { installable = true } = {}) {
  requireObject(input, 'profile');
  const profile = structuredClone(input);
  requireText(profile.profile_id, 'profile_id');
  requireText(profile.version, 'version');
  requireText(profile.environment, 'environment');
  if (!['openharmony', 'harmonyos'].includes(profile.environment)) {
    fail('environment_unknown', `unsupported environment: ${profile.environment}`);
  }

  if (profile.environment === 'openharmony') {
    if (profile.component_type !== null && profile.component_type !== undefined) {
      fail('environment_subtype_invalid', 'OpenHarmony component_type must be null');
    }
    profile.component_type = null;
    if (profile.upload_backend !== 'gitcode') {
      fail('upload_backend_mismatch', 'OpenHarmony profiles must use the GitCode backend');
    }
  } else {
    if (!['system', 'chip'].includes(profile.component_type)) {
      fail('environment_subtype_required', 'HarmonyOS profiles require system or chip component_type');
    }
    if (profile.upload_backend !== 'gerrit') {
      fail('upload_backend_mismatch', 'HarmonyOS profiles must use the Gerrit backend');
    }
    if (profile.device_type == null || profile.device_type === '') {
      fail('device_type_required', 'HarmonyOS profiles require an explicit device_type');
    }
    requireText(profile.device_type, 'device_type');
  }

  if (installable) {
    requireText(profile.product, 'product');
    requireText(profile.device_type, 'device_type');
    requireRelativePath(profile.out_dir, 'out_dir');
    requireText(profile.build_entry, 'build_entry');
    if (profile.build_entry.includes('/') || profile.build_entry.includes('\\')) {
      fail('profile_entry_unsafe', 'build_entry must name a fixed entry at the workspace root');
    }
  } else if (profile.out_dir != null) {
    requireRelativePath(profile.out_dir, 'out_dir');
  }

  profile.root_markers = normalizeMarkers(profile.root_markers, 'root_markers', { installable });
  if (installable && (!Array.isArray(profile.build_argv_template)
    || profile.build_argv_template.length === 0)) {
    fail('build_template_required', 'build_argv_template must contain a fixed argv template');
  }
  if (Array.isArray(profile.build_argv_template)) {
    profile.build_argv_template = profile.build_argv_template.map((token, index) => {
      if (typeof token !== 'string' || !SAFE_TEMPLATE_TOKEN_RE.test(token)) {
        fail('build_template_unsafe', `build_argv_template[${index}] contains unsafe shell syntax`);
      }
      return token;
    });
  }

  if (profile.profile_digest !== undefined && !isSha256Digest(profile.profile_digest)) {
    fail('profile_digest_invalid', 'profile_digest must be a lowercase SHA-256 digest');
  }
  if (installable && profile.profile_digest !== undefined
    && profile.profile_digest !== computeProfileDigest(profile)) {
    fail('profile_digest_mismatch', 'profile_digest does not match the profile content');
  }
  return profile;
}

export function detectEnvironment({
  openharmony = false,
  harmonyos_system: harmonyosSystem = false,
  harmonyos_chip: harmonyosChip = false,
} = {}) {
  const candidates = [];
  if (openharmony) candidates.push('openharmony');
  if (harmonyosSystem) candidates.push('harmonyos/system');
  if (harmonyosChip) candidates.push('harmonyos/chip');
  if (candidates.length === 0) return { status: 'unknown', candidates: [] };
  if (candidates.length > 1) return { status: 'ambiguous', candidates };
  const [candidate] = candidates;
  if (candidate === 'openharmony') {
    return {
      status: 'detected', candidates, environment: 'openharmony', component_type: null,
    };
  }
  return {
    status: 'detected',
    candidates,
    environment: 'harmonyos',
    component_type: candidate.endsWith('/chip') ? 'chip' : 'system',
  };
}

export function assertEnvironmentBinding({
  project_id: projectId,
  workspace_id: workspaceId,
  environment_profile_digest: profileDigest,
  profile,
  confirmation,
}) {
  requireText(projectId, 'project_id');
  requireText(workspaceId, 'workspace_id');
  if (!isSha256Digest(profileDigest)) {
    fail('profile_digest_required', 'run must bind a valid environment profile digest');
  }
  const normalized = validateEnvironmentProfile(profile);
  if (computeProfileDigest(normalized) !== profileDigest) {
    fail('profile_digest_mismatch', 'run profile digest does not match the selected profile');
  }
  if (!confirmation || confirmation.confirmed !== true) {
    fail('environment_confirmation_required', 'a real user must explicitly confirm the environment');
  }
  if (confirmation.project_id !== projectId || confirmation.workspace_id !== workspaceId) {
    fail('environment_confirmation_scope', 'environment confirmation is bound to another project/workspace');
  }
  if (confirmation.profile_digest !== profileDigest
    || confirmation.environment !== normalized.environment
    || (confirmation.component_type ?? null) !== normalized.component_type) {
    fail('environment_confirmation_mismatch', 'environment confirmation does not match the profile');
  }
  requireText(confirmation.actor_id, 'confirmation.actor_id');
  return {
    project_id: projectId,
    workspace_id: workspaceId,
    environment: normalized.environment,
    component_type: normalized.component_type,
    profile_digest: profileDigest,
    actor_id: confirmation.actor_id,
  };
}
