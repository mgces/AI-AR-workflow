import { app, BrowserWindow, dialog, ipcMain, safeStorage } from 'electron';
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startLocalCore } from '../../local-core/src/server.js';
import { resolveRuntimeRoot } from '../../../scripts/runtime-bundle.js';
import { DurableEventOutbox } from './sync-outbox.js';
import { enqueueLocalArEvents, syncLocalProbeEvents } from './local-event-sync.js';
import { createRunControls } from './run-controls.js';
import { createCloudReviewUploader } from './cloud-review-upload.js';
import { verifyReviewIntent } from './cloud-review-intent.js';
import { localReviewPhaseForBundle, processCloudReviewIntent } from './cloud-review-processor.js';
import { createCloudReviewReceiptStore } from './cloud-review-receipts.js';
import { discoverWslDistributions, validateSshTarget } from './workspace-config.js';
import { discoverSshHostAliases } from './workspace-options.js';
import { createDshRuntimeSupervisor } from './dsh-runtime-supervisor.js';
import { createDshCodeAgentExecutor } from './dsh-codeagent-executor.js';
import { resolveStartupRuntime, toStartupError } from './startup-error.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const RENDERER_PATH = resolve(HERE, '../renderer/index.html');
const fallbackRuntimeRoot = app.isPackaged
  ? resolve(process.resourcesPath, 'runtime') : resolve(HERE, '../../../..');
const startupRuntime = resolveStartupRuntime({
  resolveRoot: () => resolveRuntimeRoot({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    developmentRoot: resolve(HERE, '../../../..'),
  }),
  fallbackRoot: fallbackRuntimeRoot,
});
const RUNTIME_ROOT = startupRuntime.runtimeRoot;
const SETTINGS_PATH = () => join(app.getPath('userData'), 'settings.json');
const STATE_PATH = () => join(app.getPath('userData'), 'runtime', 'local-console-state.json');
const CLOUD_SECRET_PATH = () => join(app.getPath('userData'), 'cloud-credentials.bin');
const OUTBOX_PATH = () => join(app.getPath('userData'), 'sync', 'outbox.json');
const DSH_HOME_PATH = () => join(app.getPath('userData'), 'dsh-runtime-home');
const cloudReviewReceipts = createCloudReviewReceiptStore({
  directory: join(app.getPath('userData'), 'runtime', 'cloud-review-receipts'),
});
if (process.env.DSH_CLIENT_USER_DATA_DIR) {
  app.setPath('userData', resolve(process.env.DSH_CLIENT_USER_DATA_DIR));
}
let windowRef = null;
let localCore = null;
let workspaceRoot = null;
let syncTimer = null;
let lastCloudSync = { status: 'not_configured', pending_count: 0 };
let cloudSyncQueue = Promise.resolve();
let dshRuntimeSupervisor = null;
let shuttingDown = false;
let runtimeLoadFailure = startupRuntime.startupError;
let startupFailure = runtimeLoadFailure;
const dshSessionRegistry = new Map();
const dshCallbackToken = randomBytes(32).toString('base64url');
const outbox = new DurableEventOutbox(OUTBOX_PATH());

const codeAgentPromptModule = await import(pathToFileURL(join(
  RUNTIME_ROOT, 'platform/apps/local-console/src/codeagent-executor.js',
)).href).catch((error) => {
  runtimeLoadFailure ??= toStartupError(error);
  startupFailure = runtimeLoadFailure;
  return { buildCodeAgentPrompt: () => { throw error; } };
});
const { buildCodeAgentPrompt } = codeAgentPromptModule;
const dshSchedulerExecutor = createDshCodeAgentExecutor({
  runtime: {
    run: async (request) => {
      if (!dshRuntimeSupervisor) {
        throw Object.assign(new Error('本机 DSH runtime 尚未启动，请重新连接客户端'), { code: 'dsh_runtime_unavailable' });
      }
      return dshRuntimeSupervisor.run(request);
    },
  },
  sessionRegistry: dshSessionRegistry,
  promptBuilder: buildCodeAgentPrompt,
});

async function readSettings() {
  try {
    const value = JSON.parse(await readFile(SETTINGS_PATH(), 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

async function saveSettings(value) {
  await mkdir(dirname(SETTINGS_PATH()), { recursive: true });
  await writeFile(SETTINGS_PATH(), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function assertSecureStorage() {
  const available = await safeStorage.isAsyncEncryptionAvailable();
  const weakLinuxBackend = process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text';
  if (!available || weakLinuxBackend) {
    throw Object.assign(new Error('操作系统凭据保护当前不可用，云端配对已停用'), { code: 'secure_storage_unavailable' });
  }
}

async function readCloudCredentials() {
  await assertSecureStorage();
  try {
    const encrypted = Buffer.from(await readFile(CLOUD_SECRET_PATH(), 'utf8'), 'base64');
    const decrypted = await safeStorage.decryptStringAsync(encrypted);
    if (decrypted.shouldReEncrypt) await saveCloudCredentials(JSON.parse(decrypted.result));
    return JSON.parse(decrypted.result);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    if (error?.code === 'secure_storage_unavailable') throw error;
    throw Object.assign(new Error('本机云端凭据无法解密，请解绑设备后重新配对'), { code: 'cloud_credentials_unavailable' });
  }
}

async function saveCloudCredentials(value) {
  await assertSecureStorage();
  await mkdir(dirname(CLOUD_SECRET_PATH()), { recursive: true });
  const encrypted = await safeStorage.encryptStringAsync(JSON.stringify(value));
  await writeFile(CLOUD_SECRET_PATH(), encrypted.toString('base64'), { mode: 0o600 });
}

function normalizeCloudOrigin(value) {
  let url;
  try { url = new URL(String(value ?? '').trim()); } catch {
    throw Object.assign(new Error('请输入完整的 Cloud API 地址'), { code: 'cloud_url_invalid' });
  }
  const localHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (!['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && !localHost)
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw Object.assign(new Error('云端地址必须是 HTTPS 域名；HTTP 仅允许 loopback 开发地址'), { code: 'cloud_url_invalid' });
  }
  return url.origin;
}

async function cloudRequest(baseUrl, path, { token = null, body = undefined, method = 'GET', headers = {} } = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15_000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(value?.error?.message ?? value?.error?.code ?? `Cloud API returned ${response.status}`), {
      code: value?.error?.code ?? 'cloud_api_request_failed', status: response.status,
    });
  }
  return value;
}

async function cloudBinaryRequest(baseUrl, path, token, bytes) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' },
    body: bytes,
    signal: AbortSignal.timeout(60_000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(value?.error?.message ?? value?.error?.code ?? `Cloud API returned ${response.status}`), {
    code: value?.error?.code ?? 'cloud_api_request_failed', status: response.status,
  });
  return value;
}

async function getCloudState() {
  const settings = await readSettings();
  const credentials = await readCloudCredentials().catch(() => null);
  const status = await outbox.status();
  return {
    status: credentials && settings.cloud_url ? lastCloudSync.status : 'not_configured',
    cloud_url: settings.cloud_url ?? null,
    device_id: settings.device_id ?? null,
    workspace_id: settings.cloud_workspace_id ?? null,
    pending_count: status.pending_count,
    last_error: lastCloudSync.error ?? null,
  };
}

function ensureSyncTimer() {
  if (syncTimer) return;
  syncTimer = setInterval(() => { void syncPendingEvents(); }, 15_000);
  syncTimer.unref?.();
}

async function syncLocalArEvents(settings, credentials) {
  if (!localCore || !settings.device_id || !settings.tenant_id || !settings.cloud_workspace_id) return 0;
  return enqueueLocalArEvents({
    listRuns: () => apiRequest('GET', '/api/ar/runs'),
    getRunStatus: (runId, cursor) => apiRequest('GET', `/api/ar/runs/${encodeURIComponent(runId)}?cursor=${cursor}`),
    outbox,
    identity: {
      tenant_id: settings.tenant_id,
      device_id: settings.device_id,
      workspace_id: settings.cloud_workspace_id,
    },
    privateKey: credentials.private_key_pem,
    keyId: settings.key_id,
    includeHumanInputContent: settings.sync_human_input_content === true,
  });
}

async function syncLocalProbeTelemetry(settings, credentials) {
  if (!localCore || !settings.device_id || !settings.tenant_id || !settings.cloud_workspace_id) return 0;
  return syncLocalProbeEvents({
    request: apiRequest,
    outbox,
    identity: {
      tenant_id: settings.tenant_id,
      device_id: settings.device_id,
      workspace_id: settings.cloud_workspace_id,
    },
    privateKey: credentials.private_key_pem,
    keyId: settings.key_id,
    workspaceId: 'wsl-local',
  });
}

async function performCloudSync() {
  const settings = await readSettings();
  const credentials = await readCloudCredentials().catch(() => null);
  if (!credentials || !settings.cloud_url || !settings.device_id) {
    lastCloudSync = { status: 'not_configured', pending_count: (await outbox.status()).pending_count };
    return lastCloudSync;
  }
  try {
    await syncLocalArEvents(settings, credentials);
    await syncLocalProbeTelemetry(settings, credentials);
    await cloudRequest(settings.cloud_url, `/v1/devices/${encodeURIComponent(settings.device_id)}/heartbeat`, {
      method: 'POST', token: credentials.access_token, body: { client_version: app.getVersion() },
    });
    const events = await outbox.pending();
    if (events.length) {
      const ack = await cloudRequest(settings.cloud_url,
        `/v1/devices/${encodeURIComponent(settings.device_id)}/events:batch`, {
          method: 'POST', token: credentials.access_token, body: { events },
        });
      await outbox.acknowledge(ack.accepted_through_client_seq);
    }
    await applyPendingCloudReviews(settings, credentials);
    lastCloudSync = { status: 'connected', pending_count: (await outbox.status()).pending_count, synced_at: new Date().toISOString() };
  } catch (error) {
    lastCloudSync = { status: 'offline', pending_count: (await outbox.status()).pending_count, error: error.message };
  }
  windowRef?.webContents.send('dsh:cloudStateChanged', await getCloudState());
  return lastCloudSync;
}

async function pinCloudReviewKey(signingKey) {
  if (!signingKey || signingKey.algorithm !== 'ed25519' || typeof signingKey.key_id !== 'string'
      || typeof signingKey.public_key !== 'string') {
    throw Object.assign(new Error('云端审核签名公钥格式无效'), { code: 'review_signing_key_invalid' });
  }
  const settings = await readSettings();
  const pinned = settings.review_signing_key;
  if (pinned && (pinned.key_id !== signingKey.key_id || pinned.public_key !== signingKey.public_key)) {
    throw Object.assign(new Error('云端审核签名公钥发生变化，已暂停自动应用审核结果'), { code: 'review_signing_key_changed' });
  }
  if (!pinned) await saveSettings({ ...settings, review_signing_key: signingKey });
  return signingKey;
}

async function applyPendingCloudReviews(settings, credentials) {
  if (!localCore || !settings.device_id) return 0;
  const response = await cloudRequest(settings.cloud_url,
    `/v1/devices/${encodeURIComponent(settings.device_id)}/intents`, { token: credentials.access_token });
  const signingKey = await pinCloudReviewKey(response.signing_key);
  let applied = 0;
  for (const intent of response.intents ?? []) {
    const currentSettings = await readSettings();
    const bundle = (currentSettings.cloud_review_bundles ?? []).find((item) => item.bundle_id === intent.bundle_id);
    if (!bundle) continue;
    const previousReceipt = await cloudReviewReceipts.get(intent.intent_id);
    const status = previousReceipt ? null
      : await apiRequest('GET', `/api/ar/runs/${encodeURIComponent(bundle.run_id)}`);
    const processed = await processCloudReviewIntent({
      intent, signingKey, bundle, deviceId: settings.device_id,
      currentRunRevision: previousReceipt ? previousReceipt.run_revision : status?.revision,
      getReceipt: (intentId) => cloudReviewReceipts.get(intentId),
      verify: (options) => verifyReviewIntent(options),
      applyDecision: async (verified) => {
        if (!status) throw Object.assign(new Error('local run status is unavailable for a new cloud review action'), {
          code: 'review_run_unavailable',
        });
        const localPhase = localReviewPhaseForBundle(verified.phase);
        const task = (status.tasks ?? []).find((item) => item.phase === localPhase && item.status === 'awaiting_consent');
        if (!task) return { status: 'stale', reason_code: 'local_consent_not_waiting' };
        if (verified.decision === 'approved') {
          await createRunControls(apiRequest).consent(bundle.run_id, {
            task_id: task.task_id, phase: Number(verified.phase.slice(1)),
            token: `cloud:${verified.actor_id}:${verified.nonce}`,
            content: verified.note ?? '', actor: `cloud:${verified.actor_id}`, kind: 'review_decision',
          });
          applied += 1;
          return { status: 'applied', reason_code: null };
        }
        await createRunControls(apiRequest).reviewDecision(bundle.run_id, {
          task_id: task.task_id,
          phase: verified.phase,
          decision: verified.decision,
          actor: `cloud:${verified.actor_id}`,
          note: verified.note?.trim() || `云端审核人 ${verified.actor_id} ${verified.decision === 'returned' ? '退回' : '拒绝'}该阶段，未附加说明。`,
          idempotency_key: `cloud-intent-${verified.intent_id}`,
        });
        applied += 1;
        return { status: 'applied', reason_code: null };
      },
      saveReceipt: (receipt) => cloudReviewReceipts.save(receipt),
      acknowledge: async (receipt) => cloudRequest(settings.cloud_url,
        `/v1/intents/${encodeURIComponent(receipt.intent_id)}/result`, {
          method: 'POST', token: credentials.access_token,
          body: { device_id: settings.device_id, status: receipt.status,
            ...(receipt.reason_code ? { reason_code: receipt.reason_code } : {}) },
        }),
    });
    const latest = await readSettings();
    const bundles = (latest.cloud_review_bundles ?? []).map((item) => item.bundle_id === bundle.bundle_id
      ? { ...item, last_intent_id: processed.verified.intent_id,
        last_intent_result: processed.receipt.status, updated_at: new Date().toISOString() }
      : item);
    await saveSettings({ ...latest, cloud_review_bundles: bundles });
  }
  return applied;
}

function syncPendingEvents() {
  const current = cloudSyncQueue.then(() => performCloudSync());
  cloudSyncQueue = current.catch(() => {});
  return current;
}

async function pairCloud({ cloud_url: cloudUrl, pairing_code: pairingCode } = {}) {
  const origin = normalizeCloudOrigin(cloudUrl);
  const code = String(pairingCode ?? '').trim().toUpperCase();
  if (!/^[A-F0-9]{12}$/u.test(code)) throw Object.assign(new Error('输入网页上显示的 12 位配对码'), { code: 'pairing_code_invalid' });
  await assertSecureStorage();
  const settings = await readSettings();
  const keys = generateKeyPairSync('ed25519');
  const deviceId = settings.device_id ?? `desktop-${randomUUID()}`;
  const keyId = `device-key-${randomUUID()}`;
  const workspaceId = settings.cloud_workspace_id ?? `workspace-${randomUUID()}`;
  const publicKeyPem = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privateKeyPem = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const credentials = await cloudRequest(origin, '/v1/devices/pair', {
    method: 'POST', body: {
      pairing_code: code,
      device_id: deviceId,
      key_id: keyId,
      public_key: publicKeyPem,
      device_name: process.platform === 'win32' ? 'Windows Desktop' : `${process.platform} Desktop`,
      client_version: app.getVersion(),
      workspace_id: workspaceId,
    },
  });
  await saveCloudCredentials({ access_token: credentials.access_token, private_key_pem: privateKeyPem });
  await saveSettings({ ...settings, cloud_url: origin, device_id: deviceId, key_id: keyId,
    tenant_id: credentials.tenant_id, cloud_workspace_id: credentials.workspace_id });
  ensureSyncTimer();
  await syncPendingEvents();
  return await getCloudState();
}

async function openWorkspacePicker() {
  const result = await dialog.showOpenDialog(windowRef, {
    title: '选择 OpenHarmony / HarmonyOS 源码目录',
    properties: ['openDirectory'],
    buttonLabel: '选择源码目录',
  });
  return result.canceled ? null : result.filePaths[0] ?? null;
}

function dshEnvironment(coreOrigin) {
  const allowedNames = process.platform === 'win32'
    ? ['PATH', 'Path', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP', 'COMSPEC']
    : ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME'];
  const env = {};
  for (const name of allowedNames) {
    const value = process.env[name];
    if (typeof value === 'string' && value !== '') env[name] = value;
  }
  const bundleRoot = app.isPackaged
    ? join(process.resourcesPath, 'dsh-runtime')
    : resolve(HERE, '../../dsh-runtime');
  return {
    ...env,
    DSH_HOME: DSH_HOME_PATH(),
    DSH_CLIENT_DSH_BUNDLE_ROOT: bundleRoot,
    DSH_CLIENT_RUNTIME_ROOT: RUNTIME_ROOT,
    DSH_CLIENT_CODEAGENT_ENDPOINT: coreOrigin,
    DSH_CLIENT_CODEAGENT_TOKEN: dshCallbackToken,
    DSH_CLIENT_CODEAGENT_IDS: 'claude-code,opencode,codex,custom',
  };
}

async function startCore(root = RUNTIME_ROOT, { persistRoot = true } = {}) {
  if (runtimeLoadFailure) {
    throw Object.assign(new Error(runtimeLoadFailure.message), { code: runtimeLoadFailure.code });
  }
  await access(root);
  await mkdir(dirname(STATE_PATH()), { recursive: true });
  await dshRuntimeSupervisor?.close().catch(() => {});
  dshRuntimeSupervisor = null;
  await localCore?.close();
  localCore = null;
  localCore = await startLocalCore({
    repoRoot: RUNTIME_ROOT,
    runtimeRoot: RUNTIME_ROOT,
    workspaceRoot: root,
    stateFile: STATE_PATH(),
    token: randomBytes(32).toString('base64url'),
    dshCallbackToken,
    localConsoleOptions: {
      schedulerExecutor: dshSchedulerExecutor,
      dshSessionRegistry,
      dshCallbackToken,
    },
  });
  const sidecarNode = app.isPackaged
    ? join(process.resourcesPath, 'node-runtime', 'node.exe')
    : (process.platform === 'win32' ? 'node.exe' : 'node');
  const sidecarLauncher = app.isPackaged
    ? join(process.resourcesPath, 'app.asar.unpacked', 'apps/dsh-runtime/launcher.js')
    : resolve(HERE, '../../dsh-runtime/launcher.js');
  dshRuntimeSupervisor = createDshRuntimeSupervisor({
    nodeExecutable: sidecarNode,
    launcherPath: sidecarLauncher,
    cwd: RUNTIME_ROOT,
    env: dshEnvironment(localCore.origin),
  });
  workspaceRoot = root;
  const settings = await readSettings();
  await saveSettings({ ...settings, ...(persistRoot ? { workspace_root: root } : {}) });
  startupFailure = null;
}

async function apiRequest(method, path, body) {
  if (!localCore) throw Object.assign(new Error('请先选择源码目录'), { code: 'workspace_required' });
  const response = await fetch(new URL(path, localCore.origin), {
    method,
    headers: {
      authorization: `Bearer ${localCore.token}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(value?.error?.message ?? value?.error?.code ?? `Local Core returned ${response.status}`);
    error.code = value?.error?.code ?? 'local_core_request_failed';
    error.details = value?.error?.details ?? {};
    throw error;
  }
  return value;
}

function assertTrustedRenderer(event) {
  if (event.senderFrame?.url !== pathToFileURL(RENDERER_PATH).href) {
    throw Object.assign(new Error('untrusted desktop renderer'), { code: 'desktop_ipc_forbidden' });
  }
}

function registerIpc(name, handler) {
  ipcMain.handle(`dsh:${name}`, async (event, ...args) => {
    assertTrustedRenderer(event);
    return await handler(...args);
  });
}

function registerHandlers() {
  const runControls = createRunControls(apiRequest);
  const reviewUploader = createCloudReviewUploader({
    getCredentials: async () => {
      const settings = await readSettings();
      const credentials = await readCloudCredentials();
      return credentials && settings.cloud_url && settings.device_id
        ? { cloud_url: settings.cloud_url, device_id: settings.device_id, access_token: credentials.access_token }
        : null;
    },
    syncEvents: syncPendingEvents,
    apiRequest,
    cloudJson: async (method, path, body, token) => {
      const settings = await readSettings();
      return cloudRequest(settings.cloud_url, path, { method, body, token });
    },
    cloudBinary: async (path, token, bytes) => {
      const settings = await readSettings();
      return cloudBinaryRequest(settings.cloud_url, path, token, bytes);
    },
    saveBundle: async (bundle) => {
      const settings = await readSettings();
      const previous = Array.isArray(settings.cloud_review_bundles) ? settings.cloud_review_bundles : [];
      await saveSettings({ ...settings, cloud_review_bundles: [
        ...previous.filter((item) => item.bundle_id !== bundle.bundle_id), bundle,
      ].slice(-500) });
    },
  });
  registerIpc('getStartupError', () => startupFailure);
  registerIpc('retryStartup', async () => {
    const settings = await readSettings();
    const root = settings.workspace_transport && settings.workspace_transport !== 'local'
      ? RUNTIME_ROOT : settings.workspace_root ?? RUNTIME_ROOT;
    try {
      await startCore(root, { persistRoot: false });
      windowRef?.webContents.send('dsh:startupErrorChanged', null);
      return { ok: true };
    } catch (error) {
      startupFailure = toStartupError(error);
      windowRef?.webContents.send('dsh:startupErrorChanged', startupFailure);
      return { ok: false, error: startupFailure };
    }
  });
  registerIpc('getStatus', () => apiRequest('GET', '/api/status'));
  registerIpc('getAgents', () => apiRequest('GET', '/api/agents'));
  registerIpc('refreshAgents', () => apiRequest('POST', '/api/agents/refresh', {}));
  registerIpc('getRuns', () => apiRequest('GET', '/api/ar/runs'));
  registerIpc('getRunDetail', (runId) => runControls.detail(runId));
  registerIpc('getRunArtifacts', (runId) => runControls.artifacts(runId));
  registerIpc('getArtifactContent', (runId, path) => runControls.artifactContent(runId, path));
  registerIpc('recordHumanInput', async (runId, value) => {
    const result = await runControls.recordInput(runId, value);
    await syncPendingEvents();
    return result;
  });
  registerIpc('consentRun', async (runId, value) => {
    const result = await runControls.consent(runId, value);
    await syncPendingEvents();
    return result;
  });
  registerIpc('cancelRun', async (runId, reason) => {
    const result = await runControls.cancel(runId, reason);
    await syncPendingEvents();
    return result;
  });
  registerIpc('resumeRun', async (runId) => {
    const result = await runControls.resume(runId);
    await syncPendingEvents();
    return result;
  });
  registerIpc('getAgentSettings', () => apiRequest('GET', '/api/agent-settings'));
  registerIpc('saveAgentSettings', (value) => apiRequest('PUT', '/api/agent-settings', value));
  registerIpc('preflight', (value) => apiRequest('POST', '/api/ar/preflight', value));
  registerIpc('startRun', async (value) => {
    if (!value || typeof value.ar_text !== 'string' || value.ar_text.trim() === '') {
      throw Object.assign(new Error('请填写 AR 描述'), { code: 'ar_text_required' });
    }
    const preflight = await apiRequest('POST', '/api/ar/preflight', value);
    if (preflight.can_start_p0 !== true) {
      throw Object.assign(new Error('P0 环境检查未通过，请处理页面列出的阻断项后再启动'), {
        code: 'preflight_blocked', details: { preflight },
      });
    }
    const run = await apiRequest('POST', '/api/ar/runs', value);
    run.cloud_sync = await syncPendingEvents();
    return run;
  });
  registerIpc('getCloudState', getCloudState);
  registerIpc('getHumanInputSyncSetting', async () => {
    const settings = await readSettings();
    return { enabled: settings.sync_human_input_content === true };
  });
  registerIpc('setHumanInputSyncEnabled', async (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || Object.keys(value).length !== 1 || typeof value.enabled !== 'boolean') {
      throw Object.assign(new Error('人工输入云端同步设置无效'), { code: 'human_input_sync_setting_invalid' });
    }
    const settings = await readSettings();
    await saveSettings({ ...settings, sync_human_input_content: value.enabled });
    return { enabled: value.enabled };
  });
  registerIpc('pairCloud', pairCloud);
  registerIpc('syncNow', syncPendingEvents);
  registerIpc('uploadReviewBundle', (value) => reviewUploader.upload(value));
  registerIpc('chatMessage', async (value = {}) => {
    const runId = typeof value.run_id === 'string' ? value.run_id.trim() : '';
    const message = typeof value.message === 'string' ? value.message.trim() : '';
    if (!runId || !message || Buffer.byteLength(message, 'utf8') > 16 * 1024) {
      throw Object.assign(new Error('请选择一条运行记录并填写不超过 16 KiB 的问题'), { code: 'chat_input_invalid' });
    }
    if (!dshRuntimeSupervisor) throw Object.assign(new Error('本机 DSH Runtime 尚未就绪，请重新检测工作区'), { code: 'dsh_runtime_unavailable' });
    const settingsPayload = await apiRequest('GET', '/api/agent-settings');
    const settings = settingsPayload.settings ?? {};
    const providerId = typeof value.agent === 'string' && value.agent.trim() ? value.agent.trim() : settings.selected;
    if (!['claude-code', 'opencode', 'codex', 'custom'].includes(providerId)) {
      throw Object.assign(new Error('当前选择的 CodeAgent 不受支持'), { code: 'dsh_provider_invalid' });
    }
    if (providerId !== settings.selected) {
      await apiRequest('PUT', '/api/agent-settings', { selected: providerId, model: settings.model ?? null });
    }
    const [workspaceResponse, runStatus] = await Promise.all([
      apiRequest('GET', '/api/workspaces'),
      apiRequest('GET', `/api/ar/runs/${encodeURIComponent(runId)}`),
    ]);
    const workspace = (workspaceResponse.workspaces ?? []).find((item) => item.workspace_id === 'wsl-local');
    if (!workspace) throw Object.assign(new Error('当前代码工作区未配置'), { code: 'workspace_not_found' });
    const workspaceRoot = workspace.code_root;
    const pipelineDir = runStatus.pipeline_dir ?? (workspace.transport === 'local'
      ? join(workspaceRoot, 'specs', 'pipeline', runId)
      : posix.join(workspaceRoot, 'specs', 'pipeline', runId));
    const summary = {
      run_id: runId,
      status: runStatus.status ?? runStatus.run?.status ?? null,
      current_phase: runStatus.current_phase ?? runStatus.scheduler?.phase ?? null,
      current_task: (runStatus.tasks ?? []).filter((task) => !['accepted', 'cancelled', 'superseded'].includes(task.status))
        .map((task) => ({ phase: task.phase, role: task.role, status: task.status, reason: task.failure_reason ?? task.reason ?? null })).slice(0, 8),
      failure_reasons: (runStatus.observability?.failure_reasons ?? []).slice(-8)
        .map((item) => ({ phase: item.phase, code: item.code ?? item.type, message: item.message })),
      blockers: (runStatus.observability?.current_blockers ?? []).slice(0, 8)
        .map((item) => ({ phase: item.phase, code: item.code, message: item.message })),
    };
    const sessionId = typeof value.session_id === 'string' && /^[A-Za-z0-9._:-]{1,160}$/u.test(value.session_id)
      ? value.session_id : `chat-${randomUUID()}`;
    dshSessionRegistry.set(sessionId, {
      session_id: sessionId, provider_id: providerId, model: settings.model ?? null, kind: 'chat',
      context: {
        run_id: runId, attempt_id: `chat-${sessionId}`, phase: summary.current_phase ?? 'analysis',
        role: 'problem-analyzer', workspace_root: workspaceRoot, pipeline_dir: pipelineDir,
      },
      execution: null,
    });
    const prompt = [
      '请作为当前 AR workflow 的本机问题分析助手，优先根据下面的运行事实和本地源码回答。默认只分析，不修改源码或执行构建；只有用户明确要求实施时才进行修改。不要把尚未由确定性 gate 验证的结果说成通过。',
      `当前运行上下文：${JSON.stringify(summary)}`,
      `用户问题：\n${message}`,
    ].join('\n\n');
    const result = await dshRuntimeSupervisor.run({
      provider_id: providerId, model: settings.model ?? null, session_id: sessionId,
      workspace_root: workspaceRoot, prompt,
    });
    return { session_id: sessionId, run_id: runId, provider_id: providerId,
      output: result.final_response ?? '', usage_events: (result.events ?? []).filter((event) => event.type === 'llm/usage').length };
  });
  registerIpc('closeChatSession', (sessionId) => {
    if (typeof sessionId === 'string') dshSessionRegistry.delete(sessionId);
    return { closed: true };
  });
  registerIpc('discoverWorkspaceOptions', async () => {
    const [wsl, ssh] = await Promise.all([
      discoverWslDistributions(),
      discoverSshHostAliases({ sshConfigPath: join(app.getPath('home'), '.ssh', 'config') }),
    ]);
    return { wsl, ssh };
  });
  registerIpc('probeWorkspace', async () => apiRequest('POST', '/api/workspaces/wsl-local/probe', {}));
  registerIpc('pickLocalWorkspace', openWorkspacePicker);
  const configureWorkspaceProfile = async (input = {}) => {
    const transport = input.transport;
    const codeRoot = typeof input.code_root === 'string' ? input.code_root.trim() : '';
    if (!['local', 'wsl', 'ssh'].includes(transport) || !codeRoot) {
      throw Object.assign(new Error('请选择源码位置并填写源码目录'), { code: 'workspace_configuration_invalid' });
    }
    if (transport === 'local') {
      await access(codeRoot);
      if (!(await stat(codeRoot)).isDirectory()) {
        throw Object.assign(new Error('本机源码目录必须是一个目录'), { code: 'workspace_root_not_directory' });
      }
    }
    let target;
    let port;
    if (transport === 'wsl') {
      const options = await discoverWslDistributions();
      if (!options.distributions.includes(input.target)) {
        throw Object.assign(new Error('WSL 发行版不在本机检测结果中，请重新检测并选择'), { code: 'wsl_distribution_unavailable' });
      }
      target = input.target;
    } else if (transport === 'ssh') {
      const resolved = await validateSshTarget(input.target);
      target = resolved.target;
      port = resolved.port;
    }
    const current = await apiRequest('GET', '/api/ar/runs');
    const active = (current.runs ?? []).filter((item) => !['completed', 'failed', 'cancelled'].includes(item.status));
    if (active.length) {
      throw Object.assign(new Error('当前有运行中的任务，请先完成或安全停止任务再切换代码环境'), {
        code: 'workspace_change_blocked', details: { active_runs: active.length },
      });
    }
    const profile = await apiRequest('PUT', '/api/workspaces/wsl-local', {
      transport, code_root, ...(target ? { target } : {}), ...(port ? { port } : {}),
    });
    if (transport === 'local') {
      await localCore?.close(); localCore = null;
      await startCore(codeRoot);
      await apiRequest('PUT', '/api/workspaces/wsl-local', { transport: 'local', code_root: codeRoot });
    }
    workspaceRoot = codeRoot;
    const settings = await readSettings();
    await saveSettings({ ...settings,
      workspace_root: transport === 'local' ? codeRoot : RUNTIME_ROOT,
      workspace_transport: transport,
      workspace_target: target ?? null,
      workspace_code_root: codeRoot,
    });
    const probe = await apiRequest('POST', '/api/workspaces/wsl-local/probe', {});
    return { workspace: profile.workspace, probe, workspace_root: codeRoot };
  };
  registerIpc('configureWorkspace', configureWorkspaceProfile);
  registerIpc('chooseWorkspace', async () => {
    const selected = await openWorkspacePicker();
    if (!selected) return { cancelled: true, workspace_root: workspaceRoot };
    return { cancelled: false, ...(await configureWorkspaceProfile({ transport: 'local', code_root: selected })) };
  });
  registerIpc('getWorkspace', async () => {
    const settings = await readSettings();
    let workspaces = { workspaces: [] };
    if (localCore) workspaces = await apiRequest('GET', '/api/workspaces');
    const workspace = (workspaces.workspaces ?? []).find((item) => item.workspace_id === 'wsl-local') ?? null;
    return {
      workspace_root: workspace?.code_root ?? workspaceRoot,
      workspace,
      setup_configured: ['local', 'wsl', 'ssh'].includes(settings.workspace_transport),
    };
  });
}

async function createWindow() {
  windowRef = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1000,
    minHeight: 720,
    show: false,
    backgroundColor: '#f4f6f8',
    webPreferences: {
      preload: resolve(HERE, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  windowRef.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  windowRef.webContents.on('will-navigate', (event, target) => {
    if (target !== pathToFileURL(RENDERER_PATH).href) event.preventDefault();
  });
  await windowRef.loadFile(RENDERER_PATH);
  windowRef.once('ready-to-show', () => windowRef.show());
  windowRef.on('closed', () => { windowRef = null; });
}

app.whenReady().then(async () => {
  registerHandlers();
  const settings = await readSettings();
  if (settings.cloud_url && settings.device_id && await readCloudCredentials().catch(() => null)) ensureSyncTimer();
  try {
    const initialRoot = settings.workspace_transport && settings.workspace_transport !== 'local'
      ? RUNTIME_ROOT : settings.workspace_root ?? RUNTIME_ROOT;
    await startCore(initialRoot, { persistRoot: false });
  } catch (error) { startupFailure = toStartupError(error); }
  await createWindow();
  if (['wsl', 'ssh'].includes(settings.workspace_transport)) {
    setTimeout(() => {
      void apiRequest('POST', '/api/workspaces/wsl-local/probe', {})
        .then(() => windowRef?.webContents.send('dsh:workspaceProbeChanged'))
        .catch(() => windowRef?.webContents.send('dsh:workspaceProbeChanged'));
    }, 250);
  }
});

app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow(); });
app.on('before-quit', (event) => {
  if (shuttingDown) return;
  if (!dshRuntimeSupervisor && !localCore) return;
  event.preventDefault();
  shuttingDown = true;
  const sidecar = dshRuntimeSupervisor;
  const core = localCore;
  dshRuntimeSupervisor = null;
  localCore = null;
  void Promise.allSettled([sidecar?.close(), core?.close()]).finally(() => {
    shuttingDown = false;
    app.quit();
  });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
