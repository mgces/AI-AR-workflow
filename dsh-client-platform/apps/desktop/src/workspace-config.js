import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const WSL_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const SSH_ALIAS = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/u;
const SSH_USER = /^[A-Za-z0-9_.-]{1,64}$/u;
const SSH_HOST = /^(?:[A-Za-z0-9][A-Za-z0-9.-]{0,252}|\[[0-9A-Fa-f:.]{2,45}\])$/u;

function decodeWslOutput(output) {
  if (Buffer.isBuffer(output)) {
    let evenNulls = 0;
    let oddNulls = 0;
    for (let index = 0; index < output.length; index += 1) {
      if (output[index] === 0) {
        if (index % 2 === 0) evenNulls += 1;
        else oddNulls += 1;
      }
    }
    return (oddNulls > evenNulls ? output.toString('utf16le') : output.toString('utf8'))
      .replaceAll('\0', '');
  }
  return String(output ?? '').replaceAll('\0', '');
}

export function parseWslDistributionList(output) {
  const names = decodeWslOutput(output)
    .split(/\r?\n/u)
    .map((line) => line.trim().replace(/^\*\s*/u, ''))
    .filter((name) => WSL_NAME.test(name));
  return [...new Set(names)];
}

export async function discoverWslDistributions({
  platform = process.platform,
  execFileImpl = execFile,
} = {}) {
  if (platform !== 'win32') return { status: 'unsupported_platform', distributions: [] };
  try {
    const result = await execFileImpl('wsl.exe', ['--list', '--quiet'], {
      windowsHide: true,
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
      encoding: 'buffer',
    });
    const distributions = parseWslDistributionList(result?.stdout);
    return {
      status: distributions.length ? 'available' : 'none_found',
      distributions,
    };
  } catch (error) {
    return {
      status: 'probe_failed',
      distributions: [],
      reason: error?.code === 'ENOENT' ? 'wsl_executable_not_found' : 'wsl_list_failed',
    };
  }
}

export function parseSshHostAliases(configText) {
  const aliases = new Set();
  for (const rawLine of String(configText ?? '').split(/\r?\n/u)) {
    const line = rawLine.replace(/\s+#.*$/u, '').trim();
    const match = line.match(/^Host\s+(.+)$/iu);
    if (!match) continue;
    for (const candidate of match[1].split(/\s+/u)) {
      if (SSH_ALIAS.test(candidate) && !candidate.includes('*') && !candidate.includes('?')) aliases.add(candidate);
    }
  }
  return [...aliases].sort((left, right) => left.localeCompare(right));
}

function isValidSshTarget(target) {
  if (typeof target !== 'string' || target !== target.trim() || target.startsWith('-') || /[\s\0\r\n;&|`$<>]/u.test(target)) {
    return false;
  }
  if (SSH_ALIAS.test(target)) return true;
  const separator = target.indexOf('@');
  if (separator <= 0 || separator !== target.lastIndexOf('@')) return false;
  const username = target.slice(0, separator);
  const hostname = target.slice(separator + 1);
  return SSH_USER.test(username) && SSH_HOST.test(hostname) && !hostname.includes('..');
}

function parseSshConfig(stdout) {
  const values = new Map();
  for (const line of String(stdout ?? '').split(/\r?\n/u)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9]*)\s+(.+)$/u);
    if (match && !values.has(match[1].toLowerCase())) values.set(match[1].toLowerCase(), match[2].trim());
  }
  const host = values.get('hostname');
  const username = values.get('user');
  const port = Number(values.get('port'));
  if (!host || /[\0\r\n]/u.test(host) || !username || !SSH_USER.test(username)
      || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw Object.assign(new Error('OpenSSH returned an incomplete target configuration'), { code: 'ssh_target_invalid' });
  }
  return { host, username, port };
}

export async function validateSshTarget(target, {
  platform = process.platform,
  execFileImpl = execFile,
} = {}) {
  if (!isValidSshTarget(target)) {
    throw Object.assign(new Error('SSH target must be an OpenSSH Host alias or user@host'), { code: 'ssh_target_invalid' });
  }
  try {
    const result = await execFileImpl(platform === 'win32' ? 'ssh.exe' : 'ssh', ['-G', '--', target], {
      windowsHide: true,
      timeout: 10_000,
      maxBuffer: 256 * 1024,
      encoding: 'utf8',
    });
    const resolved = parseSshConfig(result?.stdout);
    return { target, host: resolved.host, username: resolved.username, port: resolved.port };
  } catch (error) {
    if (error?.code === 'ssh_target_invalid') throw error;
    throw Object.assign(new Error('OpenSSH could not resolve this target from the current Windows SSH configuration'), {
      code: 'ssh_target_unresolved',
      details: { target, process_error: error?.code ?? 'ssh_failed' },
    });
  }
}
