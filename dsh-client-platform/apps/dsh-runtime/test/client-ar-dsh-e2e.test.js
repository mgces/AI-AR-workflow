import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { createDshCodeAgentExecutor } from '../../desktop/src/dsh-codeagent-executor.js';
import { createDshRuntimeSupervisor } from '../../desktop/src/dsh-runtime-supervisor.js';
import { startLocalCore } from '../../local-core/src/server.js';
import { ArDeliveryScheduler } from '../../../../platform/apps/local-console/src/scheduler.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPOSITORY_ROOT = resolve(HERE, '../../../../');
const DSH_BUNDLE_ROOT = resolve(HERE, '..');
const fixtureCalls = [];
let temporaryRoot;
let workspaceRoot;
let core;
let runtime;
let scheduler;
let supervisor;
let fixtureAgent;

class FixtureArRuntime {
  constructor(root) {
    this.root = root;
    this.state = null;
    this.usage = [];
  }

  async start(input) {
    this.state = {
      run_id: input.runId ?? 'ar-dsh-client-e2e', status: 'awaiting_host', revision: 1,
      agent: 'claude-code', model: 'claude-sonnet-4',
      tasks: [{ task_id: 'task-P0', phase: 'P0', role: 'environment-analyst', revision: 1, status: 'queued' }],
    };
    return { run_id: this.state.run_id, status: this.state.status, next: this.state.tasks[0] };
  }

  async status() { return structuredClone(this.state); }

  async claim({ runId, expectedRevision }) {
    const task = this.state.tasks[0];
    assert.equal(runId, this.state.run_id);
    assert.equal(expectedRevision, task.revision);
    task.status = 'leased';
    this.state.status = 'working';
    return {
      run_id: runId, task_id: task.task_id, phase: task.phase, role: task.role,
      revision: task.revision, attempt_id: 'attempt-P0-1', lease_epoch: 1,
      task_credential: 'fixture-task-credential',
    };
  }

  async context(claim) {
    return {
      run_id: claim.run_id, task_id: claim.task_id, phase: claim.phase,
      role: claim.role, workflow: 'ar-delivery', workspace_root: this.root,
      pipeline_dir: join(this.root, 'pipeline'), constraints: ['Run only the authoritative P0 gate.'],
    };
  }

  async heartbeat() { return { status: 'executing' }; }

  async submit({ artifactRefs }) {
    assert.ok(artifactRefs.includes('evidence/P0/environment.json'));
    this.state.tasks[0].status = 'validating';
    this.state.status = 'validating';
    return { status: 'validating', run_id: this.state.run_id, task_id: this.state.tasks[0].task_id };
  }

  async validate() {
    this.state.tasks[0].status = 'accepted';
    this.state.status = 'completed';
    return { status: 'completed', run_id: this.state.run_id, evidence: { verdict: 'PASS', phase: 'P0' } };
  }

  async recordUsage(input) { this.usage.push(input); return { recorded: true }; }
}

before(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), 'dsh-local-core-ar-e2e-'));
  workspaceRoot = join(temporaryRoot, 'workspace');
  await mkdir(workspaceRoot, { recursive: true });
  const probeCommand = process.platform === 'win32'
    ? join(temporaryRoot, 'claude.cmd') : join(temporaryRoot, 'claude');
  if (process.platform === 'win32') {
    await writeFile(probeCommand, '@echo off\r\necho Claude Code fixture 1.0\r\n');
    await writeFile(join(temporaryRoot, 'claude.ps1'), "Write-Output 'Claude Code fixture 1.0'\n");
  } else {
    await writeFile(probeCommand, '#!/bin/sh\nprintf "Claude Code fixture 1.0\\n"\n');
    await chmod(probeCommand, 0o700);
  }
  const codeAgentEnv = { ...process.env, DSH_CLAUDE_CLI: probeCommand };
  const portProbe = createServer();
  await new Promise((resolveListen, reject) => {
    portProbe.once('error', reject);
    portProbe.listen(0, '127.0.0.1', resolveListen);
  });
  const port = portProbe.address().port;
  await new Promise((resolveClose, reject) => portProbe.close((error) => error ? reject(error) : resolveClose()));
  const callbackToken = 'local-core-e2e-callback-token-with-over-24-chars';
  const sessionRegistry = new Map();
  runtime = new FixtureArRuntime(workspaceRoot);
  supervisor = createDshRuntimeSupervisor({
    nodeExecutable: process.execPath,
    launcherPath: resolve(HERE, '../launcher.js'),
    cwd: REPOSITORY_ROOT,
    env: {
      ...codeAgentEnv,
      DSH_HOME: join(temporaryRoot, 'dsh-home'),
      DSH_CLIENT_DSH_BUNDLE_ROOT: DSH_BUNDLE_ROOT,
      DSH_CLIENT_RUNTIME_ROOT: REPOSITORY_ROOT,
      DSH_CLIENT_CODEAGENT_ENDPOINT: `http://127.0.0.1:${port}`,
      DSH_CLIENT_CODEAGENT_TOKEN: callbackToken,
      DSH_CLIENT_CODEAGENT_IDS: 'claude-code',
    },
  });
  const dshExecutor = createDshCodeAgentExecutor({
    runtime: { run: (request) => supervisor.run(request) },
    sessionRegistry,
    promptBuilder: async (context) => `AR ${context.run_id} ${context.phase}: inspect the configured workspace and return P0 evidence.`,
  });
  scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async (id, model) => ({ id, model, available: true, dispatchable: true }),
    executor: dshExecutor,
    hostBindingId: 'e2e-local-connector',
    heartbeatIntervalMs: 10_000,
  });
  fixtureAgent = {
    async run({ definition, context }) {
      fixtureCalls.push({ definition, context });
      return {
        summary: 'P0 local CodeAgent fixture produced evidence.',
        stdout: 'P0 local CodeAgent fixture produced evidence.',
        stderr: '', exitCode: 0, durationMs: 27,
        usage: { input_tokens: 21, output_tokens: 12, total_tokens: 33, status: 'complete' },
        artifactRefs: ['evidence/P0/environment.json'],
        invocation: { provider: definition.id, model: definition.model ?? null },
      };
    },
  };
  core = await startLocalCore({
    runtimeRoot: REPOSITORY_ROOT,
    workspaceRoot,
    stateFile: join(temporaryRoot, 'console-state.json'),
    dshCallbackToken: callbackToken,
    port,
    localConsoleOptions: {
      codeAgentEnv,
      runtimeService: runtime,
      scheduler,
      codeAgentExecutor: fixtureAgent,
      dshSessionRegistry: sessionRegistry,
    },
  });
});

after(async () => {
  await scheduler?.close();
  await supervisor?.close();
  await core?.close();
  await rm(temporaryRoot, { recursive: true, force: true });
});

test('AR scheduler uses official DSH SDK, authenticated Local Core callback, local CodeAgent and evidence/usage validation', async () => {
  const started = await scheduler.start({ runId: 'ar-dsh-client-e2e', agent: 'claude-code', model: 'claude-sonnet-4' });
  await scheduler.waitForIdle(started.run_id);
  assert.equal((await runtime.status()).status, 'completed');
  assert.equal(fixtureCalls.length, 1);
  assert.equal(fixtureCalls[0].definition.id, 'claude-code');
  assert.equal(fixtureCalls[0].definition.model, 'claude-sonnet-4');
  assert.equal(fixtureCalls[0].context.workspace_root, workspaceRoot);
  assert.equal(scheduler.job(started.run_id).status, 'completed');
  assert.equal(runtime.usage[0].usage.total_tokens, 33);
  assert.equal(runtime.usage[0].provider, 'claude-code');
});
