import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test, before, after } from 'node:test';
import { LocalRagIndex } from '../src/rag.js';

let root;

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'dsh-rag-test-'));
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src', 'environment.ts'),
    'export const openHarmonyProfile = "openharmony";\nexport const product = "rk3568";\n');
  await writeFile(join(root, 'README.md'), 'The build pipeline uses P0 environment validation.\n');
  await writeFile(join(root, 'src', 'ignored.bin'), Buffer.from([0, 1, 2, 3]));
});

after(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('local lexical RAG index', () => {
  test('indexes authorized text files and returns source hash and line', async () => {
    const index = new LocalRagIndex({ root });
    assert.equal(index.status().state, 'not_indexed');
    const indexed = await index.refresh();
    assert.equal(indexed.state, 'ready');
    assert.equal(indexed.file_count, 2);

    const result = await index.search('OpenHarmony profile');
    assert.equal(result.status, 'ready');
    assert.equal(result.results.length > 0, true);
    assert.equal(result.results[0].relative_path, 'src/environment.ts');
    assert.equal(result.results[0].line >= 1, true);
    assert.match(result.results[0].sha256, /^[a-f0-9]{64}$/);
  });

  test('rejects empty queries', async () => {
    const index = new LocalRagIndex({ root });
    await assert.rejects(() => index.search('  '), { code: 'rag_query_required' });
  });
});
