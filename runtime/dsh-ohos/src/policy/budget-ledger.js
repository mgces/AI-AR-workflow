import { digest, expectId } from '../core/validation.js';
import { invariant } from '../core/errors.js';

// Internal execution primitive, deliberately not a worker-callable MCP tool.
// Planning and validation errors must not spend execution budget. A future job
// launcher must reserve BEFORE spawn and consume once launch may have occurred.
export class BudgetLedger {
  constructor({ store, policy, clock = () => new Date() }) {
    Object.assign(this, { store, policy, clock });
  }

  usage(runId) {
    const binding = this.policy.binding(runId);
    const limits = this.policy.read(binding.policy_id).limits;
    const usage = {};
    for (const kind of ['episodes', 'retries', 'patches', 'jobs']) {
      const spent = this.store.db.prepare(`SELECT COUNT(*) AS count FROM budget_ledger
        WHERE run_id=? AND kind=? AND state IN ('reserved','consumed')`).get(runId, kind).count;
      usage[kind] = { limit: limits[kind], used: spent, remaining: Math.max(0, limits[kind] - spent) };
    }
    return usage;
  }

  reserve({ run_id: runId, episode_id: episodeId = null, kind, idempotency_key: key }) {
    expectId(runId, 'run_id');
    expectId(key, 'idempotency_key');
    if (episodeId !== null) expectId(episodeId, 'episode_id');
    invariant(['episodes', 'retries', 'patches', 'jobs'].includes(kind), 'invalid_input', 'Unknown budget kind.');
    const reservation = digest({ runId, key });
    return this.store.transaction(() => {
      const previous = this.store.db.prepare('SELECT * FROM budget_ledger WHERE id=?').get(reservation);
      if (previous) {
        invariant(previous.kind === kind && previous.episode_id === episodeId,
          'idempotency_conflict', 'Reservation key already has different input.');
        return previous;
      }
      const usage = this.usage(runId)[kind];
      invariant(usage.remaining > 0, 'budget_exhausted', `${kind} budget exhausted for ${runId}.`, usage);
      if (episodeId !== null) {
        invariant(this.store.db.prepare('SELECT id FROM repair_episodes WHERE id=? AND run_id=?')
          .get(episodeId, runId), 'episode_not_found', 'Episode must belong to this run.');
      }
      this.store.db.prepare('INSERT INTO budget_ledger VALUES (?,?,?,?,?,?)')
        .run(reservation, runId, episodeId, kind, 'reserved', this.clock().toISOString());
      return this.store.db.prepare('SELECT * FROM budget_ledger WHERE id=?').get(reservation);
    });
  }

  settle(id, state) {
    expectId(id, 'reservation_id');
    invariant(['consumed', 'released'].includes(state), 'invalid_input', 'Invalid budget settlement.');
    return this.store.transaction(() => {
      const row = this.store.db.prepare('SELECT * FROM budget_ledger WHERE id=?').get(id);
      invariant(row, 'reservation_not_found', 'Unknown reservation.');
      invariant(row.state === 'reserved' || row.state === state, 'reservation_settled',
        'Consumed budget cannot be refunded, and released reservations cannot launch work.');
      this.store.db.prepare('UPDATE budget_ledger SET state=? WHERE id=?').run(state, id);
      return { ...row, state };
    });
  }
}
