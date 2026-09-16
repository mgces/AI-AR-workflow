import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { PACKAGE_ROOT, REPOSITORY_ROOT } from '../../src/core/paths.js';
import { ProtocolError, PythonDeliveryAdapter } from '../../src/index.js';

const PYTHON = process.env.OHOS_DSH_TEST_PYTHON;

test('Python boundary rejects blank AR input before invoking the gate process', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ohos-dsh-adapter-input-'));
  try {
    const adapter = new PythonDeliveryAdapter({ scriptsRoot: join(REPOSITORY_ROOT, 'skills/ohos-ar-dev-phases/scripts') });
    await assert.rejects(
      adapter.initialize({ run_id: 'blank-text', repo_root: root, environment: 'openharmony', ar_text: ' \n\t' }),
      (error) => error instanceof ProtocolError && error.code === 'ar_input_empty',
    );
    const path = join(root, 'empty.md');
    await writeFile(path, ' \n');
    await assert.rejects(
      adapter.initialize({ run_id: 'blank-file', repo_root: root, environment: 'openharmony', ar_path: path }),
      (error) => error instanceof ProtocolError && error.code === 'ar_input_empty',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real Python boundary initializes and inspects an authoritative pipeline', {
  skip: !PYTHON,
  concurrency: false,
}, async () => {
  const root = await mkdtemp(join(tmpdir(), 'ohos-dsh-adapter-'));
  const oldSecretRoot = process.env.LIFECYCLE_SECRET_ROOT;
  process.env.LIFECYCLE_SECRET_ROOT = join(root, 'secrets');
  try {
    const adapter = new PythonDeliveryAdapter({
      pythonCommand: PYTHON,
      scriptsRoot: join(REPOSITORY_ROOT, 'skills/ohos-ar-dev-phases/scripts'),
      bridgePath: join(PACKAGE_ROOT, 'src/workflows/ar-delivery/python/delivery_bridge.py'),
    });
    const initialized = await adapter.initialize({
      run_id: 'adapter-smoke',
      repo_root: root,
      environment: 'openharmony',
      confirm_defaults: true,
      input_ref: 'AR-smoke',
      ar_text: '# AR smoke\n\nValidate the DSH Python boundary.\n',
    });

    assert.equal(initialized.pipeline_run_id, 'adapter-smoke');
    assert.equal(initialized.current_phase, 0);
    assert.equal(initialized.complete, false);
    assert.equal(initialized.gate.ok, false);
    assert.match(await readFile(join(initialized.pipeline_dir, 'ar.md'), 'utf8'),
      /DSH Python boundary/);

    await assert.rejects(
      adapter.validateGate(initialized.pipeline_dir, 0),
      (error) => error instanceof ProtocolError && error.code === 'delivery_gate_rejected',
    );
  } finally {
    if (oldSecretRoot === undefined) delete process.env.LIFECYCLE_SECRET_ROOT;
    else process.env.LIFECYCLE_SECRET_ROOT = oldSecretRoot;
    await rm(root, { recursive: true, force: true });
  }
});
