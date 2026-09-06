import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { createToolCatalog } from '../../src/index.js';
import { requirementPreflight } from '../../src/workflows/requirement/preflight.js';
import { RequirementFixture } from '../../test-support/requirement/fixture.js';

let fixtures = [];
const fixture = (options) => { const f = new RequirementFixture(options); fixtures.push(f); return f; };
afterEach(() => { for (const f of fixtures) f.close(); fixtures = []; });

test('R1-R9 completes with all human holds, independent Gate, multi-proposal GA and explicit AR handoff', () => {
  const f = fixture({ conditional: true });
  f.start();
  f.until('R7-plan');
  f.work();
  assert.equal(f.state.next.status, 'needs_input');
  assert.equal(f.state.next.input_kind, 'gate_a');
  assert(!existsSync(join(f.docs, 'SR-01.md')));
  f.human();
  f.until('R9');
  const result = f.work();
  assert.equal(result.status, 'completed');
  assert.equal(result.ar_path, join(f.docs, 'AR.md'));
  assert.equal(result.handoff.requires_explicit_start, true);
  assert.equal(f.store.db.prepare("SELECT COUNT(*) AS count FROM runs WHERE workflow = 'delivery'").get().count, 0);
  assert.equal(f.flow.decisions(f.runId).length, 7);
  assert.equal(f.flow.receipts(f.runId, true).length, 13);
});

test('preflight failure prevents a durable run; existing documents never imply approval', () => {
  const failed = fixture({ preflight: () => { throw new Error('missing skills'); } });
  assert.throws(() => failed.start(), /missing skills/);
  assert.equal(failed.store.db.prepare('SELECT count(*) AS count FROM runs').get().count, 0);
  const f = fixture();
  f.md('AR.md', 'Accepted', '旧产物不等于已审核。');
  assert.equal(f.start().next.phase, 'R1');
});

test('start is idempotent, checks run ID changes, and refuses two runs sharing docs_root', () => {
  const f = fixture();
  const args = { input_ref: 'user:test', input_text: '需求', docs_root: f.docs,
    run_id: 'req-fixed', idempotency_key: 'fixed-start' };
  const first = f.flow.start(args);
  assert.deepEqual(f.flow.start(args), first);
  assert.throws(() => f.flow.start({ ...args, run_id: 'req-other' }), (e) => e.code === 'idempotency_conflict');
  assert.throws(() => f.flow.start({ ...args, idempotency_key: 'second-start' }), (e) => e.code === 'docs_root_in_use');
});

test('invalid candidates repair at a new revision and cannot reuse old submission', () => {
  const f = fixture(); f.start(); f.claim(); f.candidate();
  f.md('01-requirement.md', 'Draft', 'FR-01');
  f.submit();
  const result = f.validate();
  assert.equal(result.status, 'needs_repair');
  assert.equal(result.next.phase, 'R1');
  assert.equal(result.revision, 2);
  assert.throws(() => f.validate(), (e) => e.code === 'stale_revision');
});

test('human confirmation binds the displayed digest and is idempotent', () => {
  const f = fixture(); f.start(); f.work();
  const n = f.state.next;
  assert.throws(() => f.flow.decide({ run_id: f.runId, task_id: n.task_id, expected_revision: 1,
    snapshot_digest: 'sha256:stale', decision: { confirmed: true }, source_ref: 'unused', idempotency_key: f.key(),
  }), (e) => e.code === 'stale_confirmation');
  f.human();
  assert.deepEqual(f.flow.decide(f.lastDecision), f.state);
  assert.equal(f.state.next.phase, 'R2-input');
});

test('changed pending candidate invalidates confirmation and all downstream state', () => {
  const f = fixture(); f.start(); f.work();
  const n = f.state.next;
  f.md('01-requirement.md', 'Clarified', 'FR-01 修订后的需求');
  const result = f.flow.decide({ run_id: f.runId, task_id: n.task_id, expected_revision: 1,
    snapshot_digest: n.snapshot_digest, source_ref: f.write('human/input.md', '同意'),
    decision: { confirmed: true }, idempotency_key: f.key() });
  assert.equal(result.status, 'needs_repair');
  assert.equal(result.revision, 2);
  assert.equal(f.flow.decisions(f.runId).length, 0);
});

test('R5 rejects author context reuse and missing host isolation capability', () => {
  const f = fixture(); f.start(); f.work({ contextId: 'author-session' }); f.until('R5');
  assert.throws(() => f.claim('author-session'), (e) => e.code === 'review_context_reused');
  f.controller.registerHost({ binding_id: 'host', host_kind: 'cursor', capabilities: {
    mcp_tools: true, native_subagent: true, workspace_write: true, isolated_context: false,
  }, capability_source: 'test:missing-isolation', idempotency_key: f.key() });
  assert.throws(() => f.claim('fresh-review'), (e) => e.code === 'capability_missing');
});

test('Not Ready rolls back R4 and drops split confirmation', () => {
  const f = fixture(); f.start(); f.until('R5');
  const result = f.work({ gate: 'Not Ready' });
  assert.equal(result.next.phase, 'R4');
  assert.equal(result.revision, 2);
  assert(!f.flow.decisions(f.runId).some((item) => item.phase === 'R4'));
});

test('forged Gate counts and incomplete FR/AC coverage cannot advance', () => {
  for (const defect of ['counts', 'traceability']) {
    const f = fixture(); f.start(); f.until('R5'); f.claim(); f.candidate();
    if (defect === 'counts') {
      const gate = JSON.parse(readFileSync(f.manifest.data.gate_ref, 'utf8'));
      gate.summary.pass = 11; f.write(f.manifest.data.gate_ref, gate);
    } else f.write(f.manifest.data.traceability_ref, { links: [{ fr: 'FR-01', ac: 'AC-01' }] });
    f.submit(); const result = f.validate();
    assert.equal(result.status, 'needs_repair');
    assert.equal(result.next.phase, 'R5');
  }
});

test('review rejection closes without IR; rereview invalidates from the selected document', () => {
  for (const outcome of ['Rejected', 'PendingRe-review']) {
    const f = fixture(); f.start(); f.until('R6-input');
    f.human({ decision: outcome, ...(outcome === 'PendingRe-review' ? { target_phase: 'R4', reason: '修改验收项' } : {}) });
    const result = f.work();
    assert(!existsSync(join(f.docs, 'IR.md')));
    if (outcome === 'Rejected') { assert.equal(result.status, 'closed'); assert.equal(result.next, null); }
    else { assert.equal(result.next.phase, 'R4'); assert.equal(result.revision, 2); }
  }
});

test('SR cannot be dispatched until every proposal has evidence-bound GA approval', () => {
  const f = fixture(); f.start(); f.until('R7-plan'); f.work();
  assert.throws(() => f.human({ approvals: [{ proposal_id: 'PROP-01', decision: 'GA-Approved',
    reviewer: '王工', evidence_ref: f.write('human/ga.md', '通过') }] }), /Each proposal/);
  assert.equal(f.refresh().next.phase, 'R7-plan');
  const claim = f.controller.claimTask({ run_id: f.runId, role: 'sr-author', expected_revision: 1,
    host_binding_id: 'host', context_id: 'sr-early', idempotency_key: f.key() });
  assert.notEqual(claim.status, 'leased');
});

test('proposal document AC scope must match the submitted matrix', () => {
  const f = fixture(); f.start(); f.until('R7-plan'); f.claim(); f.candidate();
  f.md('05-proposal-01.md', 'GA-Approved', 'PROP-01 AC-01 AC-02');
  f.submit(); const result = f.validate();
  assert.equal(result.status, 'needs_repair');
  assert.match(result.reason, /AC matrix/);
});

test('checkpoint survives process recreation and tampering revokes completion', () => {
  const f = fixture({ disk: true }); f.start(); f.until('R9'); f.work(); f.reopen();
  assert.equal(f.flow.sync({ run_id: f.runId, idempotency_key: f.key() }).status, 'completed');
  f.md('02-feasibility.md', 'Clarified', '已修改原有可行性分析。');
  const result = f.flow.sync({ run_id: f.runId, idempotency_key: f.key() });
  assert.equal(result.next.phase, 'R2');
  assert.equal(result.status, 'needs_repair');
  assert(!result.ar_path);
  assert(!f.flow.receipts(f.runId).some((item) => item.phase === 'R9'));
});

test('reset asks an active writer to stop; raw input changes need explicit R1 reset', () => {
  const f = fixture(); f.start(); f.claim();
  const reset = { run_id: f.runId, target_phase: 'R1', expected_revision: 1, reason: '修改输入', idempotency_key: f.key() };
  assert.equal(f.flow.reset(reset).status, 'needs_reconcile');
  assert.equal(f.controller.heartbeatTask(f.claimed).status, 'cancel_requested');
  f.controller.releaseTask({ ...f.claimed, reason: '已停止写入', artifact_refs: [], idempotency_key: f.key() });
  f.write('source-requirement.md', '新的需求输入');
  assert.equal(f.flow.sync({ run_id: f.runId, idempotency_key: f.key() }).status, 'needs_input');
  const result = f.flow.reset({ ...reset, idempotency_key: f.key() });
  assert.equal(result.revision, 2);
  assert.equal(f.claim().status, 'leased');
});

test('expired requirement lease quarantines work instead of automatically starting a second writer', () => {
  const f = fixture(); f.start(); f.claim();
  f.now = new Date('2026-09-06T00:02:00.000Z');
  assert.equal(f.flow.sync({ run_id: f.runId, idempotency_key: f.key() }).next.status, 'needs_reconcile');
  const claim = f.controller.claimTask({ run_id: f.runId, role: 'requirement-analyst', expected_revision: 1,
    host_binding_id: 'host', context_id: 'new-writer', idempotency_key: f.key() });
  assert.equal(claim.status, 'needs_reconcile');
  assert.equal(f.refresh().next.status, 'needs_reconcile');
});

test('sync does not replace quarantined work when an upstream artifact also changed', () => {
  const f = fixture(); f.start(); f.until('R2'); f.claim();
  f.md('01-requirement.md', 'Clarified', 'FR-01 变更');
  f.now = new Date('2026-09-06T00:02:00.000Z');
  const result = f.flow.sync({ run_id: f.runId, idempotency_key: f.key() });
  assert.equal(result.status, 'needs_reconcile');
  assert.equal(result.revision, 1);
  assert.equal(f.store.db.prepare("SELECT count(*) AS count FROM tasks WHERE run_id = ? AND status = 'queued'")
    .get(f.runId).count, 0);
});

test('invalid RR inheritance and out-of-root Gate artifacts are rejected', () => {
  const f = fixture(); f.start(); f.until('R2'); f.claim(); f.candidate();
  f.write('02-feasibility.md', readFileSync(join(f.docs, '02-feasibility.md'), 'utf8').replace('RR-1', 'RR-2'));
  f.submit(); assert.equal(f.validate().status, 'needs_repair');
  f.until('R5'); f.claim(); f.candidate();
  const external = f.write('../outside-gate.json', readFileSync(f.manifest.data.gate_ref, 'utf8'));
  f.manifest.data.gate_ref = external; f.write(f.context.requirement.manifest_path, f.manifest);
  f.submit(); const rejected = f.validate();
  assert.equal(rejected.status, 'needs_repair');
  assert.match(rejected.reason, /escapes docs_root/);
});

test('malformed reviewer output repairs instead of causing an unhandled protocol error', () => {
  const f = fixture(); f.start(); f.until('R5'); f.claim(); f.candidate();
  const gate = JSON.parse(readFileSync(f.manifest.data.gate_ref, 'utf8'));
  gate.checks[0] = null; f.write(f.manifest.data.gate_ref, gate); f.submit();
  assert.equal(f.validate().status, 'needs_repair');
});

test('missing SR owner and unapproved AR scope are rejected at their own stage', () => {
  const f = fixture(); f.start(); f.until('R7-SR'); f.claim(); f.candidate();
  f.write('SR-01.md', readFileSync(join(f.docs, 'SR-01.md'), 'utf8').replace('| TSE | 王工 |', '| TSE | |'));
  f.submit(); assert.equal(f.validate().next.phase, 'R7-SR');
  f.until('R9'); f.claim(); f.candidate();
  f.write('AR.md', `${readFileSync(join(f.docs, 'AR.md'), 'utf8')}\nFR-999 新增未评审功能`);
  f.submit(); const result = f.validate();
  assert.equal(result.status, 'needs_repair');
  assert.match(result.reason, /unapproved/);
});

test('changing a human source invalidates that decision and later phases', () => {
  const f = fixture(); f.start(); f.work(); f.human();
  f.write(f.lastDecision.source_ref, '已修改之前的用户结论。');
  const result = f.flow.sync({ run_id: f.runId, idempotency_key: f.key() });
  assert.equal(result.next.phase, 'R1');
  assert.equal(f.flow.decisions(f.runId).length, 0);
});

test('worker cannot call any requirement orchestration or human-decision tool', async () => {
  const f = fixture();
  const worker = createToolCatalog(f.controller, { principal: 'worker' });
  const parent = createToolCatalog(f.controller, { principal: 'parent' });
  for (const name of ['start', 'validate', 'decide', 'sync', 'reset']) {
    assert(!worker.has(`ohos_requirement_${name}`));
    assert(parent.has(`ohos_requirement_${name}`));
  }
});

test('real bundled Python dependency preflight succeeds', { skip: !process.env.OHOS_DSH_TEST_PYTHON }, () => {
  const result = requirementPreflight({ pythonCommand: process.env.OHOS_DSH_TEST_PYTHON });
  assert(existsSync(join(result.skills_root, 'ohos-req-review-gate/SKILL.md')));
});
