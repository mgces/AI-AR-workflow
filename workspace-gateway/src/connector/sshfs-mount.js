import { spawn as nodeSpawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdir, readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { posix } from 'node:path';

const MAX_COMMAND_LENGTH = 512;
const MAX_OPTION_LENGTH = 512;
const DEFAULT_TIMEOUT_MS = 30_000;

export class SshfsMountError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SshfsMountError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new SshfsMountError(code, message, details);
}

function text(value, field, max = MAX_COMMAND_LENGTH) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max || /[\0\r\n]/u.test(value)) {
    fail('sshfs_config_invalid', `${field} is invalid`, { field });
  }
  return value.trim();
}

function optionalPath(value, field) {
  if (value === null || value === undefined || value === '') return null;
  const path = text(value, field, 4096);
  if (!isAbsolute(path)) fail('sshfs_config_invalid', `${field} must be an absolute path`, { field });
  return resolve(path);
}

function normalizeRemoteRoot(value) {
  const root = text(value, 'remote_root', 4096);
  if (!posix.isAbsolute(root) || root.includes('\\')) {
    fail('sshfs_config_invalid', 'remote_root must be an absolute POSIX path', { field: 'remote_root' });
  }
  return posix.normalize(root);
}

function command(value, field, fallback) {
  const result = value === null || value === undefined || value === '' ? fallback : text(value, field);
  if (result.includes('/') || result.includes('\\')) {
    // Absolute commands are useful on locked-down WSL hosts. Relative names
    // are resolved by PATH, but shell metacharacters are never accepted.
    if (!isAbsolute(result)) fail('sshfs_config_invalid', `${field} must be a command name or absolute path`, { field });
  }
  return result;
}

function option(value) {
  const item = text(value, 'sshfs_option', MAX_OPTION_LENGTH);
  if (/[;&|`$<>]/u.test(item)) fail('sshfs_config_invalid', 'sshfs options cannot contain shell syntax', { field: 'sshfs_option' });
  return item;
}

function mountInfoPath(value) {
  // Linux mountinfo escapes spaces and backslashes. Decode only the two
  // escapes needed to compare the configured mount point.
  return String(value).replaceAll('\\040', ' ').replaceAll('\\011', '\t').replaceAll('\\134', '\\');
}

/**
 * Controlled SSHFS lifecycle for the local Connector.
 *
 * The manager is intentionally small: it only creates a configured mount
 * point and invokes sshfs/fusermount with an argv array. It does not accept a
 * remote command, arbitrary shell text, or an SSH URL from a browser request.
 * The Connector still performs its own realpath/read/write checks after the
 * mount is ready.
 */
export class SshfsMountManager {
  constructor({
    host,
    username = null,
    port = 22,
    remoteRoot,
    mountPoint,
    sshfsCommand = 'sshfs',
    unmountCommand = 'fusermount3',
    identityFile = null,
    knownHostsFile = null,
    options = [],
    timeoutMs = DEFAULT_TIMEOUT_MS,
    spawnImpl = nodeSpawn,
    mountInfoReader = () => readFile('/proc/self/mountinfo', 'utf8'),
  } = {}) {
    this.host = text(host, 'host');
    this.username = username === null || username === undefined || username === '' ? null : text(username, 'username', 256);
    if (!Number.isInteger(port) || port < 1 || port > 65535) fail('sshfs_config_invalid', 'port must be between 1 and 65535', { field: 'port' });
    this.port = port;
    this.remoteRoot = normalizeRemoteRoot(remoteRoot);
    this.mountPoint = optionalPath(mountPoint, 'mount_point');
    if (!this.mountPoint) fail('sshfs_config_invalid', 'mount_point is required', { field: 'mount_point' });
    this.sshfsCommand = command(sshfsCommand, 'sshfs_command', 'sshfs');
    this.unmountCommand = command(unmountCommand, 'unmount_command', 'fusermount3');
    this.identityFile = optionalPath(identityFile, 'identity_file');
    this.knownHostsFile = optionalPath(knownHostsFile, 'known_hosts_file');
    if (!Array.isArray(options) || options.length > 16) fail('sshfs_config_invalid', 'options must contain at most 16 strings', { field: 'options' });
    this.options = options.map(option);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10 * 60 * 1000) fail('sshfs_config_invalid', 'timeout_ms is invalid', { field: 'timeout_ms' });
    if (typeof spawnImpl !== 'function') throw new TypeError('spawnImpl must be a function');
    if (typeof mountInfoReader !== 'function') throw new TypeError('mountInfoReader must be a function');
    this.timeoutMs = timeoutMs;
    this.spawnImpl = spawnImpl;
    this.mountInfoReader = mountInfoReader;
    this.started = false;
  }

  target() {
    return `${this.username ? `${this.username}@` : ''}${this.host}:${this.remoteRoot}`;
  }

  sshfsArgs() {
    const args = [this.target(), this.mountPoint, '-p', String(this.port), '-o', 'StrictHostKeyChecking=yes'];
    if (this.identityFile) args.push('-o', `IdentityFile=${this.identityFile}`);
    if (this.knownHostsFile) args.push('-o', `UserKnownHostsFile=${this.knownHostsFile}`);
    for (const item of this.options) args.push('-o', item);
    return args;
  }

  unmountArgs() {
    return ['-u', this.mountPoint];
  }

  async isMounted() {
    try {
      const content = await this.mountInfoReader();
      return String(content).split('\n').some((line) => {
        const separator = line.indexOf(' - ');
        const fields = (separator >= 0 ? line.slice(0, separator) : line).split(' ');
        return fields.length > 4 && mountInfoPath(fields[4]) === this.mountPoint;
      });
    } catch (error) {
      // A non-Linux host may not expose mountinfo. The subsequent stat/access
      // check still gives a useful diagnostic, but auto-mount reports that the
      // kernel mount state could not be proven.
      if (error?.code === 'ENOENT' || error?.code === 'ENOTSUP') return false;
      throw new SshfsMountError('sshfs_mount_probe_failed', 'could not inspect Linux mount state', { cause: error?.message ?? String(error) });
    }
  }

  async mount({ signal } = {}) {
    if (await this.isMounted()) return { mounted: true, started: false, mount_point: this.mountPoint, remote_root: this.remoteRoot };
    await mkdir(this.mountPoint, { recursive: true, mode: 0o700 });
    const result = await this.#run(this.sshfsCommand, this.sshfsArgs(), { signal });
    if (result.exitCode !== 0) {
      throw new SshfsMountError('sshfs_mount_failed', `sshfs exited with ${result.exitCode ?? result.signal ?? 'unknown'}`, {
        exit_code: result.exitCode ?? null, signal: result.signal ?? null, stderr: result.stderr.slice(-4096),
      });
    }
    const mounted = await this.isMounted();
    if (!mounted) throw new SshfsMountError('sshfs_mount_unverified', 'sshfs returned successfully but the mount could not be verified', { mount_point: this.mountPoint });
    this.started = true;
    return { mounted: true, started: true, mount_point: this.mountPoint, remote_root: this.remoteRoot };
  }

  async ensureMounted(options = {}) {
    return this.mount(options);
  }

  async unmount({ signal } = {}) {
    if (!(await this.isMounted())) {
      this.started = false;
      return { mounted: false, unmounted: false, mount_point: this.mountPoint };
    }
    const result = await this.#run(this.unmountCommand, this.unmountArgs(), { signal });
    if (result.exitCode !== 0) {
      throw new SshfsMountError('sshfs_unmount_failed', `unmount exited with ${result.exitCode ?? result.signal ?? 'unknown'}`, {
        exit_code: result.exitCode ?? null, signal: result.signal ?? null, stderr: result.stderr.slice(-4096),
      });
    }
    const mounted = await this.isMounted();
    if (mounted) throw new SshfsMountError('sshfs_unmount_unverified', 'unmount returned successfully but the mount remains active', { mount_point: this.mountPoint });
    this.started = false;
    return { mounted: false, unmounted: true, mount_point: this.mountPoint };
  }

  async status() {
    const mounted = await this.isMounted();
    let writable = false;
    let exists = false;
    let reason = null;
    try {
      const root = await realpath(this.mountPoint);
      const info = await stat(root);
      exists = info.isDirectory();
      if (exists) {
        try { await access(root, constants.R_OK | constants.W_OK | constants.X_OK); writable = true; }
        catch { reason = 'mount_point_not_readable_or_writable'; }
      } else reason = 'mount_point_not_directory';
    } catch (error) {
      reason = error?.code === 'ENOENT' ? 'mount_point_not_found' : 'mount_point_probe_failed';
    }
    return { mounted, exists, writable, mount_point: this.mountPoint, remote_root: this.remoteRoot, reason };
  }

  #run(commandName, args, { signal } = {}) {
    return new Promise((resolveResult, reject) => {
      let child;
      try {
        child = this.spawnImpl(commandName, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (error) {
        reject(new SshfsMountError('sshfs_spawn_failed', error?.message ?? String(error), { command: commandName }));
        return;
      }
      const stdout = [];
      const stderr = [];
      let settled = false;
      let timedOut = false;
      let aborted = false;
      const finish = (value, error = null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        if (error) reject(error);
        else resolveResult({ ...value, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), timedOut, aborted });
      };
      const stop = () => { try { child.kill('SIGTERM'); } catch { /* process already exited */ } };
      const onAbort = () => { aborted = true; stop(); };
      const timer = setTimeout(() => { timedOut = true; stop(); }, this.timeoutMs);
      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      }
      child.stdout?.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
      child.stderr?.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
      child.once('error', (error) => finish(null, new SshfsMountError('sshfs_command_failed', error?.message ?? String(error), { command: commandName })));
      child.once('close', (exitCode, signalName) => finish({ exitCode, signal: signalName }));
    });
  }
}
