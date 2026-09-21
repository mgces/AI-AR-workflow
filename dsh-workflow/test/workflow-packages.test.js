import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultWorkflowPackageCatalog } from '../src/dsh/workflow-packages.js';

test('AR workflow download package contains the full gate bundle and stable integrity metadata', async () => {
  const catalog = createDefaultWorkflowPackageCatalog();
  const bundle = await catalog.bundle('ar-delivery');
  assert.equal(bundle.schema_version, 1);
  assert.equal(bundle.install_path, '.dsh/workflows/ar-delivery/current');
  assert.match(bundle.sha256, /^[a-f0-9]{64}$/u);
  assert.ok(bundle.files.some((item) => item.path.endsWith('/advance.py')));
  assert.ok(bundle.files.some((item) => item.path.endsWith('/gate_upload_ci.py')));
  assert.ok(bundle.files.some((item) => item.path.endsWith('/delivery_bridge.py')));
  assert.ok(bundle.files.some((item) => item.path.endsWith('/dsh-ar-delivery.js')));
  assert.ok(bundle.files.some((item) => item.path === 'workspace-gateway/bin/dsh-device-probe.js'));
  assert.ok(bundle.files.every((item) => item.bytes > 0 && /^[a-f0-9]{64}$/u.test(item.sha256)));
  const list = await catalog.list([]);
  assert.equal(list[0].installed, false);
  assert.deepEqual(list[0].source_locations, [
    'workspace-gateway/bin/dsh-ar-delivery.js',
    'runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py',
    'skills/ohos-ar-dev-phases/scripts/',
  ]);
  assert.equal((await catalog.list([{ id: 'ar-delivery', status: 'installed' }]))[0].installed, true);
});

test('workflow download catalog rejects unknown workflow ids', async () => {
  await assert.rejects(createDefaultWorkflowPackageCatalog().bundle('missing'), { code: 'workflow_not_found' });
});
