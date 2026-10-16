const byId = (id) => document.getElementById(id);
let currentRuns = [];
let pendingReviews = [];
let currentProbes = [];
let currentReview = null;

function statusLabel(status) {
  return ({ running: '运行中', created: '已创建', blocked: '阻塞', awaiting_review: '待审核', completed: '已完成', failed: '失败', cancelled: '已取消', passed: '通过', not_started: '未开始' })[status] ?? status ?? '未知';
}

function statusClass(status) {
  return ['running', 'blocked', 'awaiting_review', 'completed', 'failed', 'cancelled'].includes(status) ? status : 'created';
}

function timeLabel(value) {
  const time = Date.parse(value ?? '');
  return Number.isFinite(time) ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(time) : '—';
}

function durationLabel(value) {
  if (!Number.isSafeInteger(value) || value < 0) return '—';
  if (value < 60_000) return `${(value / 1000).toFixed(1)} 秒`;
  return `${Math.floor(value / 60_000)} 分 ${Math.round((value % 60_000) / 1000)} 秒`;
}

function createDetailMetric(label, value) {
  const card = document.createElement('div'); card.className = 'detail-metric';
  const title = document.createElement('span'); title.textContent = label;
  const amount = document.createElement('strong'); amount.textContent = String(value);
  card.append(title, amount); return card;
}

function createArtifactCard(artifact) {
  const item = document.createElement('div'); item.className = 'detail-list-item';
  const title = document.createElement('strong'); title.textContent = `${artifact.name ?? artifact.artifact_id} · ${artifact.phase ?? '—'} · ${artifact.size_bytes ?? '—'} 字节`;
  const digest = document.createElement('small'); digest.textContent = `SHA-256 ${artifact.sha256 ?? '—'} · ${artifact.classification ?? 'internal'} · ${artifact.status ?? 'unknown'}`;
  const action = document.createElement('button'); action.className = 'artifact-open'; action.textContent = artifact.content_type === 'text/plain' || artifact.content_type === 'application/json' ? '查看 / 下载' : '下载产物';
  action.disabled = artifact.status !== 'available';
  const preview = document.createElement('pre'); preview.className = 'artifact-preview hidden';
  action.addEventListener('click', async () => {
    action.disabled = true;
    try {
      const response = await fetch(`/v1/artifacts/${encodeURIComponent(artifact.artifact_id)}/content`, { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 404) throw new Error('产物不存在或当前账号无权读取。');
      if (!response.ok) throw new Error(`读取产物失败：${response.status}`);
      const bytes = await response.arrayBuffer();
      if (['text/plain', 'application/json'].includes(artifact.content_type) && bytes.byteLength <= 262144) {
        preview.textContent = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        preview.classList.remove('hidden');
      }
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = objectUrl; link.download = artifact.name ?? 'artifact';
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) { showToast(error.message ?? String(error)); }
    finally { action.disabled = false; }
  });
  item.append(title, digest, action, preview); return item;
}

function renderPendingReviews() {
  const reviews = pendingReviews;
  byId('pendingReviewCount').textContent = `${reviews.length} 项待处理`;
  if (!reviews.length) {
    const empty = document.createElement('div'); empty.className = 'detail-empty'; empty.textContent = '当前没有待审核的工作。';
    byId('pendingReviewList').replaceChildren(empty); return;
  }
  byId('pendingReviewList').replaceChildren(...reviews.map((review) => {
    const card = document.createElement('article'); card.className = 'review-queue-item';
    const title = document.createElement('strong'); title.textContent = `${review.run_id} · ${review.phase} · 修订 ${review.run_revision}`;
    const meta = document.createElement('small'); meta.textContent = `${review.artifacts?.length ?? 0} 个审核产物 · ${timeLabel(review.created_at)}`;
    const digest = document.createElement('code'); digest.textContent = `Bundle ${review.bundle_digest}`;
    const open = document.createElement('button'); open.className = 'artifact-open'; open.textContent = '打开审核';
    open.addEventListener('click', () => void openReview(review.bundle_id));
    card.append(title, meta, digest, open); return card;
  }));
}

async function openReview(bundleId) {
  try {
    const response = await fetch(`/v1/review-bundles/${encodeURIComponent(bundleId)}`, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 404 ? '审核项不存在或当前账号无权查看。' : `读取审核项失败：${response.status}`);
    currentReview = await response.json();
    byId('reviewTitle').textContent = `${currentReview.run_id} · ${currentReview.phase} 审核`;
    byId('reviewSubtitle').textContent = `修订 ${currentReview.run_revision} · SHA-256 ${currentReview.bundle_digest} · ${timeLabel(currentReview.created_at)}`;
    byId('reviewNote').value = '';
    const artifacts = Array.isArray(currentReview.artifacts) ? currentReview.artifacts : [];
    byId('reviewBundleArtifacts').replaceChildren(...(artifacts.length ? artifacts.map(createArtifactCard) : [Object.assign(document.createElement('div'), { className: 'detail-empty', textContent: '此审核包没有已登记产物。' })]));
    byId('reviewWorkspace').classList.remove('hidden');
    byId('reviewWorkspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { showToast(error.message ?? String(error)); }
}

async function submitReviewDecision(decision) {
  if (!currentReview) return;
  try {
    const response = await fetch(`/v1/review-bundles/${encodeURIComponent(currentReview.bundle_id)}/decisions`, {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision, note: byId('reviewNote').value }),
    });
    if (response.status === 409) throw new Error('运行证据已变化，审核包已过期；请刷新后重新审核。');
    if (response.status === 404) throw new Error('审核项不存在或当前账号无权处理。');
    if (!response.ok) throw new Error(`提交审核决定失败：${response.status}`);
    const result = await response.json();
    showToast(`已记录${decision === 'approved' ? '同意' : decision === 'returned' ? '退回' : '拒绝'}决定；客户端将在下次同步时收到签名回执。`);
    byId('reviewWorkspace').classList.add('hidden'); currentReview = null;
    await refresh();
    void openRun(currentRuns.find((run) => run.run_id === result.run_id) ?? { run_id: result.run_id, device_id: result.device_id });
  } catch (error) { showToast(error.message ?? String(error)); }
}

async function openRun(run) {
  try {
    const query = new URLSearchParams();
    if (run.device_id) query.set('device_id', run.device_id);
    const suffix = query.size ? `?${query}` : '';
    const response = await fetch(`/v1/runs/${encodeURIComponent(run.run_id)}${suffix}`, {
      credentials: 'same-origin', cache: 'no-store',
    });
    if (!response.ok) throw new Error(response.status === 404 ? '运行不存在或当前账号无权查看。' : `读取运行详情失败：${response.status}`);
    const detail = await response.json();
    renderRunDetail(detail);
  } catch (error) { showToast(error.message ?? String(error)); }
}

function renderRunDetail(detail) {
  const panel = byId('runDetail');
  const run = detail.run ?? {};
  const metrics = detail.observability ?? {};
  const usage = metrics.token_usage ?? {};
  byId('detailTitle').textContent = `运行 ${run.run_id ?? '—'}`;
  byId('detailSubtitle').textContent = `${run.workflow_id ?? 'AR workflow'} · ${run.device_id ?? '客户端未知'} · ${statusLabel(run.status)}`;
  const metricValues = [
    ['阶段尝试', metrics.stage_attempt_count ?? 0],
    ['阶段通过', metrics.stage_success_count ?? 0],
    ['阶段失败', metrics.stage_failure_count ?? 0],
    ['人工审核动作', metrics.human_intervention_count ?? 0],
    ['人工输入记录', metrics.human_input_count ?? 0],
    ['审核等待时间', durationLabel(metrics.human_wait_duration_ms)],
    ['Token 总量', Number.isSafeInteger(usage.total_tokens) ? usage.total_tokens : '未上报'],
  ];
  byId('detailMetrics').replaceChildren(...metricValues.map(([label, value]) => createDetailMetric(label, value)));

  const stages = Array.isArray(detail.stages) ? detail.stages : [];
  if (!stages.length) {
    const row = document.createElement('tr'); const cell = document.createElement('td');
    cell.colSpan = 5; cell.className = 'empty'; cell.textContent = '还没有阶段事件同步到云端。'; row.append(cell); byId('stageRows').replaceChildren(row);
  } else {
    byId('stageRows').replaceChildren(...stages.map((stage) => {
      const row = document.createElement('tr');
      for (const value of [stage.phase, statusLabel(stage.status), stage.attempts, durationLabel(stage.duration_ms), stage.failure_class ?? '—']) {
        const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell);
      }
      return row;
    }));
  }

  const artifacts = Array.isArray(detail.artifacts) ? detail.artifacts : [];
  const reviews = Array.isArray(detail.reviews) ? detail.reviews : [];
  const humanActions = (detail.events ?? []).filter((event) => ['human.wait_completed', 'human.input_recorded'].includes(event.type));
  const cards = [];
  for (const review of reviews) {
    const item = document.createElement('div'); item.className = 'detail-list-item';
    const label = { approved: '已同意', rejected: '已拒绝', returned: '已退回', pending: '待审核' }[review.decision ?? review.state] ?? (review.decision ?? review.state ?? '审核');
    item.textContent = `${review.phase ?? '—'} · ${label} · 修订 ${review.run_revision}`;
    const digest = document.createElement('small'); digest.textContent = `Bundle SHA-256 ${review.bundle_digest ?? '—'} · ${review.actor_id ?? '—'} · ${timeLabel(review.decided_at ?? review.created_at)}`;
    item.append(digest);
    if (review.note) { const note = document.createElement('p'); note.className = 'review-summary-note'; note.textContent = review.note; item.append(note); }
    cards.push(item);
  }
  if (humanActions.length) {
    for (const event of humanActions) {
      const item = document.createElement('div'); item.className = 'detail-list-item';
      item.textContent = event.type === 'human.input_recorded'
        ? `人工输入 · ${event.payload?.content_bytes ?? 0} 字节 · SHA-256 ${event.payload?.content_sha256 ?? '—'}`
        : `审核动作 · ${event.payload?.action_type ?? '—'} · ${event.payload?.phase ?? '—'}`;
      const timestamp = document.createElement('small'); timestamp.textContent = timeLabel(event.occurred_at); item.append(timestamp); cards.push(item);
      if (event.type === 'human.input_recorded' && typeof event.payload?.content_text === 'string') {
        const body = document.createElement('p');
        body.className = 'human-input-content';
        body.textContent = event.payload.content_text;
        if (new TextEncoder().encode(event.payload.content_text).byteLength < (event.payload.content_bytes ?? 0)) {
          body.textContent += '\n[正文已按 16 KiB 限额截断]';
        }
        item.append(body);
      }
    }
  }
  for (const artifact of artifacts) cards.push(createArtifactCard(artifact));
  if (!cards.length) {
    const empty = document.createElement('div'); empty.className = 'detail-empty';
    empty.textContent = '当前没有已同步的人工审核或产物记录。人工输入正文和产物文件不会默认上传；启用授权数据策略及产物存储后，云端才能预览完整内容。';
    cards.push(empty);
  }
  byId('reviewArtifacts').replaceChildren(...cards);

  const events = Array.isArray(detail.events) ? detail.events : [];
  if (!events.length) {
    const empty = document.createElement('li'); empty.className = 'detail-empty'; empty.textContent = '暂无事件。'; byId('eventTimeline').replaceChildren(empty);
  } else {
    byId('eventTimeline').replaceChildren(...events.map((event) => {
      const item = document.createElement('li');
      const header = document.createElement('div'); header.className = 'event-meta';
      const type = document.createElement('strong'); type.textContent = event.type;
      const timestamp = document.createElement('time'); timestamp.textContent = timeLabel(event.occurred_at);
      header.append(type, timestamp);
      const payload = document.createElement('pre'); payload.className = 'event-payload'; payload.textContent = JSON.stringify(event.payload ?? {}, null, 2);
      item.append(header, payload); return item;
    }));
  }
  panel.classList.remove('hidden'); panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderRuns() {
  const filter = byId('statusFilter').value;
  const runs = currentRuns.filter((run) => filter === 'all' || run.status === filter);
  if (!runs.length) {
    const row = document.createElement('tr'); const cell = document.createElement('td');
    cell.colSpan = 6; cell.className = 'empty'; cell.textContent = '当前筛选条件下没有运行记录。'; row.append(cell); byId('runRows').replaceChildren(row); return;
  }
  byId('runRows').replaceChildren(...runs.map((run) => {
    const row = document.createElement('tr');
    row.className = 'clickable-row'; row.title = '查看阶段、人工审核、Token 与事件详情';
    row.addEventListener('click', () => void openRun(run));
    const cells = [
      ['run-id', run.run_id], ['', run.workflow_id ?? 'ar-delivery'], ['', null],
      ['', run.current_phase ?? '—'], ['', run.device_id ?? '本地客户端'], ['muted', timeLabel(run.updated_at)],
    ];
    for (const [className, content] of cells) {
      const cell = document.createElement('td');
      if (className) cell.className = className;
      if (content !== null && className === 'run-id') {
        const button = document.createElement('button'); button.className = 'run-id'; button.textContent = content;
        button.addEventListener('click', (event) => { event.stopPropagation(); void openRun(run); }); cell.append(button);
      } else if (content !== null) cell.textContent = content;
      else { const badge = document.createElement('span'); badge.className = `status ${statusClass(run.status)}`; badge.textContent = statusLabel(run.status); cell.append(badge); }
      row.append(cell);
    }
    return row;
  }));
}

function renderMetrics(runs) {
  byId('totalRuns').textContent = String(runs.length);
  byId('activeRuns').textContent = String(runs.filter((item) => item.status === 'running').length);
  byId('blockedRuns').textContent = String(runs.filter((item) => ['blocked', 'awaiting_review'].includes(item.status)).length);
  byId('completedRuns').textContent = String(runs.filter((item) => item.status === 'completed').length);
}

function showToast(message) {
  const toast = byId('toast'); toast.textContent = message; toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 4500);
}

function renderDevices(devices) {
  if (!devices.length) {
    const empty = document.createElement('div'); empty.className = 'client-empty';
    const icon = document.createElement('span'); icon.className = 'device-art'; icon.textContent = '⌘';
    const title = document.createElement('strong'); title.textContent = '还没有已配对的客户端';
    const hint = document.createElement('p'); hint.textContent = '生成一次性配对码，在本机客户端中输入，即可将运行统计同步到云端。';
    empty.append(icon, title, hint); byId('deviceList').replaceChildren(empty); return;
  }
  byId('deviceList').replaceChildren(...devices.map((device) => {
    const row = document.createElement('div'); row.className = 'device-row';
    const name = document.createElement('strong'); name.textContent = device.device_name ?? device.device_id;
    const meta = document.createElement('small'); meta.textContent = `${device.device_id} · ${device.client_version ?? 'unknown'}`;
    const status = document.createElement('span'); status.className = `device-status ${device.status}`;
    status.textContent = device.status === 'revoked' ? '已吊销' : device.status === 'online' ? '在线' : '离线';
    row.append(name, meta, status);
    if (device.status !== 'revoked') {
      const revoke = document.createElement('button'); revoke.className = 'revoke-button'; revoke.textContent = '解绑';
      revoke.addEventListener('click', async () => {
        if (!window.confirm(`解绑客户端 ${device.device_name ?? device.device_id}？它将不能再同步。`)) return;
        try {
          const response = await fetch(`/v1/devices/${encodeURIComponent(device.device_id)}/revoke`, { method: 'POST', credentials: 'same-origin' });
          if (!response.ok) throw new Error(`解绑失败：${response.status}`);
          await refresh();
        } catch (error) { showToast(error.message ?? String(error)); }
      });
      row.append(revoke);
    }
    return row;
  }));
}

function renderProbes() {
  byId('probeCount').textContent = `${currentProbes.length} 项`;
  if (!currentProbes.length) {
    const empty = document.createElement('div'); empty.className = 'detail-empty'; empty.textContent = '还没有客户端探测记录。';
    byId('probeList').replaceChildren(empty); return;
  }
  byId('probeList').replaceChildren(...currentProbes.map((probe) => {
    const row = document.createElement('article'); row.className = 'detail-list-item';
    const title = document.createElement('strong');
    title.textContent = `${probe.type === 'device.probed' ? '设备' : '环境'} · ${probe.payload.capability_id ?? probe.payload.product_family ?? '设备连接'} · ${probe.payload.status}`;
    const reason = probe.payload.reason_code ? ` · 原因 ${probe.payload.reason_code}` : '';
    const duration = Number.isSafeInteger(probe.payload.duration_ms) ? ` · ${probe.payload.duration_ms} ms` : '';
    const meta = document.createElement('small'); meta.textContent = `${timeLabel(probe.occurred_at)} · 客户端 ${probe.device_id}${reason}${duration}`;
    row.append(title, meta); return row;
  }));
}

async function refresh() {
  const button = byId('refresh'); button.disabled = true;
  try {
    const [response, devicesResponse, reviewsResponse, probesResponse] = await Promise.all([
      fetch('/v1/runs', { credentials: 'same-origin', cache: 'no-store' }),
      fetch('/v1/devices', { credentials: 'same-origin', cache: 'no-store' }),
      fetch('/v1/reviews/pending', { credentials: 'same-origin', cache: 'no-store' }),
      fetch('/v1/probes', { credentials: 'same-origin', cache: 'no-store' }),
    ]);
    if ([response, devicesResponse, reviewsResponse, probesResponse].some((item) => item.status === 401)) throw new Error('请先通过组织身份系统登录');
    if ([response, devicesResponse, reviewsResponse, probesResponse].some((item) => !item.ok)) throw new Error('云端数据暂不可用');
    const [payload, devicePayload, reviewPayload, probePayload] = await Promise.all([response.json(), devicesResponse.json(), reviewsResponse.json(), probesResponse.json()]);
    currentRuns = Array.isArray(payload.runs) ? payload.runs : [];
    pendingReviews = Array.isArray(reviewPayload.reviews) ? reviewPayload.reviews : [];
    currentProbes = Array.isArray(probePayload.probes) ? probePayload.probes : [];
    renderMetrics(currentRuns); renderRuns(); renderDevices(Array.isArray(devicePayload.devices) ? devicePayload.devices : []);
    renderPendingReviews(); renderProbes();
    byId('updatedAt').textContent = `更新于 ${timeLabel(payload.generated_at)}`;
  } catch (error) {
    byId('updatedAt').textContent = '数据暂不可用';
    showToast(error.message ?? String(error));
  } finally { button.disabled = false; }
}

byId('refresh').addEventListener('click', refresh);
byId('closeDetail').addEventListener('click', () => byId('runDetail').classList.add('hidden'));
byId('closeReview').addEventListener('click', () => { byId('reviewWorkspace').classList.add('hidden'); currentReview = null; });
document.querySelectorAll('[data-review-decision]').forEach((button) => button.addEventListener('click', () => {
  void submitReviewDecision(button.dataset.reviewDecision);
}));
byId('statusFilter').addEventListener('change', renderRuns);
byId('createPairing').addEventListener('click', async () => {
  try {
    const response = await fetch('/v1/pairing/sessions', { method: 'POST', credentials: 'same-origin' });
    if (response.status === 401) throw new Error('请先通过组织身份系统登录');
    if (!response.ok) throw new Error(`生成配对码失败：${response.status}`);
    const pairing = await response.json();
    byId('pairingCode').textContent = pairing.pairing_code;
    byId('pairingExpires').textContent = `有效期至 ${timeLabel(pairing.expires_at)} · 只能使用一次`;
    byId('pairingCard').classList.remove('hidden');
  } catch (error) { showToast(error.message ?? String(error)); }
});
void refresh();
setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 15_000);
