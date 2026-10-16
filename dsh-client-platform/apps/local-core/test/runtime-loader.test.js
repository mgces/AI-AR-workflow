import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const loader = await import('../src/runtime-loader.js').catch(() => null);

test('Local Core resolves its console backend inside a standalone runtime bundle', async (t) => {
  assert.equal(typeof loader?.loadLocalConsoleServer, 'function');
  const root = await mkdtemp(join(tmpdir(), 'dsh-local-core-runtime-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const entry = join(root, 'platform/apps/local-console/src/server.js');
  await mkdir(join(entry, '..'), { recursive: true });
  await writeFile(join(root, 'package.json'), '{"type":"module"}');
  await writeFile(entry, 'export const createLocalConsoleServer = () => "runtime-bundle";');
  const createServer = await loader.loadLocalConsoleServer({ runtimeRoot: root });
  assert.equal(createServer(), 'runtime-bundle');
});

test('Local Core reports a missing packaged backend as a stable runtime error', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-local-core-missing-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(loader.loadLocalConsoleServer({ runtimeRoot: root }), {
    code: 'runtime_bundle_incomplete',
  });
});
