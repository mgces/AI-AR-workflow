import { execFile as execFileCallback } from 'node:child_process';
import { accessSync, constants, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { prepareCommandInvocation, resolveCommandPath } from './command.js';

const execFile = promisify(execFileCallback);

/**
 * The preflight response is intentionally separate from the authoritative P0
 * gate.  It answers two operator questions before a run is created:
 *
 *   1. can this host dispatch P0 at all; and
 *   2. which prerequisites are still needed before P8 can complete.
 *
 * A `pass` here never grants a workflow gate.  The Python authority still
 * checks the same facts again and binds the resulting evidence to the run.
 */
export const PREFLIGHT_SCHEMA_VERSION = 1;

const STATUS_ORDER = Object.freeze({ blocked: 3, failed: 3, pending: 2, warn: 1, pass: 0 });
const SUPPORTED_ENVIRONMENTS = Object.freeze(['openharmony', 'harmonyos']);
const HARMONYOS_COMPONENTS = Object.freeze(['system', 'chip']);
// These files are the executable contract behind the P0-P8 scheduler.  A
// preflight that checks only advance.py can still create a run that reaches P4
// and fails because one gate was omitted from a partial deployment. Keep this
// list here (rather than duplicating it in the UI) so local and remote callers
// can expose the same missing-file evidence.
export const REQUIRED_AR_GATE_SCRIPTS = Object.freeze([
  'advance.py',
  'gate_env_init.py',
  'gate_design.py',
  'gate_develop.py',
  'gate_test_develop.py',
  'gate_build.py',
  'gate_test_ut.py',
  'gate_device_func.py',
  'gate_integration.py',
  'gate_upload_ci.py',
  'prepare_test_bundle.py',
]);
export const DEFAULT_DELIVERY_BRIDGE_RELATIVE_PATH = 'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py';

// The DSH host ships the authoritative gate bundle alongside this module. A
// user code root is usually a separate OpenHarmony checkout, so deriving the
// bundle from that root would make a valid deployment look broken whenever the
// checkout does not vendor the DSH skills. Explicit deliveryScriptsRoot and
// deliveryBridgePath still win; the fallback is only used for the bundled
// local host copy.
const BUNDLED_REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const BUNDLED_SCRIPTS_ROOT = join(BUNDLED_REPOSITORY_ROOT, 'skills/ohos-ar-dev-phases/scripts');
const BUNDLED_BRIDGE_PATH = join(BUNDLED_REPOSITORY_ROOT, DEFAULT_DELIVERY_BRIDGE_RELATIVE_PATH);

function text(value) {
  return value === null || value === undefined ? null : String(value);
}

function check(id, label, status, details = {}, requiredFor = []) {
  return {
    id,
    label,
    status,
    required_for: [...requiredFor],
    ...details,
  };
}

function statusForBoolean(value, { pending = false } = {}) {
  if (value === true) return 'pass';
  return pending ? 'pending' : 'blocked';
}

function executablePath(command, env = process.env) {
  const candidate = resolveCommandPath(command, env);
  if (!candidate) return null;
  if (process.platform === 'win32') return candidate;
  try { accessSync(candidate, constants.X_OK); return candidate; }
  catch { return null; }
}

function normalizeCommandResult(command, result) {
  const output = `${result?.stdout ?? result?.stderr ?? ''}`.trim();
  return {
    status: 'pass',
    command,
    path: executablePath(command),
    version: output.split(/\r?\n/u)[0] || null,
  };
}

/** Probe one executable without treating a missing optional tool as success. */
export async function probeExecutable(command, {
  args = ['--version'],
  env = process.env,
  timeoutMs = 5000,
  required = true,
} = {}) {
  const path = executablePath(command, env);
  if (!path) {
    return {
      status: required ? 'blocked' : 'pending',
      command: command ?? null,
      path: null,
      version: null,
      reason: 'executable_not_found',
    };
  }
  try {
    const invocation = prepareCommandInvocation(command, args, { env });
    const result = await execFile(invocation.command, invocation.args, {
      env: invocation.env, shell: invocation.shell, timeout: timeoutMs, maxBuffer: 32 * 1024,
    });
    return normalizeCommandResult(command, result);
  } catch (error) {
    return {
      status: required ? 'blocked' : 'warn',
      command,
      path,
      version: null,
      reason: error?.code === 'ENOENT' ? 'executable_not_found' : 'probe_failed',
      error: String(error?.message ?? error).slice(0, 512),
    };
  }
}

function runtimeNodeCheck(version = process.versions.node) {
  const major = Number.parseInt(String(version).split('.')[0], 10);
  // The repository's package engine is >=24.  Existing DSH installations may
  // still run on Node 22, so expose that as a visible warning rather than
  // silently claiming that the host matches the declared production engine.
  if (!Number.isInteger(major)) return { status: 'blocked', version: text(version), reason: 'node_version_unknown' };
  if (major >= 24) return { status: 'pass', version: text(version), required: '>=24' };
  if (major >= 22) return { status: 'warn', version: text(version), required: '>=24', reason: 'below_declared_engine' };
  return { status: 'blocked', version: text(version), required: '>=24', reason: 'below_declared_engine' };
}

function executablePresenceCheck(command, env = process.env) {
  const path = executablePath(command, env);
  return path
    ? { status: 'pass', command, path, reason: null }
    : { status: 'blocked', command: command ?? null, path: null, reason: 'executable_not_found' };
}

function pathCheck(path, { writable = false, label = 'workspace' } = {}) {
  const normalized = typeof path === 'string' && path.trim() !== '' ? resolve(path) : null;
  if (!normalized || !existsSync(normalized)) {
    return { status: 'blocked', path: normalized, reason: 'path_not_found', label };
  }
  try {
    if (!statSync(normalized).isDirectory()) {
      return { status: 'blocked', path: normalized, reason: 'path_not_directory', label };
    }
  } catch (error) {
    return { status: 'blocked', path: normalized, reason: 'path_stat_failed', label, error: error.message };
  }
  if (!writable) return { status: 'pass', path: normalized, label };
  try {
    accessSync(normalized, constants.R_OK | constants.W_OK | constants.X_OK);
    return { status: 'pass', path: normalized, label };
  } catch (error) {
    return { status: 'blocked', path: normalized, reason: 'workspace_not_writable', label, error: error.message };
  }
}

function readableFile(path, label) {
  const normalized = typeof path === 'string' && path.trim() !== '' ? resolve(path) : null;
  if (!normalized || !existsSync(normalized)) {
    return { status: 'blocked', path: normalized, label, reason: 'file_not_found' };
  }
  try {
    if (!statSync(normalized).isFile()) {
      return { status: 'blocked', path: normalized, label, reason: 'path_not_file' };
    }
    accessSync(normalized, constants.R_OK);
    return { status: 'pass', path: normalized, label };
  } catch (error) {
    return { status: 'blocked', path: normalized, label, reason: 'file_not_readable', error: error.message };
  }
}

function gateBundle({ repoRoot = null, scriptsRoot, deliveryBridgePath = null } = {}) {
  const root = scriptsRoot ? resolve(scriptsRoot) : null;
  const files = Object.fromEntries(REQUIRED_AR_GATE_SCRIPTS.map((name) => {
    const result = readableFile(root ? join(root, name) : null, `AR gate ${name}`);
    return [name, result];
  }));
  const missing = Object.entries(files)
    .filter(([, result]) => result.status !== 'pass')
    .map(([name]) => name);
  const bridgePath = deliveryBridgePath
    ? resolve(deliveryBridgePath)
    : repoRoot ? resolve(repoRoot, DEFAULT_DELIVERY_BRIDGE_RELATIVE_PATH) : null;
  const bridge = readableFile(bridgePath, 'AR delivery bridge');
  return {
    scripts: missing.length === 0,
    profiles: Boolean(root && readableFile(join(root, 'lib', 'environments.py'), 'environment profiles').status === 'pass'),
    bridge: bridge.status === 'pass',
    required: [...REQUIRED_AR_GATE_SCRIPTS],
    files,
    missing,
    bridge_path: bridge.path,
    bridge_status: bridge.status,
    bridge_reason: bridge.reason ?? null,
  };
}

function sourceLayoutCheck(root, environment = {}) {
  const selected = text(environment.selected);
  if (!root || !selected) return { status: 'pending', reason: 'source_layout_waits_for_environment' };
  // OpenHarmony source roots expose build.sh and developer_test. HarmonyOS
  // products have one of the two branch-specific build entry points. The
  // profile may provide an explicit override for vendor trees that use a
  // different but equivalent layout; in that case retain the evidence rather
  // than guessing from a filename.
  if (environment.source_layout_verified === true) {
    return { status: 'pass', source_root: root, source_layout_verified: true, reason: null };
  }
  const configuredMarkers = Array.isArray(environment.source_layout_markers)
    ? environment.source_layout_markers : null;
  const markers = selected === 'openharmony'
    ? (configuredMarkers?.length ? configuredMarkers : [
        { path: 'build.sh', kind: 'file', executable: true },
        { path: 'test/testfwk/developer_test', kind: 'directory' },
        { path: 'test/testfwk/developer_test/start.sh', kind: 'file', executable: true },
      ])
    : configuredMarkers?.length ? configuredMarkers : [];
  if (markers.length === 0) {
    return {
      status: 'blocked', source_root: root, source_layout_verified: false,
      expected: [], missing: [], reason: 'source_layout_markers_unconfigured',
    };
  }
  const expected = markers.map((marker) => {
    if (typeof marker === 'string') {
      return {
        path: marker,
        kind: marker.endsWith('developer_test') ? 'directory' : 'file',
        executable: marker.endsWith('.sh'),
      };
    }
    return { path: marker?.path, kind: marker?.kind ?? 'file', executable: marker?.executable === true };
  }).filter((marker) => typeof marker.path === 'string' && marker.path.trim() !== '');
  if (expected.length !== markers.length || expected.some((marker) => !['file', 'directory'].includes(marker.kind))) {
    return {
      status: 'blocked', source_root: root, source_layout_verified: false,
      expected, missing: [], reason: 'source_layout_markers_invalid',
    };
  }
  const checks = expected.map((marker) => {
    const candidate = resolve(root, marker.path);
    const remainder = relative(root, candidate);
    if (remainder === '..' || remainder.startsWith(`..${sep}`) || isAbsolute(remainder)) {
      return { ...marker, absolute: candidate, status: 'outside_root' };
    }
    if (!existsSync(candidate)) return { ...marker, absolute: candidate, status: 'missing' };
    try {
      const actual = statSync(candidate);
      const kindMatches = marker.kind === 'directory' ? actual.isDirectory() : actual.isFile();
      const executable = marker.executable === true;
      let executableMatches = true;
      if (executable) {
        try { accessSync(candidate, constants.X_OK); } catch { executableMatches = false; }
      }
      return {
        ...marker, absolute: candidate,
        status: !kindMatches ? 'wrong_type' : executableMatches ? 'pass' : 'not_executable',
      };
    } catch (error) {
      return { ...marker, absolute: candidate, status: 'stat_failed', error: error.message };
    }
  });
  const missing = checks.filter((marker) => marker.status !== 'pass').map((marker) => marker.absolute);
  return {
    status: missing.length === 0 ? 'pass' : 'blocked',
    source_root: root,
    expected: checks,
    missing,
    reason: missing.length === 0 ? null : 'source_layout_markers_missing',
  };
}

function arInputCheck({ repoRoot = null, arPath = null, arText = null } = {}) {
  if (typeof arText === 'string' && arText.trim() !== '') {
    return {
      status: 'pass',
      source: 'inline',
      bytes: Buffer.byteLength(arText, 'utf8'),
      path: null,
      reason: null,
    };
  }
  if (typeof arPath !== 'string' || arPath.trim() === '') {
    return { status: 'blocked', source: null, path: null, reason: 'ar_input_required' };
  }
  const candidate = isAbsolute(arPath) ? resolve(arPath) : repoRoot ? resolve(repoRoot, arPath) : null;
  if (!candidate || !repoRoot) return { status: 'blocked', source: 'file', path: candidate, reason: 'ar_input_workspace_unconfigured' };
  const remainder = resolve(candidate).replaceAll('\\', '/');
  const normalizedRoot = resolve(repoRoot).replaceAll('\\', '/').replace(/\/$/u, '');
  if (remainder !== normalizedRoot && !remainder.startsWith(`${normalizedRoot}/`)) {
    return { status: 'blocked', source: 'file', path: candidate, reason: 'ar_input_outside_workspace' };
  }
  const file = readableFile(candidate, 'AR input');
  if (file.status === 'pass') {
    try {
      const bytes = statSync(file.path).size;
      if (bytes === 0) {
        return { status: 'blocked', source: 'file', path: file.path, bytes: 0, reason: 'ar_input_empty' };
      }
      // The Python boundary consumes UTF-8 Markdown. Reject a whitespace-only
      // file in preflight so a run is never created with an empty requirement.
      if (readFileSync(file.path, 'utf8').trim() === '') {
        return { status: 'blocked', source: 'file', path: file.path, bytes, reason: 'ar_input_empty' };
      }
      return { status: 'pass', source: 'file', path: file.path, bytes, reason: null };
    } catch (error) {
      return { status: 'blocked', source: 'file', path: file.path, bytes: null,
        reason: 'file_not_readable', error: error.message };
    }
  }
  return {
    status: file.status,
    source: 'file',
    path: file.path,
    bytes: null,
    reason: file.reason ?? null,
  };
}

function normalizeAgent(agent) {
  if (!agent || typeof agent !== 'object') {
    return { id: null, available: false, dispatchable: false, execution_mode: null };
  }
  return {
    id: agent.id ?? null,
    available: agent.available === true,
    dispatchable: agent.dispatchable === true,
    execution_mode: agent.execution_mode ?? (agent.source === 'workspace-gateway' ? 'workspace_gateway' : null),
    source: agent.source ?? null,
    profile_id: agent.profile_id ?? null,
    version: agent.version ?? null,
    workspace_access: agent.workspace_access ?? null,
    supports_remote_tools: agent.supports_remote_tools === true,
  };
}

/**
 * Describe where the CodeAgent runs and how it reaches source files.  This is
 * shown to an operator before starting a run so a local CLI is never mistaken
 * for an SSH-capable editor.
 */
export function buildExecutionPlan({
  workspaceMode = 'local',
  repoRoot = null,
  remoteRoot = null,
  codeagent = null,
} = {}) {
  const mode = workspaceMode === 'workspace_gateway' || workspaceMode === 'local_connector'
    ? workspaceMode : 'local';
  const agent = normalizeAgent(codeagent);
  const remoteAgent = mode === 'workspace_gateway' && agent.execution_mode === 'workspace_gateway';
  const connectorAgent = mode === 'local_connector' && agent.execution_mode === 'local_connector';
  const agentLoadStrategy = connectorAgent
    ? 'connector_local_agent'
    : remoteAgent
    ? 'gateway_registered_profile'
    : agent.execution_mode === 'dsh_provider'
      ? 'dsh_provider'
      : agent.execution_mode === 'local_cli'
        ? 'local_cli_path'
        : 'unresolved';
  const agentAuthSource = connectorAgent
    ? 'user_connector_native_credentials'
    : remoteAgent
    ? 'ssh_code_host_native_credentials'
    : agent.execution_mode === 'dsh_provider'
      ? 'dsh_provider_native_credentials'
      : agent.execution_mode === 'local_cli'
        ? 'dsh_host_environment_or_cli_store'
        : null;
  return {
    workspace_mode: mode,
    source_root: mode === 'workspace_gateway' || mode === 'local_connector' ? (repoRoot ?? remoteRoot ?? null) : (repoRoot ?? null),
    codeagent_host: connectorAgent ? 'user_connector_host' : remoteAgent ? 'ssh_code_host' : 'dsh_host',
    codeagent_execution: connectorAgent ? 'local_connector' : remoteAgent ? 'registered_gateway_profile' : agent.execution_mode ?? 'unresolved',
    agent_load_strategy: agentLoadStrategy,
    agent_profile_id: agent.profile_id ?? null,
    agent_auth_source: agentAuthSource,
    edit_strategy: connectorAgent
      ? (agent.workspace_access === 'remote_tools' ? 'connector_remote_tools_mcp' : 'connector_sshfs_mount')
      : remoteAgent ? 'remote_codeagent_profile' : 'local_cli',
    local_cli_remote_edit: mode === 'workspace_gateway'
      ? (remoteAgent ? 'avoided_by_remote_execution' : 'unsupported')
      : mode === 'local_connector' ? 'supported_via_connector'
      : 'not_applicable',
    gate_execution: mode === 'workspace_gateway' || mode === 'local_connector' ? 'ssh_code_host' : 'dsh_host',
    artifact_location: mode === 'workspace_gateway' || mode === 'local_connector' ? 'ssh_code_host' : 'dsh_host',
    remote_root: mode === 'workspace_gateway' || mode === 'local_connector' ? (remoteRoot ?? null) : null,
    operator_action: connectorAgent
      ? (agent.workspace_access === 'remote_tools'
        ? '本地 Connector 运行 CodeAgent；CodeAgent 通过受限 remote-tools MCP 读写 SSH 代码，Python gate 和产物在 SSH 代码端执行。'
        : '本地 Connector 运行 CodeAgent；CodeAgent 通过受控 SSHFS 挂载修改 SSH 代码，Python gate 和产物在 SSH 代码端执行。')
      : remoteAgent
      ? 'CodeAgent、Python gate 和产物都在 SSH 代码端执行；云端页面只编排和展示。'
      : mode === 'workspace_gateway'
        ? '先为该 CodeAgent 登记 Gateway profile；本地 CLI 不能直接编辑未挂载的 SSH 路径。'
        : 'CodeAgent 与 Python gate 在 DSH 所在主机的本地绝对路径执行。',
  };
}

function fullRunBlocked(checks) {
  // `pending` means an operator still has to bind or verify a prerequisite.
  // It is enough to start P0, but it must never be presented as a complete
  // P8 path.  Only checks that are explicitly outside the P8 set may remain
  // pending while the run is in progress.
  return checks.some((item) => item.required_for.includes('P8') && ['blocked', 'failed', 'pending'].includes(item.status));
}

function p0Blocked(checks) {
  return checks.some((item) => item.required_for.includes('P0') && ['blocked', 'failed'].includes(item.status));
}

function environmentSelection(environment = {}) {
  const selected = text(environment.selected);
  const componentType = text(environment.component_type);
  const deviceType = text(environment.device_type);
  const details = {
    environment: selected,
    component_type: selected === 'harmonyos' ? componentType : null,
    device_type: selected === 'harmonyos' ? deviceType : null,
  };
  if (!selected) return { status: 'blocked', reason: 'environment_required', ...details };
  if (!SUPPORTED_ENVIRONMENTS.includes(selected)) {
    return { status: 'blocked', reason: 'environment_unsupported', ...details };
  }
  if (selected === 'openharmony') {
    if (componentType) return { status: 'blocked', reason: 'component_type_not_applicable', ...details };
    return { status: 'pass', ...details };
  }
  if (!componentType) return { status: 'blocked', reason: 'component_type_required', ...details };
  if (!HARMONYOS_COMPONENTS.includes(componentType)) {
    return { status: 'blocked', reason: 'component_type_unsupported', ...details };
  }
  if (!deviceType) return { status: 'blocked', reason: 'device_type_required', ...details };
  return { status: 'pass', ...details };
}

/** Build a deterministic, JSON-safe preflight response from probe facts. */
export function evaluatePrerequisites({
  workspaceMode = 'local',
  repoRoot = null,
  remoteRoot = null,
  workspace = {},
  runtime = {},
  workflow = {},
  agent = null,
  environment = {},
  device = {},
  publication = {},
  arInput = undefined,
  transport = {},
  connector = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const normalizedAgent = normalizeAgent(agent);
  const workspaceConfigured = workspace.configured === true;
  const workspaceReachable = workspace.reachable === true;
  const workspaceWritable = workspace.writable === true;
  const transportConfigured = workspaceMode === 'workspace_gateway' || workspaceMode === 'local_connector'
    ? transport.configured === true
    : true;
  const transportReachable = workspaceMode === 'workspace_gateway' || workspaceMode === 'local_connector'
    ? transport.reachable === true
    : true;
  const selectedEnvironment = environmentSelection(environment);
  const checks = [
    check('workspace_binding', '代码工作区绑定', workspaceConfigured && workspaceReachable ? 'pass' : 'blocked', {
      path: workspace.path ?? (workspaceMode === 'workspace_gateway' ? remoteRoot : repoRoot),
      reachable: workspaceReachable,
      reason: !workspaceConfigured ? 'workspace_not_configured' : (!workspaceReachable ? 'workspace_unreachable' : null),
    }, ['P0', 'P8']),
    check('workspace_write', '代码工作区可写', statusForBoolean(workspaceWritable, { pending: workspaceConfigured }), {
      path: workspace.path ?? (workspaceMode === 'workspace_gateway' ? remoteRoot : repoRoot),
      reason: workspaceWritable ? null : 'workspace_not_writable',
    }, ['P0', 'P2', 'P8']),
    check('workspace_transport', workspaceMode === 'workspace_gateway' || workspaceMode === 'local_connector' ? 'SSH / Workspace Gateway' : '本地工作区传输',
      transportConfigured && transportReachable ? 'pass' : transportConfigured ? 'blocked' : 'pending', {
        mode: workspaceMode,
        reason: !transportConfigured ? 'gateway_not_configured' : (!transportReachable ? 'gateway_unreachable' : null),
      }, ['P0', 'P8']),
    ...(workspaceMode === 'local_connector' ? [check('connector_transport', '本地 Connector 在线',
      connector.configured === true && connector.reachable === true ? 'pass' : connector.configured === true ? 'blocked' : 'pending', {
        workspace_id: connector.workspace_id ?? null,
        device_id: connector.device_id ?? null,
        connected: connector.reachable === true,
        workspace_access: connector.workspace_access ?? 'sshfs_mount',
        local_root_exists: connector.local_root_exists ?? null,
        local_root_writable: connector.local_root_writable ?? null,
        remote_workspace_reachable: connector.remote_workspace_reachable ?? null,
        remote_workspace_writable: connector.remote_workspace_writable ?? null,
        remote_tools: connector.workspace_access === 'remote_tools',
        last_probe: connector.last_probe ?? null,
        reason: connector.configured !== true ? 'connector_not_configured' : connector.reachable !== true ? (connector.reason ?? 'connector_offline') : null,
      }, ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'])] : []),
    check('runtime_node', 'Node.js 运行时', runtime.node?.status ?? 'pending', runtime.node ?? {}, ['P0']),
    check('runtime_python', 'Python gate 运行时', runtime.python?.status ?? 'blocked', runtime.python ?? {}, ['P0', 'P4', 'P5', 'P7', 'P8']),
    check('runtime_git', 'Git / 发布工具链', runtime.git?.status ?? 'blocked', runtime.git ?? {}, ['P0', 'P8']),
    check('workflow_scripts', 'AR gate 与 bridge 脚本', workflow.scripts === true
      && (workflow.profiles === undefined || workflow.profiles === true)
      && (workflow.bridge === undefined || workflow.bridge === true) ? 'pass' : 'blocked', {
      reason: workflow.scripts !== true ? 'workflow_scripts_missing'
        : workflow.profiles === false ? 'environment_profiles_missing'
          : workflow.bridge === false ? 'workflow_bridge_missing' : null,
      profiles: workflow.profiles === true,
      bridge: workflow.bridge === undefined ? null : workflow.bridge === true,
      required: workflow.required ?? null,
      missing: workflow.missing ?? [],
      files: workflow.files ?? null,
      bridge_path: workflow.bridge_path ?? null,
      bridge_status: workflow.bridge_status ?? null,
      bridge_reason: workflow.bridge_reason ?? null,
    }, ['P0', 'P4', 'P5', 'P7', 'P8']),
    check('environment_selection', '运行环境与分支确认', selectedEnvironment.status, selectedEnvironment, [
      'P0', 'P4', 'P5', 'P6', 'P7', 'P8',
    ]),
    check('codeagent_selected', 'CodeAgent 可派发', normalizedAgent.available && normalizedAgent.dispatchable ? 'pass' : 'blocked', {
      // Keep the stable check id separate from the selected adapter id.  The
      // latter is operator data and must not overwrite `codeagent_selected`.
      agent_id: normalizedAgent.id,
      available: normalizedAgent.available,
      dispatchable: normalizedAgent.dispatchable,
      execution_mode: normalizedAgent.execution_mode,
      source: normalizedAgent.source,
      profile_id: normalizedAgent.profile_id,
      version: normalizedAgent.version,
      reason: normalizedAgent.dispatchable
        ? null
        : normalizedAgent.available ? 'adapter_unavailable' : 'agent_unavailable',
    }, ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']),
    check('environment_profile', '环境 profile 与分支确认', environment.profile_bound === true ? 'pass' : 'pending', {
      environment: environment.selected ?? null,
      component_type: environment.component_type ?? null,
      profile_digest: environment.profile_digest ?? null,
      profile_environment: environment.profile_environment ?? null,
      profile_component_type: environment.profile_component_type ?? null,
      reason: environment.profile_bound === true ? null
        : environment.profile_environment && environment.profile_environment !== environment.selected
          ? 'environment_profile_environment_mismatch'
          : environment.selected === 'harmonyos'
            && environment.profile_component_type
            && environment.profile_component_type !== environment.component_type
              ? 'environment_profile_component_mismatch'
              : 'environment_profile_required',
    }, ['P0', 'P4', 'P5', 'P6', 'P7', 'P8']),
    check('device_transport', '设备 / hdc 调试通道', device.configured === true && device.reachable === true ? 'pass' : 'blocked', {
      configured: device.configured === true,
      reachable: device.reachable === true,
      serial: device.serial ?? null,
      reason: device.configured !== true ? 'device_not_configured' : 'device_unreachable',
    }, ['P6', 'P7', 'P8']),
    check('publication_target', 'P8 发布目标和回执', publication.configured === true && publication.authenticated === true ? 'pass' : 'pending', {
      backend: publication.backend ?? null,
      target: publication.target ?? publication.repo_slug ?? publication.project ?? null,
      authenticated: publication.authenticated === true,
      reason: publication.configured !== true ? 'publication_target_required' : (publication.authenticated === true ? null : 'publication_credentials_unverified'),
    }, ['P8']),
  ];
  if (runtime.hdc !== undefined) {
    checks.push(check('runtime_hdc', 'hdc 调试工具', runtime.hdc?.status ?? 'blocked', runtime.hdc ?? {}, [
      // hdc is not needed to create the pipeline or perform the design and
      // implementation stages.  Keep the missing executable visible now, but
      // gate only the device-dependent stages so an operator can install or
      // connect it after P0 without starting a second run.
      'P6', 'P7', 'P8',
    ]));
  }
  if (arInput !== undefined) {
    checks.push(check('ar_input', 'AR 需求输入', arInput?.status ?? 'blocked', {
      ...(arInput ?? {}),
      reason: arInput?.reason ?? 'ar_input_unverified',
    }, ['P0']));
  }
  if (workflow.source_layout !== undefined) {
    checks.push(check('source_tree_layout', '源码树与环境入口', workflow.source_layout?.status ?? 'blocked', {
      ...(workflow.source_layout ?? {}),
      reason: workflow.source_layout?.reason ?? 'source_layout_unverified',
    }, ['P0', 'P4', 'P5', 'P6', 'P7', 'P8']));
  }
  const p0Ready = !p0Blocked(checks);
  const p8Ready = p0Ready && !fullRunBlocked(checks);
  const worst = checks.reduce((current, item) => STATUS_ORDER[item.status] > STATUS_ORDER[current] ? item.status : current, 'pass');
  return {
    schema_version: PREFLIGHT_SCHEMA_VERSION,
    generated_at: generatedAt,
    status: p8Ready ? 'ready_for_p8' : p0Ready ? 'ready_for_p0' : 'blocked',
    can_start_p0: p0Ready,
    can_complete_p8: p8Ready,
    worst_check_status: worst,
    checks,
    execution_plan: buildExecutionPlan({ workspaceMode, repoRoot, remoteRoot, codeagent: normalizedAgent }),
  };
}

/** Probe static prerequisites for a local DSH host. */
export async function probeLocalPrerequisites({
  repoRoot = null,
  deliveryScriptsRoot = null,
  deliveryBridgePath = null,
  pythonCommand = 'python3',
  gitCommand = 'git',
  hdcCommand = process.env.HDC_BIN ?? process.env.DSH_HDC_CLI ?? 'hdc',
  agent = null,
  environment = {},
  device = {},
  publication = {},
  arPath = null,
  arText = null,
  env = process.env,
} = {}) {
  const root = repoRoot ? resolve(repoRoot) : null;
  const configuredScriptsRoot = deliveryScriptsRoot ? resolve(deliveryScriptsRoot) : null;
  const repositoryScriptsRoot = root ? resolve(root, 'skills/ohos-ar-dev-phases/scripts') : null;
  const scriptsRoot = configuredScriptsRoot
    ?? (repositoryScriptsRoot && existsSync(join(repositoryScriptsRoot, 'advance.py'))
      ? repositoryScriptsRoot : BUNDLED_SCRIPTS_ROOT);
  const configuredBridgePath = deliveryBridgePath ? resolve(deliveryBridgePath) : null;
  const repositoryBridgePath = root ? resolve(root, DEFAULT_DELIVERY_BRIDGE_RELATIVE_PATH) : null;
  const bridgePath = configuredBridgePath
    ?? (repositoryBridgePath && existsSync(repositoryBridgePath) ? repositoryBridgePath : BUNDLED_BRIDGE_PATH);
  const [python, git] = await Promise.all([
    probeExecutable(pythonCommand, { env, required: true }),
    probeExecutable(gitCommand, { env, required: true }),
  ]);
  const hdc = executablePresenceCheck(hdcCommand, env);
  const workspace = pathCheck(root, { writable: true, label: 'workspace' });
  const bundle = gateBundle({
    repoRoot: root,
    scriptsRoot,
    deliveryBridgePath: bridgePath,
  });
  const sourceLayout = sourceLayoutCheck(root, environment);
  const arInput = arInputCheck({ repoRoot: root, arPath, arText });
  return evaluatePrerequisites({
    repoRoot: root,
    workspace: {
      configured: Boolean(root),
      reachable: workspace.status === 'pass',
      writable: workspace.status === 'pass',
      path: root,
    },
    runtime: { node: runtimeNodeCheck(), python, git, hdc },
    workflow: { ...bundle, source_layout: sourceLayout },
    agent,
    environment,
    device,
    publication,
    arInput,
    transport: { configured: true, reachable: true },
  });
}
