import { createServer } from 'node:http';
import { createInterface } from 'node:readline';

const DEFAULT_MAX_LINE_BYTES = 512 * 1024;
const MAX_ERROR_MESSAGE = 4096;
const MAX_ERROR_DETAILS_BYTES = 16 * 1024;

function boundedMessage(error) {
  const message = String(error?.message ?? error ?? 'gateway request failed');
  return message.length <= MAX_ERROR_MESSAGE ? message : `${message.slice(0, MAX_ERROR_MESSAGE - 3)}...`;
}
function safeDetails(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_ERROR_DETAILS_BYTES) return { truncated: true };
    return structuredClone(value);
  } catch {
    return {};
  }
}

function errorResponse(error, fallbackCode = 'gateway_error') {
  return {
    ok: false,
    error: {
      code: typeof error?.code === 'string' && error.code.length > 0 ? error.code : fallbackCode,
      message: boundedMessage(error),
      details: safeDetails(error?.details),
    },
  };
}

function writeJson(output, value) {
  try {
    output.write(`${JSON.stringify(value)}\n`);
  } catch {
    // The caller may close stdout while an in-flight operation is finishing.
  }
}

/**
 * Transport-neutral gateway facade. Keeping error normalization here means
 * JSONL, HTTP and a future WSS adapter expose the same bounded response.
 */
export class WorkspaceGatewayService {
  constructor({ connector } = {}) {
    if (!connector || typeof connector.execute !== 'function') {
      throw new TypeError('WorkspaceGatewayService requires a connector.execute function');
    }
    this.connector = connector;
  }

  async handle(envelope) {
    try {
      const result = await this.connector.execute(envelope);
      return { ok: true, result };
    } catch (error) {
      return errorResponse(error);
    }
  }
}

/**
 * Run a Connector as a line-delimited JSON process. It is suitable for a
 * local WSL supervisor, systemd service, or an SSH stdio channel. Requests
 * are dispatched concurrently so an operation.cancel envelope can reach an
 * operation that is still running; each response is one complete JSON line.
 */
export function createJsonlGateway({
  connector = null,
  service = connector ? new WorkspaceGatewayService({ connector }) : null,
  input = process.stdin,
  output = process.stdout,
  maxLineBytes = DEFAULT_MAX_LINE_BYTES,
} = {}) {
  if (!service || typeof service.handle !== 'function') {
    throw new TypeError('createJsonlGateway requires a WorkspaceGatewayService or connector');
  }
  if (!Number.isInteger(maxLineBytes) || maxLineBytes < 256 || maxLineBytes > 8 * 1024 * 1024) {
    throw new TypeError('maxLineBytes must be between 256 and 8388608');
  }
  let reader = null;
  let started = false;
  let closed = false;
  const pending = new Set();
  let idleWaiters = [];

  const signalIdle = () => {
    if (pending.size !== 0) return;
    const waiters = idleWaiters;
    idleWaiters = [];
    for (const resolve of waiters) resolve();
  };
  const dispatch = (line) => {
    if (closed) return;
    if (Buffer.byteLength(line, 'utf8') > maxLineBytes) {
      writeJson(output, errorResponse(Object.assign(new Error('JSONL request exceeds the configured line limit'), { code: 'line_too_large' })));
      return;
    }
    let envelope;
    try {
      envelope = JSON.parse(line);
    } catch {
      writeJson(output, errorResponse(Object.assign(new Error('JSONL request must be valid JSON'), { code: 'invalid_json' })));
      return;
    }
    const task = Promise.resolve(service.handle(envelope))
      .then((response) => writeJson(output, response))
      .catch((error) => writeJson(output, errorResponse(error)))
      .finally(() => {
        pending.delete(task);
        signalIdle();
      });
    pending.add(task);
  };

  const gateway = {
    get closed() { return closed; },
    start() {
      if (started || closed) return gateway;
      started = true;
      reader = createInterface({ input, crlfDelay: Infinity, terminal: false });
      reader.on('line', dispatch);
      reader.on('close', () => { closed = true; signalIdle(); });
      reader.on('error', () => { closed = true; signalIdle(); });
      return gateway;
    },
    async waitForIdle() {
      // readline delivers a just-written line on a later turn of the event
      // loop; yield once before deciding that there is no pending operation.
      await new Promise((resolve) => setImmediate(resolve));
      if (pending.size === 0) return;
      await new Promise((resolve) => idleWaiters.push(resolve));
    },
    stop() {
      if (closed) return;
      closed = true;
      reader?.close();
      signalIdle();
    },
  };
  return gateway;
}

/**
 * Small HTTP adapter for a reverse proxy or a private cloud link. Authority
 * envelope signatures remain the authorization boundary; an optional
 * `authorize` hook can add mTLS/bearer checks at the transport boundary.
 */
export function createGatewayHttpServer({ service, authorize = null, maxBodyBytes = DEFAULT_MAX_LINE_BYTES } = {}) {
  if (!service || typeof service.handle !== 'function') throw new TypeError('service.handle is required');
  if (typeof authorize !== 'function' && authorize !== null) throw new TypeError('authorize must be a function');
  const server = createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    if (req.method === 'GET' && req.url === '/healthz') {
      send(200, { status: 'ok', service: 'workspace-gateway' });
      return;
    }
    if (req.method !== 'POST' || req.url !== '/v1/envelope') {
      send(404, { error: { code: 'not_found', message: 'route not found' } });
      return;
    }
    try {
      if (authorize && !(await authorize(req))) {
        send(401, { error: { code: 'transport_unauthorized', message: 'transport authorization failed' } });
        return;
      }
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > maxBodyBytes) throw Object.assign(new Error('request body exceeds the configured limit'), { code: 'body_too_large' });
        chunks.push(chunk);
      }
      let envelope;
      try { envelope = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { throw Object.assign(new Error('request body must be valid JSON'), { code: 'invalid_json' }); }
      const response = await service.handle(envelope);
      send(response.ok ? 200 : 400, response);
    } catch (error) {
      const response = errorResponse(error);
      send(error.code === 'body_too_large' ? 413 : 400, response);
    }
  });
  return server;
}
