import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const bundle = await import('../scripts/runtime-bundle.js').catch(() => null);

test('runtime staging copies the complete local workflow runtime without the source checkout', async (t) => {
  assert.equal(typeof bundle?.stageRuntimeBundle, 'function');
  const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-bundle-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const output = join(root, 'output');
  for (const file of [
    'platform/apps/local-console/src/server.js',
    'platform/packages/contracts/src/environment-profile.js',
    'platform/packages/workflow-registry/src/manifest.js',
    'workspace-gateway/src/authority/envelope.js',
    'workspace-gateway/src/supervisor/process-supervisor.js',
    'workspace-gateway/bin/dsh-device-probe.js',
    'workspace-gateway/bin/dsh-ar-delivery.js',
    'workspace-gateway/bin/dsh-ar-gate.js',
    'runtime/dsh-ohos/src/runtime.js',
    'runtime/dsh-ohos/policies/modules.json',
    'skills/ohos-ar-dev-phases/scripts/advance.py',
    'skills/ohos-ar-dev-phases/scripts/lib/gatelib.py',
    'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json',
  ]) {
    const path = join(source, file);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, `fixture:${file}`);
  }
  const registeredSkill = join(source, 'skills/ohos-req-intake-orchestration/SKILL.md');
  await mkdir(join(registeredSkill, '..'), { recursive: true });
  await writeFile(registeredSkill, 'registered skill fixture');
  await writeFile(join(source, 'runtime/dsh-ohos/policies/modules.json'), JSON.stringify({
    schemaVersion: 1, modules: [{ id: 'ohos-req-intake-orchestration' }],
  }));
  await mkdir(join(source, 'runtime/dsh-ohos/.dsh-ohos'), { recursive: true });
  await writeFile(join(source, 'runtime/dsh-ohos/.dsh-ohos/task-credential.key'), 'must-not-ship');
  await bundle.stageRuntimeBundle({ repositoryRoot: source, outputRoot: output });
  for (const file of [
    'platform/apps/local-console/src/server.js',
    'platform/packages/contracts/src/environment-profile.js',
    'platform/packages/workflow-registry/src/manifest.js',
    'workspace-gateway/src/authority/envelope.js',
    'workspace-gateway/src/supervisor/process-supervisor.js',
    'workspace-gateway/bin/dsh-device-probe.js',
    'workspace-gateway/bin/dsh-ar-delivery.js',
    'workspace-gateway/bin/dsh-ar-gate.js',
    'runtime/dsh-ohos/src/runtime.js',
    'skills/ohos-ar-dev-phases/scripts/advance.py',
    'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json',
  ]) {
    assert.equal(await readFile(join(output, file), 'utf8'), `fixture:${file}`);
  }
  assert.equal(await readFile(join(output, 'skills/ohos-req-intake-orchestration/SKILL.md'), 'utf8'),
    'registered skill fixture');
  await assert.rejects(readFile(join(output, 'runtime/dsh-ohos/.dsh-ohos/task-credential.key')),
    { code: 'ENOENT' });
  assert.equal(await bundle.isRuntimeBundleReady(output), true);
  const manifest = JSON.parse(await readFile(join(output, 'bundle-manifest.json'), 'utf8'));
  const manifestFiles = Object.keys(manifest.files);
  assert.deepEqual(manifestFiles, [...manifestFiles].sort());
  assert.ok(manifestFiles.every((path) => !path.includes('.dsh-ohos')));
});

test('packaged runtime resolution selects resources/runtime and rejects incomplete bundles', async () => {
  assert.equal(typeof bundle?.resolveRuntimeRoot, 'function');
  const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-resolve-'));
  try {
    const runtime = join(root, 'runtime');
    await mkdir(join(runtime, 'platform/apps/local-console/src'), { recursive: true });
    await writeFile(join(runtime, 'platform/apps/local-console/src/server.js'), '');
    assert.equal(bundle.resolveRuntimeRoot({ isPackaged: true, resourcesPath: root }), runtime);
    await rm(join(runtime, 'platform/apps/local-console/src/server.js'));
    assert.throws(() => bundle.resolveRuntimeRoot({ isPackaged: true, resourcesPath: root }), {
      code: 'runtime_bundle_incomplete',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runtime manifest hashes files in stable lexical order', async (t) => {
  assert.equal(typeof bundle?.createRuntimeManifest, 'function');
  const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-manifest-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'z-last.txt'), 'z');
  await writeFile(join(root, 'a-first.txt'), 'a');
  const manifest = await bundle.createRuntimeManifest(root, ['z-last.txt', 'a-first.txt']);
  assert.deepEqual(Object.keys(manifest.files), ['a-first.txt', 'z-last.txt']);
});

test('DSH provider package stages under the Cordis profile bundle namespace with a content manifest', async (t) => {
  assert.equal(typeof bundle?.stageDshRuntimeBundle, 'function');
  const root = await mkdtemp(join(tmpdir(), 'dsh-provider-bundle-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const output = join(root, 'dsh-runtime');
  const packageRoot = join(source, 'dsh-client-platform/apps/dsh-runtime');
  for (const [path, content] of [
    ['package.json', '{"name":"@ai-ar/dsh-local-codeagent-provider","main":"./src/codeagent-provider.js"}'],
    ['cordis.patch.yml', 'insert:\n  - id: dsh-local-codeagent-provider\n'],
    ['README.md', 'provider package'],
    ['src/codeagent-provider.js', 'export const name = "dsh-local-codeagent-provider";'],
    ['test/codeagent-provider.test.js', 'must-not-ship'],
  ]) {
    const file = join(packageRoot, path);
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, content);
  }
  const result = await bundle.stageDshRuntimeBundle({ repositoryRoot: source, outputRoot: output });
  const bundleRoot = join(output, 'bundles/@ai-ar/dsh-local-codeagent-provider');
  assert.equal(result.ready, true);
  assert.equal(await readFile(join(bundleRoot, 'package.json'), 'utf8'),
    '{"name":"@ai-ar/dsh-local-codeagent-provider","main":"./src/codeagent-provider.js"}');
  assert.match(await readFile(join(bundleRoot, 'src/codeagent-provider.js'), 'utf8'), /dsh-local-codeagent-provider/u);
  await assert.rejects(readFile(join(bundleRoot, 'test/codeagent-provider.test.js')), { code: 'ENOENT' });
  const manifest = JSON.parse(await readFile(join(output, 'bundle-manifest.json'), 'utf8'));
  assert.ok(manifest.files['bundles/@ai-ar/dsh-local-codeagent-provider/src/codeagent-provider.js']);
});

test('pinned Windows Node runtime stages as resources/node-runtime/node.exe', async (t) => {
  assert.equal(typeof bundle?.stageNodeRuntimeBundle, 'function');
  const root = await mkdtemp(join(tmpdir(), 'dsh-node-runtime-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const output = join(root, 'node-runtime');
  const nodeExe = join(source, 'dsh-client-platform/node_modules/node/bin/node.exe');
  await mkdir(join(nodeExe, '..'), { recursive: true });
  await writeFile(nodeExe, 'windows-node-24.15.0');
  const result = await bundle.stageNodeRuntimeBundle({ repositoryRoot: source, outputRoot: output, platform: 'win32' });
  assert.equal(result.ready, true);
  assert.equal(await readFile(join(output, 'node.exe'), 'utf8'), 'windows-node-24.15.0');
  const manifest = JSON.parse(await readFile(join(output, 'bundle-manifest.json'), 'utf8'));
  assert.ok(manifest.files['node.exe']);
});

test('non-Windows staging leaves the native Windows Node resource empty', async (t) => {
  assert.equal(typeof bundle?.stageNodeRuntimeBundle, 'function');
  const root = await mkdtemp(join(tmpdir(), 'dsh-node-runtime-no-win-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = join(root, 'node-runtime');
  const result = await bundle.stageNodeRuntimeBundle({ repositoryRoot: root, outputRoot: output, platform: 'linux' });
  assert.equal(result.ready, false);
  await assert.rejects(readFile(join(output, 'node.exe')), { code: 'ENOENT' });
});

test('desktop package defines a per-user Windows NSIS installer and ships the staged runtime', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.dependencies?.['@deepseek-ai/dsh'], '0.1.5-rc.2');
  assert.equal(packageJson.dependencies?.['@deepseek-ai/dsh-sdk-client'], '0.1.5-rc.2');
  assert.equal(packageJson.devDependencies?.node, '24.15.0');
  assert.equal(packageJson.build?.win?.target?.[0]?.target, 'nsis');
  assert.equal(packageJson.build?.nsis?.perMachine, false);
  assert.equal(packageJson.build?.npmRebuild, false);
  assert.ok(packageJson.build?.extraResources?.some((entry) => entry.from === 'runtime-bundle' && entry.to === 'runtime'));
  assert.ok(packageJson.build?.extraResources?.some((entry) => entry.from === 'dsh-runtime-bundle' && entry.to === 'dsh-runtime'));
  assert.ok(packageJson.build?.extraResources?.some((entry) => entry.from === 'node-runtime-bundle' && entry.to === 'node-runtime'));
  assert.ok(packageJson.build?.asarUnpack?.includes('node_modules/**'));
  assert.ok(packageJson.build?.asarUnpack?.includes('apps/dsh-runtime/**'));
  assert.ok(packageJson.scripts?.['build:win'].includes('npm run verify:win'));
});
