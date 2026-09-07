import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OhosController, SqliteStore, TaskCredentials } from '../../src/index.js';

function fixture(t) {
  let now = new Date('2026-09-07T00:00:00Z');
  let inspections = 0;
  const store = new SqliteStore();
  t.after(() => store.close());
  const controller = new OhosController({ store, credentials: new TaskCredentials(Buffer.alloc(32, 4)),
    clock: () => now, leaseMs: 1000, deliveryAdapter: {
      async inspect() { inspections++; return { current_phase: 4, complete: false, gate: { ok: false } }; },
    } });
  controller.registerHost({ binding_id: 'build-host', host_kind: 'codex',
    capabilities: { mcp_tools: true, native_subagent: true, workspace_write: true, build_execution: true },
    capability_source: 'test', idempotency_key: 'host' });
  const start = (id, phase = 'P4') => controller.startRun({ workflow: 'delivery', run_id: id,
    input_ref: 'AR', workspace_root: '/tmp/shared-ohos', pipeline_dir: `/tmp/${id}`, initial_phase: phase,
    idempotency_key: id });
  const first = start('build-one');
  const claim = (run, key) => controller.claimTask({ run_id: run.run_id, role: run.next.role,
    host_binding_id: 'build-host', expected_revision: 1, idempotency_key: key });
  const owner = claim(first, 'owner');
  return { store, controller, first, owner, start, claim,
    expire: () => { now = new Date(now.getTime() + 2000); }, inspections: () => inspections };
}

test('expired delivery lease retains exclusivity until the original owner acknowledges stopping', (t) => {
  const f = fixture(t);
  f.expire();
  assert.equal(f.claim(f.first, 'cannot-reclaim').status, 'needs_reconcile');
  const second = f.start('build-two');
  assert.throws(() => f.claim(second, 'conflict'), { code: 'resource_busy' });
  assert.throws(() => f.controller.releaseTask({ ...f.owner, task_credential: 'forged',
    reason: 'stopped', idempotency_key: 'forged' }), { code: 'unauthorized_task' });
  const args = { ...f.owner, reason: 'Build and all subprocesses stopped; no partial files.', idempotency_key: 'release' };
  assert.equal(f.controller.releaseTask(args).status, 'awaiting_host');
  assert.equal(f.controller.releaseTask(args).status, 'awaiting_host');
  const replacement = f.claim(f.first, 'replacement');
  assert.equal(replacement.status, 'leased');
  assert.throws(() => f.controller.releaseTask({ ...args, idempotency_key: 'old-release-new-key' }), { code: 'lease_lost' });
  assert.throws(() => f.controller.submitTask({ ...f.owner, artifact_refs: ['old'], summary: 'late',
    idempotency_key: 'late-submit' }), { code: 'lease_lost' });
});

test('sync holds live or expired writers; released partial artifacts can be reconciled', async (t) => {
  const f = fixture(t);
  const args = { run_id: f.first.run_id, idempotency_key: 'sync' };
  assert.equal((await f.controller.syncDelivery(args)).status, 'needs_reconcile');
  assert.equal(f.inspections(), 0);
  f.expire();
  assert.equal((await f.controller.syncDelivery(args)).status, 'needs_reconcile');
  f.claim(f.first, 'expire-record');
  f.controller.releaseTask({ ...f.owner, reason: 'Stopped and reaped the build process tree.',
    artifact_refs: ['evidence/phase4/build_stdout.log'], idempotency_key: 'release-partial' });
  const second = f.start('build-two');
  assert.throws(() => f.claim(second, 'partial-conflict'), { code: 'resource_busy' });
  const result = await f.controller.syncDelivery(args);
  assert.equal(result.status, 'awaiting_host');
  assert.equal(f.inspections(), 1);
  assert.equal(f.claim(f.first, 'resume').status, 'leased');
});

test('implementation writers conflict with builds in the same workspace', (t) => {
  const f = fixture(t);
  const implementer = f.start('implementation', 'P2');
  assert.throws(() => f.claim(implementer, 'write-conflict'), { code: 'resource_busy' });
});
