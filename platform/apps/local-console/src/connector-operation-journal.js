import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile, chmod } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

const SCHEMA_VERSION = 1;
const DEFAULT_MAX_ENTRIES = 2048;
const DEFAULT_MAX_RECORD_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_OUTPUT_BYTES = 512 * 1024;

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function fingerprint(value) {
  return createHash('sha256').update(stableStringify(value), 'utf8').digest('hex');
}

function journalError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function timestamp(clock) {
  const value = clock();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function diagnostic(error) {
  return {
    code: typeof error?.code === 'string' && error.code ? error.code : 'connector_agent_failed',
    message: error?.message ?? String(error),
    details: error?.details && typeof error.details === 'object' ? clone(error.details) : {},
  };
}

function boundedOutcome(outcome, maxOutputBytes) {
  const value = clone(outcome);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw journalError('connector_operation_not_durable', 'Connector operation result must be an object');
  }
  for (const key of ['stdout', 'stderr']) {
    if (typeof value[key] === 'string' && Buffer.byteLength(value[key], 'utf8') > maxOutputBytes) {
      const bytes = Buffer.from(value[key], 'utf8');
      value[key] = bytes.subarray(Math.max(0, bytes.length - maxOutputBytes)).toString('utf8');
      value[`${key}_truncated`] = true;
    }
  }
  return value;
}

/**
 * Small durable journal for Connector-side CodeAgent commands.
 *
 * The cloud request can time out or reconnect after a CLI has completed. The
 * operation id is the idempotency key; a completed result is replayed and a
 * changed payload is rejected. Records left in `running` state are converted
 * to `unknown` on the next process start so a new process never starts a
 * duplicate code change without an explicit reconciliation.
 */
export class ConnectorOperationJournal {
  constructor({
    filePath = null,
    clock = () => new Date(),
    maxEntries = DEFAULT_MAX_ENTRIES,
    maxRecordBytes = DEFAULT_MAX_RECORD_BYTES,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  } = {}) {
    if (filePath !== null && (typeof filePath !== 'string' || !isAbsolute(filePath))) {
      throw new TypeError('filePath must be an absolute path or null');
    }
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) throw new TypeError('maxEntries is invalid');
    if (!Number.isSafeInteger(maxRecordBytes) || maxRecordBytes < 1024) throw new TypeError('maxRecordBytes is invalid');
    if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 0) throw new TypeError('maxOutputBytes is invalid');
    this.filePath = filePath === null ? null : resolve(filePath);
    this.clock = clock;
    this.maxEntries = maxEntries;
    this.maxRecordBytes = maxRecordBytes;
    this.maxOutputBytes = maxOutputBytes;
    this.records = new Map();
    this.loaded = false;
    this.loading = null;
    this.writeChain = Promise.resolve();
  }

  async ready() {
    if (this.loaded) return this;
    if (!this.loading) this.loading = this.#load();
    await this.loading;
    return this;
  }

  async #load() {
    if (!this.filePath) {
      this.loaded = true;
      this.loading = null;
      return;
    }
    try {
      const text = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(text);
      if (!parsed || parsed.schema_version !== SCHEMA_VERSION || !Array.isArray(parsed.records)) {
        throw journalError('connector_operation_journal_corrupt', 'Connector operation journal schema is invalid');
      }
      for (const record of parsed.records) {
        if (!record || typeof record.operation_id !== 'string' || typeof record.input_sha256 !== 'string') continue;
        if (!['running', 'unknown', 'completed', 'failed'].includes(record.state)) continue;
        const normalized = {
          operation_id: record.operation_id,
          input_sha256: record.input_sha256,
          state: record.state === 'running' ? 'unknown' : record.state,
          created_at: record.created_at ?? timestamp(this.clock),
          updated_at: record.updated_at ?? record.created_at ?? timestamp(this.clock),
          ...(record.outcome !== undefined ? { outcome: clone(record.outcome) } : {}),
          ...(record.error !== undefined ? { error: clone(record.error) } : {}),
          ...(record.state === 'running' ? { unknown_reason: 'connector_process_restarted' } : {}),
        };
        this.records.set(record.operation_id, normalized);
      }
      this.#trim();
      if ([...this.records.values()].some((record) => record.unknown_reason === 'connector_process_restarted')) {
        await this.#flush();
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    } finally {
      this.loaded = true;
      this.loading = null;
    }
  }

  async reserve(operationId, input) {
    await this.ready();
    if (typeof operationId !== 'string' || operationId.trim() === '') throw new TypeError('operationId is required');
    const id = operationId.trim();
    const inputSha256 = fingerprint(input);
    const existing = this.records.get(id);
    if (existing) {
      if (existing.input_sha256 !== inputSha256) {
        throw journalError('connector_operation_replay_conflict', `operation ${id} was reused with different input`, {
          operation_id: id,
        });
      }
      return { created: false, record: clone(existing) };
    }
    const now = timestamp(this.clock);
    const record = { operation_id: id, input_sha256: inputSha256, state: 'running', created_at: now, updated_at: now };
    this.records.set(id, record);
    this.#trim();
    await this.#flush();
    return { created: true, record: clone(record) };
  }

  async complete(operationId, outcome) {
    await this.ready();
    const id = String(operationId);
    const record = this.records.get(id);
    if (!record) throw journalError('connector_operation_journal_missing', `operation ${id} was not reserved`);
    const normalizedOutcome = boundedOutcome(outcome, this.maxOutputBytes);
    const serialized = JSON.stringify(normalizedOutcome);
    if (Buffer.byteLength(serialized, 'utf8') > this.maxRecordBytes) {
      throw journalError('connector_operation_not_durable', `operation ${id} result exceeds the journal limit`);
    }
    record.state = 'completed';
    record.outcome = normalizedOutcome;
    delete record.error;
    delete record.unknown_reason;
    record.updated_at = timestamp(this.clock);
    await this.#flush();
    return clone(record);
  }

  async get(operationId) {
    await this.ready();
    return clone(this.records.get(String(operationId)) ?? null);
  }

  async fail(operationId, error) {
    await this.ready();
    const id = String(operationId);
    const record = this.records.get(id);
    if (!record) throw journalError('connector_operation_journal_missing', `operation ${id} was not reserved`);
    record.state = 'failed';
    record.error = diagnostic(error);
    delete record.outcome;
    delete record.unknown_reason;
    record.updated_at = timestamp(this.clock);
    await this.#flush();
    return clone(record);
  }

  snapshot() {
    return [...this.records.values()].map((record) => clone(record));
  }

  summary() {
    return [...this.records.values()].map((record) => ({
      operation_id: record.operation_id,
      state: record.state,
      created_at: record.created_at,
      updated_at: record.updated_at,
      ...(record.unknown_reason ? { unknown_reason: record.unknown_reason } : {}),
      ...(record.error ? { error: { code: record.error.code, message: record.error.message } } : {}),
      ...(record.outcome ? {
        status: record.outcome.status ?? null,
        artifact_refs: Array.isArray(record.outcome.artifact_refs) ? [...record.outcome.artifact_refs] : [],
      } : {}),
    }));
  }

  #trim() {
    while (this.records.size > this.maxEntries) {
      const removable = [...this.records.values()]
        .filter((record) => record.state !== 'running')
        .sort((left, right) => String(left.updated_at).localeCompare(String(right.updated_at)))[0];
      if (!removable) break;
      this.records.delete(removable.operation_id);
    }
  }

  async #flush() {
    if (!this.filePath) return;
    this.writeChain = this.writeChain.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
      const records = [...this.records.values()].map((record) => clone(record));
      const serialized = `${JSON.stringify({ schema_version: SCHEMA_VERSION, records }, null, 2)}\n`;
      if (Buffer.byteLength(serialized, 'utf8') > this.maxRecordBytes) {
        throw journalError('connector_operation_not_durable', 'Connector operation journal exceeds the configured limit');
      }
      const temporary = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temporary, serialized, { encoding: 'utf8', mode: 0o600 });
      await chmod(temporary, 0o600).catch(() => {});
      await rename(temporary, this.filePath);
    });
    return this.writeChain;
  }
}

export { fingerprint as connectorOperationFingerprint };
