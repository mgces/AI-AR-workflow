const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

export class WorkspaceGatewayClientError extends Error {
  constructor(code, message, { status = null, details = {}, cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'WorkspaceGatewayClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new WorkspaceGatewayClientError(code, message, { details });
}

function normalizeUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') fail('gateway_url_invalid', 'baseUrl is required');
  let parsed;
  try { parsed = new URL(value); } catch { fail('gateway_url_invalid', 'baseUrl must be a valid HTTP(S) URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    fail('gateway_url_invalid', 'baseUrl must be an HTTP(S) URL without embedded credentials');
  }
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/u, '')}`;
}

function boundedDetails(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 16 * 1024) return { truncated: true };
    return structuredClone(value);
  } catch { return {}; }
}

async function readJson(response) {
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) {
    throw new WorkspaceGatewayClientError('gateway_response_too_large', 'gateway response exceeded the configured limit', { status: response.status });
  }
  try { return text ? JSON.parse(text) : {}; }
  catch { throw new WorkspaceGatewayClientError('gateway_protocol_invalid', 'gateway response was not valid JSON', { status: response.status }); }
}

export class WorkspaceGatewayClient {
  constructor({ baseUrl, fetchImpl = globalThis.fetch, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    this.baseUrl = normalizeUrl(baseUrl);
    if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10 * 60 * 1000) throw new TypeError('timeoutMs is invalid');
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) throw new TypeError('headers must be an object');
    this.fetchImpl = fetchImpl;
    this.headers = { ...headers };
    this.timeoutMs = timeoutMs;
  }

  async health({ signal } = {}) {
    const response = await this.#request('/healthz', { method: 'GET', signal });
    const { _http_status: _status, ...health } = response ?? {};
    if (!health || health.status !== 'ok') throw new WorkspaceGatewayClientError('gateway_health_invalid', 'gateway health response was invalid', { details: boundedDetails(health) });
    return health;
  }

  async execute(envelope, { signal } = {}) {
    const response = await this.#request('/v1/envelope', {
      method: 'POST', signal,
      body: JSON.stringify(envelope),
    });
    if (response?.ok === true) return response.result;
    const error = response?.error ?? {};
    throw new WorkspaceGatewayClientError(
      typeof error.code === 'string' && error.code ? error.code : 'gateway_request_failed',
      typeof error.message === 'string' && error.message ? error.message : 'workspace gateway request failed',
      { status: response?._http_status ?? null, details: boundedDetails(error.details) },
    );
  }

  async #request(path, { method, body, signal }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('gateway timeout'), this.timeoutMs);
    const onAbort = () => controller.abort(signal?.reason ?? 'aborted');
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    try {
      let response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers: { accept: 'application/json', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...this.headers },
          body,
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          const timeout = !signal?.aborted;
          throw new WorkspaceGatewayClientError(timeout ? 'gateway_timeout' : 'gateway_aborted', timeout ? 'workspace gateway request timed out' : 'workspace gateway request was aborted', { cause: error });
        }
        throw new WorkspaceGatewayClientError('gateway_network_error', error?.message ?? 'workspace gateway network request failed', { cause: error });
      }
      const payload = await readJson(response);
      if (!response.ok && payload?.ok !== false) {
        throw new WorkspaceGatewayClientError(
          payload?.error?.code ?? 'gateway_http_error',
          payload?.error?.message ?? `workspace gateway returned HTTP ${response.status}`,
          { status: response.status, details: boundedDetails(payload?.error?.details) },
        );
      }
      return { ...payload, _http_status: response.status };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
}
