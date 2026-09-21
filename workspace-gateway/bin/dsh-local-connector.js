#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { LocalCodeAgentExecutor } from '../../platform/apps/local-console/src/codeagent-executor.js';
import { LocalConnectorAgentService } from '../../platform/apps/local-console/src/connector-agent.js';
import { LocalCodeAgentSettings, probeLocalAgents } from '../../platform/apps/local-console/src/agents.js';
import { WebSocketConnectorClient } from '../src/connector/websocket.js';
import { SshfsMountManager } from '../src/connector/sshfs-mount.js';
import { WorkspaceConnector } from '../src/connector/workspace-connector.js';
import { HdcDeviceRelay } from '../src/connector/hdc-device-relay.js';
import { fileURLToPath } from 'node:url';

function usage() {
  process.stderr.write('Usage: dsh-local-connector --config /absolute/path/connector.json\n');
}

function sshTroubleshootingHint(diagnostic = {}) {
  const text = `${diagnostic.message ?? ''}\n${diagnostic.stderr ?? ''}`;
  if (/could not resolve hostname|name or service not known|no such host/iu.test(text)) {
    return 'SSH Host 别名未解析。检查当前 Windows 用户的 %USERPROFILE%\\.ssh\\config 中是否存在对应 Host/HostName；也可以改用 user@host 或 user@IP。';
  }
  if (/permission denied|publickey|authentication failed/iu.test(text)) {
    return '检查 SSH 用户、IdentityFile 和 ssh-agent 中是否有可用公钥；Connector 使用非交互认证，不会弹出 SSH 密码提示。';
  }
  if (/host key verification failed|remote host identification has changed/iu.test(text)) {
    return '先在 PowerShell 运行 ssh <Host别名或user@host> 校验并登记正确的 known_hosts 主机密钥，再重启 Connector。';
  }
  if (/realpath:.*(not found|command not found)|realpath: command not found/iu.test(text)) {
    return '远端缺少 realpath 命令；请在 SSH 代码端安装 coreutils 后重试。';
  }
  if (/workspace_unavailable|not a directory|no such file or directory/iu.test(text)) {
    return '检查 DSH 工作区的 remote_root 是否是 SSH 代码端真实存在的绝对目录。';
  }
  if (diagnostic.exit_code === 255) {
    return '检查 SSH 网络/端口、ProxyJump、known_hosts 和公钥认证；请确认同一 Windows 用户下的 ssh <Host别名或user@host> 可以非交互登录。';
  }
  return '';
}

function wslTroubleshootingHint(diagnostic = {}) {
  const text = `${diagnostic.message ?? ''}\n${diagnostic.stderr ?? ''}`;
  if (/there is no distribution with the supplied name|distribution .* does not exist|wsl_e_distribution_not_found/iu.test(text)) {
    return '所选 WSL 发行版已不存在；重新启动 Connector 客户端并从当前已安装的发行版列表中选择。';
  }
  if (/bash:.*(not found|no such file)|exec.*bash.*not found/iu.test(text)) {
    return '该 WSL 发行版没有可用的 bash；检查发行版安装状态，或改选已安装 Linux 的发行版。';
  }
  if (/workspace_unavailable|not a directory|no such file or directory|DSH_REMOTE_ROOT_NOT_DIRECTORY/iu.test(text)) {
    return '检查配置的源码目录是否存在于所选 WSL 发行版中，并确认它是绝对 Linux 路径。';
  }
  if (/permission denied|not writable|DSH_REMOTE_ROOT_NOT_WRITABLE/iu.test(text)) {
    return '检查所选 WSL 用户对源码目录是否有读写权限；必要时调整目录属主或权限。';
  }
  return '检查 WSL 是否已启用、所选发行版能否正常启动，以及源码目录是否可访问。';
}

export function formatConnectorStartupError(error) {
  const lines = [error?.message ?? String(error)];
  const diagnostic = error?.workspaceDiagnostic;
  if (diagnostic && typeof diagnostic === 'object') {
    const isWsl = diagnostic.transport === 'wsl';
    if (Number.isInteger(diagnostic.exit_code)) lines.push(`${isWsl ? 'WSL' : 'SSH'} exit code: ${diagnostic.exit_code}`);
    if (diagnostic.stderr) lines.push(`${isWsl ? 'WSL' : 'SSH'} stderr: ${String(diagnostic.stderr).slice(-1200)}`);
    const hint = isWsl ? wslTroubleshootingHint(diagnostic) : sshTroubleshootingHint(diagnostic);
    if (hint) lines.push(`建议：${hint}`);
  }
  return lines.join('\n');
}

export function resolveWorkspaceTransport(config = {}, platform = process.platform) {
  const configured = config.workspace_transport ?? config.workspaceTransport;
  const value = typeof configured === 'string' ? configured.trim().toLowerCase() : '';
  if (!value) {
    if (platform === 'win32') {
      throw new Error('workspace_transport is not set; start Connector with Start-DSH-Connector.cmd to choose WSL or SSH');
    }
    return 'ssh';
  }
  if (!['ssh', 'wsl'].includes(value)) throw new Error('workspace_transport must be ssh or wsl');
  return value;
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
  const workspaceTransport = resolveWorkspaceTransport(config);
  const wslDistribution = config.wsl_distribution ?? config.wslDistribution ?? null;
  if (workspaceTransport === 'wsl' && workspaceAccess !== 'remote_tools') {
    throw new Error('workspace_transport=wsl requires workspace_access=remote_tools');
  }
  if (workspaceTransport === 'wsl' && (typeof wslDistribution !== 'string' || wslDistribution.trim() === '')) {
    throw new Error('workspace_transport=wsl requires a selected wsl_distribution');
  }
  const localRoot = config.local_root ?? config.localRoot ?? sshConfig?.mount_point ?? sshConfig?.mountPoint;
  const remoteRoot = config.remote_root ?? config.remoteRoot ?? sshConfig?.remote_root ?? sshConfig?.remoteRoot;
  const hdcCommand = config.hdc_command ?? config.hdcCommand ?? process.env.DSH_HDC_CLI ?? 'hdc';
  validateSshfsConnectorConfig({ workspaceAccess, localRoot, remoteRoot, sshConfig });
  if (typeof url !== 'string' || typeof workspaceId !== 'string' || typeof deviceId !== 'string'
      || typeof remoteRoot !== 'string' || (workspaceAccess === 'sshfs_mount' && typeof localRoot !== 'string')) {
    throw new Error(workspaceAccess === 'remote_tools'
      ? (workspaceTransport === 'ssh'
        ? 'config requires url, workspace_id, device_id and remote_root; remote_tools.ssh must configure host/user'
        : 'config requires url, workspace_id, device_id, remote_root and wsl_distribution')
      : 'config requires url, workspace_id, device_id, local_root and remote_root');
  }
  const env = { ...process.env, ...(config.env && typeof config.env === 'object' ? config.env : {}) };
  const relayConfig = config.device_relay ?? config.deviceRelay ?? null;
  if (workspaceTransport === 'wsl' && relayConfig?.enabled === true) {
    throw new Error('device_relay currently requires SSH transport; use the WSL workspace profile for device probing');
  }
  const deviceRelay = relayConfig?.enabled === true ? new HdcDeviceRelay({
    enabled: true,
    host: sshConfig?.host,
    username: sshConfig?.username ?? sshConfig?.user ?? null,
    port: sshConfig?.port ?? 22,
    identityFile: sshConfig?.identity_file ?? sshConfig?.identityFile ?? null,
    knownHostsFile: sshConfig?.known_hosts_file ?? sshConfig?.knownHostsFile ?? null,
    sshCommand: sshConfig?.ssh_command ?? sshConfig?.sshCommand ?? 'ssh',
    hdcCommand: relayConfig.hdc_command ?? relayConfig.hdcCommand ?? hdcCommand,
    localPort: relayConfig.local_server_port ?? relayConfig.localServerPort ?? relayConfig.local_port ?? relayConfig.localPort ?? null,
    remotePort: relayConfig.remote_port ?? relayConfig.remotePort ?? 18_710,
    startupDelayMs: relayConfig.startup_delay_ms ?? relayConfig.startupDelayMs ?? 250,
    env,
  }) : null;
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
    if (workspaceTransport === 'ssh' && (!sshConfig || typeof sshConfig !== 'object' || Array.isArray(sshConfig))) {
      throw new Error('remote_tools mode with SSH transport requires an ssh object with host and remote_root');
    }
    const configuredProfiles = remoteToolsConfig?.profiles ?? config.profiles ?? {};
    const profiles = deviceRelay ? Object.fromEntries(Object.entries(configuredProfiles).map(([profileId, profile]) => [profileId, {
      ...profile,
      env: { ...(profile?.env ?? {}), HDC_HOST_OVERRIDE: `127.0.0.1:${deviceRelay.remotePort}` },
    }])) : configuredProfiles;
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
      transport: workspaceTransport,
      host: workspaceTransport === 'ssh' ? sshConfig.host : null,
      username: workspaceTransport === 'ssh' ? (sshConfig.username ?? sshConfig.user ?? null) : null,
      port: sshConfig?.port ?? 22,
      remoteRoot,
      sshCommand: sshConfig?.ssh_command ?? sshConfig?.sshCommand ?? 'ssh',
      wslDistribution,
      wslCommand: config.wsl_command ?? config.wslCommand ?? 'wsl.exe',
      identityFile: sshConfig?.identity_file ?? sshConfig?.identityFile ?? null,
      knownHostsFile: sshConfig?.known_hosts_file ?? sshConfig?.knownHostsFile ?? null,
      authorityContext,
      profiles,
      timeoutMs: config.ssh_timeout_ms ?? sshConfig?.timeout_ms ?? sshConfig?.timeoutMs ?? 120_000,
    });
  }
  const settings = config.settings_file
    ? new LocalCodeAgentSettings({ settingsFile: resolve(config.settings_file) }) : null;
  const agentEnv = deviceRelay ? {
    ...env,
    HDC_HOST_OVERRIDE: `127.0.0.1:${deviceRelay.localPort}`,
    OHOS_HDC_SERVER_PORT: String(deviceRelay.localPort),
  } : env;
  const executor = new LocalCodeAgentExecutor({
    env: agentEnv,
    timeoutMs: config.timeout_ms,
    maxOutputBytes: config.max_output_bytes,
  });
  const service = new LocalConnectorAgentService({
    workspaceId, deviceId, localRoot, remoteRoot, executor, settings, env: agentEnv,
    hdcCommand,
    hdcTimeoutMs: config.hdc_timeout_ms ?? config.hdcTimeoutMs ?? 4000,
    deviceRelay,
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
    if (deviceRelay) await deviceRelay.start();
    probe = await service.probe();
    if (probe.status !== 'ready') {
      throw Object.assign(new Error(`local_root is not ready: ${probe.reason ?? 'unknown reason'}`), {
        workspaceDiagnostic: probe.remote_workspace_diagnostic ?? null,
      });
    }
  } catch (error) {
    await deviceRelay?.stop().catch(() => {});
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
      workspace_transport: workspaceTransport,
      ...(workspaceTransport === 'wsl' ? { wsl_distribution: wslDistribution } : {}),
      remote_root: remoteRoot,
      agents: probe.agents,
      workflows: probe.workflows,
      connector_version: '0.1.0',
      remote_tools: workspaceAccess === 'remote_tools',
      remote_workspace_reachable: probe.remote_workspace_reachable ?? null,
      remote_workspace_writable: probe.remote_workspace_writable ?? null,
      device_probe: probe.device_probe ?? null,
      ...(probe.device_relay ? { device_relay: probe.device_relay } : {}),
    },
    reconnect: config.reconnect !== false,
    reconnectDelayMs: config.reconnect_delay_ms ?? 1000,
    commandHandler: (command, meta) => service.handleCommand(command, meta),
  });
  await client.connect();
  process.stdout.write(`${JSON.stringify({ status: 'connected', workspace_id: workspaceId, device_id: deviceId, remote_root: remoteRoot,
    workspace_transport: workspaceTransport, ...(workspaceTransport === 'wsl' ? { wsl_distribution: wslDistribution } : {}),
    workspace_access: workspaceAccess, ...(workspaceAccess === 'sshfs_mount' ? { mount_point: localRoot, mount_started: mountStartedByProcess } : { remote_tools: true }) })}\n`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    client.close();
    await deviceRelay?.stop().catch((error) => process.stderr.write(`dsh-local-connector: HDC relay shutdown failed: ${error.message}\n`));
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
    process.stderr.write(`${formatConnectorStartupError(error)}\n`);
    if (error?.message === 'connector config path is required') usage();
    process.exitCode = 1;
  });
}
