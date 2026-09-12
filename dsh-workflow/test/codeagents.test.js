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
      custom: { name: '我的 Agent', command: '/usr/local/bin/my-agent', args: ['--repo', '{{repo_root}}'], model: 'local-model' },
    });
    assert.equal(updated.selected, 'custom');
    assert.equal(updated.selected_config.name, '我的 Agent');
    assert.deepEqual(updated.selected_config.args, ['--repo', '{{repo_root}}']);
    const persisted = JSON.parse(await readFile(join(root, 'codeagent-settings.json'), 'utf8'));
    assert.equal(persisted.selected, 'custom');
    assert.equal(persisted.custom.command, '/usr/local/bin/my-agent');
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
    assert.equal(initial.opencode.command, 'opencode');
    assert.equal(initial.opencode.path, join(root, 'opencode'));
    assert.equal(initial.opencode.version, 'opencode 1.2.3');
    await rm(join(root, 'opencode'));
    const refreshed = await registry.refresh();
    assert.equal(refreshed.opencode.status, 'missing');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
