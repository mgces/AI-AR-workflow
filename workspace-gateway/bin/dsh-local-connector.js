#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { LocalCodeAgentExecutor } from '../../platform/apps/local-console/src/codeagent-executor.js';
import { LocalConnectorAgentService } from '../../platform/apps/local-console/src/connector-agent.js';
import { LocalCodeAgentSettings, probeLocalAgents } from '../../platform/apps/local-console/src/agents.js';
import { WebSocketConnectorClient } from '../src/connector/websocket.js';
import { SshfsMountManager } from '../src/connector/sshfs-mount.js';
import { WorkspaceConnector } from '../src/connector/workspace-connector.js';
import { fileURLToPath } from 'node:url';

function usage() {
  process.stderr.write('Usage: dsh-local-connector --config /absolute/path/connector.json\n');
}

export function resolveSecretReference(value, env = process.env) {
  if (typeof value !== 'string') return value ?? null;
  const match = value.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/u);
  return match ? (env?.[match[1]] ?? null) : value;
}

/**
 * An SSHFS Connector must be bound to an SSH endpoint.  Treating an arbitrary
 * local directory as `sshfs_mount` would let a cloud run edit the wrong tree
 * while the overview still reported that the SSH code endpoint was ready.
 * Manual mounts are supported: the binding is used to identify the intended
 * remote root and the mount manager verifies the mount point before hello.
 */
export function validateSshfsConnectorConfig({ workspaceAccess = 'sshfs_mount', localRoot = null, remoteRoot = null, sshConfig = null } = {}) {
  if (workspaceAccess === 'remote_tools') return true;
  if (workspaceAccess !== 'sshfs_mount') throw new Error('workspace_access must be sshfs_mount or remote_tools');
  if (!sshConfig || typeof sshConfig !== 'object' || Array.isArray(sshConfig)) {
    throw new Error('SSHFS mode requires an ssh binding; use remote_tools for an unmounted Connector');
  }
  if (typeof sshConfig.host !== 'string' || sshConfig.host.trim() === '') {
    throw new Error('ssh.host is required for SSHFS mode');
  }
  if (typeof localRoot !== 'string' || !isAbsolute(localRoot)) {
    throw new Error('local_root must be an absolute path for SSHFS mode');
  }
  if (typeof remoteRoot !== 'string' || !remoteRoot.startsWith('/')) {
    throw new Error('remote_root must be an absolute POSIX path for SSHFS mode');
  }
  return true;
}

async function readConfig() {
  const index = process.argv.indexOf('--config');
  const configured = index >= 0 ? process.argv[index + 1] : process.env.DSH_CONNECTOR_CONFIG;
  if (!configured || configured.startsWith('-')) throw new Error('connector config path is required');
  const path = resolve(configured);
  let value;
  try { value = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { throw new Error(`could not read connector config: ${error.message}`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('connector config must be an object');
  return { ...value, config_path: path };
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) { usage(); return; }
  const config = await readConfig();
  const url = config.url ?? config.cloud_url ?? config.endpoint;
  const workspaceId = config.workspace_id ?? config.workspaceId;
  const deviceId = config.device_id ?? config.deviceId ?? workspaceId;
  const sshConfig = config.sshfs ?? config.ssh ?? null;
  const remoteToolsConfig = config.remote_tools ?? config.remoteTools ?? null;
  const workspaceAccess = remoteToolsConfig?.enabled === true || config.workspace_access === 'remote_tools'
    ? 'remote_tools' : 'sshfs_mount';
  const localRoot = config.local_root ?? config.localRoot ?? sshConfig?.mount_point ?? sshConfig?.mountPoint;
  const remoteRoot = config.remote_root ?? config.remoteRoot ?? sshConfig?.remote_root ?? sshConfig?.remoteRoot;
  validateSshfsConnectorConfig({ workspaceAccess, localRoot, remoteRoot, sshConfig });
  if (typeof url !== 'string' || typeof workspaceId !== 'string' || typeof deviceId !== 'string'
      || typeof remoteRoot !== 'string' || (workspaceAccess === 'sshfs_mount' && typeof localRoot !== 'string')) {
    throw new Error(workspaceAccess === 'remote_tools'
      ? 'config requires url, workspace_id, device_id and remote_root; remote_tools.ssh must configure host/user'
      : 'config requires url, workspace_id, device_id, local_root and remote_root');
  }
  const env = { ...process.env, ...(config.env && typeof config.env === 'object' ? config.env : {}) };
  let mountManager = null;
  let mountStartedByProcess = false;
  if (workspaceAccess === 'sshfs_mount' && sshConfig !== null) {
    if (!sshConfig || typeof sshConfig !== 'object' || Array.isArray(sshConfig)) throw new Error('ssh/sshfs config must be an object');
    const configuredRemoteRoot = sshConfig.remote_root ?? sshConfig.remoteRoot ?? remoteRoot;
    if (configuredRemoteRoot !== remoteRoot) throw new Error('sshfs remote_root must match remote_root');
    mountManager = new SshfsMountManager({
      host: sshConfig.host,
      username: sshConfig.username ?? sshConfig.user ?? null,
      port: sshConfig.port ?? 22,
      remoteRoot,
      mountPoint: localRoot,
      sshfsCommand: sshConfig.sshfs_command ?? sshConfig.sshfsCommand ?? 'sshfs',
      unmountCommand: sshConfig.unmount_command ?? sshConfig.unmountCommand ?? 'fusermount3',
      identityFile: sshConfig.identity_file ?? sshConfig.identityFile ?? null,
      knownHostsFile: sshConfig.known_hosts_file ?? sshConfig.knownHostsFile ?? null,
      options: sshConfig.options ?? [],
      timeoutMs: config.mount_timeout_ms ?? sshConfig.timeout_ms ?? sshConfig.timeoutMs ?? 30_000,
    });
    const autoMount = config.auto_mount === true || config.autoMount === true || sshConfig.auto_mount === true || sshConfig.autoMount === true;
    const mountStatus = autoMount ? await mountManager.ensureMounted() : await mountManager.status();
    if (mountStatus.mounted !== true) {
      throw new Error(`SSHFS mount is not ready at ${localRoot}; set auto_mount=true or mount it first (${mountStatus.reason ?? 'not mounted'})`);
    }
    mountStartedByProcess = mountStatus.started === true;
  }
  let workspaceConnector = null;
  if (workspaceAccess === 'remote_tools') {
    if (!sshConfig || typeof sshConfig !== 'object' || Array.isArray(sshConfig)) {
      throw new Error('remote_tools mode requires an ssh object with host and remote_root');
    }
    const profiles = remoteToolsConfig.profiles ?? config.profiles ?? {};
    const authorityContext = {
      tenant_id: config.tenant_id ?? config.tenantId ?? 'local-connector',
      workspace_id: workspaceId,
      cloud_run_id: 'local-remote-tools',
      authority_run_id: 'local-remote-tools',
      revision: 1,
      phase_epoch: 'local-remote-tools',
      connection_epoch: 1,
    };
    workspaceConnector = new WorkspaceConnector({
      host: sshConfig.host,
      username: sshConfig.username ?? sshConfig.user ?? null,
      port: sshConfig.port ?? 22,
      remoteRoot,
      sshCommand: sshConfig.ssh_command ?? sshConfig.sshCommand ?? 'ssh',
      identityFile: sshConfig.identity_file ?? sshConfig.identityFile ?? null,
      knownHostsFile: sshConfig.known_hosts_file ?? sshConfig.knownHostsFile ?? null,
      authorityContext,
      profiles,
      timeoutMs: config.ssh_timeout_ms ?? sshConfig.timeout_ms ?? sshConfig.timeoutMs ?? 120_000,
    });
  }
  const settings = config.settings_file
    ? new LocalCodeAgentSettings({ settingsFile: resolve(config.settings_file) }) : null;
  const executor = new LocalCodeAgentExecutor({
    env,
    timeoutMs: config.timeout_ms,
    maxOutputBytes: config.max_output_bytes,
  });
  const service = new LocalConnectorAgentService({
    workspaceId, deviceId, localRoot, remoteRoot, executor, settings, env,
    workspaceAccess,
    workspaceConnector,
    remoteTools: workspaceAccess === 'remote_tools' ? {
      ...(remoteToolsConfig && typeof remoteToolsConfig === 'object' ? remoteToolsConfig : {}),
      allowedProfiles: remoteToolsConfig?.allowed_profiles ?? remoteToolsConfig?.allowedProfiles ?? [],
      authorityContext: workspaceConnector?.authorityContext ?? undefined,
    } : null,
    runtimeRoot: config.runtime_root ?? config.runtimeRoot,
    // Keep an idempotency record on the Connector host so a cloud timeout or
    // reconnect can replay a completed CodeAgent result instead of starting a
    // second edit/build operation. Set operation_journal=false only for an
    // explicitly disposable development Connector.
    operationJournalPath: config.operation_journal === false || config.operationJournal === false
      ? null
      : resolve(config.operation_journal_path ?? config.operationJournalPath
        ?? resolve(config.runtime_root ?? config.runtimeRoot ?? process.env.TMPDIR ?? '/tmp', 'dsh-connector-operations.json')),
    operationJournalMaxEntries: config.operation_journal_max_entries ?? config.operationJournalMaxEntries ?? 2048,
    agentCatalog: () => probeLocalAgents({ env }),
  });
  let probe;
  try {
    probe = await service.probe();
    if (probe.status !== 'ready') throw new Error(`local_root is not ready: ${probe.reason ?? 'unknown reason'}`);
  } catch (error) {
    if (mountStartedByProcess) await mountManager.unmount().catch(() => {});
    throw error;
  }
  const client = new WebSocketConnectorClient({
    url,
    deviceId,
    workspaceId,
    token: resolveSecretReference(config.token ?? config.auth_token, env) ?? env.DSH_CONNECTOR_TOKEN ?? null,
    capabilities: {
      workspace_access: workspaceAccess,
      remote_root: remoteRoot,
      agents: probe.agents,
      connector_version: '0.1.0',
      remote_tools: workspaceAccess === 'remote_tools',
      remote_workspace_reachable: probe.remote_workspace_reachable ?? null,
      remote_workspace_writable: probe.remote_workspace_writable ?? null,
    },
    reconnect: config.reconnect !== false,
    reconnectDelayMs: config.reconnect_delay_ms ?? 1000,
    commandHandler: (command, meta) => service.handleCommand(command, meta),
  });
  await client.connect();
  process.stdout.write(`${JSON.stringify({ status: 'connected', workspace_id: workspaceId, device_id: deviceId, remote_root: remoteRoot,
    workspace_access: workspaceAccess, ...(workspaceAccess === 'sshfs_mount' ? { mount_point: localRoot, mount_started: mountStartedByProcess } : { remote_tools: true }) })}\n`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    client.close();
    if (mountStartedByProcess) {
      try { await mountManager.unmount(); }
      catch (error) { process.stderr.write(`dsh-local-connector: SSHFS unmount failed: ${error.message}\n`); }
    }
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  await new Promise(() => {});
}

const entrypoint = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (entrypoint) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    usage();
    process.exitCode = 1;
  });
}
