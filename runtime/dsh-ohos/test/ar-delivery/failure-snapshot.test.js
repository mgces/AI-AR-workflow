import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { OhosController, SqliteStore, TaskCredentials, PythonDeliveryAdapter } from '../../src/index.js';
import { REPOSITORY_ROOT } from '../../src/core/paths.js';

const PYTHON = process.env.OHOS_DSH_TEST_PYTHON;
test('real signed P4 FAIL produces a diagnostic plan; tamper, epoch and source changes are detected',
  { skip: !PYTHON }, async (t) => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-failure-snapshot-'));
    const oldSecrets = process.env.LIFECYCLE_SECRET_ROOT;
    process.env.LIFECYCLE_SECRET_ROOT = join(root, 'secrets');
    t.after(() => {
      if (oldSecrets === undefined) delete process.env.LIFECYCLE_SECRET_ROOT;
      else process.env.LIFECYCLE_SECRET_ROOT = oldSecrets;
      rmSync(root, { recursive: true, force: true });
    });
    const component = join(root, 'component');
    mkdirSync(component);
    execFileSync('git', ['init', '-q', component]);
    writeFileSync(join(component, 'source.cpp'), 'int main() {}\n');
    execFileSync('git', ['-C', component, 'add', 'source.cpp']);
    execFileSync('git', ['-C', component, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
      '-c', 'commit.gpgsign=false', 'commit', '-qm', 'synthetic fixture']);
    const scripts = join(REPOSITORY_ROOT, 'skills/ohos-ar-dev-phases/scripts');
    const adapter = new PythonDeliveryAdapter({ pythonCommand: PYTHON, scriptsRoot: scripts });
    const initialized = await adapter.initialize({ run_id: 'signed-build-failure', repo_root: root,
      git_dir: component, environment: 'openharmony', confirm_defaults: true,
      input_ref: 'synthetic:AR', ar_text: '# Synthetic signed failure fixture\n' });
    const pdir = initialized.pipeline_dir;
    const python = (body) => execFileSync(PYTHON, ['-c',
      'import sys, os\nsys.path.insert(0, sys.argv[1])\nfrom lib import gatelib as gl\npdir=sys.argv[2]\n' + body,
      scripts, pdir], { encoding: 'utf8' });
    python('s=gl.load_state(pdir)\ns["current_phase"]=4\ngl.save_state(pdir,s)\n');
    assert.equal((await adapter.failureSnapshot(pdir)).ok, false);
    python('gl.emit(pdir,4,"gate_build.py",verdict="FAIL",reason="Missing input")\n');
    assert.match((await adapter.failureSnapshot(pdir)).reason, /does not establish/);
    const logPath = join(pdir, 'evidence/phase4/build_stdout.log');
    mkdirSync(join(pdir, 'evidence/phase4'), { recursive: true });
    const log = 'source.cpp:1: fatal error: missing.h file not found\nninja: build stopped\n';
    writeFileSync(logPath, log);
    python('gl.emit(pdir,4,"gate_build.py",verdict="FAIL",reason="build failed",cmd="ninja fixture",exit_code=1,artifacts_rel=["evidence/phase4/build_stdout.log"])\n');
    const snapshot = await adapter.failureSnapshot(pdir);
    assert.equal(snapshot.ok, true);
    assert.equal(snapshot.executed, true);
    assert.equal(snapshot.purpose, 'diagnostic_only');
    const store = new SqliteStore();
    t.after(() => store.close());
    const controller = new OhosController({ store, credentials: new TaskCredentials(Buffer.alloc(32, 8)), deliveryAdapter: adapter });
    controller.startRun({ workflow: 'delivery', run_id: initialized.pipeline_run_id, input_ref: 'synthetic:AR',
      pipeline_dir: pdir, workspace_root: root, initial_phase: 'P4', idempotency_key: 'start' });
    const args = { run_id: initialized.pipeline_run_id, expected_revision: 1, idempotency_key: 'plan' };
    const stateBefore = readFileSync(join(pdir, 'pipeline.json'), 'utf8');
    const planned = await controller.repairs.plan(args);
    assert.equal(planned.plan.rewind_before_source_change, 'P2');
    assert.equal(planned.plan.automatic, false);
    assert.equal(planned.plan.budget_reserved, false);
    assert.equal(planned.plan.failure.failure_class, 'compile_error');
    assert.deepEqual(await controller.repairs.plan(args), planned);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM repair_episodes').get().n, 1);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM budget_ledger').get().n, 0);
    assert.equal(readFileSync(join(pdir, 'pipeline.json'), 'utf8'), stateBefore);
    writeFileSync(join(component, 'source.cpp'), 'int main() { return 1; }\n');
    assert.notEqual((await adapter.failureSnapshot(pdir)).input_digest, snapshot.input_digest);
    await assert.rejects(controller.repairs.plan(args), { code: 'idempotency_conflict' });
    writeFileSync(logPath, 'tampered');
    assert.match((await adapter.failureSnapshot(pdir)).reason, /artifact altered/);
    await assert.rejects(controller.repairs.plan({ ...args, idempotency_key: 'tamper' }), { code: 'unverified_failure' });
    writeFileSync(logPath, log);
    python('s=gl.load_state(pdir)\ns["evidence_epoch"]=len(gl.read_manifest(pdir))\ns["evidence_epoch_min_phase"]=4\ngl.save_state(pdir,s)\n');
    assert.match((await adapter.failureSnapshot(pdir)).reason, /barrier/);
    python('s=gl.load_state(pdir)\ns["evidence_epoch"]=0\ngl.save_state(pdir,s)\n');
    const manifestPath = python('print(gl.manifest_path(pdir))\n').trim();
    writeFileSync(manifestPath, readFileSync(manifestPath, 'utf8').replace('build failed', 'forged reason'));
    assert.match((await adapter.failureSnapshot(pdir)).reason, /HMAC/);
  });
