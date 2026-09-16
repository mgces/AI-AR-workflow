import { createHash, randomUUID } from 'node:crypto';
import { posix } from 'node:path';
import { createAuthorityEnvelope } from '../../../../workspace-gateway/src/authority/envelope.js';

const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_BINARY_BYTES = 4 * 1024 * 1024;
const DEFAULT_PROFILES = Object.freeze({
  init: 'ar.delivery.init',
  inspect: 'ar.delivery.inspect',
  validate: 'ar.delivery.validate',
  advance: 'ar.delivery.advance',
  consent: 'ar.delivery.consent',
  failureSnapshot: 'ar.delivery.failure_snapshot',
});
const DEFAULT_DELIVERY_SCRIPTS_RELATIVE_PATH = 'skills/ohos-ar-dev-phases/scripts';
const DEFAULT_DELIVERY_BRIDGE_RELATIVE_PATH = 'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py';
const TEXT_ARTIFACT_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.hxx', '.gn', '.gni',
  '.json', '.jsonl', '.md', '.txt', '.log', '.patch', '.diff', '.py', '.sh',
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.ets', '.idl', '.xml', '.yaml', '.yml',
  '.toml', '.ini',
]);

function artifactExtension(path) {
  const filename = posix.basename(path).toLowerCase();
  const index = filename.lastIndexOf('.');
  return index >= 0 ? filename.slice(index) : '';
}

function artifactIsText(path) {
  return TEXT_ARTIFACT_EXTENSIONS.has(artifactExtension(path));
}

function artifactContentType(path) {
  const extension = artifactExtension(path);
  if (extension === '.json' || extension === '.jsonl') return 'application/json';
  if (extension === '.md') return 'text/markdown; charset=utf-8';
  if (artifactIsText(path)) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function normalizeArtifactListingEntry(value) {
  const rawPath = typeof value === 'string' ? value : value?.relative_path ?? value?.path;
  if (typeof rawPath !== 'string' || rawPath.trim() === '' || rawPath.includes('\\') || rawPath.includes('\0')) return null;
  const normalized = posix.normalize(rawPath.trim());
  if (normalized === '.' || normalized.startsWith('/') || normalized === '..' || normalized.startsWith('../')
      || normalized.split('/').some((part) => part === '' || part === '.')) return null;
  const size = typeof value === 'string' ? null : value?.size_bytes;
  const mtime = typeof value === 'string' ? null : value?.mtime_ms;
  if ((size !== null && size !== undefined && (!Number.isSafeInteger(size) || size < 0))
      || (mtime !== null && mtime !== undefined && (!Number.isFinite(mtime) || mtime < 0))) return null;
  return {
    relative_path: normalized,
    size_bytes: size === null || size === undefined ? null : size,
    mtime_ms: mtime === null || mtime === undefined ? null : mtime,
  };
}

function hashUnsupported(error) {
  const code = String(error?.code ?? '');
  return ['operation_not_allowed', 'operation_unsupported', 'workspace_hash_unavailable'].includes(code)
    || /(?:unknown|unsupported).*workspace\.(?:hash|read_binary)/u.test(String(error?.message ?? ''));
}

function verifyBinaryResult(result) {
  const encoded = result?.content_base64;
  if (typeof encoded !== 'string' || encoded.length === 0 || encoded.length > 8 * 1024 * 1024
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)) {
    fail('remote_binary_invalid', 'remote binary response was not valid base64');
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length > MAX_BINARY_BYTES) fail('remote_binary_too_large', 'remote binary artifact exceeds the configured size limit');
  if (Number.isSafeInteger(result?.bytes) && result.bytes >= 0 && result.bytes !== bytes.length) {
    fail('artifact_integrity_mismatch', 'remote binary byte length does not match its metadata', {
      expected_bytes: result.bytes, actual_bytes: bytes.length,
    });
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (result?.sha256 !== undefined && result?.sha256 !== null
      && (typeof result.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(result.sha256)
        || result.sha256 !== digest)) {
    fail('artifact_integrity_mismatch', 'remote binary SHA-256 does not match its content', {
      expected_sha256: typeof result.sha256 === 'string' ? result.sha256 : null, actual_sha256: digest,
    });
  }
  return { encoded, bytes, sha256: digest };
}

function fail(code, message, details = {}) {
  throw Object.assign(new Error(message), { code, details });
}

function required(value, field) {
  if (typeof value !== 'string' || value.trim() === '') fail('remote_delivery_input_invalid', `${field} is required`, { field });
  return value.trim();
}

function safeId(value, field) {
  const result = required(value, field);
  if (!/^[A-Za-z0-9._-]{1,128}$/u.test(result)) fail('remote_delivery_input_invalid', `${field} must be a safe identifier`, { field });
  return result;
}

function boundedText(value, field, max = 4096) {
  if (typeof value !== 'string' || value.length > max || /[\0\r\n]/u.test(value)) {
    fail('remote_delivery_input_invalid', `${field} is invalid`, { field, max });
  }
  return value;
}

function parseOutput(value, operation) {
  const text = String(value ?? '').trim();
  if (Buffer.byteLength(text, 'utf8') > MAX_JSON_BYTES) {
    fail('remote_delivery_result_too_large', `${operation} returned too much JSON`, { max_bytes: MAX_JSON_BYTES });
  }
  if (!text) fail('remote_delivery_result_invalid', `${operation} returned no JSON output`);
  try { return JSON.parse(text); } catch { /* wrappers may log before their JSON result */ }
  const lines = text.split(/\r?\n/u).reverse();
  for (const line of lines) {
    try { return JSON.parse(line); } catch { /* keep looking for the result line */ }
  }
  const pdir = text.match(/^PDIR=(.+)$/mu)?.[1]?.trim();
  if (pdir) return { pipeline_dir: pdir };
  fail('remote_delivery_result_invalid', `${operation} did not return valid JSON`, { output_tail: text.slice(-4096) });
}

function normalizeProfileResult(result, operation) {
  const stdout = String(result?.stdout ?? '');
  const stderr = String(result?.stderr ?? '');
  if (Buffer.byteLength(stdout, 'utf8') > MAX_OUTPUT_BYTES || Buffer.byteLength(stderr, 'utf8') > MAX_OUTPUT_BYTES) {
    fail('remote_delivery_output_limit', `${operation} output exceeded the configured limit`);
  }
  if (!Number.isInteger(result?.exit_code)) {
    fail('remote_delivery_exit_unknown', `${operation} returned no exit code`, { exit_code: null });
  }
  if (result.exit_code !== 0) {
    fail(operation === 'validate' || operation === 'advance' || operation === 'consent'
      ? 'delivery_gate_rejected' : 'remote_delivery_command_failed',
    `${operation} exited with ${result.exit_code}`, {
      exit_code: result.exit_code, stderr: stderr.slice(-4096), stdout: stdout.slice(-4096),
    });
  }
  return { stdout, stderr, value: parseOutput(stdout, operation) };
}

function requireGatePass(value, operation) {
  if (!value || typeof value !== 'object' || value.ok !== true) {
    fail('delivery_gate_rejected', `${operation} did not return an authoritative PASS`, {
      operation,
      result: value && typeof value === 'object' ? value : { value },
    });
  }
  return value;
}

function unwrapGatewayResult(result) {
  if (result?.status === 'completed' && result.result && typeof result.result === 'object') {
    return result.result;
  }
  if (result?.status === 'failed' && result.error) {
    fail(result.error.code ?? 'gateway_request_failed', result.error.message ?? 'workspace gateway operation failed', result.error.details ?? {});
  }
  return result;
}

function authorityForRun(base, runId, variables = {}, payload = {}) {
  const fields = { ...base };
  const inferredRunId = variables.run_id ?? payload.run_id ?? runId ?? fields.cloud_run_id;
  if (!fields.cloud_run_id && inferredRunId) fields.cloud_run_id = String(inferredRunId);
  if (!fields.authority_run_id && inferredRunId) fields.authority_run_id = `authority-${inferredRunId}`;
  if (!Number.isInteger(fields.revision) || fields.revision < 1) fields.revision = 1;
  if (!fields.phase_epoch) {
    const phase = variables.phase ?? payload.phase ?? 'P0';
    fields.phase_epoch = `phase-${Number.isInteger(phase) ? `P${phase}` : String(phase)}`;
  }
  if (!Number.isInteger(fields.connection_epoch) || fields.connection_epoch < 1) fields.connection_epoch = 1;
  return fields;
}

function normalizeAbsolute(value, field) {
  const result = required(value, field);
  if (!posix.isAbsolute(result) || result.includes('\0') || result.includes('\\')) {
    fail('remote_workspace_invalid', `${field} must be an absolute POSIX path`, { field });
  }
  return posix.normalize(result);
}

function inside(root, candidate) {
  const normalizedRoot = posix.normalize(root);
  const normalizedCandidate = posix.normalize(candidate);
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}

function pathUnder(root, value, field) {
  const candidate = normalizeAbsolute(value, field);
  if (!inside(root, candidate)) fail('remote_workspace_outside_root', `${field} must stay inside the registered remote root`, { field, root, path: candidate });
  return candidate;
}

function relativePath(root, value, field) {
  const absolute = pathUnder(root, value, field);
  return absolute === root ? '.' : posix.relative(root, absolute);
}

function runIdFromPipeline(root, pipelineDir) {
  const relative = posix.relative(root, pipelineDir);
  const parts = relative.split('/');
  const marker = parts.findIndex((part, index) => part === 'specs' && parts[index + 1] === 'pipeline');
  if (marker < 0 || marker + 2 !== parts.length - 1) return null;
  const runId = parts[marker + 2];
  return /^[A-Za-z0-9._-]{1,128}$/u.test(runId) ? runId : null;
}

function repoRootFromPipeline(root, pipelineDir) {
  const relative = posix.relative(root, pipelineDir);
  const parts = relative.split('/');
  const marker = parts.findIndex((part, index) => part === 'specs' && parts[index + 1] === 'pipeline');
  return marker >= 0 ? posix.join(root, ...parts.slice(0, marker)) : root;
}

function optional(value) {
  return value === undefined || value === null ? '' : String(value);
}

/**
 * Remote implementation of the Python delivery adapter. The Python authority
 * remains on the code host: every operation is a signed fixed Gateway profile
 * and only its structured result is projected into the cloud runtime. The
 * adapter is deliberately stateless per run; one DSH instance may dispatch
 * multiple workspaces concurrently without a shared "active run" changing
 * another operation's authority envelope.
 */
export class RemotePythonDeliveryAdapter {
  constructor({ gateway, remoteRoot, authorityContext, signature = null, sign = null, profiles = {}, scriptsRoot = null, bridgePath = null } = {}) {
    if (!gateway || typeof gateway.execute !== 'function') throw new TypeError('gateway.execute is required');
    this.gateway = gateway;
    this.remoteRoot = normalizeAbsolute(remoteRoot, 'remoteRoot');
    if (!authorityContext || typeof authorityContext !== 'object' || Array.isArray(authorityContext)) {
      throw new TypeError('authorityContext is required');
    }
    if (signature !== null && (!signature || typeof signature !== 'object')) throw new TypeError('signature must be an object');
    if (sign !== null && typeof sign !== 'function') throw new TypeError('sign must be a function');
    this.authorityContext = { ...authorityContext };
    this.signature = signature;
    this.sign = sign;
    this.profiles = { ...DEFAULT_PROFILES, ...(profiles ?? {}) };
    // Gate helpers are deployment-owned inputs, never per-run/model inputs.
    // Keep them inside the registered remote root so a profile cannot make a
    // user supplied run execute an arbitrary script outside the workspace.
    this.scriptsRoot = scriptsRoot === null || scriptsRoot === undefined
      ? null : pathUnder(this.remoteRoot, normalizeAbsolute(scriptsRoot, 'scriptsRoot'), 'scriptsRoot');
    this.bridgePath = bridgePath === null || bridgePath === undefined
      ? null : pathUnder(this.remoteRoot, normalizeAbsolute(bridgePath, 'bridgePath'), 'bridgePath');
  }

  async initialize(raw = {}) {
    const runId = safeId(raw.run_id, 'run_id');
    const repoRoot = pathUnder(this.remoteRoot, raw.repo_root ?? this.remoteRoot, 'repo_root');
    const pipelineDir = pathUnder(repoRoot, raw.pipeline_dir
      ?? posix.join(repoRoot, 'specs', 'pipeline', runId), 'pipeline_dir');
    // Resolve user-supplied AR content before invoking the remote initializer.
    // A missing source must not leave a newly-created pipeline that a retry
    // could mistake for a valid run.
    const content = await this.#resolveArContent(raw, repoRoot, runId, {
      allowExisting: raw.pipeline_dir !== undefined && raw.pipeline_dir !== null,
    });
    const result = await this.#profile('init', {
      run_id: runId,
      repo_root: repoRoot,
      pipeline_dir: pipelineDir,
      git_dir: optional(raw.git_dir),
      environment: optional(raw.environment),
      component_type: optional(raw.component_type),
      device_type: optional(raw.device_type),
      device_serial: optional(raw.device_serial),
      build_target: optional(raw.build_target),
      part: optional(raw.part),
      base_commit: optional(raw.base_commit),
      agent: optional(raw.agent),
      model: optional(raw.model),
      confirm_defaults: raw.confirm_defaults === true ? 'true' : 'false',
      scripts_root: optional(raw.scripts_root),
      bridge_path: optional(raw.bridge_path),
    }, runId);
    const state = result.value && typeof result.value === 'object' ? result.value : {};
    const initializedRepoRoot = pathUnder(this.remoteRoot, state.repo_root ?? repoRoot, 'repo_root');
    const initializedPipeline = pathUnder(repoRoot, state.pipeline_dir ?? pipelineDir, 'pipeline_dir');
    if (content !== null) {
      await this.#workspaceWrite(posix.join(initializedPipeline, 'ar.md'), content, runId);
    }
    return {
      ...state,
      pipeline_run_id: state.pipeline_run_id ?? runId,
      pipeline_dir: initializedPipeline,
      repo_root: initializedRepoRoot,
      environment: state.environment ?? raw.environment ?? null,
      component_type: state.component_type ?? raw.component_type ?? null,
      device_type: state.device_type ?? raw.device_type ?? null,
      device_serial: state.device_serial ?? raw.device_serial ?? null,
    };
  }

  async inspect(pipelineDir) {
    const path = pathUnder(this.remoteRoot, pipelineDir, 'pipeline_dir');
    const runId = runIdFromPipeline(this.remoteRoot, path);
    const result = await this.#profile('inspect', {
      pipeline_dir: path, pipeline_path: relativePath(this.remoteRoot, path, 'pipeline_dir'),
      repo_root: this.#repoRootFor(path),
    }, runId);
    return result.value;
  }

  async validateGate(pipelineDir, phase, { uploadPrecheck = false } = {}) {
    if (!Number.isInteger(phase) || phase < 0 || phase > 8) fail('remote_delivery_input_invalid', 'phase must be between 0 and 8', { phase });
    const path = pathUnder(this.remoteRoot, pipelineDir, 'pipeline_dir');
    const runId = runIdFromPipeline(this.remoteRoot, path);
    const result = (await this.#profile('validate', {
      pipeline_dir: path, pipeline_path: relativePath(this.remoteRoot, path, 'pipeline_dir'),
      repo_root: this.#repoRootFor(path), phase: String(phase), upload_precheck: uploadPrecheck ? 'true' : 'false',
    }, runId)).value;
    return requireGatePass(result, 'validate');
  }

  async failureSnapshot(pipelineDir) {
    const path = pathUnder(this.remoteRoot, pipelineDir, 'pipeline_dir');
    const runId = runIdFromPipeline(this.remoteRoot, path);
    return (await this.#profile('failureSnapshot', {
      pipeline_dir: path, pipeline_path: relativePath(this.remoteRoot, path, 'pipeline_dir'),
      repo_root: this.#repoRootFor(path),
    }, runId)).value;
  }

  async advance(pipelineDir, phase) {
    if (!Number.isInteger(phase) || phase < 0 || phase > 8) fail('remote_delivery_input_invalid', 'phase must be between 0 and 8', { phase });
    const path = pathUnder(this.remoteRoot, pipelineDir, 'pipeline_dir');
    const runId = runIdFromPipeline(this.remoteRoot, path);
    await this.#profile('advance', {
      pipeline_dir: path, pipeline_path: relativePath(this.remoteRoot, path, 'pipeline_dir'),
      repo_root: this.#repoRootFor(path), phase: String(phase),
    }, runId);
    return this.inspect(path);
  }

  async consent(pipelineDir, phase, token) {
    if (!Number.isInteger(phase) || phase < 0 || phase > 8) fail('remote_delivery_input_invalid', 'phase must be between 0 and 8', { phase });
    const path = pathUnder(this.remoteRoot, pipelineDir, 'pipeline_dir');
    const runId = runIdFromPipeline(this.remoteRoot, path);
    await this.#profile('consent', {
      pipeline_dir: path, pipeline_path: relativePath(this.remoteRoot, path, 'pipeline_dir'),
      repo_root: this.#repoRootFor(path), phase: String(phase), token: boundedText(required(token, 'token'), 'token', 1024),
    }, runId);
    return this.inspect(path);
  }

  async #resolveArContent(raw, repoRoot = this.remoteRoot, runId = null, { allowExisting = false } = {}) {
    if (typeof raw.ar_text === 'string') {
      if (raw.ar_text.trim() === '') fail('ar_input_empty', 'AR input text must contain non-whitespace content');
      return raw.ar_text;
    }
    const source = raw.ar_path ?? raw.input_ref;
    if (typeof source !== 'string' || source.trim() === '') {
      if (allowExisting) return null;
      fail('ar_input_required', 'New remote delivery runs require ar_path or non-empty ar_text');
    }
    if (source.includes('://')) {
      if (allowExisting) return null;
      fail('ar_input_required', 'Remote input_ref URLs cannot be read by the Workspace Gateway; provide a remote ar_path or ar_text');
    }
    const path = pathUnder(repoRoot, posix.isAbsolute(source)
      ? source : posix.join(repoRoot, source), 'ar_path');
    const result = await this.#call('workspace.read', { path: posix.relative(this.remoteRoot, path) }, runId);
    const content = String(result?.content ?? '');
    if (content.trim() === '') fail('ar_input_empty', `AR input file is empty: ${path}`);
    return content;
  }

  #repoRootFor(pipelineDir) {
    return repoRootFromPipeline(this.remoteRoot, pipelineDir);
  }

  async #workspaceWrite(absolutePath, content, runId = null) {
    const path = pathUnder(this.remoteRoot, absolutePath, 'artifact_path');
    await this.#call('workspace.write', { path: posix.relative(this.remoteRoot, path), content }, runId);
  }

  /**
   * List the same bounded artifact roots as the local runtime. The remote
   * connector returns relative names only, so the adapter can calculate
   * stable artifact ids without trusting a remote absolute path.
   */
  async artifacts(pipelineDir, status = null) {
    const root = pathUnder(this.remoteRoot, pipelineDir, 'pipeline_dir');
    const runId = status?.run_id ?? runIdFromPipeline(this.remoteRoot, root);
    const artifacts = [];
    for (const artifactRoot of ['evidence', 'reports', 'controls']) {
      const result = await this.#call('workspace.list', {
        path: posix.relative(this.remoteRoot, posix.join(root, artifactRoot)),
        recursive: true,
        max_entries: 500,
        with_metadata: true,
      }, runId);
      for (const rawEntry of Array.isArray(result?.entries) ? result.entries : []) {
        const entry = normalizeArtifactListingEntry(rawEntry);
        if (!entry) continue;
        const relative = posix.join(artifactRoot, entry.relative_path);
        if (!inside(posix.join(root), posix.join(root, relative))
            || relative.split('/').some((part) => part === '..' || part === '.')) continue;
        const remotePath = posix.relative(this.remoteRoot, posix.join(root, relative));
        const binary = !artifactIsText(relative);
        let file = null;
        let hash = null;
        if (binary) {
          try {
            hash = await this.#call('workspace.hash', { path: remotePath }, runId);
          } catch (error) {
            // Older gateways predate workspace.hash. Keep a metadata-only
            // artifact in that case, but never turn an integrity or transport
            // failure into a false successful listing.
            if (!hashUnsupported(error)) throw error;
          }
        } else {
          file = await this.#call('workspace.read', { path: remotePath }, runId);
        }
        const content = file ? String(file?.content ?? '') : null;
        const size = Number.isSafeInteger(hash?.bytes) ? hash.bytes
          : Number.isSafeInteger(file?.bytes) ? file.bytes
            : Number.isSafeInteger(entry.size_bytes) ? entry.size_bytes
              : (content === null ? null : Buffer.byteLength(content, 'utf8'));
        const digest = typeof hash?.sha256 === 'string' ? hash.sha256
          : typeof file?.sha256 === 'string' ? file.sha256 : null;
        const inlineBytes = content === null ? 0 : Buffer.byteLength(content, 'utf8');
        artifacts.push({
          artifact_id: `${status?.run_id ?? 'remote'}:${relative}`,
          relative_path: relative,
          filename: posix.basename(relative),
          role: artifactRoot === 'reports' ? 'report' : artifactRoot === 'controls' ? 'control' : 'evidence',
          size_bytes: size,
          sha256: digest,
          content_type: artifactContentType(relative),
          content: binary || inlineBytes > 512 * 1024 ? null : content,
          truncated: !binary && inlineBytes > 512 * 1024,
          binary,
          content_available: !binary,
        });
      }
    }
    return {
      pipeline_dir: root,
      artifacts: artifacts.slice(0, 500),
      complete: status?.status === 'completed' || status?.complete === true,
      source: 'workspace-gateway',
    };
  }

  async artifactContent(pipelineDir, requestedPath, runId = 'remote') {
    const root = pathUnder(this.remoteRoot, pipelineDir, 'pipeline_dir');
    const authorityRunId = runId === 'remote' ? runIdFromPipeline(this.remoteRoot, root) : runId;
    if (typeof requestedPath !== 'string' || requestedPath.trim() === ''
        || requestedPath.includes('\\') || requestedPath.includes('\0')) {
      fail('artifact_not_found', 'artifact path is invalid');
    }
    const relative = requestedPath.trim();
    const parts = relative.split('/');
    if (!['evidence', 'reports', 'controls'].includes(parts[0])
        || parts.some((part) => part === '' || part === '.' || part === '..')) {
      fail('artifact_not_found', 'artifact path is outside the permitted artifact roots');
    }
    const absolute = pathUnder(root, posix.join(root, relative), 'artifact_path');
    const remotePath = posix.relative(this.remoteRoot, absolute);
    const binary = !artifactIsText(relative);
    let result;
    if (binary) {
      try {
        result = await this.#call('workspace.read_binary', { path: remotePath }, authorityRunId);
        const verified = verifyBinaryResult(result);
        return {
          run_id: runId,
          pipeline_dir: root,
          artifact_id: `${runId}:${relative}`,
          relative_path: relative,
          filename: posix.basename(relative),
          role: parts[0] === 'reports' ? 'report' : parts[0] === 'controls' ? 'control' : 'evidence',
          size_bytes: verified.bytes.length,
          sha256: verified.sha256,
          content_type: artifactContentType(relative),
          content: null,
          content_base64: verified.encoded,
          truncated: false,
          binary: true,
          content_available: true,
          source: 'workspace-gateway',
        };
      } catch (error) {
        if (!hashUnsupported(error)) throw error;
        // Gateways predating binary reads can still provide an auditable hash,
        // but must keep the download disabled instead of decoding bytes as UTF-8.
        result = await this.#call('workspace.hash', { path: remotePath }, authorityRunId);
      }
    } else {
      result = await this.#call('workspace.read', { path: remotePath }, authorityRunId);
    }
    const content = binary ? null : String(result?.content ?? '');
    const size = Number.isSafeInteger(result?.bytes) ? result.bytes : Buffer.byteLength(content ?? '', 'utf8');
    if (size > 4 * 1024 * 1024) fail('artifact_not_found', 'artifact exceeds the configured size limit');
    return {
      run_id: runId,
      pipeline_dir: root,
      artifact_id: `${runId}:${relative}`,
      relative_path: relative,
      filename: posix.basename(relative),
      role: parts[0] === 'reports' ? 'report' : parts[0] === 'controls' ? 'control' : 'evidence',
      size_bytes: size,
      sha256: result?.sha256 ?? null,
      content_type: artifactContentType(relative),
      content,
      truncated: false,
      binary,
      content_available: !binary,
      source: 'workspace-gateway',
    };
  }

  async #profile(name, variables, runId = null) {
    const profileId = required(this.profiles[name], `profiles.${name}`);
    const authorityRunId = runId ?? runIdFromPipeline(this.remoteRoot, variables?.pipeline_dir);
    // Only deployment-time paths are passed to the fixed helper. Ignore any
    // similarly named value that could arrive from a run/tool payload.
    const profileVariables = { ...(variables ?? {}) };
    delete profileVariables.scripts_root;
    delete profileVariables.bridge_path;
    // When no explicit bundle path is configured, resolve the standard bundle
    // beside the selected repository root for this run. This matters for a
    // code host that keeps only the project checkout plus the DSH gate bundle:
    // the preflight probes that exact location, and the execution profile must
    // receive the same path instead of silently falling back to the cloud
    // checkout or an empty placeholder.
    const selectedRepoRoot = profileVariables.repo_root
      ? pathUnder(this.remoteRoot, normalizeAbsolute(profileVariables.repo_root, 'repo_root'), 'repo_root')
      : this.remoteRoot;
    profileVariables.scripts_root = this.scriptsRoot
      ?? posix.join(selectedRepoRoot, DEFAULT_DELIVERY_SCRIPTS_RELATIVE_PATH);
    profileVariables.bridge_path = this.bridgePath
      ?? posix.join(selectedRepoRoot, DEFAULT_DELIVERY_BRIDGE_RELATIVE_PATH);
    const result = await this.#call('workspace.exec_profile', {
      profile_id: profileId,
      variables: Object.fromEntries(Object.entries({
        ...(authorityRunId ? { run_id: authorityRunId } : {}),
        ...profileVariables,
      }).map(([key, value]) => [key, optional(value)])),
    }, authorityRunId);
    return normalizeProfileResult(result, name);
  }

  async #call(operationKind, payload, runId = null) {
    const operationId = `remote-delivery-${operationKind}-${randomUUID()}`;
    const variables = payload?.variables && typeof payload.variables === 'object' ? payload.variables : {};
    const fields = {
      ...authorityForRun(this.authorityContext, runId, variables, payload),
      message_type: operationKind === 'operation.cancel' ? 'operation.cancel' : 'operation.start',
      operation_id: operationId,
      nonce: randomUUID(),
      sent_at: new Date().toISOString(),
      payload: operationKind === 'operation.cancel' ? payload : { operation_kind: operationKind, ...payload },
    };
    const unsigned = createAuthorityEnvelope(fields);
    const signature = this.sign ? await this.sign(unsigned) : this.signature;
    if (!signature || typeof signature !== 'object') fail('gateway_signature_unconfigured', 'remote gateway signature is not configured');
    return unwrapGatewayResult(await this.gateway.execute(createAuthorityEnvelope({ ...fields, signature })));
  }
}

export { DEFAULT_PROFILES as REMOTE_DELIVERY_PROFILES };
