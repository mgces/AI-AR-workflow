const $ = (id) => document.getElementById(id);
const ui = {
  workspace: $('workspaceLabel'), health: $('healthList'), agents: $('agent'), environment: $('environment'),
  text: $('arText'), message: $('message'), preflight: $('preflight'), runs: $('runList'), detail: $('runDetail'),
};
let selectedRunId = null;
let workspaceDialogShown = false;
let chatSessionId = null;
let chatRunId = null;
let chatHistory = [];

function setMessage(message, error = false) {
  ui.message.textContent = message ?? '';
  ui.message.classList.toggle('error', error);
}

function renderStartupFailure(failure) {
  const panel = $('startupFailure');
  panel.classList.toggle('hidden', !failure);
  if (!failure) return;
  $('startupFailureMessage').textContent = failure.message ?? '未知启动错误';
  $('startupFailureDetails').textContent = failure.code ? `错误代码：${failure.code}` : '';
  $('startupFailureRecovery').textContent = failure.recovery ?? '重试本机服务；如果仍失败，请复制错误信息反馈。';
}

function environmentInput() {
  const value = ui.environment.value;
  if (value === 'openharmony') return { environment: 'openharmony', component_type: null };
  if (value === 'harmonyos-system') return { environment: 'harmonyos', component_type: 'system' };
  if (value === 'harmonyos-chip') return { environment: 'harmonyos', component_type: 'chip' };
  return { environment: null, component_type: null };
}

function errorMessage(error) {
  if (error?.code === 'preflight_blocked' && error?.details?.preflight) {
    renderPreflight(error.details.preflight);
    return '环境检查发现阻断项，请按检查结果修复后重试。';
  }
  return error?.message ?? String(error);
}

function renderHealth(status) {
  const agents = status?.agents ?? {};
  const configuredAgent = status?.agent_settings?.selected ?? null;
  const selected = configuredAgent ? (agents[configuredAgent] ?? agents[configuredAgent.replace('-', '_')]) : null;
  const workspaces = status?.workspaces ?? [];
  const environment = status?.environment?.status === 'detected'
    ? `${status.environment.environment}${status.environment.component_type ? ` / ${status.environment.component_type}` : ''}`
    : status?.environment?.status === 'ambiguous' ? '检测到多个候选，需要确认' : '等待检测 / 人工确认';
  const rows = [
    ['CodeAgent', selected?.available ? `${selected.name ?? configuredAgent} · ${selected.version ?? '已发现'}` : '尚未就绪', selected?.available],
    ['源码目录', workspaces.length ? (workspaces[0].status ?? '已登记') : '尚未登记', workspaces.length > 0],
    ['工程类型', environment, status?.environment?.status === 'detected'],
    ['AR 运行时', status?.ar_runtime?.status ?? '检查中', status?.ar_runtime?.status === 'available'],
  ];
  ui.health.replaceChildren(...rows.map(([name, value, good]) => {
    const row = document.createElement('div'); row.className = 'health-row';
    const label = document.createElement('span'); label.className = 'health-name'; label.textContent = name;
    const state = document.createElement('span'); state.className = `health-state ${good ? 'good' : 'warn'}`; state.textContent = value;
    row.append(label, state); return row;
  }));
}

function renderAgents(snapshot, settings = {}) {
  const configured = settings.settings?.selected ?? settings.selected ?? null;
  const values = Object.entries(snapshot ?? {}).filter(([, item]) => item && typeof item === 'object');
  const options = values.map(([id, item]) => ({ id, item })).filter(({ item }) => item.dispatchable === true || item.available === true);
  ui.agents.replaceChildren();
  if (!options.length) {
    const option = document.createElement('option'); option.value = ''; option.textContent = '未发现可运行的 CodeAgent'; ui.agents.append(option);
    return;
  }
  for (const { id, item } of options) {
    const option = document.createElement('option'); option.value = id;
    option.textContent = `${item.name ?? id}${item.version ? ` · ${item.version}` : ''}`;
    ui.agents.append(option);
  }
  if (configured && [...ui.agents.options].some((option) => option.value === configured)) ui.agents.value = configured;
}

function renderPreflight(result) {
  const checks = Array.isArray(result?.checks) ? result.checks : [];
  ui.preflight.classList.remove('hidden');
  if (!checks.length) {
    ui.preflight.textContent = result?.status ?? result?.reason ?? '没有返回检查项';
    return;
  }
  ui.preflight.replaceChildren(...checks.map((check) => {
    const row = document.createElement('div'); row.className = 'check-row';
    const name = document.createElement('span'); name.className = 'check-name'; name.textContent = check.label ?? check.id ?? '检查项';
    const state = document.createElement('span');
    state.className = `check-state ${['pass', 'ready'].includes(check.status) ? 'pass' : ['blocked', 'failed'].includes(check.status) ? 'blocked' : ''}`;
    state.textContent = `${check.status ?? 'unknown'}${check.reason ? ` · ${check.reason}` : ''}`;
    row.append(name, state); return row;
  }));
}

function renderRuns(payload) {
  const runs = payload?.runs ?? [];
  if (!runs.length) {
    const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = '还没有运行记录。填写 AR 描述后，从 P0 环境检查开始。';
    ui.runs.replaceChildren(empty); return;
  }
  ui.runs.replaceChildren(...runs.slice(0, 8).map((run) => {
    const row = document.createElement('div'); row.className = 'run-row';
    const id = document.createElement('span'); id.className = 'run-id'; id.textContent = run.run_id;
    const phase = document.createElement('span'); phase.className = 'run-meta'; phase.textContent = run.current_phase ?? run.current_stage ?? 'P0';
    const status = document.createElement('span'); status.className = `status-chip ${run.status ?? ''}`; status.textContent = run.status ?? 'unknown';
    const time = document.createElement('span'); time.className = 'run-meta'; time.textContent = run.updated_at ?? run.created_at ?? '';
    const open = document.createElement('button'); open.className = 'quiet-button'; open.textContent = '查看';
    open.setAttribute('aria-label', `查看运行 ${run.run_id}`);
    open.addEventListener('click', () => void loadRunDetail(run.run_id));
    row.append(id, phase, status, time, open); return row;
  }));
}

function node(tag, className = '', text = '') {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined && text !== null) value.textContent = String(text);
  return value;
}

function bytes(value) {
  const size = Number(value);
  return Number.isFinite(size) ? `${(size / 1024).toFixed(size < 1024 ? 0 : 1)} KiB` : '未知大小';
}

function renderRunDetail(status, artifactPayload) {
  const run = status?.run ?? status?.summary ?? status ?? {};
  const observability = status?.observability ?? {};
  const taskRecords = Array.isArray(status?.tasks) ? status.tasks : [];
  const metricStages = Array.isArray(observability.stages) ? observability.stages : [];
  const tasks = metricStages.length
    ? metricStages.map((stage) => ({ ...stage, ...(taskRecords.find((task) => task.phase === stage.phase) ?? {}) }))
    : taskRecords;
  const events = Array.isArray(status?.events) ? status.events : [];
  const artifacts = Array.isArray(artifactPayload?.artifacts) ? artifactPayload.artifacts : [];
  $('detailStatus').textContent = `${run.status ?? status?.status ?? '运行中'} · ${status?.current_phase ?? observability.current_stage ?? ''}`;
  ui.detail.replaceChildren();

  const title = node('div', 'detail-title');
  const config = run.config ?? {};
  title.append(node('strong', '', run.run_id ?? selectedRunId), node('span', 'muted', `${config.environment ?? run.environment ?? '工程类型未识别'}${config.component_type || run.component_type ? ` / ${config.component_type ?? run.component_type}` : ''}`));
  ui.detail.append(title);

  const usage = observability.token_usage ?? {};
  const metrics = node('div', 'detail-metrics');
  for (const [label, value] of [
    ['当前阶段', observability.current_stage ?? status?.current_phase ?? '—'],
    ['阶段耗时', observability.wall_elapsed_ms == null ? '统计中' : `${Math.round(observability.wall_elapsed_ms / 1000)} 秒`],
    ['人工介入', observability.human_intervention_count ?? 0],
    ['Token', usage.total_tokens ?? '未上报'],
    ['成功次数', observability.run_success_count ?? (run.status === 'completed' ? 1 : 0)],
  ]) {
    const item = node('div', 'metric-tile'); item.append(node('span', 'muted', label), node('strong', '', value)); metrics.append(item);
  }
  ui.detail.append(metrics);

  const phases = node('div', 'detail-block');
  phases.append(node('h3', '', '阶段与门控'));
  const phaseItems = tasks.length ? tasks : [];
  if (!phaseItems.length) phases.append(node('div', 'empty-state', 'runtime 尚未返回阶段列表。'));
  for (const task of phaseItems) {
    const phaseRow = node('div', 'phase-row');
    const duration = task.wall_ms ?? task.elapsed_ms;
    const durationLabel = duration == null ? '耗时未知' : `${Math.round(duration / 1000)} 秒`;
    phaseRow.append(node('strong', 'phase-name', task.phase ?? task.key ?? task.stage ?? '阶段'), node('span', 'muted', `${task.role ?? ''} · ${durationLabel} · gate ${task.gate_pass_count ?? 0}/${task.gate_attempts ?? 0}`), node('span', `status-chip ${task.status ?? ''}`, task.status ?? 'unknown'));
    if (task.failure_reason || task.reason) phaseRow.append(node('div', 'phase-error', task.failure_reason ?? task.reason));
    phases.append(phaseRow);
  }
  ui.detail.append(phases);

  const blockers = Array.isArray(observability.current_blockers) ? observability.current_blockers : [];
  const failures = Array.isArray(observability.failure_reasons) ? observability.failure_reasons : [];
  if (blockers.length || failures.length || status?.scheduler?.last_error) {
    const problemPanel = node('div', 'detail-block');
    problemPanel.append(node('h3', '', '当前阻断与失败原因'));
    for (const blocker of blockers) problemPanel.append(node('div', 'problem-row', `${blocker.phase ?? ''} · ${blocker.code ?? 'blocked'} · ${blocker.message ?? '需要处理'}`));
    for (const failure of failures.slice(-8)) problemPanel.append(node('div', 'problem-row', `${failure.phase ?? ''} · ${failure.code ?? failure.type ?? 'failure'} · ${failure.message ?? ''}`));
    if (status?.scheduler?.last_error) problemPanel.append(node('pre', 'event-payload', JSON.stringify(status.scheduler.last_error, null, 2)));
    ui.detail.append(problemPanel);
  }

  const review = node('div', 'detail-block');
  review.append(node('h3', '', `审核产物 (${artifacts.length})`));
  if (!artifacts.length) review.append(node('div', 'empty-state', '当前运行还没有可展示的审核产物。'));
  for (const artifact of artifacts) {
    const row = node('div', 'artifact-row');
    const meta = node('div', 'artifact-meta');
    meta.append(node('strong', '', artifact.filename ?? artifact.relative_path), node('span', 'muted', `${artifact.role ?? 'artifact'} · ${bytes(artifact.size_bytes)} · SHA-256 ${String(artifact.sha256 ?? '').slice(0, 12)}`));
    const reviewSelect = node('label', 'review-select');
    const choose = node('input'); choose.type = 'checkbox'; choose.dataset.reviewArtifact = 'true'; choose.value = artifact.relative_path ?? '';
    choose.disabled = !/\.(?:c|cc|cpp|h|hpp|gn|gni|md|txt|log|patch|diff|py|sh|ts|js|mjs|cjs|ets|idl|xml|yaml|yml|toml|ini|json|jsonl|pdf|png|jpe?g)$/iu.test(String(artifact.relative_path ?? ''));
    reviewSelect.append(choose, node('span', '', choose.disabled ? '不支持云端预览' : '选择上传审核'));
    row.append(reviewSelect, meta);
    if (artifact.content_available !== false && artifact.binary !== true) {
      const view = node('button', 'quiet-button', '查看全文');
      view.addEventListener('click', async () => {
        try {
          const full = await window.dsh.getArtifactContent(selectedRunId, artifact.relative_path);
          const preview = ui.detail.querySelector('[data-artifact-preview]') ?? node('pre', 'artifact-preview');
          preview.dataset.artifactPreview = 'true'; preview.textContent = full.content ?? '[该产物没有文本正文]';
          if (!preview.isConnected) review.append(preview);
        } catch (error) { setMessage(errorMessage(error), true); }
      });
      row.append(view);
    }
    review.append(row);
  }
  if (artifacts.length) {
    const sharePanel = node('div', 'review-upload-panel');
    const phaseSelect = node('select'); phaseSelect.setAttribute('aria-label', '审核阶段');
    for (let phase = 0; phase <= 8; phase += 1) {
      const option = node('option', '', `P${phase}`); option.value = `P${phase}`; phaseSelect.append(option);
    }
    const currentPhase = String(observability.current_stage ?? status?.current_phase ?? '').match(/P[0-8]/u)?.[0];
    if (currentPhase) phaseSelect.value = currentPhase;
    const classification = node('select'); classification.setAttribute('aria-label', '产物共享级别');
    for (const [value, label] of [['internal', '内部可见'], ['public', '公开可见']]) {
      const option = node('option', '', label); option.value = value; classification.append(option);
    }
    const upload = node('button', 'secondary-button', '上传所选产物并创建云端审核包');
    upload.disabled = $('cloudState').textContent === '尚未配对';
    upload.addEventListener('click', async () => {
      const paths = [...review.querySelectorAll('input[data-review-artifact]:checked')].map((input) => input.value);
      if (!paths.length) { setMessage('请先明确勾选要上传到云端的审核产物。', true); return; }
      try {
        upload.disabled = true;
        setMessage('正在校验所选文件、同步运行事实并创建审核包…');
        const result = await window.dsh.uploadReviewBundle({ run_id: selectedRunId, phase: phaseSelect.value, artifact_paths: paths, classification: classification.value });
        setMessage(`云端审核包已创建：${result.bundle_id}，${paths.length} 个文件，修订 ${result.run_revision}。`);
        await loadRunDetail(selectedRunId);
      } catch (error) { setMessage(errorMessage(error), true); }
      finally { upload.disabled = false; }
    });
    sharePanel.append(node('span', 'muted', '仅上传你勾选的文件'), phaseSelect, classification, upload);
    review.append(sharePanel);
  }
  ui.detail.append(review);

  const humanInputs = Array.isArray(observability.human_inputs) ? observability.human_inputs : [];
  const interventions = node('div', 'detail-block');
  interventions.append(node('h3', '', `人工输入与审核记录 (${humanInputs.length})`));
  if (!humanInputs.length) interventions.append(node('div', 'empty-state', '尚无人工补充或审核记录。'));
  for (const input of humanInputs) {
    const item = node('div', 'human-input');
    item.append(node('div', 'muted', `${input.phase ?? '未标阶段'} · ${input.kind ?? 'input'} · ${input.at ?? ''}`));
    item.append(node('p', '', input.content ?? input.decision ?? input.evidence?.summary ?? '此记录仅包含结构化信息。'));
    interventions.append(item);
  }
  ui.detail.append(interventions);

  const pendingConsent = tasks.find((task) => task.status === 'awaiting_consent');
  if (pendingConsent) {
    const phaseNumber = Number(/P(\d+)/u.exec(String(pendingConsent.phase ?? ''))?.[1] ?? pendingConsent.phase);
    const consent = node('div', 'detail-block action-panel');
    consent.append(node('h3', '', `等待人工审核 · ${pendingConsent.phase ?? ''}`));
    consent.append(node('p', 'muted', '先查看上方审核产物，再粘贴 workflow 生成的审核令牌继续；如果不批准，可停止任务并记录原因。'));
    const token = node('input'); token.type = 'password'; token.autocomplete = 'off'; token.placeholder = '审核令牌';
    const comment = node('textarea'); comment.placeholder = '审核意见（会记录到本地运行审计）';
    const approve = node('button', 'primary-button', '提交审核并继续');
    approve.addEventListener('click', async () => {
      try {
        approve.disabled = true;
        await window.dsh.consentRun(selectedRunId, { task_id: pendingConsent.task_id ?? pendingConsent.id, phase: phaseNumber, token: token.value, content: comment.value, actor: 'desktop-user', kind: 'review_decision' });
        setMessage('审核已提交，正在刷新运行状态。'); await loadRunDetail(selectedRunId); await refresh();
      } catch (error) { setMessage(errorMessage(error), true); }
      finally { approve.disabled = false; }
    });
    consent.append(token, comment, approve); ui.detail.append(consent);
  }

  const inputPanel = node('div', 'detail-block action-panel');
  inputPanel.append(node('h3', '', '补充问题或操作说明'));
  const note = node('textarea'); note.placeholder = '描述你发现的问题、补充要求或审核意见；内容保存在本机运行记录。';
  const noteButton = node('button', 'secondary-button', '记录人工输入');
  noteButton.addEventListener('click', async () => {
    try {
      noteButton.disabled = true;
      await window.dsh.recordHumanInput(selectedRunId, { content: note.value, kind: 'user_correction', category: 'user_correction', actor: 'desktop-user', idempotency_key: `desktop-${crypto.randomUUID()}` });
      setMessage('人工输入已记录。'); await loadRunDetail(selectedRunId);
    } catch (error) { setMessage(errorMessage(error), true); }
    finally { noteButton.disabled = false; }
  });
  inputPanel.append(note, noteButton);

  const isTerminal = ['completed', 'failed', 'cancelled'].includes(run.status ?? status?.status);
  const isPaused = ['awaiting_consent', 'blocked', 'failed', 'needs_input', 'needs_reconcile'].includes(run.status ?? status?.status);
  const resume = node('button', 'secondary-button', '恢复运行');
  resume.disabled = !isPaused;
  resume.addEventListener('click', async () => {
    try { await window.dsh.resumeRun(selectedRunId); setMessage('已请求恢复运行。'); await loadRunDetail(selectedRunId); await refresh(); }
    catch (error) { setMessage(errorMessage(error), true); }
  });
  const cancel = node('button', 'secondary-button danger-button', '停止运行');
  cancel.disabled = isTerminal;
  cancel.addEventListener('click', async () => {
    const reason = prompt('填写停止原因，记录到运行审计：', '用户请求停止');
    if (reason === null) return;
    try { await window.dsh.cancelRun(selectedRunId, reason); setMessage('已请求停止运行。'); await loadRunDetail(selectedRunId); await refresh(); }
    catch (error) { setMessage(errorMessage(error), true); }
  });
  inputPanel.append(resume, cancel);
  ui.detail.append(inputPanel);

  const timeline = node('details', 'detail-block'); timeline.append(node('summary', '', `事件时间线 (${events.length})`));
  const eventList = node('div', 'event-list');
  for (const event of events.slice(-100).reverse()) {
    const item = node('div', 'event-item');
    item.append(node('strong', '', `${event.type ?? event.event_type ?? 'event'} · ${event.phase ?? event.payload?.phase ?? ''}`), node('span', 'muted', event.created_at ?? event.at ?? ''));
    if (event.payload) item.append(node('pre', 'event-payload', JSON.stringify(event.payload, null, 2)));
    eventList.append(item);
  }
  timeline.append(eventList); ui.detail.append(timeline);
}

async function loadRunDetail(runId) {
  selectedRunId = runId;
  if (chatRunId !== runId) {
    if (chatSessionId) void window.dsh.closeChatSession(chatSessionId).catch(() => {});
    chatRunId = runId; chatSessionId = null; chatHistory = [];
    $('chatRunLabel').textContent = `关联运行 ${runId}`;
    $('chatInput').disabled = false; $('clearChat').disabled = false;
    $('chatStatus').textContent = '';
    renderChat();
  }
  ui.detail.replaceChildren(node('div', 'empty-state', '正在读取运行状态、审核事件和产物…'));
  try {
    const [status, artifacts] = await Promise.all([window.dsh.getRunDetail(runId), window.dsh.getRunArtifacts(runId)]);
    renderRunDetail(status, artifacts);
  } catch (error) { ui.detail.replaceChildren(node('div', 'message error', errorMessage(error))); }
}

function renderChat() {
  const messages = $('chatMessages');
  if (!chatHistory.length) {
    messages.replaceChildren(node('div', 'empty-state', chatRunId
      ? '把当前运行的错误或阶段问题发给本机 CodeAgent。'
      : '选择一条运行记录后，可以把失败原因和阶段问题提交给本机 CodeAgent。'));
  } else {
    messages.replaceChildren(...chatHistory.map((entry) => {
      const bubble = node('div', `chat-message ${entry.role}${entry.error ? ' error' : ''}`);
      bubble.append(node('span', 'chat-message-label', entry.role === 'user' ? '你' : entry.error ? '诊断失败' : '本机 CodeAgent'));
      bubble.append(node('span', '', entry.content));
      return bubble;
    }));
  }
  messages.scrollTop = messages.scrollHeight;
  $('sendChat').disabled = !chatRunId || $('chatInput').disabled || $('chatInput').value.trim() === '';
}

function renderCloudState(state) {
  const text = state?.status === 'connected' ? '云端已连接'
    : state?.status === 'offline' ? '云端暂不可用'
      : '尚未配对';
  $('cloudState').textContent = text;
  const suffix = state?.pending_count ? ` · ${state.pending_count} 条待同步` : '';
  $('cloudMessage').textContent = `${text}${suffix}${state?.last_error ? ` · ${state.last_error}` : ''}`;
}

async function refresh() {
  try {
    const [workspace, status, agents, settings, runs, cloud, humanInputSync] = await Promise.all([
      window.dsh.getWorkspace(), window.dsh.getStatus(), window.dsh.getAgents(),
      window.dsh.getAgentSettings(), window.dsh.getRuns(), window.dsh.getCloudState(),
      window.dsh.getHumanInputSyncSetting(),
    ]);
    const workspaceProfile = workspace?.workspace;
    ui.workspace.textContent = workspaceProfile
      ? `${workspaceProfile.name ?? workspaceProfile.transport} · ${workspaceProfile.code_root ?? workspace.workspace_root}`
      : workspace?.workspace_root ?? '选择代码工作区';
    $('versionText').textContent = status.node ?? '本地运行时';
    renderHealth(status); renderAgents(agents, settings); renderRuns(runs); renderCloudState(cloud);
    $('syncHumanInputContent').checked = humanInputSync?.enabled === true;
    if (selectedRunId && (runs?.runs ?? []).some((item) => item.run_id === selectedRunId)) {
      await loadRunDetail(selectedRunId);
    }
    setMessage('');
    if (!workspace?.setup_configured && !workspaceDialogShown) {
      workspaceDialogShown = true;
      await openWorkspaceSetup();
    }
  } catch (error) {
    setMessage(errorMessage(error), true);
  }
}

$('retryStartup').addEventListener('click', async () => {
  const button = $('retryStartup'); button.disabled = true; button.textContent = '正在重试…';
  try {
    const result = await window.dsh.retryStartup();
    renderStartupFailure(result.ok ? null : result.error);
    if (result.ok) await refresh();
  } catch (error) { renderStartupFailure({ message: errorMessage(error), recovery: '请检查客户端安装和工作区设置后重试。' }); }
  finally { button.disabled = false; button.textContent = '重试本机服务'; }
});
$('configureAfterStartupFailure').addEventListener('click', () => void openWorkspaceSetup());
$('refreshStatus').addEventListener('click', refresh);
$('refreshRuns').addEventListener('click', refresh);
$('probeWorkspace').addEventListener('click', async () => {
  const button = $('probeWorkspace'); button.disabled = true; button.textContent = '正在检测…';
  try {
    const result = await window.dsh.probeWorkspace();
    await refresh();
    if (result.status === 'available') setMessage('代码工作区、工作流 gate 和运行工具已连接。');
    else setMessage(`工作区尚未就绪：${(result.errors ?? []).map((item) => item.message ?? item.code).join('；') || result.status}`, true);
  } catch (error) { setMessage(errorMessage(error), true); }
  finally { button.disabled = false; button.textContent = '检测连接'; }
});
$('chatInput').addEventListener('input', renderChat);
$('chatInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); $('sendChat').click(); }
});
$('sendChat').addEventListener('click', async () => {
  const message = $('chatInput').value.trim();
  const runId = selectedRunId;
  if (!runId || !message) return;
  chatSessionId ??= `chat-${crypto.randomUUID()}`;
  const sessionId = chatSessionId;
  chatHistory.push({ role: 'user', content: message });
  $('chatInput').value = '';
  $('chatStatus').textContent = '正在通过 DSH Session 调用本机 CodeAgent…';
  $('sendChat').disabled = true; $('chatInput').disabled = true;
  renderChat();
  try {
    const result = await window.dsh.chatMessage({
      run_id: runId, session_id: sessionId, message, agent: ui.agents.value,
    });
    if (chatRunId !== runId || chatSessionId !== sessionId) return;
    if (result.session_id) chatSessionId = result.session_id;
    chatHistory.push({ role: 'agent', content: result.output || 'CodeAgent 没有返回文本。' });
    $('chatStatus').textContent = `${result.provider_id ?? ui.agents.value} · 本机 DSH Session`;
  } catch (error) {
    if (chatRunId !== runId || chatSessionId !== sessionId) return;
    chatHistory.push({ role: 'agent', error: true, content: errorMessage(error) });
    $('chatStatus').textContent = '本机 CodeAgent 分析未完成。';
  } finally {
    $('chatInput').disabled = false;
    renderChat();
    $('chatInput').focus();
  }
});
$('clearChat').addEventListener('click', async () => {
  if (chatSessionId) await window.dsh.closeChatSession(chatSessionId).catch(() => {});
  chatSessionId = null; chatHistory = [];
  $('chatStatus').textContent = '已新建本机 DSH 对话。';
  renderChat();
  $('chatInput').focus();
});
$('refreshAgents').addEventListener('click', async () => {
  try { renderAgents(await window.dsh.refreshAgents(), await window.dsh.getAgentSettings()); setMessage('CodeAgent 探测已更新。'); }
  catch (error) { setMessage(errorMessage(error), true); }
});
$('changeWorkspace').addEventListener('click', async () => {
  try { await openWorkspaceSetup(); }
  catch (error) { setMessage(errorMessage(error), true); }
});

function toggleWorkspaceFields() {
  const transport = $('workspaceTransport').value;
  $('wslTargetRow').classList.toggle('hidden', transport !== 'wsl');
  $('sshTargetRow').classList.toggle('hidden', transport !== 'ssh');
  $('pickWorkspaceRoot').classList.toggle('hidden', transport !== 'local');
  $('workspaceCodeRoot').placeholder = transport === 'local'
    ? '选择 Windows 本机源码文件夹'
    : '例如 /home/user/OpenHarmony';
}

async function loadWorkspaceOptions() {
  const button = $('refreshWorkspaceOptions'); button.disabled = true;
  $('workspaceSetupMessage').textContent = '正在检测 WSL 发行版和 Windows OpenSSH 配置…';
  try {
    const result = await window.dsh.discoverWorkspaceOptions();
    const wsl = result?.wsl?.distributions ?? [];
    const wslSelect = $('wslTarget'); wslSelect.replaceChildren();
    for (const distro of wsl) { const option = node('option', '', distro); option.value = distro; wslSelect.append(option); }
    if (!wsl.length) wslSelect.append(node('option', '', '未发现 WSL 发行版'));
    const aliases = result?.ssh?.aliases ?? [];
    const sshSelect = $('sshAlias'); sshSelect.replaceChildren(node('option', '', '输入或选择别名'));
    for (const alias of aliases) { const option = node('option', '', alias); option.value = alias; sshSelect.append(option); }
    $('workspaceSetupMessage').textContent = `WSL：${wsl.length ? wsl.join('、') : '未发现'}；SSH Host：${aliases.length ? aliases.join('、') : '未发现（也可输入 user@host）'}`;
  } catch (error) { $('workspaceSetupMessage').textContent = errorMessage(error); }
  finally { button.disabled = false; }
}

async function openWorkspaceSetup() {
  const current = await window.dsh.getWorkspace().catch(() => null);
  const profile = current?.workspace;
  await loadWorkspaceOptions();
  $('workspaceTransport').value = ['local', 'wsl', 'ssh'].includes(profile?.transport) ? profile.transport : 'local';
  $('workspaceCodeRoot').value = profile?.code_root ?? '';
  if (profile?.transport === 'wsl') $('wslTarget').value = profile.connection?.target ?? '';
  if (profile?.transport === 'ssh') {
    $('sshTarget').value = profile.connection?.target ?? '';
    $('sshAlias').value = profile.connection?.target ?? '';
  }
  toggleWorkspaceFields();
  const dialog = $('workspaceDialog');
  if (!dialog.open) dialog.showModal();
}

$('workspaceTransport').addEventListener('change', toggleWorkspaceFields);
$('workspaceForm').addEventListener('submit', (event) => event.preventDefault());
$('refreshWorkspaceOptions').addEventListener('click', loadWorkspaceOptions);
$('sshAlias').addEventListener('change', () => { if ($('sshAlias').value) $('sshTarget').value = $('sshAlias').value; });
$('pickWorkspaceRoot').addEventListener('click', async () => {
  try {
    const path = await window.dsh.pickLocalWorkspace();
    if (path) $('workspaceCodeRoot').value = path;
  } catch (error) { $('workspaceSetupMessage').textContent = errorMessage(error); }
});
$('saveWorkspace').addEventListener('click', async () => {
  const transport = $('workspaceTransport').value;
  const target = transport === 'wsl' ? $('wslTarget').value : transport === 'ssh' ? $('sshTarget').value.trim() : undefined;
  const codeRoot = $('workspaceCodeRoot').value.trim();
  const button = $('saveWorkspace'); button.disabled = true;
  $('workspaceSetupMessage').classList.remove('error');
  $('workspaceSetupMessage').textContent = '正在验证工作区连接、源码目录和执行能力…';
  try {
    const result = await window.dsh.configureWorkspace({ transport, ...(target ? { target } : {}), code_root: codeRoot });
    const probe = result?.probe ?? {};
    const isAvailable = ['ready', 'available'].includes(probe.status);
    $('workspaceSetupMessage').textContent = isAvailable
      ? `工作区已连接：${transport.toUpperCase()} · ${codeRoot}`
      : `配置已保存，但连接检查未通过：${probe.reason ?? probe.status ?? 'unknown'}${Array.isArray(result.errors) && result.errors.length ? ` · ${result.errors.map((item) => item.message ?? item).join('；')}` : ''}。修复后可以重新检测。`;
    if (isAvailable) {
      $('workspaceDialog').close(); workspaceDialogShown = true; await refresh();
    }
  } catch (error) {
    $('workspaceSetupMessage').textContent = errorMessage(error);
    $('workspaceSetupMessage').classList.add('error');
  } finally { button.disabled = false; }
});
$('pairCloud').addEventListener('click', async () => {
  try {
    $('pairCloud').disabled = true;
    $('cloudMessage').textContent = '正在安全配对…';
    const state = await window.dsh.pairCloud({ cloud_url: $('cloudUrl').value, pairing_code: $('pairingCode').value });
    $('pairingCode').value = '';
    renderCloudState(state);
  } catch (error) {
    $('cloudMessage').textContent = errorMessage(error);
    $('cloudMessage').classList.add('error');
  } finally { $('pairCloud').disabled = false; }
});
$('syncNow').addEventListener('click', async () => {
  try { renderCloudState(await window.dsh.syncNow()); }
  catch (error) { $('cloudMessage').textContent = errorMessage(error); $('cloudMessage').classList.add('error'); }
});
$('syncHumanInputContent').addEventListener('change', async (event) => {
  const enabled = event.currentTarget.checked;
  event.currentTarget.disabled = true;
  try {
    const result = await window.dsh.setHumanInputSyncEnabled({ enabled });
    event.currentTarget.checked = result.enabled === true;
    $('cloudMessage').textContent = result.enabled
      ? '已启用：之后新同步的人工输入正文会上传，单条最多 16 KiB。'
      : '已关闭：云端只接收人工输入的统计、哈希与其他结构化运行信息。';
    if (result.enabled) await window.dsh.syncNow();
  } catch (error) {
    event.currentTarget.checked = !enabled;
    $('cloudMessage').textContent = errorMessage(error);
    $('cloudMessage').classList.add('error');
  } finally { event.currentTarget.disabled = false; }
});
$('checkEnvironment').addEventListener('click', async () => {
  try {
    setMessage('正在检查本机环境…');
    const result = await window.dsh.preflight({ ar_text: ui.text.value, agent: ui.agents.value, ...environmentInput() });
    renderPreflight(result);
    setMessage(result.can_start_p0 ? 'P0 前置检查通过，可以启动。' : '检查完成，请处理阻断项。', !result.can_start_p0);
  } catch (error) { setMessage(errorMessage(error), true); }
});
$('startRun').addEventListener('click', async () => {
  const text = ui.text.value.trim();
  if (!text) { setMessage('请填写 AR 描述。', true); ui.text.focus(); return; }
  try {
    $('startRun').disabled = true;
    setMessage('正在检查环境并启动本地 workflow…');
    await window.dsh.saveAgentSettings({ selected: ui.agents.value });
    const input = { ar_text: text, agent: ui.agents.value, workflow_id: 'ar-delivery', workspace_id: 'wsl-local', ...environmentInput() };
    const result = await window.dsh.startRun(input);
    setMessage(`已创建运行 ${result.run_id ?? ''}，本机 runtime 正在推进。`);
    ui.text.value = '';
    await refresh();
  } catch (error) { setMessage(errorMessage(error), true); }
  finally { $('startRun').disabled = false; }
});
$('openEnvironment').addEventListener('click', () => $('environmentCard').scrollIntoView({ behavior: 'smooth' }));
$('openHistory').addEventListener('click', () => $('historyCard').scrollIntoView({ behavior: 'smooth' }));
window.dsh.getStartupError?.().then(renderStartupFailure).catch(() => {});
window.dsh.onStartupErrorChanged?.(renderStartupFailure);
window.dsh.onWorkspaceChanged?.(() => void refresh());
window.dsh.onCloudStateChanged?.(renderCloudState);
window.dsh.onWorkspaceProbeChanged?.(() => void refresh());
void refresh();
