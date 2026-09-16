import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test, before, after } from 'node:test';
import { HttpRagModelAdapter, LocalRagIndex, RemoteRagIndex } from '../src/rag.js';

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
    assert.equal(index.status().metrics.query_count, 1);
    assert.equal(index.status().metrics.hit_count, 1);
    assert.equal(Number.isInteger(index.status().metrics.last_query_latency_ms), true);
  });

  test('rejects empty queries', async () => {
    const index = new LocalRagIndex({ root });
    await assert.rejects(() => index.search('  '), { code: 'rag_query_required' });
  });

  test('rejects queries that contain no searchable tokens', async () => {
    const index = new LocalRagIndex({ root });
    await assert.rejects(() => index.search('!!! --- ???'), { code: 'rag_query_invalid' });
  });

  test('persists a local index and marks it stale when an authorized source changes', async () => {
    const indexFile = join(root, '.dsh', 'rag-index.json');
    const first = new LocalRagIndex({ root, indexFile });
    await first.refresh();
    const revision = first.status().revision;
    const restored = new LocalRagIndex({ root, indexFile });
    assert.equal(restored.status().state, 'ready');
    assert.equal(restored.status().revision, revision);
    assert.equal((await restored.search('OpenHarmony')).results.length > 0, true);

    await writeFile(join(root, 'README.md'), 'The build pipeline uses HarmonyOS profile validation.\n');
    assert.equal(restored.status().state, 'stale');
    const refreshed = await restored.search('HarmonyOS profile');
    assert.equal(refreshed.revision === revision, false);
    assert.equal(restored.status().state, 'ready');
  });

  test('marks an index stale when content changes but size and mtime are restored', async () => {
    const source = join(root, 'src', 'environment.ts');
    const index = new LocalRagIndex({ root, indexFile: join(root, '.dsh', 'same-metadata-index.json') });
    await index.refresh();
    const before = await stat(source);
    await writeFile(source, 'export const openHarmonyProfile = "harmonyosxx";\nexport const product = "rk3568";\n');
    await utimes(source, before.atime, before.mtime);
    assert.equal((await stat(source)).size, before.size);
    assert.equal(index.status().state, 'stale');
  });

  test('treats a persisted index without a source signature as stale', async () => {
    const indexFile = join(root, '.dsh', 'missing-signature-index.json');
    const first = new LocalRagIndex({ root, indexFile });
    await first.refresh();
    const persisted = JSON.parse(await readFile(indexFile, 'utf8'));
    delete persisted.source_signature;
    await writeFile(indexFile, `${JSON.stringify(persisted)}\n`);
    const restored = new LocalRagIndex({ root, indexFile });
    assert.equal(restored.status().state, 'stale');
    assert.match(restored.status().reason, /source signature unavailable/u);
  });

  test('persists a RAG model profile without accepting credentials', async () => {
    const indexFile = join(root, '.dsh', 'model-profile-index.json');
    const index = new LocalRagIndex({ root, indexFile });
    assert.equal(index.profile().mode, 'local_lexical');
    const profile = await index.updateProfile({
      mode: 'embedding_reranker',
      provider: 'qwen-compatible',
      embedding_model: 'qwen3-embedding',
      reranker_model: 'qwen3-reranker',
      endpoint: 'https://rag.example.test/v1',
    });
    assert.equal(profile.model_profile.mode, 'embedding_reranker');
    assert.equal(profile.model_profile.execution, 'planned');
    const restored = new LocalRagIndex({ root, indexFile });
    assert.equal(restored.profile().embedding_model, 'qwen3-embedding');
    await assert.rejects(
      restored.updateProfile({ api_key: 'must-not-be-persisted' }),
      (error) => error.code === 'rag_model_profile_invalid',
    );
  });

  test('executes an injected embedding and reranker adapter instead of reporting a planned fallback', async () => {
    const calls = [];
    const modelAdapter = {
      async embed({ texts, model }) {
        calls.push(['embed', model, texts]);
        return texts.map((text) => /profile|pipeline/iu.test(text) ? [1, 0] : [0, 1]);
      },
      async rerank({ query, documents, model }) {
        calls.push(['rerank', model, query, documents]);
        return documents.map((document, index) => ({
          index,
          relevance_score: /build pipeline/iu.test(document) ? 0.99 : 0.01,
        }));
      },
    };
    const index = new LocalRagIndex({
      root,
      indexFile: join(root, '.dsh', 'semantic-index.json'),
      modelAdapter,
      modelProfile: {
        mode: 'embedding_reranker',
        provider: 'test',
        embedding_model: 'embed-test',
        reranker_model: 'rerank-test',
      },
    });
    const indexed = await index.refresh();
    assert.equal(indexed.model_profile.execution, 'active');
    const result = await index.search('HarmonyOS profile');
    assert.equal(result.retrieval_mode, 'embedding_reranker');
    assert.equal(result.results[0].relative_path, 'README.md');
    assert.equal(result.results[0].semantic, true);
    assert.ok(calls.some(([kind]) => kind === 'embed'));
    assert.ok(calls.some((item) => Array.isArray(item) && item[0] === 'rerank'));
    assert.equal(index.status().metrics.fallback_count, 0);
  });

  test('speaks the host secret only through the OpenAI-compatible model adapter', async () => {
    const requests = [];
    const adapter = new HttpRagModelAdapter({
      endpoint: 'https://rag.example.test/v1',
      apiKey: 'secret-from-host',
      fetchImpl: async (url, options) => {
        requests.push({ url: String(url), options });
        const body = JSON.parse(options.body);
        if (String(url).endsWith('/embeddings')) {
          return new Response(JSON.stringify({ data: body.input.map(() => ({ embedding: [1, 0] })) }), { status: 200 });
        }
        return new Response(JSON.stringify({ results: body.documents.map((_, index) => ({ index, relevance_score: index })) }), { status: 200 });
      },
    });
    assert.deepEqual(await adapter.embed({ texts: ['source'], model: 'qwen3-embedding' }), [[1, 0]]);
    assert.deepEqual(await adapter.rerank({ query: 'source', documents: ['source'], model: 'qwen3-reranker' }), [{ index: 0, score: 0 }]);
    assert.equal(requests[0].url, 'https://rag.example.test/v1/embeddings');
    assert.equal(requests[0].options.headers.authorization, 'Bearer secret-from-host');
    assert.equal(requests[0].options.body.includes('api_key'), false);
  });
});

describe('remote lexical RAG index', () => {
  const authorityContext = { tenant_id: 'tenant-1', workspace_id: 'workspace-1' };

  function gateway(calls, content = {
    'src/environment.ts': 'export const openHarmonyProfile = "openharmony";\nexport const product = "rk3568";\n',
    'README.md': 'The remote build pipeline uses P0 environment validation.\n',
  }) {
    return {
      async execute(envelope) {
        calls.push(envelope);
        const operation = envelope.payload.operation_kind;
        if (operation === 'workspace.list') {
          return { operation: 'list', entries: [...Object.keys(content), 'out/generated.hap', '.git/config'] };
        }
        if (operation === 'workspace.read') {
          const value = content[envelope.payload.path];
          if (value === undefined) throw Object.assign(new Error('not found'), { code: 'remote_command_failed' });
          return {
            operation: 'read',
            content: value,
            bytes: Buffer.byteLength(value),
            sha256: createHash('sha256').update(value).digest('hex'),
          };
        }
        throw new Error(`unexpected operation ${operation}`);
      },
    };
  }

  test('indexes the registered remote workspace and verifies result content through the gateway', async () => {
    const calls = [];
    const index = new RemoteRagIndex({
      gateway: gateway(calls),
      remoteRoot: '/srv/project',
      authorityContext,
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
      indexFile: join(root, '.dsh', 'remote-rag-index.json'),
    });
    assert.equal(index.status().state, 'not_indexed');
    const indexed = await index.refresh();
    assert.equal(indexed.state, 'ready');
    assert.equal(indexed.mode, 'remote_lexical');
    assert.equal(indexed.file_count, 2);

    const result = await index.search('OpenHarmony profile');
    assert.equal(result.results[0].relative_path, 'src/environment.ts');
    assert.equal(result.results[0].freshness, 'verified_remote_content');
    assert.equal(index.status().metrics.query_count, 1);
    assert.equal(index.status().metrics.hit_count, 1);
    assert.ok(calls.some((item) => item.payload.operation_kind === 'workspace.list'));
    assert.ok(calls.some((item) => item.payload.operation_kind === 'workspace.read'));
    assert.equal(calls.every((item) => item.signature?.value === 'signed'), true);
  });

  test('refreshes a remote index when a result hash changes', async () => {
    const calls = [];
    const source = { 'src/environment.ts': 'openharmony profile v1' };
    const index = new RemoteRagIndex({
      gateway: gateway(calls, source),
      remoteRoot: '/srv/project',
      authorityContext,
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
      indexFile: join(root, '.dsh', 'remote-rag-refresh.json'),
    });
    await index.refresh();
    source['src/environment.ts'] = 'harmonyos profile v2';
    const result = await index.search('harmonyos profile');
    assert.equal(result.results[0].snippet, 'harmonyos profile v2');
    assert.notEqual(result.revision, null);
  });

  test('refreshes a remote index when file metadata changes without a path-list change', async () => {
    const calls = [];
    const source = { value: 'openharmony profile v1', size: 22, mtime: 1000 };
    const gateway = {
      async execute(envelope) {
        calls.push(envelope);
        const operation = envelope.payload.operation_kind;
        if (operation === 'workspace.list') {
          return {
            operation: 'list',
            entries: [{ relative_path: 'src/environment.ts', size_bytes: source.size, mtime_ms: source.mtime }],
          };
        }
        if (operation === 'workspace.read') {
          return {
            operation: 'read', content: source.value, bytes: Buffer.byteLength(source.value),
            sha256: createHash('sha256').update(source.value).digest('hex'),
          };
        }
        throw new Error(`unexpected operation ${operation}`);
      },
    };
    const index = new RemoteRagIndex({
      gateway,
      remoteRoot: '/srv/project',
      authorityContext,
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
      indexFile: join(root, '.dsh', 'remote-rag-metadata-refresh.json'),
    });
    await index.refresh();
    source.value = 'harmonyos profile v2';
    source.size = source.value.length;
    source.mtime = 2000;
    const result = await index.search('harmonyos profile');
    assert.equal(result.results[0].snippet, 'harmonyos profile v2');
    assert.equal(index.status().metrics.index_count, 2);
    assert.ok(calls.filter((item) => item.payload.operation_kind === 'workspace.list').length >= 3);
  });

  test('rejects a remote source when the gateway hash does not match the returned content', async () => {
    const index = new RemoteRagIndex({
      gateway: {
        async execute(envelope) {
          const operation = envelope.payload.operation_kind;
          if (operation === 'workspace.list') {
            return { operation: 'list', entries: ['src/environment.ts'] };
          }
          if (operation === 'workspace.read') {
            return {
              operation: 'read',
              content: 'openharmony profile',
              bytes: Buffer.byteLength('openharmony profile'),
              sha256: '0'.repeat(64),
            };
          }
          throw new Error(`unexpected operation ${operation}`);
        },
      },
      remoteRoot: '/srv/project',
      authorityContext,
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
      indexFile: join(root, '.dsh', 'remote-rag-hash-mismatch.json'),
    });
    await assert.rejects(
      () => index.refresh(),
      (error) => error.code === 'rag_source_hash_mismatch',
    );
    assert.equal(index.status().state, 'error');
    assert.match(index.status().reason, /hash mismatch/u);
  });

  test('uses the injected model adapter for a remote workspace and revalidates semantic hits', async () => {
    const calls = [];
    const source = {
      'src/environment.ts': 'OpenHarmony environment profile',
      'README.md': 'HarmonyOS system profile and build pipeline',
    };
    const modelAdapter = {
      async embed({ texts, model }) {
        calls.push(['embed', model, texts]);
        return texts.map((text) => /HarmonyOS/iu.test(text) ? [1, 0] : [0, 1]);
      },
      async rerank({ documents, model }) {
        calls.push(['rerank', model, documents]);
        return documents.map((document, index) => ({ index, score: /HarmonyOS/iu.test(document) ? 1 : 0 }));
      },
    };
    const index = new RemoteRagIndex({
      gateway: gateway(calls, source),
      remoteRoot: '/srv/project',
      authorityContext,
      signature: { key_id: 'test', algorithm: 'hmac-sha256', value: 'signed' },
      indexFile: join(root, '.dsh', 'remote-semantic-index.json'),
      modelAdapter,
      modelProfile: {
        mode: 'embedding_reranker', provider: 'test',
        embedding_model: 'embed-test', reranker_model: 'rerank-test',
      },
    });
    await index.refresh();
    assert.equal(index.profile().execution, 'active');
    const result = await index.search('HarmonyOS component');
    assert.equal(result.retrieval_mode, 'embedding_reranker');
    assert.equal(result.results[0].relative_path, 'README.md');
    assert.equal(result.results[0].freshness, 'verified_remote_content');
    assert.equal(index.status().metrics.fallback_count, 0);
    assert.ok(calls.some((item) => Array.isArray(item) && item[0] === 'rerank'));
  });
});
