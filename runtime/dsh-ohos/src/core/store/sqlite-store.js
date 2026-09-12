import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ProtocolError } from '../errors.js';
import { parseJson } from '../validation.js';

export class SqliteStore {
  constructor(databasePath = ':memory:') {
    if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec('PRAGMA busy_timeout = 5000');
    this.db.exec('PRAGMA journal_mode = WAL');
    this.migrate();
  }

  close() {
    this.db.close();
  }

  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_meta (
        version INTEGER NOT NULL
      );
      INSERT INTO schema_meta(version)
        SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_meta);

      CREATE TABLE IF NOT EXISTS host_bindings (
        id TEXT PRIMARY KEY,
        host_kind TEXT NOT NULL,
        host_version TEXT,
        execution_mode TEXT NOT NULL CHECK (execution_mode IN ('host_native', 'external')),
        capabilities_json TEXT NOT NULL,
        capability_source TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        workflow TEXT NOT NULL CHECK (workflow IN ('requirement', 'delivery')),
        revision INTEGER NOT NULL,
        status TEXT NOT NULL,
        input_ref TEXT NOT NULL,
        docs_root TEXT,
        environment_profile TEXT,
        pipeline_dir TEXT,
        workspace_root TEXT,
        device_ref TEXT,
        agent TEXT,
        input_digest TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id),
        phase TEXT NOT NULL,
        role TEXT NOT NULL,
        revision INTEGER NOT NULL,
        status TEXT NOT NULL,
        input_digest TEXT NOT NULL,
        context_ref TEXT NOT NULL,
        workspace_ref TEXT,
        output_ref TEXT NOT NULL,
        policy_ref TEXT NOT NULL,
        required_capabilities_json TEXT NOT NULL,
        attempt_seq INTEGER NOT NULL DEFAULT 0,
        lease_epoch INTEGER NOT NULL DEFAULT 0,
        lease_until TEXT,
        cancel_requested INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id),
        attempt_no INTEGER NOT NULL,
        host_binding_id TEXT NOT NULL REFERENCES host_bindings(id),
        execution_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        lease_epoch INTEGER NOT NULL,
        lease_until TEXT NOT NULL,
        artifact_refs_json TEXT,
        summary TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(task_id, attempt_no)
      );

      CREATE TABLE IF NOT EXISTS operations (
        principal TEXT NOT NULL,
        kind TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        payload_digest TEXT NOT NULL,
        result_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(principal, kind, idempotency_key)
      );

      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_claim
        ON tasks(run_id, role, status, created_at);
      CREATE INDEX IF NOT EXISTS idx_attempts_task
        ON attempts(task_id, attempt_no);
      CREATE INDEX IF NOT EXISTS idx_events_run
        ON events(run_id, seq);

    `);
    const runColumns = new Set(this.db.prepare('PRAGMA table_info(runs)').all()
      .map((column) => column.name));
    if (!runColumns.has('pipeline_dir')) {
      this.db.exec('ALTER TABLE runs ADD COLUMN pipeline_dir TEXT');
    }
    if (!runColumns.has('workspace_root')) {
      this.db.exec('ALTER TABLE runs ADD COLUMN workspace_root TEXT');
    }
    if (!runColumns.has('device_ref')) {
      this.db.exec('ALTER TABLE runs ADD COLUMN device_ref TEXT');
    }
    if (!runColumns.has('agent')) {
      this.db.exec('ALTER TABLE runs ADD COLUMN agent TEXT');
    }
    const attemptColumns = new Set(this.db.prepare('PRAGMA table_info(attempts)').all().map((column) => column.name));
    if (!attemptColumns.has('context_id')) this.db.exec('ALTER TABLE attempts ADD COLUMN context_id TEXT');
    this.db.exec('UPDATE schema_meta SET version = 6 WHERE version < 6');
  }

  getOperation(principal, kind, key, payloadDigest) {
    const row = this.db.prepare(`
      SELECT payload_digest, result_json FROM operations
      WHERE principal = ? AND kind = ? AND idempotency_key = ?
    `).get(principal, kind, key);
    if (!row) return null;
    if (row.payload_digest !== payloadDigest) {
      throw new ProtocolError('idempotency_conflict',
        'The idempotency key was already used with different input.');
    }
    return parseJson(row.result_json, 'operations.result_json');
  }

  saveOperation(principal, kind, key, payloadDigest, result, now) {
    this.db.prepare(`
      INSERT INTO operations(principal, kind, idempotency_key, payload_digest, result_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(principal, kind, key, payloadDigest, JSON.stringify(result), now);
  }

  event(runId, type, payload, now) {
    const result = this.db.prepare(`
      INSERT INTO events(run_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)
    `).run(runId, type, JSON.stringify(payload), now);
    return Number(result.lastInsertRowid);
  }
}
