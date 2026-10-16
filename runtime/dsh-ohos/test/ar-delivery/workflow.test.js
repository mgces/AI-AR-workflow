import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import {
  OhosController,
  ProtocolError,
  SqliteStore,
  TaskCredentials,
} from '../../src/index.js';

describe('DSH AR delivery workflow', () => {
  let store;
  let adapter;
  let controller;

  beforeEach(() => {
    store = new SqliteStore(':memory:');
    adapter = new FakeDeliveryAdapter();
    controller = new OhosController({
      store,
      credentials: new TaskCredentials(Buffer.alloc(32, 5)),
      deliveryAdapter: adapter,
      clock: () => new Date('2026-09-06T00:00:00.000Z'),
    });
    registerDeliveryHost(controller);
  });

  afterEach(() => store.close());

  test('runs P0-P8 with evidence validation, consent holds, and P8 checkpoints', async () => {
    const startArgs = {
      input_ref: 'D:/requirements/AR.md',
      repo_root: 'D:/openharmony',
      environment: 'openharmony',
      git_dir: 'base/hiviewdfx/hiview',
      build_target: 'hiview_package',
      part: 'hiviewdfx',
      publication: {
        backend: 'gitcode',
        repo_slug: 'mgce1/AI-AR-workflow',
        branch: 'codex/ar-run-42',
        base: 'main',
        issue: '#42',
        local_review_report: 'reports/local-review.json',
        pr_review_report: 'reports/pr-review.json',
      },
      idempotency_key: 'delivery-start',
    };
    const started = await controller.startDelivery(startArgs);
    const replayed = await controller.startDelivery(startArgs);
    assert.deepEqual(replayed, started);
    assert.equal(adapter.initializeCalls.length, 1);
    assert.equal(started.next.phase, 'P0');
    const persistedRun = store.db.prepare('SELECT config_json FROM runs WHERE id = ?').get(started.run_id);
    const persistedConfig = JSON.parse(persistedRun.config_json);
    assert.deepEqual(persistedConfig.publication, startArgs.publication);
    assert.equal(persistedConfig.environment, 'openharmony');
    assert.equal(persistedConfig.component_type, null);
    assert.equal(persistedConfig.device_type, null);

    let next = started.next;
    let completed;
    let sequence = 0;
    while (next) {
      sequence += 1;
      const claim = controller.claimTask({
        run_id: started.run_id,
        role: next.role,
        host_binding_id: 'delivery-host',
        expected_revision: next.expected_revision ?? 1,
        idempotency_key: `claim-${sequence}`,
      });
      const context = controller.taskContext({
        attempt_id: claim.attempt_id,
        lease_epoch: claim.lease_epoch,
        task_credential: claim.task_credential,
      });
      assert.equal(context.pipeline_dir, started.pipeline_dir);
      assert.equal(context.workspace_root, 'D:/openharmony');
      assert.deepEqual(context.publication, {
        backend: 'gitcode',
        repo_slug: 'mgce1/AI-AR-workflow',
        branch: 'codex/ar-run-42',
        base: 'main',
        issue: '#42',
        local_review_report: 'reports/local-review.json',
        pr_review_report: 'reports/pr-review.json',
      });
      if (claim.phase === 'P8-precheck') {
        assert(context.constraints.some((line) => line.includes('--repo-slug mgce1/AI-AR-workflow')));
      }
      assert(context.constraints.some((line) => line.includes('authoritative pipeline')));
      controller.submitTask({
        attempt_id: claim.attempt_id,
        revision: claim.revision,
        lease_epoch: claim.lease_epoch,
        task_credential: claim.task_credential,
        artifact_refs: [`evidence/${claim.phase}.json`],
        summary: `${claim.phase} gate executed.`,
        idempotency_key: `submit-${sequence}`,
      });
      let result = await controller.validateDeliveryTask({
        run_id: started.run_id,
        task_id: claim.task_id,
        expected_revision: claim.revision,
        idempotency_key: `validate-${sequence}`,
      });
      if (result.status === 'needs_input') {
        assert([1, 6, 7, 8].includes(result.consent_phase));
        result = await controller.consentDelivery({
          run_id: started.run_id,
          task_id: claim.task_id,
          phase: result.consent_phase,
          token: `reviewer-${result.consent_phase}`,
          idempotency_key: `consent-${sequence}`,
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
    const status = controller.runStatus({ run_id: started.run_id });
    assert.equal(status.status, 'completed');
    assert.equal(status.tasks.length, 10);
    assert(status.tasks.every((task) => task.status === 'accepted'));
    assert.deepEqual(status.tasks.map((task) => task.phase), [
      'P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8-precheck', 'P8-publish',
    ]);
    assert.deepEqual(adapter.consents.map((item) => item.phase), [1, 6, 7, 8]);
    assert.deepEqual(adapter.advances, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual(adapter.validations.map((item) => [item.phase, item.uploadPrecheck]), [
      [1, false], [6, false], [7, false], [8, true],
    ]);
    const waitEvents = store.db.prepare(`SELECT type, payload_json FROM events
      WHERE run_id = ? AND type = 'task.awaiting_consent' ORDER BY seq`).all(started.run_id);
    assert.equal(waitEvents.length, 4);
    assert.equal(waitEvents.every((event) => typeof JSON.parse(event.payload_json).wait_id === 'string'), true);
    const actionEvents = store.db.prepare(`SELECT type, payload_json FROM events
      WHERE run_id = ? AND type = 'human.action_recorded' ORDER BY seq`).all(started.run_id);
    assert.equal(actionEvents.length, 4);
    assert.deepEqual(actionEvents.map((event) => JSON.parse(event.payload_json).wait_id),
      waitEvents.map((event) => JSON.parse(event.payload_json).wait_id));
    assert.deepEqual(actionEvents.map((event) => JSON.parse(event.payload_json).category), [
      'required_workflow', 'required_workflow', 'required_workflow', 'required_workflow',
    ]);
    const gateEvents = store.db.prepare(`SELECT type FROM events
      WHERE run_id = ? AND type = 'gate.passed' ORDER BY seq`).all(started.run_id);
    assert.equal(gateEvents.length, 10);
  });

  test('a rejected Python gate requeues the same stage at a new revision', async () => {
    adapter.rejectAdvancePhase = 0;
    const started = await controller.startDelivery({
      input_ref: 'D:/requirements/AR.md',
      repo_root: 'D:/openharmony',
      environment: 'openharmony',
      confirm_defaults: true,
      idempotency_key: 'delivery-repair-start',
    });
    const claim = controller.claimTask({
      run_id: started.run_id,
      role: 'environment-analyst',
      host_binding_id: 'delivery-host',
      expected_revision: 1,
      idempotency_key: 'repair-claim',
    });
    controller.submitTask({
      attempt_id: claim.attempt_id,
      revision: 1,
      lease_epoch: claim.lease_epoch,
      task_credential: claim.task_credential,
      artifact_refs: ['evidence/phase0/env.json'],
      summary: 'P0 evidence produced.',
      idempotency_key: 'repair-submit',
    });
    const rejected = await controller.validateDeliveryTask({
      run_id: started.run_id,
      task_id: claim.task_id,
      expected_revision: 1,
      idempotency_key: 'repair-validate',
    });
    assert.equal(rejected.status, 'needs_repair');
    assert.equal(rejected.revision, 2);
    assert.equal(rejected.next.phase, 'P0');
    const status = controller.runStatus({ run_id: started.run_id });
    assert.equal(status.revision, 2);
    assert.equal(status.tasks[0].status, 'queued');
    assert.equal(status.tasks[0].revision, 2);
  });

  test('returns a consent-stage review to the same phase with idempotent feedback and a new revision', async () => {
    const pending = await reachAwaitingConsentP1(controller);
    const pythonCalls = {
      advances: [...adapter.advances],
      validations: [...adapter.validations],
      consents: [...adapter.consents],
    };
    const args = {
      run_id: pending.started.run_id,
      task_id: pending.task.task_id,
      phase: 'P1',
      decision: 'returned',
      actor: 'reviewer@example.test',
      note: 'Clarify the failure recovery behavior in the design artifact.',
      idempotency_key: 'review-return-p1',
    };

    const returned = await controller.reviewDelivery(args);
    assert.deepEqual(returned, {
      status: 'queued',
      run_id: pending.started.run_id,
      revision: 2,
    });
    assert.deepEqual(await controller.reviewDelivery(args), returned);

    adapter.state = pythonState({
      runId: pending.started.run_id, phase: 1, gate: true, consent: false,
    });
    const synced = await controller.syncDelivery({
      run_id: pending.started.run_id,
      idempotency_key: 'review-return-preserve-queue',
    });
    assert.equal(synced.status, 'awaiting_host');
    assert.equal(synced.next.status, 'dispatch_needed');
    assert.equal(synced.next.phase, 'P1');
    const status = controller.runStatus({ run_id: pending.started.run_id });
    assert.equal(status.status, 'awaiting_host');
    assert.equal(status.revision, 2);
    assert.deepEqual(status.tasks.map(({ task_id, phase, revision, status: taskStatus }) => ({
      task_id, phase, revision, status: taskStatus,
    })), [
      { task_id: `${pending.started.run_id}:P0:1`, phase: 'P0', revision: 1, status: 'accepted' },
      { task_id: pending.task.task_id, phase: 'P1', revision: 2, status: 'queued' },
    ]);
    assert.equal(store.db.prepare('SELECT status FROM attempts WHERE id = ?')
      .get(pending.task.attempt_id).status, 'rejected');
    assert.deepEqual(adapter.advances, pythonCalls.advances);
    assert.deepEqual(adapter.validations, pythonCalls.validations);
    assert.deepEqual(adapter.consents, pythonCalls.consents);

    const retry = controller.claimTask({
      run_id: pending.started.run_id,
      role: 'design-architect',
      host_binding_id: 'delivery-host',
      expected_revision: 2,
      idempotency_key: 'review-return-retry-claim',
    });
    const context = controller.taskContext({
      attempt_id: retry.attempt_id,
      lease_epoch: retry.lease_epoch,
      task_credential: retry.task_credential,
    });
    assert.deepEqual(context.review_feedback, [{
      decision: 'returned',
      phase: 'P1',
      actor: 'reviewer@example.test',
      note: 'Clarify the failure recovery behavior in the design artifact.',
      source_revision: 1,
      target_revision: 2,
    }]);
    assert(context.constraints.some((line) => line.includes('Python')));

    const reviewEvents = status.events.filter((event) => event.type === 'human.review_returned');
    assert.equal(reviewEvents.length, 1);
    assert.equal(reviewEvents[0].payload.note, args.note);
    assert.equal(reviewEvents[0].payload.actor, args.actor);
  });

  test('rejects a consent-stage review terminally and idempotently without advancing Python', async () => {
    const pending = await reachAwaitingConsentP1(controller);
    const pythonCalls = {
      advances: [...adapter.advances],
      validations: [...adapter.validations],
      consents: [...adapter.consents],
    };
    const args = {
      run_id: pending.started.run_id,
      task_id: pending.task.task_id,
      phase: 1,
      decision: 'rejected',
      actor: 'reviewer@example.test',
      note: 'The proposed change is outside the approved scope.',
      idempotency_key: 'review-reject-p1',
    };

    const rejected = await controller.reviewDelivery(args);
    assert.deepEqual(rejected, {
      status: 'cancelled',
      run_id: pending.started.run_id,
      revision: 1,
    });
    assert.deepEqual(await controller.reviewDelivery(args), rejected);

    const status = controller.runStatus({ run_id: pending.started.run_id });
    assert.equal(status.status, 'cancelled');
    assert.equal(status.tasks[1].status, 'cancelled');
    assert.deepEqual(adapter.advances, pythonCalls.advances);
    assert.deepEqual(adapter.validations, pythonCalls.validations);
    assert.deepEqual(adapter.consents, pythonCalls.consents);
    const reviewEvents = status.events.filter((event) => event.type === 'human.review_rejected');
    assert.equal(reviewEvents.length, 1);
    assert.equal(reviewEvents[0].payload.note, args.note);
    assert.equal(reviewEvents[0].payload.actor, args.actor);
    const synced = await controller.syncDelivery({
      run_id: pending.started.run_id,
      idempotency_key: 'review-rejected-terminal-sync',
    });
    assert.equal(synced.status, 'cancelled');
    assert.equal(synced.next, null);
    assert.equal(controller.runStatus({ run_id: pending.started.run_id }).tasks[1].status, 'cancelled');
  });

  test('review decisions require the exact phase of a task awaiting consent', async () => {
    const started = await controller.startDelivery({
      input_ref: 'D:/requirements/AR.md',
      repo_root: 'D:/openharmony',
      environment: 'openharmony',
      idempotency_key: 'review-wrong-phase-start',
    });
    assert.throws(() => controller.reviewDelivery({
      run_id: started.run_id,
      task_id: started.next.task_id,
      phase: 'P1',
      decision: 'returned',
      actor: 'reviewer@example.test',
      note: 'This task has not reached review.',
      idempotency_key: 'review-wrong-phase',
    }), (error) => error.code === 'task_not_awaiting_consent');
  });

  test('attaches at the authoritative Python phase and restores a consent hold', async () => {
    adapter.state = pythonState({
      runId: 'existing-delivery', phase: 6, gate: true, consent: false,
    });
    const started = await controller.startDelivery({
      input_ref: 'AR-42',
      pipeline_dir: 'D:/openharmony/specs/pipeline/existing-delivery',
      idempotency_key: 'attach-existing',
    });

    assert.equal(started.run_id, 'existing-delivery');
    assert.equal(started.status, 'awaiting_consent');
    assert.equal(started.next.phase, 'P6');
    assert.equal(started.next.status, 'needs_input');
    const status = controller.runStatus({ run_id: started.run_id });
    assert.deepEqual(status.tasks.map((task) => [task.phase, task.status]), [
      ['P6', 'awaiting_consent'],
    ]);
  });

  test('normalizes an empty optional device serial returned by the Python initializer', async () => {
    adapter.state = {
      ...pythonState({ runId: 'empty-device-ref', phase: 0 }),
      device_serial: '',
    };
    const started = await controller.startDelivery({
      input_ref: 'AR-empty-device',
      pipeline_dir: 'D:/openharmony/specs/pipeline/empty-device-ref',
      idempotency_key: 'empty-device-start',
    });

    assert.equal(started.run_id, 'empty-device-ref');
    const persisted = store.db.prepare('SELECT device_ref FROM runs WHERE id = ?')
      .get(started.run_id);
    assert.equal(persisted.device_ref, null);
  });

  test('skips already-valid non-consent evidence while attaching', async () => {
    adapter.state = pythonState({ runId: 'ready-p4', phase: 4, gate: true });
    const started = await controller.startDelivery({
      input_ref: 'AR-43',
      pipeline_dir: 'D:/openharmony/specs/pipeline/ready-p4',
      idempotency_key: 'attach-ready',
    });

    assert.deepEqual(adapter.advances, [4]);
    assert.equal(started.next.phase, 'P5');
    assert.equal(started.python_state.current_phase, 5);
  });

  test('attaches a completed Python pipeline without dispatching work', async () => {
    adapter.state = pythonState({ runId: 'already-complete', phase: 8, complete: true });
    const started = await controller.startDelivery({
      input_ref: 'AR-44',
      pipeline_dir: 'D:/openharmony/specs/pipeline/already-complete',
      idempotency_key: 'attach-complete',
    });

    assert.equal(started.status, 'completed');
    assert.equal(started.next, null);
    assert.equal(controller.runStatus({ run_id: started.run_id }).tasks.length, 0);
  });

  test('sync recovers an interrupted validation and follows an external reset', async () => {
    const started = await controller.startDelivery({
      input_ref: 'D:/requirements/AR.md',
      repo_root: 'D:/openharmony',
      environment: 'openharmony',
      idempotency_key: 'sync-start',
    });
    store.db.prepare(`UPDATE tasks SET status = 'validation_running' WHERE id = ?`)
      .run(started.next.task_id);
    adapter.state = pythonState({ runId: started.run_id, phase: 1, gate: false });

    const recovered = await controller.syncDelivery({
      run_id: started.run_id,
      idempotency_key: 'sync-after-crash',
    });
    assert.equal(recovered.next.phase, 'P1');
    assert.equal(recovered.status, 'awaiting_host');

    adapter.state = pythonState({ runId: started.run_id, phase: 0, gate: false });
    const rewound = await controller.syncDelivery({
      run_id: started.run_id,
      idempotency_key: 'sync-after-reset',
    });
    assert.equal(rewound.next.phase, 'P0');
    assert.equal(rewound.revision, 2);
    const status = controller.runStatus({ run_id: started.run_id });
    assert(status.tasks.some((task) => task.phase === 'P1' && task.status === 'cancelled'));
    assert(status.tasks.some((task) => task.phase === 'P0'
      && task.revision === 2 && task.status === 'queued'));
  });

  test('cancelling a terminal delivery run is a no-op', async () => {
    adapter.state = pythonState({ runId: 'already-complete-cancel', phase: 8, complete: true });
    const started = await controller.startDelivery({
      input_ref: 'AR-terminal-cancel',
      pipeline_dir: 'D:/openharmony/specs/pipeline/terminal-cancel',
      idempotency_key: 'terminal-cancel-start',
    });
    assert.equal(started.status, 'completed');
    const cancelled = controller.delivery.cancel({
      run_id: started.run_id,
      reason: 'late operator click',
      idempotency_key: 'terminal-cancel-request',
    });
    assert.equal(cancelled.status, 'completed');
    assert.equal(controller.runStatus({ run_id: started.run_id }).status, 'completed');
  });

  test('exclusive build resources prevent conflicting delivery attempts', () => {
    const first = controller.startRun({
      workflow: 'delivery',
      input_ref: 'AR-build-1',
      pipeline_dir: 'D:/openharmony/specs/pipeline/build-1',
      workspace_root: 'D:/openharmony',
      initial_phase: 'P4',
      idempotency_key: 'build-run-1',
    });
    const second = controller.startRun({
      workflow: 'delivery',
      input_ref: 'AR-build-2',
      pipeline_dir: 'D:/openharmony/specs/pipeline/build-2',
      workspace_root: 'D:/openharmony',
      initial_phase: 'P4',
      idempotency_key: 'build-run-2',
    });
    controller.claimTask({
      run_id: first.run_id,
      role: 'build-runner',
      host_binding_id: 'delivery-host',
      expected_revision: 1,
      idempotency_key: 'claim-build-1',
    });
    assert.throws(() => controller.claimTask({
      run_id: second.run_id,
      role: 'build-runner',
      host_binding_id: 'delivery-host',
      expected_revision: 1,
      idempotency_key: 'claim-build-2',
    }), (error) => error.code === 'resource_busy'
      && error.details.blockers[0].capabilities.includes('build_execution'));

    const independent = controller.startRun({
      workflow: 'delivery',
      input_ref: 'AR-build-3',
      pipeline_dir: 'D:/other/specs/pipeline/build-3',
      workspace_root: 'D:/other',
      initial_phase: 'P4',
      idempotency_key: 'build-run-3',
    });
    const independentClaim = controller.claimTask({
      run_id: independent.run_id,
      role: 'build-runner',
      host_binding_id: 'delivery-host',
      expected_revision: 1,
      idempotency_key: 'claim-build-3',
    });
    assert.equal(independentClaim.status, 'leased');
  });
});

async function reachAwaitingConsentP1(controller) {
  const started = await controller.startDelivery({
    input_ref: 'D:/requirements/AR.md',
    repo_root: 'D:/openharmony',
    environment: 'openharmony',
    idempotency_key: 'review-p1-start',
  });
  const p0 = controller.claimTask({
    run_id: started.run_id,
    role: 'environment-analyst',
    host_binding_id: 'delivery-host',
    expected_revision: 1,
    idempotency_key: 'review-p1-p0-claim',
  });
  controller.submitTask({
    attempt_id: p0.attempt_id,
    revision: p0.revision,
    lease_epoch: p0.lease_epoch,
    task_credential: p0.task_credential,
    artifact_refs: ['evidence/phase0/env.json'],
    summary: 'P0 evidence produced.',
    idempotency_key: 'review-p1-p0-submit',
  });
  const p0Validated = await controller.validateDeliveryTask({
    run_id: started.run_id,
    task_id: p0.task_id,
    expected_revision: 1,
    idempotency_key: 'review-p1-p0-validate',
  });
  assert.equal(p0Validated.next.phase, 'P1');

  const p1 = controller.claimTask({
    run_id: started.run_id,
    role: 'design-architect',
    host_binding_id: 'delivery-host',
    expected_revision: p0Validated.next.expected_revision,
    idempotency_key: 'review-p1-p1-claim',
  });
  controller.submitTask({
    attempt_id: p1.attempt_id,
    revision: p1.revision,
    lease_epoch: p1.lease_epoch,
    task_credential: p1.task_credential,
    artifact_refs: ['specs/pipeline/AR_design.md'],
    summary: 'P1 design evidence produced.',
    idempotency_key: 'review-p1-p1-submit',
  });
  const p1Validated = await controller.validateDeliveryTask({
    run_id: started.run_id,
    task_id: p1.task_id,
    expected_revision: p1.revision,
    idempotency_key: 'review-p1-p1-validate',
  });
  assert.equal(p1Validated.status, 'needs_input');
  return { started, task: p1, validated: p1Validated };
}

class FakeDeliveryAdapter {
  constructor() {
    this.initializeCalls = [];
    this.advances = [];
    this.validations = [];
    this.consents = [];
    this.rejectAdvancePhase = null;
    this.state = null;
  }

  async initialize(args) {
    this.initializeCalls.push(args);
    this.state ??= {
      ok: true,
      pipeline_dir: `D:/openharmony/specs/pipeline/${args.run_id}`,
      pipeline_run_id: args.run_id,
      repo_root: 'D:/openharmony',
      current_phase: 0,
      complete: false,
      environment: args.environment,
      phases: [],
    };
    return this.state;
  }

  async inspect() {
    return this.state ?? { ok: true, current_phase: 0, complete: false };
  }

  async validateGate(_pipelineDir, phase, { uploadPrecheck = false } = {}) {
    this.validations.push({ phase, uploadPrecheck });
    return {
      ok: true,
      entry: { entry_id: `evidence-P${phase}`, phase, verdict: uploadPrecheck ? 'FAIL' : 'PASS' },
    };
  }

  async advance(_pipelineDir, phase) {
    if (this.rejectAdvancePhase === phase) {
      throw new ProtocolError('delivery_gate_rejected', `P${phase} gate rejected.`, {
        reason: 'test rejection',
      });
    }
    this.advances.push(phase);
    this.state = {
      ...(this.state ?? {}),
      ok: true,
      current_phase: Math.min(phase + 1, 8),
      complete: phase === 8,
      gate: { ok: false, reason: 'no evidence' },
      consent: { ok: false, reason: 'not recorded' },
      upload_precheck: phase === 8 ? { ok: false, reason: 'no precheck' } : undefined,
    };
    return this.state;
  }

  async consent(_pipelineDir, phase, token) {
    this.consents.push({ phase, token });
    return { ok: true, current_phase: phase, complete: false };
  }
}

function pythonState({ runId, phase, gate = false, consent = false, complete = false }) {
  return {
    ok: true,
    pipeline_dir: `D:/openharmony/specs/pipeline/${runId}`,
    pipeline_run_id: runId,
    repo_root: 'D:/openharmony',
    current_phase: phase,
    complete,
    environment: 'openharmony',
    phases: [],
    gate: { ok: gate, reason: gate ? 'ok' : 'no evidence' },
    consent: { ok: consent, reason: consent ? 'ok' : 'not recorded' },
    upload_precheck: phase === 8
      ? { ok: gate, reason: gate ? 'ok' : 'no precheck' }
      : undefined,
  };
}

function registerDeliveryHost(controller) {
  controller.registerHost({
    binding_id: 'delivery-host',
    host_kind: 'codex',
    host_version: 'test',
    execution_mode: 'host_native',
    capabilities: {
      mcp_tools: true,
      native_subagent: true,
      workspace_write: true,
      build_execution: true,
      device_access: true,
      network_publish: true,
    },
    capability_source: 'probe:test',
    idempotency_key: 'delivery-host-register',
  });
}
