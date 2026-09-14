import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('official DSH client bundle contributes one AR main panel and sidebar entry', async () => {
  const source = await readFile(new URL('../src/dsh/client.js', import.meta.url), 'utf8');
  assert.match(source, /window\.\__ModuleLoader__\.load/);
  assert.match(source, /ctx\.slots\.inject\('main'/);
  assert.match(source, /ctx\.slots\.inject\('sidebar\.panellist'/);
  assert.match(source, /\/api\/ohos-ar/);
  assert.match(source, /subagent_claude_code/);
  assert.match(source, /CodeAgent 设置/);
  assert.match(source, /OpenCode/);
  assert.match(source, /\/codeagents/);
  assert.doesNotMatch(source, /127\.0\.0\.1:8788/);
});

test('official profile disables API-key onboarding and exposes Claude Code through the default preset', async () => {
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8');
  const preset = await readFile(new URL('../config/presets/claude-code/agent.cordis.yml', import.meta.url), 'utf8');
  assert.match(patch, /id: ui-settings-models[\s\S]*disabled: true/);
  assert.match(patch, /name: '@deepseek-ai\/dsh-subagent-claude-code'/);
  assert.match(patch, /default: 'claude-code'/);
  const claudeRow = preset.slice(preset.indexOf('- id: tool-subagent-claude-code'), preset.indexOf('- id: workflow-worker-thread'));
  assert.match(claudeRow, /toolName: subagent_claude_code/);
  assert.doesNotMatch(claudeRow, /disabled:/);
});
