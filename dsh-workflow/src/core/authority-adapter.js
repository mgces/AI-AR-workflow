import { access } from 'node:fs/promises';
import path from 'node:path';
import { runCommand } from './process.js';

const GATES = new Set([
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

function parseJsonOutput(result, operation) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`${operation} returned invalid JSON: ${error.message}`);
  }
}

export class AuthorityAdapter {
  constructor({ workspaceRoot, python = process.env.PYTHON ?? 'python3' }) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.python = python;
    this.scriptsDir = path.join(
      this.workspaceRoot,
      'skills',
      'ohos-ar-dev-phases',
      'scripts',
    );
    this.advanceScript = path.join(this.scriptsDir, 'advance.py');
  }

  async assertAvailable() {
    await access(this.advanceScript);
  }

  async validatePipelineDir(pipelineDir) {
    const resolved = path.resolve(pipelineDir);
    await access(path.join(resolved, 'pipeline.json'));
    return resolved;
  }

  async runAdvance(pipelineDir, args, options = {}) {
    const resolved = await this.validatePipelineDir(pipelineDir);
    return await runCommand(
      this.python,
      [this.advanceScript, '--pipeline-dir', resolved, ...args],
      { cwd: this.workspaceRoot, ...options },
    );
  }

  async status(pipelineDir) {
    return parseJsonOutput(
      await this.runAdvance(pipelineDir, ['status', '--json']),
      'advance.py status',
    );
  }

  async next(pipelineDir) {
    return parseJsonOutput(
      await this.runAdvance(pipelineDir, ['next', '--json']),
      'advance.py next',
    );
  }

  async verify(pipelineDir) {
    const result = await this.runAdvance(pipelineDir, ['verify-all']);
    return { ok: true, output: result.stdout, status: await this.status(pipelineDir) };
  }

  async runGate(pipelineDir, gate, gateArgs = [], options = {}) {
    if (!GATES.has(gate)) {
      throw new Error(`unsupported gate ${gate}`);
    }
    if (!Array.isArray(gateArgs) || gateArgs.some((item) => typeof item !== 'string')) {
      throw new Error('gateArgs must be an array of strings');
    }
    if (gateArgs.some((item) => item === '--pipeline-dir' || item.startsWith('--pipeline-dir='))) {
      throw new Error('gateArgs cannot override the validated pipelineDir');
    }
    if (
      gate === 'gate_upload_ci.py'
      && gateArgs.includes('--allow-push')
      && options.allowIrreversible !== true
    ) {
      throw new Error('P8 --allow-push requires allowIrreversible=true after explicit human consent');
    }
    const resolved = await this.validatePipelineDir(pipelineDir);
    const script = path.join(this.scriptsDir, gate);
    await access(script);
    const result = await runCommand(
      this.python,
      [script, '--pipeline-dir', resolved, ...gateArgs],
      { cwd: this.workspaceRoot },
    );
    return { ok: true, output: result.stdout, status: await this.status(resolved) };
  }

  async advance(pipelineDir, phase) {
    if (!Number.isInteger(phase) || phase < 0 || phase > 8) {
      throw new Error('phase must be an integer from 0 to 8');
    }
    const result = await this.runAdvance(pipelineDir, ['advance', '--phase', String(phase)]);
    return { ok: true, output: result.stdout, status: await this.status(pipelineDir) };
  }

  async consent(pipelineDir, phase, token) {
    if (![1, 6, 7, 8].includes(phase)) {
      throw new Error('consent phase must be one of 1, 6, 7, 8');
    }
    if (!String(token ?? '').trim()) {
      throw new Error('token is required');
    }
    const result = await this.runAdvance(
      pipelineDir,
      ['consent', '--phase', String(phase), '--token', String(token)],
    );
    return { ok: true, output: result.stdout, status: await this.status(pipelineDir) };
  }
}
