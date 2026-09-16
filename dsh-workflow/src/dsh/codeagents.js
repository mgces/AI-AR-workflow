import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { prepareCommandInvocation, resolveCommandPath } from '../../../platform/apps/local-console/src/command.js';

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

const REMOTE_PROFILE_KEYS = Object.freeze({
  'claude-code': ['claude-code', 'claude_code', 'claude-code-cli'],
  opencode: ['opencode', 'opencode-cli'],
  codex: ['codex', 'codex-cli'],
  cursor: ['cursor', 'cursor-agent'],
  trae: ['trae', 'trae-cli'],
  custom: ['custom', 'argv-cli'],
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
    adapter: 'opencode-cli',
    dispatchable: false,
    description: '使用 WSL 中的 OpenCode CLI；命令可通过 DSH_OPENCODE_CLI 覆盖。',
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    kind: 'local-cli',
    adapter: 'codex-cli',
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
    adapter: 'argv-cli',
    dispatchable: false,
    description: '填写一个本地 argv 命令；固定参数可使用 DSH 提供的 workspace/prompt 变量。',
  },
]);

function clone(value) {
  return structuredClone(value);
}

function connectorSnapshotFingerprint(snapshot, workspaceId) {
  const workspace = snapshot?.workspaces?.find((item) => item?.workspace_id === workspaceId) ?? null;
  if (!workspace) return 'offline';
  const capabilities = workspace.capabilities && typeof workspace.capabilities === 'object'
    ? workspace.capabilities : {};
  return JSON.stringify({
    connected: workspace.connected === true,
    connection_epoch: workspace.connection_epoch ?? null,
    workspace_access: capabilities.workspace_access ?? null,
    local_root_exists: capabilities.local_root_exists ?? null,
    local_root_writable: capabilities.local_root_writable ?? null,
    remote_workspace_reachable: capabilities.remote_workspace_reachable ?? null,
    remote_workspace_writable: capabilities.remote_workspace_writable ?? null,
    agents: capabilities.agents ?? null,
  });
}

function envCommand(id, env) {
  const key = `DSH_${id.toUpperCase().replaceAll('-', '_')}_CLI`;
  return env[key] || CLI_DEFAULTS[id] || null;
}

function remoteProfileFor(profiles, id, adapter = null) {
  const aliases = [...(REMOTE_PROFILE_KEYS[id] ?? [id]), ...(adapter ? [adapter] : [])];
  for (const key of aliases) {
    const value = profiles?.[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}

function commandPath(command, env) {
  return resolveCommandPath(command, env);
}

async function probeCli(command, env) {
  const path = commandPath(command, env);
  if (!command) return { available: false, status: 'missing', command: null, path: null, version: null, reason: 'command not configured' };
  if (!path) {
    return { available: false, status: 'missing', command, path: null, version: null, reason: 'executable not found' };
  }
  try {
    const invocation = prepareCommandInvocation(command, ['--version'], { env });
    const result = await execFile(invocation.command, invocation.args, {
      env: invocation.env,
      shell: invocation.shell,
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
    model: null,
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
    state.model = value.model === undefined
      ? null
      : (validString(value.model, 'model', MAX_MODEL_LENGTH, { allowEmpty: true }) || null);
  } catch {
    state.model = null;
  }
  try {
    state.custom = normalizeCustom(value.custom);
  } catch {
    // A corrupted optional custom row must not hide the built-in selector.
  }
  return state;
}

function formatDefinition(definition, probe, custom, configuredModel = null) {
  const hasAdapter = definition.kind === 'official-provider' || Boolean(definition.adapter);
  const connectorWorkspaceAccess = probe?.workspace_access
    ?? (probe?.source === 'local-connector' ? 'sshfs_mount' : null);
  const executionMode = probe?.source === 'workspace-gateway'
    ? 'workspace_gateway'
    : probe?.source === 'local-connector'
      ? 'local_connector'
      : definition.kind === 'official-provider' ? 'dsh_provider' : 'local_cli';
  const executionMetadata = {
    execution_mode: executionMode,
    execution_host: executionMode === 'workspace_gateway' ? 'ssh_code_host'
      : executionMode === 'local_connector' ? 'user_connector_host' : 'dsh_host',
    workspace_access: executionMode === 'workspace_gateway' ? 'remote'
      : executionMode === 'local_connector' ? connectorWorkspaceAccess : 'local',
    supports_remote_workspace_editing: executionMode === 'workspace_gateway' || executionMode === 'local_connector',
    supports_remote_tools: executionMode === 'local_connector' && connectorWorkspaceAccess === 'remote_tools',
    ...(executionMode === 'local_connector' && probe?.connector_workspace_id
      ? { connector_workspace_id: probe.connector_workspace_id } : {}),
  };
  return {
    ...definition,
    ...executionMetadata,
    ...(definition.id === 'custom'
      ? {
          name: custom.name,
          command: custom.command,
          args: [...custom.args],
          model: custom.model || configuredModel || null,
          available: probe?.available ?? false,
          dispatchable: probe?.available === true && hasAdapter,
          status: probe?.status ?? (custom.command.length > 0 ? 'configured' : 'not_configured'),
          ...(probe?.command ? { command: probe.command } : {}),
          ...(probe?.path ? { path: probe.path } : {}),
          ...(probe?.source ? { source: probe.source } : {}),
          ...(probe?.profile_id ? { profile_id: probe.profile_id } : {}),
          version: null,
          reason: probe?.reason ?? (custom.command.length > 0 ? 'executable not found' : 'command not configured'),
        }
      : {
          available: probe?.available ?? false,
          dispatchable: probe?.available === true && hasAdapter,
          status: probe?.status ?? 'unknown',
          ...(probe?.source ? { source: probe.source } : {}),
          ...(probe?.profile_id ? { profile_id: probe.profile_id } : {}),
          ...(probe?.command ? { command: probe.command } : {}),
          ...(probe?.path ? { path: probe.path } : {}),
          version: probe?.version ?? null,
          reason: probe?.reason ?? null,
          ...(configuredModel ? { model: configuredModel } : {}),
        }),
  };
}

/**
 * Durable CodeAgent selection for the DSH AR workbench.
 *
 * Claude Code is discovered from the official DSH subagent provider unless a
 * registered Workspace Gateway profile explicitly selects the code-host CLI.
 * OpenCode and Codex can be dispatched either by a local CLI adapter or by a
 * Gateway profile; Cursor/Trae remain visible until a compatible adapter is
 * explicitly installed.
 */
export class CodeAgentRegistry {
  constructor({ dataRoot = resolve(process.env.TMPDIR ?? '/tmp', 'dsh-ohos-codeagents'), subagents = null, env = process.env, remoteProfiles = null, connector = null, connectorWorkspaceId = null } = {}) {
    this.dataRoot = resolve(dataRoot);
    this.statePath = join(this.dataRoot, 'codeagent-settings.json');
    this.subagents = subagents;
    this.env = env;
    this.remoteProfiles = remoteProfiles && typeof remoteProfiles === 'object' ? { ...remoteProfiles } : {};
    this.connector = connector;
    this.connectorWorkspaceId = connectorWorkspaceId;
    this.connectorFingerprint = null;
    this.probeInFlight = false;
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
    this.probeInFlight = true;
    try {
      const state = await this.statePromise;
      let connectorWorkspace = null;
      let connectorSnapshot = null;
      if (this.connector?.snapshot && this.connectorWorkspaceId) {
        try {
          connectorSnapshot = await this.connector.snapshot();
          this.connectorFingerprint = connectorSnapshotFingerprint(connectorSnapshot, this.connectorWorkspaceId);
          connectorWorkspace = connectorSnapshot?.workspaces?.find((item) => item?.workspace_id === this.connectorWorkspaceId
            && item.connected === true) ?? null;
        } catch {
          connectorWorkspace = null;
          this.connectorFingerprint = 'offline';
        }
      } else {
        this.connectorFingerprint = null;
      }
      const connectorAgents = connectorWorkspace?.capabilities?.agents
        && typeof connectorWorkspace.capabilities.agents === 'object'
        ? connectorWorkspace.capabilities.agents : null;
      const connectorProbe = (definition) => {
      if (!this.connector || !this.connectorWorkspaceId) return null;
      if (!connectorWorkspace || !connectorAgents) return {
        available: false, status: 'connector_offline', command: null, path: null, version: null,
        reason: 'connector_offline', source: 'local-connector', connector_workspace_id: this.connectorWorkspaceId,
        workspace_access: connectorWorkspace?.capabilities?.workspace_access ?? null,
      };
      const key = definition.id === 'claude-code' ? 'claude_code' : definition.id;
      const value = connectorAgents[key] ?? connectorAgents[definition.id] ?? null;
      if (!value || value.available !== true) return {
        available: false, status: 'connector_agent_missing', command: value?.command ?? null, path: value?.path ?? null,
        version: value?.version ?? null, reason: 'agent_not_installed_on_connector', source: 'local-connector',
        connector_workspace_id: this.connectorWorkspaceId,
        workspace_access: connectorWorkspace.capabilities?.workspace_access ?? null,
      };
      return {
        available: true, status: 'connector_online', command: value.command ?? null, path: value.path ?? null,
        version: value.version ?? null, reason: null, source: 'local-connector',
        connector_workspace_id: this.connectorWorkspaceId,
        workspace_access: connectorWorkspace.capabilities?.workspace_access ?? null,
      };
    };
      const entries = await Promise.all(BUILTIN_DEFINITIONS
      .filter((definition) => definition.kind === 'local-cli')
      .map(async (definition) => [
        definition.id,
        connectorProbe(definition)
          ?? (remoteProfileFor(this.remoteProfiles, definition.id, definition.adapter)
          ? {
              available: true,
              status: 'gateway_configured',
              command: null,
              path: null,
              version: null,
              reason: null,
              source: 'workspace-gateway',
              profile_id: remoteProfileFor(this.remoteProfiles, definition.id, definition.adapter),
            }
          : await probeCli(envCommand(definition.id, this.env), this.env)),
      ]));
      const customCommand = state.custom.command;
      const customPath = commandPath(customCommand, this.env);
      const customConnectorProbe = this.connector && this.connectorWorkspaceId
        ? connectorProbe({ id: 'custom' }) : null;
      const claudeConnectorProbe = this.connector && this.connectorWorkspaceId
        ? connectorProbe({ id: 'claude-code' }) : null;
      if (claudeConnectorProbe) entries.push(['claude-code', claudeConnectorProbe]);
      const customRemoteProfile = remoteProfileFor(this.remoteProfiles, 'custom', 'argv-cli');
      entries.push(['custom', {
      available: customConnectorProbe?.available === true || customRemoteProfile !== null || Boolean(customPath),
      status: customConnectorProbe?.status ?? (customRemoteProfile !== null
        ? 'gateway_configured'
        : (customCommand.length === 0 ? 'not_configured' : (customPath ? 'configured' : 'missing'))),
      command: customCommand || null,
      path: customPath,
      version: null,
      reason: customRemoteProfile !== null
        ? null
        : (customCommand.length === 0
        ? 'command not configured'
        : (customPath ? null : 'executable not found')),
      ...(customConnectorProbe ? {
        source: customConnectorProbe.source,
        connector_workspace_id: customConnectorProbe.connector_workspace_id,
        path: customConnectorProbe.path,
        command: customConnectorProbe.command,
        version: customConnectorProbe.version,
        reason: customConnectorProbe.reason,
        workspace_access: customConnectorProbe.workspace_access,
      } : {}),
      ...(customRemoteProfile ? { source: 'workspace-gateway', profile_id: customRemoteProfile } : {}),
      }]);
      return Object.fromEntries(entries);
    } finally {
      this.probeInFlight = false;
    }
  }

  async #refreshWhenConnectorChanges() {
    if (!this.connector?.snapshot || !this.connectorWorkspaceId || this.probeInFlight) return;
    let snapshot;
    try { snapshot = await this.connector.snapshot(); }
    catch { snapshot = null; }
    const next = connectorSnapshotFingerprint(snapshot, this.connectorWorkspaceId);
    if (next !== this.connectorFingerprint && !this.probeInFlight) this.probePromise = this.#probe();
  }

  async #persist(state) {
    await mkdir(this.dataRoot, { recursive: true });
    const temporary = `${this.statePath}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await rename(temporary, this.statePath);
  }

  async snapshot(options = {}) {
    if (options?.refresh === true) {
      await this.refresh();
      return this.snapshot();
    }
    await this.#refreshWhenConnectorChanges();
    const [state, probes] = await Promise.all([this.statePromise, this.probePromise]);
    const definitions = BUILTIN_DEFINITIONS.map((definition) => {
      if (definition.id === 'claude-code') {
        const connectorProbe = probes[definition.id];
        if (connectorProbe?.source === 'local-connector') {
          return formatDefinition({ ...definition, kind: 'remote-cli', adapter: 'claude-code-cli',
            description: connectorProbe.workspace_access === 'remote_tools'
              ? '通过用户电脑 Connector 在本地 Claude Code 执行；代码通过受限 DSH remote-tools MCP 访问 SSH 工作区。'
              : '通过用户电脑 Connector 在本地 Claude Code 工作区执行；代码目录映射到 SSHFS 绑定。' }, connectorProbe, state.custom, state.model);
        }
        const remoteProfile = remoteProfileFor(this.remoteProfiles, 'claude-code', 'claude-code-cli');
        if (remoteProfile) {
          return formatDefinition({
            ...definition,
            kind: 'remote-cli',
            adapter: 'claude-code-cli',
            description: '通过 Workspace Gateway 在代码端执行 Claude Code CLI；云端只接收结构化结果和产物摘要。',
          }, {
            available: true,
            status: 'gateway_configured',
            version: null,
            reason: null,
            source: 'workspace-gateway',
            profile_id: remoteProfile,
          }, state.custom, state.model);
        }
        const available = typeof this.subagents?.getProvider === 'function'
          ? this.subagents.getProvider('claude-code') !== undefined
          : false;
        return formatDefinition(definition, {
          available,
          status: available ? 'available' : 'provider_missing',
          version: null,
          reason: available ? null : 'DSH official Claude Code provider not loaded',
          source: 'dsh-provider',
        }, state.custom, state.model);
      }
      return formatDefinition(definition, probes[definition.id], state.custom, state.model);
    });
    const selected = definitions.find((item) => item.id === state.selected) ?? definitions[0];
    return {
      version: STATE_VERSION,
      selected: selected.id,
      model: state.model,
      selected_config: clone(selected),
      custom: clone(state.custom),
      options: definitions,
      // Keep named properties for clients that only need one provider status.
      ...Object.fromEntries(definitions.map((item) => [item.id.replaceAll('-', '_'), item])),
    };
  }

  async refresh() {
    if (this.connector && this.connectorWorkspaceId) {
      try {
        if (typeof this.connector.probeWorkspace === 'function') {
          await this.connector.probeWorkspace(this.connectorWorkspaceId, { timeoutMs: 30_000 });
        } else if (typeof this.connector.request === 'function') {
          // A custom transport may not expose the hub helper. The probe is
          // still safe because the Connector command vocabulary is fixed; a
          // transport without session capability simply keeps the old status.
          await this.connector.request(this.connectorWorkspaceId, {
            kind: 'probe', payload: { workspace_id: this.connectorWorkspaceId },
          }, { timeoutMs: 30_000 });
        }
      } catch {
        // The subsequent snapshot records connector_offline/missing. Refresh
        // must remain usable while a user laptop is asleep or disconnected.
      }
    }
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
    const hasRemoteCustomProfile = remoteProfileFor(this.remoteProfiles, 'custom', 'argv-cli') !== null;
    const currentSnapshot = await this.snapshot();
    const connectorCustom = currentSnapshot.custom?.source === 'local-connector' && currentSnapshot.custom?.available === true;
    if (selected === 'custom' && custom.command.length === 0 && !hasRemoteCustomProfile && !connectorCustom) {
      throw Object.assign(new Error('custom.command is required when custom CodeAgent is selected'), {
        code: 'invalid_codeagent_settings',
        details: { field: 'custom.command' },
      });
    }
    const next = {
      version: STATE_VERSION,
      selected,
      model: Object.hasOwn(input, 'model')
        ? (input.model === null || input.model === undefined
          ? null : (validString(input.model, 'model', MAX_MODEL_LENGTH, { allowEmpty: true }) || null))
        : state.model,
      custom,
    };
    await this.#persist(next);
    this.statePromise = Promise.resolve(next);
    // The custom command is part of the persisted selector. Reprobe after a
    // settings update so the same response reflects the executable that will
    // actually be dispatched by the next run.
    this.probePromise = this.#probe();
    return this.snapshot();
  }

  async resolveSelected(requested = undefined, { requireDispatchable = false, model = undefined } = {}) {
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
    const resolved = clone(selected);
    if (model !== undefined) {
      if (typeof model !== 'string' || model.trim() === '' || model.length > MAX_MODEL_LENGTH) {
        throw Object.assign(new Error('model override is invalid'), {
          code: 'invalid_codeagent_settings',
          details: { field: 'model', max: MAX_MODEL_LENGTH },
        });
      }
      resolved.model = model.trim();
    }
    return resolved;
  }
}

export { BUILTIN_DEFINITIONS, DEFAULT_SELECTED };
