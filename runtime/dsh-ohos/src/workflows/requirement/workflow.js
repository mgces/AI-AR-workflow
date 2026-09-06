import { mkdirSync, realpathSync, writeFileSync, existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { PACKAGE_ROOT } from '../../core/paths.js';
import { invariant, ProtocolError } from '../../core/errors.js';
import { digest, expectId, expectInteger, expectObject, expectString, parseJson } from '../../core/validation.js';
import { requirementPreflight, DEFAULT_REQUIREMENT_SKILLS_ROOT } from './preflight.js';
import { nextRequirementStage, requirementIndex, requirementStage, requirementInstructions } from './stages.js';
import { readArtifact, validateHumanDecision, validateRequirementArtifacts, verifySnapshot } from './artifacts.js';
import { migrateRequirementStore } from './schema.js';

const CONTRACT = resolve(PACKAGE_ROOT, 'docs/requirement/contract.md');

const encode = JSON.stringify;

export class RequirementWorkflow {
  constructor({ store, insertTask, clock = () => new Date(), preflight = requirementPreflight, skillsRoot, pythonCommand }) {
    migrateRequirementStore(store);
    Object.assign(this, { store, insertTask, clock, preflight, pythonCommand });
    this.runPrefix = 'req';
    this.skillsRoot = resolve(skillsRoot ?? process.env.OHOS_REQ_SKILLS_DIR ?? DEFAULT_REQUIREMENT_SKILLS_ROOT);
  }

  bootstrap(args) {
    invariant(!args.initial_phase && args.completed !== true, 'invalid_input',
      'Initial delivery position is only valid for delivery runs.');
    return { phase: 'R1', role: 'requirement-analyst' };
  }

  onClaim(run, task, args) { this.assertClaim(run, task, args.context_id); }

  taskContext(row, attempt) {
    if (!this.isManaged(row.run_id)) return {};
    return {
      data: { context_id: attempt.context_id, requirement: this.context(row.run_id, row) },
      constraints: requirementInstructions(row.phase),
    };
  }

  runStatus(run) {
    return this.isManaged(run.id) ? { requirement: this.position(run.id) } : {};
  }

  expiredLeaseStatus(runId) {
    return this.isManaged(runId) ? 'needs_reconcile' : 'awaiting_host';
  }

  start(raw, principal = 'parent') {
    const args = expectObject(raw);
    expectString(args.input_ref, 'input_ref');
    expectString(args.docs_root, 'docs_root');
    invariant(isAbsolute(args.docs_root), 'invalid_input', 'docs_root must be an absolute directory.');
    if (args.input_text !== undefined) expectString(args.input_text, 'input_text', { max: 1_000_000 });
    if (args.run_id !== undefined) expectId(args.run_id, 'run_id');
    const payload = { input_ref: args.input_ref, docs_root: resolve(args.docs_root),
      input_text: args.input_text ?? null, run_id: args.run_id ?? null };
    return this.operation(principal, 'start_requirement', args, payload, () => {
      this.preflight({ skillsRoot: this.skillsRoot, pythonCommand: this.pythonCommand });
      mkdirSync(payload.docs_root, { recursive: true });
      const root = realpathSync(payload.docs_root);
      invariant(!this.store.db.prepare('SELECT id FROM runs WHERE docs_root = ?').get(root),
        'docs_root_in_use', 'This docs_root already belongs to a run; resume or reset that run.');
      const runId = args.run_id ?? `req-${digest({ principal, key: args.idempotency_key, payload }).slice(7, 39)}`;
      invariant(!this.store.db.prepare('SELECT id FROM runs WHERE id = ?').get(runId),
        'run_exists', 'run_id already exists; use requirement_sync.');
      let source = args.input_ref;
      if (args.input_text !== undefined) {
        source = resolve(root, 'source-requirement.md');
        if (existsSync(source)) {
          invariant(readArtifact(source, root).text === args.input_text, 'input_conflict',
            'source-requirement.md already contains different input.');
        } else writeFileSync(source, args.input_text, { encoding: 'utf8', flag: 'wx' });
      }
      const input = readArtifact(source);
      const now = this.now();
      this.store.db.prepare(`INSERT INTO runs(id, workflow, revision, status, input_ref,
        docs_root, workspace_root, input_digest, created_at, updated_at)
        VALUES (?, 'requirement', 1, 'awaiting_host', ?, ?, ?, ?, ?, ?)`)
        .run(runId, input.path, root, root, input.hash, now, now);
      this.store.db.prepare(`INSERT INTO requirement_runs(run_id, skills_root, source_json)
        VALUES (?, ?, ?)`).run(runId, this.skillsRoot, encode({ path: input.path, hash: input.hash }));
      this.schedule(this.run(runId), 'R1');
      this.store.event(runId, 'run.started', { workflow: 'requirement', phase: 'R1' }, now);
      return this.position(runId);
    });
  }

  validate(raw, principal = 'parent') {
    return this.operation(principal, 'validate_requirement', raw, raw, () => {
      const { run, task } = this.current(raw);
      invariant(task.status === 'validating', 'task_not_validating', 'Submit a leased candidate before validation.');
      const changed = this.changed(run);
      if (changed) return this.invalidate(run, changed.phase, changed.reason);
      const attempt = this.store.db.prepare(`SELECT * FROM attempts WHERE task_id = ? AND status = 'produced'
        ORDER BY attempt_no DESC LIMIT 1`).get(task.id);
      invariant(attempt, 'attempt_not_found', 'No produced attempt for this task.');
      const manifestPath = this.manifestPath(run, task);
      let receipt;
      try {
        invariant(parseJson(attempt.artifact_refs_json, 'artifact_refs').includes(manifestPath),
          'invalid_artifact', `Submit the task manifest at ${manifestPath}.`);
        receipt = validateRequirementArtifacts({ run, task, attempt, manifestPath,
          receipts: this.receipts(run.id, true), decisions: this.decisions(run.id) });
      } catch (error) {
        if (!(error instanceof ProtocolError)) throw error;
        return this.invalidate(run, task.phase, error.message);
      }
      const stage = requirementStage(task.phase);
      this.store.db.prepare(`INSERT INTO requirement_receipts(run_id, phase, revision, status, receipt_json, active)
        VALUES (?, ?, ?, ?, ?, 1)`).run(run.id, task.phase, task.revision,
        stage.confirmation ? 'pending' : 'accepted', encode(receipt));
      if (task.phase === 'R5' && receipt.result.gate === 'Not Ready') {
        return this.invalidate(run, 'R4', 'Independent Review Ready Gate returned Not Ready.', receipt.result);
      }
      if (stage.confirmation) {
        this.setStatus(run.id, task.id, 'awaiting_consent');
        this.store.event(run.id, 'requirement.confirmation_needed', { phase: task.phase,
          snapshot_digest: receipt.snapshot_digest }, this.now());
        return this.position(run.id);
      }
      return this.accept(run, task, receipt.result);
    });
  }

  decide(raw, principal = 'parent') {
    return this.operation(principal, 'decide_requirement', raw, raw, () => {
      const { run, task } = this.current(raw);
      invariant(task.status === 'awaiting_consent', 'consent_not_expected', 'The current task is not awaiting human input.');
      const changed = this.changed(run);
      if (changed) return this.invalidate(run, changed.phase, changed.reason);
      const receiptRow = this.store.db.prepare(`SELECT * FROM requirement_receipts
        WHERE run_id = ? AND phase = ? AND active = 1`).get(run.id, task.phase);
      const receipt = parseJson(receiptRow.receipt_json, 'receipt');
      invariant(expectString(raw.snapshot_digest, 'snapshot_digest') === receipt.snapshot_digest,
        'stale_confirmation', 'The decision must bind the displayed snapshot_digest.');
      const data = validateHumanDecision(task.phase, raw.decision, receipt);
      const source = readArtifact(expectString(raw.source_ref, 'source_ref'));
      const snapshot = [{ path: source.path, hash: source.hash }];
      const refs = [...(data.material_refs ?? []), ...(data.approvals ?? []).map((item) => item.evidence_ref)];
      for (const ref of refs) {
        const file = readArtifact(ref);
        snapshot.push({ path: file.path, hash: file.hash });
      }
      this.store.db.prepare(`INSERT INTO requirement_decisions(run_id, phase, revision, data_json, source_json, active)
        VALUES (?, ?, ?, ?, ?, 1)`).run(run.id, task.phase, task.revision, encode(data), encode(snapshot));
      this.store.db.prepare(`UPDATE requirement_receipts SET status = 'accepted'
        WHERE run_id = ? AND phase = ? AND active = 1`).run(run.id, task.phase);
      this.store.event(run.id, 'requirement.human_decision', { phase: task.phase,
        source_ref: source.path, snapshot_digest: receipt.snapshot_digest }, this.now());
      return this.accept(run, task, receipt.result);
    });
  }

  sync(raw, principal = 'parent') {
    return this.operation(principal, 'sync_requirement', raw, raw, () => {
      const run = this.run(expectId(raw.run_id, 'run_id'));
      this.reconcileLeases(run.id);
      const changed = this.changed(run);
      if (changed) return this.invalidate(run, changed.phase, changed.reason);
      return this.position(run.id);
    });
  }

  reset(raw, principal = 'parent') {
    return this.operation(principal, 'reset_requirement', raw, raw, () => {
      const run = this.run(expectId(raw.run_id, 'run_id'));
      invariant(run.revision === expectInteger(raw.expected_revision, 'expected_revision', { min: 1 }),
        'stale_revision', 'Reset expected_revision is stale.');
      const target = requirementStage(raw.target_phase);
      const phases = this.store.db.prepare('SELECT phase FROM tasks WHERE run_id = ?').all(run.id);
      invariant(phases.some((item) => item.phase === target.key), 'invalid_reset', 'Cannot reset to an unreached stage.');
      return this.invalidate(run, target.key, expectString(raw.reason, 'reason'), null, true);
    });
  }

  assertClaim(run, task, contextId) {
    if (!this.isManaged(run.id)) return;
    run = this.run(run.id);
    expectId(contextId, 'context_id');
    const changed = this.changed(run);
    invariant(!changed, 'requirement_sync_required', 'An upstream artifact changed; call requirement_sync.', changed);
    if (task.phase === 'R5') {
      const reused = this.store.db.prepare(`SELECT a.id FROM attempts a JOIN tasks t ON t.id = a.task_id
        WHERE t.run_id = ? AND t.phase != 'R5' AND a.context_id = ? LIMIT 1`).get(run.id, contextId);
      invariant(!reused, 'review_context_reused', 'R5 requires a fresh context distinct from document authors.');
    } else {
      const reused = this.store.db.prepare(`SELECT a.id FROM attempts a JOIN tasks t ON t.id = a.task_id
        WHERE t.run_id = ? AND t.phase = 'R5' AND a.context_id = ? LIMIT 1`).get(run.id, contextId);
      invariant(!reused, 'review_context_reused', 'A reviewer context cannot author requirement documents.');
    }
  }

  context(runId, task) {
    if (!this.isManaged(runId)) return null;
    const run = this.run(runId);
    const stage = requirementStage(task.phase);
    return {
      manifest_path: this.manifestPath(run, task), contract_path: CONTRACT,
      skill_paths: stage.skills.map((name) => resolve(run.skills_root, name, 'SKILL.md')),
      metrics_phase: task.phase.split('-')[0],
      metrics_tool: resolve(run.skills_root, 'ohos-req-intake-orchestration/scripts/requirement_metrics.py'),
      accepted: this.receipts(run.id, true).map(({ phase, result, snapshot }) => ({ phase, result, artifact_refs: snapshot.map((item) => item.path) })),
      decisions: this.decisions(runId),
    };
  }

  isManaged(runId) {
    return Boolean(this.store.db.prepare('SELECT run_id FROM requirement_runs WHERE run_id = ?').get(runId));
  }

  position(runId) {
    const run = this.run(runId);
    const task = this.store.db.prepare(`SELECT * FROM tasks WHERE run_id = ?
      AND status NOT IN ('accepted', 'cancelled') ORDER BY created_at, id LIMIT 1`).get(runId);
    const result = { run_id: run.id, workflow: 'requirement', revision: run.revision, status: run.status,
      docs_root: run.docs_root, next: null };
    if (task) {
      result.next = { status: task.status === 'awaiting_consent' ? 'needs_input'
        : ['queued', 'awaiting_host'].includes(task.status) ? 'dispatch_needed' : task.status,
      phase: task.phase, role: task.role, task_id: task.id, expected_revision: run.revision };
      if (task.status === 'awaiting_consent') {
        const receipt = this.receipts(run.id).find((item) => item.phase === task.phase);
        Object.assign(result.next, { snapshot_digest: receipt.snapshot_digest,
          input_kind: requirementStage(task.phase).confirmation ?? requirementStage(task.phase).input,
          artifact_refs: receipt.snapshot.map((item) => item.path), candidate: receipt.result });
      }
    } else if (run.status === 'completed') {
      result.ar_path = this.receipts(run.id, true).find((item) => item.phase === 'R9')?.result.ar_path;
      result.handoff = { tool: 'ohos_delivery_start', input_ref: result.ar_path, requires_explicit_start: true };
    }
    return result;
  }

  run(id) {
    const run = this.store.db.prepare(`SELECT r.*, q.skills_root, q.source_json
      FROM runs r JOIN requirement_runs q ON q.run_id = r.id WHERE r.id = ?`).get(id);
    invariant(run, 'requirement_run_not_found', `No managed requirement run exists: ${id}`);
    return run;
  }

  current(args) {
    const run = this.run(expectId(args.run_id, 'run_id'));
    invariant(run.revision === expectInteger(args.expected_revision, 'expected_revision', { min: 1 }),
      'stale_revision', 'The requirement run revision has changed.');
    const task = this.store.db.prepare('SELECT * FROM tasks WHERE id = ? AND run_id = ?')
      .get(expectId(args.task_id, 'task_id'), run.id);
    invariant(task && task.revision === run.revision && !['accepted', 'cancelled'].includes(task.status),
      'stale_task', 'Task is not the active requirement task.');
    return { run, task };
  }

  receipts(runId, acceptedOnly = false) {
    return this.store.db.prepare(`SELECT * FROM requirement_receipts WHERE run_id = ? AND active = 1`)
      .all(runId).filter((item) => !acceptedOnly || item.status === 'accepted')
      .map((item) => ({ phase: item.phase, ...parseJson(item.receipt_json, 'receipt') }))
      .sort((a, b) => requirementIndex(a.phase) - requirementIndex(b.phase));
  }

  decisions(runId) {
    return this.store.db.prepare(`SELECT * FROM requirement_decisions WHERE run_id = ? AND active = 1`)
      .all(runId).map((item) => ({ phase: item.phase, data: parseJson(item.data_json, 'decision'),
        sources: parseJson(item.source_json, 'decision sources') }));
  }

  changed(run) {
    try { verifySnapshot([parseJson(run.source_json, 'source')]); }
    catch (error) { return { phase: 'R1', reason: error.message, source_changed: true }; }
    for (const receipt of this.receipts(run.id)) {
      try {
        verifySnapshot(receipt.snapshot);
        for (const decision of this.decisions(run.id).filter((item) => item.phase === receipt.phase)) verifySnapshot(decision.sources);
      } catch (error) { return { phase: receipt.phase, reason: error.message }; }
    }
    return null;
  }

  invalidate(run, phase, reason, details = null, explicit = false) {
    // Never kill or replace a potentially writing host process implicitly.
    const active = this.store.db.prepare(`SELECT a.id FROM attempts a JOIN tasks t ON t.id = a.task_id
      WHERE t.run_id = ? AND a.status IN ('leased', 'executing')`).all(run.id);
    if (active.length) {
      this.store.db.prepare(`UPDATE tasks SET cancel_requested = 1 WHERE run_id = ?
        AND status IN ('leased', 'executing')`).run(run.id);
      this.store.event(run.id, 'requirement.cancellation_requested', { phase, reason }, this.now());
      return { status: 'needs_reconcile', run_id: run.id, reason,
        message: 'Stop and release the current worker before resetting; lease expiry does not stop its process.' };
    }
    const quarantined = this.store.db.prepare(`SELECT id FROM tasks WHERE run_id = ? AND status = 'needs_reconcile' LIMIT 1`).get(run.id);
    if (quarantined && !explicit) return { ...this.position(run.id), status: 'needs_reconcile', reason,
      message: 'Inspect partial artifacts and verify the old process stopped, then explicitly reset the affected phase.' };
    const source = parseJson(run.source_json, 'source');
    if (phase === 'R1') {
      const fresh = readArtifact(source.path);
      if (fresh.hash !== source.hash && !explicit) return { status: 'needs_input', run_id: run.id,
        reason, message: 'Raw input changed. Explicitly reset to R1 to accept the revised input.' };
      this.store.db.prepare('UPDATE requirement_runs SET source_json = ? WHERE run_id = ?')
        .run(encode({ path: fresh.path, hash: fresh.hash }), run.id);
      this.store.db.prepare('UPDATE runs SET input_digest = ? WHERE id = ?').run(fresh.hash, run.id);
    }
    const cutoff = requirementIndex(phase);
    const stages = this.store.db.prepare('SELECT id, phase FROM tasks WHERE run_id = ?').all(run.id);
    for (const task of stages.filter((item) => requirementIndex(item.phase) >= cutoff)) {
      this.store.db.prepare(`UPDATE tasks SET status = 'cancelled', cancel_requested = 1,
        lease_until = NULL, updated_at = ? WHERE id = ?`).run(this.now(), task.id);
      this.store.db.prepare(`UPDATE attempts SET status = 'cancelled', updated_at = ? WHERE task_id = ?`)
        .run(this.now(), task.id);
      for (const table of ['requirement_receipts', 'requirement_decisions']) {
        this.store.db.prepare(`UPDATE ${table} SET active = 0 WHERE run_id = ? AND phase = ?`).run(run.id, task.phase);
      }
    }
    this.store.db.prepare(`UPDATE runs SET revision = revision + 1, status = 'awaiting_host', updated_at = ? WHERE id = ?`)
      .run(this.now(), run.id);
    this.schedule(this.run(run.id), phase);
    this.store.event(run.id, 'requirement.invalidated', { phase, reason, details, revision: run.revision + 1 }, this.now());
    return { ...this.position(run.id), status: 'needs_repair', reason, details };
  }

  schedule(run, phase) {
    const stage = requirementStage(phase);
    const id = this.insertTask({ runId: run.id, workflow: 'requirement', phase, role: stage.role,
      revision: run.revision, inputDigest: digest({ source: run.input_digest, receipts: this.receipts(run.id, true) }),
      workspaceRoot: run.docs_root, requiredCapabilities: stage.capabilities,
      status: stage.input ? 'awaiting_consent' : 'queued', now: this.now() });
    if (stage.input) {
      const receipt = { snapshot: [], snapshot_digest: digest({ run_id: run.id, phase, revision: run.revision,
        receipts: this.receipts(run.id, true).map((item) => item.snapshot_digest) }), result: {} };
      this.store.db.prepare(`INSERT INTO requirement_receipts(run_id, phase, revision, status, receipt_json, active)
        VALUES (?, ?, ?, 'pending', ?, 1)`).run(run.id, phase, run.revision, encode(receipt));
    }
    this.setStatus(run.id, id, stage.input ? 'awaiting_consent' : 'queued');
  }

  accept(run, task, result) {
    this.setStatus(run.id, task.id, 'accepted');
    this.store.db.prepare(`UPDATE attempts SET status = 'accepted', updated_at = ? WHERE task_id = ? AND status = 'produced'`)
      .run(this.now(), task.id);
    this.store.event(run.id, 'requirement.stage_accepted', { phase: task.phase, revision: task.revision }, this.now());
    if (task.phase === 'R6' && result.decision === 'PendingRe-review') {
      return this.invalidate(run, result.target_phase, 'Human review requests revision.');
    }
    const next = nextRequirementStage(task.phase);
    if (!next || (task.phase === 'R6' && result.decision === 'Rejected')) {
      const status = next ? 'closed' : 'completed';
      this.store.db.prepare('UPDATE runs SET status = ?, updated_at = ? WHERE id = ?').run(status, this.now(), run.id);
      this.store.event(run.id, `run.${status}`, { phase: task.phase, ...result }, this.now());
    } else this.schedule(run, next.key);
    return this.position(run.id);
  }

  setStatus(runId, taskId, status) {
    this.store.db.prepare('UPDATE tasks SET status = ?, lease_until = NULL, updated_at = ? WHERE id = ?')
      .run(status, this.now(), taskId);
    this.store.db.prepare('UPDATE runs SET status = ?, updated_at = ? WHERE id = ?')
      .run(status === 'queued' ? 'awaiting_host' : status, this.now(), runId);
  }

  reconcileLeases(runId) {
    const expired = this.store.db.prepare(`SELECT a.id, a.task_id FROM attempts a JOIN tasks t ON t.id = a.task_id
      WHERE t.run_id = ? AND a.status IN ('leased', 'executing') AND a.lease_until < ?`).all(runId, this.now());
    for (const attempt of expired) {
      this.store.db.prepare("UPDATE attempts SET status = 'expired', updated_at = ? WHERE id = ?")
        .run(this.now(), attempt.id);
      this.setStatus(runId, attempt.task_id, 'needs_reconcile');
      this.store.db.prepare('UPDATE tasks SET cancel_requested = 1 WHERE id = ?').run(attempt.task_id);
      this.store.event(runId, 'task.lease_expired', { task_id: attempt.task_id, attempt_id: attempt.id }, this.now());
    }
  }

  manifestPath(run, task) {
    return resolve(run.docs_root, '_dsh', `${task.phase}-r${task.revision}.json`);
  }

  operation(principal, kind, raw, payload, action) {
    expectObject(raw);
    const key = expectId(raw.idempotency_key, 'idempotency_key');
    const hash = digest(payload);
    return this.store.transaction(() => {
      const prior = this.store.getOperation(principal, kind, key, hash);
      if (prior) return prior;
      const result = action();
      this.store.saveOperation(principal, kind, key, hash, result, this.now());
      return result;
    });
  }

  now() { return this.clock().toISOString(); }
}
