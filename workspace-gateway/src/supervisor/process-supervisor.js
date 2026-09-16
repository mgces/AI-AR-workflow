import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

const DEFAULT_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_OPERATION_ID = 256;
const MAX_COMMAND_LENGTH = 4096;
const MAX_ARGS = 256;
const MAX_ARG_LENGTH = 4096;
const MAX_CWD_LENGTH = 4096;
const TERMINAL_STATES = new Set(['completed', 'failed', 'cancelled']);
const TRACKED_STATES = new Set(['starting', 'running', 'unknown']);
const DEFAULT_RECONCILE_GRACE_MS = 2_000;
const DEFAULT_CANCEL_GRACE_MS = 2_000;
const CGROUP_MODES = new Set(['disabled', 'best_effort', 'required']);
const CGROUP_LIMIT_FILES = Object.freeze({
  memoryMax: 'memory.max',
  pidsMax: 'pids.max',
  cpuMax: 'cpu.max',
});

function supervisorError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function text(value, field, max) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max || /[\0\r\n]/u.test(value)) {
    throw supervisorError('supervisor_input_invalid', `${field} must be a bounded non-empty string`, { field, max });
  }
  return value;
}

function nowIso(clock) {
  const value = clock();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError('clock must return a valid Date');
  }
  return value.toISOString();
}

function json(value, fallback = {}) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function jsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function argsDigest(args) {
  return createHash('sha256').update(JSON.stringify(args)).digest('hex');
}

function safeJson(value, field, maxBytes = 64 * 1024) {
  let serialized;
  try { serialized = JSON.stringify(value ?? {}); } catch {
    throw supervisorError('supervisor_input_invalid', `${field} must be JSON serializable`);
  }
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
    throw supervisorError('supervisor_input_invalid', `${field} exceeds the configured size limit`, { field, maxBytes });
  }
  return serialized;
}

function normalizeCgroupLimits(value) {
  if (value === undefined || value === null) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw supervisorError('supervisor_input_invalid', 'cgroupLimits must be an object');
  }
  const limits = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!Object.hasOwn(CGROUP_LIMIT_FILES, key)) {
      throw supervisorError('supervisor_input_invalid', `unsupported cgroup limit: ${key}`);
    }
    if (typeof raw !== 'string' || raw.trim() === '' || raw.length > 128 || /[\0\r\n]/u.test(raw)) {
      throw supervisorError('supervisor_input_invalid', `${key} must be a bounded cgroup value`);
    }
    const candidate = raw.trim();
    const valid = key === 'cpuMax'
      ? candidate === 'max' || /^\d+\s+\d+$/u.test(candidate)
      : candidate === 'max' || /^\d+$/u.test(candidate);
    if (!valid) throw supervisorError('supervisor_input_invalid', `${key} has an invalid cgroup value`);
    limits[key] = candidate;
  }
  return limits;
}

function cgroupAvailability(root) {
  if (process.platform !== 'linux') return { available: false, reason: 'cgroup_platform_unsupported' };
  try {
    if (!statSync(root).isDirectory()) return { available: false, reason: 'cgroup_root_not_directory' };
    for (const file of ['cgroup.controllers', 'cgroup.procs']) {
      if (!statSync(join(root, file)).isFile()) return { available: false, reason: 'cgroup_v2_unavailable' };
    }
    accessSync(root, fsConstants.R_OK | fsConstants.W_OK | fsConstants.X_OK);
    accessSync(join(root, 'cgroup.procs'), fsConstants.R_OK | fsConstants.W_OK);
    return { available: true, reason: null };
  } catch (error) {
    return { available: false, reason: error?.code === 'EACCES' ? 'cgroup_root_not_writable' : 'cgroup_v2_unavailable' };
  }
}

function resolveCgroupRoot(root) {
  if (root !== 'self' && root !== 'auto') return resolve(root);
  if (process.platform === 'linux') {
    try {
      const line = readFileSync('/proc/self/cgroup', 'utf8').split(/\r?\n/u).find((item) => item.startsWith('0::'));
      const relativePath = line?.slice(3).trim() ?? '';
      if (relativePath.startsWith('/')) return resolve('/sys/fs/cgroup', `.${relativePath}`);
    } catch { /* fall back to the host root and report its permission state */ }
  }
  return resolve('/sys/fs/cgroup');
}

function processIsolationMetadata(metadata, isolation) {
  if (isolation?.mode === 'disabled') return metadata;
  const value = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...metadata }
    : { value: metadata };
  value.process_isolation = {
    mode: isolation.mode,
    active: isolation.active === true,
    ...(isolation.path ? { path: isolation.path } : {}),
    ...(isolation.reason ? { reason: isolation.reason } : {}),
    ...(isolation.cleaned === true ? { cleaned: true } : {}),
    ...(isolation.cleanup_error ? { cleanup_error: isolation.cleanup_error } : {}),
  };
  return value;
}

function childEnvironment(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw supervisorError('supervisor_input_invalid', 'env must be an object');
  }
  // Environment variables are intentionally kept out of the durable record:
  // CodeAgent adapters commonly inject credentials and per-attempt paths. A
  // shallow, string-valued copy is enough for spawn() and avoids retaining a
  // caller-owned mutable object while the child is running.
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (key.includes('\0') || key.includes('=') || key.length > 4096) {
      throw supervisorError('supervisor_input_invalid', 'env contains an invalid variable name');
    }
    if (raw !== undefined) result[key] = String(raw);
  }
  return result;
}

function readBootId() {
  if (process.platform !== 'linux') return null;
  try { return readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() || null; } catch { return null; }
}

function processIdentity(pid) {
  if (!Number.isInteger(pid) || pid < 1) return { alive: false, bootId: null, startTimeTicks: null };
  try { process.kill(pid, 0); } catch { return { alive: false, bootId: null, startTimeTicks: null }; }
  if (process.platform !== 'linux') return { alive: true, bootId: null, startTimeTicks: null };
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const close = stat.lastIndexOf(')');
    const fields = close >= 0 ? stat.slice(close + 1).trim().split(/\s+/u) : [];
    // /proc/<pid>/stat field 22 (starttime), with field 3 at index 0 here.
    const startTimeTicks = fields[19] ?? null;
    return { alive: true, bootId: readBootId(), startTimeTicks };
  } catch {
    return { alive: true, bootId: readBootId(), startTimeTicks: null };
  }
}

function sameProcess(record, identity) {
  if (!identity.alive) return false;
  if (record.boot_id && identity.bootId && record.boot_id !== identity.bootId) return false;
  if (record.start_time_ticks && identity.startTimeTicks && record.start_time_ticks !== identity.startTimeTicks) return false;
  // On non-Linux hosts there is no /proc start-time identity. kill(pid, 0) is
  // the strongest portable check available, so callers should treat it as a
  // best-effort identity and retain the unknown state after a restart.
  return true;
}

function processGroupAlive(record) {
  if (!record?.pid) return false;
  if (processIdentity(record.pid).alive) return true;
  if (process.platform === 'win32' || !record.pgid) return false;
  try {
    process.kill(-Number(record.pgid), 0);
    return true;
  } catch (error) {
    // EPERM still proves that a process in the group exists; the supervisor
    // must not turn an authorization error into a false termination proof.
    return error?.code === 'EPERM';
  }
}

async function waitForProcessGroupExit(record, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (processGroupAlive(record)) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return false;
    await new Promise((resolve) => setTimeout(resolve, Math.min(50, remaining)));
  }
  return true;
}

function readRecord(row) {
  if (!row) return null;
  return {
    operation_id: row.operation_id,
    parent_operation_id: row.parent_operation_id ?? row.operation_id,
    state: row.state,
    command: row.command,
    args: jsonArray(row.args_json),
    args_digest: row.args_digest ?? null,
    args_persisted: Number(row.args_persisted ?? 1) === 1,
    cwd: row.cwd,
    pid: row.pid === null || row.pid === undefined ? null : Number(row.pid),
    pgid: row.pgid === null || row.pgid === undefined ? null : Number(row.pgid),
    boot_id: row.boot_id ?? null,
    start_time_ticks: row.start_time_ticks ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    exit_code: row.exit_code === null || row.exit_code === undefined ? null : Number(row.exit_code),
    signal: row.signal ?? null,
    stdout: row.stdout ?? '',
    stderr: row.stderr ?? '',
    error: json(row.error_json, null),
    metadata: json(row.metadata_json, {}),
    timed_out: Number(row.timed_out ?? 0) === 1,
    aborted: Number(row.aborted ?? 0) === 1,
    output_limit_exceeded: Number(row.output_limit_exceeded ?? 0) === 1,
    duration_ms: row.duration_ms === null || row.duration_ms === undefined ? null : Number(row.duration_ms),
  };
}

function resultFromRecord(record) {
  return {
    operationId: record.operation_id,
    command: record.command,
    args: [...record.args],
    cwd: record.cwd,
    exitCode: record.exit_code,
    signal: record.signal,
    stdout: record.stdout,
    stderr: record.stderr,
    timedOut: record.timed_out,
    aborted: record.aborted,
    outputLimitExceeded: record.output_limit_exceeded,
    durationMs: record.duration_ms,
    state: record.state,
  };
}

function redactedRecord(record) {
  if (!record) return null;
  const identityVerified = TRACKED_STATES.has(record.state) && record.pid
    ? sameProcess(record, processIdentity(record.pid))
    : null;
  return {
    operation_id: record.operation_id,
    parent_operation_id: record.parent_operation_id,
    state: record.state,
    pid: record.pid,
    pgid: record.pgid,
    identity_verified: identityVerified,
    boot_id: record.boot_id,
    start_time_ticks: record.start_time_ticks,
    created_at: record.created_at,
    updated_at: record.updated_at,
    exit_code: record.exit_code,
    signal: record.signal,
    timed_out: record.timed_out,
    aborted: record.aborted,
    output_limit_exceeded: record.output_limit_exceeded,
    duration_ms: record.duration_ms,
    error: record.error,
    metadata: record.metadata,
    process_isolation: record.metadata?.process_isolation ?? null,
  };
}

/**
 * A small durable OS-process supervisor for workspace commands.
 *
 * The supervisor writes the command intent before spawning it and records the
 * process id, process group, output and exit result in SQLite. On restart,
 * `reconcile()` marks an in-flight command `unknown` and, by default, requests
 * termination of the surviving process group before a higher-level scheduler
 * decides whether it is safe to resume. The memory backend is intended only
 * for injected tests and single-process development.
 */
export class ProcessSupervisor {
  constructor({
    db = null,
    clock = () => new Date(),
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
    cgroupMode = 'disabled',
    cgroupRoot = '/sys/fs/cgroup',
    cgroupPrefix = 'dsh',
    cgroupLimits = {},
  } = {}) {
    if (db !== null && (!db || typeof db.prepare !== 'function' || typeof db.exec !== 'function')) {
      throw new TypeError('db must expose prepare and exec');
    }
    if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1024) throw new TypeError('maxOutputBytes must be at least 1024');
    if (!Number.isSafeInteger(defaultTimeoutMs) || defaultTimeoutMs < 1) throw new TypeError('defaultTimeoutMs must be positive');
    if (!CGROUP_MODES.has(cgroupMode)) throw supervisorError('supervisor_input_invalid', 'cgroupMode must be disabled, best_effort, or required');
    if (typeof cgroupRoot !== 'string' || ((!isAbsolute(cgroupRoot) && !['self', 'auto'].includes(cgroupRoot)) || /[\0\r\n]/u.test(cgroupRoot))) {
      throw supervisorError('supervisor_input_invalid', 'cgroupRoot must be an absolute path or self');
    }
    if (typeof cgroupPrefix !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/u.test(cgroupPrefix)) {
      throw supervisorError('supervisor_input_invalid', 'cgroupPrefix must be a safe path segment');
    }
    this.db = db;
    this.clock = clock;
    this.maxOutputBytes = maxOutputBytes;
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.cgroupMode = cgroupMode;
    this.cgroupRoot = resolveCgroupRoot(cgroupRoot);
    this.cgroupPrefix = cgroupPrefix;
    this.cgroupLimits = normalizeCgroupLimits(cgroupLimits);
    this.memory = new Map();
    this.active = new Map();
    if (this.db) this.#ensureSchema();
  }

  get durable() { return this.db !== null; }

  /** Alias used by command runners, keeping the public API explicit. */
  run(options = {}) { return this.start(options); }

  start({ operationId, parentOperationId = operationId, command, args = [], cwd = process.cwd(), input = '', env = undefined, signal = null, timeoutMs = this.defaultTimeoutMs, maxOutputBytes = this.maxOutputBytes, metadata = {}, persistArgs = true, persistOutput = persistArgs } = {}) {
    const id = text(operationId, 'operationId', MAX_OPERATION_ID);
    const parent = text(parentOperationId ?? id, 'parentOperationId', MAX_OPERATION_ID);
    const executable = text(command, 'command', MAX_COMMAND_LENGTH);
    // Arguments are normally passed with shell:false. The only supported
    // exception is a platform adapter that has already converted a native
    // Windows .cmd/.bat wrapper into a fixed, argv-safe launcher; callers
    // cannot provide shell text through this API.
    if (!Array.isArray(args) || args.length > MAX_ARGS || args.some((value) => typeof value !== 'string' || value.length > MAX_ARG_LENGTH || /[\0]/u.test(value))) {
      throw supervisorError('supervisor_input_invalid', 'args must be a bounded string array');
    }
    const workingDirectory = text(cwd, 'cwd', MAX_CWD_LENGTH);
    if (typeof input !== 'string' && !Buffer.isBuffer(input)) throw supervisorError('supervisor_input_invalid', 'input must be a string or Buffer');
    const environment = childEnvironment(env);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw supervisorError('supervisor_input_invalid', 'timeoutMs must be a positive integer');
    if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1024) throw supervisorError('supervisor_input_invalid', 'maxOutputBytes must be at least 1024');
    if (signal !== null && (typeof signal !== 'object' || typeof signal.addEventListener !== 'function')) throw new TypeError('signal must be an AbortSignal');
    const metadataJson = safeJson(metadata, 'metadata');
    if (typeof persistArgs !== 'boolean') throw supervisorError('supervisor_input_invalid', 'persistArgs must be a boolean');
    if (typeof persistOutput !== 'boolean') throw supervisorError('supervisor_input_invalid', 'persistOutput must be a boolean');
    const existing = this.#findExact(id);
    if (existing) throw supervisorError('supervisor_operation_conflict', `operation ${id} already exists`, { operation_id: id, state: existing.state });
    const timestamp = nowIso(this.clock);
    const record = {
      operation_id: id,
      parent_operation_id: parent,
      state: 'starting',
      command: executable,
      // Prompts and source snippets are commonly passed as argv. Persist only
      // a digest/count when the caller marks an invocation private; the live
      // child still receives the original argv, while restart inspection has
      // no secret-bearing command line to recover.
      args_json: persistArgs ? JSON.stringify(args) : '[]',
      args_digest: argsDigest(args),
      args_persisted: persistArgs ? 1 : 0,
      cwd: workingDirectory,
      pid: null,
      pgid: null,
      boot_id: null,
      start_time_ticks: null,
      created_at: timestamp,
      updated_at: timestamp,
      exit_code: null,
      signal: null,
      stdout: '',
      stderr: '',
      error_json: null,
      metadata_json: metadataJson,
      timed_out: 0,
      aborted: 0,
      output_limit_exceeded: 0,
      duration_ms: null,
    };
    this.#insert(record);
    if (signal?.aborted) {
      const cancelled = this.#update(id, { state: 'cancelled', aborted: 1, duration_ms: 0 });
      return Promise.resolve(resultFromRecord(readRecord(cancelled)));
    }

    const isolation = this.#prepareIsolation(id);
    this.#update(id, {
      metadata_json: safeJson(processIsolationMetadata(metadata, isolation), 'metadata'),
    });
    if (isolation.fatal) {
      const failed = this.#update(id, {
        state: 'failed',
        error_json: JSON.stringify({
          code: isolation.error.code,
          message: isolation.error.message,
          details: isolation.error.details,
        }),
      });
      return Promise.reject(Object.assign(isolation.error, { result: resultFromRecord(readRecord(failed)) }));
    }

    return new Promise((resolve, reject) => {
      let child;
      try {
        child = spawn(executable, args, {
          cwd: workingDirectory,
          ...(environment === undefined ? {} : { env: environment }),
          shell: false,
          detached: process.platform !== 'win32',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (error) {
        const cleanup = this.#cleanupIsolation(isolation);
        this.#update(id, {
          state: 'failed',
          error_json: JSON.stringify({ code: 'supervisor_spawn_failed', message: error.message }),
          metadata_json: safeJson(processIsolationMetadata(readRecord(this.#findExact(id))?.metadata ?? {}, cleanup), 'metadata'),
        });
        reject(supervisorError('supervisor_spawn_failed', error.message));
        return;
      }
      const identity = processIdentity(child.pid);
      this.#update(id, {
        state: 'running',
        pid: child.pid,
        pgid: process.platform === 'win32' ? null : child.pid,
        boot_id: identity.bootId,
        start_time_ticks: identity.startTimeTicks,
      });
      const entry = {
        operation_id: id,
        parent_operation_id: parent,
        child,
        resolve,
        reject,
        startedAt: Date.now(),
        stdout: [],
        stderr: [],
        outputBytes: 0,
        timedOut: false,
        aborted: false,
        outputLimitExceeded: false,
        persistOutput,
        maxOutputBytes,
        stopRequested: false,
        spawnError: null,
        timer: null,
        killTimer: null,
        isolation,
        isolationError: null,
      };
      this.active.set(id, entry);
      try {
        this.#attachIsolation(isolation, child.pid);
      } catch (error) {
        entry.isolationError = error;
        this.#requestStop(entry, 'isolation_attach');
      }
      const append = (target, chunk) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        const remaining = entry.maxOutputBytes - entry.outputBytes;
        if (remaining <= 0) {
          entry.outputLimitExceeded = true;
          this.#requestStop(entry, 'output_limit');
          return;
        }
        const kept = buffer.subarray(0, remaining);
        target.push(kept);
        entry.outputBytes += kept.length;
        if (kept.length < buffer.length) {
          entry.outputLimitExceeded = true;
          this.#requestStop(entry, 'output_limit');
        }
      };
      child.stdout?.on('data', (chunk) => append(entry.stdout, chunk));
      child.stderr?.on('data', (chunk) => append(entry.stderr, chunk));
      const onAbort = () => {
        entry.aborted = true;
        this.#requestStop(entry, 'abort');
      };
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      entry.timer = setTimeout(() => {
        entry.timedOut = true;
        this.#requestStop(entry, 'timeout');
      }, timeoutMs);
      entry.timer.unref?.();
      child.once('error', (error) => { entry.spawnError = error; });
      // A short-lived command can close stdin before the supervisor writes the
      // request body. EPIPE means the child has already made its terminal
      // decision; it must not become an unhandled stream error or crash DSH.
      child.stdin?.on('error', (error) => {
        if (error?.code === 'EPIPE') return;
        entry.spawnError = error;
        this.#requestStop(entry, 'stdin');
      });
      child.once('close', (exitCode, signalName) => {
        if (entry.timer) clearTimeout(entry.timer);
        if (entry.killTimer) clearTimeout(entry.killTimer);
        signal?.removeEventListener('abort', onAbort);
        const state = entry.aborted ? 'cancelled' : (entry.timedOut || entry.outputLimitExceeded || exitCode !== 0 ? 'failed' : 'completed');
        const storedExitCode = entry.aborted || entry.timedOut || entry.outputLimitExceeded
          ? null : (Number.isInteger(exitCode) ? exitCode : null);
        const diagnostic = entry.isolationError
          ? { code: entry.isolationError.code ?? 'supervisor_isolation_attach_failed', message: entry.isolationError.message, details: entry.isolationError.details ?? {} }
          : entry.spawnError
          ? { code: 'supervisor_spawn_failed', message: entry.spawnError.message }
          : (state === 'failed' ? {
            code: entry.timedOut ? 'supervisor_timeout' : (entry.outputLimitExceeded ? 'supervisor_output_limit' : 'supervisor_process_failed'),
            message: entry.timedOut ? 'process timed out' : (entry.outputLimitExceeded ? 'process output exceeded the limit' : `process exited with ${exitCode ?? signalName ?? 'unknown'}`),
          } : null);
        const stdout = Buffer.concat(entry.stdout).toString('utf8');
        const stderr = Buffer.concat(entry.stderr).toString('utf8');
        const cleanup = this.#cleanupIsolation(entry.isolation);
        const currentMetadata = readRecord(this.#findExact(id))?.metadata ?? {};
        const updated = this.#update(id, {
          state,
          exit_code: storedExitCode,
          signal: signalName ?? null,
          // A private invocation still returns its live output to the caller,
          // but does not retain that output in the durable journal. CodeAgent
          // output can echo prompts or source snippets even when argv itself
          // was redacted, so tying output retention to the privacy flag keeps
          // restart inspection free of the same sensitive material.
          stdout: entry.persistOutput ? stdout : '',
          stderr: entry.persistOutput ? stderr : '',
          error_json: diagnostic ? JSON.stringify(diagnostic) : null,
          timed_out: entry.timedOut ? 1 : 0,
          aborted: entry.aborted ? 1 : 0,
          output_limit_exceeded: entry.outputLimitExceeded ? 1 : 0,
          duration_ms: Math.max(0, Date.now() - entry.startedAt),
          metadata_json: safeJson(processIsolationMetadata(currentMetadata, cleanup), 'metadata'),
        });
        this.active.delete(id);
        const parsed = readRecord(updated);
        if (!entry.persistOutput) {
          parsed.stdout = stdout;
          parsed.stderr = stderr;
        }
        if (entry.isolationError) entry.reject(entry.isolationError);
        else if (entry.spawnError) entry.reject(supervisorError('supervisor_spawn_failed', entry.spawnError.message));
        else entry.resolve(resultFromRecord(parsed));
      });
      try { child.stdin.end(input); } catch (error) { entry.spawnError = error; this.#requestStop(entry, 'stdin'); }
    });
  }

  inspect(operationId) {
    const id = text(operationId, 'operationId', MAX_OPERATION_ID);
    const row = this.#findExact(id) ?? this.#findLatestParent(id);
    return readRecord(row);
  }

  /**
   * Return bounded process metadata for an authenticated operator or gateway
   * health view. Command argv and captured output are intentionally omitted;
   * callers that need those fields must use the exact operation inspection
   * path with its narrower authorization boundary.
   */
  snapshot({ operationId = null, runId = null, limit = 200 } = {}) {
    if (operationId !== null) text(operationId, 'operationId', MAX_OPERATION_ID);
    if (runId !== null) text(runId, 'runId', MAX_OPERATION_ID);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 2000) {
      throw supervisorError('supervisor_input_invalid', 'limit must be between 1 and 2000');
    }
    const matching = this.#listAll().filter((row) => (operationId === null
      || row.operation_id === operationId || row.parent_operation_id === operationId)
      && (runId === null || json(row.metadata_json, {}).run_id === runId));
    const truncated = matching.length > limit;
    const rows = matching.slice(0, limit).map(readRecord);
    const counts = { starting: 0, running: 0, unknown: 0, completed: 0, failed: 0, cancelled: 0 };
    for (const row of rows) {
      if (Object.hasOwn(counts, row.state)) counts[row.state] += 1;
    }
    return {
      durable: this.durable,
      generated_at: nowIso(this.clock),
      counts,
      truncated,
      operations: rows.map(redactedRecord),
    };
  }

  async cancel(operationId, { graceMs = DEFAULT_CANCEL_GRACE_MS } = {}) {
    const id = text(operationId, 'operationId', MAX_OPERATION_ID);
    if (!Number.isSafeInteger(graceMs) || graceMs < 0 || graceMs > 60_000) {
      throw supervisorError('supervisor_input_invalid', 'graceMs must be between 0 and 60000');
    }
    const active = [...this.active.values()].filter((entry) => entry.operation_id === id || entry.parent_operation_id === id);
    if (active.length > 0) {
      for (const entry of active) {
        entry.aborted = true;
        this.#requestStop(entry, 'cancel');
      }
      return { status: 'cancellation_requested', operation_id: id, operation_ids: active.map((entry) => entry.operation_id) };
    }
    const rows = this.#findTracked(id);
    if (rows.length === 0) return { status: 'not_running', operation_id: id, operation_ids: [] };
    const cancelled = [];
    const unresolved = [];
    for (const row of rows) {
      const identity = processIdentity(row.pid);
      const identityVerified = sameProcess(row, identity);
      let terminated = !processGroupAlive(row);
      let termination = null;
      if (identity.alive && !identityVerified) {
        termination = 'identity_unverified';
        terminated = false;
      } else if (!terminated) {
        const signalSent = this.#killRecord(row, 'SIGTERM');
        termination = signalSent ? 'sigterm_sent' : 'sigterm_failed';
        terminated = await waitForProcessGroupExit(row, graceMs);
        if (!terminated) {
          const killSent = this.#killRecord(row, 'SIGKILL');
          termination = killSent ? 'sigkill_sent' : 'sigkill_failed';
          terminated = await waitForProcessGroupExit(row, graceMs);
        }
      }
      if (terminated) {
        const updated = this.#update(row.operation_id, {
          state: 'cancelled', aborted: 1, exit_code: null,
          error_json: JSON.stringify({
            code: 'supervisor_cancelled_after_restart',
            message: 'cancel confirmed after supervisor restart',
            ...(termination ? { termination } : {}),
          }),
        });
        cancelled.push(readRecord(updated));
      } else {
        const updated = this.#update(row.operation_id, {
          state: 'unknown', aborted: 1, exit_code: null,
          error_json: JSON.stringify({
            code: 'supervisor_cancel_unconfirmed',
            message: 'process termination could not be proven after cancellation',
            ...(termination ? { termination } : {}),
          }),
        });
        unresolved.push(readRecord(updated));
      }
    }
    return {
      status: unresolved.length > 0 ? 'unknown' : 'cancelled',
      operation_id: id,
      operation_ids: [...cancelled, ...unresolved].map((item) => item.operation_id),
      ...(unresolved.length > 0 ? { unresolved: unresolved.map((item) => item.operation_id) } : {}),
    };
  }

  /**
   * Reconcile operations left in starting/running state after this process
   * restarted.  A supervisor instance cannot safely resume a child it did
   * not spawn, so live children are terminated by default and retained as
   * `unknown` until the higher-level scheduler performs its own recovery.
   * `terminate: false` is available for an operator-only inspection, but is
   * deliberately not used by the Gateway entrypoint.
   */
  async reconcile({ terminate = true, graceMs = DEFAULT_RECONCILE_GRACE_MS } = {}) {
    if (typeof terminate !== 'boolean') throw supervisorError('supervisor_input_invalid', 'terminate must be a boolean');
    if (!Number.isSafeInteger(graceMs) || graceMs < 0 || graceMs > 60_000) {
      throw supervisorError('supervisor_input_invalid', 'graceMs must be between 0 and 60000');
    }
    const rows = this.#listTracked();
    const reconciled = [];
    for (const row of rows) {
      const identity = processIdentity(row.pid);
      const identityVerified = sameProcess(row, identity);
      let termination = null;
      let terminated = !processGroupAlive(row);
      if (terminate && identity.alive && identityVerified) {
        const signalSent = this.#killRecord(row, 'SIGTERM');
        termination = signalSent ? 'sigterm_sent' : 'sigterm_failed';
        if (signalSent) {
          // Reconciliation is a launch gate. Do not report readiness while a
          // previous writer may still own the workspace. Wait for a positive
          // process-group exit proof, escalate once, then wait again. The row
          // remains `unknown` so the scheduler still has to make the recovery
          // decision explicitly.
          terminated = await waitForProcessGroupExit(row, graceMs);
          if (!terminated) {
            const killSent = this.#killRecord(row, 'SIGKILL');
            termination = killSent ? 'sigkill_sent' : 'sigkill_failed';
            terminated = await waitForProcessGroupExit(row, graceMs);
          }
        }
      } else if (terminate && identity.alive) {
        termination = 'identity_unverified';
      }
      const reason = identity.alive
        ? (terminate
          ? `process ${identityVerified ? 'was live' : 'could not be fully identified'} after the supervisor restarted; ${terminated ? 'termination was confirmed' : 'termination could not be confirmed'}`
          : `process ${identityVerified ? 'was live' : 'could not be fully identified'} after the supervisor restarted`)
        : 'process identity could not be proven after the supervisor restarted';
      const updated = this.#update(row.operation_id, {
        state: 'unknown',
        error_json: JSON.stringify({
          code: 'supervisor_reconciliation_required', message: reason,
          ...(termination ? { termination } : {}),
        }),
      });
      reconciled.push(readRecord(updated));
    }
    return reconciled;
  }

  #requestStop(entry, reason) {
    if (entry.stopRequested) return;
    entry.stopRequested = true;
    this.#killRecord({
      pid: entry.child.pid,
      pgid: process.platform === 'win32' ? null : entry.child.pid,
      metadata: { process_isolation: entry.isolation },
    }, 'SIGTERM');
    // A command that ignores SIGTERM must not hold a Gateway operation forever.
    entry.killTimer = setTimeout(() => this.#killRecord({
      pid: entry.child.pid,
      pgid: process.platform === 'win32' ? null : entry.child.pid,
      metadata: { process_isolation: entry.isolation },
    }, 'SIGKILL'), 2000);
    entry.killTimer.unref?.();
    void reason;
  }

  #killRecord(row, signal) {
    if (!row?.pid) return false;
    const cgroupPath = this.#safeCgroupPath(row);
    if (signal === 'SIGKILL' && cgroupPath && process.platform === 'linux') {
      try {
        const killFile = join(cgroupPath, 'cgroup.kill');
        if (existsSync(killFile)) {
          writeFileSync(killFile, '1\n', { encoding: 'utf8' });
          return true;
        }
      } catch { /* fall back to the process group */ }
    }
    if (process.platform !== 'win32' && row.pgid) {
      try { process.kill(-Number(row.pgid), signal); return true; } catch { /* fall back to the direct child */ }
    }
    try { process.kill(Number(row.pid), signal); return true; } catch { return false; }
  }

  #safeCgroupPath(row) {
    const candidate = row?.metadata?.process_isolation?.path;
    if (typeof candidate !== 'string' || !isAbsolute(candidate)) return null;
    const normalized = resolve(candidate);
    const root = this.cgroupRoot;
    const remainder = relative(root, normalized);
    if (!remainder || remainder === '..' || remainder.startsWith('../') || !/^[A-Za-z0-9._-]+$/u.test(remainder)) return null;
    return normalized;
  }

  #prepareIsolation(operationId) {
    if (this.cgroupMode === 'disabled') return { mode: 'disabled', active: false, path: null, reason: 'disabled' };
    const availability = cgroupAvailability(this.cgroupRoot);
    if (!availability.available) {
      const error = supervisorError(
        'supervisor_isolation_unavailable',
        `cgroup isolation is unavailable: ${availability.reason}`,
        { mode: this.cgroupMode, root: this.cgroupRoot, reason: availability.reason },
      );
      return {
        mode: this.cgroupMode,
        active: false,
        path: null,
        reason: availability.reason,
        fatal: this.cgroupMode === 'required',
        error,
      };
    }
    const name = `${this.cgroupPrefix}-${createHash('sha256').update(operationId).digest('hex').slice(0, 32)}`;
    const path = join(this.cgroupRoot, name);
    try {
      mkdirSync(path, { mode: 0o700 });
      const processFile = join(path, 'cgroup.procs');
      if (!existsSync(processFile)) throw new Error('cgroup child has no cgroup.procs');
      accessSync(processFile, fsConstants.R_OK | fsConstants.W_OK);
      for (const [key, file] of Object.entries(CGROUP_LIMIT_FILES)) {
        if (this.cgroupLimits[key] === undefined) continue;
        const target = join(path, file);
        if (!existsSync(target)) throw new Error(`${file} is unavailable in the delegated cgroup`);
        writeFileSync(target, `${this.cgroupLimits[key]}\n`, { encoding: 'utf8' });
      }
      return { mode: this.cgroupMode, active: true, path, reason: null };
    } catch (error) {
      try { rmdirSync(path); } catch { /* retain no authority over an unknown cgroup */ }
      const reason = error?.code === 'EACCES' ? 'cgroup_setup_not_permitted' : 'cgroup_setup_failed';
      const isolationError = supervisorError(
        'supervisor_isolation_unavailable',
        `cgroup isolation setup failed: ${error?.message ?? String(error)}`,
        { mode: this.cgroupMode, root: this.cgroupRoot, reason },
      );
      return {
        mode: this.cgroupMode,
        active: false,
        path: null,
        reason,
        fatal: this.cgroupMode === 'required',
        error: isolationError,
      };
    }
  }

  #attachIsolation(isolation, pid) {
    if (!isolation?.active) return;
    try {
      writeFileSync(join(isolation.path, 'cgroup.procs'), `${pid}\n`, { encoding: 'utf8' });
    } catch (error) {
      try { rmdirSync(isolation.path); } catch { /* child may still be attached */ }
      const isolationError = supervisorError(
        'supervisor_isolation_attach_failed',
        `could not attach process to cgroup: ${error?.message ?? String(error)}`,
        { path: isolation.path },
      );
      isolation.active = false;
      isolation.reason = 'cgroup_attach_failed';
      throw isolationError;
    }
  }

  #cleanupIsolation(isolation) {
    if (!isolation || isolation.mode === 'disabled') return { mode: 'disabled', active: false, path: null, reason: 'disabled' };
    const result = { mode: isolation.mode, active: false, path: isolation.path ?? null, reason: isolation.reason ?? null };
    if (!isolation.path) return result;
    try {
      rmdirSync(isolation.path);
      result.cleaned = true;
    } catch (error) {
      result.active = true;
      result.cleanup_error = error?.code ?? 'cgroup_cleanup_failed';
    }
    return result;
  }

  #findExact(operationId) {
    if (this.db) return this.db.prepare('SELECT * FROM supervised_processes WHERE operation_id = ?').get(operationId) ?? null;
    return this.memory.get(operationId) ?? null;
  }

  #findLatestParent(operationId) {
    if (this.db) return this.db.prepare('SELECT * FROM supervised_processes WHERE parent_operation_id = ? ORDER BY updated_at DESC LIMIT 1').get(operationId) ?? null;
    return [...this.memory.values()].filter((row) => row.parent_operation_id === operationId).sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0] ?? null;
  }

  #findTracked(operationId) {
    if (this.db) return this.db.prepare("SELECT * FROM supervised_processes WHERE (operation_id = ? OR parent_operation_id = ?) AND state IN ('starting','running','unknown') ORDER BY updated_at").all(operationId, operationId);
    return [...this.memory.values()].filter((row) => (row.operation_id === operationId || row.parent_operation_id === operationId) && TRACKED_STATES.has(row.state));
  }

  #listTracked() {
    if (this.db) return this.db.prepare("SELECT * FROM supervised_processes WHERE state IN ('starting','running') ORDER BY created_at").all();
    return [...this.memory.values()].filter((row) => row.state === 'starting' || row.state === 'running');
  }

  #listAll() {
    if (this.db) return this.db.prepare('SELECT * FROM supervised_processes ORDER BY updated_at DESC LIMIT 2000').all();
    return [...this.memory.values()].sort((left, right) => right.updated_at.localeCompare(left.updated_at)).slice(0, 2000);
  }

  #insert(record) {
    if (this.db) {
      try {
        this.db.prepare(`
          INSERT INTO supervised_processes(
            operation_id, parent_operation_id, state, command, args_json, args_digest, args_persisted, cwd,
            pid, pgid, boot_id, start_time_ticks, created_at, updated_at,
            exit_code, signal, stdout, stderr, error_json, metadata_json,
            timed_out, aborted, output_limit_exceeded, duration_ms
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?
          )
        `).run(
          record.operation_id, record.parent_operation_id, record.state, record.command, record.args_json,
          record.args_digest, record.args_persisted, record.cwd,
          record.pid, record.pgid, record.boot_id, record.start_time_ticks, record.created_at, record.updated_at,
          record.exit_code, record.signal, record.stdout, record.stderr, record.error_json, record.metadata_json,
          record.timed_out, record.aborted, record.output_limit_exceeded, record.duration_ms,
        );
      } catch (error) {
        if (String(error?.message ?? '').toLowerCase().includes('constraint')) {
          throw supervisorError('supervisor_operation_conflict', `operation ${record.operation_id} already exists`);
        }
        throw error;
      }
      return;
    }
    this.memory.set(record.operation_id, { ...record });
  }

  #update(operationId, patch) {
    const existing = this.#findExact(operationId);
    if (!existing) throw supervisorError('supervisor_operation_missing', `operation ${operationId} is not supervised`);
    const current = { ...existing, ...patch, updated_at: nowIso(this.clock) };
    const columns = [
      'parent_operation_id', 'state', 'command', 'args_json', 'args_digest', 'args_persisted', 'cwd', 'pid', 'pgid', 'boot_id', 'start_time_ticks',
      'created_at', 'updated_at', 'exit_code', 'signal', 'stdout', 'stderr', 'error_json', 'metadata_json',
      'timed_out', 'aborted', 'output_limit_exceeded', 'duration_ms',
    ];
    if (this.db) {
      this.db.prepare(`UPDATE supervised_processes SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE operation_id = ?`).run(
        ...columns.map((column) => current[column] ?? null), operationId,
      );
      return this.#findExact(operationId);
    }
    this.memory.set(operationId, current);
    return current;
  }

  #ensureSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS supervised_processes (
        operation_id TEXT PRIMARY KEY,
        parent_operation_id TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('starting', 'running', 'unknown', 'completed', 'failed', 'cancelled')),
        command TEXT NOT NULL,
        args_json TEXT NOT NULL,
        args_digest TEXT,
        args_persisted INTEGER NOT NULL DEFAULT 1,
        cwd TEXT NOT NULL,
        pid INTEGER,
        pgid INTEGER,
        boot_id TEXT,
        start_time_ticks TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        exit_code INTEGER,
        signal TEXT,
        stdout TEXT NOT NULL DEFAULT '',
        stderr TEXT NOT NULL DEFAULT '',
        error_json TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        timed_out INTEGER NOT NULL DEFAULT 0,
        aborted INTEGER NOT NULL DEFAULT 0,
        output_limit_exceeded INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER
      )
    `);
    const columns = new Set(this.db.prepare('PRAGMA table_info(supervised_processes)').all().map((column) => column.name));
    if (!columns.has('args_digest')) this.db.exec('ALTER TABLE supervised_processes ADD COLUMN args_digest TEXT');
    if (!columns.has('args_persisted')) this.db.exec('ALTER TABLE supervised_processes ADD COLUMN args_persisted INTEGER NOT NULL DEFAULT 1');
    // Older releases introduced private argv retention before output privacy
    // was tied to the same flag.  Scrub any already-completed private rows on
    // startup so a migration cannot leave prompt text in the durable journal.
    this.db.exec("UPDATE supervised_processes SET stdout = '', stderr = '' WHERE args_persisted = 0");
    this.db.exec('CREATE INDEX IF NOT EXISTS supervised_processes_parent ON supervised_processes(parent_operation_id, updated_at)');
    this.db.exec('CREATE INDEX IF NOT EXISTS supervised_processes_state ON supervised_processes(state, updated_at)');
  }
}

function optionalEnvValue(env, names) {
  for (const name of names) {
    const value = env?.[name];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}

/**
 * Read deployment-safe isolation settings without making environment values
 * part of a durable process record.  The default remains disabled so local
 * development and injected test supervisors keep their previous behavior.
 */
export function cgroupOptionsFromEnv(env = process.env) {
  const mode = optionalEnvValue(env, ['DSH_PROCESS_CGROUP_MODE', 'DSH_GATEWAY_CGROUP_MODE']) ?? 'disabled';
  const root = optionalEnvValue(env, ['DSH_PROCESS_CGROUP_ROOT', 'DSH_GATEWAY_CGROUP_ROOT']) ?? '/sys/fs/cgroup';
  const prefix = optionalEnvValue(env, ['DSH_PROCESS_CGROUP_PREFIX', 'DSH_GATEWAY_CGROUP_PREFIX']) ?? 'dsh';
  const limits = {};
  const memoryMax = optionalEnvValue(env, ['DSH_PROCESS_MEMORY_MAX', 'DSH_GATEWAY_MEMORY_MAX']);
  const pidsMax = optionalEnvValue(env, ['DSH_PROCESS_PIDS_MAX', 'DSH_GATEWAY_PIDS_MAX']);
  const cpuMax = optionalEnvValue(env, ['DSH_PROCESS_CPU_MAX', 'DSH_GATEWAY_CPU_MAX']);
  if (memoryMax !== null) limits.memoryMax = memoryMax;
  if (pidsMax !== null) limits.pidsMax = pidsMax;
  if (cpuMax !== null) limits.cpuMax = cpuMax;
  return { cgroupMode: mode, cgroupRoot: root, cgroupPrefix: prefix, cgroupLimits: limits };
}

export { DEFAULT_MAX_OUTPUT_BYTES, DEFAULT_TIMEOUT_MS, resolveCgroupRoot };
