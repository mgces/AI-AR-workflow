import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
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
    const service = new ArRuntimeService({ runtime, hostBindingId: 'local-claude' });
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
      assert.equal(status.observability.token_usage.status, 'unknown');
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
});
