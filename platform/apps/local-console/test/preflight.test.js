import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';
import { buildExecutionPlan, evaluatePrerequisites, probeLocalPrerequisites, REQUIRED_AR_GATE_SCRIPTS } from '../src/preflight.js';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

test('preflight distinguishes a P0-ready workspace from a full P8-ready workspace', () => {
  const result = evaluatePrerequisites({
    workspaceMode: 'workspace_gateway',
    workspace: { configured: true, reachable: true, writable: true },
    runtime: { node: { status: 'pass', version: '24.1.0' }, python: { status: 'pass', version: '3.12.0' }, git: { status: 'pass', version: '2.43.0' } },
    workflow: { scripts: true, profiles: true },
    agent: { id: 'opencode', available: true, dispatchable: true, execution_mode: 'workspace_gateway' },
    environment: { selected: 'openharmony', profile_bound: false },
    device: { configured: false, reachable: false },
    publication: { configured: false, authenticated: false },
  });

  assert.equal(result.status, 'ready_for_p0');
  assert.equal(result.can_start_p0, true);
  assert.equal(result.can_complete_p8, false);
  assert.equal(result.execution_plan.codeagent_host, 'ssh_code_host');
  assert.equal(result.execution_plan.agent_load_strategy, 'gateway_registered_profile');
  assert.equal(result.execution_plan.agent_profile_id, null);
  assert.equal(result.execution_plan.edit_strategy, 'remote_codeagent_profile');
  assert.equal(result.execution_plan.local_cli_remote_edit, 'avoided_by_remote_execution');
  assert.ok(result.checks.some((item) => item.id === 'environment_profile' && item.status === 'pending'));
  assert.ok(result.checks.some((item) => item.id === 'device_transport' && item.status === 'blocked'));
});

test('preflight leaves the CodeAgent reason empty when the selected adapter is dispatchable', () => {
  const result = evaluatePrerequisites({
    workspaceMode: 'local',
    repoRoot: '/workspace/project',
    workspace: { configured: true, reachable: true, writable: true },
    runtime: { node: { status: 'pass' }, python: { status: 'pass' }, git: { status: 'pass' } },
    workflow: { scripts: true, profiles: true },
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
    environment: { selected: 'openharmony' },
  });

  const selected = result.checks.find((item) => item.id === 'codeagent_selected');
  assert.equal(selected.status, 'pass');
  assert.equal(selected.reason, null);
});

test('execution plan marks local CLI and local workspace as direct editing', () => {
  const plan = buildExecutionPlan({
    workspaceMode: 'local',
    repoRoot: '/workspace/project',
    codeagent: { id: 'codex', execution_mode: 'local_cli' },
  });
  assert.equal(plan.codeagent_host, 'dsh_host');
  assert.equal(plan.agent_load_strategy, 'local_cli_path');
  assert.equal(plan.agent_profile_id, null);
  assert.equal(plan.edit_strategy, 'local_cli');
  assert.equal(plan.local_cli_remote_edit, 'not_applicable');
  assert.equal(plan.source_root, '/workspace/project');
});

test('execution plan describes a local Connector editing an SSHFS-mounted workspace', () => {
  const plan = buildExecutionPlan({
    workspaceMode: 'local_connector',
    repoRoot: '/srv/openharmony',
    remoteRoot: '/srv/openharmony',
    codeagent: {
      id: 'opencode', available: true, dispatchable: true,
      execution_mode: 'local_connector', source: 'local-connector',
      connector_workspace_id: 'workspace-1',
    },
  });
  assert.equal(plan.workspace_mode, 'local_connector');
  assert.equal(plan.codeagent_host, 'user_connector_host');
  assert.equal(plan.agent_load_strategy, 'connector_local_agent');
  assert.equal(plan.edit_strategy, 'connector_sshfs_mount');
  assert.equal(plan.local_cli_remote_edit, 'supported_via_connector');
  assert.equal(plan.gate_execution, 'ssh_code_host');
  assert.equal(plan.remote_root, '/srv/openharmony');
});

test('execution plan describes a local Connector using remote-tools MCP without a mount', () => {
  const plan = buildExecutionPlan({
    workspaceMode: 'local_connector', repoRoot: '/srv/openharmony', remoteRoot: '/srv/openharmony',
    codeagent: {
      id: 'claude-code', available: true, dispatchable: true,
      execution_mode: 'local_connector', source: 'local-connector', workspace_access: 'remote_tools',
    },
  });
  assert.equal(plan.edit_strategy, 'connector_remote_tools_mcp');
  assert.equal(plan.operator_action.includes('remote-tools MCP'), true);
  assert.equal(plan.local_cli_remote_edit, 'supported_via_connector');
});

test('pending environment or publication prerequisites cannot claim P8 readiness', () => {
  const result = evaluatePrerequisites({
    workspaceMode: 'local',
    repoRoot: '/workspace/project',
    workspace: { configured: true, reachable: true, writable: true },
    runtime: { node: { status: 'pass' }, python: { status: 'pass' }, git: { status: 'pass' } },
    workflow: { scripts: true, profiles: true },
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
    environment: { selected: 'openharmony', profile_bound: false },
    device: { configured: true, reachable: true, serial: 'device-1' },
    publication: { configured: false, authenticated: false },
  });

  assert.equal(result.status, 'ready_for_p0');
  assert.equal(result.can_start_p0, true);
  assert.equal(result.can_complete_p8, false);
  assert.ok(result.checks.some((item) => item.id === 'publication_target' && item.status === 'pending'));
});

test('missing hdc is reported for device stages without blocking P0 dispatch', () => {
  const result = evaluatePrerequisites({
    workspaceMode: 'local',
    repoRoot: '/workspace/project',
    workspace: { configured: true, reachable: true, writable: true },
    runtime: {
      node: { status: 'pass' },
      python: { status: 'pass' },
      git: { status: 'pass' },
      hdc: { status: 'blocked', reason: 'executable_not_found' },
    },
    workflow: { scripts: true, profiles: true, bridge: true },
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
    environment: { selected: 'openharmony', profile_bound: false },
    device: { configured: false, reachable: false },
    publication: { configured: false, authenticated: false },
  });

  assert.equal(result.status, 'ready_for_p0');
  assert.equal(result.can_start_p0, true);
  assert.equal(result.can_complete_p8, false);
  const hdc = result.checks.find((item) => item.id === 'runtime_hdc');
  assert.equal(hdc.status, 'blocked');
  assert.deepEqual(hdc.required_for, ['P6', 'P7', 'P8']);
});

test('local probe inventories every P0-P8 gate and blocks a non-OHOS source root', async () => {
  const result = await probeLocalPrerequisites({
    repoRoot: process.cwd(),
    environment: { selected: 'openharmony' },
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
  });
  const workflow = result.checks.find((item) => item.id === 'workflow_scripts');
  assert.equal(workflow.status, 'pass');
  assert.deepEqual(workflow.required, [...REQUIRED_AR_GATE_SCRIPTS]);
  assert.equal(workflow.missing.length, 0);
  assert.equal(workflow.bridge, true);
  const source = result.checks.find((item) => item.id === 'source_tree_layout');
  assert.equal(source.status, 'blocked');
  assert.equal(source.reason, 'source_layout_markers_missing');
  assert.equal(result.can_start_p0, false);
});

test('AR input preflight accepts inline text and rejects a missing file', async () => {
  const inline = await probeLocalPrerequisites({
    repoRoot: process.cwd(),
    arText: '# inline AR',
    environment: { selected: 'openharmony' },
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
  });
  assert.equal(inline.checks.find((item) => item.id === 'ar_input').status, 'pass');
  const missing = await probeLocalPrerequisites({
    repoRoot: process.cwd(),
    arPath: 'does-not-exist.ar.md',
    environment: { selected: 'openharmony' },
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
  });
  assert.equal(missing.checks.find((item) => item.id === 'ar_input').status, 'blocked');
  assert.equal(missing.checks.find((item) => item.id === 'ar_input').reason, 'file_not_found');
});

test('AR input preflight rejects empty and whitespace-only files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-preflight-ar-'));
  try {
    const empty = join(root, 'empty.md');
    const whitespace = join(root, 'whitespace.md');
    await writeFile(empty, '');
    await writeFile(whitespace, ' \n\t');
    const emptyResult = await probeLocalPrerequisites({
      repoRoot: root, arPath: empty, environment: { selected: 'openharmony' },
      agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
    });
    const whitespaceResult = await probeLocalPrerequisites({
      repoRoot: root, arPath: whitespace, environment: { selected: 'openharmony' },
      agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
    });
    assert.equal(emptyResult.checks.find((item) => item.id === 'ar_input').reason, 'ar_input_empty');
    assert.equal(whitespaceResult.checks.find((item) => item.id === 'ar_input').reason, 'ar_input_empty');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('source layout preflight rejects an unknown marker kind', async () => {
  const result = await probeLocalPrerequisites({
    repoRoot: process.cwd(),
    environment: { selected: 'harmonyos', component_type: 'system', source_layout_markers: [{ path: 'package.json', kind: 'symlink' }] },
    arText: '# inline AR',
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
  });
  assert.equal(result.checks.find((item) => item.id === 'source_tree_layout').reason, 'source_layout_markers_invalid');
});

test('HarmonyOS source layout stays blocked until the selected profile supplies root markers', async () => {
  const missing = await probeLocalPrerequisites({
    repoRoot: process.cwd(),
    environment: { selected: 'harmonyos', component_type: 'system' },
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
  });
  const missingLayout = missing.checks.find((item) => item.id === 'source_tree_layout');
  assert.equal(missingLayout.status, 'blocked');
  assert.equal(missingLayout.reason, 'source_layout_markers_unconfigured');

  const configured = await probeLocalPrerequisites({
      repoRoot: REPOSITORY_ROOT,
      environment: {
        selected: 'harmonyos', component_type: 'system',
      source_layout_markers: ['platform/package.json'],
      },
    arText: '# inline AR',
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
  });
  assert.equal(configured.checks.find((item) => item.id === 'source_tree_layout').status, 'pass');
});

test('preflight blocks an unconfirmed or incomplete environment branch before P0', () => {
  const missing = evaluatePrerequisites({
    workspaceMode: 'local',
    repoRoot: '/workspace/project',
    workspace: { configured: true, reachable: true, writable: true },
    runtime: { node: { status: 'pass' }, python: { status: 'pass' }, git: { status: 'pass' } },
    workflow: { scripts: true, profiles: true },
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
    environment: {},
  });
  assert.equal(missing.can_start_p0, false);
  assert.equal(missing.checks.find((item) => item.id === 'environment_selection')?.reason, 'environment_required');

  const harmonyos = evaluatePrerequisites({
    workspaceMode: 'local',
    repoRoot: '/workspace/project',
    workspace: { configured: true, reachable: true, writable: true },
    runtime: { node: { status: 'pass' }, python: { status: 'pass' }, git: { status: 'pass' } },
    workflow: { scripts: true, profiles: true },
    agent: { id: 'codex', available: true, dispatchable: true, execution_mode: 'local_cli' },
    environment: { selected: 'harmonyos', component_type: 'system' },
  });
  assert.equal(harmonyos.can_start_p0, false);
  assert.equal(harmonyos.checks.find((item) => item.id === 'environment_selection')?.reason, 'device_type_required');
});
