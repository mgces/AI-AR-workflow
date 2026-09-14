import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.hxx',
  '.gn', '.gni', '.json', '.md', '.py', '.sh', '.ts', '.tsx',
  '.js', '.mjs', '.cjs', '.ets', '.idl', '.xml', '.yaml', '.yml',
]);
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'out', 'dist', 'build', '__pycache__']);
const MAX_FILES = 4000;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_RESULTS = 20;

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
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
    const extension = entry.name.includes('.') ? `.${entry.name.split('.').pop().toLowerCase()}` : '';
    if (TEXT_EXTENSIONS.has(extension)) result.push(path);
  }
  return result;
}

function snippet(content, queryTokens) {
  const lines = content.split(/\r?\n/);
  const lineIndex = lines.findIndex((line) => queryTokens.some((token) => line.toLocaleLowerCase().includes(token)));
  const index = lineIndex >= 0 ? lineIndex : 0;
  return { line: index + 1, text: lines[index]?.slice(0, 600) ?? '' };
}

export class LocalRagIndex {
  constructor({ root }) {
    this.root = resolve(root);
    this.records = [];
    this.indexedAt = null;
    this.revision = null;
    this.lastError = null;
    this.building = null;
  }

  status() {
    if (this.lastError) {
      return { state: 'error', mode: 'local_lexical', root: this.root, reason: this.lastError };
    }
    if (!this.indexedAt) return { state: 'not_indexed', mode: 'local_lexical', root: this.root };
    return {
      state: 'ready',
      mode: 'local_lexical',
      root: this.root,
      file_count: this.records.length,
      indexed_at: this.indexedAt,
      revision: this.revision,
      embedding_model: null,
      reranker_model: null,
      source_policy: 'local_workspace_only',
    };
  }

  async refresh() {
    if (this.building) return this.building;
    this.building = (async () => {
      try {
        const files = await collectFiles(this.root);
        const records = [];
        for (const path of files) {
          const content = await readFile(path, 'utf8');
          if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) continue;
          const relativePath = relative(this.root, path).split('\\').join('/');
          records.push({
            relative_path: relativePath,
            content,
            lower: content.toLocaleLowerCase(),
            sha256: sha256(content),
          });
        }
        this.records = records;
        this.indexedAt = new Date().toISOString();
        this.revision = sha256(records.map((record) => `${record.relative_path}:${record.sha256}`).join('\n'));
        this.lastError = null;
        return this.status();
      } catch (error) {
        this.lastError = error.message;
        throw Object.assign(new Error(`RAG index failed: ${error.message}`), { code: 'rag_index_failed' });
      } finally {
        this.building = null;
      }
    })();
    return this.building;
  }

  async search(query) {
    if (typeof query !== 'string' || query.trim() === '') {
      throw Object.assign(new Error('query is required'), { code: 'rag_query_required' });
    }
    if (query.length > 256) {
      throw Object.assign(new Error('query is too long'), { code: 'rag_query_too_long' });
    }
    if (!this.indexedAt) await this.refresh();
    const queryTokens = tokens(query);
    const results = this.records.map((record) => {
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
        source_revision: this.revision,
        stale_check: 'revalidate_against_workspace_before_use',
      };
    }).filter(Boolean).sort((left, right) => right.score - left.score || left.relative_path.localeCompare(right.relative_path));
    return { status: 'ready', query, revision: this.revision, results: results.slice(0, MAX_RESULTS) };
  }
}
