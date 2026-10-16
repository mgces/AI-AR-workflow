import { randomUUID } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DeepSeekHarness } from '@deepseek-ai/dsh-sdk-client';

const PROFILE = 'dsh-local-codeagent';
const PROVIDER_PACKAGE = '@ai-ar/dsh-local-codeagent-provider';
const PROVIDER_SOURCE_FILES = Object.freeze(['package.json', 'cordis.patch.yml', 'README.md', 'src']);
const ALLOWED_PROVIDERS = new Set(['claude-code', 'opencode', 'codex', 'custom']);
const MAX_PROMPT_BYTES = 512 * 1024;
const running = new Map();
let harness = null;
let activeRoute = null;
let stopping = false;

function report(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function runtimeError(code, message) {
  return Object.assign(new Error(message), { code });
}

function safeError(error) {
  const code = typeof error?.code === 'string' && /^[a-z][a-z0-9_]{0,63}$/u.test(error.code)
    ? error.code : 'dsh_runtime_failed';
  return { code, message: String(error?.message ?? 'DSH runtime request failed').slice(0, 2048) };
}

function safeEnvironment(source) {
  const names = process.platform === 'win32'
    ? ['PATH', 'Path', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP', 'COMSPEC']
    : ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME'];
  const result = {};
  for (const name of names) {
    const value = source[name];
    if (typeof value === 'string' && value !== '') result[name] = value;
  }
  for (const [key, value] of Object.entries(source)) {
    if (/^DSH_CLIENT_(?:CODEAGENT_ENDPOINT|CODEAGENT_TOKEN|CODEAGENT_IDS|RUNTIME_ROOT|DSH_BUNDLE_ROOT)$/u.test(key)
        && typeof value === 'string' && value !== '') result[key] = value;
  }
  if (typeof source.DSH_HOME === 'string' && source.DSH_HOME !== '') result.DSH_HOME = source.DSH_HOME;
  result.NODE_ENV = 'production';
  return result;
}

async function installProfile() {
  const home = process.env.DSH_HOME;
  const bundleRoot = process.env.DSH_CLIENT_DSH_BUNDLE_ROOT;
  if (typeof home !== 'string' || !isAbsolute(home)
      || typeof bundleRoot !== 'string' || !isAbsolute(bundleRoot)) {
    throw runtimeError('dsh_runtime_configuration_invalid', 'DSH_HOME and DSH_CLIENT_DSH_BUNDLE_ROOT must be absolute paths');
  }
  const staged = join(bundleRoot, 'bundles', ...PROVIDER_PACKAGE.split('/'));
  const source = await readFile(join(staged, 'package.json'), 'utf8').then(() => staged).catch(() => bundleRoot);
  const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
  if (manifest.name !== PROVIDER_PACKAGE || manifest.dsh?.bundle?.patch !== './cordis.patch.yml') {
    throw runtimeError('dsh_provider_bundle_invalid', 'bundled DSH CodeAgent provider metadata is invalid');
  }
  const profileRoot = join(home, 'profiles', PROFILE);
  const providerRoot = join(profileRoot, 'node_modules', ...PROVIDER_PACKAGE.split('/'));
  await mkdir(dirname(providerRoot), { recursive: true });
  await mkdir(profileRoot, { recursive: true });
  for (const relativePath of PROVIDER_SOURCE_FILES) {
    const from = join(source, relativePath);
    const to = join(providerRoot, relativePath);
    await cp(from, to, { recursive: true, force: true });
  }
  await writeFile(join(profileRoot, 'package.json'), `${JSON.stringify({
    name: 'dsh-local-codeagent-profile', version: '0.1.0', private: true, type: 'module',
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-sdk-app', PROVIDER_PACKAGE], patchReload: 'startup' } },
  }, null, 2)}\n`);
  await writeFile(join(profileRoot, 'cordis.patch.yml'), '[]\n');
  return { profileRoot, runtimeRoot: process.env.DSH_CLIENT_RUNTIME_ROOT };
}

async function closeHarness() {
  const current = harness;
  harness = null;
  activeRoute = null;
  if (current) await current.close();
}

async function ensureHarness(providerId, model, config) {
  const route = `${providerId}\0${model ?? 'native-default'}`;
  if (harness && activeRoute === route) return harness;
  await closeHarness();
  const endpoint = process.env.DSH_CLIENT_CODEAGENT_ENDPOINT;
  const token = process.env.DSH_CLIENT_CODEAGENT_TOKEN;
  if (typeof endpoint !== 'string' || typeof token !== 'string' || token.length < 24) {
    throw runtimeError('dsh_callback_configuration_missing', 'local CodeAgent callback is not configured');
  }
  harness = new DeepSeekHarness({
    profile: PROFILE,
    dshHome: process.env.DSH_HOME,
    provider: `dsh-local-codeagent-${providerId}`,
    model: model ?? 'native-default',
    cwd: config.runtimeRoot,
    processCwd: config.runtimeRoot,
    initializeTimeoutMs: 30_000,
    requestTimeoutMs: 30 * 60 * 1000,
    env: safeEnvironment(process.env),
  });
  activeRoute = route;
  return harness;
}

async function run(request, config) {
  const id = request.id;
  const sessionId = request.session_id;
  const providerId = request.provider_id;
  const model = request.model === null || request.model === undefined || request.model === '' ? null : request.model;
  if (stopping) throw runtimeError('dsh_runtime_stopping', 'DSH runtime is shutting down');
  if (typeof id !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/u.test(id)
      || typeof sessionId !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/u.test(sessionId)
      || !ALLOWED_PROVIDERS.has(providerId)) {
    throw runtimeError('dsh_request_invalid', 'DSH run identity or provider is invalid');
  }
  if (typeof request.prompt !== 'string' || request.prompt.trim() === ''
      || Buffer.byteLength(request.prompt, 'utf8') > MAX_PROMPT_BYTES) {
    throw runtimeError('dsh_prompt_invalid', 'DSH prompt is empty or exceeds the supported size');
  }
  if (running.has(id)) throw runtimeError('dsh_request_duplicate', 'DSH request id is already active');
  const controller = new AbortController();
  running.set(id, { controller });
  try {
    const instance = await ensureHarness(providerId, model, config);
    const result = await instance.run(request.prompt, { sessionId });
    report({ type: 'result', id, result: {
      session_id: result.sessionId,
      final_response: result.finalResponse,
      events: result.events.map((event) => ({
        type: event.type,
        ...(event.type === 'step/end' || event.type === 'turn/end' ? { data: event.data } : {}),
      })),
    } });
  } finally {
    running.delete(id);
  }
}

async function shutdown(id = randomUUID()) {
  stopping = true;
  for (const entry of running.values()) entry.controller.abort();
  await closeHarness();
  report({ type: 'stopped', id });
  process.exitCode = 0;
}

async function main() {
  const config = await installProfile();
  if (typeof config.runtimeRoot !== 'string' || !isAbsolute(config.runtimeRoot)) {
    throw runtimeError('dsh_runtime_configuration_invalid', 'DSH_CLIENT_RUNTIME_ROOT must be an absolute path');
  }
  report({ type: 'ready', protocol_version: 1 });
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on('line', (line) => {
    if (Buffer.byteLength(line, 'utf8') > 1024 * 1024) {
      report({ type: 'error', id: 'invalid', error: { code: 'dsh_request_too_large', message: 'DSH sidecar request is too large' } });
      return;
    }
    let request;
    try { request = JSON.parse(line); } catch {
      report({ type: 'error', id: 'invalid', error: { code: 'dsh_request_invalid', message: 'DSH sidecar request is invalid JSON' } });
      return;
    }
    if (request.type === 'run') {
      void run(request, config).catch((error) => report({ type: 'error', id: request.id, error: safeError(error) }));
    } else if (request.type === 'cancel' && typeof request.id === 'string') {
      running.get(request.id)?.controller.abort();
      void closeHarness().catch(() => {});
    } else if (request.type === 'shutdown') {
      void shutdown(typeof request.id === 'string' ? request.id : undefined).catch((error) => {
        report({ type: 'error', id: request.id ?? 'shutdown', error: safeError(error) });
        process.exitCode = 1;
      });
      input.close();
    }
  });
  input.on('close', () => { if (!stopping) void shutdown(); });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error?.code ?? 'dsh_runtime_start_failed'}: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
