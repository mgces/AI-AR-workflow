import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test, before, after } from 'node:test';
import { scanArtifacts } from '../src/debug.js';

let root;

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'dsh-debug-test-'));
  await mkdir(join(root, 'out', 'product'), { recursive: true });
  await writeFile(join(root, 'out', 'product', 'demo.hap'), 'demo artifact');
  await writeFile(join(root, 'out', 'product', 'demo.txt'), 'not a deployable artifact');
});

after(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('local artifact scan', () => {
  test('identifies known artifact extensions with advisory provenance', async () => {
    const result = await scanArtifacts(root);
    assert.equal(result.artifacts.length, 1);
    assert.equal(result.artifacts[0].role, 'application_package');
    assert.equal(result.artifacts[0].relative_path, 'out/product/demo.hap');
    assert.equal(result.artifacts[0].confidence, 'advisory_extension');
    assert.match(result.artifacts[0].sha256, /^[a-f0-9]{64}$/);
  });
});
