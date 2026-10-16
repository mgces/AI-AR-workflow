#!/usr/bin/env node

/*
 * Fixed CodeAgent profile helper for the current signed AR phase gate.
 *
 * The agent cannot choose a script, pipeline path, shell command, or run ID.
 * WorkspaceConnector injects the run ID from its validated Authority envelope;
 * this helper verifies it against the source tree's ACTIVE pointer and
 * pipeline.json before invoking the one gate bound to current_phase.
 */
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GATES = Object.freeze([
  'gate_env_init.py',
  'gate_design.py',
  'gate_develop.py',
  'gate_test_develop.py',
  'gate_build.py',
  'gate_test_ut.py',
  'gate_device_func.py',
  'gate_integration.py',
  'gate_upload_ci.py',
]);

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function inside(root, candidate) {
  const remainder = relative(root, candidate);
  return remainder === '' || (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !remainder.startsWith(sep));
}

function safeRunId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/u.test(value)) {
    fail('run_id_invalid', 'run ID is not valid for the AR pipeline');
  }
  return value;
}

function realDirectory(path, code, label) {
  let info;
  let canonical;
  try {
    info = lstatSync(path);
    canonical = realpathSync(path);
  } catch {
    fail(code, `${label} is missing or inaccessible`);
  }
  if (!info.isDirectory() || info.isSymbolicLink() || canonical !== resolve(path)) {
    fail(code, `${label} must be a real directory, not a symlink`);
  }
  return canonical;
}

export function resolveActivePipeline({ root = process.cwd(), runId } = {}) {
  const id = safeRunId(runId);
  const sourceRoot = realDirectory(resolve(root), 'source_root_invalid', 'source root');
  const pipelineRootPath = join(sourceRoot, 'specs', 'pipeline');
  const pipelineRoot = realDirectory(pipelineRootPath, 'pipeline_root_invalid', 'pipeline root');
  if (!inside(sourceRoot, pipelineRoot)) fail('pipeline_root_outside_source', 'pipeline root resolves outside the source tree');

  const activePointer = join(pipelineRoot, 'ACTIVE');
  try {
    const info = lstatSync(activePointer);
    if (!info.isFile() || info.isSymbolicLink()) fail('active_pointer_invalid', 'ACTIVE must be a regular file');
  } catch (error) {
    if (error?.code === 'active_pointer_invalid') throw error;
    fail('active_pointer_missing', 'the AR workflow has no active run pointer');
  }
  const activeValue = readFileSync(activePointer, 'utf8').trim();
  if (!isAbsolute(activeValue)) fail('active_pointer_invalid', 'ACTIVE must contain an absolute run path');

  const expectedPath = join(pipelineRoot, id);
  const pipelineDir = realDirectory(expectedPath, 'active_pipeline_invalid', 'active pipeline');
  if (!inside(pipelineRoot, pipelineDir) || pipelineDir !== expectedPath || resolve(activeValue) !== expectedPath) {
    fail('active_pipeline_mismatch', 'ACTIVE does not point to the requested run inside this source tree');
  }
  const statePath = join(pipelineDir, 'pipeline.json');
  try {
    const info = lstatSync(statePath);
    if (!info.isFile() || info.isSymbolicLink()) fail('pipeline_state_invalid', 'pipeline.json must be a regular file');
  } catch (error) {
    if (error?.code === 'pipeline_state_invalid') throw error;
    fail('pipeline_state_missing', 'the active run has no pipeline.json');
  }
  let state;
  try { state = JSON.parse(readFileSync(statePath, 'utf8')); }
  catch { fail('pipeline_state_invalid', 'pipeline.json is not valid JSON'); }
  if (state?.run_id !== id || !Number.isInteger(state.current_phase)
      || state.current_phase < 0 || state.current_phase >= GATES.length) {
    fail('pipeline_state_invalid', 'pipeline.json does not bind this run ID to a supported current phase');
  }
  return { pipelineDir, phase: state.current_phase };
}

export function main(argv = process.argv.slice(2), {
  root = process.cwd(),
  python = process.env.DSH_AR_PYTHON?.trim() || 'python3',
  spawnSyncImpl = spawnSync,
  scriptsRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'ohos-ar-dev-phases', 'scripts'),
} = {}) {
  if (argv.length !== 2 || argv[0] !== '--run-id') fail('arguments_invalid', 'only --run-id <authority-run-id> is supported');
  const { pipelineDir, phase } = resolveActivePipeline({ root, runId: argv[1] });
  const sourceRoot = realpathSync(resolve(root));
  const canonicalScriptsRoot = realDirectory(scriptsRoot, 'gate_bundle_missing', 'staged AR gate scripts');
  if (!inside(sourceRoot, canonicalScriptsRoot)) fail('gate_bundle_outside_source', 'staged AR gate scripts must remain inside the source root');
  const gatePath = join(canonicalScriptsRoot, GATES[phase]);
  try {
    const info = lstatSync(gatePath);
    if (!info.isFile() || info.isSymbolicLink() || realpathSync(gatePath) !== gatePath) {
      fail('gate_script_invalid', 'current phase gate must be a regular staged file');
    }
  } catch (error) {
    if (error?.code === 'gate_script_invalid') throw error;
    fail('gate_bundle_missing', `staged phase gate is missing: ${GATES[phase]}`);
  }
  const result = spawnSyncImpl(python, [gatePath, '--pipeline-dir', pipelineDir], {
    cwd: sourceRoot,
    env: { ...process.env, PYTHONUTF8: process.env.PYTHONUTF8 ?? '1', PYTHONIOENCODING: process.env.PYTHONIOENCODING ?? 'utf-8' },
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
  });
  if (result?.error) throw result.error;
  return result?.signal ? 1 : Number.isInteger(result?.status) ? result.status : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`dsh-ar-gate: ${error.message}\n`);
    process.exitCode = 2;
  }
}
