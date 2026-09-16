import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { chmod, mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { prepareCommandInvocation, resolveCommandPath } from './command.js';

const execFile = promisify(execFileCallback);

function commandPath(command, env) {
  return resolveCommandPath(command, env);
}

async function probe(name, command, env) {
  if (command.includes('/') && !existsSync(command)) {
    return { name, status: 'missing', available: false, dispatchable: false, command, path: null, version: null };
  }
  try {
    const invocation = prepareCommandInvocation(command, ['--version'], { env });
    const result = await execFile(invocation.command, invocation.args, {
      env: invocation.env,
      shell: invocation.shell,
      timeout: 5000,
      maxBuffer: 16 * 1024,
    });
    const version = `${result.stdout || result.stderr}`.trim().split(/\r?\n/)[0] || null;
    return { name, status: 'available', available: true, dispatchable: true, command, path: commandPath(command, env), version };
  } catch (error) {
    return {
      name,
      status: error.code === 'ENOENT' ? 'missing' : 'probe_failed',
      available: false,
      dispatchable: false,
      command,
      path: commandPath(command, env),
      version: null,
      reason: error.code === 'ENOENT' ? 'executable not found' : 'version probe failed',
    };
  }
}

export async function probeLocalAgent(name, command, { env = process.env } = {}) {
  return probe(name, command, env);
}

const SETTINGS_SCHEMA_VERSION = 1;
const MAX_MODEL_LENGTH = 256;
const MAX_CUSTOM_ARGS = 64;
const MAX_CUSTOM_ARG_LENGTH = 4096;
const KNOWN_AGENT_IDS = new Set(['claude-code', 'opencode', 'codex', 'cursor', 'trae', 'custom']);
const DISPATCHABLE_LOCAL_AGENTS = new Set(['claude_code', 'opencode', 'codex']);

function settingsError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function text(value, field, max) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max || /[\0\r\n]/u.test(value)) {
    throw settingsError('agent_settings_invalid', `${field} must be a bounded non-empty string`, { field, max });
  }
  return value.trim();
}

function model(value) {
  if (value === undefined || value === null || value === '') return null;
  return text(value, 'model', MAX_MODEL_LENGTH);
}

export function canonicalAgentId(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLocaleLowerCase().replaceAll('_', '-');
  const aliases = {
    claude: 'claude-code',
    'claude-code': 'claude-code',
    opencode: 'opencode',
    codex: 'codex',
    cursor: 'cursor',
    'cursor-agent': 'cursor',
    trae: 'trae',
    custom: 'custom',
  };
  if (aliases[normalized]) return aliases[normalized];
  if (/^[a-z][a-z0-9-]{0,63}$/u.test(normalized)) return normalized;
  return null;
}

function normalizeCustom(value) {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw settingsError('custom_agent_invalid', 'custom agent must be an object');
  }
  let command;
  try {
    command = text(value.command, 'custom.command', 512);
  } catch (error) {
    throw settingsError('custom_agent_invalid', error.message, { field: 'custom.command' });
  }
  if (/[;&|`$<>]/u.test(command) || /\s/u.test(command)) {
    throw settingsError('custom_agent_invalid', 'custom.command must be one executable, without shell syntax');
  }
  const args = value.args ?? [];
  if (!Array.isArray(args) || args.length > MAX_CUSTOM_ARGS || args.some((arg) => typeof arg !== 'string' || arg.length > MAX_CUSTOM_ARG_LENGTH || /[\0\r\n]/u.test(arg))) {
    throw settingsError('custom_agent_invalid', 'custom.args are invalid', { max_args: MAX_CUSTOM_ARGS });
  }
  const protocol = value.protocol ?? 'argv';
  if (protocol !== 'argv') throw settingsError('custom_agent_invalid', 'only the argv custom agent protocol is supported');
  return { name: text(value.name ?? 'Custom CodeAgent', 'custom.name', 128), command, args: [...args], protocol };
}

function normalizeSelected(value) {
  const selected = canonicalAgentId(value);
  if (!selected || (!KNOWN_AGENT_IDS.has(selected) && !/^[a-z][a-z0-9-]{0,63}$/u.test(selected))) {
    throw settingsError('agent_settings_invalid', 'selected CodeAgent id is invalid', { selected: value });
  }
  return selected;
}

function sanitizeSettings(value, defaults = {}) {
  const selected = normalizeSelected(value?.selected ?? defaults.selected ?? 'claude-code');
  const custom = normalizeCustom(value?.custom ?? defaults.custom ?? null);
  if (selected === 'custom' && !custom) throw settingsError('custom_agent_invalid', 'custom CodeAgent configuration is required');
  return {
    schema_version: SETTINGS_SCHEMA_VERSION,
    selected,
    model: model(value?.model ?? defaults.model ?? null),
    custom,
    updated_at: typeof value?.updated_at === 'string' ? value.updated_at : (defaults.updated_at ?? null),
  };
}

/**
 * Persisted local-only CodeAgent selection. Credentials intentionally do not
 * belong here; each CLI/provider reads its own credential store at execution
 * time. The file is an operational preference, not an authority record.
 */
export class LocalCodeAgentSettings {
  constructor({ settingsFile, defaultSelected = 'claude-code' } = {}) {
    if (typeof settingsFile !== 'string' || !isAbsolute(settingsFile)) {
      throw settingsError('agent_settings_path_invalid', 'settingsFile must be an absolute path');
    }
    this.settingsFile = resolve(settingsFile);
    this.loadError = null;
    this.value = sanitizeSettings({ selected: defaultSelected });
    this.#load();
  }

  snapshot() {
    return {
      ...structuredClone(this.value),
      ...(this.loadError ? { load_error: this.loadError } : {}),
    };
  }

  async update(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw settingsError('agent_settings_invalid', 'settings body must be an object');
    }
    if (Object.hasOwn(input, 'api_key') || Object.hasOwn(input, 'token') || Object.hasOwn(input, 'secret')) {
      throw settingsError('settings_secret_forbidden', 'credentials are not accepted by local CodeAgent settings');
    }
    const next = sanitizeSettings({
      selected: input.selected ?? this.value.selected,
      model: Object.hasOwn(input, 'model') ? input.model : this.value.model,
      custom: input.custom === undefined ? this.value.custom : input.custom,
      updated_at: new Date().toISOString(),
    });
    next.updated_at = new Date().toISOString();
    this.value = next;
    this.loadError = null;
    await this.#persist();
    return this.snapshot();
  }

  #load() {
    if (!existsSync(this.settingsFile)) return;
    try {
      const parsed = JSON.parse(readFileSync(this.settingsFile, 'utf8'));
      if (parsed?.schema_version !== SETTINGS_SCHEMA_VERSION) throw new Error('unsupported settings schema');
      this.value = sanitizeSettings(parsed);
    } catch (error) {
      this.loadError = `persisted settings ignored: ${error.message}`;
    }
  }

  async #persist() {
    const parent = dirname(this.settingsFile);
    await mkdir(parent, { recursive: true, mode: 0o700 });
    const temporary = `${this.settingsFile}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(this.value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await chmod(temporary, 0o600);
      await rename(temporary, this.settingsFile);
      await chmod(this.settingsFile, 0o600);
    } catch (error) {
      try { await rename(temporary, `${temporary}.failed`); } catch { /* best effort cleanup */ }
      throw settingsError('agent_settings_persist_failed', `could not persist CodeAgent settings: ${error.message}`);
    }
  }
}

export async function probeLocalAgents({ env = process.env } = {}) {
  // Prefer an explicit override or PATH.  The WSL path is only a convenience
  // fallback for the development image; hard-coding it on a native Windows
  // Connector would hide a valid `claude` installation from discovery.
  const claudeCommand = env.DSH_CLAUDE_CLI
    || (process.platform === 'linux' && existsSync('/mnt/c/Users/mgces/AppData/Roaming/npm/claude')
      ? '/mnt/c/Users/mgces/AppData/Roaming/npm/claude' : 'claude');
  const definitions = [
    ['claude_code', claudeCommand],
    ['opencode', env.DSH_OPENCODE_CLI || 'opencode'],
    ['codex', env.DSH_CODEX_CLI || 'codex'],
    ['cursor', env.DSH_CURSOR_CLI || 'cursor-agent'],
    ['trae', env.DSH_TRAE_CLI || 'trae'],
  ];
  const entries = await Promise.all(definitions.map(async ([name, command]) => {
    const result = await probe(name, command, env);
    const dispatchable = result.available === true && DISPATCHABLE_LOCAL_AGENTS.has(name);
    return [name, {
      ...result,
      dispatchable,
      ...(result.available === true && !dispatchable
        ? { reason: 'local execution adapter is not installed' }
        : {}),
    }];
  }));
  return Object.fromEntries(entries);
}
