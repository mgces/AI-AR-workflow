import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PACKAGE_ROOT, REPOSITORY_ROOT } from '../core/paths.js';
import { invariant } from '../core/errors.js';
import { digest, expectId, expectObject, expectStringArray } from '../core/validation.js';
import { migrateFusion } from '../core/store/fusion-schema.js';
import { ModuleRegistry } from './module-registry.js';

export class PolicyRegistry {
  constructor({ store, skillsRoot = resolve(REPOSITORY_ROOT, 'skills'), modules,
    clock = () => new Date() }) {
    Object.assign(this, { store, skillsRoot, clock });
    migrateFusion(store);
    const raw = modules ?? JSON.parse(readFileSync(resolve(PACKAGE_ROOT, 'policies/modules.json'))).modules;
    const registry = new ModuleRegistry({ skillsRoot, modules: raw });
    const strategies = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, 'policies/repair-strategies.json'))).strategies;
    this.baseline = this.save({ schema_version: 1, modules: registry.snapshot(), strategies, priorities: {},
      limits: { retries: 2, patches: 2, episodes: 3, jobs: 12, context_chars: 150_000 } });
    // Pin pre-upgrade runs once, before any context reads or dispatches. Never
    // silently replace their pinned version when this service restarts.
    store.transaction(() => {
      for (const row of store.db.prepare('SELECT id FROM runs').all()) this.bind(row.id);
    });
  }

  save(body) {
    const id = digest(body);
    this.store.db.prepare('INSERT OR IGNORE INTO policy_versions VALUES (?, ?, ?)')
      .run(id, JSON.stringify(body), this.clock().toISOString());
    return id;
  }

  read(id) {
    const row = this.store.db.prepare('SELECT body_json FROM policy_versions WHERE id = ?').get(id);
    invariant(row, 'policy_missing', `No policy ${id}`);
    const body = JSON.parse(row.body_json);
    invariant(digest(body) === id, 'policy_changed', 'Immutable policy hash mismatch.');
    return body;
  }

  bind(runId) {
    const existing = this.store.db.prepare('SELECT * FROM run_policy_bindings WHERE run_id = ?').get(runId);
    if (existing) return existing;
    const run = this.store.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
    invariant(run, 'run_not_found', `Unknown run ${runId}`);
    // Release assignment remains disabled until a trusted evaluator and rollout
    // admission policy exist. Database rows alone cannot enable a candidate.
    this.store.db.prepare('INSERT INTO run_policy_bindings(run_id,policy_id) VALUES (?,?)')
      .run(runId, this.baseline);
    return this.binding(runId);
  }

  binding(runId) {
    const row = this.store.db.prepare('SELECT * FROM run_policy_bindings WHERE run_id=?').get(runId);
    invariant(row, 'policy_binding_missing', `No pinned policy for ${runId}.`);
    invariant(row.mode === 'observe', 'managed_unavailable', 'Managed execution is not implemented in this release.');
    return row;
  }

  configure(raw, principal = 'parent') {
    const args = expectObject(raw);
    expectId(args.run_id, 'run_id');
    const key = expectId(args.idempotency_key, 'idempotency_key');
    invariant(args.mode === 'observe', 'managed_unavailable',
      'Only observe mode is available until supervised jobs, CLI locks and patch validation are implemented.');
    const tags = expectStringArray(args.task_tags ?? [], 'task_tags');
    const byPhase = expectObject(args.capabilities_by_phase ?? {}, 'capabilities_by_phase');
    const capabilitiesByPhase = {};
    for (const [phase, needs] of Object.entries(byPhase)) {
      invariant(/^(R[1-9]|P[0-8])$/.test(phase), 'invalid_input', `Invalid routing phase: ${phase}`);
      capabilitiesByPhase[phase] = expectStringArray(needs, `capabilities_by_phase.${phase}`);
    }
    const payloadDigest = digest({ run_id: args.run_id, tags, capabilitiesByPhase, mode: args.mode });
    return this.store.transaction(() => {
      const previous = this.store.getOperation(principal, 'configure_policy', key, payloadDigest);
      if (previous) return previous;
      const binding = this.bind(args.run_id);
      invariant(!this.store.db.prepare('SELECT id FROM attempts WHERE task_id IN (SELECT id FROM tasks WHERE run_id=?) LIMIT 1')
        .get(args.run_id), 'run_already_started', 'Configure routing/mode before the first claim.');
      const workflow = this.store.db.prepare('SELECT workflow FROM runs WHERE id=?').get(args.run_id).workflow;
      const policy = this.read(binding.policy_id);
      const registry = new ModuleRegistry({ skillsRoot: this.skillsRoot, modules: policy.modules });
      for (const [phase, needs] of Object.entries(capabilitiesByPhase)) {
        invariant(phase.startsWith(workflow === 'delivery' ? 'P' : 'R'), 'invalid_input',
          `Phase ${phase} does not belong to ${workflow}.`);
        registry.resolve({ workflow, phase, taskTags: tags, capabilities: needs,
          priorities: policy.priorities, contextBudgetChars: policy.limits.context_chars });
      }
      const routing = { taskTags: tags, capabilitiesByPhase };
      this.store.db.prepare('UPDATE run_policy_bindings SET mode=?, routing_json=? WHERE run_id=?')
        .run(args.mode, JSON.stringify(routing), args.run_id);
      const result = { run_id: args.run_id, policy_id: binding.policy_id, mode: args.mode, routing };
      const now = this.clock().toISOString();
      this.store.saveOperation(principal, 'configure_policy', key, payloadDigest, result, now);
      this.store.event(args.run_id, 'policy.configured', result, now);
      return result;
    });
  }

  context(row, failureClass) {
    const binding = this.binding(row.run_id);
    const policy = this.read(binding.policy_id);
    const routing = JSON.parse(binding.routing_json);
    return { policy_id: binding.policy_id, mode: binding.mode,
      ...new ModuleRegistry({ skillsRoot: this.skillsRoot, modules: policy.modules }).resolve({
        workflow: row.workflow, phase: row.phase, failureClass, taskTags: routing.taskTags,
        capabilities: routing.capabilitiesByPhase?.[row.phase.split('-')[0]] ?? [],
        priorities: policy.priorities, contextBudgetChars: policy.limits.context_chars,
      }) };
  }
}
