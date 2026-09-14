import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { detectEnvironment } from '../../../packages/contracts/src/environment-profile.js';
import { validateArDeliveryManifest } from '../../../packages/workflow-registry/src/manifest.js';
import { validateAuthorityEnvelope } from '../../../../workspace-gateway/src/authority/envelope.js';
import { LocalRunStore } from './store.js';
import { probeLocalAgents } from './agents.js';
import { probeDebugSurface } from './debug.js';
import { LocalRagIndex } from './rag.js';
import { ArRuntimeService } from './ar-runtime.js';

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
    <section class="card"><h2>运行 AR 环境预检</h2><p>这会创建一个 P0 run，读取 WSL 代码根标志并生成环境报告。</p><button id="start-run">运行 P0 预检</button><pre id="runs">暂无 run</pre></section>
    <section class="card"><h2>人工输入</h2><input id="run-id" placeholder="run_id" style="width:100%;box-sizing:border-box;margin-bottom:8px;background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:10px"><textarea id="input-content" placeholder="给当前 run 的补充说明"></textarea><button id="submit-input">记录人工输入</button><pre id="input-result"></pre></section>
    <section class="card"><h2>Agent / RAG / 调试</h2><button id="refresh-capabilities" class="secondary">刷新能力</button> <button id="index-rag">建立本地索引</button><pre id="capabilities">加载中…</pre><input id="rag-query" placeholder="检索代码，例如 environment profile" style="width:100%;box-sizing:border-box;margin:8px 0;background:#0c1016;color:#e8edf5;border:1px solid #35445a;border-radius:8px;padding:10px"><button id="search-rag" class="secondary">检索</button><pre id="rag-result"></pre></section>
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
const runDetailNode = document.querySelector('#run-detail');
async function loadStatus() {
  const response = await fetch('/api/status');
  const value = await response.json();
  statusNode.textContent = JSON.stringify(value, null, 2);
  capabilitiesNode.textContent = JSON.stringify({ agents: value.agents, capabilities: value.capabilities, rag: value.rag, debug: value.debug }, null, 2);
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
document.querySelector('#search-rag').addEventListener('click', async () => {
  const response = await fetch('/api/rag/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: ragQueryNode.value }) });
  ragResultNode.textContent = JSON.stringify(await response.json(), null, 2);
});
loadStatus();
loadRuns();
setInterval(loadRuns, 3000);
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

export function createLocalConsoleServer({
  repoRoot = DEFAULT_REPO_ROOT,
  smokeReportPath = join(repoRoot, 'products/dsh-cloud-implementation/smoke-test-20260912.json'),
  stateFile = join(process.env.TMPDIR ?? '/tmp', 'dsh-local-console/state.json'),
  runtimeService = null,
} = {}) {
  const root = resolve(repoRoot);
  const store = new LocalRunStore({ repoRoot: root, stateFile });
  const agents = probeLocalAgents();
  const rag = new LocalRagIndex({ root });
  const arRuntime = runtimeService ?? new ArRuntimeService({
    dataRoot: join(dirname(resolve(stateFile)), 'runtime'),
    hostKind: 'claude-code',
  });
  const ownsRuntime = runtimeService === null;
  let debugSnapshot;
  async function getDebugSnapshot(refresh = false) {
    if (!debugSnapshot || refresh) debugSnapshot = await probeDebugSurface(root);
    return debugSnapshot;
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
          agents: await agents,
          rag: rag.status(),
          debug: await getDebugSnapshot(),
          ar_runtime: { status: 'available', source_of_truth: 'runtime/dsh-ohos SQLite + Python gate evidence' },
          capabilities: {
            contracts: 'available',
            authority_envelope: 'available',
            dsh_scheduler: 'local_preflight_only',
            local_codeagent: 'version_probe_only',
            rag: 'local_lexical_fallback',
            device_debug: 'read_only_probe',
          },
        });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/agents') {
        send(res, 200, await agents);
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
      if (req.method === 'GET' && url.pathname === '/api/ar/runs') {
        send(res, 200, { runs: arRuntime.listRuns ? arRuntime.listRuns() : [] });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/ar/runs') {
        const body = await readJson(req);
        const workspace = store.workspaces().find((item) => item.workspace_id === body.workspace_id);
        if (!workspace) throw Object.assign(new Error('workspace not found'), { code: 'workspace_not_found' });
        const sourceRoot = resolve(body.repo_root || body.source_root || workspace.code_root);
        const workspaceRoot = resolve(workspace.code_root);
        const remainder = relative(workspaceRoot, sourceRoot);
        if (!(remainder === '' || (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !isAbsolute(remainder)))) {
          throw Object.assign(new Error('repo_root must stay inside the registered workspace'), {
            code: 'source_root_outside_workspace',
          });
        }
        const result = await arRuntime.start({
          runId: body.run_id,
          inputRef: body.input_ref,
          arText: body.ar_text,
          arPath: body.ar_path,
          pipelineDir: body.pipeline_dir,
          repoRoot: sourceRoot,
          environment: body.environment,
          componentType: body.component_type,
          deviceType: body.device_type,
          deviceSerial: body.device_serial,
          gitDir: body.git_dir,
          buildTarget: body.build_target,
          part: body.part,
          baseCommit: body.base_commit,
          agent: body.agent,
          model: body.model,
          confirmDefaults: body.confirm_defaults,
          skills: body.skills,
          idempotencyKey: body.idempotency_key,
        });
        send(res, 202, result);
        return;
      }
      const arRunPath = url.pathname.match(/^\/api\/ar\/runs\/([^/]+)(?:\/(artifacts|events|claim|context|submit|validate|consent|sync|heartbeat|release))?$/);
      if (arRunPath && req.method === 'GET' && !arRunPath[2]) {
        send(res, 200, await arRuntime.status(arRunPath[1], Number(url.searchParams.get('cursor') ?? 0)));
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
        send(res, 200, await arRuntime.consent({ runId: arRunPath[1], taskId: body.task_id,
          phase: body.phase, token: body.token }));
        return;
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
            // The run remains inspectable; a future durable supervisor will persist this failure.
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
        || error.code === 'runtime_tool_unavailable' || error.code === 'invalid_input'
        || error.code === 'workflow_not_available' ? 400 : 500;
      send(res, status, { error: errorBody(error) });
    }
  });
  if (ownsRuntime) server.on('close', () => arRuntime.close());
  return server;
}

const entrypoint = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (entrypoint) {
  const host = process.env.DSH_CONSOLE_HOST ?? '127.0.0.1';
  const port = Number(process.env.DSH_CONSOLE_PORT ?? 8787);
  const server = createLocalConsoleServer({ repoRoot: DEFAULT_REPO_ROOT });
  server.listen(port, host, () => {
    process.stdout.write(`DSH local console listening on http://${host}:${port}\n`);
  });
}
