import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CodeAgentRegistry } from '../src/dsh/codeagents.js';

test('CodeAgent registry exposes the official provider and persists a custom selection', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-'));
  try {
    const registry = new CodeAgentRegistry({
      dataRoot: root,
      env: { PATH: '' },
      subagents: { getProvider(name) { return name === 'claude-code' ? {} : undefined; } },
    });
    const initial = await registry.snapshot();
    assert.equal(initial.selected, 'claude-code');
    assert.equal(initial.claude_code.available, true);
    assert.equal(initial.claude_code.dispatchable, true);
    assert.equal(initial.opencode.available, false);
    assert.equal(initial.opencode.dispatchable, false);
    assert.equal(initial.options.some((item) => item.id === 'custom'), true);

    const updated = await registry.update({
      selected: 'custom',
      model: 'local-default',
      custom: { name: '我的 Agent', command: '/usr/local/bin/my-agent', args: ['--repo', '{{repo_root}}'], model: 'local-model' },
    });
    assert.equal(updated.selected, 'custom');
    assert.equal(updated.selected_config.name, '我的 Agent');
    assert.deepEqual(updated.selected_config.args, ['--repo', '{{repo_root}}']);
    assert.equal(updated.model, 'local-default');
    const persisted = JSON.parse(await readFile(join(root, 'codeagent-settings.json'), 'utf8'));
    assert.equal(persisted.selected, 'custom');
    assert.equal(persisted.custom.command, '/usr/local/bin/my-agent');
    const cleared = await registry.update({
      model: null,
      custom: { name: '我的 Agent', command: '/usr/local/bin/my-agent', args: ['--repo', '{{repo_root}}'], model: '' },
    });
    assert.equal(cleared.model, null);
    assert.equal(cleared.selected_config.model, null);
    await assert.rejects(() => registry.resolveSelected('custom', { requireDispatchable: true }),
      (error) => error.code === 'codeagent_adapter_unavailable');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CodeAgent registry rejects unsupported selections', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-'));
  try {
    const registry = new CodeAgentRegistry({ dataRoot: root, env: { PATH: '' } });
    await assert.rejects(() => registry.update({ selected: 'unknown' }), (error) => error.code === 'invalid_codeagent_settings');
    await assert.rejects(() => registry.update({ selected: 'custom', custom: { name: '空配置', command: '' } }), (error) => error.code === 'invalid_codeagent_settings');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CodeAgent registry discovers a CLI path and can refresh the probe', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-'));
  try {
    await writeFile(join(root, 'opencode'), '#!/bin/sh\nprintf "opencode 1.2.3\\n"\n', 'utf8');
    await chmod(join(root, 'opencode'), 0o755);
    const registry = new CodeAgentRegistry({ dataRoot: root, env: { PATH: root }, subagents: { getProvider() { return undefined; } } });
    const initial = await registry.snapshot();
    assert.equal(initial.opencode.available, true);
    assert.equal(initial.opencode.dispatchable, true);
    assert.equal(initial.opencode.command, 'opencode');
    assert.equal(initial.opencode.path, join(root, 'opencode'));
    assert.equal(initial.opencode.version, 'opencode 1.2.3');
    const selected = await registry.resolveSelected('opencode', { requireDispatchable: true });
    assert.equal(selected.id, 'opencode');
    await rm(join(root, 'opencode'));
    const refreshed = await registry.refresh();
    assert.equal(refreshed.opencode.status, 'missing');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CodeAgent registry dispatches a configured custom argv agent when its executable is present', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-custom-'));
  try {
    const command = join(root, 'custom-agent');
    await writeFile(command, '#!/bin/sh\nprintf "custom-agent 1.0\\n"\n', 'utf8');
    await chmod(command, 0o755);
    const registry = new CodeAgentRegistry({ dataRoot: join(root, 'state'), env: { PATH: root } });
    const value = await registry.update({
      selected: 'custom',
      custom: { name: 'Custom', command: 'custom-agent', args: ['{{prompt}}'], model: '' },
    });
    assert.equal(value.custom.dispatchable, true);
    assert.equal((await registry.resolveSelected('custom', { requireDispatchable: true })).adapter, 'argv-cli');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CodeAgent registry applies a per-run model override without changing persisted selection', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-'));
  try {
    const registry = new CodeAgentRegistry({
      dataRoot: root,
      env: { PATH: '' },
      subagents: { getProvider() { return {}; } },
    });
    const selected = await registry.resolveSelected('claude-code', {
      requireDispatchable: true,
      model: 'deepseek-reasoner',
    });
    assert.equal(selected.model, 'deepseek-reasoner');
    assert.equal((await registry.snapshot()).selected_config.model, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CodeAgent registry only marks CLIs with a known execution adapter dispatchable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-'));
  try {
    for (const name of ['opencode', 'cursor-agent']) {
      await writeFile(join(root, name), `#!/bin/sh\nprintf "${name} 1.0\\n"\n`, 'utf8');
      await chmod(join(root, name), 0o755);
    }
    const registry = new CodeAgentRegistry({ dataRoot: join(root, 'state'), env: { PATH: root } });
    const snapshot = await registry.snapshot();
    assert.equal(snapshot.opencode.available, true);
    assert.equal(snapshot.opencode.dispatchable, true);
    assert.equal(snapshot.cursor.available, true);
    assert.equal(snapshot.cursor.dispatchable, false);
    await assert.rejects(() => registry.resolveSelected('cursor', { requireDispatchable: true }),
      (error) => error.code === 'codeagent_adapter_unavailable');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workspace gateway profiles make remote CLI agents dispatchable without a local binary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-remote-'));
  try {
    const registry = new CodeAgentRegistry({
      dataRoot: root,
      env: { PATH: '' },
      remoteProfiles: { opencode: 'codeagent.opencode', codex: 'codeagent.codex' },
    });
    const value = await registry.snapshot();
    assert.equal(value.opencode.available, true);
    assert.equal(value.opencode.dispatchable, true);
    assert.equal(value.opencode.profile_id, 'codeagent.opencode');
    assert.equal(value.opencode.execution_mode, 'workspace_gateway');
    assert.equal(value.opencode.workspace_access, 'remote');
    assert.equal(value.opencode.supports_remote_workspace_editing, true);
    assert.equal(value.codex.dispatchable, true);
    assert.equal(value.claude_code.dispatchable, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workspace gateway can dispatch Claude Code from the code host when a Claude profile is registered', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-remote-claude-'));
  try {
    const registry = new CodeAgentRegistry({
      dataRoot: root,
      env: { PATH: '' },
      remoteProfiles: { 'claude-code': 'codeagent.claude' },
    });
    const value = await registry.snapshot();
    assert.equal(value.claude_code.available, true);
    assert.equal(value.claude_code.dispatchable, true);
    assert.equal(value.claude_code.source, 'workspace-gateway');
    assert.equal(value.claude_code.profile_id, 'codeagent.claude');
    assert.equal(value.claude_code.adapter, 'claude-code-cli');
    assert.equal(value.claude_code.execution_mode, 'workspace_gateway');
    assert.equal(value.claude_code.workspace_access, 'remote');
    const selected = await registry.resolveSelected('claude-code', { requireDispatchable: true });
    assert.equal(selected.profile_id, 'codeagent.claude');
    assert.equal(selected.adapter, 'claude-code-cli');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local CLI metadata makes remote editing limitations explicit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-local-mode-'));
  try {
    await writeFile(join(root, 'opencode'), '#!/bin/sh\nprintf "opencode 1.0\\n"\n', 'utf8');
    await chmod(join(root, 'opencode'), 0o755);
    const registry = new CodeAgentRegistry({ dataRoot: join(root, 'state'), env: { PATH: root } });
    const value = await registry.snapshot();
    assert.equal(value.opencode.execution_mode, 'local_cli');
    assert.equal(value.opencode.workspace_access, 'local');
    assert.equal(value.opencode.supports_remote_workspace_editing, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('workspace gateway can dispatch a configured custom argv agent without a local binary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-remote-custom-'));
  try {
    const registry = new CodeAgentRegistry({
      dataRoot: root,
      env: { PATH: '' },
      remoteProfiles: { custom: 'codeagent.custom' },
    });
    const value = await registry.update({
      selected: 'custom',
      custom: { name: '远端自定义 Agent', command: '', args: [], model: '' },
    });
    assert.equal(value.custom.available, true);
    assert.equal(value.custom.dispatchable, true);
    assert.equal(value.custom.source, 'workspace-gateway');
    assert.equal(value.custom.profile_id, 'codeagent.custom');
    assert.equal((await registry.resolveSelected('custom', { requireDispatchable: true })).profile_id, 'codeagent.custom');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local Connector catalog makes a locally installed CodeAgent dispatchable in cloud DSH', async () => {
  const registry = new CodeAgentRegistry({
    dataRoot: await mkdtemp(join(tmpdir(), 'dsh-codeagents-connector-')),
    connector: {
      snapshot() {
        return {
          connected: true,
          workspaces: [{
            workspace_id: 'workspace-1', connected: true,
            capabilities: { agents: { opencode: { available: true, command: 'opencode', version: '1.2.3' } } },
          }],
        };
      },
    },
    connectorWorkspaceId: 'workspace-1',
    env: { PATH: '/missing' },
  });
  const value = await registry.snapshot();
  assert.equal(value.opencode.source, 'local-connector');
  assert.equal(value.opencode.execution_mode, 'local_connector');
  assert.equal(value.opencode.dispatchable, true);
  assert.equal(value.opencode.workspace_access, 'sshfs_mount');
  assert.equal((await registry.resolveSelected('opencode', { requireDispatchable: true })).source, 'local-connector');
});

test('local Connector catalog exposes remote-tools workspace access', async () => {
  const registry = new CodeAgentRegistry({
    dataRoot: await mkdtemp(join(tmpdir(), 'dsh-codeagents-remote-tools-')),
    connector: {
      snapshot() {
        return { connected: true, workspaces: [{ workspace_id: 'workspace-remote', connected: true,
          capabilities: { workspace_access: 'remote_tools', agents: { claude_code: { available: true, command: 'claude' } } } }] };
      },
    },
    connectorWorkspaceId: 'workspace-remote', env: { PATH: '/missing' },
  });
  const value = await registry.snapshot();
  assert.equal(value.claude_code.execution_mode, 'local_connector');
  assert.equal(value.claude_code.workspace_access, 'remote_tools');
  assert.equal(value.claude_code.supports_remote_tools, true);
});

test('CodeAgent refresh asks the Connector to reprobe local tools', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-connector-refresh-'));
  const calls = [];
  try {
    const connector = {
      async probeWorkspace(workspaceId, options) {
        calls.push([workspaceId, options]);
        return { status: 'ready' };
      },
      snapshot() {
        return { workspaces: [{ workspace_id: 'workspace-1', connected: true, capabilities: { agents: {} } }] };
      },
    };
    const registry = new CodeAgentRegistry({ dataRoot: root, connector, connectorWorkspaceId: 'workspace-1', env: { PATH: '' } });
    await registry.refresh();
    assert.deepEqual(calls, [['workspace-1', { timeoutMs: 30_000 }]]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CodeAgent snapshot notices a Connector that connected after DSH startup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-codeagents-connector-late-'));
  let connected = false;
  try {
    const connector = {
      snapshot() {
        return {
          workspaces: connected
            ? [{ workspace_id: 'workspace-1', connected: true, connection_epoch: 2,
                capabilities: { workspace_access: 'remote_tools', agents: { opencode: { available: true, command: 'opencode', version: '2.0' } } } }]
            : [],
        };
      },
    };
    const registry = new CodeAgentRegistry({ dataRoot: root, connector, connectorWorkspaceId: 'workspace-1', env: { PATH: '' } });
    assert.equal((await registry.snapshot()).opencode.status, 'connector_offline');
    connected = true;
    const refreshed = await registry.snapshot();
    assert.equal(refreshed.opencode.status, 'connector_online');
    assert.equal(refreshed.opencode.workspace_access, 'remote_tools');
    assert.equal(refreshed.opencode.version, '2.0');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
