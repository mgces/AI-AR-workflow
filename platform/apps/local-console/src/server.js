import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { detectEnvironment } from '../../../packages/contracts/src/environment-profile.js';
import { validateArDeliveryManifest } from '../../../packages/workflow-registry/src/manifest.js';
import { validateAuthorityEnvelope } from '../../../../workspace-gateway/src/authority/envelope.js';
import { LocalRunStore } from './store.js';
import { canonicalAgentId, LocalCodeAgentSettings, probeLocalAgent, probeLocalAgents } from './agents.js';
import { probeDebugSurface } from './debug.js';
import { HttpRagModelAdapter, LocalRagIndex } from './rag.js';
import { ArRuntimeService } from './ar-runtime.js';
import { LocalCodeAgentExecutor } from './codeagent-executor.js';
import { ArDeliveryScheduler } from './scheduler.js';
import { probeHostCapabilities } from './capabilities.js';
import { probeLocalPrerequisites } from './preflight.js';
import { cgroupOptionsFromEnv, ProcessSupervisor } from '../../../../workspace-gateway/src/supervisor/process-supervisor.js';

const MAX_BODY_BYTES = 512 * 1024;
const MANIFEST_PATH = 'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json';
const DEFAULT_REPO_ROOT = resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

const HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AR Runtime Debug Surface</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; background: #10141b; color: #e8edf5; }
    main { max-width: 1080px; margin: 0 auto; padding: 32px 20px 60px; }
    h1 { margin-bottom: 4px; } p { color: #aab6c8; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
    .card { background: #1a2230; border: 1px solid #2b3a4e; border-radius: 12px; padding: 18px; }
    .ok { color: #71e0a3; } .warn { color: #ffd166; } .bad { color: #ff7f8f; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #0c1016; padding: 12px; border-radius: 8px; }
    button { cursor: pointer; border: 0; border-radius: 8px; padding: 9px 13px; background: #4f8cff; color: white; }
    button.secondary { background: #35445a; } textarea { width: 100%; min-height: 180px; box-sizing: border-box; background: #0c1016; color: #e8edf5; border: 1px solid #35445a; border-radius: 8px; padding: 10px; }
    code { color: #a9c7ff; }
  </style>
</head>
<body>
<main>
  <h1>AR Runtime Debug Surface</h1>
  <p>这是本地 API 调试面，不是 DSH 官方主页面。主入口由官方 DeepSeek Harness Web profile 提供；本页仅用于查看 WSL 运行时、RAG 和确定性 AR 证据。</p>
  <div class="grid">
    <section class="card"><h2>拓扑与环境</h2><button id="refresh">刷新状态</button><div style="margin-top:10px"><select id="environment-select" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><option value="openharmony">OpenHarmony</option><option value="harmonyos/system">HarmonyOS-system</option><option value="harmonyos/chip">HarmonyOS-chip</option></select> <button id="select-environment" class="secondary">保存分支选择</button></div><pre id="environment-result"></pre><pre id="status">加载中…</pre></section>
    <section class="card"><h2>AR manifest</h2><button id="load-manifest" class="secondary">加载草案</button> <button id="validate-manifest">校验</button><textarea id="manifest" spellcheck="false"></textarea><pre id="manifest-result"></pre></section>
    <section class="card"><h2>运行 AR 环境预检</h2><p>这会创建一个轻量 P0 run，读取 WSL 代码根标志并生成环境报告。</p><button id="start-run">运行 P0 预检</button><pre id="runs">暂无 run</pre></section>
    <section class="card"><h2>CodeAgent 设置</h2><p>选择本机已经安装的 CLI；配置保存在 WSL 的运行目录，凭据仍由各 CLI 自己管理。自定义 Agent 必须接受 argv 末尾提示词或提供 <code>{{prompt}}</code> 参数。</p><div style="display:grid;gap:8px"><select id="settings-agent" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><option value="claude-code">Claude Code</option><option value="opencode">OpenCode</option><option value="codex">Codex CLI</option><option value="custom">自定义 argv Agent</option></select><input id="settings-model" placeholder="模型（可选，如 anthropic/claude-sonnet-4-5）" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><div id="custom-settings" style="display:none;gap:8px"><input id="custom-name" placeholder="自定义 Agent 名称" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><input id="custom-command" placeholder="命令，例如 my-codeagent" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><textarea id="custom-args" placeholder="固定参数，每行一个；可使用 {{prompt}}、{{workspace_root}}、{{model}}"></textarea></div><button id="save-agent-settings">保存 CodeAgent 设置</button></div><pre id="settings-result">读取中…</pre></section>
    <section class="card"><h2>启动真实 AR run</h2><p>通过本地 DSH scheduler 逐阶段执行 P0-P8；失败、等待审核和取消都会保留在 SQLite。</p><div style="display:grid;gap:8px"><select id="ar-agent" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><option value="claude-code">Claude Code</option></select><input id="ar-model" placeholder="本次模型（留空使用 CodeAgent 设置）" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><select id="ar-environment" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><option value="openharmony">OpenHarmony</option><option value="harmonyos">HarmonyOS</option></select><select id="ar-component" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><option value="system">system</option><option value="chip">chip</option></select><input id="ar-device-type" placeholder="HarmonyOS 设备类型（system/chip 时必填）" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><input id="ar-path" placeholder="AR 文件（留空使用仓库示例）" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><input id="device_serial" placeholder="设备序列号（可选，hdc list targets）" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><textarea id="ar-text" placeholder="补充需求（可选）"></textarea><label><input id="ar-confirm" type="checkbox"> 确认使用默认 profile 参数</label><button id="preflight-ar-run" class="secondary">检查启动前置条件</button><button id="start-ar-run" disabled>启动 P0-P8 调度</button></div><pre id="ar-preflight-result">尚未执行启动前置检查</pre><pre id="ar-run-result">尚未启动真实 AR run</pre></section>
    <section class="card"><h2>人工输入</h2><input id="run-id" placeholder="run_id" style="width:100%;box-sizing:border-box;margin-bottom:8px;background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:10px"><textarea id="input-content" placeholder="给当前 run 的补充说明"></textarea><button id="submit-input">记录人工输入</button><pre id="input-result"></pre></section>
    <section class="card"><h2>Agent / RAG / 调试</h2><button id="refresh-capabilities" class="secondary">刷新能力</button> <button id="index-rag">建立本地索引</button><div style="display:grid;gap:8px;margin-top:10px"><label>RAG 执行模式<select id="rag-mode" style="width:100%;background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><option value="local_lexical">本地词法（当前可用）</option><option value="embedding_reranker">Embedding + Reranker（已配置服务时执行）</option></select></label><input id="rag-provider" placeholder="Provider（可选，例如 qwen-compatible）" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><input id="rag-endpoint" placeholder="服务地址（服务端受信配置，https://rag.example/v1）" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><input id="rag-embedding-model" placeholder="Embedding 模型（可选）" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><input id="rag-reranker-model" placeholder="Reranker 模型（可选）" style="background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:9px"><button id="save-rag-profile" class="secondary">保存 RAG 模型配置</button></div><pre id="capabilities">加载中…</pre><input id="rag-query" placeholder="检索代码，例如 environment profile" style="width:100%;box-sizing:border-box;margin:8px 0;background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:10px"><button id="search-rag" class="secondary">检索</button><pre id="rag-result"></pre></section>
    <section class="card"><h2>Run 详情与产物</h2><button id="cancel-run" class="secondary">取消当前 run</button><pre id="run-detail">选择或创建 run 后显示阶段、事件和产物。</pre></section>
  </div>
  <section class="card" style="margin-top:16px"><h2>可用入口</h2><p><code>/api/status</code> 查看当前状态，<code>/api/runs</code> 查看 run，<code>/api/validate/manifest</code> 校验 workflow，<code>/api/validate/envelope</code> 校验 Authority envelope，<code>/healthz</code> 健康检查。</p></section>
</main>
<script>
const statusNode = document.querySelector('#status');
const environmentSelectNode = document.querySelector('#environment-select');
const environmentResultNode = document.querySelector('#environment-result');
const manifestNode = document.querySelector('#manifest');
const resultNode = document.querySelector('#manifest-result');
const runsNode = document.querySelector('#runs');
const runIdNode = document.querySelector('#run-id');
const inputNode = document.querySelector('#input-content');
const inputResultNode = document.querySelector('#input-result');
const capabilitiesNode = document.querySelector('#capabilities');
const ragQueryNode = document.querySelector('#rag-query');
const ragResultNode = document.querySelector('#rag-result');
const ragModeNode = document.querySelector('#rag-mode');
const ragProviderNode = document.querySelector('#rag-provider');
const ragEndpointNode = document.querySelector('#rag-endpoint');
const ragEmbeddingNode = document.querySelector('#rag-embedding-model');
const ragRerankerNode = document.querySelector('#rag-reranker-model');
const runDetailNode = document.querySelector('#run-detail');
const arAgentNode = document.querySelector('#ar-agent');
const settingsAgentNode = document.querySelector('#settings-agent');
const settingsModelNode = document.querySelector('#settings-model');
const settingsResultNode = document.querySelector('#settings-result');
const customSettingsNode = document.querySelector('#custom-settings');
const customNameNode = document.querySelector('#custom-name');
const customCommandNode = document.querySelector('#custom-command');
const customArgsNode = document.querySelector('#custom-args');
const arModelNode = document.querySelector('#ar-model');
const arEnvironmentNode = document.querySelector('#ar-environment');
const arComponentNode = document.querySelector('#ar-component');
const arDeviceTypeNode = document.querySelector('#ar-device-type');
const arPathNode = document.querySelector('#ar-path');
const arDeviceNode = document.querySelector('#device_serial');
const arTextNode = document.querySelector('#ar-text');
const arConfirmNode = document.querySelector('#ar-confirm');
const arPreflightNode = document.querySelector('#preflight-ar-run');
const arPreflightResultNode = document.querySelector('#ar-preflight-result');
const arRunResultNode = document.querySelector('#ar-run-result');
const arStartNode = document.querySelector('#start-ar-run');
let arPreflightReady = false;
function updateArStartState() {
  arStartNode.disabled = arAgentNode.disabled || !arAgentNode.value || !arPreflightReady;
}
function arRunBody() {
  return {
    workspace_id: 'wsl-local',
    environment: arEnvironmentNode.value,
    component_type: arEnvironmentNode.value === 'harmonyos' ? arComponentNode.value : undefined,
    device_type: arDeviceTypeNode.value || undefined,
    device_serial: arDeviceNode.value || undefined,
    agent: arAgentNode.value,
    model: arModelNode.value || undefined,
    ar_path: arPathNode.value || undefined,
    ar_text: arTextNode.value || undefined,
    confirm_defaults: arConfirmNode.checked,
  };
}
async function runArPreflight() {
  arPreflightReady = false;
  updateArStartState();
  arPreflightResultNode.textContent = '正在检查…';
  try {
    const response = await fetch('/api/ar/preflight', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(arRunBody()),
    });
    const value = await response.json();
    arPreflightResultNode.textContent = JSON.stringify(value, null, 2);
    arPreflightReady = response.ok && value.can_start_p0 === true;
    updateArStartState();
    return value;
  } catch (error) {
    arPreflightResultNode.textContent = error.message;
    updateArStartState();
    return null;
  }
}
async function loadStatus() {
  const response = await fetch('/api/status');
  const value = await response.json();
  statusNode.textContent = JSON.stringify(value, null, 2);
  capabilitiesNode.textContent = JSON.stringify({ agents: value.agents, capabilities: value.capabilities, rag: value.rag, debug: value.debug }, null, 2);
  const profile = value.rag?.model_profile || {};
  ragModeNode.value = profile.mode || 'local_lexical';
  ragProviderNode.value = profile.provider || '';
  ragEndpointNode.value = profile.endpoint || '';
  ragEmbeddingNode.value = profile.embedding_model || '';
  ragRerankerNode.value = profile.reranker_model || '';
}
document.querySelector('#refresh').addEventListener('click', loadStatus);
document.querySelector('#refresh-capabilities').addEventListener('click', loadStatus);
document.querySelector('#select-environment').addEventListener('click', async () => {
  const selected = environmentSelectNode.value.split('/');
  const response = await fetch('/api/projects/local-project/environment', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ environment: selected[0], component_type: selected[1] || null }),
  });
  environmentResultNode.textContent = JSON.stringify(await response.json(), null, 2);
  await loadStatus();
});
document.querySelector('#load-manifest').addEventListener('click', async () => {
  const response = await fetch('/api/example/manifest');
  manifestNode.value = JSON.stringify(await response.json(), null, 2);
});
document.querySelector('#validate-manifest').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/validate/manifest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ manifest: JSON.parse(manifestNode.value), installable: false }) });
    resultNode.textContent = JSON.stringify(await response.json(), null, 2);
  } catch (error) { resultNode.textContent = error.message; }
});
async function loadRuns() {
  const response = await fetch('/api/runs');
  const value = await response.json();
  runsNode.textContent = JSON.stringify(value.runs.map((run) => ({
    run_id: run.run_id, status: run.status, current_stage: run.current_stage,
    blockers: run.blockers, metrics: run.metrics,
  })), null, 2) || '暂无 run';
  if (value.runs[0]) {
    runIdNode.value = runIdNode.value || value.runs[0].run_id;
    await loadRunDetail(runIdNode.value);
  }
}
async function loadArAgents() {
  try {
    const response = await fetch('/api/agent-settings');
    const value = await response.json();
    const selected = value.settings?.selected || 'claude-code';
    const entries = Object.entries(value.agents || {});
    const labels = { claude_code: 'Claude Code', opencode: 'OpenCode', codex: 'Codex CLI', cursor: 'Cursor Agent', trae: 'Trae CLI' };
    const escapeHtml = (input) => String(input ?? '').replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
    const options = entries.map(([id, item]) => {
      const canonical = id.replaceAll('_', '-');
      const state = item?.status === 'available' ? '可用' : (item?.status || '不可用');
      return '<option value="' + escapeHtml(canonical) + '">' + escapeHtml(labels[id] || id) + ' · ' + escapeHtml(state) + '</option>';
    });
    options.push('<option value="custom">自定义 argv Agent</option>');
    settingsAgentNode.innerHTML = options.join('');
    settingsAgentNode.value = selected;
    const runnable = entries
      .filter(([, item]) => item?.available === true && item?.dispatchable !== false)
      .map(([id, item]) => {
        const canonical = id.replaceAll('_', '-');
        return '<option value="' + escapeHtml(canonical) + '">' + escapeHtml(labels[id] || id) + ' · 可用' + escapeHtml(item.version ? ' · ' + item.version : '') + '</option>';
      });
    arAgentNode.innerHTML = runnable.join('') || '<option value="">没有可执行的本地 Agent</option>';
    arAgentNode.disabled = runnable.length === 0;
    arAgentNode.value = runnable.some((option) => option.includes('value="' + selected + '"')) ? selected : (entries.find(([, item]) => item?.available === true)?.[0]?.replaceAll('_', '-') || '');
    updateArStartState();
    settingsModelNode.value = value.settings?.model || '';
    arModelNode.value = value.settings?.model || '';
    const custom = value.settings?.custom;
    customNameNode.value = custom?.name || '';
    customCommandNode.value = custom?.command || '';
    customArgsNode.value = (custom?.args || []).join('\n');
    customSettingsNode.style.display = selected === 'custom' ? 'grid' : 'none';
    settingsResultNode.textContent = JSON.stringify({ settings: value.settings, agents: value.agents }, null, 2);
  } catch { /* status remains useful when agent discovery is unavailable */ }
}
settingsAgentNode.addEventListener('change', () => { customSettingsNode.style.display = settingsAgentNode.value === 'custom' ? 'grid' : 'none'; arAgentNode.value = settingsAgentNode.value; arAgentNode.disabled = true; updateArStartState(); });
document.querySelector('#save-agent-settings').addEventListener('click', async () => {
  const selected = settingsAgentNode.value;
  const body = { selected, model: settingsModelNode.value || null };
  if (selected === 'custom') body.custom = { name: customNameNode.value, command: customCommandNode.value, args: customArgsNode.value.split(/\r?\n/u).filter(Boolean), protocol: 'argv' };
  try {
    const response = await fetch('/api/agent-settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const value = await response.json();
    settingsResultNode.textContent = JSON.stringify(value, null, 2);
    if (!response.ok) return;
    arAgentNode.value = selected;
    arModelNode.value = value.settings?.model || '';
    await loadArAgents();
  } catch (error) { settingsResultNode.textContent = error.message; }
});
async function loadArRuns() {
  try {
    const response = await fetch('/api/ar/runs');
    const value = await response.json();
    arRunResultNode.textContent = JSON.stringify({ scheduler: value.scheduler, runs: value.runs }, null, 2);
  } catch (error) { arRunResultNode.textContent = error.message; }
}
document.querySelector('#ar-environment').addEventListener('change', () => { arComponentNode.disabled = arEnvironmentNode.value !== 'harmonyos'; arPreflightReady = false; updateArStartState(); });
document.querySelector('#preflight-ar-run').addEventListener('click', runArPreflight);
[arAgentNode, arModelNode, arComponentNode, arDeviceTypeNode, arDeviceNode, arPathNode, arTextNode, arConfirmNode].forEach((node) => {
  node.addEventListener('input', () => { arPreflightReady = false; updateArStartState(); });
  node.addEventListener('change', () => { arPreflightReady = false; updateArStartState(); });
});
document.querySelector('#start-ar-run').addEventListener('click', async () => {
  if (!arAgentNode.value) {
    arRunResultNode.textContent = '当前没有已发现且可执行的 CodeAgent，请先刷新或完成 Agent 配置。';
    return;
  }
  const preflight = await runArPreflight();
  if (!preflight || preflight.can_start_p0 !== true) {
    arRunResultNode.textContent = '前置检查未通过，已阻止创建 AR run。请查看上方检查结果。';
    return;
  }
  arRunResultNode.textContent = '正在启动…';
  const body = { ...arRunBody(), input_ref: 'local://dsh/ar/' + Date.now(), idempotency_key: 'local-console-' + Date.now() };
  try {
    const response = await fetch('/api/ar/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const value = await response.json();
    arRunResultNode.textContent = JSON.stringify(value, null, 2);
    if (value.run_id) { runIdNode.value = value.run_id; await loadRunDetail(value.run_id); }
    await loadArRuns();
  } catch (error) { arRunResultNode.textContent = error.message; }
});
async function loadRunDetail(runId) {
  if (!runId) return;
  const response = await fetch('/api/runs/' + encodeURIComponent(runId));
  if (!response.ok) { runDetailNode.textContent = JSON.stringify(await response.json(), null, 2); return; }
  const run = await response.json();
  runDetailNode.textContent = JSON.stringify({
    run_id: run.run_id, status: run.status, current_stage: run.current_stage,
    blockers: run.blockers, stages: run.stages, metrics: run.metrics,
    events: run.events, artifacts: run.artifacts.map((artifact) => ({
      artifact_id: artifact.artifact_id, role: artifact.role, filename: artifact.filename,
      sha256: artifact.sha256, content_type: artifact.content_type,
    })),
  }, null, 2);
}
runIdNode.addEventListener('change', () => loadRunDetail(runIdNode.value));
document.querySelector('#start-run').addEventListener('click', async () => {
  const response = await fetch('/api/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflow_id: 'ar-delivery', workspace_id: 'wsl-local' }) });
  const value = await response.json();
  runIdNode.value = value.run_id || '';
  await loadRuns();
});
document.querySelector('#submit-input').addEventListener('click', async () => {
  const response = await fetch('/api/runs/' + encodeURIComponent(runIdNode.value) + '/inputs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'user_note', content: inputNode.value }) });
  inputResultNode.textContent = JSON.stringify(await response.json(), null, 2);
  await loadRuns();
});
document.querySelector('#cancel-run').addEventListener('click', async () => {
  const response = await fetch('/api/runs/' + encodeURIComponent(runIdNode.value) + '/actions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }) });
  runDetailNode.textContent = JSON.stringify(await response.json(), null, 2);
  await loadRuns();
});
document.querySelector('#index-rag').addEventListener('click', async () => {
  const response = await fetch('/api/rag/index', { method: 'POST' });
  ragResultNode.textContent = JSON.stringify(await response.json(), null, 2);
  await loadStatus();
});
document.querySelector('#save-rag-profile').addEventListener('click', async () => {
  const response = await fetch('/api/rag/profile', {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: ragModeNode.value,
      provider: ragProviderNode.value || null,
      endpoint: ragEndpointNode.value || null,
      embedding_model: ragEmbeddingNode.value || null,
      reranker_model: ragRerankerNode.value || null,
    }),
  });
  ragResultNode.textContent = JSON.stringify(await response.json(), null, 2);
  await loadStatus();
});
document.querySelector('#search-rag').addEventListener('click', async () => {
  const response = await fetch('/api/rag/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: ragQueryNode.value }) });
  ragResultNode.textContent = JSON.stringify(await response.json(), null, 2);
});
loadStatus();
loadRuns();
loadArAgents();
loadArRuns();
setInterval(loadRuns, 3000);
setInterval(loadArRuns, 3000);
</script>
</body>
</html>`;

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': contentType, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('request body too large'), { code: 'body_too_large' });
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('request body must be valid JSON'), { code: 'invalid_json' });
  }
}

async function loadSmokeReport(smokeReportPath) {
  try {
    return JSON.parse(await readFile(smokeReportPath, 'utf8'));
  } catch {
    return { status: 'unavailable', reason: 'SSH smoke report not found' };
  }
}

function detectRepositoryEnvironment(repoRoot) {
  return detectEnvironment({
    openharmony: existsSync(join(repoRoot, 'build.sh'))
      && existsSync(join(repoRoot, 'test/testfwk/developer_test')),
    harmonyos_system: existsSync(join(repoRoot, 'build_system.sh')),
    harmonyos_chip: existsSync(join(repoRoot, 'build_vendor.sh')),
  });
}

function errorBody(error) {
  return {
    code: error.code ?? 'validation_error',
    message: error.message,
    details: error.details ?? {},
  };
}

function inside(root, candidate) {
  const remainder = relative(root, candidate);
  return remainder === '' || (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !remainder.startsWith(sep));
}

async function realPathWithMissingLeaf(candidate) {
  let current = resolve(candidate);
  const missing = [];
  while (true) {
    try {
      const existing = await realpath(current);
      return resolve(existing, ...missing.reverse());
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const parent = resolve(current, '..');
      if (parent === current) throw error;
      missing.push(current.slice(parent.length + 1));
      current = parent;
    }
  }
}

async function workspacePath(root, value, label) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const rootReal = await realpath(root).catch((error) => {
    throw Object.assign(new Error('registered workspace does not exist'), {
      code: 'workspace_not_found', details: { root, cause: error.message },
    });
  });
  const candidate = resolve(isAbsolute(value) ? value : join(root, value));
  let candidateReal;
  try {
    candidateReal = await realPathWithMissingLeaf(candidate);
  } catch (error) {
    throw Object.assign(new Error(`${label} cannot be resolved safely`), {
      code: 'path_outside_workspace', details: { label, path: value, cause: error.message },
    });
  }
  if (!inside(rootReal, candidateReal)) {
    throw Object.assign(new Error(`${label} must stay inside the registered workspace`), {
      code: 'path_outside_workspace', details: { label, path: value, workspace: rootReal },
    });
  }
  return candidateReal;
}

export function createLocalConsoleServer({
  repoRoot = DEFAULT_REPO_ROOT,
  smokeReportPath = join(repoRoot, 'products/dsh-cloud-implementation/smoke-test-20260912.json'),
  stateFile = join(process.env.TMPDIR ?? '/tmp', 'dsh-local-console/state.json'),
  ragIndexFile = null,
  ragModelAdapter = null,
  ragModelEndpoint = null,
  ragModelApiKey = null,
  ragModelEmbeddingPath = '/embeddings',
  ragModelRerankPath = '/rerank',
  deliveryScriptsRoot = null,
  deliveryBridgePath = null,
  agentSettingsFile = null,
  runtimeService = null,
  scheduler = undefined,
  preflight = undefined,
  codeAgentEnv = process.env,
  codeAgentTimeoutMs,
  codeAgentMaxOutputBytes,
  processSupervisorOptions = {},
  buildExecution = false,
  deviceAccess = false,
  networkPublish = false,
  hdcCommand = 'hdc',
  gitCommand = 'git',
} = {}) {
  const root = resolve(repoRoot);
  const store = new LocalRunStore({ repoRoot: root, stateFile });
  const settings = new LocalCodeAgentSettings({
    settingsFile: resolve(agentSettingsFile ?? join(dirname(resolve(stateFile)), 'codeagent-settings.json')),
  });
  let agentsPromise = probeLocalAgents({ env: codeAgentEnv });
  const getAgents = (refresh = false) => {
    if (refresh) agentsPromise = probeLocalAgents({ env: codeAgentEnv });
    return agentsPromise;
  };
  const getAgentSettingsSnapshot = async (refresh = false) => {
    const discovered = { ...(await getAgents(refresh)) };
    const custom = settings.snapshot().custom;
    discovered.custom = custom?.command
      ? await probeLocalAgent('custom', custom.command, { env: codeAgentEnv })
      : { name: 'custom', status: 'not_configured', available: false, dispatchable: false, command: null, path: null, version: null };
    return discovered;
  };
  const ragAdapter = ragModelAdapter ?? ((ragModelEndpoint ?? codeAgentEnv?.DSH_RAG_ENDPOINT) ? new HttpRagModelAdapter({
    endpoint: ragModelEndpoint ?? codeAgentEnv?.DSH_RAG_ENDPOINT,
    apiKey: ragModelApiKey ?? codeAgentEnv?.DSH_RAG_API_KEY ?? null,
    embeddingPath: ragModelEmbeddingPath,
    rerankPath: ragModelRerankPath,
  }) : null);
  const rag = new LocalRagIndex({ root, ...(ragIndexFile ? { indexFile: resolve(ragIndexFile) } : {}), modelAdapter: ragAdapter });
  const codeAgentExecutor = new LocalCodeAgentExecutor({
    timeoutMs: codeAgentTimeoutMs,
    maxOutputBytes: codeAgentMaxOutputBytes,
    env: codeAgentEnv,
  });
  const capabilityProbe = probeHostCapabilities({
    repoRoot: root,
    executor: codeAgentExecutor,
    env: codeAgentEnv,
    buildExecution,
    deviceAccess,
    networkPublish,
    hdcCommand,
    gitCommand,
  });
  const arRuntime = runtimeService ?? new ArRuntimeService({
    dataRoot: join(dirname(resolve(stateFile)), 'runtime'),
    deliveryScriptsRoot,
    deliveryBridgePath,
    hostBindingId: 'dsh-local-console',
    hostKind: 'other',
    hostVersion: process.version,
    hostCapabilities: capabilityProbe.capabilities,
    capabilitySource: capabilityProbe.capability_source,
  });
  const ownsRuntime = runtimeService === null;
  // Share the authoritative runtime SQLite connection with the local
  // CodeAgent supervisor. This makes a single-node DSH deployment recover
  // local CLI processes with the same durable state used by the scheduler;
  // injected test runtimes without a database keep the in-memory executor.
  const processJournalDb = arRuntime.runtime?.store?.db ?? null;
  const processSupervisor = processJournalDb
    ? new ProcessSupervisor({
      db: processJournalDb,
      ...(Number.isSafeInteger(codeAgentMaxOutputBytes) ? { maxOutputBytes: codeAgentMaxOutputBytes } : {}),
      ...cgroupOptionsFromEnv(codeAgentEnv),
      ...(processSupervisorOptions && typeof processSupervisorOptions === 'object' ? processSupervisorOptions : {}),
    })
    : null;
  if (processSupervisor) codeAgentExecutor.processSupervisor = processSupervisor;
  const arScheduler = scheduler !== undefined ? scheduler : (runtimeService === null ? new ArDeliveryScheduler({
    service: arRuntime,
    resolveAgent: async (id, model) => {
      const discovered = await getAgents();
      const canonical = canonicalAgentId(id) ?? id;
      if (canonical === 'custom') {
        const configured = settings.snapshot().custom;
        if (!configured) return { id: 'custom', name: 'Custom CodeAgent', available: false, dispatchable: false, status: 'not_configured' };
        const probeResult = await probeLocalAgent('custom', configured.command, { env: codeAgentEnv });
        const available = probeResult.status === 'available';
        return {
          id: 'custom', name: configured.name, kind: 'local-cli', adapter: 'argv-cli', protocol: configured.protocol,
          command: configured.command, args: configured.args, available, dispatchable: available,
          status: probeResult.status, version: probeResult.version ?? null,
          ...(typeof model === 'string' && model.trim() !== '' ? { model: model.trim() } : {}),
        };
      }
      const key = canonical === 'claude-code' ? 'claude_code' : canonical;
      const probe = discovered[key];
      if (!probe) return { id, name: id, available: false, dispatchable: false, status: 'missing' };
      const available = probe.status === 'available';
      const adapter = key === 'claude_code' ? 'claude-code-cli' : key === 'opencode' ? 'opencode-cli' : key === 'codex' ? 'codex-cli' : null;
      const dispatchable = available && adapter !== null;
      return {
        id: canonical,
        name: key === 'claude_code' ? 'Claude Code' : id,
        kind: 'local-cli',
        adapter,
        command: probe.command,
        available,
        dispatchable,
        status: probe.status,
        version: probe.version ?? null,
        reason: probe.reason ?? (available && !dispatchable ? 'local execution adapter is not installed' : null),
        ...(typeof model === 'string' && model.trim() !== '' ? { model: model.trim() } : {}),
      };
    },
    executor: codeAgentExecutor,
  }) : null);
  const ownsScheduler = scheduler === undefined && runtimeService === null;
  let debugSnapshot;
  async function getDebugSnapshot(refresh = false) {
    if (!debugSnapshot || refresh) debugSnapshot = await probeDebugSurface(root);
    return debugSnapshot;
  }
  async function resolvePreflightAgent(agentId, model) {
    const selected = canonicalAgentId(agentId ?? settings.snapshot().selected) ?? agentId ?? settings.snapshot().selected;
    const key = selected === 'claude-code' ? 'claude_code' : selected;
    const discovered = await getAgentSettingsSnapshot();
    const probe = discovered[key];
    const available = probe?.available === true;
    const dispatchable = available && ['claude-code', 'opencode', 'codex', 'custom'].includes(selected);
    return {
      id: selected,
      name: probe?.name ?? selected,
      available,
      dispatchable,
      execution_mode: 'local_cli',
      source: 'local-console',
      command: probe?.command ?? null,
      path: probe?.path ?? null,
      version: probe?.version ?? null,
      status: probe?.status ?? 'missing',
      reason: available && !dispatchable ? 'local_execution_adapter_unavailable' : probe?.reason ?? null,
      ...(typeof model === 'string' && model.trim() !== '' ? { model: model.trim() } : {}),
    };
  }
  async function runLocalPreflight(input = {}) {
    if (typeof preflight === 'function') return preflight(input);
    const workspaceId = input.workspace_id ?? 'wsl-local';
    const workspace = store.workspaces().find((item) => item.workspace_id === workspaceId);
    if (!workspace) throw Object.assign(new Error('workspace not found'), { code: 'workspace_not_found' });
    const workspaceRoot = resolve(workspace.code_root);
    const sourceRoot = input.repo_root || input.source_root
      ? await workspacePath(workspaceRoot, input.repo_root || input.source_root, 'repo_root')
      : workspaceRoot;
    const debug = await getDebugSnapshot(true);
    const selectedAgent = await resolvePreflightAgent(input.agent, input.model);
    const targetDevice = debug?.device_probe ?? {};
    const hasArText = Object.hasOwn(input, 'ar_text');
    const hasArPath = Object.hasOwn(input, 'ar_path');
    const effectiveArPath = hasArPath
      ? input.ar_path
      : (!hasArText ? join(sourceRoot, MANIFEST_PATH) : null);
    return probeLocalPrerequisites({
      repoRoot: sourceRoot,
      deliveryScriptsRoot,
      deliveryBridgePath,
      agent: selectedAgent,
      pythonCommand: codeAgentEnv?.DSH_PYTHON_BIN ?? 'python3',
      gitCommand,
      hdcCommand,
      environment: {
        selected: input.environment ?? null,
        component_type: input.component_type ?? null,
        device_type: input.device_type ?? null,
        profile_bound: false,
      },
      device: {
        configured: Boolean(input.device_serial || input.device_type),
        reachable: targetDevice.status === 'available',
        serial: input.device_serial ?? null,
      },
      publication: {
        configured: Boolean(input.publication?.backend && (input.publication.repo_slug || input.publication.project || input.publication.target) && input.publication.branch),
        authenticated: networkPublish === true,
        backend: input.publication?.backend ?? null,
        target: input.publication?.repo_slug ?? input.publication?.project ?? input.publication?.target ?? null,
      },
      arPath: effectiveArPath,
      arText: hasArText ? input.ar_text : null,
      env: codeAgentEnv,
    });
  }
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    try {
      if (req.method === 'GET' && url.pathname === '/healthz') {
        send(res, 200, { status: 'ok', service: 'dsh-local-console' });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/') {
        send(res, 200, HTML, 'text/html; charset=utf-8');
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/status') {
        send(res, 200, {
          implementation_status: 'local_foundation',
          service: 'dsh-local-console',
          topology: 'windows-local-to-wsl-ssh',
          node: process.version,
          environment: detectRepositoryEnvironment(root),
          ssh_smoke: await loadSmokeReport(smokeReportPath),
          projects: store.projects(),
          workspaces: store.workspaces(),
          recent_runs: store.runs().slice(0, 10),
          agents: await getAgentSettingsSnapshot(),
          agent_settings: settings.snapshot(),
          rag: rag.status(),
          debug: await getDebugSnapshot(),
          ar_runtime: { status: 'available', source_of_truth: 'runtime/dsh-ohos SQLite + Python gate evidence' },
          capabilities: {
            contracts: 'available',
            authority_envelope: 'available',
            dsh_scheduler: arScheduler ? 'active' : 'manual',
            local_codeagent: arScheduler ? 'process_executor' : 'version_probe_only',
            rag: rag.profile().execution === 'active' ? 'embedding_reranker_or_lexical' : 'local_lexical_fallback',
            device_debug: 'read_only_probe',
            host_probe: capabilityProbe,
          },
        });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/agents') {
        send(res, 200, await getAgents());
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/agents/refresh') {
        send(res, 200, await getAgents(true));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/agent-settings') {
        send(res, 200, { settings: settings.snapshot(), agents: await getAgentSettingsSnapshot() });
        return;
      }
      if (req.method === 'PUT' && url.pathname === '/api/agent-settings') {
        const value = await settings.update(await readJson(req));
        send(res, 200, { settings: value, agents: await getAgentSettingsSnapshot() });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/projects') {
        send(res, 200, { projects: store.projects() });
        return;
      }
      const projectEnvironmentPath = url.pathname.match(/^\/api\/projects\/([^/]+)\/environment$/);
      if (projectEnvironmentPath && req.method === 'POST') {
        const body = await readJson(req);
        const project = store.setEnvironmentSelection(projectEnvironmentPath[1], {
          environment: body.environment,
          componentType: body.component_type,
        });
        send(res, 200, { project, profile_status: 'incomplete_until_full_profile_is_bound' });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/workspaces') {
        send(res, 200, { workspaces: store.workspaces() });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/rag/status') {
        send(res, 200, rag.status());
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/rag/index') {
        send(res, 200, await rag.refresh());
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/rag/profile') {
        send(res, 200, rag.profile());
        return;
      }
      if (req.method === 'PUT' && url.pathname === '/api/rag/profile') {
        send(res, 200, await rag.updateProfile(await readJson(req)));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/rag/search') {
        send(res, 200, await rag.search((await readJson(req)).query));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/debug/status') {
        send(res, 200, await getDebugSnapshot());
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/debug/scan') {
        send(res, 200, await getDebugSnapshot(true));
        return;
      }
      if ((req.method === 'GET' || req.method === 'POST') && url.pathname === '/api/ar/preflight') {
        const body = req.method === 'POST' ? await readJson(req) : {};
        const input = {
          ...body,
          workspace_id: body.workspace_id ?? url.searchParams.get('workspace_id') ?? 'wsl-local',
          repo_root: body.repo_root ?? url.searchParams.get('repo_root') ?? undefined,
          source_root: body.source_root ?? url.searchParams.get('source_root') ?? undefined,
          environment: body.environment ?? url.searchParams.get('environment') ?? null,
          component_type: body.component_type ?? url.searchParams.get('component_type') ?? null,
          device_type: body.device_type ?? url.searchParams.get('device_type') ?? null,
          device_serial: body.device_serial ?? url.searchParams.get('device_serial') ?? null,
          agent: body.agent ?? url.searchParams.get('agent') ?? null,
          model: body.model ?? url.searchParams.get('model') ?? null,
        };
        send(res, 200, await runLocalPreflight(input));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/ar/runs') {
        send(res, 200, {
          runs: arRuntime.listRuns ? arRuntime.listRuns() : [],
          scheduler: arScheduler?.listJobs ? { enabled: true, jobs: arScheduler.listJobs() } : { enabled: false, jobs: [] },
        });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/ar/runs') {
        const body = await readJson(req);
        const workspace = store.workspaces().find((item) => item.workspace_id === body.workspace_id);
        if (!workspace) throw Object.assign(new Error('workspace not found'), { code: 'workspace_not_found' });
        const workspaceRoot = resolve(workspace.code_root);
        const sourceRoot = await workspacePath(
          workspaceRoot, body.repo_root || body.source_root || workspaceRoot, 'repo_root');
        // Preserve the distinction between an omitted input and an explicitly
        // empty one. An empty `ar_text` must fail closed in the runtime rather
        // than silently falling back to the bundled sample; likewise an
        // explicitly blank `ar_path` must not select a default file.
        const hasArText = Object.hasOwn(body, 'ar_text');
        const hasArPath = Object.hasOwn(body, 'ar_path');
        const requestedArPath = hasArPath
          ? body.ar_path
          : (!hasArText ? join(sourceRoot, MANIFEST_PATH) : null);
        const arPath = requestedArPath === null || requestedArPath === undefined || requestedArPath === ''
          ? null
          : await workspacePath(sourceRoot, requestedArPath, 'ar_path');
        const pipelineDir = body.pipeline_dir
          ? await workspacePath(sourceRoot, body.pipeline_dir, 'pipeline_dir') : undefined;
        const gitDir = body.git_dir
          ? await workspacePath(sourceRoot, body.git_dir, 'git_dir') : undefined;
        // The real local runtime owns the executable scheduler, so enforce the
        // same fail-closed P0 check as the official DSH route. Injected test or
        // embedding runtimes can provide an explicit preflight callback and
        // receive the same enforcement; legacy read-only fakes remain usable.
        if (ownsRuntime || typeof preflight === 'function') {
          const preflightResult = await runLocalPreflight({
            ...body,
            workspace_id: body.workspace_id,
            repo_root: sourceRoot,
          });
          if (preflightResult?.can_start_p0 !== true) {
            const blocked = (preflightResult?.checks ?? [])
              .filter((item) => ['blocked', 'failed'].includes(item.status))
              .map((item) => `${item.label ?? item.id}: ${item.reason ?? '需要处理'}`)
              .join('；');
            throw Object.assign(new Error(`AR P0 前置检查阻断${blocked ? `：${blocked}` : ''}`), {
              code: 'preflight_blocked',
              details: {
                status: preflightResult?.status ?? 'blocked',
                checks: preflightResult?.checks ?? [],
                execution_plan: preflightResult?.execution_plan ?? null,
              },
            });
          }
        }
        const startInput = {
          runId: body.run_id,
          inputRef: body.input_ref,
          arText: body.ar_text,
          arPath,
          pipelineDir,
          repoRoot: sourceRoot,
          environment: body.environment,
          componentType: body.component_type,
          deviceType: body.device_type,
          deviceSerial: body.device_serial,
          gitDir,
          buildTarget: body.build_target,
          part: body.part,
          baseCommit: body.base_commit,
          agent: body.agent ?? settings.snapshot().selected,
          model: body.model ?? settings.snapshot().model,
          confirmDefaults: body.confirm_defaults,
          skills: body.skills,
          publication: body.publication,
          idempotencyKey: body.idempotency_key,
        };
        const result = arScheduler?.start
          ? await arScheduler.start(startInput)
          : await arRuntime.start(startInput);
        send(res, 202, result);
        return;
      }
      const arRunPath = url.pathname.match(/^\/api\/ar\/runs\/([^/]+)(?:\/(artifacts|events|claim|context|submit|validate|consent|sync|heartbeat|release|scheduler|resume|cancel|inputs|actions))?$/);
      if (arRunPath && req.method === 'GET' && !arRunPath[2]) {
        const status = await arRuntime.status(arRunPath[1], Number(url.searchParams.get('cursor') ?? 0));
        if (arScheduler?.job) status.scheduler = arScheduler.job(arRunPath[1]);
        send(res, 200, status);
        return;
      }
      if (arRunPath && req.method === 'GET' && arRunPath[2] === 'scheduler') {
        if (!arScheduler?.job) throw Object.assign(new Error('scheduler is unavailable'), { code: 'scheduler_unavailable' });
        const job = arScheduler.job(arRunPath[1]);
        if (!job) throw Object.assign(new Error(`scheduler job ${arRunPath[1]} does not exist`), { code: 'scheduler_job_not_found' });
        send(res, 200, job);
        return;
      }
      const arArtifactContentPath = url.pathname.match(/^\/api\/ar\/runs\/([^/]+)\/artifacts\/content$/);
      if (arArtifactContentPath && req.method === 'GET') {
        if (!arRuntime.artifactContent) {
          throw Object.assign(new Error('artifact content is unavailable'), { code: 'runtime_tool_unavailable' });
        }
        const requestedPath = url.searchParams.get('path');
        if (!requestedPath) throw Object.assign(new Error('artifact path is required'), { code: 'invalid_input' });
        send(res, 200, await arRuntime.artifactContent(arArtifactContentPath[1], requestedPath));
        return;
      }
      if (arRunPath && req.method === 'GET' && arRunPath[2] === 'artifacts') {
        send(res, 200, await arRuntime.artifacts(arRunPath[1]));
        return;
      }
      if (arRunPath && req.method === 'GET' && arRunPath[2] === 'events') {
        const status = await arRuntime.status(arRunPath[1], Number(url.searchParams.get('cursor') ?? 0));
        send(res, 200, { run_id: arRunPath[1], events: status.events, next_cursor: status.next_cursor });
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'claim') {
        const body = await readJson(req);
        send(res, 200, await arRuntime.claim({ runId: arRunPath[1], role: body.role,
          expectedRevision: body.expected_revision, contextId: body.context_id }));
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'context') {
        send(res, 200, await arRuntime.context(await readJson(req)));
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'heartbeat') {
        send(res, 200, await arRuntime.heartbeat(await readJson(req)));
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'submit') {
        const body = await readJson(req);
        send(res, 200, await arRuntime.submit({
          attemptId: body.attempt_id, leaseEpoch: body.lease_epoch,
          taskCredential: body.task_credential, revision: body.revision,
          artifactRefs: body.artifact_refs, summary: body.summary,
        }));
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'release') {
        const body = await readJson(req);
        send(res, 200, await arRuntime.release({
          attemptId: body.attempt_id, leaseEpoch: body.lease_epoch,
          taskCredential: body.task_credential, reason: body.reason,
          artifactRefs: body.artifact_refs,
        }));
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'validate') {
        const body = await readJson(req);
        send(res, 200, await arRuntime.validate({ runId: arRunPath[1], taskId: body.task_id,
          expectedRevision: body.expected_revision }));
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'consent') {
        const body = await readJson(req);
        const input = { runId: arRunPath[1], taskId: body.task_id,
          phase: body.phase, token: body.token };
        if (body.content !== undefined) input.content = body.content;
        if (body.actor !== undefined) input.actor = body.actor;
        if (body.kind !== undefined) input.kind = body.kind;
        send(res, 200, await (arScheduler?.consent ? arScheduler.consent(input) : arRuntime.consent(input)));
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'inputs') {
        if (!arRuntime.recordHumanInput) throw Object.assign(new Error('human input recording is unavailable'), { code: 'runtime_tool_unavailable' });
        const body = await readJson(req);
        send(res, 201, await arRuntime.recordHumanInput({ runId: arRunPath[1], taskId: body.task_id,
          phase: body.phase, kind: body.kind, category: body.category,
          actor: body.actor, idempotencyKey: body.idempotency_key, content: body.content }));
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'resume') {
        if (!arScheduler?.resume) throw Object.assign(new Error('scheduler is unavailable'), { code: 'scheduler_unavailable' });
        send(res, 200, await arScheduler.resume(arRunPath[1]));
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'cancel') {
        if (!arScheduler?.cancel) throw Object.assign(new Error('scheduler is unavailable'), { code: 'scheduler_unavailable' });
        const body = await readJson(req);
        send(res, 200, await arScheduler.cancel(arRunPath[1], body.reason));
        return;
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'actions') {
        const body = await readJson(req);
        if (body.action === 'cancel' && arScheduler?.cancel) {
          send(res, 200, await arScheduler.cancel(arRunPath[1], body.reason));
          return;
        }
        if (body.action === 'resume' && arScheduler?.resume) {
          send(res, 200, await arScheduler.resume(arRunPath[1]));
          return;
        }
        throw Object.assign(new Error(`unsupported action: ${body.action}`), { code: 'action_not_supported' });
      }
      if (arRunPath && req.method === 'POST' && arRunPath[2] === 'sync') {
        send(res, 200, await arRuntime.sync(arRunPath[1]));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/runs') {
        send(res, 200, { runs: store.runs() });
        return;
      }
      const runPath = url.pathname.match(/^\/api\/runs\/([^/]+)(?:\/(artifacts|events|inputs|actions))?$/);
      if (runPath && req.method === 'GET' && !runPath[2]) {
        send(res, 200, store.getRun(runPath[1]));
        return;
      }
      if (runPath && req.method === 'GET' && runPath[2] === 'artifacts') {
        send(res, 200, { artifacts: store.artifacts(runPath[1]) });
        return;
      }
      if (runPath && req.method === 'GET' && runPath[2] === 'events') {
        send(res, 200, { events: store.events(runPath[1]) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/runs') {
        const body = await readJson(req);
        const run = store.createRun({
          workflowId: body.workflow_id,
          workspaceId: body.workspace_id,
          sourceRoot: body.source_root,
        });
        setImmediate(() => {
          try {
            store.executeEnvironmentProbe(run.run_id);
          } catch {
            // The run remains inspectable; the persisted run status is the
            // source of truth and the caller can request it again.
          }
        });
        send(res, 202, { run_id: run.run_id, status: run.status, current_stage: run.current_stage });
        return;
      }
      if (runPath && req.method === 'POST' && runPath[2] === 'inputs') {
        const input = store.addInput(runPath[1], await readJson(req));
        send(res, 201, input);
        return;
      }
      if (runPath && req.method === 'POST' && runPath[2] === 'actions') {
        const body = await readJson(req);
        send(res, 200, store.action(runPath[1], body.action));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/example/manifest') {
        send(res, 200, JSON.parse(await readFile(join(root, MANIFEST_PATH), 'utf8')));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/validate/manifest') {
        const body = await readJson(req);
        try {
          const manifest = validateArDeliveryManifest(body.manifest, {
            installable: body.installable !== false,
          });
          send(res, 200, { valid: true, workflow_id: manifest.workflow_id, stages: manifest.stages.length });
        } catch (error) {
          send(res, 200, { valid: false, error: errorBody(error) });
        }
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/validate/envelope') {
        const body = await readJson(req);
        try {
          const envelope = validateAuthorityEnvelope(body.envelope, { expected: body.expected ?? {} });
          send(res, 200, { valid: true, message_type: envelope.message_type, operation_id: envelope.operation_id ?? null });
        } catch (error) {
          send(res, 200, { valid: false, error: errorBody(error) });
        }
        return;
      }
      send(res, 404, { error: { code: 'not_found', message: 'route not found' } });
    } catch (error) {
      const status = error.code === 'body_too_large' || error.code === 'invalid_json'
        || error.code === 'workflow_not_available' || error.code === 'workspace_not_found'
        || error.code === 'run_not_found' || error.code === 'input_kind_required'
        || error.code === 'input_content_required' || error.code === 'rag_query_required'
        || error.code === 'rag_query_too_long' || error.code === 'environment_selection_invalid'
        || error.code === 'project_not_found' || error.code === 'source_root_outside_workspace'
        || error.code === 'path_outside_workspace' || error.code === 'workspace_not_found'
        || error.code === 'runtime_tool_unavailable' || error.code === 'invalid_input'
        || error.code === 'scheduler_job_not_found' || error.code === 'scheduler_unavailable'
        || error.code === 'scheduler_closed' || error.code === 'agent_settings_invalid'
        || error.code === 'custom_agent_invalid' || error.code === 'settings_secret_forbidden'
        || error.code === 'agent_settings_path_invalid' || error.code === 'agent_settings_persist_failed'
        || error.code === 'input_content_required' || error.code === 'input_content_too_large'
        || error.code === 'artifact_not_found' || error.code === 'rag_query_invalid'
        || error.code === 'rag_model_profile_invalid' || error.code === 'rag_profile_busy'
        || error.code === 'rag_model_request_failed' || error.code === 'rag_model_response_invalid'
        || error.code === 'rag_index_outside_workspace'
        || error.code === 'agent_context_invalid' || error.code === 'agent_context_outside_workspace'
        || error.code === 'remote_workspace_invalid' || error.code === 'remote_workspace_outside_root'
        || error.code === 'preflight_blocked'
        || error.code === 'action_not_supported'
        || error.code === 'workflow_not_available' ? 400
        : ['rag_workspace_changed_during_index', 'source_changed', 'resource_busy',
          'resource_lock_reconcile_failed'].includes(error.code) ? 409
          : ['rag_index_failed', 'codeagent_adapter_unavailable', 'codeagent_command_missing',
            'codeagent_spawn_failed', 'codeagent_timeout', 'codeagent_output_limit',
            'codeagent_failed', 'codeagent_cancelled', 'agent_artifacts_missing',
            'agent_artifact_invalid'].includes(error.code) ? 422 : 500;
      send(res, status, { error: errorBody(error) });
    }
  });
  if (ownsScheduler) server.on('close', () => arScheduler?.close?.());
  if (ownsRuntime) server.on('close', () => arRuntime.close());
  return server;
}

const entrypoint = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (entrypoint) {
  const host = process.env.DSH_CONSOLE_HOST ?? '127.0.0.1';
  const port = Number(process.env.DSH_CONSOLE_PORT ?? 8787);
  const repoRoot = process.env.DSH_CONSOLE_REPO_ROOT ?? DEFAULT_REPO_ROOT;
  const stateFile = process.env.DSH_CONSOLE_STATE_FILE;
  const smokeReportPath = process.env.DSH_CONSOLE_SMOKE_REPORT;
  const agentSettingsFile = process.env.DSH_CONSOLE_AGENT_SETTINGS_FILE;
  const server = createLocalConsoleServer({
    repoRoot,
    ...(stateFile ? { stateFile } : {}),
    ...(smokeReportPath ? { smokeReportPath } : {}),
    ...(agentSettingsFile ? { agentSettingsFile } : {}),
  });
  server.listen(port, host, () => {
    process.stdout.write(`DSH local console listening on http://${host}:${port}\n`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
