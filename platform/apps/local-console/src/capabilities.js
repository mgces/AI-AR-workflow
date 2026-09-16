import { accessSync, constants, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { resolveCommandPath } from './command.js';

const CAPABILITY_KEYS = Object.freeze([
  'mcp_tools', 'native_subagent', 'isolated_context', 'workspace_write',
  'build_execution', 'device_access', 'network_publish', 'model_observable',
  'usage_observable', 'cancel_observable', 'background_execution',
]);

function executablePath(command, env) {
  const candidate = resolveCommandPath(command, env);
  if (!candidate) return null;
  if (process.platform === 'win32') return candidate;
  try { accessSync(candidate, constants.X_OK); return candidate; }
  catch { return null; }
}

function writableDirectory(path) {
  if (!path || !existsSync(path)) return false;
  try {
    accessSync(path, constants.R_OK | constants.W_OK | constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Probe the host capabilities used by the signed AR workflow.
 *
 * The result deliberately separates the booleans sent to the authoritative
 * runtime from diagnostics shown in the UI. A capability is true only when a
 * configured local primitive backs it; unknown device connectivity and
 * publishing credentials remain false until the deployment explicitly enables
 * and probes them.
 */
export function probeHostCapabilities({
  repoRoot = null,
  executor = null,
  env = process.env,
  buildExecution = false,
  deviceAccess = false,
  networkPublish = false,
  hdcCommand = 'hdc',
  gitCommand = 'git',
} = {}) {
  const root = repoRoot ? resolve(repoRoot) : null;
  const rootExists = Boolean(root && existsSync(root));
  const canWrite = writableDirectory(root);
  const canExecuteAgent = rootExists && typeof executor?.run === 'function';
  const buildMarkers = root ? ['build.sh', 'build_system.sh', 'build_vendor.sh']
    .filter((name) => existsSync(join(root, name))) : [];
  const hdcPath = executablePath(hdcCommand, env);
  const gitPath = executablePath(gitCommand, env);
  const capabilities = {
    mcp_tools: true,
    native_subagent: canExecuteAgent,
    isolated_context: canExecuteAgent,
    workspace_write: canWrite,
    build_execution: rootExists && (buildExecution === true || buildMarkers.length > 0),
    device_access: rootExists && deviceAccess === true && Boolean(hdcPath),
    network_publish: rootExists && networkPublish === true && Boolean(gitPath),
    model_observable: canExecuteAgent,
    usage_observable: canExecuteAgent,
    cancel_observable: canExecuteAgent,
    background_execution: canExecuteAgent,
  };
  return {
    capability_source: 'host-probe',
    capabilities,
    diagnostics: {
      repo_root: root,
      workspace_exists: rootExists,
      workspace_writable: canWrite,
      build_markers: buildMarkers,
      hdc_command: hdcCommand,
      hdc_path: hdcPath,
      hdc_connection: deviceAccess === true ? 'connection_probe_not_run' : 'disabled',
      git_command: gitCommand,
      git_path: gitPath,
      network_publish_requested: networkPublish === true,
    },
  };
}

export { CAPABILITY_KEYS };
