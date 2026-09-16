import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { createAuthorityEnvelope } from '../../../../workspace-gateway/src/authority/envelope.js';

const TEXT_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.hxx',
  '.gn', '.gni', '.json', '.md', '.py', '.sh', '.ts', '.tsx',
  '.js', '.mjs', '.cjs', '.ets', '.idl', '.xml', '.yaml', '.yml',
]);
const SKIP_DIRECTORIES = new Set(['.git', '.dsh', 'node_modules', 'out', 'dist', 'build', '__pycache__']);
const MAX_FILES = 4000;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_RESULTS = 20;
const INDEX_SCHEMA_VERSION = 1;
const RAG_MODES = new Set(['local_lexical', 'embedding_reranker']);
const MAX_PROFILE_TEXT = 256;
const MAX_PROFILE_ENDPOINT = 1024;
const REMOTE_INDEX_SCHEMA_VERSION = 1;
const REMOTE_MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_EMBEDDING_BATCH = 32;
const MAX_MODEL_DOCUMENT_CHARS = 16 * 1024;
const MAX_MODEL_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_VECTOR_DIMENSIONS = 16_384;

function newRagMetrics() {
  return {
    query_count: 0,
    hit_count: 0,
    fallback_count: 0,
    stale_hit_count: 0,
    index_count: 0,
    index_failures: 0,
    indexed_files: 0,
    indexed_bytes: 0,
    last_query_latency_ms: null,
    last_index_duration_ms: null,
    model_request_count: 0,
    model_error_count: 0,
    semantic_query_count: 0,
  };
}

function restoreRagMetrics(value) {
  const metrics = newRagMetrics();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return metrics;
  for (const key of Object.keys(metrics)) {
    if (Number.isSafeInteger(value[key]) && value[key] >= 0) metrics[key] = value[key];
  }
  return metrics;
}

function modelExecution(profile, adapter) {
  if (profile.mode === 'local_lexical') return 'active';
  if (!adapter || typeof adapter.embed !== 'function') return 'planned';
  return profile.reranker_model && typeof adapter.rerank !== 'function' ? 'partial' : 'active';
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function profileError(message, details = {}) {
  return Object.assign(new Error(message), { code: 'rag_model_profile_invalid', details });
}

function optionalProfileText(value, field, max = MAX_PROFILE_TEXT) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim() === '' || value.length > max || /[\0\r\n]/u.test(value)) {
    throw profileError(`${field} must be a bounded single-line string`, { field, max });
  }
  return value.trim();
}

function normalizeModelProfile(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw profileError('RAG model profile must be an object');
  if (Object.hasOwn(value, 'api_key') || Object.hasOwn(value, 'token') || Object.hasOwn(value, 'secret')) {
    throw profileError('RAG model credentials must be provided by the host secret store, not the profile');
  }
  const mode = value.mode ?? 'local_lexical';
  if (typeof mode !== 'string' || !RAG_MODES.has(mode)) {
    throw profileError('RAG mode must be local_lexical or embedding_reranker', { mode });
  }
  const provider = optionalProfileText(value.provider, 'provider');
  const embeddingModel = optionalProfileText(value.embedding_model ?? value.embeddingModel, 'embedding_model');
  const rerankerModel = optionalProfileText(value.reranker_model ?? value.rerankerModel, 'reranker_model');
  const endpointValue = optionalProfileText(value.endpoint, 'endpoint', MAX_PROFILE_ENDPOINT);
  let endpoint = endpointValue;
  if (endpointValue) {
    let parsed;
    try { parsed = new URL(endpointValue); } catch { throw profileError('endpoint must be an absolute http(s) URL', { field: 'endpoint' }); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) {
      throw profileError('endpoint must be an http(s) URL without embedded credentials or fragments', { field: 'endpoint' });
    }
    endpoint = parsed.toString().replace(/\/$/u, '');
  }
  return {
    mode,
    provider,
    embedding_model: embeddingModel,
    reranker_model: rerankerModel,
    endpoint,
  };
}

function modelProfileSnapshot(profile, adapter = null) {
  const value = structuredClone(profile);
  return {
    ...value,
    // A profile only declares a model. Execution becomes active when a host
    // injects an adapter with the corresponding methods; otherwise the UI
    // remains explicit about the lexical fallback.
    execution: modelExecution(value, adapter),
    model_adapter: value.mode === 'local_lexical' ? 'not_required' : adapter?.embed ? 'configured' : 'missing',
  };
}

function normalizeVector(value, field = 'embedding') {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_VECTOR_DIMENSIONS
      || value.some((item) => typeof item !== 'number' || !Number.isFinite(item))) {
    throw Object.assign(new Error(`${field} must be a finite numeric vector`), {
      code: 'rag_model_response_invalid', details: { field, max_dimensions: MAX_VECTOR_DIMENSIONS },
    });
  }
  return value.map((item) => Number(item));
}

function normalizeEmbeddings(value, expected) {
  const rows = Array.isArray(value) ? value : value?.vectors ?? value?.data;
  if (!Array.isArray(rows) || rows.length !== expected) {
    throw Object.assign(new Error('RAG embedding response count does not match the request'), {
      code: 'rag_model_response_invalid', details: { expected, received: Array.isArray(rows) ? rows.length : null },
    });
  }
  const vectors = rows.map((row, index) => normalizeVector(
    Array.isArray(row) ? row : row?.embedding,
    `embeddings[${index}]`,
  ));
  const dimensions = vectors[0].length;
  if (vectors.some((vector) => vector.length !== dimensions)) {
    throw Object.assign(new Error('RAG embeddings have inconsistent dimensions'), {
      code: 'rag_model_response_invalid', details: { dimensions },
    });
  }
  return vectors;
}

function normalizeRerank(value, expected) {
  const rows = Array.isArray(value) ? value : value?.results ?? value?.data;
  if (!Array.isArray(rows)) {
    throw Object.assign(new Error('RAG reranker response must contain results'), {
      code: 'rag_model_response_invalid', details: { expected },
    });
  }
  return rows.map((row, position) => {
    const index = Number.isInteger(row?.index) ? row.index : position;
    const score = Number(row?.relevance_score ?? row?.score ?? row?.value);
    if (!Number.isInteger(index) || index < 0 || index >= expected || !Number.isFinite(score)) {
      throw Object.assign(new Error('RAG reranker response contains an invalid score'), {
        code: 'rag_model_response_invalid', details: { index, expected },
      });
    }
    return { index, score };
  });
}

function cosine(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) return null;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

async function embedInBatches(adapter, texts, model, signal) {
  if (!adapter || typeof adapter.embed !== 'function') return null;
  const vectors = [];
  for (let offset = 0; offset < texts.length; offset += MAX_EMBEDDING_BATCH) {
    const batch = texts.slice(offset, offset + MAX_EMBEDDING_BATCH)
      .map((text) => String(text).slice(0, MAX_MODEL_DOCUMENT_CHARS));
    const response = await adapter.embed({ texts: batch, model, signal });
    vectors.push(...normalizeEmbeddings(response, batch.length));
  }
  return vectors;
}

async function semanticRank({ records, query, queryTokens, modelProfile, modelAdapter, revision, freshness = null, signal = null }) {
  const vectors = await embedInBatches(modelAdapter, [query], modelProfile.embedding_model, signal);
  if (!vectors?.[0]) throw Object.assign(new Error('RAG embedding adapter returned no query vector'), { code: 'rag_model_response_invalid' });
  const ranked = records.map((record, index) => ({
    record,
    index,
    score: cosine(vectors[0], record.embedding),
  })).filter((item) => item.score !== null)
    .sort((left, right) => right.score - left.score || left.record.relative_path.localeCompare(right.record.relative_path));
  const candidates = ranked.slice(0, Math.min(MAX_RESULTS * 3, ranked.length));
  let rerankScores = null;
  if (modelProfile.reranker_model && typeof modelAdapter?.rerank === 'function' && candidates.length > 0) {
    const response = await modelAdapter.rerank({
      query: query.slice(0, MAX_MODEL_DOCUMENT_CHARS),
      documents: candidates.map(({ record }) => record.content.slice(0, MAX_MODEL_DOCUMENT_CHARS)),
      model: modelProfile.reranker_model,
      signal,
    });
    rerankScores = normalizeRerank(response, candidates.length);
    const byIndex = new Map(rerankScores.map((item) => [item.index, item.score]));
    candidates.sort((left, right) => (byIndex.get(right.index) ?? -Infinity) - (byIndex.get(left.index) ?? -Infinity)
      || right.score - left.score || left.record.relative_path.localeCompare(right.record.relative_path));
  }
  const retrievalMode = rerankScores ? 'embedding_reranker' : 'embedding';
  return {
    status: 'ready', query, revision, retrieval_mode: retrievalMode,
    results: candidates.slice(0, MAX_RESULTS).map(({ record, index, score }) => {
      const position = snippet(record.content, queryTokens);
      return {
        relative_path: record.relative_path,
        line: position.line,
        snippet: position.text,
        sha256: record.sha256,
        score: rerankScores ? (new Map(rerankScores.map((item) => [item.index, item.score])).get(index) ?? score) : score,
        source_revision: revision,
        ...(freshness ? { freshness } : {}),
        semantic: true,
        stale_check: freshness ? 'remote_workspace_hash_verified_before_use' : 'revalidate_against_workspace_before_use',
      };
    }),
  };
}

function lexicalRank(records, query, queryTokens, revision, freshness = null) {
  const results = records.map((record) => {
    const pathLower = record.relative_path.toLocaleLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (pathLower.includes(token)) score += 4;
      let offset = record.lower.indexOf(token);
      while (offset >= 0) {
        score += 1;
        offset = record.lower.indexOf(token, offset + token.length);
      }
    }
    if (score === 0) return null;
    const position = snippet(record.content, queryTokens);
    return {
      relative_path: record.relative_path,
      line: position.line,
      snippet: position.text,
      sha256: record.sha256,
      score,
      source_revision: revision,
      ...(freshness ? { freshness } : {}),
      stale_check: freshness ? 'remote_workspace_hash_verified_before_use' : 'revalidate_against_workspace_before_use',
    };
  }).filter(Boolean).sort((left, right) => right.score - left.score || left.relative_path.localeCompare(right.relative_path));
  return { status: 'ready', query, revision, retrieval_mode: 'lexical', results: results.slice(0, MAX_RESULTS) };
}

function modelError(message, details = {}) {
  return Object.assign(new Error(message), { code: 'rag_model_request_failed', details });
}

/**
 * OpenAI-compatible embeddings/reranking adapter. The API key is supplied by
 * the host secret store and is never accepted in, or persisted with, a model
 * profile. Qwen-compatible deployments can use this adapter directly when
 * they expose `/embeddings` and `/rerank` endpoints.
 */
export class HttpRagModelAdapter {
  constructor({ endpoint, apiKey = null, fetchImpl = globalThis.fetch, timeoutMs = 30_000, headers = {}, embeddingPath = '/embeddings', rerankPath = '/rerank' } = {}) {
    if (typeof endpoint !== 'string' || endpoint.trim() === '') throw new TypeError('endpoint is required');
    let parsed;
    try { parsed = new URL(endpoint); } catch { throw new TypeError('endpoint must be a valid URL'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) throw new TypeError('endpoint must be an http(s) URL without credentials');
    if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10 * 60 * 1000) throw new TypeError('timeoutMs is invalid');
    if (apiKey !== null && (typeof apiKey !== 'string' || apiKey.length > 4096 || /[\0\r\n]/u.test(apiKey))) throw new TypeError('apiKey is invalid');
    this.endpoint = parsed.toString().replace(/\/$/u, '');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.headers = { ...headers };
    this.embeddingPath = embeddingPath;
    this.rerankPath = rerankPath;
  }

  async embed({ texts, model, signal } = {}) {
    if (!Array.isArray(texts) || texts.length === 0) throw new TypeError('texts must be a non-empty array');
    return this.#post(this.embeddingPath, { model, input: texts }, signal).then((value) => normalizeEmbeddings(value, texts.length));
  }

  async rerank({ query, documents, model, signal } = {}) {
    if (!Array.isArray(documents) || documents.length === 0) throw new TypeError('documents must be a non-empty array');
    return this.#post(this.rerankPath, { model, query, documents }, signal).then((value) => normalizeRerank(value, documents.length));
  }

  async #post(path, body, signal) {
    const target = new URL(path.replace(/^\//u, ''), `${this.endpoint}/`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('RAG model timeout'), this.timeoutMs);
    const onAbort = () => controller.abort(signal?.reason ?? 'aborted');
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    try {
      let response;
      try {
        response = await this.fetchImpl(target, {
          method: 'POST',
          headers: {
            accept: 'application/json', 'content-type': 'application/json',
            ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}), ...this.headers,
          },
          body: JSON.stringify(body), signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) throw modelError(signal?.aborted ? 'RAG model request aborted' : 'RAG model request timed out', { cause: error?.message });
        throw modelError(error?.message ?? 'RAG model request failed');
      }
      const text = await response.text();
      if (Buffer.byteLength(text, 'utf8') > MAX_MODEL_RESPONSE_BYTES) throw modelError('RAG model response exceeded the configured limit');
      let value;
      try { value = text ? JSON.parse(text) : null; } catch { throw modelError('RAG model response was not valid JSON'); }
      if (!response.ok) throw modelError(`RAG model returned HTTP ${response.status}`, { status: response.status, response: value?.error?.message ?? null });
      return value;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
}

function tokens(value) {
  return [...new Set((value.toLocaleLowerCase().match(/[a-z0-9_\u4e00-\u9fff]+/g) || []))];
}

async function collectFiles(root, current = root, result = []) {
  if (result.length >= MAX_FILES) return result;
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (result.length >= MAX_FILES) break;
    if (entry.isSymbolicLink()) continue;
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) await collectFiles(root, path, result);
      continue;
    }
    if (isTextFile(entry.name)) result.push(path);
  }
  return result;
}

function isTextFile(name) {
  const extension = name.includes('.') ? `.${name.split('.').pop().toLowerCase()}` : '';
  return TEXT_EXTENSIONS.has(extension);
}

function collectFilesSync(root, current = root, result = []) {
  if (result.length >= MAX_FILES) return result;
  let entries;
  try {
    entries = readdirSync(current, { withFileTypes: true });
  } catch {
    return result;
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    if (result.length >= MAX_FILES || entry.isSymbolicLink()) continue;
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) collectFilesSync(root, path, result);
      continue;
    }
    if (isTextFile(entry.name)) result.push(path);
  }
  return result;
}

function safeRelativePath(root, path) {
  const value = relative(root, path).split('\\').join('/');
  return value && value !== '.' && !value.startsWith('../') && value !== '..' && !value.startsWith('/')
    ? value : null;
}

function revisionForManifest(manifest) {
  return sha256(manifest
    .map((item) => `${item.relative_path}:${item.sha256 ?? `${item.size_bytes}:${item.mtime_ms}`}`)
    .sort((left, right) => left.localeCompare(right))
    .join('\n'));
}

function sourceSignatureForManifest(manifest) {
  return sha256(manifest
    // ctime catches an in-place replacement whose size and mtime are restored
    // by a caller. Content hashes remain the authoritative revision; this
    // signature is only the cheap stale check used before a query.
    .map((item) => `${item.relative_path}:${item.size_bytes}:${item.mtime_ms}:${item.ctime_ms ?? ''}`)
    .sort((left, right) => left.localeCompare(right))
    .join('\n'));
}

function snippet(content, queryTokens) {
  const lines = content.split(/\r?\n/);
  const lineIndex = lines.findIndex((line) => queryTokens.some((token) => line.toLocaleLowerCase().includes(token)));
  const index = lineIndex >= 0 ? lineIndex : 0;
  return { line: index + 1, text: lines[index]?.slice(0, 600) ?? '' };
}

export class LocalRagIndex {
  constructor({ root, indexFile = null, modelProfile = null, modelAdapter = null } = {}) {
    this.root = resolve(root);
    this.indexFile = resolve(indexFile ?? `${this.root}${sep}.dsh${sep}rag-index.json`);
    if (!isWithin(this.root, this.indexFile)) {
      throw Object.assign(new Error('RAG index file must stay inside the configured workspace'), {
        code: 'rag_index_outside_workspace',
      });
    }
    this.modelProfile = normalizeModelProfile(modelProfile ?? {});
    this.modelAdapter = modelAdapter;
    this.records = [];
    this.sourceManifest = [];
    this.sourceSignature = null;
    this.indexedAt = null;
    this.revision = null;
    this.lastError = null;
    this.loadError = null;
    this.building = null;
    this.metrics = newRagMetrics();
    this.#loadPersisted();
  }

  status() {
    if (this.lastError) {
      return { state: 'error', mode: this.modelProfile.mode, root: this.root, model_profile: modelProfileSnapshot(this.modelProfile, this.modelAdapter), metrics: structuredClone(this.metrics), reason: this.lastError };
    }
    if (!this.indexedAt) return {
      state: 'not_indexed', mode: this.modelProfile.mode, root: this.root,
      index_file: this.indexFile,
      model_profile: modelProfileSnapshot(this.modelProfile, this.modelAdapter),
      metrics: structuredClone(this.metrics),
      ...(this.loadError ? { reason: this.loadError } : {}),
    };
    const currentSignature = this.#currentSourceSignature();
    // Older/corrupt persisted indexes may contain records without the cheap
    // source signature. Treat them as stale and rebuild before use instead of
    // trusting an unverifiable snapshot.
    const stale = this.sourceSignature === null || currentSignature !== this.sourceSignature;
    const snapshot = {
      state: stale ? 'stale' : 'ready',
      mode: this.modelProfile.mode,
      root: this.root,
      index_file: this.indexFile,
      file_count: this.records.length,
      indexed_at: this.indexedAt,
      revision: this.revision,
      source_signature: this.sourceSignature,
      model_profile: modelProfileSnapshot(this.modelProfile, this.modelAdapter),
      embedding_model: this.modelProfile.embedding_model,
      reranker_model: this.modelProfile.reranker_model,
      source_policy: 'local_workspace_only',
      metrics: structuredClone(this.metrics),
    };
    if (stale) {
      snapshot.current_source_signature = currentSignature;
      snapshot.reason = this.sourceSignature === null
        ? 'index source signature unavailable; rebuild required'
        : 'workspace sources changed since the last index';
    }
    return snapshot;
  }

  profile() {
    return modelProfileSnapshot(this.modelProfile, this.modelAdapter);
  }

  async updateProfile(input = {}) {
    if (this.building) throw Object.assign(new Error('RAG index is currently being rebuilt'), { code: 'rag_profile_busy' });
    this.modelProfile = normalizeModelProfile(input);
    await this.#persist();
    return this.status();
  }

  async refresh() {
    if (this.building) return this.building;
    this.building = (async () => {
      const startedAt = Date.now();
      try {
        const files = (await collectFiles(this.root)).sort((left, right) => left.localeCompare(right));
        const records = [];
        const sourceManifest = [];
        for (const path of files) {
          const content = await readFile(path, 'utf8');
          if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) continue;
          const relativePath = safeRelativePath(this.root, path);
          if (!relativePath) continue;
          const metadata = await stat(path);
          const digest = sha256(content);
          records.push({
            relative_path: relativePath,
            content,
            lower: content.toLocaleLowerCase(),
            sha256: digest,
          });
          sourceManifest.push({
            relative_path: relativePath,
            sha256: digest,
            size_bytes: metadata.size,
            mtime_ms: metadata.mtimeMs,
            ctime_ms: metadata.ctimeMs,
          });
        }
        // Do not publish a mixed snapshot when a source is edited while the
        // index is being built. The cheap signature includes ctime so an
        // in-place replacement that restores size/mtime is still detected.
        const observedSignature = sourceSignatureForManifest(sourceManifest);
        const currentSignature = this.#currentSourceSignature();
        if (currentSignature !== observedSignature) {
          throw Object.assign(new Error('workspace sources changed while building the RAG index'), {
            code: 'rag_workspace_changed_during_index',
          });
        }
        if (this.modelProfile.mode === 'embedding_reranker' && this.modelAdapter?.embed) {
          this.metrics.model_request_count += Math.ceil(records.length / MAX_EMBEDDING_BATCH);
          try {
            const vectors = await embedInBatches(this.modelAdapter, records.map((record) => record.content), this.modelProfile.embedding_model);
            records.forEach((record, index) => { record.embedding = vectors[index]; });
          } catch (error) {
            this.metrics.model_error_count += 1;
            throw error;
          }
          if (this.#currentSourceSignature() !== observedSignature) {
            throw Object.assign(new Error('workspace sources changed while embedding the RAG index'), {
              code: 'rag_workspace_changed_during_index',
            });
          }
        }
        this.records = records;
        this.sourceManifest = sourceManifest;
        this.indexedAt = new Date().toISOString();
        this.revision = revisionForManifest(sourceManifest);
        this.sourceSignature = sourceSignatureForManifest(sourceManifest);
        this.lastError = null;
        this.metrics.index_count += 1;
        this.metrics.indexed_files = records.length;
        this.metrics.indexed_bytes = sourceManifest.reduce((total, item) => total + (item.size_bytes ?? 0), 0);
        this.metrics.last_index_duration_ms = Math.max(0, Date.now() - startedAt);
        await this.#persist();
        return this.status();
      } catch (error) {
        this.lastError = error.message;
        this.metrics.index_failures += 1;
        throw Object.assign(new Error(`RAG index failed: ${error.message}`), {
          code: error?.code ?? 'rag_index_failed',
          details: error?.details ?? {},
        });
      } finally {
        this.building = null;
      }
    })();
    return this.building;
  }

  async search(query) {
    const startedAt = Date.now();
    if (typeof query !== 'string' || query.trim() === '') {
      throw Object.assign(new Error('query is required'), { code: 'rag_query_required' });
    }
    if (query.length > 256) {
      throw Object.assign(new Error('query is too long'), { code: 'rag_query_too_long' });
    }
    const wasStale = this.indexedAt && this.status().state === 'stale';
    const needsSemanticIndex = this.modelProfile.mode === 'embedding_reranker'
      && this.modelAdapter?.embed && this.records.length > 0
      && !this.records.every((record) => Array.isArray(record.embedding));
    if (!this.indexedAt || wasStale || needsSemanticIndex) await this.refresh();
    const queryTokens = tokens(query);
    if (queryTokens.length === 0) {
      throw Object.assign(new Error('query must contain at least one searchable token'), {
        code: 'rag_query_invalid',
      });
    }
    const semanticReady = this.modelProfile.mode === 'embedding_reranker'
      && this.modelAdapter?.embed && this.records.length > 0
      && this.records.every((record) => Array.isArray(record.embedding));
    let result;
    if (semanticReady) {
      this.metrics.model_request_count += 1;
      try {
        result = await semanticRank({ records: this.records, query, queryTokens,
          modelProfile: this.modelProfile, modelAdapter: this.modelAdapter, revision: this.revision });
        this.metrics.semantic_query_count += 1;
      } catch (error) {
        this.metrics.model_error_count += 1;
        throw Object.assign(new Error(error?.message ?? 'RAG model request failed'), {
          code: error?.code ?? 'rag_model_request_failed', details: error?.details ?? {},
        });
      }
    } else {
      result = lexicalRank(this.records, query, queryTokens, this.revision);
    }
    const limited = result.results;
    this.metrics.query_count += 1;
    this.metrics.hit_count += limited.length;
    if (this.modelProfile.mode === 'embedding_reranker' && result.retrieval_mode === 'lexical') this.metrics.fallback_count += 1;
    if (wasStale) this.metrics.stale_hit_count += 1;
    this.metrics.last_query_latency_ms = Math.max(0, Date.now() - startedAt);
    return { ...result, results: limited };
  }

  #loadPersisted() {
    if (!existsSync(this.indexFile)) return;
    try {
      const persisted = JSON.parse(readFileSync(this.indexFile, 'utf8'));
      if (persisted?.schema_version !== INDEX_SCHEMA_VERSION
          || resolve(persisted.root ?? '') !== this.root
          || !Array.isArray(persisted.records)
          || persisted.records.length > MAX_FILES) {
        throw new Error('index schema or workspace root does not match');
      }
      const records = [];
      for (const item of persisted.records) {
        const relativePath = typeof item?.relative_path === 'string' ? item.relative_path : null;
        const content = typeof item?.content === 'string' ? item.content : null;
        if (!relativePath || content === null || !safeRelativePath(this.root, resolve(this.root, relativePath))) {
          throw new Error('index contains an unsafe record');
        }
        const digest = sha256(content);
        if (item.sha256 && item.sha256 !== digest) throw new Error(`index hash mismatch for ${relativePath}`);
        const embedding = Array.isArray(item.embedding) ? normalizeVector(item.embedding, `embedding:${relativePath}`) : null;
        records.push({ relative_path: relativePath, content, lower: content.toLocaleLowerCase(), sha256: digest, embedding });
      }
      this.records = records.sort((left, right) => left.relative_path.localeCompare(right.relative_path));
      this.sourceManifest = Array.isArray(persisted.source_manifest)
        ? persisted.source_manifest.filter((item) => item && typeof item.relative_path === 'string')
        : this.records.map((record) => ({ relative_path: record.relative_path, sha256: record.sha256 }));
      this.indexedAt = typeof persisted.indexed_at === 'string' ? persisted.indexed_at : null;
      this.revision = typeof persisted.revision === 'string' ? persisted.revision : revisionForManifest(this.sourceManifest);
      this.sourceSignature = typeof persisted.source_signature === 'string'
        ? persisted.source_signature : null;
      this.metrics = restoreRagMetrics(persisted.metrics);
      this.modelProfile = normalizeModelProfile({
        ...this.modelProfile,
        ...(persisted.model_profile && typeof persisted.model_profile === 'object' ? persisted.model_profile : {}),
      });
    } catch (error) {
      this.records = [];
      this.sourceManifest = [];
      this.indexedAt = null;
      this.revision = null;
      this.sourceSignature = null;
      this.loadError = `persisted index ignored: ${error.message}`;
    }
  }

  #currentSourceSignature() {
    if (!existsSync(this.root)) return null;
    const manifest = [];
    for (const path of collectFilesSync(this.root)) {
      try {
        const metadata = statSync(path);
        if (metadata.size > MAX_FILE_BYTES) continue;
        const relativePath = safeRelativePath(this.root, path);
        if (!relativePath) continue;
        manifest.push({ relative_path: relativePath, size_bytes: metadata.size, mtime_ms: metadata.mtimeMs, ctime_ms: metadata.ctimeMs });
      } catch {
        return null;
      }
    }
    return sourceSignatureForManifest(manifest);
  }

  async #persist() {
    const payload = {
      schema_version: INDEX_SCHEMA_VERSION,
      root: this.root,
      indexed_at: this.indexedAt,
      revision: this.revision,
      source_signature: this.sourceSignature,
      source_manifest: this.sourceManifest,
      model_profile: this.modelProfile,
      source_policy: 'local_workspace_only',
      metrics: this.metrics,
      records: this.records.map(({ relative_path, content, sha256: digest, embedding }) => ({
        relative_path, content, sha256: digest, ...(Array.isArray(embedding) ? { embedding } : {}),
      })),
    };
    await mkdir(dirname(this.indexFile), { recursive: true, mode: 0o700 });
    const temporary = `${this.indexFile}.${process.pid}.${Date.now()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(payload)}\n`, { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.indexFile);
    } catch (error) {
      try { await unlink(temporary); } catch { /* best effort cleanup */ }
      throw error;
    }
  }
}

function remoteRagError(code, message, details = {}) {
  throw Object.assign(new Error(message), { code, details });
}

function remoteRelativePath(value) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\\') || value.includes('\0')) return null;
  const normalized = posix.normalize(value.trim());
  if (normalized === '.' || normalized.startsWith('/') || normalized === '..' || normalized.startsWith('../')) return null;
  return normalized;
}

function remoteFileAllowed(path) {
  const parts = path.split('/');
  if (parts.some((part) => SKIP_DIRECTORIES.has(part))) return false;
  return isTextFile(posix.basename(path));
}

function remoteContentHash(content, supplied) {
  const computed = sha256(content);
  if (supplied === undefined || supplied === null) return computed;
  if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/u.test(supplied) || supplied !== computed) {
    remoteRagError('rag_source_hash_mismatch', 'remote gateway hash mismatch: returned source hash does not match the content', {
      expected_sha256: computed,
      supplied_sha256: typeof supplied === 'string' ? supplied : null,
    });
  }
  return computed;
}

function normalizeRemoteListingEntry(value) {
  const rawPath = typeof value === 'string' ? value : value?.relative_path ?? value?.path;
  const path = remoteRelativePath(rawPath);
  if (!path) return null;
  if (typeof value === 'string') return { relative_path: path, size_bytes: null, mtime_ms: null };
  const size = value?.size_bytes;
  const mtime = value?.mtime_ms;
  if ((size !== null && size !== undefined && (!Number.isSafeInteger(size) || size < 0))
      || (mtime !== null && mtime !== undefined && (!Number.isFinite(mtime) || mtime < 0))) return null;
  return {
    relative_path: path,
    size_bytes: size === null || size === undefined ? null : size,
    mtime_ms: mtime === null || mtime === undefined ? null : mtime,
  };
}

function remoteListingSignature(listing) {
  return sha256(listing
    .map((item) => `${item.relative_path}:${item.size_bytes ?? ''}:${item.mtime_ms ?? ''}`)
    .join('\n'));
}

function unwrapRemoteGatewayResult(result) {
  if (result?.status === 'completed' && result.result && typeof result.result === 'object') return result.result;
  if (result?.status === 'failed' && result.error) {
    remoteRagError(result.error.code ?? 'gateway_request_failed', result.error.message ?? 'workspace gateway operation failed', result.error.details ?? {});
  }
  return result;
}

/**
 * Lexical RAG backed by a registered Workspace Gateway. Source files stay on
 * the code host until the workspace policy explicitly enables this index;
 * reads and result revalidation use the same signed, bounded operations as
 * remote AR delivery.
 */
export class RemoteRagIndex {
  constructor({
    gateway,
    remoteRoot,
    authorityContext,
    signature = null,
    sign = null,
    indexFile = null,
    modelProfile = null,
    modelAdapter = null,
  } = {}) {
    if (!gateway || typeof gateway.execute !== 'function') throw new TypeError('gateway.execute is required');
    if (typeof remoteRoot !== 'string' || !posix.isAbsolute(remoteRoot.trim())) {
      throw Object.assign(new Error('remoteRoot must be an absolute POSIX path'), { code: 'remote_workspace_invalid' });
    }
    if (!authorityContext || typeof authorityContext !== 'object' || Array.isArray(authorityContext)) {
      throw new TypeError('authorityContext is required');
    }
    if (signature !== null && (!signature || typeof signature !== 'object')) throw new TypeError('signature must be an object');
    if (sign !== null && typeof sign !== 'function') throw new TypeError('sign must be a function');
    this.gateway = gateway;
    this.remoteRoot = posix.normalize(remoteRoot.trim());
    this.authorityContext = { ...authorityContext };
    this.signature = signature;
    this.sign = sign;
    this.indexFile = resolve(indexFile ?? join(process.cwd(), '.dsh', 'remote-rag-index.json'));
    this.modelProfile = normalizeModelProfile(modelProfile ?? {});
    this.modelAdapter = modelAdapter;
    this.records = [];
    this.sourceManifest = [];
    this.sourceSignature = null;
    this.listingSignature = null;
    this.indexedAt = null;
    this.revision = null;
    this.lastError = null;
    this.loadError = null;
    this.building = null;
    this.metrics = newRagMetrics();
    this.#loadPersisted();
  }

  status() {
    if (this.lastError) return {
      state: 'error', mode: this.modelProfile.mode === 'local_lexical' ? 'remote_lexical' : 'remote_embedding_reranker', root: this.remoteRoot,
      model_profile: modelProfileSnapshot(this.modelProfile, this.modelAdapter), metrics: structuredClone(this.metrics), reason: this.lastError,
    };
    if (!this.indexedAt) return {
      state: 'not_indexed', mode: this.modelProfile.mode === 'local_lexical' ? 'remote_lexical' : 'remote_embedding_reranker', root: this.remoteRoot,
      index_file: this.indexFile, model_profile: modelProfileSnapshot(this.modelProfile, this.modelAdapter),
      metrics: structuredClone(this.metrics),
      ...(this.loadError ? { reason: this.loadError } : {}),
    };
    return {
      state: 'ready', mode: this.modelProfile.mode === 'local_lexical' ? 'remote_lexical' : 'remote_embedding_reranker', root: this.remoteRoot,
      index_file: this.indexFile, file_count: this.records.length,
      indexed_at: this.indexedAt, revision: this.revision,
      source_signature: this.sourceSignature, listing_signature: this.listingSignature,
      model_profile: modelProfileSnapshot(this.modelProfile, this.modelAdapter),
      embedding_model: this.modelProfile.embedding_model,
      reranker_model: this.modelProfile.reranker_model,
      source_policy: 'registered_remote_workspace_gateway',
      freshness: 'revalidated_on_search',
      metrics: structuredClone(this.metrics),
    };
  }

  profile() {
    return modelProfileSnapshot(this.modelProfile, this.modelAdapter);
  }

  async updateProfile(input = {}) {
    if (this.building) throw Object.assign(new Error('RAG index is currently being rebuilt'), { code: 'rag_profile_busy' });
    this.modelProfile = normalizeModelProfile(input);
    await this.#persist();
    return this.status();
  }

  async refresh() {
    if (this.building) return this.building;
    this.building = (async () => {
      const startedAt = Date.now();
      try {
        const listed = await this.#list();
        const records = [];
        const sourceManifest = [];
        let totalBytes = 0;
        for (const entry of listed) {
          const path = entry.relative_path;
          if (!remoteFileAllowed(path)) continue;
          const file = await this.#read(path);
          const size = Buffer.byteLength(file.content, 'utf8');
          if (size > MAX_FILE_BYTES || totalBytes + size > REMOTE_MAX_TOTAL_BYTES) continue;
          totalBytes += size;
          records.push({
            relative_path: path,
            content: file.content,
            lower: file.content.toLocaleLowerCase(),
            sha256: file.sha256,
          });
          sourceManifest.push({
            relative_path: path,
            sha256: file.sha256,
            size_bytes: size,
            mtime_ms: entry.mtime_ms,
          });
        }
        const secondListing = await this.#list();
        const firstListingSignature = remoteListingSignature(listed);
        const secondListingSignature = remoteListingSignature(secondListing);
        if (firstListingSignature !== secondListingSignature) {
          throw Object.assign(new Error('remote workspace sources changed while building the RAG index'), {
            code: 'rag_workspace_changed_during_index',
          });
        }
        if (this.modelProfile.mode === 'embedding_reranker' && this.modelAdapter?.embed) {
          this.metrics.model_request_count += Math.ceil(records.length / MAX_EMBEDDING_BATCH);
          try {
            const vectors = await embedInBatches(this.modelAdapter, records.map((record) => record.content), this.modelProfile.embedding_model);
            records.forEach((record, index) => { record.embedding = vectors[index]; });
          } catch (error) {
            this.metrics.model_error_count += 1;
            throw error;
          }
          const finalListing = await this.#list();
          if (remoteListingSignature(finalListing) !== secondListingSignature) {
            throw Object.assign(new Error('remote workspace sources changed while embedding the RAG index'), {
              code: 'rag_workspace_changed_during_index',
            });
          }
        }
        this.records = records.sort((left, right) => left.relative_path.localeCompare(right.relative_path));
        this.sourceManifest = sourceManifest;
        this.indexedAt = new Date().toISOString();
        this.revision = revisionForManifest(sourceManifest);
        this.sourceSignature = sourceSignatureForManifest(sourceManifest);
        this.listingSignature = secondListingSignature;
        this.lastError = null;
        this.metrics.index_count += 1;
        this.metrics.indexed_files = records.length;
        this.metrics.indexed_bytes = totalBytes;
        this.metrics.last_index_duration_ms = Math.max(0, Date.now() - startedAt);
        await this.#persist();
        return this.status();
      } catch (error) {
        this.lastError = error.message;
        this.metrics.index_failures += 1;
        throw Object.assign(new Error(`remote RAG index failed: ${error.message}`), {
          code: error?.code ?? 'rag_index_failed', details: error?.details ?? {},
        });
      } finally {
        this.building = null;
      }
    })();
    return this.building;
  }

  async search(query) {
    const startedAt = Date.now();
    if (typeof query !== 'string' || query.trim() === '') {
      throw Object.assign(new Error('query is required'), { code: 'rag_query_required' });
    }
    if (query.length > 256) throw Object.assign(new Error('query is too long'), { code: 'rag_query_too_long' });
    const needsSemanticIndex = this.modelProfile.mode === 'embedding_reranker'
      && this.modelAdapter?.embed && this.records.length > 0
      && !this.records.every((record) => Array.isArray(record.embedding));
    if (!this.indexedAt || needsSemanticIndex) await this.refresh();
    const listing = await this.#list();
    const listingSignature = remoteListingSignature(listing);
    if (this.listingSignature !== listingSignature) await this.refresh();
    const queryTokens = tokens(query);
    if (queryTokens.length === 0) {
      throw Object.assign(new Error('query must contain at least one searchable token'), { code: 'rag_query_invalid' });
    }
    const result = await this.#searchVerified(query, queryTokens, true);
    this.metrics.query_count += 1;
    this.metrics.hit_count += result.results.length;
    if (this.modelProfile.mode === 'embedding_reranker' && result.retrieval_mode === 'lexical') this.metrics.fallback_count += 1;
    this.metrics.last_query_latency_ms = Math.max(0, Date.now() - startedAt);
    return result;
  }

  async #searchVerified(query, queryTokens, allowRefresh) {
    const semanticReady = this.modelProfile.mode === 'embedding_reranker'
      && this.modelAdapter?.embed && this.records.length > 0
      && this.records.every((record) => Array.isArray(record.embedding));
    if (semanticReady) {
      this.metrics.model_request_count += 1;
      let semantic;
      try {
        semantic = await semanticRank({ records: this.records, query, queryTokens,
          modelProfile: this.modelProfile, modelAdapter: this.modelAdapter, revision: this.revision,
          freshness: 'verified_remote_content' });
        this.metrics.semantic_query_count += 1;
      } catch (error) {
        this.metrics.model_error_count += 1;
        throw Object.assign(new Error(error?.message ?? 'RAG model request failed'), {
          code: error?.code ?? 'rag_model_request_failed', details: error?.details ?? {},
        });
      }
      const results = [];
      for (const candidate of semantic.results) {
        const current = await this.#read(candidate.relative_path);
        if (current.sha256 !== candidate.sha256) {
          if (allowRefresh) {
            await this.refresh();
            return this.#searchVerified(query, queryTokens, false);
          }
          remoteRagError('rag_source_stale', 'remote workspace changed during result verification');
        }
        const position = snippet(current.content, queryTokens);
        results.push({ ...candidate, snippet: position.text, line: position.line, sha256: current.sha256 });
      }
      return { ...semantic, results };
    }
    const ranked = this.records.map((record) => {
      const pathLower = record.relative_path.toLocaleLowerCase();
      let score = 0;
      for (const token of queryTokens) {
        if (pathLower.includes(token)) score += 4;
        let offset = record.lower.indexOf(token);
        while (offset >= 0) {
          score += 1;
          offset = record.lower.indexOf(token, offset + token.length);
        }
      }
      if (score === 0) return null;
      return { record, score };
    }).filter(Boolean).sort((left, right) => right.score - left.score || left.record.relative_path.localeCompare(right.record.relative_path));
    const results = [];
    let stale = false;
    for (const candidate of ranked.slice(0, MAX_RESULTS)) {
      const current = await this.#read(candidate.record.relative_path);
      if (current.sha256 !== candidate.record.sha256) {
        stale = true;
        break;
      }
      const position = snippet(current.content, queryTokens);
      results.push({
        relative_path: candidate.record.relative_path,
        line: position.line,
        snippet: position.text,
        sha256: current.sha256,
        score: candidate.score,
        source_revision: this.revision,
        freshness: 'verified_remote_content',
        stale_check: 'remote_workspace_hash_verified_before_use',
      });
    }
    if (stale && allowRefresh) {
      await this.refresh();
      return this.#searchVerified(query, queryTokens, false);
    }
    if (stale) remoteRagError('rag_source_stale', 'remote workspace changed during result verification');
    return { status: 'ready', query, revision: this.revision, retrieval_mode: 'lexical', results };
  }

  async #list() {
    const result = await this.#call('workspace.list', {
      path: '.', recursive: true, max_entries: MAX_FILES, with_metadata: true,
    });
    const entries = Array.isArray(result?.entries) ? result.entries : [];
    const normalized = entries.map(normalizeRemoteListingEntry).filter(Boolean);
    const deduplicated = new Map();
    for (const entry of normalized) {
      const previous = deduplicated.get(entry.relative_path);
      // Keep the most informative metadata when a legacy gateway returns a
      // duplicate string entry alongside its structured record.
      if (!previous || (previous.size_bytes === null && entry.size_bytes !== null)
          || (previous.mtime_ms === null && entry.mtime_ms !== null)) deduplicated.set(entry.relative_path, entry);
    }
    return [...deduplicated.values()].sort((left, right) => left.relative_path.localeCompare(right.relative_path));
  }

  async #read(path) {
    const result = await this.#call('workspace.read', { path });
    const content = String(result?.content ?? '');
    const digest = remoteContentHash(content, result?.sha256);
    if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) return { content, sha256: digest };
    return { content, sha256: digest };
  }

  async #call(operationKind, payload) {
    const operationId = `remote-rag-${operationKind}-${randomUUID()}`;
    const contextRun = this.authorityContext.cloud_run_id ?? `rag-${this.authorityContext.workspace_id ?? 'workspace'}`;
    const fields = {
      ...this.authorityContext,
      cloud_run_id: contextRun,
      authority_run_id: this.authorityContext.authority_run_id ?? `authority-${contextRun}`,
      revision: Number.isInteger(this.authorityContext.revision) && this.authorityContext.revision > 0
        ? this.authorityContext.revision : 1,
      phase_epoch: this.authorityContext.phase_epoch ?? 'phase-rag',
      connection_epoch: Number.isInteger(this.authorityContext.connection_epoch) && this.authorityContext.connection_epoch > 0
        ? this.authorityContext.connection_epoch : 1,
      message_type: 'operation.start', operation_id: operationId, nonce: randomUUID(),
      sent_at: new Date().toISOString(), payload: { operation_kind: operationKind, ...payload },
    };
    const unsigned = createAuthorityEnvelope(fields);
    const signature = this.sign ? await this.sign(unsigned) : this.signature;
    if (!signature || typeof signature !== 'object') remoteRagError('gateway_signature_unconfigured', 'remote gateway signature is not configured');
    try {
      return unwrapRemoteGatewayResult(await this.gateway.execute(createAuthorityEnvelope({ ...fields, signature })));
    } catch (error) {
      throw Object.assign(new Error(error?.message ?? 'remote RAG gateway request failed'), {
        code: error?.code ?? 'gateway_request_failed', details: error?.details ?? {},
      });
    }
  }

  #loadPersisted() {
    if (!existsSync(this.indexFile)) return;
    try {
      const persisted = JSON.parse(readFileSync(this.indexFile, 'utf8'));
      if (persisted?.schema_version !== REMOTE_INDEX_SCHEMA_VERSION
          || persisted.remote_root !== this.remoteRoot
          || !Array.isArray(persisted.records) || persisted.records.length > MAX_FILES) {
        throw new Error('index schema or remote workspace root does not match');
      }
      this.records = persisted.records.map((item) => {
        const path = remoteRelativePath(item?.relative_path);
        if (!path || typeof item?.content !== 'string') throw new Error('index contains an unsafe record');
        const digest = sha256(item.content);
        if (item.sha256 && item.sha256 !== digest) throw new Error(`index hash mismatch for ${path}`);
        const embedding = Array.isArray(item.embedding) ? normalizeVector(item.embedding, `embedding:${path}`) : null;
        return { relative_path: path, content: item.content, lower: item.content.toLocaleLowerCase(), sha256: digest, embedding };
      }).sort((left, right) => left.relative_path.localeCompare(right.relative_path));
      this.sourceManifest = Array.isArray(persisted.source_manifest) ? persisted.source_manifest : [];
      this.indexedAt = typeof persisted.indexed_at === 'string' ? persisted.indexed_at : null;
      this.revision = typeof persisted.revision === 'string' ? persisted.revision : null;
      this.sourceSignature = typeof persisted.source_signature === 'string' ? persisted.source_signature : null;
      this.listingSignature = typeof persisted.listing_signature === 'string' ? persisted.listing_signature : null;
      this.metrics = restoreRagMetrics(persisted.metrics);
      this.modelProfile = normalizeModelProfile({
        ...this.modelProfile,
        ...(persisted.model_profile && typeof persisted.model_profile === 'object' ? persisted.model_profile : {}),
      });
    } catch (error) {
      this.records = [];
      this.sourceManifest = [];
      this.indexedAt = null;
      this.revision = null;
      this.sourceSignature = null;
      this.listingSignature = null;
      this.loadError = `persisted remote index ignored: ${error.message}`;
    }
  }

  async #persist() {
    const payload = {
      schema_version: REMOTE_INDEX_SCHEMA_VERSION,
      remote_root: this.remoteRoot,
      indexed_at: this.indexedAt,
      revision: this.revision,
      source_signature: this.sourceSignature,
      listing_signature: this.listingSignature,
      source_manifest: this.sourceManifest,
      model_profile: this.modelProfile,
      source_policy: 'registered_remote_workspace_gateway',
      metrics: this.metrics,
      records: this.records.map(({ relative_path, content, sha256: digest, embedding }) => ({
        relative_path, content, sha256: digest, ...(Array.isArray(embedding) ? { embedding } : {}),
      })),
    };
    await mkdir(dirname(this.indexFile), { recursive: true, mode: 0o700 });
    const temporary = `${this.indexFile}.${process.pid}.${Date.now()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(payload)}\n`, { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.indexFile);
    } catch (error) {
      try { await unlink(temporary); } catch { /* best effort cleanup */ }
      throw error;
    }
  }
}

function isWithin(root, candidate) {
  const remainder = relative(root, candidate);
  return remainder === '' || (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !remainder.startsWith(sep));
}
