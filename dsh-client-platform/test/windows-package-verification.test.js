import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const verifier = await import('../scripts/verify-windows-package.js').catch(() => null);

test('Windows package check runs packaged Node, imports DSH SDK from unpacked dependencies and invokes DSH help', async (t) => {
  assert.equal(typeof verifier?.verifyWindowsPackage, 'function');
  const root = await mkdtemp(join(tmpdir(), 'dsh-windows-package-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const resourcesRoot = root;
  const nodeExe = join(resourcesRoot, 'node-runtime/node.exe');
  const sdk = join(resourcesRoot, 'app.asar.unpacked/node_modules/@deepseek-ai/dsh-sdk-client/lib/index.js');
  const dshBin = join(resourcesRoot, 'app.asar.unpacked/node_modules/@deepseek-ai/dsh/lib/bin.js');
  const launcher = join(resourcesRoot, 'app.asar.unpacked/apps/dsh-runtime/launcher.js');
  const provider = join(resourcesRoot, 'dsh-runtime/bundles/@ai-ar/dsh-local-codeagent-provider/src/codeagent-provider.js');
  const conpty = join(resourcesRoot, 'app.asar.unpacked/node_modules/node-pty/prebuilds/win32-x64/conpty.node');
  for (const file of [nodeExe, sdk, dshBin, launcher, provider, conpty]) {
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, 'fixture');
  }
  const invocations = [];
  const report = await verifier.verifyWindowsPackage({
    resourcesRoot,
    spawnSyncImpl: (command, args, options) => {
      invocations.push({ command, args, options });
      return { status: 0, stdout: args[0] === '--version' ? 'v24.15.0\n' : 'ok\n', stderr: '' };
    },
  });
  assert.equal(report.status, 'passed');
  assert.equal(invocations.length, 4);
  assert.equal(invocations[0].command, nodeExe);
  assert.ok(invocations[1].args.join(' ').includes(sdk));
  assert.equal(invocations[2].command, nodeExe);
  assert.ok(invocations[2].args.join(' ').includes(conpty));
  assert.equal(invocations[3].command, nodeExe);
  assert.equal(invocations[3].args[0], dshBin);
  assert.ok(report.launcher_entry.endsWith('apps/dsh-runtime/launcher.js'));
});

test('Windows package check fails when the DSH runtime is missing', async (t) => {
  assert.equal(typeof verifier?.verifyWindowsPackage, 'function');
  const root = await mkdtemp(join(tmpdir(), 'dsh-windows-package-missing-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(verifier.verifyWindowsPackage({ resourcesRoot: root }), {
    code: 'windows_package_resource_missing',
  });
});
