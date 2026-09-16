import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ArDeliveryScheduler } from '../src/scheduler.js';

function clone(value) {
  return structuredClone(value);
}

class FakeArRuntime {
  constructor({ needsConsent = false } = {}) {
    this.needsConsent = needsConsent;
    this.state = null;
    this.calls = [];
    this.usageReports = [];
  }

  async start(input) {
    this.calls.push(['start', input]);
    this.state = {
      run_id: input.runId ?? 'run-1',
      status: 'awaiting_host',
      revision: 1,
      tasks: [{ task_id: 'task-P0', phase: 'P0', role: 'environment-analyst', revision: 1, status: 'queued' }],
    };
    return { run_id: this.state.run_id, status: this.state.status, next: this.state.tasks[0] };
  }

  async status() {
    return clone(this.state);
  }

  async claim(input) {
    this.calls.push(['claim', input]);
    const current = this.state.tasks.find((item) => item.status === 'queued' || item.status === 'awaiting_host');
    assert.ok(current);
    current.status = 'leased';
    this.state.status = 'working';
    return {
      run_id: this.state.run_id,
      task_id: current.task_id,
      phase: current.phase,
      role: current.role,
      revision: current.revision,
      attempt_id: `attempt-${current.phase}`,
      lease_epoch: 1,
      task_credential: 'credential',
    };
  }

  async context(claim) {
    this.calls.push(['context', claim]);
    return {
      run_id: this.state.run_id,
      task_id: claim.task_id,
      phase: 'P0',
      role: 'environment-analyst',
      pipeline_dir: '/workspace/pipeline',
      workspace_root: '/workspace',
      constraints: ['run the trusted gate'],
    };
  }

  async heartbeat() { return { status: 'executing' }; }

  async submit(input) {
    this.calls.push(['submit', input]);
    const task = this.state.tasks[0];
    task.status = 'validating';
    this.state.status = 'validating';
    return { status: 'validating', run_id: this.state.run_id, task_id: task.task_id };
  }

  async recordUsage(input) {
    this.usageReports.push(input);
    return { recorded: true };
  }

  async validate(input) {
    this.calls.push(['validate', input]);
    const task = this.state.tasks[0];
    if (this.needsConsent) {
      task.status = 'awaiting_consent';
      this.state.status = 'awaiting_consent';
      return { status: 'needs_input', consent_phase: 1, task_id: task.task_id };
    }
    task.status = 'accepted';
    this.state.status = 'completed';
    return { status: 'completed', run_id: this.state.run_id };
  }

  async consent(input) {
    this.calls.push(['consent', input]);
    this.state.tasks[0].status = 'accepted';
    this.state.status = 'completed';
    return { status: 'completed', run_id: this.state.run_id };
  }

  async release(input) {
    this.calls.push(['release', input]);
    this.state.status = 'awaiting_host';
    this.state.tasks[0].status = 'awaiting_host';
    return { status: 'awaiting_host' };
  }

  async cancel(input) {
    this.calls.push(['cancel', input]);
    this.state.status = 'cancelled';
    this.state.tasks[0].status = 'cancelled';
    return { status: 'cancelled', run_id: this.state.run_id };
  }
}

test('scheduler runs a leased task through submit and deterministic validation', async () => {
  const runtime = new FakeArRuntime();
  const executions = [];
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async () => ({ id: 'fixture-agent', name: 'Fixture Agent', available: true, dispatchable: true }),
    executor: {
      async run(input) {
        executions.push(input);
        return {
          artifactRefs: ['evidence/phase0/environment.json'],
          summary: 'P0 evidence produced',
          usage: { input_tokens: 10, output_tokens: 6, total_tokens: 16 },
          durationMs: 125,
          invocation: { provider: 'codex', model: 'o1' },
        };
      },
    },
    hostBindingId: 'fixture-host',
    heartbeatIntervalMs: 10_000,
  });

  const started = await scheduler.start({ runId: 'run-1', agent: 'fixture-agent' });
  await scheduler.waitForIdle(started.run_id);
  assert.equal((await runtime.status()).status, 'completed');
  assert.equal(executions.length, 1);
  assert.equal(executions[0].context.pipeline_dir, '/workspace/pipeline');
  assert.equal(executions[0].definition.id, 'fixture-agent');
  assert.equal(scheduler.job(started.run_id).status, 'completed');
  assert.equal(runtime.usageReports.length, 1);
  assert.equal(runtime.usageReports[0].usage.total_tokens, 16);
  assert.equal(runtime.usageReports[0].provider, 'codex');
  assert.equal(runtime.usageReports[0].model, 'o1');
  assert.equal(runtime.usageReports[0].durationMs, 125);
});

test('scheduler stops at a human gate and resumes only after consent', async () => {
  const runtime = new FakeArRuntime({ needsConsent: true });
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: { async run() { return { artifactRefs: ['evidence/p0.json'], summary: 'evidence' }; } },
    hostBindingId: 'fixture-host',
  });

  const started = await scheduler.start({ runId: 'run-consent', agent: 'fixture-agent' });
  await scheduler.waitForIdle(started.run_id);
  assert.equal((await runtime.status()).status, 'awaiting_consent');
  assert.equal(scheduler.job(started.run_id).status, 'awaiting_consent');
  await scheduler.consent({ runId: started.run_id, taskId: 'task-P0', phase: 1, token: 'review-token' });
  await scheduler.waitForIdle(started.run_id);
  assert.equal((await runtime.status()).status, 'completed');
});

test('scheduler cancellation updates the authoritative runtime after stopping the executor', async () => {
  const runtime = new FakeArRuntime();
  let started;
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: {
      async run({ signal }) {
        started?.();
        await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
        throw Object.assign(new Error('cancelled'), { code: 'codeagent_cancelled' });
      },
    },
    heartbeatIntervalMs: 10_000,
  });
  const entered = new Promise((resolve) => { started = resolve; });
  const result = await scheduler.start({ runId: 'run-cancel', agent: 'fixture-agent' });
  await entered;
  await scheduler.cancel(result.run_id, 'operator stop');
  await scheduler.waitForIdle(result.run_id);
  assert.equal((await runtime.status()).status, 'cancelled');
  assert.deepEqual(runtime.calls.find((entry) => entry[0] === 'cancel'), ['cancel', { runId: 'run-cancel', reason: 'operator stop' }]);
  assert.equal(scheduler.job(result.run_id).status, 'cancelled');
});

test('scheduler forwards the selected model to the agent resolver and executor', async () => {
  const runtime = new FakeArRuntime();
  let resolvedModel;
  let executionDefinition;
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async (_id, model) => {
      resolvedModel = model;
      return { id: 'fixture-agent', model, available: true, dispatchable: true };
    },
    executor: {
      async run({ definition }) {
        executionDefinition = definition;
        return { artifactRefs: ['evidence/model.json'] };
      },
    },
  });
  const started = await scheduler.start({ runId: 'run-model', agent: 'fixture-agent', model: 'deepseek-reasoner' });
  await scheduler.waitForIdle(started.run_id);
  assert.equal(resolvedModel, 'deepseek-reasoner');
  assert.equal(executionDefinition.model, 'deepseek-reasoner');
});

test('scheduler rejects unsafe artifact references before submit', async () => {
  const runtime = new FakeArRuntime();
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: { async run() { return { artifactRefs: ['../outside.txt'] }; } },
  });
  const started = await scheduler.start({ runId: 'run-unsafe-artifact', agent: 'fixture-agent' });
  await scheduler.waitForIdle(started.run_id);
  const job = scheduler.job(started.run_id);
  assert.equal(job.status, 'failed');
  assert.equal(job.last_error.code, 'agent_artifact_invalid');
  assert.equal(runtime.calls.some(([name]) => name === 'submit'), false);
});

test('scheduler persists an execution failure in runtime observability when available', async () => {
  const runtime = new FakeArRuntime();
  const failures = [];
  runtime.recordSchedulerFailure = async (input) => { failures.push(input); return { recorded: true }; };
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: { async run() { throw Object.assign(new Error('agent crashed'), { code: 'codeagent_failed' }); } },
  });
  const started = await scheduler.start({ runId: 'run-execution-failure', agent: 'fixture-agent' });
  await scheduler.waitForIdle(started.run_id);
  assert.equal(scheduler.job(started.run_id).status, 'failed');
  assert.equal(failures.length, 1);
  assert.equal(failures[0].runId, 'run-execution-failure');
  assert.equal(failures[0].attemptId, 'attempt-P0');
  assert.equal(failures[0].error.code, 'codeagent_failed');
  assert.equal(failures[0].error.message, 'agent crashed');
});

test('scheduler still aborts and finalizes cancellation when the authoritative request fails', async () => {
  const runtime = new FakeArRuntime();
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  runtime.requestCancel = async () => { throw Object.assign(new Error('runtime unavailable'), { code: 'runtime_unavailable' }); };
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: {
      async run({ signal }) {
        entered();
        await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
        throw Object.assign(new Error('stopped'), { code: 'codeagent_cancelled' });
      },
    },
  });
  const started = await scheduler.start({ runId: 'run-cancel-request-failure', agent: 'fixture-agent' });
  await enteredPromise;
  await scheduler.cancel(started.run_id, 'operator stop');
  await scheduler.waitForIdle(started.run_id);
  assert.equal((await runtime.status()).status, 'cancelled');
  assert.equal(scheduler.job(started.run_id).status, 'cancelled');
  assert.equal(scheduler.job(started.run_id).cancel_reason, 'operator stop');
});

test('scheduler shutdown aborts local work without issuing an authoritative user cancellation', async () => {
  const runtime = new FakeArRuntime();
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: {
      async run({ signal }) {
        entered();
        await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
        throw Object.assign(new Error('scheduler stopped'), { code: 'codeagent_cancelled' });
      },
    },
  });
  const started = await scheduler.start({ runId: 'run-shutdown', agent: 'fixture-agent' });
  await enteredPromise;
  scheduler.close();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.calls.some(([name]) => name === 'cancel'), false);
  assert.equal(scheduler.job(started.run_id).status, 'queued');
});

test('scheduler pauses for reconciliation when validation is interrupted after submit', async () => {
  const runtime = new FakeArRuntime();
  runtime.validate = async () => { throw Object.assign(new Error('gate process interrupted'), { code: 'python_command_failed' }); };
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: { async run() { return { artifactRefs: ['evidence/validation.json'] }; } },
  });
  const started = await scheduler.start({ runId: 'run-validation-interrupted', agent: 'fixture-agent' });
  await scheduler.waitForIdle(started.run_id);
  const job = scheduler.job(started.run_id);
  assert.equal(job.status, 'needs_reconcile');
  assert.equal(job.last_error.code, 'validation_interrupted');
  assert.equal(runtime.calls.filter(([name]) => name === 'release').length, 0);
});

test('scheduler refuses new work after close', async () => {
  const runtime = new FakeArRuntime();
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: { async run() { throw new Error('must not run'); } },
  });
  scheduler.close();
  await assert.rejects(
    scheduler.start({ runId: 'run-closed', agent: 'fixture-agent' }),
    (error) => error.code === 'scheduler_closed',
  );
});

test('scheduler holds the workspace resource lock through validation and releases it afterwards', async () => {
  const runtime = new FakeArRuntime();
  const events = [];
  const resourceLocks = {
    async acquire(input) {
      events.push(['acquire', input]);
      return {
        async release() { events.push(['release', input]); },
      };
    },
  };
  runtime.validate = async (input) => {
    events.push(['validate', input]);
    runtime.state.tasks[0].status = 'accepted';
    runtime.state.status = 'completed';
    return { status: 'completed', run_id: runtime.state.run_id };
  };
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resourceLocks,
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: { async run() { events.push(['execute']); return { artifactRefs: ['evidence/locked.json'] }; } },
  });
  const started = await scheduler.start({ runId: 'run-locked', agent: 'fixture-agent' });
  await scheduler.waitForIdle(started.run_id);
  assert.deepEqual(events.map(([name]) => name), ['acquire', 'execute', 'validate', 'release']);
  assert.equal(events[0][1].resourceKey, '/workspace');
  assert.equal(events[0][1].runId, 'run-locked');
  assert.equal(scheduler.job(started.run_id).status, 'completed');
});

test('scheduler releases the runtime lease when a resource is busy', async () => {
  const runtime = new FakeArRuntime();
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resourceLocks: { async acquire() { throw Object.assign(new Error('workspace busy'), { code: 'resource_busy' }); } },
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: { async run() { throw new Error('must not execute'); } },
  });
  const started = await scheduler.start({ runId: 'run-busy', agent: 'fixture-agent' });
  await scheduler.waitForIdle(started.run_id);
  assert.equal(scheduler.job(started.run_id).status, 'failed');
  assert.equal(scheduler.job(started.run_id).last_error.code, 'resource_busy');
  assert.equal(runtime.calls.filter(([name]) => name === 'release').length, 1);
});

test('scheduler tolerates a corrupt persisted error instead of failing startup', () => {
  const db = {
    exec() {},
    prepare(sql) {
      if (sql.startsWith('PRAGMA table_info')) return { all: () => [{ name: 'cancel_reason' }, { name: 'model' }] };
      if (sql.startsWith('SELECT * FROM scheduler_jobs')) return {
        all: () => [{
          run_id: 'persisted-corrupt', agent: 'fixture-agent', model: null, status: 'failed', attempts: 1,
          active_attempt_id: null, cancel_requested: 0, cancel_reason: null,
          last_error_json: '{not-json', created_at: '2026-09-12T00:00:00.000Z', updated_at: '2026-09-12T00:00:01.000Z',
        }],
      };
      return { run() {} };
    },
  };
  const runtime = new FakeArRuntime();
  runtime.runtime = { store: { db } };
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resourceLocks: null,
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: { async run() { return { artifactRefs: ['evidence/never.json'] }; } },
  });
  const job = scheduler.job('persisted-corrupt');
  assert.equal(job.status, 'failed');
  assert.equal(job.last_error.code, 'scheduler_state_corrupt');
  scheduler.close();
});

test('scheduler clears recovered run locks only after runtime sync succeeds', async () => {
  const runtime = new FakeArRuntime();
  runtime.sync = async (runId) => { runtime.calls.push(['sync', runId]); return { status: 'dispatch_needed' }; };
  const events = [];
  const scheduler = new ArDeliveryScheduler({
    service: runtime,
    resourceLocks: {
      async acquire() { return { async release() {} }; },
      async releaseForRun(runId) { events.push(['releaseForRun', runId]); return { released: 1 }; },
    },
    resolveAgent: async () => ({ id: 'fixture-agent', available: true, dispatchable: true }),
    executor: { async run() { return { artifactRefs: ['evidence/recovery.json'] }; } },
  });
  const started = await scheduler.start({ runId: 'run-recovery', agent: 'fixture-agent' });
  await scheduler.waitForIdle(started.run_id);
  // The normal execution releases its lock; call resume to exercise the
  // restart/reconcile path and ensure the run-scoped cleanup is used.
  await scheduler.resume(started.run_id);
  await scheduler.waitForIdle(started.run_id);
  assert.deepEqual(events, [['releaseForRun', 'run-recovery']]);
  assert.equal(runtime.calls.some(([name]) => name === 'sync'), true);
});
