import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadLocalConsoleServer } from './runtime-loader.js';

const MAX_PROXY_BODY_BYTES = 2 * 1024 * 1024;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

function listen(server, host, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => { server.off('listening', onListening); reject(error); };
    const onListening = () => { server.off('error', onError); resolve(server.address()); };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function close(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function tokenMatches(actual, expected) {
  if (typeof actual !== 'string' || !actual.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(actual.slice(7));
  const stored = Buffer.from(expected);
  return supplied.length === stored.length && timingSafeEqual(supplied, stored);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_PROXY_BODY_BYTES) {
      throw Object.assign(new Error('local request exceeds the supported size'), { code: 'body_too_large' });
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function startLocalCore({
  repoRoot = null,
  runtimeRoot = repoRoot,
  workspaceRoot = repoRoot ?? runtimeRoot,
  stateFile,
  token = randomBytes(32).toString('base64url'),
  dshCallbackToken = null,
  host = '127.0.0.1',
  port = 0,
  backendPort = 0,
  localConsoleOptions = {},
} = {}) {
  if (!LOOPBACK_HOSTS.has(host)) {
    throw Object.assign(new Error('Local Core must bind to a loopback interface'), { code: 'local_core_bind_invalid' });
  }
  if (typeof runtimeRoot !== 'string' || !runtimeRoot.trim()) {
    throw Object.assign(new Error('runtimeRoot is required to start Local Core'), { code: 'local_core_runtime_required' });
  }
  if (typeof workspaceRoot !== 'string' || !workspaceRoot.trim()) {
    throw Object.assign(new Error('workspaceRoot is required to start Local Core'), { code: 'local_core_workspace_required' });
  }
  if (typeof token !== 'string' || token.length < 16 || /[\0\r\n]/u.test(token)) {
    throw Object.assign(new Error('Local Core token must contain at least 16 safe characters'), { code: 'local_core_token_invalid' });
  }
  if (dshCallbackToken !== null && (typeof dshCallbackToken !== 'string' || dshCallbackToken.length < 24 || /[\0\r\n]/u.test(dshCallbackToken))) {
    throw Object.assign(new Error('DSH callback token must contain at least 24 safe characters'), { code: 'local_core_dsh_token_invalid' });
  }
  const createLocalConsoleServer = await loadLocalConsoleServer({ ...(runtimeRoot ? { runtimeRoot } : {}) });
  const backendToken = randomBytes(32).toString('base64url');
  const backend = createLocalConsoleServer({
    repoRoot: runtimeRoot,
    runtimeRoot,
    workspaceRoot,
    ...(stateFile ? { stateFile } : {}),
    ...localConsoleOptions,
    internalAuthToken: backendToken,
    ...(dshCallbackToken ? { dshCallbackToken } : {}),
  });
  let backendAddress;
  try {
    backendAddress = await listen(backend, host === 'localhost' ? '127.0.0.1' : host, backendPort);
    const backendOrigin = `http://127.0.0.1:${backendAddress.port}`;
    const gateway = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://dsh-local-core.local');
      if (req.method === 'GET' && url.pathname === '/healthz') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ status: 'ok', service: 'dsh-agent-local-core', protocol_version: 1 }));
        return;
      }
      const apiRoute = url.pathname.startsWith('/api/');
      const dshCallbackRoute = url.pathname.startsWith('/internal/dsh/');
      if (!apiRoute && !dshCallbackRoute) {
        res.writeHead(404, { 'cache-control': 'no-store' });
        res.end();
        return;
      }
      const expectedToken = dshCallbackRoute ? dshCallbackToken : token;
      if (!expectedToken || !tokenMatches(req.headers.authorization, expectedToken)) {
        res.writeHead(401, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ error: { code: 'local_core_authentication_required' } }));
        return;
      }
      try {
        const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
        const proxyController = new AbortController();
        req.once('aborted', () => proxyController.abort());
        res.once('close', () => { if (!res.writableEnded) proxyController.abort(); });
        const response = await fetch(new URL(`${url.pathname}${url.search}`, backendOrigin), {
          method: req.method,
          ...(body ? { body } : {}),
          headers: {
            'x-dsh-local-core-internal': backendToken,
            ...(dshCallbackRoute ? { authorization: `Bearer ${dshCallbackToken}` } : {}),
            ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
          },
          signal: AbortSignal.any([proxyController.signal, AbortSignal.timeout(5 * 60 * 1000)]),
        });
        const bytes = Buffer.from(await response.arrayBuffer());
        res.writeHead(response.status, {
          'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        });
        res.end(bytes);
      } catch (error) {
        if (res.destroyed) return;
        const status = error?.code === 'body_too_large' ? 413 : 502;
        res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ error: { code: error?.code ?? 'local_core_backend_unavailable', message: error?.message ?? 'Local Core request failed' } }));
      }
    });
    const address = await listen(gateway, host === 'localhost' ? '127.0.0.1' : host, port);
    let closed = false;
    return {
      host: address.address,
      port: address.port,
      origin: `http://127.0.0.1:${address.port}`,
      token,
      close: async () => {
        if (closed) return;
        closed = true;
        await close(gateway);
        await close(backend);
      },
    };
  } catch (error) {
    await close(backend).catch(() => {});
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const workspaceRoot = process.env.DSH_CLIENT_WORKSPACE;
  const runtimeRoot = process.env.DSH_CLIENT_RUNTIME_ROOT ?? workspaceRoot;
  const stateFile = process.env.DSH_CLIENT_STATE_FILE;
  const token = process.env.DSH_CLIENT_CORE_TOKEN;
  const port = Number(process.env.DSH_CLIENT_CORE_PORT ?? 0);
  const core = await startLocalCore({ runtimeRoot, workspaceRoot, stateFile, token, port });
  process.stdout.write(`${JSON.stringify({ host: core.host, port: core.port, token: core.token, protocol_version: 1 })}\n`);
  const shutdown = () => core.close().finally(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
