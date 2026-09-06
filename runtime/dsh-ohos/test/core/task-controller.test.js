import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import {
  OhosController,
  ProtocolError,
  SqliteStore,
  TaskCredentials,
} from '../../src/index.js';

describe('OhosController', () => {
  let store;
  let controller;
  let now;

  beforeEach(() => {
    store = new SqliteStore(':memory:');
    now = new Date('2026-09-06T00:00:00.000Z');
    controller = new OhosController({
      store,
      credentials: new TaskCredentials(Buffer.alloc(32, 7)),
      clock: () => now,
      leaseMs: 60_000,
    });
  });

  afterEach(() => store.close());

  test('host-native task moves to validating without granting PASS', () => {
    registerCapableHost(controller);
    const started = controller.startRun({
      workflow: 'requirement',
      input_ref: 'artifact:raw-requirement',
      docs_root: 'artifact-area:requirements',
      idempotency_key: 'start-1',
    });

    assert.equal(started.status, 'awaiting_host');
    assert.equal(started.next.role, 'requirement-analyst');

    const claimArgs = {
      run_id: started.run_id,
      role: 'requirement-analyst',
      host_binding_id: 'codex-local',
      expected_revision: 1,
      idempotency_key: 'claim-1',
    };
    const claimed = controller.claimTask(claimArgs);
    const replayed = controller.claimTask(claimArgs);
    assert.deepEqual(replayed, claimed);
    assert.equal(claimed.execution_mode, 'host_native');
    assert.match(claimed.task_credential, /^attempt-/);

    const context = controller.taskContext({
      attempt_id: claimed.attempt_id,
      lease_epoch: claimed.lease_epoch,
      task_credential: claimed.task_credential,
    });
    assert.equal(context.input_ref, 'artifact:raw-requirement');
    assert.equal(context.phase, 'R1');
    assert(context.constraints.some((item) => item.includes('Do not report workflow PASS')));

    now = new Date('2026-09-06T00:00:10.000Z');
    const heartbeat = controller.heartbeatTask({
      attempt_id: claimed.attempt_id,
      lease_epoch: claimed.lease_epoch,
      task_credential: claimed.task_credential,
    });
    assert.equal(heartbeat.status, 'executing');

    const submitted = controller.submitTask({
      attempt_id: claimed.attempt_id,
      revision: 1,
      lease_epoch: claimed.lease_epoch,
      task_credential: claimed.task_credential,
      artifact_refs: ['artifact:r1-draft-1'],
      summary: 'R1 draft produced.',
      idempotency_key: 'submit-1',
    });
    assert.equal(submitted.status, 'validating');
    assert.match(submitted.message, /no PASS was granted/);

    const status = controller.runStatus({ run_id: started.run_id });
    assert.equal(status.status, 'validating');
    assert.equal(status.tasks[0].status, 'validating');
    assert.deepEqual(status.events.map((event) => event.type), [
      'run.started', 'task.claimed', 'task.produced',
    ]);
  });

  test('wrong role returns a dispatch request without leasing work', () => {
    registerCapableHost(controller);
    const started = controller.startRun({
      workflow: 'delivery', input_ref: 'artifact:ar', idempotency_key: 'start-2',
    });
    const result = controller.claimTask({
      run_id: started.run_id,
      role: 'implementer',
      host_binding_id: 'codex-local',
      expected_revision: 1,
      idempotency_key: 'claim-wrong-role',
    });
    assert.deepEqual(result, {
      status: 'dispatch_needed',
      run_id: started.run_id,
      task_id: started.next.task_id,
      phase: 'P0',
      role: 'environment-analyst',
    });
    assert.equal(controller.runStatus({ run_id: started.run_id }).tasks[0].status, 'queued');
  });

  test('missing host capability fails closed', () => {
    controller.registerHost({
      binding_id: 'mcp-only',
      host_kind: 'other',
      capabilities: { mcp_tools: true, native_subagent: false },
      capability_source: 'probe:test',
      idempotency_key: 'host-mcp-only',
    });
    const started = controller.startRun({
      workflow: 'requirement', input_ref: 'artifact:req', idempotency_key: 'start-3',
    });
    assert.throws(() => controller.claimTask({
      run_id: started.run_id,
      role: 'requirement-analyst',
      host_binding_id: 'mcp-only',
      expected_revision: 1,
      idempotency_key: 'claim-missing-cap',
    }), (error) => error instanceof ProtocolError
      && error.code === 'capability_missing'
      && error.details.missing_capabilities.includes('native_subagent'));
  });

  test('stale revision and invalid task credential are rejected', () => {
    registerCapableHost(controller);
    const started = controller.startRun({
      workflow: 'requirement', input_ref: 'artifact:req', idempotency_key: 'start-4',
    });
    assert.throws(() => controller.claimTask({
      run_id: started.run_id,
      role: 'requirement-analyst',
      host_binding_id: 'codex-local',
      expected_revision: 2,
      idempotency_key: 'claim-stale',
    }), (error) => error.code === 'stale_revision');

    const claimed = controller.claimTask({
      run_id: started.run_id,
      role: 'requirement-analyst',
      host_binding_id: 'codex-local',
      expected_revision: 1,
      idempotency_key: 'claim-current',
    });
    assert.throws(() => controller.heartbeatTask({
      attempt_id: claimed.attempt_id,
      lease_epoch: claimed.lease_epoch,
      task_credential: `${claimed.task_credential}-tampered`,
    }), (error) => error.code === 'unauthorized_task');
  });

  test('idempotency keys reject changed input', () => {
    const first = {
      workflow: 'requirement', input_ref: 'artifact:a', idempotency_key: 'same-key',
    };
    controller.startRun(first);
    assert.throws(() => controller.startRun({ ...first, input_ref: 'artifact:b' }),
      (error) => error.code === 'idempotency_conflict');
  });

  test('partial artifacts quarantine a released task for reconciliation', () => {
    registerCapableHost(controller);
    const started = controller.startRun({
      workflow: 'delivery', input_ref: 'artifact:ar', idempotency_key: 'start-5',
    });
    const claimed = controller.claimTask({
      run_id: started.run_id,
      role: 'environment-analyst',
      host_binding_id: 'codex-local',
      expected_revision: 1,
      idempotency_key: 'claim-release',
    });
    const released = controller.releaseTask({
      attempt_id: claimed.attempt_id,
      lease_epoch: claimed.lease_epoch,
      task_credential: claimed.task_credential,
      reason: 'Host disconnected after creating a candidate.',
      artifact_refs: ['artifact:partial-p0'],
      idempotency_key: 'release-partial',
    });
    const replayed = controller.releaseTask({
      attempt_id: claimed.attempt_id,
      lease_epoch: claimed.lease_epoch,
      task_credential: claimed.task_credential,
      reason: 'Host disconnected after creating a candidate.',
      artifact_refs: ['artifact:partial-p0'],
      idempotency_key: 'release-partial',
    });
    assert.equal(released.status, 'needs_reconcile');
    assert.deepEqual(replayed, released);
    assert.equal(controller.runStatus({ run_id: started.run_id }).tasks[0].status,
      'needs_reconcile');
  });

  test('expired leases reject late submissions', () => {
    registerCapableHost(controller);
    const started = controller.startRun({
      workflow: 'requirement', input_ref: 'artifact:req', idempotency_key: 'start-6',
    });
    const claimed = controller.claimTask({
      run_id: started.run_id,
      role: 'requirement-analyst',
      host_binding_id: 'codex-local',
      expected_revision: 1,
      idempotency_key: 'claim-expiring',
    });
    now = new Date('2026-09-06T00:02:00.000Z');
    assert.throws(() => controller.submitTask({
      attempt_id: claimed.attempt_id,
      revision: 1,
      lease_epoch: claimed.lease_epoch,
      task_credential: claimed.task_credential,
      artifact_refs: ['artifact:late'],
      summary: 'Late result.',
      idempotency_key: 'late-submit',
    }), (error) => error.code === 'lease_lost');

    const reclaimed = controller.claimTask({
      run_id: started.run_id,
      role: 'requirement-analyst',
      host_binding_id: 'codex-local',
      expected_revision: 1,
      idempotency_key: 'claim-after-expiry',
    });
    assert.equal(reclaimed.attempt, 2);
    assert.notEqual(reclaimed.attempt_id, claimed.attempt_id);
    assert(controller.runStatus({ run_id: started.run_id }).events
      .some((event) => event.type === 'task.lease_expired'));
  });
});

function registerCapableHost(controller) {
  return controller.registerHost({
    binding_id: 'codex-local',
    host_kind: 'codex',
    host_version: 'test',
    execution_mode: 'host_native',
    capabilities: {
      mcp_tools: true,
      native_subagent: true,
      isolated_context: true,
      workspace_write: true,
    },
    capability_source: 'probe:test',
    idempotency_key: 'host-1',
  });
}
