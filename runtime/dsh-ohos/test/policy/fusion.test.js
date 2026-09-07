import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { OhosController, SqliteStore, TaskCredentials } from '../../src/index.js';
import { ModuleRegistry } from '../../src/policy/module-registry.js';
import { normalizeFailure } from '../../src/policy/failure-normalizer.js';
import { createToolCatalog } from '../../src/tools/catalog.js';
import { resourcesOverlap } from '../../src/core/resource-identity.js';

function fixture(t, path = ':memory:') {
  const store = new SqliteStore(path);
  t.after(() => store.close());
  const controller = new OhosController({ store, credentials: new TaskCredentials(Buffer.alloc(32, 6)) });
  const started = controller.startRun({ workflow: 'delivery', run_id: 'fusion-run',
    input_ref: 'test:AR', pipeline_dir: '/tmp/fusion-pipeline', workspace_root: '/tmp/fusion-source',
    initial_phase: 'P4', idempotency_key: 'start' });
  return { store, controller, runId: started.run_id };
}

function skills(t) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-modules-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const modules = [
    { id: 'base', workflows: ['development'], phases: ['P2'], defaultForPhase: true },
    { id: 'code', workflows: ['development'], phases: ['P2'], triggerTags: ['cpp'],
      capabilities: ['coding'], requires: ['base'] },
  ];
  for (const m of modules) {
    mkdirSync(join(root, m.id));
    writeFileSync(join(root, m.id, 'SKILL.md'), 'a'.repeat(10));
  }
  return { root, modules, registry: () => new ModuleRegistry({ skillsRoot: root, modules }) };
}

test('registry detects cycles, missing dependencies and invalid defaults before routing', (t) => {
  const f = skills(t);
  f.modules[0].requires = ['code'];
  assert.throws(f.registry, { code: 'module_cycle' });
  f.modules[0].requires = ['absent'];
  assert.throws(f.registry, { code: 'module_missing' });
  f.modules[0].requires = [];
  f.modules[0].defaultForPhase = 'false';
  assert.throws(f.registry, { code: 'invalid_registry' });
});

test('required closure cannot be trimmed; optional closure fits as a unit in dependency order', (t) => {
  const f = skills(t);
  const registry = f.registry();
  const limited = registry.resolve({ workflow: 'delivery', phase: 'P2', taskTags: ['cpp'], contextBudgetChars: 10 });
  assert.deepEqual(limited.modules.map((m) => m.id), ['base']);
  assert.deepEqual(limited.deferred, ['code']);
  assert.throws(() => registry.resolve({ workflow: 'delivery', phase: 'P2',
    capabilities: ['coding'], contextBudgetChars: 10 }), { code: 'context_budget_exceeded' });
  assert.throws(() => registry.resolve({ workflow: 'delivery', phase: 'P2',
    capabilities: ['device'] }), { code: 'capability_uncovered' });
  assert.deepEqual(registry.resolve({ workflow: 'delivery', phase: 'P2', taskTags: ['cpp'],
    priorities: { code: 100 } }).modules.map((m) => m.id), ['base', 'code']);
});

test('pinned Skill edits and symlink escapes are rejected', (t) => {
  const f = skills(t);
  const pinned = new ModuleRegistry({ skillsRoot: f.root, modules: f.registry().snapshot() });
  writeFileSync(join(f.root, 'base/SKILL.md'), 'changed');
  assert.throws(() => pinned.resolve({ workflow: 'delivery', phase: 'P2' }), { code: 'module_changed' });
  const outside = mkdtempSync(join(tmpdir(), 'dsh-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, 'SKILL.md'), 'outside');
  rmSync(join(f.root, 'base'), { recursive: true });
  symlinkSync(outside, join(f.root, 'base'));
  assert.throws(() => f.registry().snapshot(), { code: 'module_path_escape' });
});

test('real SA/NAPI routes include C++ dependencies; reading contexts leaves SQLite unchanged', (t) => {
  const { controller, store, runId } = fixture(t);
  controller.policy.configure({ run_id: runId, mode: 'observe', task_tags: ['sa', 'napi'],
    capabilities_by_phase: { P2: ['napi-codegen'] }, idempotency_key: 'configure' });
  const before = store.db.prepare('SELECT total_changes() AS n').get().n;
  const context = controller.policy.context({ run_id: runId, workflow: 'delivery', phase: 'P2' });
  const ids = context.modules.map((m) => m.id);
  assert(ids.includes('ohos-dev-napi-module'));
  assert(ids.includes('ohos-dev-cpp-coding-style'));
  assert(ids.indexOf('ohos-dev-cpp-coding-style') < ids.indexOf('ohos-dev-napi-module'));
  assert.equal(context.usage_observation, 'unknown');
  assert.equal(store.db.prepare('SELECT total_changes() AS n').get().n, before);
});

test('observe configuration is idempotent, phase scoped, and cannot enable nonexistent automation', (t) => {
  const { controller, runId } = fixture(t);
  const args = { run_id: runId, mode: 'observe', idempotency_key: 'configure' };
  const result = controller.policy.configure(args);
  assert.deepEqual(controller.policy.configure(args), result);
  assert.throws(() => controller.policy.configure({ ...args, task_tags: ['sa'] }), { code: 'idempotency_conflict' });
  assert.throws(() => controller.policy.configure({ ...args, mode: 'managed' }), { code: 'managed_unavailable' });
  assert.throws(() => controller.policy.configure({ ...args, idempotency_key: 'uncovered',
    capabilities_by_phase: { P4: ['nonexistent'] } }), { code: 'capability_uncovered' });
  assert.throws(() => controller.policy.configure({ ...args, idempotency_key: 'wrong-phase',
    capabilities_by_phase: { R1: [] } }), { code: 'invalid_input' });
  assert.equal(controller.policy.context({ run_id: runId, workflow: 'delivery', phase: 'P4' }).mode, 'observe');
});

test('policy and consumed budget survive revision changes and reopening the same SQLite database', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-policy-db-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { store, controller, runId } = fixture(t, join(root, 'state.sqlite'));
  const original = controller.policy.binding(runId).policy_id;
  const reservation = controller.budgets.reserve({ run_id: runId, kind: 'retries', idempotency_key: 'try-1' });
  controller.budgets.settle(reservation.id, 'consumed');
  assert.throws(() => controller.budgets.settle(reservation.id, 'released'), { code: 'reservation_settled' });
  store.db.prepare('UPDATE runs SET revision=revision+1 WHERE id=?').run(runId);
  const other = new SqliteStore(join(root, 'state.sqlite'));
  t.after(() => other.close());
  const restarted = new OhosController({ store: other, credentials: controller.credentials });
  assert.equal(restarted.policy.binding(runId).policy_id, original);
  assert.equal(restarted.budgets.usage(runId).retries.used, 1);
  assert.equal(restarted.budgets.reserve({ run_id: runId, kind: 'retries', idempotency_key: 'try-1' }).state, 'consumed');
  restarted.budgets.reserve({ run_id: runId, kind: 'retries', idempotency_key: 'try-2' });
  assert.throws(() => controller.budgets.reserve({ run_id: runId, kind: 'retries', idempotency_key: 'try-3' }),
    { code: 'budget_exhausted' });
  assert.throws(() => controller.budgets.reserve({ run_id: runId, kind: 'patches', idempotency_key: 'try-1' }),
    { code: 'idempotency_conflict' });
});

test('unlaunched reservations can be released once but cannot be reused to launch', (t) => {
  const { controller, runId } = fixture(t);
  const args = { run_id: runId, kind: 'jobs', idempotency_key: 'cancel-before-start' };
  const row = controller.budgets.reserve(args);
  assert.equal(controller.budgets.usage(runId).jobs.used, 1);
  controller.budgets.settle(row.id, 'released');
  assert.equal(controller.budgets.usage(runId).jobs.used, 0);
  assert.equal(controller.budgets.reserve(args).state, 'released');
  assert.throws(() => controller.budgets.settle(row.id, 'consumed'), { code: 'reservation_settled' });
});

test('failure classification prioritizes authority and consent and never authorizes a repair', () => {
  for (const [phase, reason, expected] of [
    ['P4', 'HMAC mismatch; build failed', 'authority_or_signature_invalid'],
    ['P4', 'ninja: build failed: connection reset', 'transient_environment'],
    ['P4', 'clang-tidy static analysis error: build failed', 'style_or_static_rule_failed'],
    ['P4', 'fatal error: api.h file not found', 'compile_error'],
    ['P4', 'Permission denied: build failed', 'environment_unavailable'],
    ['P8-precheck', 'exit code 0', 'consent_missing'],
    ['P4', 'unrecognized condition', 'unknown'],
  ]) {
    const failure = normalizeFailure({ phase, reason }, { [expected]: { automatic: true, action: 'test' } });
    assert.equal(failure.failure_class, expected);
    assert.equal(failure.automatic, false);
    assert.equal(failure.diagnostic_only, true);
  }
});

test('policy and repair tools are parent-only and status is honest about unavailable automation', async (t) => {
  const { controller, runId, store } = fixture(t);
  const worker = createToolCatalog(controller, { principal: 'worker' });
  for (const name of ['ohos_policy_configure', 'ohos_policy_status', 'ohos_repair_plan']) assert(!worker.has(name));
  const parent = createToolCatalog(controller, { principal: 'parent' });
  const before = store.db.prepare('SELECT total_changes() AS n').get().n;
  const result = await parent.get('ohos_policy_status').call({ run_id: runId });
  assert.equal(result.result.managed_execution_available, false);
  assert.equal(result.result.automatic_evolution_available, false);
  assert.equal(store.db.prepare('SELECT total_changes() AS n').get().n, before);
});

test('resource conflicts account for aliases and parent/child workspaces', (t) => {
  const f = skills(t);
  symlinkSync(join(f.root, 'base'), join(f.root, 'alias'));
  assert(resourcesOverlap(join(f.root, 'base'), join(f.root, 'alias')));
  assert(resourcesOverlap(join(f.root, 'base/missing'), join(f.root, 'alias/missing')));
  assert(resourcesOverlap(f.root, join(f.root, 'base')));
  assert(!resourcesOverlap(join(f.root, 'base'), join(f.root, 'code')));
  assert(resourcesOverlap('D:/OHOS', 'd:\\ohos\\base'));
  assert(!resourcesOverlap('D:/OHOS', 'D:/OHOS-other'));
  assert(resourcesOverlap(undefined, f.root));
});
