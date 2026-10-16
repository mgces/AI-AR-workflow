import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { detectEnvironment } from '../../../packages/contracts/src/environment-profile.js';
import { createAuthorityEnvelope } from '../../../../workspace-gateway/src/authority/envelope.js';
import { WorkspaceConnector } from '../../../../workspace-gateway/src/connector/workspace-connector.js';
import { DurableResourceLockStore } from '../../../../workspace-gateway/src/supervisor/resource-locks.js';
import { ConnectorWorkspaceGatewayClient } from './connector-workspace-gateway.js';
import { ConnectorCodeAgentExecutor } from './connector-codeagent-executor.js';
import { LocalConnectorAgentService } from './connector-agent.js';
import { RemotePythonDeliveryAdapter } from './remote-delivery-adapter.js';
import { RemoteDebugSurface } from './debug.js';
import { REQUIRED_AR_GATE_SCRIPTS, evaluatePrerequisites } from './preflight.js';

const MAX_WORKFLOW_FILES = 128;
const MAX_WORKFLOW_BYTES = 4 * 1024 * 1024;
const INSTALL_RELATIVE = '.dsh/workflows/ar-delivery/current';
const AUTHORITY_SIGNATURE = Object.freeze({ key_id: 'local-connector', value: 'local-capability' });
const GATE_PATHS = Object.freeze([
  'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py',
  'workspace-gateway/bin/dsh-ar-delivery.js',
  'workspace-gateway/bin/dsh-ar-gate.js',
  'workspace-gateway/bin/dsh-device-probe.js',
]);
const REQUIRED_SUPPORT_FILES = Object.freeze([
  'skills/ohos-ar-dev-phases/scripts/lib/gatelib.py',
  'skills/ohos-ar-dev-phases/scripts/lib/environments.py',
]);
const REQUIRED_BUNDLE_FILES = Object.freeze([
  ...REQUIRED_AR_GATE_SCRIPTS.map((name) => `skills/ohos-ar-dev-phases/scripts/${name}`),
  ...REQUIRED_SUPPORT_FILES,
  ...GATE_PATHS,
]);
const PROFILE_IDS = Object.freeze({
  init: 'ar.delivery.init', inspect: 'ar.delivery.inspect', validate: 'ar.delivery.validate',
  advance: 'ar.delivery.advance', consent: 'ar.delivery.consent', failureSnapshot: 'ar.delivery.failure_snapshot',
});
const TERMINAL_RUN_STATES = new Set(['completed', 'failed', 'cancelled', 'blocked', 'needs_repair']);

function fail(code, message, details = {}) {
  throw Object.assign(new Error(message), { code, details });
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function workflowDigest(files) {
  return sha256(files.map((file) => `${file.path}\0${file.sha256}\0${file.bytes}`).join('\n'));
}

function safeWorkspaceId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/u.test(value)) {
    fail('workspace_configuration_invalid', 'workspace_id is invalid');
  }
  return value;
}

function remoteAbsolute(root, requested, field) {
  if (typeof requested !== 'string' || requested.trim() === '' || requested.includes('\\') || /[\0\r\n]/u.test(requested)) {
    fail('remote_workspace_invalid', `${field} must be a POSIX path`);
  }
  const path = posix.normalize(posix.isAbsolute(requested) ? requested : posix.join(root, requested));
  const base = posix.normalize(root);
  if (path !== base && !path.startsWith(`${base === '/' ? '' : base}/`)) {
    fail('remote_workspace_outside_root', `${field} must stay inside the configured workspace`, { root: base, path });
  }
  return path;
}

function remoteRelative(root, candidate, field) {
  const path = remoteAbsolute(root, candidate, field);
  return path === root ? '.' : posix.relative(root, path);
}

function inside(root, candidate) {
  const remainder = relative(root, candidate);
  return remainder === '' || (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !remainder.startsWith(sep));
}

async function walkFiles(root, current = root) {
  const result = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.name === '__pycache__' || entry.name === '.pytest_cache' || entry.name.endsWith('.pyc') || entry.name.endsWith('.pyo')) continue;
    const path = join(current, entry.name);
    if (entry.isSymbolicLink()) fail('workflow_bundle_symlink_rejected', 'staged AR workflow bundle may not contain symlinks', { path });
    if (entry.isDirectory()) result.push(...await walkFiles(root, path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

/**
 * Build the small code-host installation archive from the packaged DSH runtime.
 * It contains only the AR gate scripts, Python evidence bridge and three fixed
 * launchers; it never copies the desktop, Local Core, or user's source tree.
 */
export async function createArWorkflowInstallBundle(runtimeRoot) {
  const root = resolve(runtimeRoot);
  const scriptsRoot = join(root, 'skills/ohos-ar-dev-phases/scripts');
  const selected = new Set();
  for (const path of await walkFiles(scriptsRoot)) selected.add(relative(root, path).split(sep).join('/'));
  for (const path of GATE_PATHS) selected.add(path);
  const allSelected = [...selected].sort();
  const missing = REQUIRED_BUNDLE_FILES.filter((path) => !selected.has(path) || !existsSync(join(root, path)));
  if (missing.length) fail('workflow_bundle_incomplete', 'the staged AR workflow gate bundle is incomplete', { missing });
  if (allSelected.length > MAX_WORKFLOW_FILES) {
    fail('workflow_bundle_too_large', 'the staged AR workflow has too many files to install', { file_count: allSelected.length, max_files: MAX_WORKFLOW_FILES });
  }

  let stagedManifest = null;
  try {
    stagedManifest = JSON.parse(await readFile(join(root, 'bundle-manifest.json'), 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') fail('workflow_bundle_manifest_invalid', 'the staged DSH runtime manifest is invalid');
    // Development checkouts are supported for local development. Packaged
    // clients always include bundle-manifest.json from runtime-bundle staging.
  }
  const files = [];
  let bytes = 0;
  for (const path of allSelected) {
    const absolute = resolve(root, path);
    if (!inside(root, absolute)) fail('workflow_bundle_path_invalid', 'staged workflow path escapes runtime root', { path });
    const info = await lstat(absolute);
    if (!info.isFile() || info.isSymbolicLink()) fail('workflow_bundle_file_invalid', 'staged workflow entries must be regular files', { path });
    const contentBytes = await readFile(absolute);
    const content = contentBytes.toString('utf8');
    if (content.includes('\0')) fail('workflow_bundle_binary_not_supported', 'AR gate bundle contains a binary file', { path });
    const digest = sha256(contentBytes);
    if (stagedManifest && stagedManifest.files?.[path] !== digest) {
      fail('workflow_bundle_integrity_failed', 'staged file does not match the runtime manifest', { path });
    }
    bytes += contentBytes.length;
    if (bytes > MAX_WORKFLOW_BYTES) {
      fail('workflow_bundle_too_large', 'the staged AR workflow exceeds the remote install limit', { bytes, max_bytes: MAX_WORKFLOW_BYTES });
    }
    files.push({ path, content, bytes: contentBytes.length, sha256: digest });
  }
  return {
    schema_version: 1,
    id: 'ar-delivery',
    name: 'AR workflow gates',
    install_path: INSTALL_RELATIVE,
    files,
    bytes,
    sha256: workflowDigest(files),
  };
}

function makeWorkspaceProfiles(remoteRoot) {
  const installRoot = posix.join(remoteRoot, INSTALL_RELATIVE);
  const helper = posix.join(installRoot, 'workspace-gateway/bin/dsh-ar-delivery.js');
  const gateRunner = posix.join(installRoot, 'workspace-gateway/bin/dsh-ar-gate.js');
  const deviceProbe = posix.join(installRoot, 'workspace-gateway/bin/dsh-device-probe.js');
  const scripts = posix.join(installRoot, 'skills/ohos-ar-dev-phases/scripts');
  const bridge = posix.join(installRoot, 'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py');
  const profile = (args, extra = {}) => ({
    command: 'node', args, resource_lock: 'workspace', capabilities: ['workspace_write'], ...extra,
  });
  const common = ['--repo-root', '{{repo_root}}', '--scripts-root', '{{scripts_root}}', '--bridge-path', '{{bridge_path}}', '--pipeline-dir', '{{pipeline_dir}}'];
  return {
    [PROFILE_IDS.init]: profile([
      helper, 'init', '--repo-root', '{{repo_root}}', '--run-id', '{{run_id}}', '--pipeline-dir', '{{pipeline_dir}}',
      '--scripts-root', '{{scripts_root}}', '--bridge-path', '{{bridge_path}}', '--environment', '{{environment}}',
      '--git-dir', '{{git_dir}}', '--build-target', '{{build_target}}', '--part', '{{part}}',
      '--device-serial', '{{device_serial}}', '--device-type', '{{device_type}}', '--component-type', '{{component_type}}',
      '--base-commit', '{{base_commit}}', '--agent', '{{agent}}', '--model', '{{model}}', '--confirm-defaults', '{{confirm_defaults}}',
    ]),
    [PROFILE_IDS.inspect]: profile([helper, 'inspect', ...common]),
    [PROFILE_IDS.validate]: profile([helper, 'validate', ...common, '--phase', '{{phase}}', '--upload-precheck', '{{upload_precheck}}']),
    [PROFILE_IDS.advance]: profile([helper, 'advance', ...common, '--phase', '{{phase}}']),
    [PROFILE_IDS.consent]: profile([helper, 'consent', ...common, '--phase', '{{phase}}', '--token', '{{token}}']),
    [PROFILE_IDS.failureSnapshot]: profile([helper, 'failure-snapshot', ...common]),
    'ar.gate.current': {
      command: 'python3', args: [gateRunner, '--run-id', '{{run_id}}'],
      authority_variables: ['run_id'], resource_lock: 'workspace',
      capabilities: ['workspace_write', 'build_execution', 'device_access', 'network_publish'],
    },
    'debug.device_probe': {
      command: 'node', args: [deviceProbe], resource_lock: 'device',
      capabilities: ['device_access'],
    },
    'runtime.python': { command: 'python3', args: ['--version'], capabilities: [] },
    'runtime.git': { command: 'git', args: ['--version'], capabilities: [] },
    'runtime.node': { command: 'node', args: ['--version'], capabilities: [] },
  };
}

function makeAuthority(workspaceId, runId, operationKind, payload) {
  const safeRun = typeof runId === 'string' && /^[A-Za-z0-9._-]{1,128}$/u.test(runId) ? runId : `probe-${randomUUID()}`;
  const fields = {
    tenant_id: 'local-connector', workspace_id: workspaceId,
    cloud_run_id: safeRun, authority_run_id: `authority-${safeRun}`,
    revision: 1, phase_epoch: `phase-${safeRun}`, connection_epoch: 1,
    message_type: 'operation.start', operation_id: `${operationKind.replaceAll('.', '-')}-${randomUUID()}`,
    nonce: randomUUID(), sent_at: new Date().toISOString(),
    payload: { operation_kind: operationKind, ...payload }, signature: AUTHORITY_SIGNATURE,
  };
  return createAuthorityEnvelope(fields);
}

function unwrap(result) {
  if (result?.status === 'completed' && result.result && typeof result.result === 'object') return result.result;
  if (result?.status === 'failed') fail(result.error?.code ?? 'workspace_operation_failed', result.error?.message ?? 'remote workspace operation failed', result.error?.details ?? {});
  return result;
}

function environmentLabel(environment, componentType) {
  return environment === 'harmonyos' ? `harmonyos/${componentType ?? ''}` : environment ?? 'unresolved';
}

function sourceMarkerStatus({ selected, componentType, markers }) {
  const expected = selected === 'openharmony'
    ? ['openharmony_build', 'openharmony_developer_test', 'openharmony_developer_test_start']
    : selected === 'harmonyos' && componentType === 'system' ? ['harmonyos_system_build']
      : selected === 'harmonyos' && componentType === 'chip' ? ['harmonyos_chip_build'] : [];
  const missing = expected.filter((key) => markers[key] !== true);
  return {
    status: expected.length > 0 && missing.length === 0 ? 'pass' : 'blocked',
    source_layout_verified: expected.length > 0 && missing.length === 0,
    expected, missing,
    reason: expected.length === 0 ? 'environment_selection_required' : missing.length ? 'source_layout_markers_missing' : null,
    markers,
  };
}

export function createWorkspaceExecutionRuntime({
  workspace,
  runtimeRoot,
  stateDirectory,
  localAgentExecutor,
  agentCatalog,
  settings = null,
  codeAgentEnv = process.env,
  processSupervisor = null,
  runtimeDatabase = null,
  commandRunner = undefined,
  remoteToolsBrokerFactory = null,
  workflowBundleLoader = createArWorkflowInstallBundle,
  timeoutMs = 15 * 60 * 1000,
} = {}) {
  if (!workspace || typeof workspace !== 'object') throw new TypeError('workspace is required');
  const workspaceId = safeWorkspaceId(workspace.workspace_id);
  const remoteRoot = typeof workspace.code_root === 'string' ? workspace.code_root : '';
  if (!posix.isAbsolute(remoteRoot)) fail('remote_workspace_invalid', 'remote code root must be an absolute POSIX path');
  const transport = workspace.transport;
  const connection = workspace.connection ?? {};
  if (!['wsl', 'ssh'].includes(transport)) fail('workspace_transport_invalid', 'remote execution requires WSL or SSH');
  if (transport === 'wsl' && (typeof connection.target !== 'string' || connection.target.startsWith('-'))) {
    fail('workspace_transport_invalid', 'a detected WSL distribution is required');
  }
  if (transport === 'ssh' && (typeof connection.target !== 'string' || connection.target.trim() === '')) {
    fail('workspace_transport_invalid', 'an SSH Host alias or user@host is required');
  }
  if (!localAgentExecutor || typeof localAgentExecutor.run !== 'function') throw new TypeError('localAgentExecutor.run is required');
  if (typeof workflowBundleLoader !== 'function') throw new TypeError('workflowBundleLoader must be a function');
  const lockStore = new DurableResourceLockStore({ db: runtimeDatabase, ownerNamespace: `workspace-${workspaceId}` });
  const authorityContext = { tenant_id: 'local-connector', workspace_id: workspaceId };
  const profiles = makeWorkspaceProfiles(remoteRoot);
  const workspaceConnector = new WorkspaceConnector({
    transport,
    ...(transport === 'ssh' ? {
      host: connection.target,
      username: null,
      port: Number.isInteger(connection.port) ? connection.port : null,
    } : { wslDistribution: connection.target }),
    remoteRoot,
    authorityContext,
    profiles,
    commandRunner,
    processSupervisor,
    journalDb: runtimeDatabase,
    resourceLocks: lockStore,
    timeoutMs,
  });

  let localConnectorAgent;
  const directConnector = {
    async snapshot() {
      return {
        workspaces: [{
          workspace_id: workspaceId, device_id: `local-${workspaceId}`, connected: true,
          capabilities: { workspace_access: 'remote_tools' },
        }],
      };
    },
    async request(requestWorkspaceId, command, options = {}) {
      if (requestWorkspaceId !== workspaceId) fail('connector_workspace_mismatch', 'workspace_id does not match the configured remote workspace');
      if (options.signal?.aborted) fail('connector_aborted', 'workspace request was cancelled');
      return localConnectorAgent.handleCommand(command, { id: command?.payload?.operation_id ?? null });
    },
  };
  localConnectorAgent = new LocalConnectorAgentService({
    workspaceId,
    deviceId: `local-${workspaceId}`,
    remoteRoot,
    workspaceAccess: 'remote_tools',
    workspaceConnector,
    executor: localAgentExecutor,
    agentCatalog,
    settings,
    env: codeAgentEnv,
    runtimeRoot: resolve(stateDirectory, 'remote-tools'),
    operationJournalPath: resolve(stateDirectory, `connector-operations-${workspaceId}.json`),
    remoteTools: { allowedProfiles: ['ar.gate.current'], mcpConfigFormat: 'auto' },
    remoteToolsBrokerFactory,
  });
  const gateway = new ConnectorWorkspaceGatewayClient({ connector: directConnector, workspaceId, timeoutMs });
  const deliveryAdapter = new RemotePythonDeliveryAdapter({
    gateway,
    remoteRoot,
    authorityContext: {
      tenant_id: 'local-connector', workspace_id: workspaceId,
      cloud_run_id: `workspace-${workspaceId}`, authority_run_id: `authority-workspace-${workspaceId}`,
      revision: 1, phase_epoch: 'phase-workspace-runtime', connection_epoch: 1,
    },
    signature: AUTHORITY_SIGNATURE,
    profiles: PROFILE_IDS,
    scriptsRoot: posix.join(remoteRoot, INSTALL_RELATIVE, 'skills/ohos-ar-dev-phases/scripts'),
    bridgePath: posix.join(remoteRoot, INSTALL_RELATIVE, 'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py'),
  });
  const codeAgentExecutor = new ConnectorCodeAgentExecutor({
    connector: directConnector,
    workspaceId,
    remoteRoot,
    timeoutMs,
  });
  const debug = new RemoteDebugSurface({
    gateway, remoteRoot,
    authorityContext: {
      tenant_id: 'local-connector', workspace_id: workspaceId,
      cloud_run_id: `workspace-${workspaceId}`, authority_run_id: `authority-workspace-${workspaceId}`,
      revision: 1, phase_epoch: 'phase-workspace-runtime', connection_epoch: 1,
    },
    signature: AUTHORITY_SIGNATURE,
    deviceProfile: 'debug.device_probe',
  });
  let bundlePromise = null;
  async function bundle() {
    bundlePromise ??= Promise.resolve().then(() => workflowBundleLoader(runtimeRoot));
    return bundlePromise;
  }
  async function operation(kind, payload, runId = `probe-${workspaceId}`) {
    return unwrap(await gateway.execute(makeAuthority(workspaceId, runId, kind, payload)));
  }

  async function ensureWorkflowInstalled() {
    const expected = await bundle();
    const listed = await localConnectorAgent.handleCommand({ kind: 'workflow.list', payload: { workspace_id: workspaceId } });
    const record = listed?.installed?.find((item) => item.id === expected.id && item.sha256 === expected.sha256);
    if (record) {
      try {
        const manifestFile = await operation('workspace.read', { path: posix.join(INSTALL_RELATIVE, 'manifest.json') });
        const remoteManifest = JSON.parse(String(manifestFile?.content ?? ''));
        if (remoteManifest.id === expected.id && remoteManifest.sha256 === expected.sha256) return record;
      } catch { /* local install record is stale; send the verified bundle again */ }
    }
    return localConnectorAgent.handleCommand({
      kind: 'workflow.install',
      payload: { workspace_id: workspaceId, bundle: expected },
    });
  }

  async function runProfile(profileId, variables = {}, runId = `probe-${workspaceId}`) {
    return operation('workspace.exec_profile', { profile_id: profileId, variables }, runId);
  }

  async function remoteProbe(path, { expect = 'file', requireWrite = false, requireExecutable = false } = {}, runId = `probe-${workspaceId}`) {
    return operation('workspace.probe', { path, expect, require_write: requireWrite, require_executable: requireExecutable }, runId);
  }

  async function probe({ environment = null, componentType = null } = {}) {
    const errors = [];
    let rootProbe = null;
    try {
      await gateway.health();
      rootProbe = await remoteProbe('.', { expect: 'directory', requireWrite: true });
    } catch (error) {
      errors.push({ code: error?.code ?? 'workspace_unreachable', message: error?.message ?? 'remote workspace unavailable' });
    }
    if (!rootProbe?.reachable || !rootProbe?.readable || !rootProbe?.writable) {
      return {
        status: 'unreachable', transport, workspace_id: workspaceId,
        workspace_root: remoteRoot, workspace_reachable: false, workspace_writable: false,
        device_probe: { status: 'unavailable', targets: [], source: transport },
        workflow: { installed: false, reason: errors[0]?.code ?? 'workspace_unreachable' },
        capabilities: { workspace_access: 'remote_tools', build_execution: false, device_access: false, network_publish: false },
        errors,
      };
    }

    let installed = null;
    try { installed = await ensureWorkflowInstalled(); }
    catch (error) { errors.push({ code: error?.code ?? 'workflow_install_failed', message: error?.message ?? 'workflow install failed' }); }
    const runtimeChecks = {};
    for (const [key, profile] of [['python', 'runtime.python'], ['git', 'runtime.git'], ['node', 'runtime.node']]) {
      try {
        const value = await runProfile(profile);
        runtimeChecks[key] = { status: value.exit_code === 0 ? 'available' : 'failed', version: String(value.stdout ?? '').trim().slice(0, 256) };
      } catch (error) {
        runtimeChecks[key] = { status: 'missing', reason: error?.code ?? 'probe_failed' };
      }
    }
    let deviceProbe = { status: 'missing', targets: [], source: transport };
    try {
      const value = await runProfile('debug.device_probe');
      const parsed = JSON.parse(String(value.stdout ?? ''));
      deviceProbe = { ...parsed, targets: Array.isArray(parsed.targets) ? parsed.targets : [], source: transport };
    } catch (error) {
      deviceProbe = { status: 'probe_failed', targets: [], source: transport, reason: error?.code ?? 'hdc_probe_failed' };
    }
    const bundleReady = Boolean(installed?.status === 'installed' && installed.sha256);
    const runtimeReady = ['python', 'git', 'node'].every((key) => runtimeChecks[key]?.status === 'available');
    const status = bundleReady && runtimeReady ? 'available' : 'incomplete';
    return {
      status, transport, workspace_id: workspaceId, workspace_root: remoteRoot,
      workspace_reachable: true, workspace_writable: true,
      device_probe: deviceProbe,
      workflow: { installed: bundleReady, id: installed?.id ?? 'ar-delivery', sha256: installed?.sha256 ?? null,
        file_count: installed?.file_count ?? null, bytes: installed?.bytes ?? null },
      runtime: runtimeChecks,
      capabilities: {
        workspace_access: 'remote_tools',
        build_execution: bundleReady && runtimeReady,
        device_access: bundleReady && runtimeReady && deviceProbe.status === 'available',
        network_publish: false,
      },
      errors,
    };
  }

  async function preflight(input = {}) {
    const workspaceRoot = remoteRoot;
    const requestedRoot = input.repo_root ?? input.source_root ?? workspaceRoot;
    let sourceRoot;
    try { sourceRoot = remoteAbsolute(workspaceRoot, requestedRoot, 'repo_root'); }
    catch (error) {
      return evaluatePrerequisites({
        workspaceMode: 'local_connector', remoteRoot: workspaceRoot, repoRoot: requestedRoot,
        workspace: { configured: true, reachable: true, writable: true, path: requestedRoot },
        transport: { configured: true, reachable: true },
        connector: { configured: true, reachable: true, workspace_id: workspaceId, workspace_access: 'remote_tools' },
        runtime: { node: { status: 'pass', version: process.versions.node }, python: { status: 'blocked' }, git: { status: 'blocked' } },
        workflow: { scripts: false, profiles: false, bridge: false, required: REQUIRED_AR_GATE_SCRIPTS, missing: [...REQUIRED_AR_GATE_SCRIPTS] },
        agent: { id: input.agent, available: false, dispatchable: false, execution_mode: 'local_connector', source: 'local_connector' },
        environment: { selected: input.environment, component_type: input.component_type, device_type: input.device_type },
        publication: {}, arInput: { status: 'blocked', reason: error.code },
      });
    }

    const live = await probe();
    const markers = {};
    const markerSpecs = {
      openharmony_build: ['build.sh', 'file', true],
      openharmony_developer_test: ['test/testfwk/developer_test', 'directory', true],
      openharmony_developer_test_start: ['test/testfwk/developer_test/start.sh', 'file', true],
      harmonyos_system_build: ['build_system.sh', 'file', false],
      harmonyos_chip_build: ['build_vendor.sh', 'file', false],
    };
    for (const [key, [path, expected, executable]] of Object.entries(markerSpecs)) {
      try {
        const result = await remoteProbe(posix.relative(remoteRoot, posix.join(sourceRoot, path)), {
          expect: expected, requireExecutable: executable,
        });
        markers[key] = result.reachable === true && result.readable === true
          && (!executable || result.executable === true);
      } catch { markers[key] = false; }
    }
    const detected = detectEnvironment({
      openharmony: markers.openharmony_build && markers.openharmony_developer_test,
      harmonyos_system: markers.harmonyos_system_build,
      harmonyos_chip: markers.harmonyos_chip_build,
    });
    const selected = input.environment ?? (detected.status === 'detected' ? detected.environment : null);
    const componentType = selected === 'harmonyos' ? input.component_type ?? detected.component_type ?? null : null;
    const sourceLayout = sourceMarkerStatus({ selected, componentType, markers });
    const selectedAgent = String(input.agent ?? 'claude-code');
    let agentStatus;
    try {
      const snapshot = await localConnectorAgent.handleCommand({ kind: 'probe', payload: { workspace_id: workspaceId } });
      const key = selectedAgent === 'claude-code' ? 'claude_code' : selectedAgent;
      const agent = snapshot.agents?.[key] ?? snapshot.agents?.[selectedAgent];
      agentStatus = {
        id: selectedAgent,
        available: agent?.available === true,
        dispatchable: agent?.dispatchable === true,
        execution_mode: 'local_connector', source: 'local_connector',
        workspace_access: 'remote_tools', supports_remote_tools: true,
        version: agent?.version ?? null,
        reason: agent?.reason ?? null,
      };
    } catch (error) {
      agentStatus = { id: selectedAgent, available: false, dispatchable: false,
        execution_mode: 'local_connector', source: 'local_connector', workspace_access: 'remote_tools',
        supports_remote_tools: true, reason: error?.code ?? 'connector_probe_failed' };
    }
    const gateChecks = {};
    const installedScripts = posix.join(INSTALL_RELATIVE, 'skills/ohos-ar-dev-phases/scripts');
    for (const script of REQUIRED_AR_GATE_SCRIPTS) {
      try {
        gateChecks[script] = (await remoteProbe(posix.join(installedScripts, script), { expect: 'file' })).reachable === true;
      } catch { gateChecks[script] = false; }
    }
    for (const support of [
      'lib/gatelib.py', 'lib/environments.py',
    ]) {
      try { gateChecks[support] = (await remoteProbe(posix.join(installedScripts, support), { expect: 'file' })).reachable === true; }
      catch { gateChecks[support] = false; }
    }
    const bridgePath = posix.join(INSTALL_RELATIVE, 'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py');
    try { gateChecks.bridge = (await remoteProbe(bridgePath, { expect: 'file' })).reachable === true; }
    catch { gateChecks.bridge = false; }
    const missing = Object.entries(gateChecks).filter(([, ok]) => !ok).map(([name]) => name);
    const scriptsReady = missing.length === 0 && live.workflow.installed === true;
    const deviceSerials = (live.device_probe.targets ?? []).filter((item) => ['device', 'connected', 'online'].includes(String(item.state ?? '').toLowerCase()));
    let arInput = { status: 'blocked', source: null, path: null, reason: 'ar_input_required' };
    if (typeof input.ar_text === 'string' && input.ar_text.trim()) {
      arInput = { status: 'pass', source: 'inline', bytes: Buffer.byteLength(input.ar_text, 'utf8'), path: null, reason: null };
    } else if (typeof input.ar_path === 'string' && input.ar_path.trim()) {
      try {
        const path = remoteAbsolute(sourceRoot, input.ar_path, 'ar_path');
        const value = await operation('workspace.read', { path: posix.relative(remoteRoot, path) });
        arInput = String(value.content ?? '').trim()
          ? { status: 'pass', source: 'file', path, bytes: Buffer.byteLength(value.content, 'utf8'), reason: null }
          : { status: 'blocked', source: 'file', path, reason: 'ar_input_empty' };
      } catch (error) { arInput = { status: 'blocked', source: 'file', path: input.ar_path, reason: error.code ?? 'ar_input_unreadable' }; }
    }
    const runtimeStatus = live.runtime ?? {};
    return evaluatePrerequisites({
      workspaceMode: 'local_connector', repoRoot: sourceRoot, remoteRoot: workspaceRoot,
      workspace: { configured: true, reachable: live.workspace_reachable, writable: live.workspace_writable, path: sourceRoot },
      transport: { configured: true, reachable: live.workspace_reachable && live.workspace_writable },
      connector: {
        configured: true, reachable: live.status === 'available', workspace_id: workspaceId,
        device_id: `local-${workspaceId}`, workspace_access: 'remote_tools',
        remote_workspace_reachable: live.workspace_reachable,
        remote_workspace_writable: live.workspace_writable,
        remote_tools: true,
        reason: live.status === 'available' ? null : 'workspace_runtime_incomplete',
      },
      runtime: {
        node: { status: 'pass', version: process.versions.node, source: 'local_core' },
        python: { status: runtimeStatus.python?.status === 'available' ? 'pass' : 'blocked', version: runtimeStatus.python?.version, reason: runtimeStatus.python?.reason },
        git: { status: runtimeStatus.git?.status === 'available' ? 'pass' : 'blocked', version: runtimeStatus.git?.version, reason: runtimeStatus.git?.reason },
        hdc: { status: live.device_probe.status === 'available' ? 'pass' : 'blocked', reason: live.device_probe.reason ?? null, command: live.device_probe.command ?? 'hdc' },
      },
      workflow: {
        scripts: scriptsReady, profiles: scriptsReady, bridge: gateChecks.bridge === true,
        required: [...REQUIRED_AR_GATE_SCRIPTS], missing, source_layout: sourceLayout,
      },
      agent: agentStatus,
      environment: {
        selected, component_type: componentType,
        device_type: input.device_type ?? null,
        profile_bound: false,
        source_layout_markers: Object.entries(markers).filter(([, value]) => value).map(([name]) => name),
        source_layout_verified: sourceLayout.source_layout_verified,
      },
      device: {
        configured: Boolean(input.device_serial || input.device_type || deviceSerials.length > 0),
        reachable: live.device_probe.status === 'available',
        serial: input.device_serial ?? (deviceSerials.length === 1 ? deviceSerials[0].id : null),
        source: transport,
        observed_status: live.device_probe.status,
        reason: live.device_probe.reason ?? null,
      },
      publication: {
        configured: Boolean(input.publication?.backend && (input.publication.repo_slug || input.publication.project || input.publication.target) && input.publication.branch),
        authenticated: false,
        backend: input.publication?.backend ?? null,
        target: input.publication?.repo_slug ?? input.publication?.project ?? input.publication?.target ?? null,
      },
      arInput,
    });
  }

  async function runCodeAgent({ provider_id, model = null, session_id, workspace_root, system = '', messages = [] } = {}, { signal, context } = {}) {
    if (!context || typeof context !== 'object' || Array.isArray(context)) fail('codeagent_session_unbound', 'CodeAgent session is not bound to an active AR run');
    const providerId = String(provider_id ?? '');
    if (!['claude-code', 'opencode', 'codex', 'custom'].includes(providerId)) fail('codeagent_provider_invalid', 'unsupported local CodeAgent provider');
    const boundWorkspaceRoot = remoteAbsolute(remoteRoot, workspace_root, 'workspace_root');
    if (boundWorkspaceRoot !== remoteRoot || context.workspace_root !== remoteRoot) {
      fail('codeagent_workspace_mismatch', 'CodeAgent workspace_root does not match its active AR run');
    }
    if (typeof session_id !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/u.test(session_id)) fail('codeagent_session_invalid', 'CodeAgent session_id is invalid');
    const lines = [];
    if (typeof system === 'string' && system.trim()) lines.push(`System instructions:\n${system.trim()}`);
    for (const message of messages) {
      if (!message || !['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string') continue;
      lines.push(`${message.role.toUpperCase()}:\n${message.content}`);
    }
    if (lines.length === 0) fail('codeagent_messages_empty', 'CodeAgent request contains no messages');
    const prompt = lines.join('\n\n');
    const definition = { id: providerId, ...(typeof model === 'string' && model.trim() ? { model: model.trim() } : {}) };
    const result = await codeAgentExecutor.run({
      definition,
      context: {
        ...context,
        workspace_root: remoteRoot,
        pipeline_dir: remoteAbsolute(remoteRoot, context.pipeline_dir, 'pipeline_dir'),
        run_id: context.run_id,
        attempt_id: context.attempt_id ?? session_id,
        phase: context.phase,
        analysis_mode: true,
        prompt_override: prompt,
      },
      signal,
    });
    return {
      output: result.summary ?? result.stdout ?? 'CodeAgent task completed',
      stderr: result.stderr ?? '',
      ...(result.usage ? { usage: result.usage } : {}),
      duration_ms: result.durationMs ?? 0,
      artifact_refs: result.artifactRefs ?? [],
      invocation: result.invocation ?? { execution: 'local_connector', workspace_mode: 'remote_tools', provider: providerId, model },
    };
  }

  async function probeAgent({ provider_id, model = null } = {}) {
    const status = await localConnectorAgent.handleCommand({ kind: 'probe', payload: { workspace_id: workspaceId } });
    const key = provider_id === 'claude-code' ? 'claude_code' : provider_id;
    const agent = status.agents?.[key] ?? status.agents?.[provider_id];
    if (!agent?.available || !agent?.dispatchable) fail('codeagent_unavailable', `local CodeAgent ${provider_id} is unavailable`, { status: agent?.status ?? 'missing' });
    return { available: true, status: agent.status ?? 'available', version: agent.version ?? null, provider_id, model };
  }

  return {
    workspaceId, transport, remoteRoot,
    workspaceConnector, localConnectorAgent, gateway, deliveryAdapter, codeAgentExecutor, debug,
    ensureWorkflowInstalled, probe, preflight, runCodeAgent, probeAgent,
  };
}

export { PROFILE_IDS, TERMINAL_RUN_STATES };
