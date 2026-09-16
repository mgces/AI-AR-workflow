import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LocalCodeAgentSettings, probeLocalAgents } from '../src/agents.js';

test('local agent discovery probes every supported CLI in the DSH process environment', async () => {
  const bin = await mkdtemp(join(tmpdir(), 'dsh-local-agents-'));
  try {
    for (const name of ['opencode', 'codex', 'cursor-agent', 'trae']) {
      await writeFile(join(bin, name), `#!/bin/sh\nprintf "${name} 1.0\\n"\n`, 'utf8');
      await chmod(join(bin, name), 0o755);
    }
    const value = await probeLocalAgents({ env: { PATH: bin } });
    for (const id of ['claude_code', 'opencode', 'codex', 'cursor', 'trae']) {
      assert.ok(value[id]);
    }
    assert.equal(value.opencode.status, 'available');
    assert.equal(value.codex.status, 'available');
    assert.equal(value.cursor.status, 'available');
    assert.equal(value.trae.status, 'available');
    assert.equal(value.opencode.dispatchable, true);
    assert.equal(value.cursor.dispatchable, false);
    assert.equal(value.trae.dispatchable, false);
  } finally {
    await rm(bin, { recursive: true, force: true });
  }
});

test('codeagent settings persist a selected adapter and model without storing secrets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-agent-settings-'));
  try {
    const settingsFile = join(root, '.dsh', 'codeagent-settings.json');
    const settings = new LocalCodeAgentSettings({ settingsFile });
    assert.deepEqual(settings.snapshot(), {
      schema_version: 1,
      selected: 'claude-code',
      model: null,
      custom: null,
      updated_at: null,
    });
    const saved = await settings.update({ selected: 'opencode', model: 'anthropic/claude-sonnet-4-5' });
    assert.equal(saved.selected, 'opencode');
    assert.equal(saved.model, 'anthropic/claude-sonnet-4-5');
    const restored = new LocalCodeAgentSettings({ settingsFile });
    assert.equal(restored.snapshot().selected, 'opencode');
    assert.equal(restored.snapshot().model, 'anthropic/claude-sonnet-4-5');
    const persisted = JSON.parse(await readFile(settingsFile, 'utf8'));
    assert.equal(Object.hasOwn(persisted, 'api_key'), false);
    assert.equal(Object.hasOwn(persisted, 'token'), false);
    const cleared = await settings.update({ model: null });
    assert.equal(cleared.model, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('custom argv codeagent settings require an executable and preserve prompt placeholders', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-custom-agent-settings-'));
  try {
    const settings = new LocalCodeAgentSettings({ settingsFile: join(root, 'settings.json') });
    await assert.rejects(
      settings.update({ selected: 'custom', custom: { name: 'Unsafe', command: '', args: [] } }),
      (error) => error.code === 'custom_agent_invalid',
    );
    const saved = await settings.update({
      selected: 'custom',
      custom: { name: 'Fixture Agent', command: '/usr/bin/env', args: ['sh', '-c', '{{prompt}}'] },
    });
    assert.equal(saved.custom.name, 'Fixture Agent');
    assert.deepEqual(saved.custom.args, ['sh', '-c', '{{prompt}}']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
