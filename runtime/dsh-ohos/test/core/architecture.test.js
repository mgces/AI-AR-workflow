import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { TaskController } from '../../src/core/task-controller.js';
import { SqliteStore } from '../../src/core/store/sqlite-store.js';
import { TaskCredentials } from '../../src/core/credential.js';
import { PACKAGE_ROOT } from '../../src/core/paths.js';
import { DeliveryWorkflow } from '../../src/workflows/ar-delivery/workflow.js';
import { RequirementWorkflow } from '../../src/workflows/requirement/workflow.js';
import { TOOL_DEFINITIONS } from '../../src/tools/catalog.js';

function inside(root, path) {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function sources(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? sources(path) : entry.name.endsWith('.js') ? [path] : [];
  });
}

test('core has no domain dependency and workflows cannot import each other or assembly layers', () => {
  const core = resolve(PACKAGE_ROOT, 'src/core');
  for (const root of [core, ...['requirement', 'ar-delivery'].map((name) =>
    resolve(PACKAGE_ROOT, 'src/workflows', name))]) {
    for (const path of sources(root)) {
      const text = readFileSync(path, 'utf8');
      for (const [, specifier] of text.matchAll(/(?:from\s+|import\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
        const target = resolve(dirname(path), specifier);
        assert(existsSync(target), `Broken import: ${path} -> ${specifier}`);
        assert(inside(core, target) || inside(root, target), `Forbidden layer dependency: ${path} -> ${target}`);
      }
    }
  }
});

test('all pre-refactor MCP tool names, principals and input schemas are preserved', () => {
  // Captured from the previous layout before extraction, not generated from current definitions.
  const expected = JSON.parse(readFileSync(resolve(PACKAGE_ROOT,
    'test-support/core/mcp-contract-v0.3.json'), 'utf8'));
  const actual = TOOL_DEFINITIONS.map(({ name, principals, inputSchema }) => ({ name, principals, inputSchema }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const originalNames = new Set(expected.map((tool) => tool.name));
  assert.deepEqual(actual.filter((tool) => originalNames.has(tool.name)), expected);
  assert.equal(new Set(actual.map((tool) => tool.name)).size, actual.length);
});

function taskService(store) {
  const tasks = new TaskController({ store, credentials: new TaskCredentials(Buffer.alloc(32, 5)) });
  tasks.registerHost({ binding_id: 'standalone', host_kind: 'other',
    capabilities: { mcp_tools: true, native_subagent: true, workspace_write: true },
    capability_source: 'test:standalone', idempotency_key: 'register-host' });
  return tasks;
}

test('AR delivery can use the shared task service without creating requirement tables', () => {
  const store = new SqliteStore(':memory:');
  try {
    const tasks = taskService(store);
    const workflow = new DeliveryWorkflow({ store, taskController: tasks });
    tasks.registerWorkflow('delivery', workflow);
    const run = tasks.createRun({ workflow: 'delivery', input_ref: 'artifact:AR',
      pipeline_dir: resolve(tmpdir(), 'ohos-layering-placeholder'), idempotency_key: 'start' });
    const claim = tasks.claimTask({ run_id: run.run_id, role: run.next.role,
      host_binding_id: 'standalone', expected_revision: 1, idempotency_key: 'claim' });
    const context = tasks.taskContext(claim);
    assert.equal(context.phase, 'P0');
    assert(context.constraints.some((line) => line.includes('gate_env_init.py')));
    assert.equal(context.requirement, undefined);
    assert.equal(store.db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name = 'requirement_runs'")
      .get().count, 0);
  } finally { store.close(); }
});

test('requirement can initialize and lease through the shared task service without an AR adapter', () => {
  const root = mkdtempSync(join(tmpdir(), 'ohos-requirement-layering-'));
  const store = new SqliteStore(':memory:');
  try {
    const tasks = taskService(store);
    const workflow = new RequirementWorkflow({ store, insertTask: (args) => tasks.insertTask(args), preflight: () => {} });
    tasks.registerWorkflow('requirement', workflow);
    const run = workflow.start({ input_ref: 'user:test', input_text: '合成需求输入',
      docs_root: root, idempotency_key: 'start' });
    const claim = tasks.claimTask({ run_id: run.run_id, role: run.next.role,
      host_binding_id: 'standalone', context_id: 'standalone-author', expected_revision: 1, idempotency_key: 'claim' });
    const context = tasks.taskContext(claim);
    assert.equal(context.phase, 'R1');
    assert(existsSync(context.requirement.contract_path));
    assert(context.requirement.skill_paths.every(existsSync));
    assert.equal(tasks.workflows.size, 1);
  } finally { store.close(); rmSync(root, { recursive: true, force: true }); }
});
