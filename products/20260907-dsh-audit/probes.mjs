import { OhosController, SqliteStore, TaskCredentials } from '../../runtime/dsh-ohos/src/index.js';
import { createRuntime } from '../../runtime/dsh-ohos/src/runtime.js';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Read-only audit of production sources; all state below is synthetic/temporary.
const results = {};
const root = fileURLToPath(new URL('../../', import.meta.url));
function fixture(adapter) {
  const store = new SqliteStore();
  const controller = new OhosController({ store, credentials: new TaskCredentials(Buffer.alloc(32, 9)), deliveryAdapter: adapter });
  controller.registerHost({ binding_id: 'audit-host', host_kind: 'codex',
    capabilities: { mcp_tools: true, native_subagent: true, workspace_write: true, build_execution: true },
    capability_source: 'synthetic-audit', idempotency_key: 'host' });
  const run = controller.startRun({ workflow: 'delivery', run_id: 'audit-run', input_ref: 'AR',
    pipeline_dir: '/tmp/audit-synthetic-pipeline', workspace_root: '/tmp/audit-synthetic-source',
    initial_phase: 'P4', idempotency_key: 'start' });
  const claim = () => controller.claimTask({ run_id: run.run_id, role: 'build-runner',
    expected_revision: 1, host_binding_id: 'audit-host', idempotency_key: 'claim' });
  return { store, controller, run, claim };
}
const state = (phase = 4, gate = false) => ({ pipeline_run_id: 'audit-run',
  pipeline_dir: '/tmp/audit-synthetic-pipeline', repo_root: '/tmp/audit-synthetic-source',
  current_phase: phase, complete: false, gate: { ok: gate } });

{
  let unblock, entered;
  const inspected = new Promise(resolve => { entered = resolve; });
  const wait = new Promise(resolve => { unblock = resolve; });
  let advances = 0;
  const f = fixture({ async inspect() { entered(); await wait; return state(4, true); },
    async advance() { advances++; return state(5); } });
  try {
    const syncing = f.controller.syncDelivery({ run_id: f.run.run_id, idempotency_key: 'sync' });
    await inspected;
    const owner = f.claim();
    unblock();
    const synced = await syncing;
    results.sync_claim_race = { claimed_during_sync: owner.status,
      sync_next_phase: synced.next?.phase, advances,
      owner_status_after_sync: f.store.db.prepare('SELECT status FROM attempts WHERE id=?').get(owner.attempt_id).status };
  } finally { f.store.close(); }
}
{
  let advances = 0;
  const f = fixture({ async initialize() { return state(4, true); },
    async advance() { advances++; return state(5); } });
  try {
    f.claim();
    const result = await f.controller.startDelivery({ input_ref: 'AR', pipeline_dir: '/tmp/audit-synthetic-pipeline',
      idempotency_key: 'reattach' });
    results.attach_live_writer = { result: result.status, advances_before_owner_stopped: advances };
  } finally { f.store.close(); }
}
{
  const store = new SqliteStore();
  const controller = new OhosController({ store, credentials: new TaskCredentials(Buffer.alloc(32, 9)),
    deliveryAdapter: { async initialize(args) { return { ...state(0), pipeline_run_id: args.run_id }; } } });
  try {
    const args = { input_ref: 'AR', repo_root: '/tmp/audit-synthetic-source', idempotency_key: 'same-key' };
    const first = await controller.startDelivery({ ...args, run_id: 'first' });
    const second = await controller.startDelivery({ ...args, run_id: 'second' });
    results.changed_run_id_same_key = { first: first.run_id, requested_second: 'second', returned_second: second.run_id };
  } finally { store.close(); }
}
{
  const f = fixture();
  try {
    results.routing = [];
    for (const phase of [...Array.from({ length: 9 }, (_, i) => `P${i}`),
      ...Array.from({ length: 9 }, (_, i) => `R${i + 1}`), 'P8-precheck', 'P8-publish', 'R7-plan']) {
      const route = f.controller.policy.context({ run_id: f.run.run_id, workflow: phase.startsWith('P') ? 'delivery' : 'requirement', phase });
      results.routing.push({ phase, modules: route.modules.length, estimated_chars: route.estimated_chars });
    }
  } finally { f.store.close(); }
}
{
  results.stdio = [];
  for (const node of ['/usr/bin/node', process.execPath]) {
    const data = mkdtempSync(join(tmpdir(), 'dsh-audit-stdio-'));
    try {
      const output = execFileSync(node, [join(root, 'runtime/dsh-ohos/src/mcp/stdio.js')], {
        env: { ...process.env, OHOS_DSH_DATA_ROOT: data, OHOS_DSH_PRINCIPAL: 'parent' },
        input: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'audit', version: '1' } } }) + '\n',
        encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 });
      results.stdio.push({ node, response_id: JSON.parse(output.trim()).id, initialized: true });
    } catch (error) { results.stdio.push({ node, initialized: false, message: error.message }); }
    finally { rmSync(data, { recursive: true, force: true }); }
  }
}
{
  const data = mkdtempSync(join(tmpdir(), 'dsh-audit-options-'));
  try {
    const runtime = createRuntime({ dataRoot: data, policySkillsRoot: join(data, 'absent-skills') });
    results.policy_root_option = { invalid_explicit_policy_root_ignored: true, actual_root: runtime.controller.policy.skillsRoot };
    runtime.close();
  } catch (error) { results.policy_root_option = { invalid_explicit_policy_root_ignored: false, code: error.code }; }
  finally { rmSync(data, { recursive: true, force: true }); }
}
writeFileSync(new URL('./probe-results.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
