import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { isAbsolute, posix } from 'node:path';

const MAX_PATH_LENGTH = 4096;
const MAX_CONTENT_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_PROFILE_ARGS = 64;
const MAX_JOURNAL_ENTRIES = 2048;
const MAX_LIST_ENTRIES = 10_000;
const DEFAULT_TIMEOUT_MS = 120_000;

const DEFAULT_PROFILES = Object.freeze({
  status: Object.freeze({ command: 'git', args: ['status', '--short'] }),
  diff: Object.freeze({ command: 'git', args: ['diff', '--no-ext-diff', '--'] }),
});

const OPERATION_KINDS = new Set([
  'workspace.inspect', 'workspace.read', 'workspace.write', 'workspace.list',
  'workspace.hash', 'workspace.read_binary', 'workspace.exec_profile', 'workspace.diff',
  'workspace.probe', 'workspace.search',
  'workspace.remove',
]);

export class WorkspaceConnectorError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'WorkspaceConnectorError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new WorkspaceConnectorError(code, message, details);
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function boundedText(value, field, max = MAX_PATH_LENGTH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || /[\0\r\n]/u.test(value)) {
    fail('field_invalid', `${field} must be a non-empty bounded string`, { field, max });
  }
  return value;
}

function shellQuote(value) {
  boundedText(String(value), 'remote_argument', MAX_CONTENT_BYTES);
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

export function normalizeProfiles(profiles) {
  const source = profiles ?? DEFAULT_PROFILES;
  const entries = source instanceof Map ? [...source.entries()] : Object.entries(source);
  const result = new Map();
  for (const [id, raw] of entries) {
    if (typeof id !== 'string' || !/^[a-z][a-z0-9._-]{0,63}$/u.test(id)) {
      fail('profile_invalid', 'profile id is invalid', { id });
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('profile_invalid', `profile ${id} must be an object`);
    const command = boundedText(raw.command, `${id}.command`, 512);
    if (/[;&|`$<>\n\r]/u.test(command) || /\s/u.test(command)) {
      fail('profile_invalid', `profile ${id} command contains shell syntax`, { id });
    }
    const args = raw.args ?? [];
    if (!Array.isArray(args) || args.length > MAX_PROFILE_ARGS || args.some((arg) => typeof arg !== 'string' || arg.length > 4096 || /[\0\r\n]/u.test(arg))) {
      fail('profile_invalid', `profile ${id} args are invalid`, { id });
    }
    const resourceLock = raw.resource_lock === undefined || raw.resource_lock === null
      ? null : boundedText(raw.resource_lock, `${id}.resource_lock`, 256);
    if (resourceLock && /[/:\\\s]/u.test(resourceLock)) {
      fail('profile_invalid', `profile ${id} resource_lock must be a logical lock name`, { id });
    }
    result.set(id, {
      command,
      args: [...args],
      capabilities: Array.isArray(raw.capabilities) ? [...raw.capabilities] : [],
      resource_lock: resourceLock,
    });
  }
  return result;
}

function commandResultError(result, operation) {
  if (result?.exitCode === 0) return null;
  return new WorkspaceConnectorError(
    'remote_command_failed',
    `${operation} exited with ${result?.exitCode ?? result?.signal ?? 'unknown'}`,
    { exit_code: result?.exitCode ?? null, signal: result?.signal ?? null, stderr: result?.stderr ?? '' },
  );
}

function defaultCommandRunner(command, args, {
  cwd, input = '', signal, timeoutMs = DEFAULT_TIMEOUT_MS, operationId = null,
  parentOperationId = null, supervisor = null, privateInvocation = false,
} = {}) {
  const supervisedRun = supervisor && (typeof supervisor.run === 'function'
    ? supervisor.run.bind(supervisor) : (typeof supervisor.start === 'function' ? supervisor.start.bind(supervisor) : null));
  if (supervisedRun) {
    return supervisedRun({
      operationId: operationId || `workspace-command-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      parentOperationId: parentOperationId || operationId || undefined,
      command,
      args,
      cwd: cwd || process.cwd(),
      input,
      signal,
      timeoutMs,
      ...(privateInvocation ? { persistArgs: false, persistOutput: false } : {}),
    });
  }
  return new Promise((resolveResult, reject) => {
    let child;
    try {
      child = spawn(command, args, {
        cwd,
        shell: false,
        // SSH can launch a remote build/codeagent process that outlives the
        // client process. Put the local transport in its own process group so
        // cancellation and timeout terminate the complete local tree rather
        // than only the ssh parent.
        detached: process.platform !== 'win32',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      reject(new WorkspaceConnectorError('ssh_spawn_failed', error.message));
      return;
    }
    const stdout = [];
    const stderr = [];
    let bytes = 0;
    let timedOut = false;
    let aborted = false;
    let settled = false;
    let stopScheduled = false;
    const stop = () => {
      // Let already queued stdout/stderr events drain before terminating the
      // group. This keeps a short diagnostic (for example a spawned PID) from
      // being lost when an abort races the child's first write.
      if (stopScheduled) return;
      stopScheduled = true;
      setTimeout(() => {
        if (child.pid && process.platform !== 'win32') {
          try {
            process.kill(-child.pid, 'SIGTERM');
            return;
          } catch { /* process group may already be gone */ }
        }
        try { child.kill('SIGTERM'); } catch { /* process is already gone */ }
      }, 50);
    };
    const append = (target, chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_OUTPUT_BYTES) stop();
      else target.push(chunk);
    };
    child.stdout.on('data', (chunk) => append(stdout, chunk));
    child.stderr.on('data', (chunk) => append(stderr, chunk));
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    const onAbort = () => { aborted = true; stop(); };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolveResult({ ...result, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), timedOut, aborted });
    };
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new WorkspaceConnectorError('ssh_command_failed', error.message, { cause: error.code }));
    });
    child.once('close', (exitCode, signalName) => finish({ exitCode, signal: signalName }));
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

function normalizeRunnerResult(value) {
  return {
    stdout: String(value?.stdout ?? ''),
    stderr: String(value?.stderr ?? ''),
    // A custom runner is an authority boundary. Missing exit information is
    // unknown, never success; otherwise an injected/test runner could turn a
    // failed SSH command into a completed operation by omission.
    exitCode: Number.isInteger(value?.exitCode) ? value.exitCode : null,
    signal: value?.signal ?? null,
    timedOut: value?.timedOut === true,
    aborted: value?.aborted === true,
  };
}

/**
 * A local Connector-side Workspace Gateway. It accepts only Authority
 * envelopes and a fixed operation vocabulary, then invokes the configured
 * `ssh` binary with `shell:false`. The remote shell receives quoted arguments
 * generated from validated relative paths and immutable profile commands.
 */
export class WorkspaceConnector {
  constructor({
    host,
    username = null,
    port = 22,
    remoteRoot = '/',
    sshCommand = 'ssh',
    identityFile = null,
    knownHostsFile = null,
    commandRunner = defaultCommandRunner,
    processSupervisor = null,
    verifySignature = null,
    resourceLocks = null,
    journalDb = null,
    authorityContext = {},
    profiles = DEFAULT_PROFILES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    journalLimit = MAX_JOURNAL_ENTRIES,
  } = {}) {
    if (typeof host !== 'string' || host.trim() === '' || /[\0\r\n]/u.test(host)) fail('host_invalid', 'SSH host is required');
    if (!Number.isInteger(port) || port < 1 || port > 65535) fail('port_invalid', 'SSH port must be between 1 and 65535');
    if (typeof remoteRoot !== 'string' || !isAbsolute(remoteRoot)) fail('remote_root_invalid', 'remoteRoot must be an absolute POSIX path');
    this.host = host.trim();
    this.username = username === null ? null : boundedText(username, 'username', 256);
    this.port = port;
    this.remoteRoot = posix.normalize(remoteRoot);
    this.sshCommand = boundedText(sshCommand, 'sshCommand', 512);
    this.identityFile = identityFile;
    this.knownHostsFile = knownHostsFile;
    this.commandRunner = commandRunner;
    if (processSupervisor !== null && (!processSupervisor || (typeof processSupervisor.run !== 'function' && typeof processSupervisor.start !== 'function'))) {
      throw new TypeError('processSupervisor must expose run or start');
    }
    this.processSupervisor = processSupervisor;
    this.verifySignature = verifySignature;
    if (resourceLocks !== null && (!resourceLocks || typeof resourceLocks.acquire !== 'function')) {
      throw new TypeError('resourceLocks must expose acquire');
    }
    this.resourceLocks = resourceLocks;
    if (journalDb !== null && (!journalDb || typeof journalDb.prepare !== 'function' || typeof journalDb.exec !== 'function')) {
      throw new TypeError('journalDb must expose prepare and exec');
    }
    this.journalDb = journalDb;
    this.authorityContext = { ...authorityContext };
    this.profiles = normalizeProfiles(profiles);
    this.timeoutMs = timeoutMs;
    this.journalLimit = Math.max(1, Math.min(MAX_JOURNAL_ENTRIES, journalLimit));
    this.journal = new Map();
    this.active = new Map();
    this.remoteSequence = 0;
    if (this.journalDb) this.#ensureJournalSchema();
  }

  payloadDigest(payload) {
    return createHash('sha256').update(stableStringify(payload), 'utf8').digest('hex');
  }

  reconnect({ connection_epoch, ...context } = {}) {
    const next = connection_epoch ?? (Number.isInteger(this.authorityContext.connection_epoch)
      ? this.authorityContext.connection_epoch + 1 : 1);
    if (!Number.isInteger(next) || next < 1) fail('connection_epoch_invalid', 'connection_epoch must be positive');
    this.authorityContext = { ...this.authorityContext, ...context, connection_epoch: next };
    this.journal.clear();
    return { connection_epoch: next, workspace_id: this.authorityContext.workspace_id ?? null };
  }

  async execute(envelope) {
    const validated = await this.#validate(envelope);
    if (validated.message_type === 'operation.cancel') return this.#cancel(validated);
    if (validated.message_type !== 'operation.start') {
      if (validated.message_type === 'authority.inspect') return this.inspect(validated.payload);
      fail('message_type_unsupported', `Connector cannot execute ${validated.message_type}`);
    }
    const operationId = validated.operation_id;
    const fingerprint = digest({
      message_type: validated.message_type,
      tenant_id: validated.tenant_id,
      workspace_id: validated.workspace_id,
      cloud_run_id: validated.cloud_run_id,
      authority_run_id: validated.authority_run_id,
      revision: validated.revision,
      phase_epoch: validated.phase_epoch,
      connection_epoch: validated.connection_epoch,
      payload: validated.payload,
    });
    const previous = this.journal.get(operationId);
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('operation_replay_conflict', `operation ${operationId} was reused with different input`);
      if (previous.promise) return previous.promise;
      if (previous.state === 'completed') return structuredClone(previous.outcome);
      if (previous.state === 'failed') throw this.#restoreError(previous.error);
      fail('operation_in_progress', `operation ${operationId} is still running`);
    }
    const persisted = this.#journalLookup(operationId, fingerprint);
    if (persisted) {
      if (persisted.state === 'completed') return structuredClone(persisted.outcome);
      if (persisted.state === 'failed') throw this.#restoreError(persisted.error);
      fail('operation_in_progress', `operation ${operationId} is still running; reconcile the previous gateway process before retrying`);
    }
    this.#journalReserve(operationId, fingerprint);
    const controller = new AbortController();
    const record = { fingerprint, promise: null, outcome: null, error: null, state: 'running', controller };
    const promise = this.#executeOperation(validated, controller.signal, operationId)
      .then((result) => ({ operation_id: operationId, status: 'completed', result }))
      .catch((error) => {
        if (error?.code === 'operation_cancelled' || controller.signal.aborted) {
          throw new WorkspaceConnectorError('operation_cancelled', error.message || 'operation cancelled');
        }
        throw error;
      })
      .then((outcome) => {
        record.state = 'completed';
        record.outcome = outcome;
        record.promise = null;
        this.#journalComplete(operationId, outcome);
        this.#trimJournal();
        return outcome;
      })
      .catch((error) => {
        const diagnostic = this.#error(error);
        record.state = 'failed';
        record.error = diagnostic;
        record.promise = null;
        this.#journalFailure(operationId, diagnostic);
        this.#trimJournal();
        throw error;
      })
      .finally(() => { this.active.delete(operationId); });
    record.promise = promise;
    this.journal.set(operationId, record);
    this.active.set(operationId, { controller, promise });
    this.#trimJournal();
    return promise;
  }

  inspect(options = {}) {
    const payload = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
    const processLimit = payload.process_limit === undefined ? 200 : Number(payload.process_limit);
    const supervisor = this.processSupervisor?.snapshot
      ? this.processSupervisor.snapshot({
        limit: Number.isSafeInteger(processLimit) ? processLimit : 200,
        ...(payload.process_operation_id ? { operationId: payload.process_operation_id } : {}),
        ...(payload.process_run_id ? { runId: payload.process_run_id } : {}),
      })
      : { durable: false, generated_at: new Date().toISOString(), counts: {}, operations: [] };
    return {
      status: 'ready',
      host: this.host,
      username: this.username,
      port: this.port,
      remote_root: this.remoteRoot,
      connection_epoch: this.authorityContext.connection_epoch ?? null,
      profiles: [...this.profiles.entries()].map(([id, profile]) => ({
        id, capabilities: profile.capabilities, resource_lock: profile.resource_lock,
      })),
      supervisor,
    };
  }

  async #validate(envelope) {
    const { validateAuthorityEnvelope } = await import('../authority/envelope.js');
    let validated;
    try {
      validated = validateAuthorityEnvelope(envelope, { expected: this.authorityContext });
    } catch (error) {
      throw error;
    }
    if (this.verifySignature && !(await this.verifySignature(validated))) {
      fail('signature_invalid', 'Authority envelope signature was rejected');
    }
    return validated;
  }

  async #executeOperation(envelope, signal, operationId) {
    const payload = envelope.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('payload_invalid', 'operation payload must be an object');
    const kind = boundedText(payload.operation_kind, 'operation_kind', 128);
    if (!OPERATION_KINDS.has(kind)) fail('operation_not_allowed', `operation ${kind} is not allowed`);
    if (kind === 'workspace.inspect') return this.inspect();
    if (kind === 'workspace.read') return this.#read(payload, signal, operationId);
    if (kind === 'workspace.write') return this.#write(payload, signal, operationId);
    if (kind === 'workspace.list') return this.#list(payload, signal, operationId);
    if (kind === 'workspace.hash') return this.#hash(payload, signal, operationId);
    if (kind === 'workspace.read_binary') return this.#readBinary(payload, signal, operationId);
    if (kind === 'workspace.remove') return this.#remove(payload, signal, operationId);
    if (kind === 'workspace.diff') return this.#diff(payload, signal, operationId);
    if (kind === 'workspace.probe') return this.#probe(payload, signal, operationId);
    if (kind === 'workspace.search') return this.#search(payload, signal, operationId);
    return this.#profile(payload, signal, operationId);
  }

  #target() {
    return this.username ? `${this.username}@${this.host}` : this.host;
  }

  #remotePath(value, { allowRoot = true } = {}) {
    const relativePath = boundedText(value, 'path');
    if (relativePath.includes('\\') || relativePath.startsWith('/') || relativePath.startsWith('~')) {
      fail('path_outside_workspace', 'workspace path must be relative to the registered SSH root', { path: value });
    }
    const normalizedRelative = posix.normalize(relativePath);
    if (!allowRoot && normalizedRelative === '.') fail('path_invalid', 'a file path is required');
    if (normalizedRelative === '..' || normalizedRelative.startsWith('../') || normalizedRelative.includes('/../')) {
      fail('path_outside_workspace', 'workspace path escapes the registered SSH root', { path: value });
    }
    const full = posix.normalize(posix.join(this.remoteRoot, normalizedRelative));
    const root = this.remoteRoot.endsWith('/') ? this.remoteRoot : `${this.remoteRoot}/`;
    if (full !== this.remoteRoot && !full.startsWith(root)) {
      fail('path_outside_workspace', 'workspace path escapes the registered SSH root', { path: value });
    }
    return { relativePath: normalizedRelative === '.' ? '' : normalizedRelative, full };
  }

  #remoteGuard(fullPath, { allowMissing = false, rejectSymlink = true } = {}) {
    const root = shellQuote(this.remoteRoot);
    const target = shellQuote(fullPath);
    const parent = shellQuote(posix.dirname(fullPath));
    const rootCheck = `root_real=$(realpath -e -- ${root}) || exit 91`;
    const within = `case "$target_real" in "$root_real"|"$root_real"/*) ;; *) exit 91 ;; esac`;
    if (allowMissing) {
      // A missing leaf is valid for workspace.write and scheduler prompt
      // cleanup. Resolve the lexical target after validating its existing
      // parent so the caller can safely redirect to a new file. If the leaf
      // already exists, switch to its canonical path and apply the same
      // containment and symlink checks as the non-missing branch.
      return `${rootCheck} && parent_real=$(realpath -e -- ${parent}) || exit 91; case "$parent_real" in "$root_real"|"$root_real"/*) ;; *) exit 91 ;; esac; ${rejectSymlink ? `[ ! -L ${target} ] || exit 92;` : ''} target_real=$(realpath -m -- ${target}) || exit 91; if [ -e ${target} ]; then target_real=$(realpath -e -- ${target}) || exit 91; ${within}; fi`;
    }
    return `${rootCheck} && target_real=$(realpath -e -- ${target}) || exit 91; ${within}; ${rejectSymlink ? `[ ! -L ${target} ] || exit 92` : ':'}`;
  }

  #sshArgs(remoteCommand) {
    const args = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes'];
    if (this.identityFile) args.push('-i', boundedText(this.identityFile, 'identityFile', 4096));
    if (this.knownHostsFile) args.push('-o', `UserKnownHostsFile=${boundedText(this.knownHostsFile, 'knownHostsFile', 4096)}`);
    args.push('-p', String(this.port), '--', this.#target(), remoteCommand);
    return args;
  }

  async #remote(remoteCommand, { input = '', signal, operationId = null, privateInvocation = false } = {}) {
    if (signal?.aborted) fail('operation_cancelled', 'operation was cancelled before SSH started');
    const supervisedOperationId = operationId
      ? `${operationId}:remote:${++this.remoteSequence}`
      : null;
    const result = normalizeRunnerResult(await this.commandRunner(this.sshCommand, this.#sshArgs(remoteCommand), {
      shell: false,
      input,
      signal,
      timeoutMs: this.timeoutMs,
      operationId: supervisedOperationId,
      parentOperationId: operationId,
      supervisor: this.processSupervisor,
      ...(privateInvocation ? { privateInvocation: true } : {}),
    }));
    if (result.aborted || signal?.aborted) fail('operation_cancelled', 'operation was cancelled');
    if (result.timedOut) fail('remote_command_timeout', 'SSH operation timed out');
    if (result.stdout.length > MAX_OUTPUT_BYTES || result.stderr.length > MAX_OUTPUT_BYTES) fail('remote_output_limit', 'SSH operation output exceeded the configured limit');
    if (result.exitCode === 91) fail('path_outside_workspace', 'remote path resolved outside the registered workspace root');
    if (result.exitCode === 92) fail('path_symlink_rejected', 'remote path is a symbolic link and cannot be used by the workspace connector');
    if (result.exitCode === 93) fail('path_not_allowed', 'remote remove target is not a regular file');
    if (result.exitCode === 94) fail('workspace_unavailable', 'registered remote workspace is missing or outside its root');
    if (result.exitCode === 95) fail('workspace_not_directory', 'registered remote workspace path is not a directory');
    if (result.exitCode === 96) fail('workspace_not_readable', 'registered remote workspace is not readable');
    if (result.exitCode === 97) fail('workspace_not_writable', 'registered remote workspace is not writable');
    if (result.exitCode === 98) fail('workspace_not_file', 'registered remote workspace path is not a regular file');
    if (result.exitCode === 99) fail('workspace_not_executable', 'registered remote workspace path is not executable');
    const commandError = commandResultError(result, 'SSH operation');
    if (commandError) throw commandError;
    return result;
  }

  async #read(payload, signal, operationId) {
    const path = this.#remotePath(payload.path, { allowRoot: false });
    const result = await this.#remote(`${this.#remoteGuard(path.full)} && cat -- "$target_real"`, { signal, operationId });
    return { operation: 'read', relative_path: path.relativePath, content: result.stdout, sha256: digest(result.stdout), bytes: Buffer.byteLength(result.stdout, 'utf8') };
  }

  async #write(payload, signal, operationId) {
    const path = this.#remotePath(payload.path, { allowRoot: false });
    if (typeof payload.content !== 'string' || Buffer.byteLength(payload.content, 'utf8') > MAX_CONTENT_BYTES || /\0/u.test(payload.content)) {
      fail('content_invalid', 'workspace write content exceeds the limit or contains NUL');
    }
    if (payload.expected_sha256 !== undefined && typeof payload.expected_sha256 !== 'string') fail('expected_hash_invalid', 'expected_sha256 must be a string');
    const expected = payload.expected_sha256 ?? null;
    if (expected) {
      const current = await this.#remote(`${this.#remoteGuard(path.full, { allowMissing: true })} && if [ -f "$target_real" ]; then sha256sum -- "$target_real" | cut -d' ' -f1; fi`, { signal, operationId });
      const currentHash = current.stdout.trim() || null;
      if (currentHash !== expected) fail('source_changed', 'workspace file hash does not match expected_sha256', { expected_sha256: expected, actual_sha256: currentHash });
    }
    const parent = posix.dirname(path.full);
    // Validate the eventual parent before creating missing directories. A
    // symlinked component must never make `mkdir -p` create side effects
    // outside the registered root, even though the final target guard would
    // reject the write itself.
    const root = shellQuote(this.remoteRoot);
    const parentQuoted = shellQuote(parent);
    const parentGuard = `root_real=$(realpath -e -- ${root}) || exit 91; parent_real=$(realpath -m -- ${parentQuoted}) || exit 91; case "$parent_real" in "$root_real"|"$root_real"/*) ;; *) exit 91 ;; esac`;
    const command = `umask 077 && ${parentGuard} && mkdir -p -- ${parentQuoted} && ${this.#remoteGuard(path.full, { allowMissing: true })} && cat > "$target_real"`;
    const result = await this.#remote(command, { input: payload.content, signal, operationId });
    return { operation: 'write', relative_path: path.relativePath, sha256: digest(payload.content), bytes: Buffer.byteLength(payload.content, 'utf8'), output: result.stdout };
  }

  async #remove(payload, signal, operationId) {
    const path = this.#remotePath(payload.path, { allowRoot: false });
    // This operation exists solely for ephemeral scheduler prompt cleanup.  A
    // profile or model cannot turn it into a general-purpose delete primitive:
    // only files below the run-local .dsh/scheduler-prompts directory are
    // accepted, and symlinks/directories are rejected by the remote guard.
    const parts = path.relativePath.split('/');
    const schedulerPromptsIndex = parts.indexOf('.dsh');
    if (schedulerPromptsIndex < 0
        || parts[schedulerPromptsIndex + 1] !== 'scheduler-prompts'
        || schedulerPromptsIndex + 2 >= parts.length
        || path.relativePath.endsWith('/')) {
      fail('path_not_allowed', 'workspace.remove is limited to .dsh/scheduler-prompts files', {
        path: path.relativePath,
      });
    }
    const result = await this.#remote(
      `${this.#remoteGuard(path.full, { allowMissing: true })} && `
      + `if [ -e "$target_real" ]; then [ -f "$target_real" ] || exit 93; rm -f -- "$target_real"; fi`,
      { signal, operationId },
    );
    return { operation: 'remove', relative_path: path.relativePath, removed: true };
  }

  async #list(payload, signal, operationId) {
    const path = this.#remotePath(payload.path ?? '.', { allowRoot: true });
    if (payload.recursive !== undefined && typeof payload.recursive !== 'boolean') {
      fail('recursive_invalid', 'workspace.list recursive must be a boolean');
    }
    if (payload.with_metadata !== undefined && typeof payload.with_metadata !== 'boolean') {
      fail('metadata_invalid', 'workspace.list with_metadata must be a boolean');
    }
    const maxEntries = payload.max_entries === undefined ? MAX_LIST_ENTRIES : payload.max_entries;
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > MAX_LIST_ENTRIES) {
      fail('max_entries_invalid', `workspace.list max_entries must be between 1 and ${MAX_LIST_ENTRIES}`);
    }
    const findArgs = payload.recursive === true
      ? '-type f'
      : '-maxdepth 1 -mindepth 1 -type f';
    const format = payload.with_metadata === true ? "-printf '%P\\t%s\\t%T@\\n'" : '';
    // Missing artifact roots are a normal outcome for an early AR phase. The
    // guard keeps the fixed operation successful with an empty result.
    const command = `if [ -d ${shellQuote(path.full)} ]; then ${this.#remoteGuard(path.full)} && find "$target_real" ${findArgs} ${format} | sort | head -n ${maxEntries}; fi`;
    const result = await this.#remote(command, { signal, operationId });
    const lines = result.stdout.split(/\r?\n/u).map((value) => value.trim()).filter(Boolean);
    const entries = payload.with_metadata === true
      ? lines.map((line) => {
        const fields = line.split('\t');
        if (fields.length !== 3) return null;
        const relativePath = fields[0];
        const normalized = posix.normalize(relativePath);
        const size = Number(fields[1]);
        const mtime = Number(fields[2]);
        if (!relativePath || relativePath.includes('\\') || normalized === '.' || normalized.startsWith('/')
            || normalized === '..' || normalized.startsWith('../') || !Number.isSafeInteger(size) || size < 0
            || !Number.isFinite(mtime) || mtime < 0) return null;
        return { relative_path: normalized, size_bytes: size, mtime_ms: Math.round(mtime * 1000) };
      }).filter(Boolean)
      : lines;
    return { operation: 'list', relative_path: path.relativePath, entries, recursive: payload.recursive === true, truncated: entries.length >= maxEntries };
  }

  async #search(payload, signal, operationId) {
    const path = this.#remotePath(payload.path ?? '.', { allowRoot: true });
    const query = boundedText(payload.query, 'query', 16 * 1024);
    const maxResults = payload.max_results === undefined ? 200 : payload.max_results;
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 2000) {
      fail('max_results_invalid', 'workspace.search max_results must be between 1 and 2000');
    }
    if (payload.glob !== undefined && (typeof payload.glob !== 'string' || payload.glob.length > 256
        || /[\0\r\n]/u.test(payload.glob))) {
      fail('glob_invalid', 'workspace.search glob is invalid');
    }
    // Use fixed-string grep and shell-quote every value. This deliberately
    // avoids regex and shell evaluation in a model-facing tool while keeping
    // the operation available on code hosts that do not install ripgrep.
    const glob = payload.glob ? `--include=${shellQuote(payload.glob)}` : '';
    const command = `if [ -d ${shellQuote(path.full)} ]; then ${this.#remoteGuard(path.full)} && grep -RIn -F --binary-files=without-match ${glob} -- ${shellQuote(query)} "$target_real" 2>/dev/null | head -n ${maxResults}; fi`;
    const result = await this.#remote(command, { signal, operationId });
    const matches = result.stdout.split(/\r?\n/u).map((value) => value.trimEnd()).filter(Boolean).slice(0, maxResults);
    return { operation: 'search', relative_path: path.relativePath, query, matches, truncated: matches.length >= maxResults };
  }

  async #hash(payload, signal, operationId) {
    const path = this.#remotePath(payload.path, { allowRoot: false });
    // Hash and byte count are collected remotely so binary artifacts never
    // pass through a UTF-8 conversion on the cloud side.
    const result = await this.#remote(
      `if [ -f ${shellQuote(path.full)} ]; then ${this.#remoteGuard(path.full)} && sha256sum -- "$target_real" | cut -d' ' -f1; wc -c < "$target_real"; else exit 1; fi`,
      { signal, operationId },
    );
    const lines = result.stdout.split(/\r?\n/u).map((value) => value.trim()).filter(Boolean);
    const sha256 = lines[0] ?? '';
    const bytes = Number(lines[1]);
    if (!/^[a-f0-9]{64}$/u.test(sha256) || !Number.isSafeInteger(bytes) || bytes < 0) {
      fail('remote_hash_invalid', 'remote artifact hash response was invalid');
    }
    return { operation: 'hash', relative_path: path.relativePath, sha256, bytes };
  }

  async #probe(payload, signal, operationId) {
    const path = this.#remotePath(payload.path ?? '.', { allowRoot: true });
    if (payload.require_write !== undefined && typeof payload.require_write !== 'boolean') {
      fail('probe_invalid', 'workspace.probe require_write must be a boolean');
    }
    if (payload.require_executable !== undefined && typeof payload.require_executable !== 'boolean') {
      fail('probe_invalid', 'workspace.probe require_executable must be a boolean');
    }
    const expected = payload.expect ?? 'directory';
    if (!['directory', 'file'].includes(expected)) {
      fail('probe_invalid', 'workspace.probe expect must be directory or file');
    }
    const requireWrite = payload.require_write === true;
    // This is deliberately a separate operation from workspace.list.  A list
    // treats a missing directory as an empty early-phase result, while a
    // preflight probe must distinguish an unreachable/missing SSH workspace
    // from a reachable empty one.  The registered path has already passed the
    // local relative-path boundary; realpath and the case guard close the
    // symlink/escape race on the remote host.
    const root = shellQuote(this.remoteRoot);
    const target = shellQuote(path.full);
    let command = [
      `root_real=$(realpath -e -- ${root}) || exit 94`,
      `target_real=$(realpath -e -- ${target}) || exit 94`,
      `case "$target_real" in "$root_real"|"$root_real"/*) ;; *) exit 94 ;; esac`,
      expected === 'directory' ? `[ -d "$target_real" ] || exit 95` : `[ -f "$target_real" ] || exit 98`,
      `[ -r "$target_real" ] || exit 96`,
      requireWrite ? `[ -w "$target_real" ] || exit 97` : ':',
    ].join('; ');
    const requireExecutable = payload.require_executable === true;
    if (requireExecutable) command += '; [ -x "$target_real" ] || exit 99';
    await this.#remote(command, { signal, operationId });
    return {
      operation: 'probe',
      relative_path: path.relativePath,
      kind: expected,
      reachable: true,
      readable: true,
      writable: requireWrite ? true : null,
      executable: requireExecutable ? true : null,
    };
  }

  async #readBinary(payload, signal, operationId) {
    const path = this.#remotePath(payload.path, { allowRoot: false });
    // Keep the raw file on the code host. Base64 is bounded and transport-safe
    // for JSONL/HTTP while preserving every byte for the authenticated download
    // route; files over the normal artifact limit are refused before encoding.
    const command = `if [ -f ${shellQuote(path.full)} ]; then ${this.#remoteGuard(path.full)} && size=$(wc -c < "$target_real"); [ "$size" -le ${MAX_CONTENT_BYTES} ] || exit 90; base64 < "$target_real" | tr -d '\\n'; else exit 1; fi`;
    const result = await this.#remote(command, { signal, operationId });
    const encoded = result.stdout.trim();
    if (encoded.length === 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)) {
      fail('remote_binary_invalid', 'remote binary response was not valid base64');
    }
    const bytes = Buffer.from(encoded, 'base64');
    return {
      operation: 'read_binary',
      relative_path: path.relativePath,
      content_base64: encoded,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }

  async #diff(payload, signal, operationId) {
    const path = payload.path ? this.#remotePath(payload.path, { allowRoot: true }) : null;
    const suffix = path ? ` -- ${shellQuote(path.full)}` : '';
    const guard = path ? this.#remoteGuard(path.full) : `${this.#remoteGuard(this.remoteRoot)}`;
    const result = await this.#remote(`${guard} && cd "$root_real" && git diff --no-ext-diff${suffix}`, { signal, operationId });
    return { operation: 'diff', relative_path: path?.relativePath ?? '', diff: result.stdout, sha256: digest(result.stdout) };
  }

  async #profile(payload, signal, operationId) {
    const id = boundedText(payload.profile_id, 'profile_id', 64);
    const profile = this.profiles.get(id);
    if (!profile) fail('profile_not_allowed', `profile ${id} is not registered`, { profile_id: id });
    const variables = payload.variables ?? {};
    if (!variables || typeof variables !== 'object' || Array.isArray(variables)) fail('variables_invalid', 'profile variables must be an object');
    const args = [];
    for (let index = 0; index < profile.args.length; index += 1) {
      const raw = profile.args[index];
      // Model selection is optional in the DSH UI. A registered profile may
      // express it as the conventional `--model {{model}}` pair; remove both
      // argv items when the run intentionally uses the CLI default instead of
      // passing an empty model id that many CLIs reject.
      const modelBlank = Object.hasOwn(variables, 'model')
        && (variables.model === null || variables.model === undefined || String(variables.model) === '');
      if (modelBlank && raw === '--model' && profile.args[index + 1]?.includes('{{model}}')) {
        index += 1;
        continue;
      }
      const optionalPair = /^--[A-Za-z0-9][A-Za-z0-9_.-]*$/u.test(raw)
        && /^\{\{([a-zA-Z0-9_.-]+)\}\}$/u.exec(profile.args[index + 1] ?? '');
      if (optionalPair && (variables[optionalPair[1]] === null
          || variables[optionalPair[1]] === undefined
          || String(variables[optionalPair[1]]) === '')) {
        index += 1;
        continue;
      }
      if (modelBlank && raw.includes('{{model}}') && raw.startsWith('--model=')) continue;
      const expanded = raw.replaceAll(/\{\{([a-zA-Z0-9_.-]+)\}\}/gu, (match, key) => {
        if (!(key in variables)) fail('profile_variable_missing', `profile ${id} requires variable ${key}`, { profile_id: id, variable: key });
        return String(variables[key]);
      });
      if (modelBlank && raw === '{{model}}') continue;
      args.push(expanded);
    }
    const command = `${shellQuote(profile.command)}${args.length > 0 ? ` ${args.map(shellQuote).join(' ')}` : ''}`;
    const lock = profile.resource_lock && this.resourceLocks
      ? await this.resourceLocks.acquire({
          resourceKey: `${this.remoteRoot}:${profile.resource_lock}`,
          runId: this.authorityContext.cloud_run_id ?? operationId,
          attemptId: operationId,
          metadata: { profile_id: id, authority_run_id: this.authorityContext.authority_run_id ?? null },
        })
      : null;
    try {
      const result = await this.#remote(`${this.#remoteGuard(this.remoteRoot)} && cd "$root_real" && ${command}`, {
        signal, operationId, privateInvocation: true,
      });
      return { operation: 'exec_profile', profile_id: id, exit_code: result.exitCode, stdout: result.stdout, stderr: result.stderr, capabilities: profile.capabilities };
    } finally {
      await lock?.release();
    }
  }

  async #cancel(envelope) {
    const target = boundedText(envelope.payload?.target_operation_id, 'target_operation_id', 256);
    const active = this.active.get(target);
    if (!active) {
      const supervisorResult = this.processSupervisor?.cancel ? await this.processSupervisor.cancel(target) : null;
      return {
        operation_id: envelope.operation_id,
        status: 'completed',
        result: {
          target_operation_id: target,
          status: supervisorResult?.status ?? 'not_running',
          operation_ids: supervisorResult?.operation_ids ?? [],
        },
      };
    }
    active.controller.abort();
    return { operation_id: envelope.operation_id, status: 'completed', result: { target_operation_id: target, status: 'cancellation_requested' } };
  }

  #error(error) {
    return { code: error?.code ?? 'connector_error', message: error?.message ?? String(error), details: error?.details ?? {} };
  }

  #ensureJournalSchema() {
    this.journalDb.exec(`
      CREATE TABLE IF NOT EXISTS gateway_operation_journal (
        operation_id TEXT PRIMARY KEY,
        fingerprint TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('running', 'completed', 'failed')),
        outcome_json TEXT,
        error_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    this.journalDb.exec('CREATE INDEX IF NOT EXISTS gateway_operation_journal_updated ON gateway_operation_journal(updated_at)');
  }

  #journalLookup(operationId, fingerprint) {
    if (!this.journalDb) return null;
    const row = this.journalDb.prepare('SELECT * FROM gateway_operation_journal WHERE operation_id = ?').get(operationId);
    if (!row) return null;
    if (row.fingerprint !== fingerprint) fail('operation_replay_conflict', `operation ${operationId} was reused with different input`);
    let outcome = null;
    let error = null;
    try {
      if (row.outcome_json) outcome = JSON.parse(row.outcome_json);
      if (row.error_json) error = JSON.parse(row.error_json);
    } catch (cause) {
      fail('operation_journal_corrupt', `persisted journal entry ${operationId} is not valid JSON`, { cause: cause.message });
    }
    return { state: row.state, outcome, error };
  }

  #journalReserve(operationId, fingerprint) {
    if (!this.journalDb) return;
    const timestamp = new Date().toISOString();
    try {
      this.journalDb.prepare(`
        INSERT INTO gateway_operation_journal(operation_id, fingerprint, state, created_at, updated_at)
        VALUES (?, ?, 'running', ?, ?)
      `).run(operationId, fingerprint, timestamp, timestamp);
    } catch (error) {
      // Another Gateway process may have won the insert between the lookup and
      // this reservation. Re-read it and fail closed; execute() will replay it
      // on the caller's next request instead of starting a duplicate command.
      if (!String(error?.message ?? '').toLowerCase().includes('constraint')) throw error;
      const existing = this.journalDb.prepare('SELECT state FROM gateway_operation_journal WHERE operation_id = ?').get(operationId);
      if (existing) fail('operation_in_progress', `operation ${operationId} is already reserved by another gateway process`);
      throw error;
    }
  }

  #journalComplete(operationId, outcome) {
    if (!this.journalDb) return;
    let serialized;
    try { serialized = JSON.stringify(outcome); } catch (error) {
      throw new WorkspaceConnectorError('operation_result_not_durable', `operation ${operationId} result is not JSON serializable`, { cause: error.message });
    }
    if (Buffer.byteLength(serialized, 'utf8') > 16 * 1024 * 1024) {
      throw new WorkspaceConnectorError('operation_result_not_durable', `operation ${operationId} result exceeds the journal limit`);
    }
    this.journalDb.prepare(`
      UPDATE gateway_operation_journal SET state = 'completed', outcome_json = ?, error_json = NULL, updated_at = ?
      WHERE operation_id = ? AND state = 'running'
    `).run(serialized, new Date().toISOString(), operationId);
  }

  #journalFailure(operationId, diagnostic) {
    if (!this.journalDb) return;
    const serialized = JSON.stringify(diagnostic);
    this.journalDb.prepare(`
      UPDATE gateway_operation_journal SET state = 'failed', outcome_json = NULL, error_json = ?, updated_at = ?
      WHERE operation_id = ? AND state = 'running'
    `).run(serialized, new Date().toISOString(), operationId);
  }

  #restoreError(diagnostic) {
    const error = new WorkspaceConnectorError(
      diagnostic?.code ?? 'connector_error',
      diagnostic?.message ?? 'persisted gateway operation failed',
      diagnostic?.details ?? {},
    );
    return error;
  }

  #trimJournal() {
    while (this.journal.size > this.journalLimit) {
      const first = this.journal.keys().next().value;
      const record = this.journal.get(first);
      if (record?.promise) break;
      this.journal.delete(first);
    }
    if (this.journalDb) {
      this.journalDb.prepare(`
        DELETE FROM gateway_operation_journal
        WHERE operation_id IN (
          SELECT operation_id FROM gateway_operation_journal
          WHERE state != 'running'
          ORDER BY updated_at ASC
          LIMIT MAX(0, (SELECT COUNT(*) FROM gateway_operation_journal WHERE state != 'running') - ?)
        )
      `).run(this.journalLimit);
    }
  }
}

export { DEFAULT_PROFILES, OPERATION_KINDS, defaultCommandRunner };
