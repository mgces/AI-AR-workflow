import { access, chmod, copyFile, lstat, mkdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { posix } from 'node:path';
import { probeLocalAgent, probeLocalAgents } from './agents.js';
import { createAuthorityEnvelope } from '../../../../workspace-gateway/src/authority/envelope.js';
import { RemoteToolsBroker } from '../../../../workspace-gateway/src/connector/remote-tools-mcp.js';
import { ConnectorOperationJournal } from './connector-operation-journal.js';

const AGENT_KEYS = Object.freeze({
  'claude-code': 'claude_code',
  opencode: 'opencode',
  codex: 'codex',
  cursor: 'cursor',
  trae: 'trae',
  custom: 'custom',
});
const AGENT_ADAPTERS = Object.freeze({
  'claude-code': 'claude-code-cli',
  opencode: 'opencode-cli',
  codex: 'codex-cli',
  custom: 'argv-cli',
});
const MAX_CONTEXT_BYTES = 512 * 1024;
const DEFAULT_REMOTE_TOOLS_ROOT = resolve(process.env.TMPDIR ?? '/tmp', 'dsh-connector-remote-tools');
const REMOTE_TOOLS_MCP_ENTRY = fileURLToPath(new URL('../../../../workspace-gateway/src/connector/remote-tools-mcp.js', import.meta.url));
const REMOTE_TOOLS_FORMATS = new Set(['claude', 'opencode', 'toml']);
const DEFAULT_CODEX_AUTH_FILES = Object.freeze(['auth.json', 'credentials.json']);

function connectorError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function id(value, field, max = 128) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || !/^[A-Za-z0-9._:-]+$/u.test(value)) {
    throw connectorError('connector_input_invalid', `${field} is invalid`, { field });
  }
  return value;
}

function safeRelative(value, field) {
  if (value === undefined || value === null || value === '') return '.';
  if (typeof value !== 'string' || value.length > 4096 || value.includes('\\') || value.includes('\0') || value.startsWith('/')) {
    throw connectorError('connector_workspace_invalid', `${field} must be a relative POSIX path`, { field });
  }
  const normalized = posix.normalize(value);
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw connectorError('connector_workspace_outside_root', `${field} escapes the registered workspace`, { field, value });
  }
  return normalized === '' ? '.' : normalized;
}

function inside(root, candidate) {
  const remainder = relative(root, candidate);
  return remainder === '' || (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !isAbsolute(remainder));
}

function codexHomeFromEnvironment(env) {
  const configured = env?.CODEX_HOME;
  if (typeof configured === 'string' && configured.trim() !== '' && isAbsolute(configured)) return resolve(configured);
  const home = env?.HOME ?? env?.USERPROFILE;
  return typeof home === 'string' && home.trim() !== '' && isAbsolute(home) ? resolve(home, '.codex') : null;
}

function codexAuthFiles(remoteTools) {
  const configured = remoteTools?.codexAuthFiles ?? remoteTools?.codex_auth_files;
  const values = Array.isArray(configured) && configured.length > 0 ? configured : DEFAULT_CODEX_AUTH_FILES;
  return [...new Set(values.filter((value) => typeof value === 'string'
    && value.length > 0 && value.length <= 256 && !value.includes('\\') && !value.includes('\0')
    && !isAbsolute(value) && !value.split('/').some((part) => part === '..')))].slice(0, 8);
}

async function realPathWithMissingLeaf(candidate) {
  let current = resolve(candidate);
  const missing = [];
  while (true) {
    try {
      const existing = await realpath(current);
      return resolve(existing, ...missing.reverse());
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const parent = resolve(current, '..');
      if (parent === current) throw error;
      missing.push(current.slice(parent.length + 1));
      current = parent;
    }
  }
}

function catalogKey(agentId) {
  return AGENT_KEYS[agentId] ?? agentId.replaceAll('-', '_');
}

function sanitizedResult(result, { operationId, workspaceId, remoteRoot, pipelineRelative, workspaceAccess = 'sshfs_mount' }) {
  const refs = Array.isArray(result?.artifactRefs ?? result?.artifact_refs)
    ? [...new Set((result.artifactRefs ?? result.artifact_refs).filter((item) => typeof item === 'string'
      && item.trim() !== '' && !item.startsWith('/') && !item.includes('\\')
      && !item.split('/').some((part) => part === '..')))].sort()
    : [];
  return {
    status: 'completed',
    operation_id: operationId,
    workspace_id: workspaceId,
    remote_root: remoteRoot,
    pipeline_relative: pipelineRelative,
    artifact_refs: refs,
    summary: typeof result?.summary === 'string' ? result.summary.slice(0, 4096) : '',
    stdout: String(result?.stdout ?? '').slice(-8 * 1024 * 1024),
    stderr: String(result?.stderr ?? '').slice(-8 * 1024 * 1024),
    exit_code: Number.isInteger(result?.exitCode ?? result?.exit_code) ? (result.exitCode ?? result.exit_code) : null,
    duration_ms: Number.isSafeInteger(result?.durationMs ?? result?.duration_ms) ? (result.durationMs ?? result.duration_ms) : 0,
    usage: result?.usage && typeof result.usage === 'object' ? structuredClone(result.usage) : null,
    invocation: {
      execution: 'local_connector',
      agent_id: result?.invocation?.provider ?? result?.invocation?.agent_id ?? null,
      model: result?.invocation?.model ?? null,
      workspace_mode: workspaceAccess,
    },
  };
}

function mcpTomlString(value) {
  return JSON.stringify(String(value));
}

function mcpConfig(format, spec, { opencodeShape = 'official' } = {}) {
  const server = {
    command: spec.command,
    args: [...spec.args],
    env: { ...spec.env },
  };
  if (format === 'toml') {
    const lines = ['[mcp_servers.dsh_remote]', `command = ${mcpTomlString(server.command)}`, `args = [${server.args.map(mcpTomlString).join(', ')}]`, '', '[mcp_servers.dsh_remote.env]'];
    for (const [key, value] of Object.entries(server.env)) lines.push(`${key} = ${mcpTomlString(value)}`);
    return `${lines.join('\n')}\n`;
  }
  if (format === 'opencode') {
    const entry = { type: 'local', command: [server.command, ...server.args], environment: server.env, enabled: true };
    // The current OpenCode configuration contract uses a flat `mcp` map and
    // `enabled: true` for local servers. Keep the explicitly requested `v2`
    // shape as a compatibility escape hatch for pinned/private builds, but do
    // not emit it by default: current OpenCode rejects the nested form.
    const mcp = opencodeShape === 'v2' ? { servers: { dsh_remote: { ...entry, enabled: undefined, disabled: false } } } : { dsh_remote: entry };
    // OpenCode's current permission contract uses `deny` rules. Disable every
    // built-in file/shell/network/subagent tool so source changes can only
    // happen through the DSH namespaced MCP server. MCP tools are separately
    // enabled by leaving their `dsh_remote_*` names absent from this map.
    const permission = Object.fromEntries([
      'bash', 'edit', 'write', 'apply_patch', 'read', 'list', 'glob', 'grep',
      'webfetch', 'websearch', 'task', 'skill', 'lsp', 'question',
      'external_directory', 'doom_loop', 'todowrite',
    ].map((name) => [name, 'deny']));
    return JSON.stringify({ $schema: 'https://opencode.ai/config.json', mcp, permission }, null, 2);
  }
  return JSON.stringify({ mcpServers: { dsh_remote: server } }, null, 2);
}

/**
 * Agent command endpoint hosted by the user's Windows/WSL Connector. The
 * cloud sends only a workspace-relative request; this service resolves it
 * below one configured localRoot (normally an SSHFS mount of remoteRoot),
 * discovers the locally installed CLI, and invokes the existing hardened
 * LocalCodeAgentExecutor. No cloud command can select an arbitrary executable
 * or local path.
 */
export class LocalConnectorAgentService {
  constructor({
    workspaceId,
    deviceId = workspaceId,
    localRoot = null,
    remoteRoot,
    executor,
    agentCatalog = null,
    settings = null,
    env = process.env,
    workspaceAccess = 'sshfs_mount',
    workspaceConnector = null,
    remoteTools = null,
    runtimeRoot = DEFAULT_REMOTE_TOOLS_ROOT,
    operationJournal = null,
    operationJournalPath = null,
    operationJournalMaxEntries = 2048,
    remoteToolsBrokerFactory = null,
  } = {}) {
    if (typeof workspaceId !== 'string' || workspaceId.trim() === '') throw new TypeError('workspaceId is required');
    if (typeof deviceId !== 'string' || deviceId.trim() === '') throw new TypeError('deviceId is required');
    if (workspaceAccess !== 'sshfs_mount' && workspaceAccess !== 'remote_tools') throw new TypeError('workspaceAccess is invalid');
    if (workspaceAccess === 'sshfs_mount' && (typeof localRoot !== 'string' || !isAbsolute(localRoot))) throw new TypeError('localRoot must be absolute');
    if (workspaceAccess === 'remote_tools' && (!workspaceConnector || typeof workspaceConnector.execute !== 'function')) {
      throw new TypeError('workspaceConnector.execute is required for remote_tools');
    }
    if (localRoot !== null && (typeof localRoot !== 'string' || !isAbsolute(localRoot))) throw new TypeError('localRoot must be absolute');
    if (typeof remoteRoot !== 'string' || !posix.isAbsolute(remoteRoot)) throw new TypeError('remoteRoot must be absolute POSIX');
    if (!executor || typeof executor.run !== 'function') throw new TypeError('executor.run is required');
    if (agentCatalog !== null && typeof agentCatalog !== 'function' && (typeof agentCatalog !== 'object' || Array.isArray(agentCatalog))) {
      throw new TypeError('agentCatalog must be an object or function');
    }
    this.workspaceId = workspaceId.trim();
    this.deviceId = deviceId.trim();
    this.localRoot = localRoot === null ? null : resolve(localRoot);
    this.remoteRoot = posix.normalize(remoteRoot);
    this.executor = executor;
    this.agentCatalog = agentCatalog;
    this.settings = settings;
    this.env = env;
    this.workspaceAccess = workspaceAccess;
    this.workspaceConnector = workspaceConnector;
    this.remoteTools = remoteTools && typeof remoteTools === 'object' ? structuredClone(remoteTools) : {};
    this.runtimeRoot = resolve(runtimeRoot);
    if (operationJournal !== null && (!operationJournal
      || typeof operationJournal.reserve !== 'function'
      || typeof operationJournal.complete !== 'function'
      || typeof operationJournal.fail !== 'function')) {
      throw new TypeError('operationJournal must expose reserve, complete and fail');
    }
    if (operationJournalPath !== null && (typeof operationJournalPath !== 'string' || !isAbsolute(operationJournalPath))) {
      throw new TypeError('operationJournalPath must be an absolute path or null');
    }
    this.operationJournal = operationJournal ?? new ConnectorOperationJournal({
      filePath: operationJournalPath,
      maxEntries: operationJournalMaxEntries,
    });
    if (remoteToolsBrokerFactory !== null && typeof remoteToolsBrokerFactory !== 'function') throw new TypeError('remoteToolsBrokerFactory must be a function');
    this.remoteToolsBrokerFactory = remoteToolsBrokerFactory;
    this.active = new Map();
  }

  async #catalog() {
    const value = typeof this.agentCatalog === 'function' ? await this.agentCatalog() : this.agentCatalog;
    const catalog = value && typeof value === 'object' && !Array.isArray(value)
      ? structuredClone(value) : await probeLocalAgents({ env: this.env });
    // The persisted custom command is local-only configuration. Probe it here
    // and publish it with the same availability shape as built-in agents so
    // the cloud selector can dispatch a custom argv adapter through Connector.
    const configured = this.settings?.snapshot?.().custom ?? null;
    if (configured?.command) {
      const probed = await probeLocalAgent('custom', configured.command, { env: this.env });
      catalog.custom = {
        ...probed,
        ...configured,
        command: configured.command,
        args: Array.isArray(configured.args) ? [...configured.args] : [],
        available: probed.available === true,
        dispatchable: probed.available === true,
        path: probed.path ?? configured.command,
      };
    }
    return catalog;
  }

  async #localRootStatus() {
    if (this.workspaceAccess === 'remote_tools') {
      return { exists: true, writable: true, realpath: null, reason: null };
    }
    try {
      const root = await realpath(this.localRoot);
      const info = await stat(root);
      if (!info.isDirectory()) return { exists: false, writable: false, reason: 'local_root_not_directory' };
      try {
        await access(root, constants.R_OK | constants.W_OK | constants.X_OK);
      } catch {
        return { exists: true, writable: false, reason: 'local_root_not_readable_or_writable' };
      }
      return { exists: true, writable: true, realpath: root, reason: null };
    } catch (error) {
      return { exists: false, writable: false, reason: error?.code === 'ENOENT' ? 'local_root_not_found' : 'local_root_probe_failed' };
    }
  }

  #authorityFields(context = {}, operationId = randomUUID()) {
    const configured = this.remoteTools.authorityContext && typeof this.remoteTools.authorityContext === 'object'
      ? this.remoteTools.authorityContext : {};
    const runId = typeof context.run_id === 'string' && context.run_id.trim() !== '' ? context.run_id : 'local-remote-tools';
    return {
      tenant_id: configured.tenant_id ?? 'local-connector',
      workspace_id: this.workspaceId,
      cloud_run_id: configured.cloud_run_id ?? runId,
      authority_run_id: configured.authority_run_id ?? `authority-${runId}`,
      revision: Number.isInteger(context.revision) && context.revision > 0 ? context.revision : (configured.revision ?? 1),
      phase_epoch: typeof context.phase_epoch === 'string' && context.phase_epoch.trim() !== '' ? context.phase_epoch : (configured.phase_epoch ?? `phase-${context.phase ?? 'remote-tools'}`),
      connection_epoch: Number.isInteger(context.connection_epoch) && context.connection_epoch > 0 ? context.connection_epoch : (configured.connection_epoch ?? 1),
      message_type: 'operation.start',
      operation_id: operationId,
      nonce: randomUUID(),
      sent_at: new Date().toISOString(),
    };
  }

  async #remoteExecute(operationKind, payload, context = {}, operationId = randomUUID()) {
    if (!this.workspaceConnector) throw connectorError('connector_remote_tools_unavailable', 'remote tools WorkspaceConnector is not configured');
    const fields = this.#authorityFields(context, operationId);
    const signature = { key_id: 'local-connector', value: 'local-capability' };
    const response = await this.workspaceConnector.execute(createAuthorityEnvelope({
      ...fields, signature, payload: { operation_kind: operationKind, ...payload },
    }));
    if (response?.status === 'completed' && response.result && typeof response.result === 'object') return response.result;
    return response;
  }

  async #remoteProbe(context = {}) {
    try {
      const result = await this.#remoteExecute('workspace.probe', { path: '.', expect: 'directory', require_write: true }, context, `remote-tools-probe-${randomUUID()}`);
      return result?.reachable === true && result?.readable === true && result?.writable === true
        ? { exists: true, writable: true, reason: null, result }
        : { exists: false, writable: false, reason: 'remote_workspace_probe_invalid', result };
    } catch (error) {
      return { exists: false, writable: false, reason: error?.code ?? 'remote_workspace_probe_failed', error };
    }
  }

  async probe() {
    const [root, agents] = await Promise.all([
      this.workspaceAccess === 'remote_tools' ? this.#remoteProbe() : this.#localRootStatus(),
      this.#catalog(),
    ]);
    return {
      status: root.exists && root.writable ? 'ready' : 'blocked',
      workspace_id: this.workspaceId,
      device_id: this.deviceId,
      ...(this.localRoot ? { local_root: this.localRoot } : { local_root: null }),
      remote_root: this.remoteRoot,
      workspace_access: this.workspaceAccess,
      local_root_exists: this.workspaceAccess === 'remote_tools' ? null : root.exists,
      local_root_writable: this.workspaceAccess === 'remote_tools' ? null : root.writable,
      local_root_realpath: root.realpath ?? null,
      remote_workspace_reachable: this.workspaceAccess === 'remote_tools' ? root.exists : null,
      remote_workspace_writable: this.workspaceAccess === 'remote_tools' ? root.writable : null,
      reason: root.reason,
      agents,
    };
  }

  async #definition(agentId, model) {
    const agents = await this.#catalog();
    const key = catalogKey(agentId);
    let discovered = agents[key] ?? agents[agentId] ?? null;
    if (agentId === 'custom' && this.settings) {
      const configured = this.settings.snapshot?.().custom ?? null;
      if (configured?.command) {
        discovered = { ...(discovered ?? {}), ...configured, available: discovered?.available ?? true, command: configured.command,
          args: configured.args ?? [], path: discovered?.path ?? configured.command };
      }
    }
    if (!discovered || discovered.available !== true || typeof discovered.command !== 'string' || discovered.command.trim() === '') {
      throw connectorError('connector_agent_unavailable', `local CodeAgent ${agentId} is unavailable`, { agent_id: agentId, available: discovered?.available === true });
    }
    const adapter = AGENT_ADAPTERS[agentId];
    if (!adapter) throw connectorError('connector_agent_unsupported', `local CodeAgent ${agentId} has no safe adapter`, { agent_id: agentId });
    return {
      id: agentId,
      kind: 'local-cli',
      adapter,
      command: discovered.command,
      ...(typeof discovered.path === 'string' && discovered.path ? { path: discovered.path } : {}),
      ...(Array.isArray(discovered.args) ? { args: discovered.args } : {}),
      ...(typeof model === 'string' && model.trim() ? { model: model.trim() } : {}),
      ...(this.workspaceAccess === 'remote_tools' ? {
        remote_tools: true,
        ...(typeof (this.remoteTools.mcpConfigArg ?? this.remoteTools.mcp_config_arg) === 'string'
          && (this.remoteTools.mcpConfigArg ?? this.remoteTools.mcp_config_arg).trim() !== ''
          ? { mcp_config_arg: (this.remoteTools.mcpConfigArg ?? this.remoteTools.mcp_config_arg).trim() } : {}),
      } : {}),
    };
  }

  async handleCommand(command, { id: commandId = null } = {}) {
    if (!command || typeof command !== 'object' || Array.isArray(command)) throw connectorError('connector_command_invalid', 'Connector command must be an object');
    const kind = id(command.kind, 'command.kind', 64);
    const payload = command.payload && typeof command.payload === 'object' && !Array.isArray(command.payload) ? command.payload : {};
    if (kind === 'probe') return this.probe();
    if (kind === 'agent.status') {
      await this.operationJournal.ready?.();
      return { status: 'ready', workspace_id: this.workspaceId, active: [...this.active.values()].map((item) => ({
        operation_id: item.operationId, run_id: item.runId, phase: item.phase, started_at: item.startedAt,
      })), operations: this.operationJournal.summary?.() ?? [] };
    }
    if (kind === 'agent.cancel') {
      const operationId = id(payload.operation_id, 'operation_id', 160);
      const active = this.active.get(operationId);
      if (!active) {
        const record = await this.operationJournal.get?.(operationId);
        if (record?.state === 'unknown') return { status: 'unknown', operation_id: operationId, cancelled: false, reason: record.unknown_reason ?? 'connector_process_restarted' };
        return { status: 'not_found', operation_id: operationId, cancelled: false };
      }
      active.controller.abort('cancelled by cloud scheduler');
      return { status: 'cancelling', operation_id: operationId, cancelled: true };
    }
    if (kind === 'agent.result') {
      const operationId = id(payload.operation_id, 'operation_id', 160);
      const active = this.active.get(operationId);
      if (active?.promise) return active.promise;
      const record = await this.operationJournal.get?.(operationId);
      if (!record) return { status: 'not_found', operation_id: operationId };
      if (record.state === 'completed') return structuredClone(record.outcome);
      if (record.state === 'failed') {
        throw connectorError(record.error?.code ?? 'connector_agent_failed', record.error?.message ?? 'local CodeAgent failed', record.error?.details ?? {});
      }
      return { status: 'unknown', operation_id: operationId, reason: record.unknown_reason ?? 'operation_not_finished' };
    }
    if (kind !== 'agent.start') throw connectorError('connector_command_not_allowed', `Connector command ${kind} is not allowed`);
    if (payload.workspace_id !== undefined && payload.workspace_id !== this.workspaceId) {
      throw connectorError('connector_workspace_mismatch', 'Connector command workspace_id does not match this device', { expected: this.workspaceId, actual: payload.workspace_id });
    }
    const operationId = payload.operation_id ? id(payload.operation_id, 'operation_id', 160) : (commandId ?? randomUUID());
    if (jsonBytes(payload.context) > MAX_CONTEXT_BYTES) throw connectorError('connector_context_too_large', 'CodeAgent context exceeds the configured limit');
    const reservation = await this.operationJournal.reserve(operationId, {
      command: 'agent.start',
      workspace_id: this.workspaceId,
      device_id: this.deviceId,
      payload,
    });
    if (!reservation.created) {
      const previous = reservation.record;
      if (previous.state === 'completed') return structuredClone(previous.outcome);
      if (previous.state === 'failed') {
        throw connectorError(previous.error?.code ?? 'connector_agent_failed', previous.error?.message ?? 'local CodeAgent failed', previous.error?.details ?? {});
      }
      if (previous.state === 'unknown') {
        throw connectorError('connector_operation_unknown', `operation ${operationId} was interrupted by a Connector restart`, {
          operation_id: operationId, reason: previous.unknown_reason ?? 'connector_process_restarted',
        });
      }
      const running = this.active.get(operationId);
      if (running?.promise) return running.promise;
      throw connectorError('connector_operation_in_progress', `operation ${operationId} is already running`);
    }
    let journalSettled = false;
    const persistOutcome = async (outcome) => {
      await this.operationJournal.complete(operationId, outcome);
      journalSettled = true;
      return outcome;
    };
    const controller = new AbortController();
    // Register the operation before any filesystem or catalog I/O. A cloud
    // cancellation can arrive as soon as the start command is accepted, so
    // setup itself must be observable and abortable rather than returning
    // `not_found` until the mount probe finishes.
    const active = {
      operationId,
      runId: id(payload.run_id ?? 'unknown', 'run_id', 160),
      phase: typeof payload.phase === 'string' && payload.phase.trim() !== '' ? payload.phase.slice(0, 64) : 'preparing',
      startedAt: new Date().toISOString(),
      controller,
    };
    this.active.set(operationId, active);
    const execution = (async () => {
      let pipelineRelative = '.';
      let agentId = null;
      let contextPhase = active.phase;
      let remoteToolsBroker = null;
      let temporaryRoot = null;
      try {
      const repoRelative = safeRelative(payload.repo_relative, 'repo_relative');
      pipelineRelative = safeRelative(payload.pipeline_relative ?? repoRelative, 'pipeline_relative');
      const contextInput = payload.context && typeof payload.context === 'object' && !Array.isArray(payload.context) ? payload.context : {};
      agentId = id(payload.agent_id ?? payload.definition?.id, 'agent_id', 64);
      const definition = await this.#definition(agentId, payload.model ?? payload.definition?.model ?? null);
      let context;
      if (this.workspaceAccess === 'remote_tools') {
        const remoteStatus = await this.#remoteProbe(contextInput);
        if (!remoteStatus.exists || !remoteStatus.writable) {
          throw connectorError('connector_workspace_unavailable', 'Connector cannot reach a readable and writable SSH workspace', {
            remote_root: this.remoteRoot, reason: remoteStatus.reason ?? 'remote_workspace_unavailable',
          });
        }
        const runSegment = id(contextInput.run_id ?? payload.run_id ?? 'unknown', 'run_id', 160).replaceAll(':', '_');
        temporaryRoot = resolve(this.runtimeRoot, `${runSegment}-${operationId}`);
        const localWorkspaceRoot = resolve(temporaryRoot, 'workspace');
        const localPipelineDir = resolve(localWorkspaceRoot, 'pipeline');
        await mkdir(localPipelineDir, { recursive: true, mode: 0o700 });
        const remoteWorkspaceRoot = posix.normalize(posix.join(this.remoteRoot, repoRelative));
        const remotePipelineDir = posix.normalize(posix.join(this.remoteRoot, pipelineRelative));
        const configuredProfiles = this.remoteTools.allowedProfiles ?? this.remoteTools.allowed_profiles;
        const allowedProfiles = Array.isArray(configuredProfiles) ? configuredProfiles : [];
        remoteToolsBroker = this.remoteToolsBrokerFactory
          ? await this.remoteToolsBrokerFactory({
              connector: this.workspaceConnector,
              workspaceId: this.workspaceId,
              authorityContext: this.#authorityFields(contextInput, `remote-tools-${operationId}`),
              allowedProfiles,
              socketPath: resolve(temporaryRoot, 'remote-tools.sock'),
            })
          : new RemoteToolsBroker({
              connector: this.workspaceConnector,
              workspaceId: this.workspaceId,
              authorityContext: this.#authorityFields(contextInput, `remote-tools-${operationId}`),
              allowedProfiles,
              socketPath: resolve(temporaryRoot, 'remote-tools.sock'),
            });
        if (!remoteToolsBroker || typeof remoteToolsBroker.start !== 'function' || typeof remoteToolsBroker.mcpServerSpec !== 'function') {
          throw connectorError('connector_remote_tools_unavailable', 'remote tools broker factory returned an invalid broker');
        }
        await remoteToolsBroker.start();
        const spec = remoteToolsBroker.mcpServerSpec({ command: process.execPath, args: [REMOTE_TOOLS_MCP_ENTRY] });
        const format = this.remoteTools.mcpConfigFormat ?? this.remoteTools.mcp_config_format
          ?? (agentId === 'opencode' ? 'opencode' : agentId === 'codex' ? 'toml' : 'claude');
        if (!REMOTE_TOOLS_FORMATS.has(format)) {
          throw connectorError('connector_remote_tools_config_invalid', `unsupported remote_tools MCP config format: ${format}`);
        }
        const expectedFormat = agentId === 'opencode' ? 'opencode' : agentId === 'codex' ? 'toml' : agentId === 'claude-code' ? 'claude' : null;
        if (expectedFormat && format !== expectedFormat) {
          throw connectorError('connector_remote_tools_config_invalid', `${agentId} requires remote_tools MCP config format ${expectedFormat}`, {
            agent_id: agentId, expected_format: expectedFormat, actual_format: format,
          });
        }
        const mcpConfigFile = resolve(temporaryRoot, format === 'toml' ? 'remote-tools.toml' : 'remote-tools.json');
        const mcpContent = `${mcpConfig(format, spec, {
          opencodeShape: this.remoteTools.opencodeConfigShape ?? this.remoteTools.opencode_config_shape ?? 'official',
        })}\n`;
        await writeFile(mcpConfigFile, mcpContent, { encoding: 'utf8', mode: 0o600 });
        let opencodeConfigFile = null;
        let codexHome = null;
        if (format === 'opencode') {
          // OpenCode exposes the config path through OPENCODE_CONFIG; its
          // `--config` spelling is not a file option.
          opencodeConfigFile = mcpConfigFile;
        } else if (format === 'toml') {
          // Codex reads MCP servers from $CODEX_HOME/config.toml. Give every
          // run an isolated home so the user's persistent MCP/auth settings
          // are never modified and the short-lived broker cannot linger.
          codexHome = resolve(temporaryRoot, 'codex-home');
          await mkdir(codexHome, { recursive: true, mode: 0o700 });
          // CODEX_HOME is isolated so the generated MCP server cannot mutate
          // the user's persistent config. Preserve file-backed local auth
          // when it exists; API-key environment variables and keychain-backed
          // auth continue to flow through the inherited environment.
          const sourceCodexHome = codexHomeFromEnvironment(this.env);
          if (sourceCodexHome && sourceCodexHome !== codexHome) {
            for (const authFile of codexAuthFiles(this.remoteTools)) {
              const source = resolve(sourceCodexHome, authFile);
              const target = resolve(codexHome, authFile);
              if (!inside(sourceCodexHome, source) || !inside(codexHome, target)) continue;
              try {
                const sourceInfo = await lstat(source);
                if (!sourceInfo.isFile() || sourceInfo.isSymbolicLink()) continue;
                await mkdir(resolve(target, '..'), { recursive: true, mode: 0o700 });
                await copyFile(source, target);
                await chmod(target, 0o600).catch(() => {});
              } catch (error) {
                if (error?.code !== 'ENOENT') {
                  // A missing optional auth file is normal. Other failures
                  // are surfaced so an operator can fix local permissions
                  // instead of seeing a confusing provider login error.
                  throw connectorError('connector_codex_auth_copy_failed', `could not copy local Codex auth file ${authFile}`, {
                    auth_file: authFile, cause: error?.code ?? error?.message ?? String(error),
                  });
                }
              }
            }
          }
          await writeFile(resolve(codexHome, 'config.toml'), mcpContent, { encoding: 'utf8', mode: 0o600 });
        }
        if (agentId === 'custom') {
          const customArgs = Array.isArray(definition.args) ? definition.args : [];
          const explicitMcp = customArgs.some((item) => String(item).includes('{{mcp_config_file}}'))
            || typeof definition.mcp_config_arg === 'string' || typeof definition.mcpConfigArg === 'string';
          if (!explicitMcp) {
            throw connectorError('connector_remote_tools_config_invalid', 'custom CodeAgent must declare mcp_config_arg or {{mcp_config_file}} in remote_tools mode');
          }
        }
        context = {
          ...contextInput,
          workspace_root: localWorkspaceRoot,
          pipeline_dir: localPipelineDir,
          remote_workspace_root: remoteWorkspaceRoot,
          remote_pipeline_dir: remotePipelineDir,
          workspace_mode: 'remote_tools',
          remote_tools: { mcp_config_file: mcpConfigFile, allowed_profiles: [...allowedProfiles] },
          run_id: id(contextInput.run_id ?? payload.run_id ?? 'unknown', 'run_id', 160),
          attempt_id: id(contextInput.attempt_id ?? payload.attempt_id ?? operationId, 'attempt_id', 160),
          phase: id(contextInput.phase ?? payload.phase ?? 'unknown', 'phase', 64),
          role: typeof contextInput.role === 'string' ? contextInput.role.slice(0, 128) : String(payload.role ?? ''),
          model: definition.model ?? null,
          ...(opencodeConfigFile || codexHome ? {
            remote_tools: {
              mcp_config_file: mcpConfigFile,
              allowed_profiles: [...allowedProfiles],
              ...(opencodeConfigFile ? { opencode_config_file: opencodeConfigFile } : {}),
              ...(codexHome ? { codex_home: codexHome } : {}),
            },
          } : {}),
        };
      } else {
        const rootStatus = await this.#localRootStatus();
        if (!rootStatus.exists || !rootStatus.writable || !rootStatus.realpath) {
          throw connectorError('connector_workspace_unavailable', 'Connector local_root is not a readable and writable directory', {
            local_root: this.localRoot, reason: rootStatus.reason ?? 'local_root_unavailable',
          });
        }
        // Resolve existing path components before the containment check. A lexical
        // `resolve(root, value)` check is insufficient when an SSHFS mount contains
        // a symlink that points outside the registered workspace.
        let localWorkspaceRoot;
        let localPipelineDir;
        try {
          localWorkspaceRoot = await realPathWithMissingLeaf(resolve(rootStatus.realpath, repoRelative));
          localPipelineDir = await realPathWithMissingLeaf(resolve(rootStatus.realpath, pipelineRelative));
        } catch (error) {
          throw connectorError('connector_workspace_invalid', 'Connector workspace path cannot be resolved', {
            cause: error?.message ?? String(error),
          });
        }
        if (!inside(rootStatus.realpath, localWorkspaceRoot) || !inside(rootStatus.realpath, localPipelineDir)
            || !inside(localWorkspaceRoot, localPipelineDir)) {
          throw connectorError('connector_workspace_outside_root', 'Connector workspace path escapes the configured SSHFS mount');
        }
        context = {
          ...contextInput,
          workspace_root: localWorkspaceRoot,
          pipeline_dir: localPipelineDir,
          run_id: id(contextInput.run_id ?? payload.run_id ?? 'unknown', 'run_id', 160),
          attempt_id: id(contextInput.attempt_id ?? payload.attempt_id ?? operationId, 'attempt_id', 160),
          phase: id(contextInput.phase ?? payload.phase ?? 'unknown', 'phase', 64),
          role: typeof contextInput.role === 'string' ? contextInput.role.slice(0, 128) : String(payload.role ?? ''),
          model: definition.model ?? null,
        };
      }
      active.runId = context.run_id;
      active.phase = context.phase;
      contextPhase = context.phase;
      if (controller.signal.aborted) {
        return await persistOutcome({ status: 'cancelled', operation_id: operationId, workspace_id: this.workspaceId,
          remote_root: this.remoteRoot, pipeline_relative: pipelineRelative, reason: 'cancelled' });
      }
      const result = await this.executor.run({ definition, context, signal: controller.signal });
      if (controller.signal.aborted) {
        return await persistOutcome({ status: 'cancelled', operation_id: operationId, workspace_id: this.workspaceId,
          remote_root: this.remoteRoot, pipeline_relative: pipelineRelative,
          reason: 'cancelled' });
      }
      if (this.workspaceAccess === 'remote_tools') {
        const phase = context.phase;
        // Keep the observability logs on the same SSH workspace as the source;
        // the temporary local sandbox is intentionally disposable and contains
        // no source copy.
        await this.#remoteExecute('workspace.write', {
          path: posix.join(pipelineRelative, 'evidence', phase, 'codeagent.stdout.log'),
          content: String(result?.stdout ?? ''),
        }, context, `remote-tools-log-stdout-${operationId}`);
        await this.#remoteExecute('workspace.write', {
          path: posix.join(pipelineRelative, 'evidence', phase, 'codeagent.stderr.log'),
          content: String(result?.stderr ?? ''),
        }, context, `remote-tools-log-stderr-${operationId}`);
        const remoteRefs = await this.#remoteArtifactRefs(pipelineRelative, context);
        result.artifactRefs = [...new Set([...(result.artifactRefs ?? []), ...remoteRefs,
          `evidence/${phase}/codeagent.stdout.log`, `evidence/${phase}/codeagent.stderr.log`])].sort();
      }
      return await persistOutcome(sanitizedResult(result, { operationId, workspaceId: this.workspaceId, remoteRoot: this.remoteRoot, pipelineRelative, workspaceAccess: this.workspaceAccess }));
    } catch (error) {
      if (controller.signal.aborted || error?.code === 'codeagent_cancelled') {
        return await persistOutcome({ status: 'cancelled', operation_id: operationId, workspace_id: this.workspaceId,
          remote_root: this.remoteRoot, pipeline_relative: pipelineRelative,
          reason: error?.message ?? 'cancelled' });
      }
      const failure = connectorError(error?.code ?? 'connector_agent_failed', error?.message ?? 'local CodeAgent failed', {
        operation_id: operationId, agent_id: agentId, phase: contextPhase,
      });
      await this.operationJournal.fail(operationId, failure);
      journalSettled = true;
      throw failure;
      } finally {
      if (remoteToolsBroker) await remoteToolsBroker.stop().catch(() => {});
      if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true }).catch(() => {});
      // A failure while preparing the command can occur before the main catch
      // (for example a journal implementation rejecting its write). Keep the
      // record visibly uncertain rather than allowing a future retry to start
      // an untracked duplicate operation.
      if (!journalSettled && this.operationJournal?.fail) {
        await this.operationJournal.fail(operationId, connectorError('connector_operation_unknown', 'Connector operation outcome could not be persisted')).catch(() => {});
      }
      this.active.delete(operationId);
      }
    })();
    active.promise = execution;
    return execution;
  }

  async #remoteArtifactRefs(pipelineRelative, context) {
    const refs = [];
    for (const root of ['evidence', 'reports', 'controls']) {
      try {
        const result = await this.#remoteExecute('workspace.list', {
          path: posix.join(pipelineRelative, root), recursive: true, max_entries: 1000,
        }, context, `remote-tools-list-${root}-${randomUUID()}`);
        for (const entry of Array.isArray(result?.entries) ? result.entries : []) {
          const value = typeof entry === 'string' ? entry : entry?.relative_path;
          if (typeof value !== 'string' || value.trim() === '' || value.startsWith('/') || value.includes('..')) continue;
          refs.push(posix.join(root, value));
        }
      } catch {
        // A missing early-phase artifact directory is normal. The authoritative
        // gate will report missing evidence later if it is required.
      }
    }
    return [...new Set(refs)];
  }
}

function jsonBytes(value) {
  try { return Buffer.byteLength(JSON.stringify(value ?? {}), 'utf8'); } catch { return Infinity; }
}
