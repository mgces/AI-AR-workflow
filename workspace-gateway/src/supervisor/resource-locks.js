import { randomUUID } from 'node:crypto';

const DEFAULT_OWNER_NAMESPACE = 'workspace-gateway';
const MAX_KEY_LENGTH = 4096;
const MAX_ID_LENGTH = 256;
const MAX_METADATA_BYTES = 16 * 1024;

function lockError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function text(value, field, max = MAX_ID_LENGTH) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max || /[\0\r\n]/u.test(value)) {
    throw lockError('resource_lock_input_invalid', `${field} must be a bounded non-empty string`, { field, max });
  }
  return value.trim();
}

function metadata(value) {
  if (value === undefined || value === null) return '{}';
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw lockError('resource_lock_metadata_invalid', 'resource lock metadata must be an object');
  }
  let serialized;
  try { serialized = JSON.stringify(value); } catch { throw lockError('resource_lock_metadata_invalid', 'resource lock metadata must be JSON serializable'); }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_METADATA_BYTES) {
    throw lockError('resource_lock_metadata_too_large', 'resource lock metadata exceeds the configured limit');
  }
  return serialized;
}

function rowValue(row) {
  if (!row) return null;
  let parsed = {};
  if (typeof row.metadata_json === 'string') {
    try { parsed = JSON.parse(row.metadata_json || '{}'); } catch { /* corrupted metadata is not trusted */ }
  } else if (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)) {
    parsed = structuredClone(row.metadata);
  }
  return {
    resource_key: row.resource_key,
    owner_namespace: row.owner_namespace,
    owner_run_id: row.owner_run_id,
    owner_attempt_id: row.owner_attempt_id,
    token: row.token,
    acquired_at: row.acquired_at,
    updated_at: row.updated_at,
    metadata: parsed,
  };
}

function nowIso(clock) {
  const value = clock();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError('clock must return a valid Date');
  return value.toISOString();
}

/**
 * A fail-closed, durable resource lock shared by scheduler/API operations.
 * SQLite transactions make acquisition atomic across processes. A memory map
 * is available for injected test services, but callers can inspect `durable`
 * and should not treat it as a production lock.
 */
export class DurableResourceLockStore {
  constructor({ db = null, ownerNamespace = DEFAULT_OWNER_NAMESPACE, clock = () => new Date() } = {}) {
    if (db !== null && (!db || typeof db.prepare !== 'function' || typeof db.exec !== 'function')) {
      throw new TypeError('db must expose prepare and exec');
    }
    this.db = db;
    this.ownerNamespace = text(ownerNamespace, 'ownerNamespace');
    this.clock = clock;
    this.memory = new Map();
    if (this.db) {
      // Multiple gateway/scheduler processes may share this file. A bounded
      // busy timeout lets the short BEGIN IMMEDIATE transaction wait instead
      // of failing spuriously while another process updates a lease.
      try { this.db.exec('PRAGMA busy_timeout = 5000'); } catch { /* injected test DBs may not support pragmas */ }
      this.#ensureSchema();
    }
  }

  get durable() { return this.db !== null; }

  async acquire({ resourceKey, runId, attemptId, token = null, metadata: details = {} } = {}) {
    const key = text(resourceKey, 'resourceKey', MAX_KEY_LENGTH);
    const ownerRun = text(runId, 'runId');
    const ownerAttempt = text(attemptId, 'attemptId');
    const providedToken = token === null || token === undefined ? null : text(token, 'token');
    const metadataJson = metadata(details);
    const timestamp = nowIso(this.clock);
    let row;
    if (this.db) {
      this.#begin();
      try {
        row = this.db.prepare('SELECT * FROM resource_locks WHERE resource_key = ?').get(key);
        if (row && (row.owner_run_id !== ownerRun || row.owner_attempt_id !== ownerAttempt
            || row.owner_namespace !== this.ownerNamespace)) {
          throw lockError('resource_busy', `resource ${key} is already locked`, {
            resource_key: key,
            owner_namespace: row.owner_namespace,
            owner_run_id: row.owner_run_id,
            owner_attempt_id: row.owner_attempt_id,
            acquired_at: row.acquired_at,
            updated_at: row.updated_at,
          });
        }
        const lockToken = row?.token ?? providedToken ?? randomUUID();
        if (row && providedToken !== null && row.token !== providedToken) {
          throw lockError('resource_lock_owner_mismatch', `resource ${key} lock token does not match`);
        }
        this.db.prepare(`
          INSERT INTO resource_locks(resource_key, owner_namespace, owner_run_id, owner_attempt_id, token, acquired_at, updated_at, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(resource_key) DO UPDATE SET
            owner_namespace = excluded.owner_namespace,
            owner_run_id = excluded.owner_run_id,
            owner_attempt_id = excluded.owner_attempt_id,
            token = excluded.token,
            updated_at = excluded.updated_at,
            metadata_json = excluded.metadata_json
        `).run(key, this.ownerNamespace, ownerRun, ownerAttempt, lockToken, row?.acquired_at ?? timestamp, timestamp, metadataJson);
        this.#commit();
        row = {
          resource_key: key, owner_namespace: this.ownerNamespace, owner_run_id: ownerRun,
          owner_attempt_id: ownerAttempt, token: lockToken, acquired_at: row?.acquired_at ?? timestamp,
          updated_at: timestamp, metadata_json: metadataJson,
        };
      } catch (error) {
        this.#rollback();
        throw error;
      }
    } else {
      row = this.memory.get(key);
      if (row && (row.owner_run_id !== ownerRun || row.owner_attempt_id !== ownerAttempt
          || row.owner_namespace !== this.ownerNamespace)) {
        throw lockError('resource_busy', `resource ${key} is already locked`, {
          resource_key: key, owner_namespace: row.owner_namespace,
          owner_run_id: row.owner_run_id, owner_attempt_id: row.owner_attempt_id,
          acquired_at: row.acquired_at, updated_at: row.updated_at,
        });
      }
      if (row && providedToken !== null && row.token !== providedToken) {
        throw lockError('resource_lock_owner_mismatch', `resource ${key} lock token does not match`);
      }
      row = {
        resource_key: key, owner_namespace: this.ownerNamespace, owner_run_id: ownerRun,
        owner_attempt_id: ownerAttempt, token: row?.token ?? providedToken ?? randomUUID(),
        acquired_at: row?.acquired_at ?? timestamp, updated_at: timestamp, metadata: details,
      };
      this.memory.set(key, row);
    }
    const value = rowValue(row) ?? row;
    let released = false;
    return {
      ...value,
      renew: async (nextMetadata = details) => {
        if (released) throw lockError('resource_lock_released', 'resource lock has already been released');
        return this.#renew(value, nextMetadata);
      },
      release: async () => {
        if (released) return { released: false, resource_key: key };
        released = true;
        return this.release(value);
      },
    };
  }

  async renew(lock, details = {}) {
    return this.#renew(lock, details);
  }

  async #renew(lock, details = {}) {
    const key = text(lock?.resource_key, 'resourceKey', MAX_KEY_LENGTH);
    const token = text(lock?.token, 'token');
    const timestamp = nowIso(this.clock);
    const metadataJson = metadata(details);
    if (this.db) {
      this.#begin();
      try {
        const row = this.db.prepare('SELECT * FROM resource_locks WHERE resource_key = ?').get(key);
        this.#assertOwner(row, lock, key);
        this.db.prepare('UPDATE resource_locks SET updated_at = ?, metadata_json = ? WHERE resource_key = ?').run(timestamp, metadataJson, key);
        this.#commit();
        return { ...rowValue({ ...row, updated_at: timestamp, metadata_json: metadataJson }), renewed: true };
      } catch (error) {
        this.#rollback();
        throw error;
      }
    }
    const row = this.memory.get(key);
    this.#assertOwner(row, lock, key);
    row.updated_at = timestamp;
    row.metadata = details;
    return { ...row, renewed: true };
  }

  async release(lock) {
    const key = text(lock?.resource_key, 'resourceKey', MAX_KEY_LENGTH);
    const token = text(lock?.token, 'token');
    if (this.db) {
      this.#begin();
      try {
        const row = this.db.prepare('SELECT * FROM resource_locks WHERE resource_key = ?').get(key);
        this.#assertOwner(row, lock, key);
        this.db.prepare('DELETE FROM resource_locks WHERE resource_key = ?').run(key);
        this.#commit();
        return { released: true, resource_key: key, token };
      } catch (error) {
        this.#rollback();
        throw error;
      }
    }
    const row = this.memory.get(key);
    this.#assertOwner(row, lock, key);
    this.memory.delete(key);
    return { released: true, resource_key: key, token };
  }

  /**
   * Remove leases left by a run after the authoritative runtime has confirmed
   * that no attempt is active. The namespace filter prevents a scheduler from
   * touching Gateway-owned leases in a shared SQLite database.
   */
  async releaseForRun(runId) {
    const ownerRun = text(runId, 'runId');
    if (this.db) {
      this.#begin();
      try {
        const result = this.db.prepare(
          'DELETE FROM resource_locks WHERE owner_namespace = ? AND owner_run_id = ?',
        ).run(this.ownerNamespace, ownerRun);
        this.#commit();
        return { released: Number(result.changes ?? 0), run_id: ownerRun, owner_namespace: this.ownerNamespace };
      } catch (error) {
        this.#rollback();
        throw error;
      }
    }
    let released = 0;
    for (const [key, row] of this.memory.entries()) {
      if (row.owner_namespace === this.ownerNamespace && row.owner_run_id === ownerRun) {
        this.memory.delete(key);
        released += 1;
      }
    }
    return { released, run_id: ownerRun, owner_namespace: this.ownerNamespace };
  }

  async list() {
    if (this.db) {
      return this.db.prepare(
        'SELECT * FROM resource_locks WHERE owner_namespace = ? ORDER BY resource_key',
      ).all(this.ownerNamespace).map(rowValue);
    }
    return [...this.memory.values()].sort((left, right) => left.resource_key.localeCompare(right.resource_key)).map((row) => ({ ...row }));
  }

  #assertOwner(row, lock, key) {
    if (!row) throw lockError('resource_lock_not_found', `resource ${key} is not locked`, { resource_key: key });
    if (row.owner_namespace !== this.ownerNamespace || row.owner_run_id !== lock?.owner_run_id
        || row.owner_attempt_id !== lock?.owner_attempt_id || row.token !== lock?.token) {
      throw lockError('resource_lock_owner_mismatch', `resource ${key} lock owner does not match`, {
        resource_key: key, owner_run_id: row.owner_run_id, owner_attempt_id: row.owner_attempt_id,
      });
    }
  }

  #ensureSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resource_locks (
        resource_key TEXT PRIMARY KEY,
        owner_namespace TEXT NOT NULL,
        owner_run_id TEXT NOT NULL,
        owner_attempt_id TEXT NOT NULL,
        token TEXT NOT NULL,
        acquired_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata_json TEXT NOT NULL
      )
    `);
  }

  #begin() { this.db.exec('BEGIN IMMEDIATE'); }
  #commit() { this.db.exec('COMMIT'); }
  #rollback() { try { this.db.exec('ROLLBACK'); } catch { /* transaction may already be closed */ } }
}

export { MAX_KEY_LENGTH, MAX_METADATA_BYTES };
