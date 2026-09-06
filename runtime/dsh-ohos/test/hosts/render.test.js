import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { renderHostBundle, writeHostBundle } from '../../src/index.js';

const workspaceRoot = resolve('D:/work/example');
const dataRoot = resolve('D:/runtime/ohos-dsh');
const serverPath = resolve('D:/repo/runtime/dsh-ohos/src/mcp/stdio.js');

test('Codex bundle inherits the host model and scopes worker MCP tools', () => {
  const bundle = renderHostBundle('codex', {
    workspaceRoot, dataRoot, serverPath, nodeCommand: 'node',
  });
  const agent = bundle.files['.codex/agents/ohos-requirement.toml'];
  assert.match(agent, /name = "ohos-requirement"/);
  assert.match(agent, /\[mcp_servers\.ohos_worker\]/);
  assert.match(agent, /OHOS_DSH_PRINCIPAL = "worker"/);
  assert.match(agent, /ohos_task_context/);
  assert.doesNotMatch(agent, /^model\s*=/m);
  assert.match(bundle.files['.codex/ohos-parent-mcp.snippet.toml'], /ohos_requirement_start/);
  assert.match(bundle.files['.codex/ohos-parent-mcp.snippet.toml'], /OHOS_AR_SCRIPTS_ROOT/);
  assert.match(bundle.files['.codex/ohos-parent-mcp.snippet.toml'], /ohos_requirement_decide/);
  assert.match(bundle.files['.codex/ohos-parent-mcp.snippet.toml'], /OHOS_REQ_SKILLS_DIR/);
  assert.match(agent, /context_id/);
  assert.match(bundle.files['ohos-requirement-parent.md'], /ohos_requirement_validate/);
});

test('Claude Code bundle uses model inherit and an inline worker MCP server', () => {
  const bundle = renderHostBundle('claude-code', {
    workspaceRoot, dataRoot, serverPath, nodeCommand: 'node',
  });
  const agent = bundle.files['.claude/agents/ohos-delivery.md'];
  assert.match(agent, /^---\nname: ohos-delivery/m);
  assert.match(agent, /model: inherit/);
  assert.match(agent, /mcpServers:\n  - ohos_worker:/);
  assert.match(agent, /OHOS_DSH_PRINCIPAL: worker/);
  assert.match(bundle.files['.claude/ohos-parent-mcp.fragment.json'], /"ohos_parent"/);
});

test('Cursor bundle uses native subagents and records inherited-tool isolation limits', () => {
  const bundle = renderHostBundle('cursor', {
    workspaceRoot, dataRoot, serverPath, nodeCommand: 'node',
  });
  const agent = bundle.files['.cursor/agents/ohos-requirement.md'];
  const mcp = JSON.parse(bundle.files['.cursor/mcp.json']);
  assert.match(agent, /^---\nname: ohos-requirement/m);
  assert.match(agent, /model: inherit/);
  assert.equal(mcp.mcpServers.ohos_parent.env.OHOS_DSH_PRINCIPAL, 'parent');
  assert.equal(mcp.mcpServers.ohos_worker.env.OHOS_DSH_PRINCIPAL, 'worker');
  assert.equal(mcp.mcpServers.ohos_parent.env.OHOS_DSH_PYTHON, 'python3');
  assert(mcp.mcpServers.ohos_parent.env.OHOS_REQ_SKILLS_DIR.endsWith('skills'));
  const manifest = JSON.parse(bundle.files['ohos-host-bundle.json']);
  assert.equal(manifest.adapter.role_isolation, 'advisory-host-inherited-tools');
  assert(manifest.files.includes('ohos-host-bundle.json'));
});

test('Trae bundle inherits the selected model and whitelists worker MCP tools', () => {
  const bundle = renderHostBundle('trae', {
    workspaceRoot, dataRoot, serverPath, nodeCommand: 'node',
  });
  const agent = bundle.files['.trae/agents/ohos-delivery.md'];
  assert.match(agent, /^---\nname: ohos-delivery/m);
  assert.doesNotMatch(agent, /^model:/m);
  assert.match(agent, /mcpServers:\n    - ohos_worker/);
  assert.match(agent, /mcp__ohos_worker__ohos_task_submit/);
  assert.equal(bundle.files['.traecli/agents/ohos-delivery.md'], agent);
  const mcp = JSON.parse(bundle.files['.trae/mcp.json']);
  assert.equal(mcp.mcpServers.ohos_worker.env.OHOS_DSH_PRINCIPAL, 'worker');
  assert.match(bundle.files['.traecli/ohos-mcp.snippet.toml'],
    /\[mcp_servers\.ohos_worker\.env\]/);
});

test('host renderer rejects unknown adapters', () => {
  assert.throws(() => renderHostBundle('unknown', {
    workspaceRoot, dataRoot, serverPath, nodeCommand: 'node',
  }), (error) => error.code === 'unsupported_host_adapter');
});

test('each host receives separate requirement and AR business instructions and parent guides', () => {
  const paths = { codex: '.codex/agents', 'claude-code': '.claude/agents', cursor: '.cursor/agents', trae: '.trae/agents' };
  for (const [host, dir] of Object.entries(paths)) {
    const bundle = renderHostBundle(host, { workspaceRoot, dataRoot, serverPath });
    const extension = host === 'codex' ? 'toml' : 'md';
    const requirement = bundle.files[`${dir}/ohos-requirement.${extension}`];
    const delivery = bundle.files[`${dir}/ohos-delivery.${extension}`];
    assert.match(requirement, /requirement\.manifest_path/);
    assert.doesNotMatch(requirement, /publishing state/);
    assert.match(delivery, /publishing state/);
    assert.doesNotMatch(delivery, /requirement\.manifest_path/);
    assert.match(bundle.files['ohos-requirement-parent.md'], /ohos_requirement_validate/);
    assert.match(bundle.files['ohos-delivery-parent.md'], /ohos_delivery_validate/);
  }
});

test('bundle writer refuses to overwrite existing host files', async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), 'ohos-host-export-'));
  try {
    const bundle = renderHostBundle('codex', {
      workspaceRoot, dataRoot, serverPath, nodeCommand: 'node',
    });
    const written = writeHostBundle(outputRoot, bundle);
    assert(written.length >= 4);
    const manifest = JSON.parse(await readFile(join(outputRoot, 'ohos-host-bundle.json'), 'utf8'));
    assert.equal(manifest.host_kind, 'codex');
    assert.throws(() => writeHostBundle(outputRoot, bundle),
      (error) => error.code === 'export_conflict');
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});
