import { existsSync } from 'node:fs';
import { delimiter as hostDelimiter, isAbsolute, join } from 'node:path';

const WINDOWS_SCRIPT_EXTENSIONS = Object.freeze(new Set(['.bat', '.cmd']));
const DEFAULT_PATHEXT = Object.freeze(['.COM', '.EXE', '.BAT', '.CMD']);
const POWERSHELL_SCRIPT = "$ErrorActionPreference='Stop'; $a=@(ConvertFrom-Json -InputObject $env:DSH_WINDOWS_ARGS); & $env:DSH_WINDOWS_COMMAND @a; exit $LASTEXITCODE";

function windowsAbsolute(value) {
  return /^[A-Za-z]:[\\/]/u.test(value) || value.startsWith('\\\\');
}

function pathDelimiter(platform) {
  return platform === 'win32' ? ';' : hostDelimiter;
}

function pathExtensions(env) {
  const configured = String(env?.PATHEXT ?? '').split(';').map((item) => item.trim()).filter(Boolean);
  const values = configured.length > 0 ? configured : [...DEFAULT_PATHEXT];
  return [...new Set(values.flatMap((item) => [item, item.toLowerCase(), item.toUpperCase()]))];
}

function hasExtension(value) {
  const slash = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
  const dot = value.lastIndexOf('.');
  return dot > slash;
}

/** Resolve a command using the target platform's PATH/PATHEXT semantics. */
export function resolveCommandPath(command, env = process.env, platform = process.platform) {
  if (typeof command !== 'string' || command.trim() === '') return null;
  const value = command.trim();
  const direct = platform === 'win32'
    ? (isAbsolute(value) || windowsAbsolute(value) || value.includes('/') || value.includes('\\'))
    : (isAbsolute(value) || value.includes('/') || value.includes('\\'));
  const extensions = platform === 'win32' && !hasExtension(value) ? pathExtensions(env) : [''];
  const roots = direct
    ? ['']
    : String(env?.PATH ?? '').split(pathDelimiter(platform)).filter(Boolean);
  const candidates = [];
  for (const root of roots) {
    const base = root ? join(root, value) : value;
    candidates.push(base);
    for (const extension of extensions) candidates.push(`${base}${extension}`);
  }
  return [...new Set(candidates)].find((candidate) => existsSync(candidate)) ?? null;
}

function isWindowsScript(path) {
  const value = String(path ?? '').toLowerCase();
  return [...WINDOWS_SCRIPT_EXTENSIONS].some((extension) => value.endsWith(extension));
}

function powershellCommand(env) {
  const configured = typeof env?.DSH_POWERSHELL_COMMAND === 'string' && env.DSH_POWERSHELL_COMMAND.trim() !== ''
    ? env.DSH_POWERSHELL_COMMAND.trim() : null;
  if (configured) return resolveCommandPath(configured, env, 'win32') ?? configured;
  for (const candidate of ['pwsh', 'powershell', 'powershell.exe']) {
    const path = resolveCommandPath(candidate, env, 'win32');
    if (path) return path;
  }
  // Let CreateProcess produce the normal ENOENT diagnostic if a minimal
  // Windows image does not ship either PowerShell executable.
  return 'powershell.exe';
}

/**
 * Prepare a safe child-process invocation for a local CodeAgent.
 *
 * Windows npm CLIs are commonly .cmd wrappers. Node cannot execute those with
 * shell:false, and using shell:true would interpolate a model prompt. The
 * PowerShell bridge receives the command and argv as JSON environment values,
 * then invokes the wrapper with an argument array, preserving metacharacters
 * and newlines as data. Linux/macOS remain ordinary argv-only processes.
 */
export function prepareCommandInvocation(command, args = [], { env = process.env, platform = process.platform } = {}) {
  const path = resolveCommandPath(command, env, platform);
  const effectiveCommand = path ?? String(command ?? '').trim();
  if (platform !== 'win32' || !isWindowsScript(path ?? effectiveCommand)) {
    return { command: effectiveCommand, args: [...args], env, shell: false, wrapped: false };
  }
  const launchEnv = {
    ...env,
    DSH_WINDOWS_COMMAND: effectiveCommand,
    DSH_WINDOWS_ARGS: JSON.stringify(args),
  };
  return {
    command: powershellCommand(env),
    args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', POWERSHELL_SCRIPT],
    env: launchEnv,
    shell: false,
    wrapped: true,
    original_command: effectiveCommand,
    original_args: [...args],
  };
}

export { WINDOWS_SCRIPT_EXTENSIONS };
