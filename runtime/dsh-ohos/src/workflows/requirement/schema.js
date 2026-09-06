// Domain tables are owned by the requirement workflow. Existing v5 data is preserved.
export function migrateRequirementStore(store) {
  store.db.exec(`
      CREATE TABLE IF NOT EXISTS requirement_runs (
        run_id TEXT PRIMARY KEY REFERENCES runs(id),
        skills_root TEXT NOT NULL,
        source_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS requirement_receipts (
        run_id TEXT NOT NULL REFERENCES runs(id), phase TEXT NOT NULL, revision INTEGER NOT NULL,
        status TEXT NOT NULL, receipt_json TEXT NOT NULL, active INTEGER NOT NULL,
        PRIMARY KEY(run_id, phase, revision)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_requirement_receipt_active
        ON requirement_receipts(run_id, phase) WHERE active = 1;
      CREATE TABLE IF NOT EXISTS requirement_decisions (
        run_id TEXT NOT NULL REFERENCES runs(id), phase TEXT NOT NULL, revision INTEGER NOT NULL,
        data_json TEXT NOT NULL, source_json TEXT NOT NULL, active INTEGER NOT NULL,
        PRIMARY KEY(run_id, phase, revision)
      );
  `);
}
