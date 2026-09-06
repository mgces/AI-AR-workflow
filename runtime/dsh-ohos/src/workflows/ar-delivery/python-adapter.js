import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { PACKAGE_ROOT, REPOSITORY_ROOT } from '../../core/paths.js';
import { ProtocolError, invariant } from '../../core/errors.js';

const execFile = promisify(execFileCallback);

export class PythonDeliveryAdapter {
  constructor(options = {}) {
    this.pythonCommand = options.pythonCommand
      ?? process.env.OHOS_DSH_PYTHON
      ?? 'python3';
    this.scriptsRoot = resolve(options.scriptsRoot
      ?? process.env.OHOS_AR_SCRIPTS_ROOT
      ?? resolve(REPOSITORY_ROOT, 'skills/ohos-ar-dev-phases/scripts'));
    this.advancePath = resolve(this.scriptsRoot, 'advance.py');
    this.bridgePath = resolve(options.bridgePath
      ?? resolve(PACKAGE_ROOT, 'src/workflows/ar-delivery/python/delivery_bridge.py'));
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  async initialize(raw) {
    const pipelineDir = raw.pipeline_dir ? absolute(raw.pipeline_dir, 'pipeline_dir') : null;
    if (pipelineDir) {
      const state = await this.inspect(pipelineDir);
      const arContent = await this.#readAr(raw, { allowExisting: true });
      await this.#materializeAr(pipelineDir, arContent);
      return state;
    }

    const repoRoot = absolute(raw.repo_root, 'repo_root');
    const runId = required(raw.run_id, 'run_id');
    const expectedPipelineDir = resolve(repoRoot, 'specs', 'pipeline', runId);
    if (existsSync(join(expectedPipelineDir, 'pipeline.json'))) {
      const existing = await this.inspect(expectedPipelineDir);
      invariant(existing.pipeline_run_id === runId, 'pipeline_conflict',
        `Existing pipeline belongs to ${existing.pipeline_run_id}, not ${runId}.`);
      const arContent = await this.#readAr(raw, { allowExisting: true });
      await this.#materializeAr(expectedPipelineDir, arContent);
      return existing;
    }

    // Resolve the AR before creating authoritative state.  A bad input path
    // must not leave an orphaned pipeline that a retry could mistake as valid.
    const arContent = await this.#readAr(raw);
    const environment = required(raw.environment, 'environment');
    invariant(environment === 'openharmony' || environment === 'harmonyos',
      'invalid_input', 'environment must be openharmony or harmonyos.');
    const args = [
      this.advancePath, 'init', '--repo', repoRoot, '--run-id', runId,
      '--environment', environment,
    ];
    optionalArg(args, '--git-dir', raw.git_dir);
    optionalArg(args, '--build-target', raw.build_target);
    optionalArg(args, '--part', raw.part);
    optionalArg(args, '--device-serial', raw.device_serial);
    optionalArg(args, '--device-type', raw.device_type);
    optionalArg(args, '--component-type', raw.component_type);
    optionalArg(args, '--base-commit', raw.base_commit);
    optionalArg(args, '--agent', raw.agent);
    optionalArg(args, '--model', raw.model);
    for (const skill of raw.skills ?? []) optionalArg(args, '--skill', skill);
    if (raw.confirm_defaults === true) args.push('--confirm-defaults');

    const result = await this.#run(args, { cwd: repoRoot, operation: 'delivery_init' });
    const match = result.stdout.match(/^PDIR=(.+)$/m);
    invariant(match, 'invalid_python_result', 'advance.py init did not report PDIR.', {
      stdout: tail(result.stdout),
    });
    const initializedDir = resolve(match[1].trim());
    invariant(initializedDir === expectedPipelineDir, 'invalid_python_result',
      'advance.py initialized an unexpected pipeline directory.', {
        expected: expectedPipelineDir,
        actual: initializedDir,
      });
    await this.#materializeAr(initializedDir, arContent);
    return this.inspect(initializedDir);
  }

  async inspect(pipelineDir) {
    return this.#runJson([
      this.bridgePath, '--scripts-root', this.scriptsRoot,
      'inspect', '--pipeline-dir', absolute(pipelineDir, 'pipeline_dir'),
    ], 'delivery_inspect');
  }

  async validateGate(pipelineDir, phase, { uploadPrecheck = false } = {}) {
    const args = [
      this.bridgePath, '--scripts-root', this.scriptsRoot,
      'validate', '--pipeline-dir', absolute(pipelineDir, 'pipeline_dir'),
      '--phase', String(phase),
    ];
    if (uploadPrecheck) args.push('--upload-precheck');
    const result = await this.#runJson(args, 'delivery_validate_gate');
    invariant(result.ok === true, 'delivery_gate_rejected',
      `Python gate evidence rejected phase ${phase}: ${result.reason}`, result);
    return result;
  }

  async advance(pipelineDir, phase) {
    const before = await this.inspect(pipelineDir);
    if (before.complete || before.current_phase > phase) return before;
    invariant(before.current_phase === phase, 'python_state_mismatch',
      `Python pipeline is at P${before.current_phase}, not P${phase}.`, before);
    await this.#run([
      this.advancePath, '--pipeline-dir', absolute(pipelineDir, 'pipeline_dir'),
      'advance', '--phase', String(phase),
    ], { operation: 'delivery_advance' });
    return this.inspect(pipelineDir);
  }

  async consent(pipelineDir, phase, token) {
    const before = await this.inspect(pipelineDir);
    invariant(before.current_phase === phase && !before.complete,
      'python_state_mismatch', `Python pipeline cannot accept consent for P${phase}.`, before);
    await this.#run([
      this.advancePath, '--pipeline-dir', absolute(pipelineDir, 'pipeline_dir'),
      'consent', '--phase', String(phase), '--token', required(token, 'token'),
    ], { operation: 'delivery_consent' });
    return this.inspect(pipelineDir);
  }

  async #readAr(raw, { allowExisting = false } = {}) {
    if (typeof raw.ar_text === 'string' && raw.ar_text.length > 0) return raw.ar_text;
    const source = raw.ar_path ?? raw.input_ref;
    if (typeof source === 'string' && isAbsolute(source)) {
      return readFile(source, 'utf8').catch((error) => {
        throw new ProtocolError('ar_input_unreadable', `Cannot read AR input: ${source}`, {
          cause: error.message,
        });
      });
    }
    invariant(allowExisting, 'invalid_input',
      'New delivery runs require absolute ar_path/input_ref or non-empty ar_text.');
    return null;
  }

  async #materializeAr(pipelineDir, content) {
    const target = join(pipelineDir, 'ar.md');
    await mkdir(pipelineDir, { recursive: true });
    if (content === null) {
      await readFile(target, 'utf8').catch((error) => {
        throw new ProtocolError('ar_input_unreadable',
          `Attached pipeline has no readable ar.md: ${target}`, { cause: error.message });
      });
      return;
    }
    if (existsSync(target)) {
      const existing = await readFile(target, 'utf8');
      invariant(existing === content, 'pipeline_conflict',
        'The existing pipeline ar.md differs from the requested AR input.');
      return;
    }
    await writeFile(target, content, { encoding: 'utf8', flag: 'wx' });
  }

  async #runJson(args, operation) {
    const result = await this.#run(args, { operation });
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new ProtocolError('invalid_python_result',
        `${operation} did not return valid JSON.`, {
          cause: error.message,
          stdout: tail(result.stdout),
        });
    }
  }

  async #run(args, { cwd = this.scriptsRoot, operation } = {}) {
    try {
      return await execFile(this.pythonCommand, args, {
        cwd,
        env: {
          ...process.env,
          PYTHONUTF8: process.env.PYTHONUTF8 ?? '1',
          PYTHONIOENCODING: process.env.PYTHONIOENCODING ?? 'utf-8',
        },
        windowsHide: true,
        timeout: this.timeoutMs,
        maxBuffer: 4 * 1024 * 1024,
        encoding: 'utf8',
      });
    } catch (error) {
      const diagnostic = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
      const rejected = operation === 'delivery_advance'
        && /(?:^|\n)(?:REFUSED|HOLD|ERROR):/m.test(diagnostic);
      throw new ProtocolError(rejected ? 'delivery_gate_rejected' : 'python_command_failed',
        `${operation ?? 'python_command'} failed.`, {
          exit_code: error.code,
          signal: error.signal,
          stdout: tail(error.stdout),
          stderr: tail(error.stderr),
        });
    }
  }
}

function required(value, field) {
  invariant(typeof value === 'string' && value.length > 0,
    'invalid_input', `${field} must be a non-empty string.`);
  return value;
}

function absolute(value, field) {
  required(value, field);
  invariant(isAbsolute(value), 'invalid_input', `${field} must be an absolute path.`);
  return resolve(value);
}

function optionalArg(args, name, value) {
  if (value !== undefined && value !== null && value !== '') args.push(name, String(value));
}

function tail(value, max = 8000) {
  if (typeof value !== 'string') return '';
  return value.length <= max ? value : value.slice(-max);
}
