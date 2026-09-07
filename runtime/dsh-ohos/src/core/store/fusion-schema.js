// Additive schema: the v0.3 workflow tables and their existing rows stay intact.
export function migrateFusion(store) {
  store.db.exec(`
    CREATE TABLE IF NOT EXISTS policy_versions (
      id TEXT PRIMARY KEY, body_json TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS run_policy_bindings (
      run_id TEXT PRIMARY KEY REFERENCES runs(id), policy_id TEXT NOT NULL REFERENCES policy_versions(id),
      mode TEXT NOT NULL DEFAULT 'observe', routing_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS repair_episodes (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), task_id TEXT NOT NULL,
      status TEXT NOT NULL, failure_key TEXT NOT NULL, input_digest TEXT NOT NULL,
      plan_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS budget_ledger (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), episode_id TEXT,
      kind TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('reserved','consumed','released')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_budget_run ON budget_ledger(run_id, episode_id, kind, state);
    UPDATE schema_meta SET version=6 WHERE version < 6;
  `);
}
