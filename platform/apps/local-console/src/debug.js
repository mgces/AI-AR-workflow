import { createHash, randomUUID } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { posix, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { createAuthorityEnvelope } from '../../../../workspace-gateway/src/authority/envelope.js';
import { prepareCommandInvocation } from './command.js';

const execFile = promisify(execFileCallback);
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', '__pycache__']);
const ARTIFACT_ROLES = Object.freeze({
  '.hap': 'application_package',
  '.hsp': 'shared_package',
  '.so': 'shared_library',
  '.ko': 'kernel_module',
  '.elf': 'executable',
  '.img': 'system_image',
  '.bin': 'binary_image',
});
const MAX_FILES = 3000;
const MAX_BYTES = 128 * 1024 * 1024;

async function walk(root, current = root, result = []) {
  if (result.length >= MAX_FILES) return result;
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (result.length >= MAX_FILES) break;
    if (entry.isSymbolicLink()) continue;
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) await walk(root, path, result);
      continue;
    }
    const extension = entry.name.includes('.') ? `.${entry.name.split('.').pop().toLowerCase()}` : '';
    if (ARTIFACT_ROLES[extension]) result.push({ path, extension });
  }
  return result;
}

export async function scanArtifacts(root) {
  const sourceRoot = resolve(root);
  if (!existsSync(sourceRoot)) {
    return { status: 'unavailable', source_root: sourceRoot, artifacts: [], reason: 'source root not found' };
  }
  const candidates = await walk(sourceRoot);
  let bytes = 0;
  const artifacts = [];
  for (const candidate of candidates) {
    const metadata = await stat(candidate.path);
    if (metadata.size > MAX_BYTES || bytes + metadata.size > MAX_BYTES) continue;
    const content = await readFile(candidate.path);
    bytes += content.length;
    artifacts.push({
      relative_path: relative(sourceRoot, candidate.path).split('\\').join('/'),
      role: ARTIFACT_ROLES[candidate.extension],
      size_bytes: metadata.size,
      sha256: createHash('sha256').update(content).digest('hex'),
      source: 'workspace_scan',
      confidence: 'advisory_extension',
      compatibility: 'not_verified',
    });
  }
  return {
    status: 'ready',
    source_root: sourceRoot,
    artifacts,
    scanned_files: candidates.length,
    bytes_scanned: bytes,
    limits: { max_files: MAX_FILES, max_bytes: MAX_BYTES },
  };
}

async function probeHdc(command) {
  try {
    const invocation = prepareCommandInvocation(command, ['list', 'targets']);
    const result = await execFile(invocation.command, invocation.args, {
      env: invocation.env, shell: invocation.shell, timeout: 4000, maxBuffer: 32 * 1024,
    });
    const targets = `${result.stdout || ''}`.split(/\r?\n/).map((line) => line.trim())
      .filter((line) => line && !/^list of devices/i.test(line));
    return { status: 'available', command, targets };
  } catch (error) {
    return {
      status: error.code === 'ENOENT' ? 'missing' : 'probe_failed',
      command,
      targets: [],
      reason: error.code === 'ENOENT' ? 'hdc executable not found' : 'hdc probe failed',
    };
  }
}

export async function probeDebugSurface(root) {
  const artifacts = await scanArtifacts(root);
  const command = process.env.DSH_HDC_CLI || 'hdc';
  const device = await probeHdc(command);
  return {
    status: artifacts.status === 'ready' && (artifacts.artifacts.length > 0 || device.status === 'available')
      ? 'ready'
      : artifacts.status === 'ready' ? 'partial' : 'unavailable',
    artifacts,
    device_probe: device,
    deployment: 'disabled_until_profile_and_device_match',
  };
}

function remoteDebugError(code, message, details = {}) {
  throw Object.assign(new Error(message), { code, details });
}

function unwrapRemoteResult(result) {
  if (result?.status === 'completed' && result.result && typeof result.result === 'object') return result.result;
  if (result?.status === 'failed' && result.error) {
    remoteDebugError(result.error.code ?? 'gateway_request_failed', result.error.message ?? 'workspace gateway operation failed', result.error.details ?? {});
  }
  return result;
}

function remotePath(value) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\\') || value.includes('\0')) return null;
  const normalized = posix.normalize(value.trim());
  if (normalized === '.' || normalized.startsWith('/') || normalized === '..' || normalized.startsWith('../')) return null;
  return normalized;
}

function normalizeRemoteEntry(entry) {
  const path = remotePath(typeof entry === 'string' ? entry : entry?.relative_path);
  if (!path) return null;
  const size = Number.isSafeInteger(entry?.size_bytes) && entry.size_bytes >= 0 ? entry.size_bytes : null;
  const mtime = Number.isFinite(entry?.mtime_ms) && entry.mtime_ms >= 0 ? entry.mtime_ms : null;
  return { path, size, mtime_ms: mtime };
}

function remoteHash(content, supplied) {
  return typeof supplied === 'string' && /^[a-f0-9]{64}$/u.test(supplied)
    ? supplied : createHash('sha256').update(content).digest('hex');
}

function parseProfileOutput(result, profile) {
  if (!Number.isInteger(result?.exit_code)) {
    remoteDebugError('remote_debug_exit_unknown', `${profile} returned no exit code`, { exit_code: null });
  }
  if (result.exit_code !== 0) {
    return { status: 'probe_failed', targets: [], reason: `${profile} exited with ${result.exit_code}` };
  }
  const text = String(result.stdout ?? '').trim();
  if (!text) return { status: 'probe_failed', targets: [], reason: `${profile} returned no JSON output` };
  let value;
  try { value = JSON.parse(text); } catch {
    const line = text.split(/\r?\n/u).reverse().find((item) => {
      try { JSON.parse(item); return true; } catch { return false; }
    });
    try { value = line ? JSON.parse(line) : null; } catch { value = null; }
  }
  if (!value || typeof value !== 'object') return { status: 'probe_failed', targets: [], reason: `${profile} returned invalid JSON` };
  return {
    ...value,
    status: value.status ?? 'available',
    targets: Array.isArray(value.targets)
      ? value.targets.filter((item) => typeof item === 'string' || (item && typeof item === 'object'))
      : [],
    source: 'workspace_gateway_profile',
  };
}

/**
 * Read-only diagnostics for a remote SSH/WSL workspace. Artifact hashes are
 * obtained from the Gateway and device discovery is an optional fixed profile;
 * neither result is treated as an AR gate or deployment approval.
 */
export class RemoteDebugSurface {
  constructor({
    gateway,
    remoteRoot,
    authorityContext,
    signature = null,
    sign = null,
    deviceProfile = null,
  } = {}) {
    if (!gateway || typeof gateway.execute !== 'function') throw new TypeError('gateway.execute is required');
    if (typeof remoteRoot !== 'string' || !posix.isAbsolute(remoteRoot.trim())) {
      throw Object.assign(new Error('remoteRoot must be an absolute POSIX path'), { code: 'remote_workspace_invalid' });
    }
    if (!authorityContext || typeof authorityContext !== 'object' || Array.isArray(authorityContext)) {
      throw new TypeError('authorityContext is required');
    }
    if (signature !== null && (!signature || typeof signature !== 'object')) throw new TypeError('signature must be an object');
    if (sign !== null && typeof sign !== 'function') throw new TypeError('sign must be a function');
    this.gateway = gateway;
    this.remoteRoot = posix.normalize(remoteRoot.trim());
    this.authorityContext = { ...authorityContext };
    this.signature = signature;
    this.sign = sign;
    this.deviceProfile = deviceProfile;
  }

  async status() {
    return this.scan();
  }

  async scan() {
    const artifacts = await this.#scanArtifacts();
    const device = await this.#probeDevice();
    const status = artifacts.status === 'ready'
      && (artifacts.artifacts.length > 0 || device.status === 'available')
      ? 'ready' : artifacts.status === 'ready' ? 'partial' : 'unavailable';
    return {
      status,
      source_root: this.remoteRoot,
      artifacts,
      device_probe: device,
      deployment: 'disabled_until_profile_and_device_match',
    };
  }

  async #scanArtifacts() {
    let listed;
    try {
      const result = await this.#call('workspace.list', {
        path: '.', recursive: true, max_entries: MAX_FILES, with_metadata: true,
      });
      listed = Array.isArray(result?.entries) ? result.entries.map(normalizeRemoteEntry).filter(Boolean) : [];
    } catch (error) {
      return { status: 'unavailable', source_root: this.remoteRoot, artifacts: [], reason: error.message };
    }
    let bytes = 0;
    const artifacts = [];
    for (const entry of listed) {
      const { path } = entry;
      const extension = posix.extname(path).toLowerCase();
      const role = ARTIFACT_ROLES[extension];
      if (!role || path.split('/').some((part) => SKIP_DIRECTORIES.has(part))) continue;
      if (entry.size !== null && (entry.size > MAX_BYTES || bytes + entry.size > MAX_BYTES)) continue;
      let size = entry.size;
      let sha256 = null;
      try {
        // Hashes are computed on the remote host so binary HAP/HSP/SO/IMG
        // files never go through a UTF-8 conversion in the cloud process.
        const hashed = await this.#call('workspace.hash', { path });
        if (!/^[a-f0-9]{64}$/u.test(String(hashed?.sha256 ?? ''))
            || !Number.isSafeInteger(hashed?.bytes) || hashed.bytes < 0) {
          throw new Error('remote artifact hash response was invalid');
        }
        sha256 = hashed.sha256;
        size = hashed.bytes;
      } catch {
        // Older Gateways may not expose workspace.hash. Keep a bounded read
        // fallback so diagnostics remain useful during a rolling upgrade.
        try {
          const file = await this.#call('workspace.read', { path });
          const content = String(file?.content ?? '');
          size = Number.isSafeInteger(file?.bytes) ? file.bytes : Buffer.byteLength(content, 'utf8');
          sha256 = remoteHash(content, file?.sha256);
        } catch {
          // A single disappearing build product should not hide other artifacts.
          continue;
        }
      }
      if (!Number.isSafeInteger(size) || size < 0 || size > MAX_BYTES || bytes + size > MAX_BYTES) continue;
      bytes += size;
      const artifact = {
        relative_path: path,
        role,
        size_bytes: size,
        sha256,
        source: 'workspace_gateway',
        confidence: 'advisory_extension',
        compatibility: 'not_verified',
      };
      if (entry.mtime_ms !== null) artifact.mtime_ms = entry.mtime_ms;
      artifacts.push(artifact);
    }
    return {
      status: 'ready', source_root: this.remoteRoot, artifacts,
      scanned_files: listed.length, bytes_scanned: bytes,
      limits: { max_files: MAX_FILES, max_bytes: MAX_BYTES },
    };
  }

  async #probeDevice() {
    if (!this.deviceProfile) return { status: 'unconfigured', targets: [], source: 'workspace_gateway' };
    try {
      const result = await this.#call('workspace.exec_profile', { profile_id: this.deviceProfile, variables: {} });
      return parseProfileOutput(result, this.deviceProfile);
    } catch (error) {
      return { status: 'probe_failed', targets: [], source: 'workspace_gateway', reason: error.message };
    }
  }

  async #call(operationKind, payload) {
    const operationId = `remote-debug-${operationKind}-${randomUUID()}`;
    const runId = this.authorityContext.cloud_run_id ?? `debug-${this.authorityContext.workspace_id ?? 'workspace'}`;
    const fields = {
      ...this.authorityContext,
      cloud_run_id: runId,
      authority_run_id: this.authorityContext.authority_run_id ?? `authority-${runId}`,
      revision: Number.isInteger(this.authorityContext.revision) && this.authorityContext.revision > 0 ? this.authorityContext.revision : 1,
      phase_epoch: this.authorityContext.phase_epoch ?? 'phase-debug',
      connection_epoch: Number.isInteger(this.authorityContext.connection_epoch) && this.authorityContext.connection_epoch > 0 ? this.authorityContext.connection_epoch : 1,
      message_type: 'operation.start', operation_id: operationId, nonce: randomUUID(),
      sent_at: new Date().toISOString(), payload: { operation_kind: operationKind, ...payload },
    };
    const unsigned = createAuthorityEnvelope(fields);
    const signature = this.sign ? await this.sign(unsigned) : this.signature;
    if (!signature || typeof signature !== 'object') remoteDebugError('gateway_signature_unconfigured', 'remote gateway signature is not configured');
    return unwrapRemoteResult(await this.gateway.execute(createAuthorityEnvelope({ ...fields, signature })));
  }
}
