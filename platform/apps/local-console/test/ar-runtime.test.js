import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { createRuntime } from '../../../../runtime/dsh-ohos/src/runtime.js';
import { ArRuntimeService } from '../src/ar-runtime.js';

class FakeDeliveryAdapter {
  constructor(pipelineDir) {
    this.pipelineDir = pipelineDir;
    this.state = null;
  }

  async initialize(args) {
    this.state ??= {
      ok: true,
      pipeline_dir: this.pipelineDir,
      pipeline_run_id: args.run_id,
      repo_root: args.repo_root,
      current_phase: 0,
      complete: false,
      environment: args.environment,
      phases: [],
    };
    return this.state;
  }

  async inspect() {
    return this.state;
  }

  async validateGate(_pipelineDir, phase, { uploadPrecheck = false } = {}) {
    return { ok: true, entry: { entry_id: `evidence-P${phase}`, phase, verdict: 'PASS', uploadPrecheck } };
  }

  async consent(_pipelineDir, phase) {
    return { ok: true, phase };
  }

  async advance(_pipelineDir, phase) {
    this.state = {
      ...this.state,
      current_phase: Math.min(phase + 1, 8),
      complete: phase === 8,
      gate: { ok: false, reason: 'next evidence pending' },
      consent: { ok: false, reason: 'next consent pending' },
    };
    return this.state;
  }
}

const VERIFIED_CAPABILITIES = Object.freeze({
  mcp_tools: true,
  native_subagent: true,
  isolated_context: true,
  workspace_write: true,
  build_execution: true,
  device_access: true,
  network_publish: true,
  model_observable: true,
  usage_observable: true,
  cancel_observable: true,
  background_execution: true,
});

describe('authoritative AR runtime service', () => {
  test('drives all ten AR tasks and exposes auditable observability', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-runtime-'));
    const pipelineDir = join(root, 'pipeline');
    const adapter = new FakeDeliveryAdapter(pipelineDir);
    const runtime = createRuntime({
      dataRoot: join(root, 'runtime'),
      deliveryAdapter: adapter,
      principal: 'all',
    });
    const service = new ArRuntimeService({ runtime, hostBindingId: 'local-claude', hostCapabilities: VERIFIED_CAPABILITIES, capabilitySource: 'test-fixture' });
    try {
      const started = await service.start({
        runId: 'ar-runtime-test',
        arText: '# AR test',
        repoRoot: root,
        environment: 'openharmony',
        gitDir: 'base/hiviewdfx/hiview',
        buildTarget: 'hiview_package',
        part: 'hiviewdfx',
      });
      assert.equal(started.next.phase, 'P0');
      await service.recordHumanInput({
        runId: started.run_id,
        taskId: started.next.task_id,
        phase: 'P0',
        kind: 'review_comment',
        actor: 'tester',
        content: '环境报告已核对，可以继续。',
      });

      let next = started.next;
      let completed;
      let sequence = 0;
      while (next) {
        sequence += 1;
        const claim = await service.claim({
          runId: started.run_id,
          role: next.role,
          expectedRevision: next.expected_revision ?? 1,
          contextId: `ctx-${sequence}`,
        });
        const context = await service.context(claim);
        assert.equal(context.pipeline_dir, pipelineDir);
        if (sequence === 1) {
          await service.recordUsage({
            runId: started.run_id,
            attemptId: claim.attempt_id,
            phase: claim.phase,
            agent: 'codex',
            provider: 'codex',
            model: 'gpt-5.6',
            usage: {
              input_tokens: 100, output_tokens: 40, total_tokens: 140,
              cache_read_tokens: 10, reasoning_tokens: 6,
            },
            durationMs: 321,
            status: 'completed',
          });
        }
        const submitted = await service.submit({
          attemptId: claim.attempt_id,
          leaseEpoch: claim.lease_epoch,
          taskCredential: claim.task_credential,
          revision: claim.revision,
          artifactRefs: [`evidence/${claim.phase}.json`],
          summary: `${claim.phase} evidence`,
        });
        assert.equal(submitted.status, 'validating');
        let result = await service.validate({
          runId: started.run_id,
          taskId: claim.task_id,
          expectedRevision: claim.revision,
        });
        if (result.status === 'needs_input') {
          const waiting = await service.status(started.run_id);
          assert.equal(waiting.observability.current_blockers[0].phase, claim.phase);
          assert.equal(waiting.observability.current_blockers[0].phase_number, result.consent_phase);
          result = await service.consent({
            runId: started.run_id,
            taskId: claim.task_id,
            phase: result.consent_phase,
            token: `reviewer-${result.consent_phase}`,
          });
        }
        if (result.status === 'completed') {
          completed = result;
          next = null;
        } else {
          assert.equal(result.status, 'dispatch_needed');
          next = result.next;
        }
      }

      assert.equal(completed.phase, 'P8-publish');
      const status = await service.status(started.run_id);
      assert.equal(status.status, 'completed');
      assert.equal(status.tasks.length, 10);
      assert.equal(status.observability.stage_count, 10);
      assert.equal(status.observability.human_intervention_count, 4);
      assert.equal(status.observability.human_wait_count, 4);
      assert.equal(status.observability.human_wait_open_count, 0);
      assert.equal(status.observability.human_wait_intervals.length, 4);
      assert.equal(status.observability.human_wait_intervals.every((item) => item.status === 'closed'), true);
      assert.equal(status.observability.human_wait_ms >= 0, true);
      assert.equal(status.observability.wall_elapsed_ms >= status.observability.human_wait_ms, true);
      assert.equal(status.observability.effective_elapsed_ms,
        status.observability.wall_elapsed_ms - status.observability.human_wait_ms);
      assert.deepEqual(status.observability.human_intervention_by_category, {
        required_workflow: 4,
      });
      assert.equal(status.observability.human_input_count, 1);
      assert.equal(status.observability.human_inputs.some((item) => item.content === '环境报告已核对，可以继续。'), true);
      assert.equal(status.observability.token_usage.status, 'partial');
      assert.equal(status.observability.token_usage.input_tokens, 100);
      assert.equal(status.observability.token_usage.output_tokens, 40);
      assert.equal(status.observability.token_usage.total_tokens, 140);
      assert.equal(status.observability.token_usage.cache_read_tokens, 10);
      assert.equal(status.observability.token_usage.reasoning_tokens, 6);
      assert.equal(status.observability.token_usage.by_phase.P0.total_tokens, 140);
      assert.equal(status.observability.stages.find((stage) => stage.phase === 'P0').codeagent_duration_ms, 321);
      assert.equal(status.observability.stages.find((stage) => stage.phase === 'P0').attempts[0].usage.total_tokens, 140);
      const p1 = status.observability.stages.find((stage) => stage.phase === 'P1');
      assert.equal(p1.human_wait_ms >= 0, true);
      assert.equal(p1.effective_elapsed_ms, p1.elapsed_ms - p1.human_wait_ms);
      assert.equal(status.observability.gate_pass_count, 10);
      assert.equal(status.observability.stage_completion_count, 10);
      assert.equal(status.observability.run_success_count, 1);
      assert.equal(status.observability.run_success_rate, 1);
      assert.equal(status.observability.raw_gate_fail_count, 0);
      assert.equal(status.observability.normalized_gate_failure_count, 0);
      assert.equal(status.observability.execution_failure_count, 0);
      await mkdir(join(pipelineDir, 'reports'), { recursive: true });
      await writeFile(join(pipelineDir, 'reports', 'large.txt'), 'report body', 'utf8');
      const report = await service.artifactContent(started.run_id, 'reports/large.txt');
      assert.equal(report.relative_path, 'reports/large.txt');
      assert.equal(report.role, 'report');
      assert.equal(report.content, 'report body');
      await assert.rejects(() => service.artifactContent(started.run_id, '../controller.sqlite3'),
        (error) => error.code === 'artifact_not_found');
      assert.equal(status.observability.success_count, 1);
      const runs = service.listRuns();
      assert.equal(runs.length, 1);
      assert.equal(runs[0].run_id, 'ar-runtime-test');
      assert.equal(runs[0].observability.stage_count, 10);
    } finally {
      service.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  test('does not claim build, device or publish capabilities without a verified probe', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-capabilities-'));
    const runtime = createRuntime({
      dataRoot: join(root, 'runtime'),
      deliveryAdapter: new FakeDeliveryAdapter(join(root, 'pipeline')),
      principal: 'all',
    });
    const service = new ArRuntimeService({ runtime, hostBindingId: 'unprobed-host' });
    try {
      const registered = await service.ensureHost();
      assert.equal(registered.capabilities.build_execution, false);
      assert.equal(registered.capabilities.device_access, false);
      assert.equal(registered.capabilities.network_publish, false);
      assert.equal(registered.capability_source, 'unverified');
    } finally {
      service.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  test('refreshes host registration after a restart when capabilities change', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-host-refresh-'));
    const dataRoot = join(root, 'runtime');
    const adapter = new FakeDeliveryAdapter(join(root, 'pipeline'));
    const firstRuntime = createRuntime({ dataRoot, deliveryAdapter: adapter, principal: 'all' });
    const firstService = new ArRuntimeService({
      runtime: firstRuntime,
      hostBindingId: 'restart-host',
      hostCapabilities: { mcp_tools: true, workspace_write: false },
      capabilitySource: 'initial-probe',
    });
    try {
      await firstService.ensureHost();
    } finally {
      firstService.close();
    }

    const secondRuntime = createRuntime({ dataRoot, deliveryAdapter: adapter, principal: 'all' });
    const secondService = new ArRuntimeService({
      runtime: secondRuntime,
      hostBindingId: 'restart-host',
      hostCapabilities: { mcp_tools: true, workspace_write: true },
      capabilitySource: 'refreshed-probe',
    });
    try {
      const refreshed = await secondService.ensureHost();
      assert.equal(refreshed.capabilities.workspace_write, true);
      assert.equal(refreshed.capability_source, 'refreshed-probe');
    } finally {
      secondService.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  test('keeps missing token dimensions unknown instead of reporting zero usage', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-usage-'));
    const runtime = createRuntime({
      dataRoot: join(root, 'runtime'),
      deliveryAdapter: new FakeDeliveryAdapter(join(root, 'pipeline')),
      principal: 'all',
    });
    const service = new ArRuntimeService({ runtime, hostBindingId: 'usage-host' });
    try {
      const started = await service.start({ runId: 'ar-usage-test', repoRoot: root, environment: 'openharmony' });
      const first = await service.recordUsage({ runId: started.run_id, phase: 'P0', usage: { input_tokens: 12 } });
      const replay = await service.recordUsage({ runId: started.run_id, phase: 'P0', usage: { input_tokens: 12 } });
      assert.equal(replay.seq, first.seq);
      const status = await service.status(started.run_id);
      assert.equal(status.observability.token_usage.status, 'partial');
      assert.equal(status.observability.token_usage.input_tokens, 12);
      assert.equal(status.observability.token_usage.output_tokens, null);
      assert.equal(status.observability.token_usage.total_tokens, null);
      assert.equal(status.observability.token_usage.by_phase.P0.output_tokens, null);
    } finally {
      service.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  test('deduplicates retried human input and counts only explicit interventions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-human-input-idempotency-'));
    const runtime = createRuntime({
      dataRoot: join(root, 'runtime'),
      deliveryAdapter: new FakeDeliveryAdapter(join(root, 'pipeline')),
      principal: 'all',
    });
    const service = new ArRuntimeService({ runtime, hostBindingId: 'human-input-host' });
    try {
      const started = await service.start({
        runId: 'ar-human-input-idempotency',
        repoRoot: root,
        environment: 'openharmony',
      });
      const input = {
        runId: started.run_id,
        taskId: started.next.task_id,
        phase: 'P0',
        kind: 'user_correction',
        category: 'user_correction',
        actor: 'tester',
        content: '修正环境探针路径。',
        idempotencyKey: 'human-input-retry-1',
      };
      const first = await service.recordHumanInput(input);
      const replay = await service.recordHumanInput(input);
      assert.equal(replay.seq, first.seq);
      const observation = (await service.status(started.run_id)).observability;
      assert.equal(observation.human_input_count, 1);
      assert.equal(observation.human_intervention_count, 1);
      assert.deepEqual(observation.human_intervention_by_category, { user_correction: 1 });
    } finally {
      service.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  test('delegates artifact listing and content to a remote delivery adapter', async () => {
    const calls = [];
    const deliveryAdapter = {
      async artifacts(pipelineDir, status) {
        calls.push(['artifacts', pipelineDir, status.run_id]);
        return { pipeline_dir: pipelineDir, source: 'workspace-gateway', artifacts: [{ relative_path: 'reports/remote.md' }] };
      },
      async artifactContent(pipelineDir, path, runId) {
        calls.push(['content', pipelineDir, path, runId]);
        return { run_id: runId, relative_path: path, content: 'remote report' };
      },
    };
    const runtime = {
      tools: new Map([['ohos_run_status', { async call() {
        return { ok: true, result: { run_id: 'remote-run', pipeline_dir: '/srv/project/specs/pipeline/remote-run', status: 'running' } };
      } }]]),
    };
    const service = new ArRuntimeService({ runtime, deliveryAdapter });
    assert.deepEqual(await service.artifacts('remote-run'), {
      pipeline_dir: '/srv/project/specs/pipeline/remote-run',
      source: 'workspace-gateway', artifacts: [{ relative_path: 'reports/remote.md' }],
    });
    assert.deepEqual(await service.artifactContent('remote-run', 'reports/remote.md'), {
      run_id: 'remote-run', relative_path: 'reports/remote.md', content: 'remote report',
    });
    assert.deepEqual(calls, [
      ['artifacts', '/srv/project/specs/pipeline/remote-run', 'remote-run'],
      ['content', '/srv/project/specs/pipeline/remote-run', 'reports/remote.md', 'remote-run'],
    ]);
  });

  test('projects local binary artifacts as hash metadata instead of decoded text', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-binary-artifact-'));
    const pipelineDir = join(root, 'specs', 'pipeline', 'run-binary');
    await mkdir(join(pipelineDir, 'evidence'), { recursive: true });
    await writeFile(join(pipelineDir, 'evidence', 'app.hap'), Buffer.from([0, 255, 16, 128]));
    const runtime = {
      tools: new Map([['ohos_run_status', { async call() {
        return { ok: true, result: { run_id: 'run-binary', pipeline_dir: pipelineDir, status: 'running' } };
      } }]]),
    };
    const service = new ArRuntimeService({ runtime });
    try {
      const result = await service.artifacts('run-binary');
      assert.deepEqual(result.artifacts[0], {
        artifact_id: 'run-binary:evidence/app.hap',
        relative_path: 'evidence/app.hap',
        filename: 'app.hap',
        role: 'evidence',
        size_bytes: 4,
        sha256: 'a33bb2aed757bc839807d7a9deab0688c3cf06d36e53cb428f2e539c8dc76c5b',
        content_type: 'application/octet-stream',
        content: null,
        truncated: false,
        binary: true,
        content_available: false,
      });
      const downloaded = await service.artifactContent('run-binary', 'evidence/app.hap');
      assert.equal(downloaded.binary, true);
      assert.equal(downloaded.content, null);
      assert.equal(downloaded.content_available, true);
      assert.equal(downloaded.content_base64, Buffer.from([0, 255, 16, 128]).toString('base64'));
    } finally {
      service.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  test('lists artifacts nested below a phase directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-nested-artifact-'));
    const pipelineDir = join(root, 'specs', 'pipeline', 'run-nested');
    await mkdir(join(pipelineDir, 'evidence', 'P0'), { recursive: true });
    await writeFile(join(pipelineDir, 'evidence', 'P0', 'codeagent.stdout.log'), 'P0 output\n', 'utf8');
    const runtime = {
      tools: new Map([['ohos_run_status', { async call() {
        return { ok: true, result: { run_id: 'run-nested', pipeline_dir: pipelineDir, status: 'running' } };
      } }]]),
    };
    const service = new ArRuntimeService({ runtime });
    try {
      const result = await service.artifacts('run-nested');
      assert.ok(result.artifacts.some((artifact) => artifact.relative_path === 'evidence/P0/codeagent.stdout.log'));
    } finally {
      service.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  test('cancels an AR run in the authoritative store and keeps the cancellation observable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-cancel-'));
    const runtime = createRuntime({
      dataRoot: join(root, 'runtime'),
      deliveryAdapter: new FakeDeliveryAdapter(join(root, 'pipeline')),
      principal: 'all',
    });
    const service = new ArRuntimeService({
      runtime,
      hostBindingId: 'cancel-host',
      hostCapabilities: VERIFIED_CAPABILITIES,
      capabilitySource: 'test-fixture',
    });
    try {
      const started = await service.start({ runId: 'ar-cancel-test', arText: '# AR cancel', repoRoot: root, environment: 'openharmony' });
      const cancelled = await service.cancel({ runId: started.run_id, reason: 'operator stop' });
      assert.equal(cancelled.status, 'cancelled');
      const status = await service.status(started.run_id);
      assert.equal(status.status, 'cancelled');
      assert.equal(status.tasks[0].status, 'cancelled');
      assert.equal(status.events.some((event) => event.type === 'run.cancelled'), true);
    } finally {
      service.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  test('maps an unrecognized local host kind to the protocol-safe other kind', async () => {
    const calls = [];
    const runtime = {
      tools: new Map([['ohos_host_register', { async call(args) {
        calls.push(args);
        return { ok: true, result: { binding_id: args.binding_id } };
      } }]]),
    };
    const service = new ArRuntimeService({ runtime, hostKind: 'local-codeagent' });
    await service.ensureHost();
    assert.equal(calls[0].host_kind, 'other');
  });

  test('keeps cancellation request idempotent when an operator changes the displayed reason', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-cancel-idempotency-'));
    const runtime = createRuntime({
      dataRoot: join(root, 'runtime'),
      deliveryAdapter: new FakeDeliveryAdapter(join(root, 'pipeline')),
      principal: 'all',
    });
    const service = new ArRuntimeService({
      runtime,
      hostBindingId: 'cancel-idempotency-host',
      hostCapabilities: VERIFIED_CAPABILITIES,
      capabilitySource: 'test-fixture',
    });
    try {
      await service.start({ runId: 'ar-cancel-idempotency', arText: '# AR cancel', repoRoot: root, environment: 'openharmony' });
      await service.claim({
        runId: 'ar-cancel-idempotency',
        role: 'environment-analyst',
        expectedRevision: 1,
        contextId: 'cancel-idempotency-context',
      });
      await service.requestCancel({ runId: 'ar-cancel-idempotency', reason: 'first reason' });
      const replay = await service.requestCancel({ runId: 'ar-cancel-idempotency', reason: 'second reason' });
      assert.equal(replay.status, 'cancelling');
    } finally {
      service.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  test('records scheduler failures in stage observability with an actionable blocker', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-scheduler-failure-'));
    const runtime = createRuntime({
      dataRoot: join(root, 'runtime'),
      deliveryAdapter: new FakeDeliveryAdapter(join(root, 'pipeline')),
      principal: 'all',
    });
    const service = new ArRuntimeService({
      runtime,
      hostBindingId: 'failure-host',
      hostCapabilities: VERIFIED_CAPABILITIES,
      capabilitySource: 'test-fixture',
    });
    try {
      const started = await service.start({
        runId: 'ar-scheduler-failure',
        arText: '# AR failure',
        repoRoot: root,
        environment: 'openharmony',
      });
      const failure = await service.recordSchedulerFailure({
        runId: started.run_id,
        attemptId: 'attempt-codeagent-17',
        code: 'codeagent_failed',
        message: 'CodeAgent exited with 17',
        details: { exit_code: 17 },
      });
      const replay = await service.recordSchedulerFailure({
        runId: started.run_id,
        attemptId: 'attempt-codeagent-17',
        code: 'codeagent_failed',
        message: 'CodeAgent exited with 17',
        details: { exit_code: 17 },
      });
      assert.equal(failure.recorded, true);
      assert.equal(replay.seq, failure.seq);
      const status = await service.status(started.run_id);
      assert.equal(status.observability.failure_count, 1);
      assert.equal(status.observability.failure_reasons[0].code, 'codeagent_failed');
      assert.equal(status.observability.current_blockers[0].code, 'SCHEDULER_FAILURE');
      assert.equal(status.observability.current_blockers[0].message, 'CodeAgent exited with 17');
      assert.equal(status.observability.current_blockers[0].phase, 'P0');
    } finally {
      service.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  test('keeps total wait and effective time unknown when legacy and closed waits are mixed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ar-mixed-human-waits-'));
    const runtime = createRuntime({
      dataRoot: join(root, 'runtime'),
      deliveryAdapter: new FakeDeliveryAdapter(join(root, 'pipeline')),
      principal: 'all',
    });
    const service = new ArRuntimeService({
      runtime,
      hostBindingId: 'mixed-wait-host',
      hostCapabilities: VERIFIED_CAPABILITIES,
      capabilitySource: 'test-fixture',
    });
    try {
      const started = await service.start({
        runId: 'ar-mixed-human-waits',
        arText: '# AR mixed waits',
        repoRoot: root,
        environment: 'openharmony',
      });
      const base = Date.now() - 1000;
      const iso = (offset) => new Date(base + offset).toISOString();
      runtime.store.event(started.run_id, 'task.awaiting_consent', {
        task_id: started.next.task_id,
        phase: 'P0',
        revision: 1,
        wait_id: 'wait-closed-legacy-mix',
        category: 'required_workflow',
      }, iso(100));
      runtime.store.event(started.run_id, 'human.action_recorded', {
        action_id: 'action-closed-legacy-mix',
        wait_id: 'wait-closed-legacy-mix',
        task_id: started.next.task_id,
        phase: 'P0',
        category: 'required_workflow',
        decision: 'approve',
      }, iso(300));
      runtime.store.event(started.run_id, 'task.awaiting_consent', {
        task_id: started.next.task_id,
        phase: 'P0',
        revision: 1,
        wait_id: 'wait-unknown-legacy-mix',
        category: 'required_workflow',
      }, iso(400));

      const observation = (await service.status(started.run_id)).observability;
      assert.equal(observation.human_wait_count, 2);
      assert.equal(observation.human_wait_unknown_count, 1);
      assert.equal(observation.human_wait_data_quality, 'partial');
      assert.equal(observation.human_wait_ms, null);
      assert.equal(observation.effective_elapsed_ms, null);
      const p0 = observation.stages.find((stage) => stage.phase === 'P0');
      assert.equal(p0.human_wait_ms, null);
      assert.equal(p0.effective_elapsed_ms, null);
    } finally {
      service.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
