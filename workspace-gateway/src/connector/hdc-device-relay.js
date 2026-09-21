import { spawn as nodeSpawn, execFile as nodeExecFile } from 'node:child_process';
import { createConnection } from 'node:net';
import { isAbsolute } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(nodeExecFile);
const LOOPBACK = '127.0.0.1';
const DEFAULT_SERVER_PORT = 8710;
const DEFAULT_REMOTE_PORT = 18_710;

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function command(value, name, fallback) {
  const selected = value === undefined || value === null || value === '' ? fallback : value;
  if (typeof selected !== 'string' || selected.trim() === '' || selected.length > 4096
      || /[\0\r\n]/u.test(selected)) fail('hdc_relay_config_invalid', `${name} is invalid`);
  return selected.trim();
}

function optionalPath(value, name) {
  if (value === undefined || value === null || value === '') return null;
  const result = command(value, name, null);
  if (!isAbsolute(result)) fail('hdc_relay_config_invalid', `${name} must be absolute`);
  return result;
}

function endpoint(port) {
  return `${LOOPBACK}:${port}`;
}

function configuredServerPort(env) {
  const raw = env?.OHOS_HDC_SERVER_PORT;
  if (raw === undefined || raw === '') return DEFAULT_SERVER_PORT;
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65_535) {
    fail('hdc_relay_config_invalid', 'OHOS_HDC_SERVER_PORT must be between 1024 and 65535');
  }
  return port;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tcpListenerOpen(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let settled = false;
    const finish = (open) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(open);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

/**
 * Optional reverse SSH forward for a locally attached HDC device. HDC allows
 * one server process per runtime, so reuse the configured loopback server when
 * it is already running and only own a foreground server when its port is free.
 * The SSH server receives a loopback-only port for fixed Gateway profiles.
 */
export class HdcDeviceRelay {
  constructor({
    enabled = false,
    host,
    username = null,
    port = 22,
    identityFile = null,
    knownHostsFile = null,
    hdcCommand = 'hdc',
    sshCommand = 'ssh',
    localPort = null,
    remotePort = DEFAULT_REMOTE_PORT,
    startupDelayMs = 250,
    commandTimeoutMs = 5000,
    spawnImpl = nodeSpawn,
    execFileImpl = execFile,
    portProbeImpl = tcpListenerOpen,
    env = process.env,
  } = {}) {
    if (typeof enabled !== 'boolean') fail('hdc_relay_config_invalid', 'enabled must be a boolean');
    this.enabled = enabled;
    if (enabled) {
      if (typeof host !== 'string' || host.trim() === '' || host.length > 255 || /[\0\r\n\s]/u.test(host)) {
        fail('hdc_relay_config_invalid', 'host is required and must be a hostname or IP address');
      }
      if (username !== null && (typeof username !== 'string' || username.trim() === '' || username.length > 256 || /[\0\r\n\s]/u.test(username))) {
        fail('hdc_relay_config_invalid', 'username is invalid');
      }
      if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) fail('hdc_relay_config_invalid', 'port is invalid');
      const selectedLocalPort = localPort === null || localPort === undefined
        ? configuredServerPort(env) : localPort;
      if (!Number.isSafeInteger(selectedLocalPort) || selectedLocalPort < 1024 || selectedLocalPort > 65_535) {
        fail('hdc_relay_config_invalid', 'localPort must be between 1024 and 65535');
      }
      if (!Number.isSafeInteger(remotePort) || remotePort < 1024 || remotePort > 65_535) {
        fail('hdc_relay_config_invalid', 'remotePort must be between 1024 and 65535');
      }
      if (!Number.isSafeInteger(startupDelayMs) || startupDelayMs < 0 || startupDelayMs > 5000) {
        fail('hdc_relay_config_invalid', 'startupDelayMs is invalid');
      }
      if (!Number.isSafeInteger(commandTimeoutMs) || commandTimeoutMs < 100 || commandTimeoutMs > 30_000) {
        fail('hdc_relay_config_invalid', 'commandTimeoutMs is invalid');
      }
    }
    if (typeof spawnImpl !== 'function') fail('hdc_relay_config_invalid', 'spawnImpl must be a function');
    if (typeof execFileImpl !== 'function') fail('hdc_relay_config_invalid', 'execFileImpl must be a function');
    if (typeof portProbeImpl !== 'function') fail('hdc_relay_config_invalid', 'portProbeImpl must be a function');
    this.host = enabled ? host.trim() : null;
    this.username = username?.trim() || null;
    this.port = port;
    this.identityFile = optionalPath(identityFile, 'identityFile');
    this.knownHostsFile = optionalPath(knownHostsFile, 'knownHostsFile');
    this.hdcCommand = command(hdcCommand, 'hdcCommand', 'hdc');
    this.sshCommand = command(sshCommand, 'sshCommand', 'ssh');
    this.configuredServerPort = enabled ? configuredServerPort(env) : DEFAULT_SERVER_PORT;
    this.localPort = enabled ? (localPort ?? this.configuredServerPort) : (localPort ?? DEFAULT_SERVER_PORT);
    this.remotePort = remotePort;
    this.startupDelayMs = startupDelayMs;
    this.commandTimeoutMs = commandTimeoutMs;
    this.spawnImpl = spawnImpl;
    this.execFileImpl = execFileImpl;
    this.portProbeImpl = portProbeImpl;
    this.env = env;
    this.serverProcess = null;
    this.tunnelProcess = null;
    this.serverMode = null;
    this.state = enabled ? 'stopped' : 'disabled';
    this.reason = null;
    this.stopping = false;
  }

  hdcProbeArgs() {
    return this.enabled ? ['-s', endpoint(this.localPort), 'list', 'targets'] : ['list', 'targets'];
  }

  sshArgs() {
    if (!this.enabled) return [];
    const args = [
      '-N', '-T',
      '-o', 'BatchMode=yes',
      '-o', 'ExitOnForwardFailure=yes',
      '-o', 'StrictHostKeyChecking=yes',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=3',
      '-R', `${LOOPBACK}:${this.remotePort}:${LOOPBACK}:${this.localPort}`,
    ];
    if (this.identityFile) args.push('-i', this.identityFile);
    if (this.knownHostsFile) args.push('-o', `UserKnownHostsFile=${this.knownHostsFile}`);
    args.push('-p', String(this.port), this.username ? `${this.username}@${this.host}` : this.host);
    return args;
  }

  async start() {
    if (!this.enabled) return this.status();
    if (this.state === 'ready' && this.tunnelProcess?.exitCode === null && this.tunnelProcess?.signalCode === null
        && (!this.serverProcess || (this.serverProcess.exitCode === null && this.serverProcess.signalCode === null))) return this.status();
    this.stopping = false;
    this.state = 'starting';
    this.reason = null;
    try {
      const configuredPort = this.configuredServerPort;
      const configuredPortOpen = configuredPort === this.localPort
        ? false : await this.portProbeImpl(LOOPBACK, configuredPort);
      if (configuredPortOpen) {
        fail('hdc_server_already_running_on_other_port', 'an HDC server is already listening on the configured port; reuse that OHOS_HDC_SERVER_PORT');
      }
      const localServerOpen = await this.portProbeImpl(LOOPBACK, this.localPort);
      if (localServerOpen) {
        this.serverMode = 'reused';
      } else {
        this.serverProcess = await this.#spawn(this.hdcCommand, ['-s', endpoint(this.localPort), '-m'], 'hdc_server_start_failed');
        this.serverMode = 'started';
      }
      await this.#waitForHdcServer();
      this.tunnelProcess = await this.#spawn(this.sshCommand, this.sshArgs(), 'ssh_reverse_forward_failed');
      if (this.startupDelayMs > 0) await delay(this.startupDelayMs);
      if (this.tunnelProcess.exitCode !== null || this.tunnelProcess.signalCode !== null) {
        fail('ssh_reverse_forward_failed', 'reverse SSH forward exited during startup');
      }
      this.state = 'ready';
      return this.status();
    } catch (error) {
      const reason = error?.code === 'ENOENT' ? 'relay_executable_missing'
        : ['hdc_server_start_failed', 'hdc_server_already_running_on_other_port', 'ssh_reverse_forward_failed'].includes(error?.code)
          ? error.code : 'device_relay_start_failed';
      this.stopping = true;
      await this.#stopChild(this.tunnelProcess);
      await this.#stopChild(this.serverProcess);
      this.tunnelProcess = null;
      this.serverProcess = null;
      this.serverMode = null;
      this.stopping = false;
      this.state = 'failed';
      this.reason = reason;
      return this.status();
    }
  }

  async stop() {
    if (!this.enabled) return this.status();
    this.stopping = true;
    await this.#stopChild(this.tunnelProcess);
    await this.#stopChild(this.serverProcess);
    this.tunnelProcess = null;
    this.serverProcess = null;
    this.serverMode = null;
    this.stopping = false;
    this.state = 'stopped';
    this.reason = null;
    return this.status();
  }

  status() {
    if (this.enabled && this.state === 'ready') {
      if (this.serverProcess && (this.serverProcess.exitCode !== null || this.serverProcess.signalCode !== null)) {
        this.state = 'failed';
        this.reason = 'hdc_server_start_failed';
      } else if (this.tunnelProcess?.exitCode !== null || this.tunnelProcess?.signalCode !== null) {
        this.state = 'failed';
        this.reason = 'ssh_reverse_forward_failed';
      }
    }
    return {
      enabled: this.enabled,
      status: this.state,
      ...(this.enabled ? {
        local_endpoint: endpoint(this.localPort), remote_endpoint: endpoint(this.remotePort),
        ...(this.serverMode ? { server_mode: this.serverMode } : {}),
      } : {}),
      ...(this.reason ? { reason: this.reason } : {}),
    };
  }

  async #spawn(commandName, args, failureCode) {
    let child;
    try {
      child = this.spawnImpl(commandName, args, {
        env: this.env,
        shell: false,
        windowsHide: true,
        stdio: 'ignore',
      });
    } catch (error) {
      throw Object.assign(error, { code: error?.code ?? failureCode });
    }
    if (!child || typeof child.once !== 'function' || typeof child.kill !== 'function') {
      fail(failureCode, 'relay process could not be started');
    }
    child.once('close', () => {
      if (this.stopping) return;
      if (child === this.tunnelProcess) {
        this.state = 'failed';
        this.reason = 'ssh_reverse_forward_failed';
      } else if (child === this.serverProcess) {
        this.state = 'failed';
        this.reason = 'hdc_server_start_failed';
      }
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Object.assign(new Error('relay process did not start'), { code: failureCode })), 5000);
      child.once('spawn', () => { clearTimeout(timer); resolve(); });
      child.once('error', (error) => { clearTimeout(timer); reject(Object.assign(error, { code: error?.code ?? failureCode })); });
    });
    return child;
  }

  async #waitForHdcServer() {
    const deadline = Date.now() + this.commandTimeoutMs;
    let lastError = null;
    while (Date.now() < deadline) {
      const timeout = Math.max(100, Math.min(this.commandTimeoutMs, deadline - Date.now()));
      try {
        await this.execFileImpl(this.hdcCommand, this.hdcProbeArgs(), {
          env: this.env, shell: false, timeout, maxBuffer: 64 * 1024,
        });
        return;
      } catch (error) {
        lastError = error;
        if (this.serverProcess && (this.serverProcess.exitCode !== null || this.serverProcess.signalCode !== null)) {
          fail('hdc_server_start_failed', 'the managed HDC server exited before becoming ready');
        }
        await delay(Math.min(this.startupDelayMs || 50, Math.max(0, deadline - Date.now())));
      }
    }
    throw lastError ?? Object.assign(new Error('HDC server did not become ready'), { code: 'hdc_server_start_failed' });
  }

  async #stopChild(child) {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch { /* process may have exited */ }
        resolve();
      }, 1000);
      child.once('close', () => { clearTimeout(timer); resolve(); });
      try { child.kill('SIGTERM'); } catch { clearTimeout(timer); resolve(); }
    });
  }
}
