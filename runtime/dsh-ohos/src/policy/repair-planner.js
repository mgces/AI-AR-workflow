import { digest, expectId, expectInteger, expectObject } from '../core/validation.js';
import { invariant } from '../core/errors.js';
import { normalizeFailure } from './failure-normalizer.js';

export class RepairPlanner {
  constructor({ store, policy, budgets, adapter, clock = () => new Date() }) {
    Object.assign(this, { store, policy, budgets, adapter, clock });
  }

  async plan(raw, principal = 'parent') {
    const args = expectObject(raw);
    const runId = expectId(args.run_id, 'run_id');
    const revision = expectInteger(args.expected_revision, 'expected_revision', { min: 1 });
    const key = expectId(args.idempotency_key, 'idempotency_key');
    const run = this.store.db.prepare('SELECT * FROM runs WHERE id=?').get(runId);
    invariant(run?.workflow === 'delivery' && run.pipeline_dir, 'run_not_found', 'A bound delivery run is required.');
    invariant(run.revision === revision, 'stale_revision', 'Run revision changed.');
    invariant(typeof this.adapter?.failureSnapshot === 'function', 'delivery_adapter_unavailable',
      'The adapter must support signed failure inspection.');
    const task = this.store.db.prepare(`SELECT * FROM tasks WHERE run_id=? AND phase='P4'
      AND revision=? AND status NOT IN ('accepted','cancelled')`).get(runId, revision);
    invariant(task, 'repair_phase_unavailable', 'No current P4 task exists.');
    invariant(!this.store.db.prepare(`SELECT id FROM attempts WHERE task_id=?
      AND lease_epoch=? AND status IN ('leased','executing','expired')`).get(task.id, task.lease_epoch),
    'writer_not_stopped', 'The build owner must stop and release or submit before planning.');
    const receipt = await this.adapter.failureSnapshot(run.pipeline_dir);
    invariant(receipt?.ok === true && receipt.executed === true && receipt.pipeline_run_id === runId
      && receipt.entry?.phase === 4 && receipt.entry.gate === 'gate_build.py' && receipt.entry.verdict === 'FAIL'
      && /^sha256:[a-f0-9]{64}$/.test(receipt.input_digest),
    'unverified_failure', receipt?.reason ?? 'A current, executed and signed P4 failure is required.');
    const binding = this.policy.binding(runId);
    const policy = this.policy.read(binding.policy_id);
    const failure = normalizeFailure({ phase: 'P4', reason: receipt.entry.reason,
      stdout: receipt.stdout_tail }, policy.strategies);
    const rewind = ['scope_violation', 'design_contract_invalid'].includes(failure.failure_class) ? 'P1'
      : ['compile_error', 'style_or_static_rule_failed', 'test_authorship_incomplete', 'unit_test_failed']
        .includes(failure.failure_class) ? 'P2' : null;
    const plan = { schema_version: 1, mode: 'observe', automatic: false,
      run_id: runId, task_id: task.id, revision, policy_id: binding.policy_id,
      input_digest: receipt.input_digest, evidence: receipt.entry, failure,
      source_fingerprint: receipt.source_fingerprint,
      execution_input_binding: 'unavailable',
      rewind_before_source_change: rewind,
      revalidate: rewind === 'P1' ? ['P1', 'consent', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']
        : rewind === 'P2' ? ['P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'] : ['P4', 'P5', 'P6', 'P7', 'P8'],
      execution_blocker: 'supervisor_and_patch_importer_not_implemented',
      budget: this.budgets.usage(runId), budget_reserved: false };
    const payloadDigest = digest({ runId, revision, input: receipt.input_digest });
    return this.store.transaction(() => {
      const current = this.store.db.prepare('SELECT revision FROM runs WHERE id=?').get(runId);
      invariant(current.revision === revision, 'stale_revision', 'Run changed during failure inspection.');
      const currentTask = this.store.db.prepare('SELECT * FROM tasks WHERE id=?').get(task.id);
      invariant(currentTask.revision === revision && currentTask.status === task.status
        && currentTask.lease_epoch === task.lease_epoch, 'external_state_unknown',
      'Task ownership changed during failure inspection.');
      const previous = this.store.getOperation(principal, 'repair_plan', key, payloadDigest);
      if (previous) return previous;
      const episodeId = `repair-${digest({ runId, revision, policy: binding.policy_id, input: receipt.input_digest }).slice(7, 47)}`;
      const existing = this.store.db.prepare('SELECT plan_json FROM repair_episodes WHERE id=?').get(episodeId);
      const storedPlan = existing ? JSON.parse(existing.plan_json) : plan;
      const now = this.clock().toISOString();
      this.store.db.prepare(`INSERT OR IGNORE INTO repair_episodes
        VALUES (?,?,?,?,?,?,?,?,?)`).run(episodeId, runId, task.id, 'planned', failure.failure_key,
        receipt.input_digest, JSON.stringify(plan), now, now);
      const result = { status: 'planned', episode_id: episodeId, plan_digest: digest(storedPlan), plan: storedPlan };
      this.store.saveOperation(principal, 'repair_plan', key, payloadDigest, result, now);
      this.store.event(runId, 'repair.planned', { episode_id: episodeId, plan_digest: result.plan_digest,
        evidence_id: receipt.entry.entry_id, automatic: false }, now);
      return result;
    });
  }
}
