import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { delimiter, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const STATE_VERSION = 1;
const DEFAULT_SELECTED = 'claude-code';
const MAX_COMMAND_LENGTH = 4096;
const MAX_NAME_LENGTH = 128;
const MAX_MODEL_LENGTH = 256;
const MAX_ARGS = 32;
const MAX_ARG_LENGTH = 4096;

const CLI_DEFAULTS = Object.freeze({
  opencode: 'opencode',
  codex: 'codex',
  cursor: 'cursor-agent',
  trae: 'trae',
});

const BUILTIN_DEFINITIONS = Object.freeze([
  {
    id: 'claude-code',
    name: 'Claude Code',
    kind: 'official-provider',
    provider: 'claude-code',
    tool: 'subagent_claude_code',
    dispatchable: true,
    description: 'DSH 官方 Claude Code 子 Agent，在当前 WSL 工作区执行一次性代码任务。',
    auth: 'Claude Code 原生设置或 provider 环境变量',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    kind: 'local-cli',
    dispatchable: false,
    description: '使用 WSL 中的 OpenCode CLI；命令可通过 DSH_OPENCODE_CLI 覆盖。',
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    kind: 'local-cli',
    dispatchable: false,
    description: '使用 WSL 中的 Codex CLI；命令可通过 DSH_CODEX_CLI 覆盖。',
  },
  {
    id: 'cursor',
    name: 'Cursor Agent',
    kind: 'local-cli',
    dispatchable: false,
    description: '使用 WSL 中的 Cursor Agent CLI；命令可通过 DSH_CURSOR_CLI 覆盖。',
  },
  {
    id: 'trae',
    name: 'Trae CLI',
    kind: 'local-cli',
    dispatchable: false,
    description: '使用 WSL 中的 Trae CLI；命令可通过 DSH_TRAE_CLI 覆盖。',
  },
  {
    id: 'custom',
    name: '自定义 CodeAgent',
    kind: 'custom-cli',
    dispatchable: false,
    description: '填写一个本地命令，作为后续 CodeAgent 适配入口。',
  },
]);

function clone(value) {
  return structuredClone(value);
}

function envCommand(id, env) {
  const key = `DSH_${id.toUpperCase().replaceAll('-', '_')}_CLI`;
  return env[key] || CLI_DEFAULTS[id] || null;
}

function commandPath(command, env) {
  if (!command) return null;
  if (isAbsolute(command) || command.includes('/') || command.includes('\\')) {
    return existsSync(command) ? command : null;
  }
  return String(env.PATH ?? '').split(delimiter)
    .map((root) => join(root, command))
    .find((candidate) => existsSync(candidate)) ?? null;
}

async function probeCli(command, env) {
  const path = commandPath(command, env);
  if (!command) return { available: false, status: 'missing', command: null, path: null, version: null, reason: 'command not configured' };
  if (!path) {
    return { available: false, status: 'missing', command, path: null, version: null, reason: 'executable not found' };
  }
  try {
    const result = await execFile(command, ['--version'], {
      env,
      timeout: 5000,
      maxBuffer: 16 * 1024,
    });
    const version = `${result.stdout || result.stderr}`.trim().split(/\r?\n/u)[0] || null;
    return { available: true, status: 'available', command, path, version, reason: null };
  } catch (error) {
    return {
      available: false,
      status: error.code === 'ENOENT' ? 'missing' : 'probe_failed',
      command,
      path,
      version: null,
      reason: error.code === 'ENOENT' ? 'executable not found' : 'version probe failed',
    };
  }
}

function defaultState() {
  return {
    version: STATE_VERSION,
    selected: DEFAULT_SELECTED,
    custom: {
      name: '自定义 CodeAgent',
      command: '',
      args: [],
      model: '',
    },
  };
}

function validString(value, field, maxLength, { allowEmpty = false } = {}) {
  if (value === undefined && allowEmpty) return '';
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '') || value.length > maxLength) {
    throw Object.assign(new Error(`${field} must be a ${allowEmpty ? 'string' : 'non-empty string'} of at most ${maxLength} characters`), {
      code: 'invalid_codeagent_settings',
      details: { field },
    });
  }
  return value.trim();
}

function normalizeCustom(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Object.assign(new Error('custom must be an object'), { code: 'invalid_codeagent_settings' });
  }
  const args = value.args ?? [];
  if (!Array.isArray(args) || args.length > MAX_ARGS || args.some((arg) => typeof arg !== 'string' || arg.length > MAX_ARG_LENGTH)) {
    throw Object.assign(new Error(`custom.args must contain at most ${MAX_ARGS} string arguments`), {
      code: 'invalid_codeagent_settings',
      details: { field: 'custom.args' },
    });
  }
  return {
    name: validString(value.name ?? '自定义 CodeAgent', 'custom.name', MAX_NAME_LENGTH),
    command: validString(value.command ?? '', 'custom.command', MAX_COMMAND_LENGTH, { allowEmpty: true }),
    args: args.map((arg) => arg.trim()),
    model: validString(value.model ?? '', 'custom.model', MAX_MODEL_LENGTH, { allowEmpty: true }),
  };
}

function normalizeState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultState();
  const state = defaultState();
  if (typeof value.selected === 'string' && BUILTIN_DEFINITIONS.some((item) => item.id === value.selected)) {
    state.selected = value.selected;
  }
  try {
    state.custom = normalizeCustom(value.custom);
  } catch {
    // A corrupted optional custom row must not hide the built-in selector.
  }
  return state;
}

function formatDefinition(definition, probe, custom) {
  return {
    ...definition,
    ...(definition.id === 'custom'
      ? {
          name: custom.name,
          command: custom.command,
          args: [...custom.args],
          model: custom.model || null,
          available: custom.command.length > 0 ? null : false,
          status: custom.command.length > 0 ? 'configured' : 'not_configured',
          version: null,
          reason: custom.command.length > 0 ? 'custom command is not executed during discovery' : 'command not configured',
        }
      : {
          available: probe?.available ?? false,
          status: probe?.status ?? 'unknown',
          ...(probe?.source ? { source: probe.source } : {}),
          ...(probe?.command ? { command: probe.command } : {}),
          ...(probe?.path ? { path: probe.path } : {}),
          version: probe?.version ?? null,
          reason: probe?.reason ?? null,
        }),
  };
}

/**
 * Durable CodeAgent selection for the DSH AR workbench.
 *
 * Claude Code is discovered from the official DSH subagent provider. Other
 * built-ins are intentionally CLI probes; a later adapter can use their
 * command and args without changing the page or persisted settings schema.
 */
export class CodeAgentRegistry {
  constructor({ dataRoot = resolve(process.env.TMPDIR ?? '/tmp', 'dsh-ohos-codeagents'), subagents = null, env = process.env } = {}) {
    this.dataRoot = resolve(dataRoot);
    this.statePath = join(this.dataRoot, 'codeagent-settings.json');
    this.subagents = subagents;
    this.env = env;
    this.statePromise = this.#load();
    this.probePromise = this.#probe();
  }

  async #load() {
    try {
      return normalizeState(JSON.parse(await readFile(this.statePath, 'utf8')));
    } catch {
      return defaultState();
    }
  }

  async #probe() {
    const entries = await Promise.all(BUILTIN_DEFINITIONS
      .filter((definition) => definition.kind === 'local-cli')
      .map(async (definition) => [
        definition.id,
        await probeCli(envCommand(definition.id, this.env), this.env),
      ]));
    return Object.fromEntries(entries);
  }

  async #persist(state) {
    await mkdir(this.dataRoot, { recursive: true });
    const temporary = `${this.statePath}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await rename(temporary, this.statePath);
  }

  async snapshot() {
    const [state, probes] = await Promise.all([this.statePromise, this.probePromise]);
    const definitions = BUILTIN_DEFINITIONS.map((definition) => {
      if (definition.id === 'claude-code') {
        const available = typeof this.subagents?.getProvider === 'function'
          ? this.subagents.getProvider('claude-code') !== undefined
          : false;
        return formatDefinition(definition, {
          available,
          status: available ? 'available' : 'provider_missing',
          version: null,
          reason: available ? null : 'DSH official Claude Code provider not loaded',
          source: 'dsh-provider',
        }, state.custom);
      }
      return formatDefinition(definition, probes[definition.id], state.custom);
    });
    const selected = definitions.find((item) => item.id === state.selected) ?? definitions[0];
    return {
      version: STATE_VERSION,
      selected: selected.id,
      selected_config: clone(selected),
      custom: clone(state.custom),
      options: definitions,
      // Keep named properties for clients that only need one provider status.
      ...Object.fromEntries(definitions.map((item) => [item.id.replaceAll('-', '_'), item])),
    };
  }

  async refresh() {
    this.probePromise = this.#probe();
    return this.snapshot();
  }

  async update(input = {}) {
    const state = await this.statePromise;
    const selected = validString(input.selected ?? state.selected, 'selected', MAX_NAME_LENGTH);
    if (!BUILTIN_DEFINITIONS.some((item) => item.id === selected)) {
      throw Object.assign(new Error(`unsupported CodeAgent: ${selected}`), {
        code: 'invalid_codeagent_settings',
        details: { selected, supported: BUILTIN_DEFINITIONS.map((item) => item.id) },
      });
    }
    const custom = normalizeCustom(input.custom ?? state.custom);
    if (selected === 'custom' && custom.command.length === 0) {
      throw Object.assign(new Error('custom.command is required when custom CodeAgent is selected'), {
        code: 'invalid_codeagent_settings',
        details: { field: 'custom.command' },
      });
    }
    const next = {
      version: STATE_VERSION,
      selected,
      custom,
    };
    await this.#persist(next);
    this.statePromise = Promise.resolve(next);
    return this.snapshot();
  }

  async resolveSelected(requested = undefined, { requireDispatchable = false } = {}) {
    const snapshot = await this.snapshot();
    const id = requested ?? snapshot.selected;
    const selected = snapshot.options.find((item) => item.id === id);
    if (!selected) {
      throw Object.assign(new Error(`unsupported CodeAgent: ${id}`), {
        code: 'invalid_codeagent_settings',
        details: { selected: id },
      });
    }
    if (requireDispatchable && selected.dispatchable === false) {
      throw Object.assign(new Error(`${selected.name} 已发现，但 DSH 尚未加载对应宿主适配器`), {
        code: 'codeagent_adapter_unavailable',
        details: { selected: selected.id, command: selected.command ?? null },
      });
    }
    return selected;
  }
}

export { BUILTIN_DEFINITIONS, DEFAULT_SELECTED };
