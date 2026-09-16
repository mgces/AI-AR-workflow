#!/usr/bin/env node

/*
 * Fixed Gateway profile helper for the authoritative AR Python workflow.
 *
 * The Gateway supplies this program only argv values from a registered
 * profile.  It deliberately has no shell mode and only dispatches the small
 * operation set needed by RemotePythonDeliveryAdapter.  Install it on the
 * SSH code host (for example /usr/local/bin/dsh-ar-delivery) and keep the
 * repository's advance.py/gate bridge as the source of truth.
 */
import { spawnSync } from 'node:child_process';
import { isAbsolute, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const WORKFLOW_SCRIPTS = ['skills', 'ohos-ar-dev-phases', 'scripts'];
const BRIDGE_PARTS = ['runtime', 'dsh-ohos', 'src', 'workflows', 'ar-delivery', 'python', 'delivery_bridge.py'];

function fail(message) {
  throw new Error(message);
}

function parse(argv) {
  const operation = argv.shift();
  if (!['init', 'inspect', 'validate', 'advance', 'consent', 'failure-snapshot'].includes(operation)) {
    fail('operation must be init, inspect, validate, advance, consent or failure-snapshot');
  }
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag.startsWith('--') || flag.length < 3 || values[flag] !== undefined) fail(`invalid or duplicate flag: ${flag}`);
    const value = argv[++index];
    if (value === undefined || value.startsWith('--')) fail(`missing value for ${flag}`);
    if (value.length > 4096 || /[\0\r\n]/u.test(value)) fail(`invalid value for ${flag}`);
    values[flag] = value;
  }
  return { operation, values };
}

function required(values, flag) {
  const value = values[flag];
  if (typeof value !== 'string' || value.trim() === '') fail(`${flag} is required`);
  return value.trim();
}

function absolute(values, flag) {
  const value = required(values, flag);
  if (!isAbsolute(value) || value.includes('\\')) fail(`${flag} must be an absolute POSIX path`);
  return normalize(value);
}

function optional(values, flag) {
  const value = values[flag];
  return value === undefined || value === '' ? null : value;
}

function containedPipeline(repoRoot, value) {
  const anchor = join(repoRoot, 'specs', 'pipeline');
  const candidate = absolute({ ["--pipeline-dir"]: value }, '--pipeline-dir');
  const prefix = anchor.endsWith('/') ? anchor : `${anchor}/`;
  const relative = candidate.slice(prefix.length);
  if (candidate === anchor || !candidate.startsWith(prefix) || !/^[A-Za-z0-9._-]{1,128}$/u.test(relative)) {
    fail('--pipeline-dir must be a direct run directory under <repo-root>/specs/pipeline');
  }
  return candidate;
}

function scriptPaths(repoRoot, values) {
  const scriptsRoot = optional(values, '--scripts-root')
    ? absolute(values, '--scripts-root')
    : join(repoRoot, ...WORKFLOW_SCRIPTS);
  const advancePath = optional(values, '--advance-path')
    ? absolute(values, '--advance-path')
    : join(scriptsRoot, 'advance.py');
  const bridgePath = optional(values, '--bridge-path')
    ? absolute(values, '--bridge-path')
    : join(repoRoot, ...BRIDGE_PARTS);
  return { scriptsRoot, advancePath, bridgePath };
}

function commandFor(operation, values) {
  const repoRoot = absolute(values, '--repo-root');
  const paths = scriptPaths(repoRoot, values);
  const python = process.env.DSH_AR_PYTHON?.trim() || 'python3';
  if (operation === 'init') {
    const pipelineDir = optional(values, '--pipeline-dir')
      ? containedPipeline(repoRoot, values['--pipeline-dir']) : null;
    const args = [paths.advancePath];
    if (pipelineDir) args.push('--pipeline-dir', pipelineDir);
    args.push('init', '--repo', repoRoot,
      '--run-id', required(values, '--run-id'), '--environment', required(values, '--environment'));
    for (const [flag, source] of [
      ['--git-dir', '--git-dir'], ['--build-target', '--build-target'], ['--part', '--part'],
      ['--device-serial', '--device-serial'], ['--device-type', '--device-type'],
      ['--component-type', '--component-type'], ['--base-commit', '--base-commit'],
      ['--agent', '--agent'], ['--model', '--model'],
    ]) {
      const value = optional(values, source);
      if (value !== null) args.push(flag, value);
    }
    if (optional(values, '--confirm-defaults') === 'true') args.push('--confirm-defaults');
    return { python, args, cwd: repoRoot };
  }
  const pdir = absolute(values, '--pipeline-dir');
  if (operation === 'inspect') return {
    python, args: [paths.bridgePath, '--scripts-root', paths.scriptsRoot, 'inspect', '--pipeline-dir', pdir], cwd: repoRoot,
  };
  if (operation === 'failure-snapshot') return {
    python, args: [paths.bridgePath, '--scripts-root', paths.scriptsRoot, 'failure-snapshot', '--pipeline-dir', pdir], cwd: repoRoot,
  };
  if (operation === 'validate') {
    const args = [paths.bridgePath, '--scripts-root', paths.scriptsRoot, 'validate', '--pipeline-dir', pdir,
      '--phase', required(values, '--phase')];
    if (optional(values, '--upload-precheck') === 'true') args.push('--upload-precheck');
    return { python, args, cwd: repoRoot };
  }
  if (operation === 'advance') return {
    python, args: [paths.advancePath, '--pipeline-dir', pdir, 'advance', '--phase', required(values, '--phase')], cwd: repoRoot,
  };
  return {
    python, args: [paths.advancePath, '--pipeline-dir', pdir, 'consent', '--phase', required(values, '--phase'), '--token', required(values, '--token')], cwd: repoRoot,
  };
}

export function main(argv = process.argv.slice(2)) {
  const parsed = parse([...argv]);
  const command = commandFor(parsed.operation, parsed.values);
  const result = spawnSync(command.python, command.args, {
    cwd: command.cwd,
    env: { ...process.env, PYTHONUTF8: process.env.PYTHONUTF8 ?? '1', PYTHONIOENCODING: process.env.PYTHONIOENCODING ?? 'utf-8' },
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) fail(result.error.message);
  return result.signal ? 1 : Number.isInteger(result.status) ? result.status : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`dsh-ar-delivery: ${error.message}\n`);
    process.exitCode = 2;
  }
}

export { commandFor };
