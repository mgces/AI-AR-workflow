#!/usr/bin/env node

import { accessSync, constants, existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateEnvironmentProfile } from '../packages/contracts/src/environment-profile.js';
import { cgroupOptionsFromEnv, resolveCgroupRoot } from '../../workspace-gateway/src/supervisor/process-supervisor.js';
import { normalizeProfiles } from '../../workspace-gateway/src/connector/workspace-connector.js';

const REQUIRED_GATE_FILES = Object.freeze([
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

function status(id, label, value, details = {}, requiredFor = []) {
  return { id, label, status: value, required_for: [...requiredFor], ...details };
}

function parseMajor(version) {
  const match = String(version ?? '').match(/(?:^|\D)(\d+)(?:\.|$)/u);
  return match ? Number(match[1]) : null;
}

function pathCheck(path, { label, directory = false, executable = false, writable = false, requiredFor = [] } = {}) {
  if (typeof path !== 'string' || path.trim() === '') {
    return status(label, label, 'blocked', { reason: 'path_not_configured', path: null }, requiredFor);
  }
  const candidate = resolve(path);
  try {
    const info = statSync(candidate);
    if (directory && !info.isDirectory()) return status(label, label, 'blocked', { reason: 'path_not_directory', path: candidate }, requiredFor);
    if (!directory && !info.isFile()) return status(label, label, 'blocked', { reason: 'path_not_file', path: candidate }, requiredFor);
    const mode = constants.R_OK | (writable ? constants.W_OK : 0) | (executable ? constants.X_OK : 0);
    accessSync(candidate, mode);
    return status(label, label, 'pass', { path: candidate }, requiredFor);
  } catch (error) {
    return status(label, label, 'blocked', { reason: error?.code ?? 'path_unavailable', path: candidate, error: error?.message }, requiredFor);
  }
}

function defaultCommandProbe(command, env) {
  if (typeof command !== 'string' || command.trim() === '') return { status: 'pending', reason: 'command_not_configured' };
  const result = spawnSync(command, ['--version'], {
    env,
    encoding: 'utf8',
    timeout: 10_000,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) return { status: 'blocked', reason: 'command_probe_failed', error: result.error.message };
  if (result.status !== 0) return { status: 'blocked', reason: 'command_probe_failed', exit_code: result.status, stderr: String(result.stderr ?? '').slice(0, 512) };
  const version = String(result.stdout || result.stderr || '').trim().split(/\r?\n/u)[0].slice(0, 256);
  return { status: 'pass', version: version || 'available' };
}

function defaultDeviceProbe(command, env) {
  if (typeof command !== 'string' || command.trim() === '') return { status: 'blocked', reason: 'hdc_not_configured' };
  const result = spawnSync(command, ['list', 'targets'], {
    env,
    encoding: 'utf8',
    timeout: 10_000,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) return { status: 'blocked', reason: 'hdc_target_probe_failed', error: result.error.message };
  if (result.status !== 0) return { status: 'blocked', reason: 'hdc_target_probe_failed', exit_code: result.status, stderr: String(result.stderr ?? '').slice(0, 512) };
  const targets = String(result.stdout ?? '').split(/\r?\n/u).map((item) => item.trim()).filter((item) => item && !/^\s*(list\s+targets|serial|target)\b/iu.test(item));
  return targets.length > 0
    ? { status: 'pass', targets: targets.slice(0, 32) }
    : { status: 'blocked', reason: 'no_device_target', targets: [] };
}

function normalizeBranch(value) {
  if (value === 'harmonyos/system') return { environment: 'harmonyos', component_type: 'system' };
  if (value === 'harmonyos/chip') return { environment: 'harmonyos', component_type: 'chip' };
  if (value === 'openharmony') return { environment: 'openharmony', component_type: null };
  throw new Error(`unsupported environment branch: ${value}`);
}

function sourceMarkers({ root, branch, profile }) {
  const markers = branch.environment === 'openharmony'
    ? [
        { path: 'build.sh', executable: true },
        { path: 'test/testfwk/developer_test', directory: true },
        { path: 'test/testfwk/developer_test/start.sh', executable: true },
      ]
    : (Array.isArray(profile?.root_markers) ? profile.root_markers.map((path) => ({ path })) : []);
  if (markers.length === 0) {
    return status('source_tree', '源码树入口', 'blocked', { reason: 'source_markers_not_configured', markers: [] }, ['P0', 'P4', 'P8']);
  }
  const results = markers.map((marker) => {
    const value = typeof marker === 'string' ? marker : marker.path;
    if (typeof value !== 'string' || value.trim() === '' || isAbsolute(value) || value.includes('..')) {
      return { path: value ?? null, status: 'blocked', reason: 'marker_path_invalid' };
    }
    const candidate = resolve(root, value);
    try {
      const info = statSync(candidate);
      if (marker.directory === true && !info.isDirectory()) return { path: value, status: 'blocked', reason: 'marker_not_directory' };
      if (marker.directory !== true && !info.isFile()) return { path: value, status: 'blocked', reason: 'marker_not_file' };
      if (marker.executable === true) accessSync(candidate, constants.X_OK);
      return { path: value, status: 'pass', executable: marker.executable === true };
    } catch (error) {
      return { path: value, status: 'blocked', reason: error?.code ?? 'marker_unavailable', error: error?.message };
    }
  });
  const failed = results.filter((item) => item.status !== 'pass');
  return status('source_tree', '源码树入口', failed.length === 0 ? 'pass' : 'blocked', {
    root,
    markers: results,
    ...(failed.length > 0 ? { reason: 'source_marker_missing' } : {}),
  }, ['P0', 'P4', 'P8']);
}

function profileCheck({ profileFile, branch }) {
  if (branch.environment === 'openharmony' && !profileFile) {
    return status('environment_profile', '环境 profile', 'pass', { environment: branch.environment, component_type: null, source: 'openharmony-default' }, ['P0', 'P8']);
  }
  if (!profileFile) return status('environment_profile', '环境 profile', 'blocked', { reason: 'profile_required', environment: branch.environment, component_type: branch.component_type }, ['P0', 'P8']);
  const candidate = resolve(profileFile);
  try {
    const profile = JSON.parse(awaitlessRead(candidate));
    const normalized = validateEnvironmentProfile(profile);
    if (normalized.environment !== branch.environment || (normalized.component_type ?? null) !== (branch.component_type ?? null)) {
      return status('environment_profile', '环境 profile', 'blocked', { path: candidate, reason: 'profile_branch_mismatch', profile_environment: normalized.environment, profile_component_type: normalized.component_type }, ['P0', 'P8']);
    }
    return status('environment_profile', '环境 profile', 'pass', { path: candidate, profile_id: normalized.profile_id, version: normalized.version, environment: normalized.environment, component_type: normalized.component_type }, ['P0', 'P8']);
  } catch (error) {
    return status('environment_profile', '环境 profile', 'blocked', { path: candidate, reason: error?.code ?? 'profile_invalid', error: error?.message }, ['P0', 'P8']);
  }
}

// Kept synchronous so the deployment doctor can run before any service starts.
function awaitlessRead(path) { return readFileSync(path, 'utf8'); }

function cgroupCheck(options) {
  if (options.cgroupMode === 'disabled') return status('process_isolation', '进程隔离', 'pass', { mode: 'disabled', reason: 'disabled' }, []);
  if (process.platform !== 'linux') return status('process_isolation', '进程隔离', options.cgroupMode === 'required' ? 'blocked' : 'warn', { mode: options.cgroupMode, reason: 'cgroup_platform_unsupported' }, ['P0', 'P8']);
  const root = resolveCgroupRoot(options.cgroupRoot);
  const requiredFiles = ['cgroup.controllers', 'cgroup.procs'];
  const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));
  if (missing.length > 0) return status('process_isolation', '进程隔离', options.cgroupMode === 'required' ? 'blocked' : 'warn', { mode: options.cgroupMode, root, reason: 'cgroup_v2_unavailable', missing }, ['P0', 'P8']);
  try {
    accessSync(root, constants.R_OK | constants.W_OK | constants.X_OK);
    accessSync(join(root, 'cgroup.procs'), constants.R_OK | constants.W_OK);
    return status('process_isolation', '进程隔离', 'pass', { mode: options.cgroupMode, root }, ['P0', 'P8']);
  } catch (error) {
    return status('process_isolation', '进程隔离', options.cgroupMode === 'required' ? 'blocked' : 'warn', { mode: options.cgroupMode, root, reason: 'cgroup_root_not_writable', error: error?.message }, ['P0', 'P8']);
  }
}

function officialDshCheck({ dshCommand, patchFile, requireDsh, commandProbe }) {
  const commandConfigured = typeof dshCommand === 'string' && dshCommand.trim() !== '';
  const patchConfigured = typeof patchFile === 'string' && patchFile.trim() !== '';
  if (!commandConfigured && !patchConfigured) {
    return status('official_dsh', '官方 DSH Web', requireDsh ? 'blocked' : 'pending', {
      command: null,
      patch_file: null,
      reason: 'dsh_not_configured',
    }, ['P0', 'P8']);
  }
  const commandResult = commandConfigured
    ? commandProbe(dshCommand)
    : { status: 'blocked', reason: 'dsh_command_not_configured' };
  const patchResult = pathCheck(patchFile, { label: 'dsh_patch' });
  let patchSanity = { status: patchResult.status, reason: patchResult.reason ?? null };
  if (patchResult.status === 'pass') {
    try {
      const content = readFileSync(patchResult.path, 'utf8');
      const developerPath = /(?:\/home\/[^\s/'"]+\/code\/AI-AR-workflow|\/mnt\/c\/Users\/[^\s/'"]+\/[^\s/'"]*AI-AR-workflow|[A-Za-z]:\\Users\\[^\\]+\\[^\\]*AI-AR-workflow)/u.test(content);
      patchSanity = developerPath
        ? { status: 'blocked', reason: 'patch_developer_path' }
        : { status: 'pass', reason: null };
    } catch (error) {
      patchSanity = { status: 'blocked', reason: error?.code ?? 'patch_unreadable' };
    }
  }
  const ready = commandResult.status === 'pass' && patchResult.status === 'pass' && patchSanity.status === 'pass';
  return status('official_dsh', '官方 DSH Web', ready ? 'pass' : requireDsh ? 'blocked' : 'warn', {
    command: dshCommand ?? null,
    command_probe: commandResult,
    patch_file: patchResult.path,
    patch_probe: patchResult,
    patch_sanity: patchSanity,
    reason: ready ? null : (commandResult.reason ?? patchSanity.reason ?? patchResult.reason ?? 'dsh_not_ready'),
  }, ['P0', 'P8']);
}

function gatewayProfilesCheck({ profileFile, requireProfiles }) {
  const configured = typeof profileFile === 'string' && profileFile.trim() !== '';
  if (!configured) {
    return status('gateway_profiles', 'Gateway profiles', requireProfiles ? 'blocked' : 'pending', {
      path: null,
      reason: 'gateway_profiles_not_configured',
    }, ['P0', 'P8']);
  }
  const pathResult = pathCheck(profileFile, { label: 'gateway_profiles' });
  if (pathResult.status !== 'pass') {
    return status('gateway_profiles', 'Gateway profiles', 'blocked', {
      path: pathResult.path,
      reason: pathResult.reason ?? 'gateway_profiles_unavailable',
      probe: pathResult,
    }, ['P0', 'P8']);
  }
  try {
    const value = JSON.parse(readFileSync(pathResult.path, 'utf8'));
    const normalized = normalizeProfiles(value);
    if (normalized.size === 0) {
      return status('gateway_profiles', 'Gateway profiles', 'blocked', {
        path: pathResult.path,
        reason: 'gateway_profiles_empty',
        profile_count: 0,
      }, ['P0', 'P8']);
    }
    return status('gateway_profiles', 'Gateway profiles', 'pass', {
      path: pathResult.path,
      profile_count: normalized.size,
      profile_ids: [...normalized.keys()].slice(0, 128),
    }, ['P0', 'P8']);
  } catch (error) {
    return status('gateway_profiles', 'Gateway profiles', 'blocked', {
      path: pathResult.path,
      reason: error?.code ?? (error?.message?.includes('JSON') ? 'gateway_profiles_invalid_json' : 'profile_invalid'),
      error: error?.message,
    }, ['P0', 'P8']);
  }
}

function parseEnvironmentFile(content) {
  const values = {};
  for (const line of String(content ?? '').split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
    if (!match) continue;
    let value = match[2].trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function environmentFileValues(file, env) {
  if (!file) return {
    configured: false,
    values: {
      DSH_GATEWAY_BEARER_TOKEN: env?.DSH_GATEWAY_BEARER_TOKEN ?? null,
      DSH_AUTHORITY_SHARED_SECRET: env?.DSH_AUTHORITY_SHARED_SECRET ?? null,
      DSH_GATEWAY_SHARED_SECRET: env?.DSH_GATEWAY_SHARED_SECRET ?? null,
    },
  };
  const pathResult = pathCheck(file, { label: 'gateway_env_file' });
  if (pathResult.status !== 'pass') return {
    configured: true, path: pathResult.path, status: 'blocked', reason: pathResult.reason ?? 'gateway_env_unavailable', values: {},
  };
  try {
    const values = parseEnvironmentFile(readFileSync(pathResult.path, 'utf8'));
    return {
      configured: true,
      path: pathResult.path,
      status: 'pass',
      values,
    };
  } catch (error) {
    return { configured: true, path: pathResult.path, status: 'blocked', reason: error?.code ?? 'gateway_env_unreadable', values: {} };
  }
}

function resolvedOptionalPath(value) {
  return typeof value === 'string' && value.trim() !== '' ? resolve(value) : null;
}

function usableBearer(value) {
  return typeof value === 'string' && value.length > 0
    && !/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/u.test(value)
    && !/[\s\0\r\n]/u.test(value);
}

function usableAuthoritySecret(value) {
  return usableBearer(value) && Buffer.byteLength(value, 'utf8') >= 32;
}

/**
 * Check the Bearer secret used by the cloud DSH HTTP client and the Gateway.
 * The two systemd units normally read different EnvironmentFile paths, so a
 * health check that inspects only one process environment can miss a 401 at
 * the first real envelope call. Secret values are deliberately never copied
 * into the report.
 */
function gatewayAuthCheck({ dshEnvFile, gatewayEnvFile, env, requireAuth }) {
  const dsh = environmentFileValues(dshEnvFile, env);
  const gateway = environmentFileValues(gatewayEnvFile, env);
  const dshBearer = dsh.values?.DSH_GATEWAY_BEARER_TOKEN ?? null;
  const gatewayBearer = gateway.values?.DSH_GATEWAY_BEARER_TOKEN ?? null;
  const dshAuthority = dsh.values?.DSH_AUTHORITY_SHARED_SECRET ?? null;
  const gatewayAuthority = gateway.values?.DSH_GATEWAY_SHARED_SECRET ?? null;
  const configured = Boolean(dshEnvFile || gatewayEnvFile || env?.DSH_GATEWAY_BEARER_TOKEN);
  const base = {
    dsh_env_file: dsh.path ?? resolvedOptionalPath(dshEnvFile),
    gateway_env_file: gateway.path ?? resolvedOptionalPath(gatewayEnvFile),
    dsh_token_configured: usableBearer(dshBearer),
    gateway_token_configured: usableBearer(gatewayBearer),
    dsh_authority_secret_configured: usableAuthoritySecret(dshAuthority),
    gateway_authority_secret_configured: usableAuthoritySecret(gatewayAuthority),
  };
  if (!configured) {
    return status('gateway_auth', 'Gateway Bearer 授权', requireAuth ? 'blocked' : 'pending', {
      ...base,
      reason: 'gateway_bearer_not_configured',
    }, ['P0', 'P8']);
  }
  if (dsh.status === 'blocked' || gateway.status === 'blocked') {
    return status('gateway_auth', 'Gateway Bearer 授权', requireAuth ? 'blocked' : 'warn', {
      ...base,
      reason: dsh.status === 'blocked' ? dsh.reason : gateway.reason,
    }, ['P0', 'P8']);
  }
  if (!usableBearer(dshBearer) || !usableBearer(gatewayBearer)) {
    return status('gateway_auth', 'Gateway Bearer 授权', requireAuth ? 'blocked' : 'pending', {
      ...base,
      reason: 'gateway_bearer_not_configured',
    }, ['P0', 'P8']);
  }
  if (dshBearer !== gatewayBearer) {
    return status('gateway_auth', 'Gateway Bearer 授权', 'blocked', {
      ...base,
      reason: 'gateway_bearer_mismatch',
    }, ['P0', 'P8']);
  }
  if (!usableBearer(dshAuthority) || !usableBearer(gatewayAuthority)) {
    return status('gateway_auth', 'Gateway Bearer/HMAC 授权', requireAuth ? 'blocked' : 'pending', {
      ...base,
      reason: 'gateway_authority_secret_not_configured',
    }, ['P0', 'P8']);
  }
  if (!usableAuthoritySecret(dshAuthority) || !usableAuthoritySecret(gatewayAuthority)) {
    return status('gateway_auth', 'Gateway Bearer/HMAC 授权', 'blocked', {
      ...base,
      reason: 'gateway_authority_secret_too_short',
    }, ['P0', 'P8']);
  }
  if (dshAuthority !== gatewayAuthority) {
    return status('gateway_auth', 'Gateway Bearer/HMAC 授权', 'blocked', {
      ...base,
      reason: 'gateway_authority_secret_mismatch',
    }, ['P0', 'P8']);
  }
  return status('gateway_auth', 'Gateway Bearer 授权', 'pass', {
    ...base,
    reason: null,
  }, ['P0', 'P8']);
}

function usageText(value) {
  return [
    'Usage: node platform/deploy/doctor.mjs [options]',
    '',
    'Options:',
    '  --repo-root <path>              OHOS/HarmonyOS source root',
    '  --state-root <path>             durable DSH state directory',
    '  --delivery-scripts-root <path> trusted AR gate scripts directory',
    '  --delivery-bridge <path>        trusted delivery_bridge.py',
    '  --environment <branch>          openharmony|harmonyos/system|harmonyos/chip',
    '  --profile-file <path>           installable environment profile JSON',
    '  --dsh-command <command>         official DSH Web executable to probe',
    '  --patch-file <path>             deployment Cordis patch file',
    '  --require-dsh                   make official DSH a P0/P8 blocker',
    '  --gateway-profiles-file <path>  fixed Gateway CodeAgent/gate profile JSON',
    '  --require-gateway-profiles      make Gateway profiles a P0/P8 blocker',
    '  --dsh-env-file <path>           DSH Web EnvironmentFile containing Bearer token',
    '  --gateway-env-file <path>       Gateway EnvironmentFile containing Bearer token',
    '  --require-gateway-auth          require matching Bearer tokens in both files',
    '  --codeagent <command>           CodeAgent executable to probe',
    '  --provider-loaded               use an already loaded official DSH provider',
    '  --require-device                make hdc/device a P8 blocker',
    '  --require-publish               make publication credentials a P8 blocker',
    '  --cgroup-mode <mode>            disabled|best_effort|required',
    '  --cgroup-root <path>            cgroup v2 delegated root',
    '  --json                          emit machine-readable JSON (default)',
    '  --human                         emit a compact human report',
  ].join('\n');
}

export function runDoctor({
  repoRoot = process.env.DSH_REPO_ROOT ?? process.cwd(),
  stateRoot = process.env.DSH_STATE_ROOT ?? '/var/lib/dsh/runtime',
  deliveryScriptsRoot = process.env.DSH_DELIVERY_SCRIPTS_ROOT ?? join(repoRoot, 'skills/ohos-ar-dev-phases/scripts'),
  deliveryBridgePath = process.env.DSH_DELIVERY_BRIDGE ?? join(repoRoot, 'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py'),
  environment = process.env.DSH_ENVIRONMENT ?? 'openharmony',
  profileFile = process.env.DSH_ENV_PROFILE_FILE ?? null,
  dshCommand = process.env.DSH_DSH_COMMAND ?? null,
  patchFile = process.env.DSH_PATCH_FILE ?? null,
  requireDsh = process.env.DSH_REQUIRE_DSH === '1',
  gatewayProfilesFile = process.env.DSH_GATEWAY_PROFILES_FILE ?? null,
  requireGatewayProfiles = process.env.DSH_REQUIRE_GATEWAY_PROFILES === '1',
  dshEnvFile = process.env.DSH_ENV_FILE ?? null,
  gatewayEnvFile = process.env.DSH_GATEWAY_ENV_FILE ?? null,
  requireGatewayAuth = process.env.DSH_REQUIRE_GATEWAY_AUTH === '1',
  codeagentCommand = process.env.DSH_CODEAGENT_COMMAND ?? null,
  providerLoaded = process.env.DSH_PROVIDER_LOADED === '1',
  requireDevice = process.env.DSH_REQUIRE_DEVICE === '1',
  requirePublish = process.env.DSH_REQUIRE_PUBLISH === '1',
  nodeVersion = process.version,
  env = process.env,
  commandProbe = (command) => defaultCommandProbe(command, env),
  deviceProbe = (command) => defaultDeviceProbe(command, env),
  cgroupMode,
  cgroupRoot,
  cgroupPrefix,
  cgroupLimits,
} = {}) {
  const branch = normalizeBranch(environment);
  const root = resolve(repoRoot);
  const scriptsRoot = resolve(deliveryScriptsRoot);
  const bridgePath = resolve(deliveryBridgePath);
  const cgroup = {
    ...cgroupOptionsFromEnv(env),
    ...(cgroupMode ? { cgroupMode } : {}),
    ...(cgroupRoot ? { cgroupRoot } : {}),
    ...(cgroupPrefix ? { cgroupPrefix } : {}),
    ...(cgroupLimits ? { cgroupLimits } : {}),
  };
  const checks = [];
  const nodeMajor = parseMajor(nodeVersion);
  checks.push(status('node', 'Node.js', nodeMajor !== null && nodeMajor >= 24 ? 'pass' : 'blocked', { version: String(nodeVersion), required: '>=24', reason: nodeMajor === null ? 'node_version_unknown' : nodeMajor < 24 ? 'below_declared_engine' : null }, ['P0', 'P8']));
  for (const [id, label, command, requiredFor] of [
    ['python', 'Python gate 运行时', env.DSH_PYTHON_COMMAND ?? 'python3', ['P0', 'P4', 'P8']],
    ['git', 'Git', env.DSH_GIT_COMMAND ?? 'git', ['P0', 'P8']],
  ]) {
    const result = commandProbe(command);
    checks.push(status(id, label, result.status, { command, ...result }, requiredFor));
  }
  checks.push(pathCheck(root, { label: 'workspace', directory: true, writable: true, requiredFor: ['P0', 'P8'] }));
  checks.push(pathCheck(stateRoot, { label: 'state_root', directory: true, writable: true, requiredFor: ['P0', 'P8'] }));
  checks.push(officialDshCheck({ dshCommand, patchFile, requireDsh, commandProbe }));
  if (requireGatewayProfiles || (typeof gatewayProfilesFile === 'string' && gatewayProfilesFile.trim() !== '')) {
    checks.push(gatewayProfilesCheck({ profileFile: gatewayProfilesFile, requireProfiles: requireGatewayProfiles }));
  }
  if (requireGatewayAuth || dshEnvFile || gatewayEnvFile || env.DSH_GATEWAY_BEARER_TOKEN) {
    checks.push(gatewayAuthCheck({ dshEnvFile, gatewayEnvFile, env, requireAuth: requireGatewayAuth }));
  }
  const gateResults = REQUIRED_GATE_FILES.map((name) => pathCheck(join(scriptsRoot, name), { label: name, requiredFor: ['P0', 'P4', 'P8'] }));
  checks.push(status('delivery_scripts', 'AR gate 脚本', gateResults.every((item) => item.status === 'pass') ? 'pass' : 'blocked', { root: scriptsRoot, files: gateResults }, ['P0', 'P4', 'P8']));
  checks.push(pathCheck(bridgePath, { label: 'delivery_bridge', requiredFor: ['P0', 'P4', 'P8'] }));
  let profile = null;
  if (profileFile) {
    try { profile = JSON.parse(readFileSync(resolve(profileFile), 'utf8')); } catch { profile = null; }
  }
  checks.push(profileCheck({ profileFile, branch }));
  checks.push(sourceMarkers({ root, branch, profile }));
  if (providerLoaded) checks.push(status('codeagent', 'CodeAgent', 'pass', { source: 'official_dsh_provider' }, ['P0']));
  else {
    const result = codeagentCommand ? commandProbe(codeagentCommand) : { status: 'blocked', reason: 'codeagent_not_configured' };
    checks.push(status('codeagent', 'CodeAgent', result.status, { command: codeagentCommand, ...result }, ['P0']));
  }
  const hdcCommand = env.DSH_HDC_COMMAND ?? 'hdc';
  const hdcVersion = commandProbe(hdcCommand);
  const hdcResult = requireDevice ? deviceProbe(hdcCommand) : hdcVersion;
  checks.push(status('device', 'hdc / 设备', requireDevice ? hdcResult.status : (hdcResult.status === 'pass' ? 'pass' : 'pending'), { command: hdcCommand, hdc_version: hdcVersion.version ?? null, ...hdcResult, required: requireDevice }, ['P8']));
  const publishResult = commandProbe(env.DSH_PUBLISH_COMMAND ?? (branch.environment === 'openharmony' ? 'oh-gc' : 'git'));
  checks.push(status('publish', '发布工具链', requirePublish ? publishResult.status : (publishResult.status === 'pass' ? 'pass' : 'pending'), { command: env.DSH_PUBLISH_COMMAND ?? (branch.environment === 'openharmony' ? 'oh-gc' : 'git'), ...publishResult, required: requirePublish }, ['P8']));
  checks.push(cgroupCheck(cgroup));

  const p0Ids = new Set(['node', 'python', 'git', 'workspace', 'state_root', 'delivery_scripts', 'delivery_bridge', 'environment_profile', 'source_tree', 'codeagent']);
  if (requireDsh || (typeof dshCommand === 'string' && dshCommand.trim() !== '') || (typeof patchFile === 'string' && patchFile.trim() !== '')) p0Ids.add('official_dsh');
  if (requireGatewayProfiles || (typeof gatewayProfilesFile === 'string' && gatewayProfilesFile.trim() !== '')) p0Ids.add('gateway_profiles');
  if (requireGatewayAuth) p0Ids.add('gateway_auth');
  if (cgroup.cgroupMode === 'required') p0Ids.add('process_isolation');
  const p8Ids = new Set([...p0Ids, 'device', 'publish']);
  const blocked = (idSet) => checks.some((item) => idSet.has(item.id) && item.status !== 'pass');
  const report = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    host: { platform: process.platform, arch: process.arch, node: String(nodeVersion) },
    inputs: {
      repo_root: root,
      state_root: resolve(stateRoot),
      delivery_scripts_root: scriptsRoot,
      delivery_bridge: bridgePath,
      environment: branch,
      profile_file: profileFile ? resolve(profileFile) : null,
      dsh_command: dshCommand ?? null,
      patch_file: patchFile ? resolve(patchFile) : null,
      require_dsh: requireDsh,
      gateway_profiles_file: gatewayProfilesFile ? resolve(gatewayProfilesFile) : null,
      require_gateway_profiles: requireGatewayProfiles,
      dsh_env_file: resolvedOptionalPath(dshEnvFile),
      gateway_env_file: resolvedOptionalPath(gatewayEnvFile),
      require_gateway_auth: requireGatewayAuth,
    },
    status: blocked(p0Ids) ? 'blocked' : 'ready',
    gates: { can_start_p0: !blocked(p0Ids), can_complete_p8: !blocked(p8Ids) },
    checks,
  };
  return report;
}

function parseArgs(argv) {
  const options = { json: true };
  const values = new Map([
    ['--repo-root', 'repoRoot'], ['--state-root', 'stateRoot'], ['--delivery-scripts-root', 'deliveryScriptsRoot'],
    ['--delivery-bridge', 'deliveryBridgePath'], ['--environment', 'environment'], ['--profile-file', 'profileFile'],
    ['--dsh-command', 'dshCommand'], ['--patch-file', 'patchFile'], ['--gateway-profiles-file', 'gatewayProfilesFile'],
    ['--codeagent', 'codeagentCommand'], ['--dsh-env-file', 'dshEnvFile'], ['--gateway-env-file', 'gatewayEnvFile'],
    ['--cgroup-mode', 'cgroupMode'], ['--cgroup-root', 'cgroupRoot'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--help' || item === '-h') return { help: true };
    if (item === '--require-dsh') { options.requireDsh = true; continue; }
    if (item === '--require-gateway-profiles') { options.requireGatewayProfiles = true; continue; }
    if (item === '--require-gateway-auth') { options.requireGatewayAuth = true; continue; }
    if (item === '--provider-loaded') { options.providerLoaded = true; continue; }
    if (item === '--require-device') { options.requireDevice = true; continue; }
    if (item === '--require-publish') { options.requirePublish = true; continue; }
    if (item === '--human') { options.json = false; continue; }
    if (item === '--json') { options.json = true; continue; }
    const key = values.get(item);
    if (!key || index + 1 >= argv.length) throw new Error(`unknown or incomplete option: ${item}`);
    options[key] = argv[++index];
  }
  return options;
}

function humanReport(report) {
  const lines = [`DSH deployment doctor: ${report.status}`, `P0: ${report.gates.can_start_p0 ? 'ready' : 'blocked'} · P8: ${report.gates.can_complete_p8 ? 'ready' : 'blocked'}`];
  for (const item of report.checks) lines.push(`${item.status.padEnd(7)} ${item.id}${item.reason ? ` (${item.reason})` : ''}`);
  return lines.join('\n');
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) { process.stdout.write(`${usageText()}\n`); return 0; }
  const report = runDoctor(options);
  process.stdout.write(`${options.json === false ? humanReport(report) : JSON.stringify(report, null, 2)}\n`);
  return report.status === 'ready' ? 0 : 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write(`dsh-doctor: ${error.message}\n`);
    process.exitCode = 2;
  });
}

export { REQUIRED_GATE_FILES, humanReport, parseArgs };
