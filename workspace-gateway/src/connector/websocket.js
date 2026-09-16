import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve as resolvePath } from 'node:path';

const PROTOCOL_VERSION = 1;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const DEFAULT_MAX_MESSAGE_BYTES = 512 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_HELLO_TIMEOUT_MS = 10_000;
const OUTBOX_SCHEMA_VERSION = 1;
const DEFAULT_OUTBOX_RETENTION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_OUTBOX_MAX_BYTES = 16 * 1024 * 1024;

function protocolError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function boundedText(value, field, max = 256) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || /[\0\r\n]/u.test(value)) {
    throw protocolError('connector_protocol_invalid', `${field} is invalid`, { field });
  }
  return value;
}

function jsonSize(value) {
  try { return Buffer.byteLength(JSON.stringify(value), 'utf8'); } catch { return Infinity; }
}

function operationKeyFor(command) {
  const value = command?.payload?.operation_id
    ?? command?.payload?.operationId
    ?? command?.operation_id
    ?? command?.operationId;
  if (typeof value !== 'string' || value.trim() === '' || value.length > 256) return null;
  return `${command.kind}:${value.trim()}`;
}

function stableJson(value) {
  if (value === undefined || value === null) return 'null';
  if (typeof value !== 'object') {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new TypeError('value is not JSON serializable');
    return serialized;
  }
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

function commandFingerprint(command) {
  return createHash('sha256').update(stableJson(command), 'utf8').digest('hex');
}

function serializedError(error) {
  return {
    code: typeof error?.code === 'string' && error.code ? error.code : 'connector_command_failed',
    message: typeof error?.message === 'string' && error.message ? error.message : String(error),
    details: error?.details && typeof error.details === 'object' ? structuredClone(error.details) : {},
  };
}

function restoredError(value) {
  return new ConnectorWebSocketError(value?.code ?? 'connector_command_failed',
    value?.message ?? 'local Connector command failed', value?.details ?? {});
}

function tokenMatches(expected, actual) {
  if (expected === null || expected === undefined) return true;
  if (typeof actual !== 'string') return false;
  const left = Buffer.from(String(expected));
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeOrigin(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError('allowedOrigins must contain non-empty origins');
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError('allowedOrigins must contain valid origins'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password
      || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new TypeError('allowedOrigins must contain origin URLs without paths or credentials');
  }
  return parsed.origin;
}

function normalizeFingerprint(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError('certificate fingerprints must be non-empty strings');
  if (!/^[a-f0-9:]+$/iu.test(value)) throw new TypeError('certificate fingerprint is invalid');
  return value.replaceAll(':', '').toLowerCase();
}

function peerCertificateFingerprint(req) {
  const cert = req?.socket?.getPeerCertificate?.() ?? req?.client?.getPeerCertificate?.();
  const fingerprint = cert?.fingerprint256 ?? cert?.fingerprint ?? null;
  return typeof fingerprint === 'string' && fingerprint ? normalizeFingerprint(fingerprint) : null;
}

function httpReject(socket, status, message = 'WebSocket upgrade rejected') {
  const reason = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden'
    : status === 503 ? 'Service Unavailable' : 'Bad Request';
  try {
    socket.write(`HTTP/1.1 ${status} ${reason}\r\n`
      + 'Connection: close\r\n'
      + 'Content-Type: text/plain; charset=utf-8\r\n'
      + `Content-Length: ${Buffer.byteLength(message, 'utf8')}\r\n\r\n${message}`);
  } finally {
    socket.destroy();
  }
}

function closeFrame(code, reason = '') {
  const bounded = Buffer.from(String(reason)).subarray(0, 123);
  const payload = Buffer.allocUnsafe(2 + bounded.length);
  payload.writeUInt16BE(code, 0);
  bounded.copy(payload, 2);
  return payload;
}

function encodeFrame(opcode, value) {
  const payload = Buffer.isBuffer(value) ? value : Buffer.from(value ?? '');
  const first = Buffer.from([0x80 | (opcode & 0x0f)]);
  let header;
  if (payload.length < 126) {
    header = Buffer.concat([first, Buffer.from([payload.length])]);
  } else if (payload.length <= 0xffff) {
    header = Buffer.allocUnsafe(4);
    first.copy(header, 0);
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    first.copy(header, 0);
    header[1] = 127;
    // JavaScript can safely represent lengths up to 2^53 - 1. The max
    // message guard rejects anything larger before this branch is reached.
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(payload.length, 6);
  }
  return Buffer.concat([header, payload]);
}

/**
 * Minimal RFC 6455 peer used by the DSH host WebServer upgrade hook. It only
 * accepts masked client text frames and emits unmasked text frames. Binary,
 * fragmented and extension frames are rejected so the Connector protocol has
 * one deterministic JSON representation at the transport boundary.
 */
export class WebSocketFramePeer {
  constructor(socket, {
    head = null,
    maxMessageBytes = DEFAULT_MAX_MESSAGE_BYTES,
    onMessage = null,
    onClose = null,
    onError = null,
  } = {}) {
    if (!socket || typeof socket.on !== 'function' || typeof socket.write !== 'function') {
      throw new TypeError('socket must be a Duplex stream');
    }
    if (!Number.isInteger(maxMessageBytes) || maxMessageBytes < 1024 || maxMessageBytes > 8 * 1024 * 1024) {
      throw new TypeError('maxMessageBytes is invalid');
    }
    this.socket = socket;
    this.maxMessageBytes = maxMessageBytes;
    this.onMessage = onMessage;
    this.onClose = onClose;
    this.onError = onError;
    this.buffer = Buffer.alloc(0);
    this.closed = false;
    this.closeSent = false;
    this.#onData = (chunk) => this.#consume(chunk);
    this.#onSocketClose = () => this.#finish();
    this.#onSocketError = (error) => {
      try { this.onError?.(error); } finally { this.#finish(error); }
    };
    socket.on('data', this.#onData);
    socket.once('close', this.#onSocketClose);
    socket.once('error', this.#onSocketError);
    socket.setNoDelay?.(true);
    if (head && head.length > 0) this.#consume(head);
  }

  send(value) {
    if (this.closed) throw protocolError('connector_disconnected', 'WebSocket is closed');
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    const bytes = Buffer.byteLength(text, 'utf8');
    if (bytes > this.maxMessageBytes) throw protocolError('connector_message_too_large', 'WebSocket message exceeds the configured limit');
    this.socket.write(encodeFrame(0x1, Buffer.from(text, 'utf8')));
  }

  ping() {
    if (!this.closed) this.socket.write(encodeFrame(0x9, Buffer.alloc(0)));
  }

  close(code = 1000, reason = '') {
    if (this.closed) return;
    this.closed = true;
    if (!this.closeSent) {
      this.closeSent = true;
      try { this.socket.write(encodeFrame(0x8, closeFrame(code, reason))); } catch { /* socket already closed */ }
    }
    this.socket.end();
    this.#finish();
  }

  #onData;
  #onSocketClose;
  #onSocketError;

  #consume(chunk) {
    if (this.closed) return;
    if (!Buffer.isBuffer(chunk)) chunk = Buffer.from(chunk);
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > this.maxMessageBytes + 32) {
      this.#protocolClose('frame buffer exceeds the configured limit');
      return;
    }
    try {
      while (this.buffer.length > 0 && !this.closed) {
        const frame = this.#nextFrame();
        if (!frame) return;
        this.#handleFrame(frame);
      }
    } catch (error) {
      this.onError?.(error);
      this.#protocolClose(error.message);
    }
  }

  #nextFrame() {
    if (this.buffer.length < 2) return null;
    const first = this.buffer[0];
    const second = this.buffer[1];
    const fin = (first & 0x80) !== 0;
    const rsv = first & 0x70;
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let offset = 2;
    if (!fin || rsv !== 0 || opcode === 0x0) throw protocolError('connector_frame_invalid', 'fragmented or extension WebSocket frames are not supported');
    if (!masked) throw protocolError('connector_frame_invalid', 'client WebSocket frames must be masked');
    if (length === 126) {
      if (this.buffer.length < offset + 2) return null;
      length = this.buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (this.buffer.length < offset + 8) return null;
      const high = this.buffer.readUInt32BE(offset);
      const low = this.buffer.readUInt32BE(offset + 4);
      if (high > 0x001fffff) throw protocolError('connector_frame_invalid', 'WebSocket frame length is not safely representable');
      length = high * 0x100000000 + low;
      offset += 8;
    }
    if (length > this.maxMessageBytes) throw protocolError('connector_message_too_large', 'WebSocket message exceeds the configured limit');
    if (opcode >= 0x8 && (!fin || length > 125)) throw protocolError('connector_frame_invalid', 'invalid WebSocket control frame');
    if (this.buffer.length < offset + 4 + length) return null;
    const mask = this.buffer.subarray(offset, offset + 4);
    offset += 4;
    const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
    this.buffer = this.buffer.subarray(offset + length);
    for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4];
    return { opcode, payload };
  }

  #handleFrame({ opcode, payload }) {
    if (opcode === 0x1) {
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(payload); }
      catch { throw protocolError('connector_frame_invalid', 'WebSocket text frame is not valid UTF-8'); }
      let value;
      try { value = JSON.parse(text); }
      catch { throw protocolError('connector_json_invalid', 'Connector WebSocket frame must be valid JSON'); }
      Promise.resolve(this.onMessage?.(value)).catch((error) => this.onError?.(error));
      return;
    }
    if (opcode === 0x8) {
      if (!this.closeSent) {
        this.closeSent = true;
        this.socket.write(encodeFrame(0x8, payload.length >= 2 ? payload : closeFrame(1000)));
      }
      this.socket.end();
      this.#finish();
      return;
    }
    if (opcode === 0x9) {
      this.socket.write(encodeFrame(0xa, payload));
      return;
    }
    // Pong and unknown control opcodes have no application meaning.
    if (opcode !== 0xa) throw protocolError('connector_frame_invalid', `unsupported WebSocket opcode ${opcode}`);
  }

  #protocolClose(reason) {
    if (this.closed) return;
    this.close(1002, String(reason).slice(0, 123));
  }

  #finish(error = null) {
    if (this.closed && this.finished) return;
    this.finished = true;
    this.closed = true;
    this.onClose?.(error);
  }
}

export class ConnectorWebSocketError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ConnectorWebSocketError';
    this.code = code;
    this.details = details;
  }
}

function asConnectorError(error, fallback = 'connector_protocol_error') {
  if (error instanceof ConnectorWebSocketError) return error;
  return new ConnectorWebSocketError(error?.code ?? fallback, error?.message ?? String(error), error?.details ?? {});
}

/**
 * Cloud-side connection registry. The DSH host calls handleUpgrade from its
 * official WebServer.registerUpgrade('/v1/connect') hook. Only a connected
 * workspace session can receive a command; every response is correlated by a
 * random request id and bounded by a timeout.
 */
export class ConnectorWebSocketHub {
  constructor({
    protocolVersion = PROTOCOL_VERSION,
    authToken = null,
    workspaceId = null,
    deviceId = null,
    authorize = null,
    allowedOrigins = null,
    requireTls = false,
    requireClientCertificate = false,
    certificateFingerprints = null,
    pairingRegistry = null,
    audit = null,
    outboxFilePath = null,
    replayPending = outboxFilePath !== null,
    maxReplayPending = 1024,
    outboxRetentionMs = DEFAULT_OUTBOX_RETENTION_MS,
    outboxMaxBytes = DEFAULT_OUTBOX_MAX_BYTES,
    maxMessageBytes = DEFAULT_MAX_MESSAGE_BYTES,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    helloTimeoutMs = DEFAULT_HELLO_TIMEOUT_MS,
    heartbeatMs = 30_000,
  } = {}) {
    if (!Number.isInteger(protocolVersion) || protocolVersion < 1) throw new TypeError('protocolVersion is invalid');
    if (authToken !== null && (typeof authToken !== 'string' || authToken.length < 8)) throw new TypeError('authToken must contain at least 8 characters');
    if (workspaceId !== null) boundedText(workspaceId, 'workspace_id', 128);
    if (deviceId !== null) boundedText(deviceId, 'device_id', 128);
    if (authorize !== null && typeof authorize !== 'function') throw new TypeError('authorize must be a function');
    if (allowedOrigins !== null && (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0)) throw new TypeError('allowedOrigins must be a non-empty array or null');
    if (typeof requireTls !== 'boolean' || typeof requireClientCertificate !== 'boolean') throw new TypeError('TLS policy flags must be boolean');
    if (certificateFingerprints !== null && (!Array.isArray(certificateFingerprints) || certificateFingerprints.length === 0)) throw new TypeError('certificateFingerprints must be a non-empty array or null');
    if (pairingRegistry !== null && typeof pairingRegistry.authorize !== 'function') throw new TypeError('pairingRegistry must expose authorize');
    if (audit !== null && typeof audit !== 'function') throw new TypeError('audit must be a function');
    if (typeof replayPending !== 'boolean') throw new TypeError('replayPending must be boolean');
    if (!Number.isSafeInteger(maxReplayPending) || maxReplayPending < 1 || maxReplayPending > 10000) throw new TypeError('maxReplayPending is invalid');
    if (outboxFilePath !== null && (typeof outboxFilePath !== 'string' || !isAbsolute(outboxFilePath))) {
      throw new TypeError('outboxFilePath must be an absolute path or null');
    }
    if (!Number.isSafeInteger(outboxRetentionMs) || outboxRetentionMs < 1) throw new TypeError('outboxRetentionMs is invalid');
    if (!Number.isSafeInteger(outboxMaxBytes) || outboxMaxBytes < 64 * 1024) throw new TypeError('outboxMaxBytes is invalid');
    if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1 || requestTimeoutMs > 60 * 60 * 1000) throw new TypeError('requestTimeoutMs is invalid');
    this.protocolVersion = protocolVersion;
    this.authToken = authToken;
    this.workspaceId = workspaceId === null ? null : String(workspaceId);
    this.deviceId = deviceId === null ? null : String(deviceId);
    this.authorize = authorize;
    this.allowedOrigins = allowedOrigins === null ? null : new Set(allowedOrigins.map(normalizeOrigin));
    this.requireTls = requireTls;
    this.requireClientCertificate = requireClientCertificate;
    this.certificateFingerprints = certificateFingerprints === null
      ? null : new Set(certificateFingerprints.map(normalizeFingerprint));
    this.pairingRegistry = pairingRegistry;
    this.audit = audit;
    this.replayPending = replayPending;
    this.maxReplayPending = maxReplayPending;
    this.outboxFilePath = outboxFilePath === null ? null : resolvePath(outboxFilePath);
    this.outboxRetentionMs = outboxRetentionMs;
    this.outboxMaxBytes = outboxMaxBytes;
    this.maxMessageBytes = maxMessageBytes;
    this.requestTimeoutMs = requestTimeoutMs;
    this.helloTimeoutMs = helloTimeoutMs;
    this.heartbeatMs = heartbeatMs;
    this.sessions = new Map();
    this.connectionEpochs = new Map();
    this.peers = new Set();
    this.outbox = new Map();
    this.pendingByOperation = new Map();
    this.durableOutbox = new Map();
    this.closed = false;
    this.outboxLoadError = null;
    this.#loadDurableOutbox();
  }

  /**
   * Attach an already negotiated peer. HTTP upgrade handlers normally call
   * handleUpgrade(), but this hook also lets an embedding reverse proxy or a
   * test provide its own RFC6455 negotiation without duplicating command
   * correlation and session bookkeeping.
   */
  attachPeer(peer, { deviceId, workspaceId, capabilities = {} } = {}) {
    if (this.closed) throw new ConnectorWebSocketError('connector_hub_closed', 'Connector hub is closed');
    if (!peer || typeof peer.send !== 'function') throw new TypeError('peer.send is required');
    const safeDeviceId = boundedText(deviceId, 'device_id', 128);
    const safeWorkspaceId = boundedText(workspaceId, 'workspace_id', 128);
    this.#assertBinding(safeDeviceId, safeWorkspaceId);
    const previous = this.sessions.get(safeWorkspaceId);
    if (previous) previous.peer.close(4001, 'replaced by a newer Connector session');
    const connectionEpoch = (this.connectionEpochs.get(safeWorkspaceId) ?? 0) + 1;
    this.connectionEpochs.set(safeWorkspaceId, connectionEpoch);
    const session = {
      device_id: safeDeviceId,
      workspace_id: safeWorkspaceId,
      peer,
      connection_epoch: connectionEpoch,
      capabilities: capabilities && typeof capabilities === 'object' ? structuredClone(capabilities) : {},
      connected_at: new Date().toISOString(),
      last_heartbeat_at: new Date().toISOString(),
      pending: new Map(),
      heartbeat_timer: null,
    };
    const onMessage = async (message) => {
      session.last_heartbeat_at = new Date().toISOString();
      if (message?.type === 'heartbeat') {
        peer.send({ type: 'heartbeat_ack', at: session.last_heartbeat_at });
        return;
      }
      if (message?.type === 'ack' && typeof message.id === 'string') {
        const pending = session.pending.get(message.id);
        if (pending) pending.ack_at = new Date().toISOString();
        return;
      }
      if (message?.type !== 'response' || typeof message.id !== 'string') return;
      const pending = session.pending.get(message.id);
      if (!pending) return;
      if (message.ok === true) this.#settlePending(pending, { result: message.result });
      else this.#settlePending(pending, { error: new ConnectorWebSocketError(message.error?.code ?? 'connector_command_failed', message.error?.message ?? 'local Connector command failed', message.error?.details ?? {}) });
    };
    const onClose = () => {
      this.peers.delete(peer);
      if (this.sessions.get(safeWorkspaceId)?.peer === peer) this.sessions.delete(safeWorkspaceId);
      if (session.heartbeat_timer) clearInterval(session.heartbeat_timer);
      session.heartbeat_timer = null;
      this.#queueSessionPending(session);
    };
    peer.onMessage = onMessage;
    peer.onClose = onClose;
    this.sessions.set(safeWorkspaceId, session);
    this.peers.add(peer);
    this.#startHeartbeatMonitor(session);
    peer.send({ type: 'hello_ack', protocol_version: this.protocolVersion, workspace_id: safeWorkspaceId,
      connection_epoch: connectionEpoch, heartbeat_ms: this.heartbeatMs, server_time: new Date().toISOString() });
    this.#replayOutbox(session);
    return session;
  }

  #startHeartbeatMonitor(session) {
    if (!Number.isInteger(this.heartbeatMs) || this.heartbeatMs <= 0) return;
    const timeoutMs = Math.max(this.heartbeatMs * 3, this.heartbeatMs + 1_000);
    session.heartbeat_timer = setInterval(() => {
      if (this.sessions.get(session.workspace_id)?.peer !== session.peer) {
        clearInterval(session.heartbeat_timer);
        session.heartbeat_timer = null;
        return;
      }
      const last = Date.parse(session.last_heartbeat_at);
      if (!Number.isFinite(last) || Date.now() - last > timeoutMs) {
        session.peer.close(4002, 'Connector heartbeat timeout');
        return;
      }
      try { session.peer.ping?.(); } catch { session.peer.close(4002, 'Connector heartbeat failed'); }
    }, this.heartbeatMs);
    session.heartbeat_timer.unref?.();
  }

  #audit(event) {
    if (!this.audit) return;
    try { Promise.resolve(this.audit(structuredClone(event))).catch(() => {}); }
    catch { /* auditing must never make the transport fail open or crash */ }
  }

  #loadDurableOutbox() {
    if (!this.outboxFilePath) return;
    try {
      const fileSize = statSync(this.outboxFilePath).size;
      if (fileSize > this.outboxMaxBytes) throw new Error('Connector outbox file exceeds its configured size');
      const parsed = JSON.parse(readFileSync(this.outboxFilePath, 'utf8'));
      if (!parsed || parsed.schema_version !== OUTBOX_SCHEMA_VERSION || !Array.isArray(parsed.records)) {
        throw new Error('Connector outbox schema is invalid');
      }
      const now = Date.now();
      for (const value of parsed.records) {
        if (!value || typeof value.id !== 'string' || typeof value.workspace_id !== 'string'
            || typeof value.device_id !== 'string' || !['pending', 'completed', 'failed'].includes(value.state)) continue;
        if (value.state === 'pending' && (!value.command || typeof value.command !== 'object'
            || Array.isArray(value.command) || typeof value.command.kind !== 'string')) {
          throw new Error('Connector outbox pending record is invalid');
        }
        if (!value.command && typeof value.command_sha256 !== 'string') {
          throw new Error('Connector outbox result record has no command fingerprint');
        }
        const updated = Date.parse(value.updated_at ?? value.created_at ?? '');
        if (Number.isFinite(updated) && now - updated > this.outboxRetentionMs) continue;
        const operationKey = typeof value.operation_key === 'string' && value.operation_key.length > 0
          ? value.operation_key : operationKeyFor(value.command);
        if (!operationKey || operationKey.length > 512 || /[\0\r\n]/u.test(operationKey)) {
          throw new Error('Connector outbox operation key is invalid');
        }
        let commandSha256 = value.command_sha256;
        if (value.command) {
          const derivedOperationKey = operationKeyFor(value.command);
          const derivedSha256 = commandFingerprint(value.command);
          if (derivedOperationKey !== operationKey
              || (value.command_sha256 !== undefined && value.command_sha256 !== derivedSha256)) {
            throw new Error('Connector outbox command fingerprint is invalid');
          }
          commandSha256 = derivedSha256;
        }
        if (!/^[a-f0-9]{64}$/iu.test(String(commandSha256 ?? ''))) {
          throw new Error('Connector outbox command fingerprint is invalid');
        }
        if (value.state === 'completed' && value.result === undefined) {
          throw new Error('Connector outbox completed record has no result');
        }
        if (value.state === 'failed' && (!value.error || typeof value.error !== 'object')) {
          throw new Error('Connector outbox failed record has no error');
        }
        const record = {
          id: value.id,
          workspace_id: value.workspace_id,
          device_id: value.device_id,
          operation_key: operationKey,
          ...(value.command ? { command: structuredClone(value.command) } : {}),
          command_sha256: commandSha256,
          state: value.state,
          attempts: Number.isSafeInteger(value.attempts) && value.attempts >= 0 ? value.attempts : 1,
          created_at: value.created_at ?? new Date().toISOString(),
          updated_at: value.updated_at ?? value.created_at ?? new Date().toISOString(),
          ...(value.result !== undefined ? { result: structuredClone(value.result) } : {}),
          ...(value.error !== undefined ? { error: structuredClone(value.error) } : {}),
        };
        this.durableOutbox.set(this.#outboxKey(record.workspace_id, record.id), record);
      }
      this.#trimDurableOutbox();
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        this.outboxLoadError = error?.message ?? String(error);
        this.#audit({ event: 'outbox_load_failed', reason: this.outboxLoadError });
      }
    }
  }

  #durableRecord(pending) {
    return {
      id: pending.id,
      workspace_id: pending.workspaceId,
      device_id: pending.deviceId,
      operation_key: pending.operationKey,
      command: structuredClone(pending.command),
      command_sha256: pending.commandSha256,
      state: 'pending',
      attempts: pending.attempts ?? 1,
      created_at: pending.createdAt,
      updated_at: new Date().toISOString(),
    };
  }

  #trimDurableOutbox() {
    const now = Date.now();
    for (const [key, record] of this.durableOutbox.entries()) {
      const updated = Date.parse(record.updated_at ?? record.created_at ?? '');
      const activePending = record.state === 'pending' && this.outbox.has(key);
      if (Number.isFinite(updated) && now - updated > this.outboxRetentionMs && !activePending) {
        this.durableOutbox.delete(key);
      }
    }
    const maxRecords = this.maxReplayPending;
    const records = [...this.durableOutbox.values()];
    while (records.length > maxRecords) {
      const removable = records
        .filter((record) => record.state !== 'pending')
        .sort((left, right) => String(left.updated_at).localeCompare(String(right.updated_at)))[0];
      if (!removable) break;
      this.durableOutbox.delete(this.#outboxKey(removable.workspace_id, removable.id));
      records.splice(records.indexOf(removable), 1);
    }
  }

  #persistDurableOutbox() {
    if (!this.outboxFilePath) return;
    this.#trimDurableOutbox();
    const records = [...this.durableOutbox.values()].map((record) => structuredClone(record));
    const serialized = `${JSON.stringify({ schema_version: OUTBOX_SCHEMA_VERSION, records }, null, 2)}\n`;
    if (Buffer.byteLength(serialized, 'utf8') > this.outboxMaxBytes) {
      throw new ConnectorWebSocketError('connector_outbox_persist_failed', 'Connector replay outbox exceeds its configured size');
    }
    try {
      mkdirSync(dirname(this.outboxFilePath), { recursive: true, mode: 0o700 });
      const temporary = `${this.outboxFilePath}.${process.pid}.${Date.now()}.tmp`;
      writeFileSync(temporary, serialized, { encoding: 'utf8', mode: 0o600 });
      chmodSync(temporary, 0o600);
      renameSync(temporary, this.outboxFilePath);
    } catch (error) {
      throw new ConnectorWebSocketError('connector_outbox_persist_failed',
        `could not persist Connector replay outbox: ${error?.message ?? String(error)}`);
    }
  }

  #tryPersistDurableOutbox() {
    try { this.#persistDurableOutbox(); return null; }
    catch (error) {
      this.#audit({ event: 'outbox_persist_failed', reason: error?.message ?? String(error) });
      return error;
    }
  }

  #findDurableOperation(workspaceId, deviceId, operationKey) {
    if (!operationKey) return null;
    return [...this.durableOutbox.values()].find((record) => record.workspace_id === workspaceId
      && record.device_id === deviceId && record.operation_key === operationKey) ?? null;
  }

  #createPending({ id, workspaceId, deviceId, operationKey, command, session, signal, timeoutMs,
    resolve, reject, attempts = 1, createdAt = new Date().toISOString() }) {
    const commandSha256 = commandFingerprint(command);
    const pending = {
      id,
      workspaceId,
      deviceId,
      operationKey,
      command: structuredClone(command),
      commandSha256,
      createdAt,
      timer: null,
      signal,
      onAbort: null,
      session,
      attempts,
      ack_at: null,
      resolve,
      reject,
      promise: null,
    };
    const durableKey = this.#outboxKey(workspaceId, id);
    if (this.outboxFilePath && operationKey) {
      this.durableOutbox.set(durableKey, this.#durableRecord(pending));
      const error = this.#tryPersistDurableOutbox();
      if (error) {
        reject(error);
        return null;
      }
    }
    pending.timer = setTimeout(() => {
      this.#detachPending(pending, { keepDurable: Boolean(pending.operationKey) });
      pending.reject(new ConnectorWebSocketError('connector_timeout', `Connector command ${command.kind} timed out`));
    }, timeoutMs);
    pending.onAbort = () => {
      this.#detachPending(pending, { keepDurable: Boolean(pending.operationKey) });
      pending.reject(new ConnectorWebSocketError('connector_aborted', 'Connector command was aborted'));
    };
    signal?.addEventListener('abort', pending.onAbort, { once: true });
    if (session) session.pending.set(id, pending);
    if (operationKey) this.pendingByOperation.set(`${workspaceId}:${operationKey}`, pending);
    return pending;
  }

  #detachPending(pending, { keepDurable = false } = {}) {
    if (!pending) return;
    pending.session?.pending?.delete(pending.id);
    this.outbox.delete(this.#outboxKey(pending.workspaceId, pending.id));
    clearTimeout(pending.timer);
    pending.signal?.removeEventListener('abort', pending.onAbort);
    pending.session = null;
    if (pending.operationKey) {
      const operationKey = `${pending.workspaceId}:${pending.operationKey}`;
      if (this.pendingByOperation.get(operationKey) === pending) this.pendingByOperation.delete(operationKey);
    }
    if (!keepDurable) {
      this.durableOutbox.delete(this.#outboxKey(pending.workspaceId, pending.id));
      this.#tryPersistDurableOutbox();
    } else if (this.outboxFilePath) {
      const record = this.durableOutbox.get(this.#outboxKey(pending.workspaceId, pending.id));
      if (record) {
        record.updated_at = new Date().toISOString();
        record.attempts = pending.attempts;
      }
      this.#tryPersistDurableOutbox();
    }
  }

  #outboxKey(workspaceId, id) {
    return `${workspaceId}:${id}`;
  }

  #dropPending(pending) {
    this.#detachPending(pending);
  }

  #settlePending(pending, { result = undefined, error = null } = {}) {
    if (!pending) return;
    const durableKey = this.#outboxKey(pending.workspaceId, pending.id);
    this.#detachPending(pending, { keepDurable: Boolean(pending.operationKey) });
    if (pending.operationKey && this.outboxFilePath) {
      const record = this.durableOutbox.get(durableKey);
      if (record) {
        record.state = error ? 'failed' : 'completed';
        record.updated_at = new Date().toISOString();
        if (error) record.error = serializedError(error);
        else record.result = structuredClone(result);
        delete record.command;
        // Keep the command digest and operation key for conflict detection,
        // but do not retain the full command once its result is durable.
        this.#tryPersistDurableOutbox();
      }
    }
    if (error) pending.reject(error);
    else pending.resolve(result);
  }

  #queueSessionPending(session) {
    if (!this.replayPending) {
      for (const pending of session.pending.values()) {
        this.#settlePending(pending, {
          error: new ConnectorWebSocketError('connector_disconnected', 'local Connector disconnected'),
        });
      }
      session.pending.clear();
      return;
    }
    for (const pending of session.pending.values()) {
      session.pending.delete(pending.id);
      pending.session = null;
      if (this.outbox.size >= this.maxReplayPending) {
        this.#settlePending(pending, {
          error: new ConnectorWebSocketError('connector_outbox_full', 'Connector replay queue is full'),
        });
        continue;
      }
      this.outbox.set(this.#outboxKey(pending.workspaceId, pending.id), pending);
    }
    if (this.outboxFilePath) {
      for (const pending of this.outbox.values()) {
        const key = this.#outboxKey(pending.workspaceId, pending.id);
        const record = this.durableOutbox.get(key);
        if (record) {
          record.state = 'pending';
          record.updated_at = new Date().toISOString();
          record.attempts = pending.attempts;
        }
      }
      this.#tryPersistDurableOutbox();
    }
  }

  #replayOutbox(session) {
    if (!this.replayPending || this.closed) return;
    for (const [key, pending] of [...this.outbox.entries()]) {
      if (pending.workspaceId !== session.workspace_id || pending.deviceId !== session.device_id) continue;
      this.outbox.delete(key);
      pending.session = session;
      session.pending.set(pending.id, pending);
      try {
        session.peer.send({ type: 'command', id: pending.id, command: pending.command, replay: true });
        this.#audit({ event: 'command_replayed', workspace_id: session.workspace_id,
          device_id: session.device_id, command_id: pending.id, attempt: (pending.attempts ?? 0) + 1 });
        pending.attempts = (pending.attempts ?? 0) + 1;
        const record = this.durableOutbox.get(key);
        if (record) {
          record.attempts = pending.attempts;
          record.updated_at = new Date().toISOString();
        }
        this.#tryPersistDurableOutbox();
      } catch (error) {
        session.pending.delete(pending.id);
        pending.session = null;
        this.outbox.set(key, pending);
        this.#audit({ event: 'command_replay_failed', workspace_id: session.workspace_id,
          device_id: session.device_id, command_id: pending.id });
        break;
      }
    }
  }

  #transportSecurity(req) {
    const origin = req?.headers?.origin ?? null;
    if (this.allowedOrigins && (typeof origin !== 'string' || !this.allowedOrigins.has(origin))) {
      return { status: 403, message: 'Connector Origin is not allowed', reason: 'origin_not_allowed', origin };
    }
    const encrypted = req?.socket?.encrypted === true || req?.client?.encrypted === true;
    if (this.requireTls && !encrypted) {
      return { status: 400, message: 'Connector transport requires TLS', reason: 'tls_required' };
    }
    const authorized = req?.socket?.authorized === true || req?.client?.authorized === true;
    if (this.requireClientCertificate && (!encrypted || !authorized)) {
      return { status: 401, message: 'Connector client certificate is required', reason: 'client_certificate_required' };
    }
    let fingerprint = null;
    if (this.certificateFingerprints) {
      if (!encrypted) return { status: 400, message: 'Certificate fingerprint policy requires TLS', reason: 'tls_required' };
      try { fingerprint = peerCertificateFingerprint(req); } catch { fingerprint = null; }
      if (!fingerprint || !this.certificateFingerprints.has(fingerprint)) {
        return { status: 401, message: 'Connector client certificate is not paired', reason: 'client_certificate_not_paired', fingerprint };
      }
    }
    return { origin, encrypted, authorized, fingerprint };
  }

  #assertBinding(deviceId, workspaceId) {
    if (this.workspaceId !== null && workspaceId !== this.workspaceId) {
      throw new ConnectorWebSocketError('connector_workspace_mismatch',
        'Connector workspace_id does not match the configured workspace binding', {
          expected: this.workspaceId, actual: workspaceId,
        });
    }
    if (this.deviceId !== null && deviceId !== this.deviceId) {
      throw new ConnectorWebSocketError('connector_device_mismatch',
        'Connector device_id does not match the configured device binding', {
          expected: this.deviceId, actual: deviceId,
        });
    }
  }

  async handleUpgrade(req, socket, head = Buffer.alloc(0)) {
    if (this.closed) {
      httpReject(socket, 503, 'Connector hub is stopping');
      return;
    }
    if (req?.method !== 'GET' || String(req?.headers?.upgrade ?? '').toLowerCase() !== 'websocket') {
      httpReject(socket, 400, 'WebSocket upgrade required');
      return;
    }
    const key = req.headers?.['sec-websocket-key'];
    const version = req.headers?.['sec-websocket-version'];
    if (typeof key !== 'string' || version !== '13') {
      httpReject(socket, 400, 'unsupported WebSocket handshake');
      return;
    }
    const security = this.#transportSecurity(req);
    if (security.status) {
      this.#audit({ event: 'upgrade_rejected', reason: security.reason, origin: security.origin ?? null, fingerprint: security.fingerprint ?? null });
      httpReject(socket, security.status, security.message);
      return;
    }
    let url;
    try { url = new URL(req.url ?? '/', 'http://dsh.local'); }
    catch { httpReject(socket, 400, 'invalid WebSocket URL'); return; }
    const suppliedToken = url.searchParams.get('token') ?? req.headers?.['x-dsh-connector-token'] ?? null;
    if (!tokenMatches(this.authToken, suppliedToken)) {
      this.#audit({ event: 'upgrade_rejected', reason: 'transport_token_invalid', origin: security.origin ?? null, fingerprint: security.fingerprint ?? null });
      httpReject(socket, 401, 'connector transport authorization failed');
      return;
    }
    if (this.authorize) {
      let allowed = false;
      try { allowed = await this.authorize(req, { token: suppliedToken, url }); } catch { allowed = false; }
      if (!allowed) {
        this.#audit({ event: 'upgrade_rejected', reason: 'authorize_hook_rejected', origin: security.origin ?? null, fingerprint: security.fingerprint ?? null });
        httpReject(socket, 401, 'connector transport authorization failed');
        return;
      }
    }
    const accept = createHash('sha1').update(`${key}${WS_GUID}`).digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\n'
      + 'Upgrade: websocket\r\n'
      + 'Connection: Upgrade\r\n'
      + `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
    let session = null;
    let helloTimer = null;
    const peer = new WebSocketFramePeer(socket, {
      head,
      maxMessageBytes: this.maxMessageBytes,
      onMessage: async (message) => {
        if (!session) {
          if (!message || message.type !== 'hello') {
            peer.close(1002, 'hello required');
            return;
          }
          try {
            if (message.protocol_version !== this.protocolVersion) throw protocolError('connector_protocol_version', 'unsupported Connector protocol version');
            const deviceId = boundedText(message.device_id, 'device_id', 128);
            const workspaceId = boundedText(message.workspace_id, 'workspace_id', 128);
            this.#assertBinding(deviceId, workspaceId);
            if (!tokenMatches(this.authToken, message.token ?? suppliedToken)) throw protocolError('connector_unauthorized', 'Connector hello authorization failed');
            if (this.pairingRegistry) {
              const paired = await this.pairingRegistry.authorize({
                deviceId, workspaceId, token: message.token ?? suppliedToken,
                certificateFingerprint: security.fingerprint,
              });
              if (!paired) throw protocolError('connector_pairing_rejected', 'Connector device is not paired or its credential is revoked');
            }
            const previous = this.sessions.get(workspaceId);
            if (previous) previous.peer.close(4001, 'replaced by a newer Connector session');
            const connectionEpoch = (this.connectionEpochs.get(workspaceId) ?? 0) + 1;
            this.connectionEpochs.set(workspaceId, connectionEpoch);
            session = {
              device_id: deviceId,
              workspace_id: workspaceId,
              peer,
              connection_epoch: connectionEpoch,
              capabilities: message.capabilities && typeof message.capabilities === 'object' ? structuredClone(message.capabilities) : {},
              connected_at: new Date().toISOString(),
              last_heartbeat_at: new Date().toISOString(),
              pending: new Map(),
              heartbeat_timer: null,
            };
            this.sessions.set(workspaceId, session);
            this.#startHeartbeatMonitor(session);
            this.#audit({ event: 'connected', device_id: deviceId, workspace_id: workspaceId,
              connection_epoch: connectionEpoch, origin: security.origin ?? null, fingerprint: security.fingerprint ?? null });
            peer.send({ type: 'hello_ack', protocol_version: this.protocolVersion, workspace_id: workspaceId,
              connection_epoch: connectionEpoch, heartbeat_ms: this.heartbeatMs, server_time: new Date().toISOString() });
            this.#replayOutbox(session);
            if (helloTimer) clearTimeout(helloTimer);
          } catch (error) {
            peer.close(1008, error.message);
          }
          return;
        }
        session.last_heartbeat_at = new Date().toISOString();
        if (message?.type === 'heartbeat') {
          peer.send({ type: 'heartbeat_ack', at: session.last_heartbeat_at });
          return;
        }
        if (message?.type === 'ack' && typeof message.id === 'string') {
          const pending = session.pending.get(message.id);
          if (pending) pending.ack_at = new Date().toISOString();
          return;
        }
        if (message?.type !== 'response' || typeof message.id !== 'string') return;
        const pending = session.pending.get(message.id);
        if (!pending) return;
        if (message.ok === true) this.#settlePending(pending, { result: message.result });
        else this.#settlePending(pending, { error: new ConnectorWebSocketError(message.error?.code ?? 'connector_command_failed', message.error?.message ?? 'local Connector command failed', message.error?.details ?? {}) });
      },
      onClose: () => {
        if (helloTimer) clearTimeout(helloTimer);
        this.peers.delete(peer);
        if (session && this.sessions.get(session.workspace_id)?.peer === peer) this.sessions.delete(session.workspace_id);
        if (session) {
          if (session.heartbeat_timer) clearInterval(session.heartbeat_timer);
          session.heartbeat_timer = null;
          this.#queueSessionPending(session);
          this.#audit({ event: 'closed', device_id: session.device_id, workspace_id: session.workspace_id,
            connection_epoch: session.connection_epoch, origin: security.origin ?? null, fingerprint: security.fingerprint ?? null });
        }
      },
      onError: () => {},
    });
    this.peers.add(peer);
    helloTimer = setTimeout(() => {
      if (!session) peer.close(1008, 'Connector hello timed out');
    }, this.helloTimeoutMs);
  }

  request(workspaceId, command, { signal = null, timeoutMs = this.requestTimeoutMs } = {}) {
    if (!command || typeof command !== 'object' || Array.isArray(command) || typeof command.kind !== 'string') {
      return Promise.reject(new ConnectorWebSocketError('connector_command_invalid', 'Connector command kind is required'));
    }
    if (command.kind.length === 0 || command.kind.length > 128 || /[\0\r\n]/u.test(command.kind)) {
      return Promise.reject(new ConnectorWebSocketError('connector_command_invalid', 'Connector command kind is invalid'));
    }
    if (jsonSize(command) > this.maxMessageBytes / 2) return Promise.reject(new ConnectorWebSocketError('connector_message_too_large', 'Connector command exceeds the configured limit'));
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60 * 60 * 1000) return Promise.reject(new ConnectorWebSocketError('connector_timeout_invalid', 'Connector command timeout is invalid'));
    if (this.outboxLoadError) {
      return Promise.reject(new ConnectorWebSocketError('connector_outbox_load_failed',
        'Connector replay outbox could not be loaded; repair it before sending commands',
        { reason: this.outboxLoadError }));
    }
    const session = this.sessions.get(workspaceId);
    const operationKey = operationKeyFor(command);
    const commandSha256 = commandFingerprint(command);
    const active = operationKey ? this.pendingByOperation.get(`${workspaceId}:${operationKey}`) : null;
    if (active?.promise) return active.promise;
    const durable = operationKey && session
      ? this.#findDurableOperation(workspaceId, session.device_id, operationKey)
      : operationKey ? [...this.durableOutbox.values()].find((record) => record.workspace_id === workspaceId
        && record.operation_key === operationKey) ?? null : null;
    if (durable && durable.command_sha256 !== commandSha256) {
      return Promise.reject(new ConnectorWebSocketError('connector_operation_replay_conflict',
        `operation ${operationKey} was reused with different input`));
    }
    if (durable?.state === 'completed') return Promise.resolve(structuredClone(durable.result));
    if (durable?.state === 'failed') return Promise.reject(restoredError(durable.error));
    if (!session) return Promise.reject(new ConnectorWebSocketError('connector_offline', `Connector workspace ${workspaceId} is offline`));

    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    const pending = this.#createPending({
      id: durable?.id ?? randomUUID(),
      workspaceId,
      deviceId: session.device_id,
      operationKey,
      command,
      session,
      signal,
      timeoutMs,
      resolve: resolvePromise,
      reject: rejectPromise,
      attempts: durable?.attempts ?? 1,
      createdAt: durable?.created_at ?? new Date().toISOString(),
    });
    if (!pending) return promise;
    pending.promise = promise;
    if (signal?.aborted) {
      pending.onAbort?.();
      return promise;
    }
    try { session.peer.send({ type: 'command', id: pending.id, command }); }
    catch (error) {
      this.#detachPending(pending, { keepDurable: false });
      pending.reject(asConnectorError(error, 'connector_send_failed'));
    }
    return promise;
  }

  /**
   * Ask a connected local Connector to refresh its mount and CodeAgent probe.
   * The returned facts are copied into the session capabilities so a later
   * CodeAgent refresh reflects an Agent installed after the socket connected.
   */
  async probeWorkspace(workspaceId, options = {}) {
    const result = await this.request(workspaceId, {
      kind: 'probe',
      payload: { workspace_id: workspaceId },
    }, options);
    const session = this.sessions.get(workspaceId);
    if (session && result && typeof result === 'object') {
      session.capabilities = {
        ...session.capabilities,
        workspace_access: result.workspace_access ?? session.capabilities.workspace_access,
        remote_root: result.remote_root ?? session.capabilities.remote_root,
        agents: result.agents ?? session.capabilities.agents,
        connector_status: result.status ?? session.capabilities.connector_status,
        local_root_exists: result.local_root_exists,
        local_root_writable: result.local_root_writable,
        remote_workspace_reachable: result.remote_workspace_reachable,
        remote_workspace_writable: result.remote_workspace_writable,
        remote_tools: result.workspace_access === 'remote_tools',
      };
    }
    return result;
  }

  snapshot() {
    const durablePending = [...this.durableOutbox.values()]
      .filter((record) => record.state === 'pending')
      .filter((record) => !this.outbox.has(this.#outboxKey(record.workspace_id, record.id))).length;
    const durableOutbox = [...this.durableOutbox.values()]
      .sort((left, right) => String(right.updated_at).localeCompare(String(left.updated_at)))
      .map((record) => ({
        operation_key: record.operation_key,
        command_id: record.id,
        workspace_id: record.workspace_id,
        device_id: record.device_id,
        state: record.state,
        attempts: record.attempts,
        created_at: record.created_at,
        updated_at: record.updated_at,
        result_status: record.result?.status ?? null,
        error: record.error ? { code: record.error.code ?? null, message: record.error.message ?? null } : null,
      }));
    return {
      protocol_version: this.protocolVersion,
      transport: 'websocket',
      security: {
        tls_required: this.requireTls,
        client_certificate_required: this.requireClientCertificate,
        origin_allowlist_enabled: this.allowedOrigins !== null,
        certificate_fingerprint_allowlist_enabled: this.certificateFingerprints !== null,
        pairing_registry_enabled: this.pairingRegistry !== null,
        replay_pending_enabled: this.replayPending,
        persistent_outbox_enabled: this.outboxFilePath !== null,
        outbox_load_error: this.outboxLoadError,
      },
      connected: this.sessions.size > 0,
      replay_pending: this.outbox.size + durablePending,
      durable_outbox_records: this.durableOutbox.size,
      durable_outbox: durableOutbox,
      workspaces: [...this.sessions.values()].map((session) => ({
        workspace_id: session.workspace_id,
        device_id: session.device_id,
        connection_epoch: session.connection_epoch,
        connected: true,
        connected_at: session.connected_at,
        last_heartbeat_at: session.last_heartbeat_at,
        capabilities: structuredClone(session.capabilities),
      })),
    };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    // Move in-flight requests to the replay queue before closing peers. A
    // process restart must leave their durable records in the pending state;
    // callers attached to the old process still receive a deterministic
    // disconnect error and a new process can rebind by operation_id.
    for (const session of this.sessions.values()) {
      if (session.heartbeat_timer) clearInterval(session.heartbeat_timer);
      session.heartbeat_timer = null;
      this.#queueSessionPending(session);
    }
    for (const peer of this.peers) peer.close(1001, 'Connector hub is stopping');
    for (const pending of [...this.outbox.values()]) {
      this.#detachPending(pending, { keepDurable: Boolean(pending.operationKey) });
      pending.reject(new ConnectorWebSocketError('connector_disconnected', 'Connector hub is stopping'));
    }
    this.outbox.clear();
    this.peers.clear();
    this.sessions.clear();
    this.#tryPersistDurableOutbox();
  }
}

/** Local-side Connector transport used by the Windows/WSL agent process. */
export class WebSocketConnectorClient {
  constructor({
    url,
    deviceId,
    workspaceId,
    token = null,
    capabilities = {},
    commandHandler = null,
    WebSocketImpl = globalThis.WebSocket,
    reconnect = false,
    reconnectDelayMs = 1000,
  } = {}) {
    if (typeof url !== 'string' || !/^wss?:\/\//u.test(url)) throw new TypeError('url must be a ws:// or wss:// URL');
    boundedText(deviceId, 'deviceId', 128);
    boundedText(workspaceId, 'workspaceId', 128);
    if (token !== null && typeof token !== 'string') throw new TypeError('token must be a string');
    if (typeof WebSocketImpl !== 'function') throw new TypeError('WebSocket is unavailable in this Node runtime');
    if (commandHandler !== null && typeof commandHandler !== 'function') throw new TypeError('commandHandler must be a function');
    this.url = url;
    this.deviceId = deviceId;
    this.workspaceId = workspaceId;
    this.token = token;
    this.capabilities = capabilities;
    this.commandHandler = commandHandler;
    this.WebSocketImpl = WebSocketImpl;
    this.reconnect = reconnect;
    this.reconnectDelayMs = reconnectDelayMs;
    this.socket = null;
    this.closed = false;
    this.ready = false;
    this.connectionEpoch = null;
    this.connectPromise = null;
    this.heartbeatTimer = null;
  }

  async connect() {
    if (this.ready && this.socket) return this;
    if (this.connectPromise) return this.connectPromise;
    this.closed = false;
    this.connectPromise = new Promise((resolve, reject) => {
      let settled = false;
      let target;
      try {
        target = new URL(this.url);
        if (this.token !== null) target.searchParams.set('token', this.token);
      } catch (error) { reject(error); return; }
      let socket;
      try { socket = new this.WebSocketImpl(target); }
      catch (error) { reject(error); return; }
      this.socket = socket;
      const finishError = (error) => {
        if (settled) return;
        settled = true;
        this.connectPromise = null;
        reject(asConnectorError(error, 'connector_connect_failed'));
      };
      socket.onopen = () => {
        try {
          this.#send({ type: 'hello', protocol_version: PROTOCOL_VERSION, device_id: this.deviceId,
            workspace_id: this.workspaceId, ...(this.token !== null ? { token: this.token } : {}), capabilities: this.capabilities });
        } catch (error) { finishError(error); }
      };
      socket.onmessage = (event) => {
        let message;
        try { message = typeof event.data === 'string' ? JSON.parse(event.data) : JSON.parse(String(event.data)); }
        catch (error) { finishError(protocolError('connector_json_invalid', 'Connector response was not valid JSON')); return; }
        if (message?.type === 'hello_ack') {
          if (message.protocol_version !== PROTOCOL_VERSION || message.workspace_id !== this.workspaceId) {
            finishError(protocolError('connector_protocol_version', 'Connector hello acknowledgement was invalid'));
            return;
          }
          this.connectionEpoch = message.connection_epoch ?? null;
          this.ready = true;
          if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
          const heartbeatMs = Number.isInteger(message.heartbeat_ms) ? message.heartbeat_ms : 0;
          if (heartbeatMs > 0) {
            this.heartbeatTimer = setInterval(() => {
              try { this.#send({ type: 'heartbeat', at: new Date().toISOString() }); } catch { /* reconnect path handles close */ }
            }, heartbeatMs);
          }
          if (!settled) { settled = true; this.connectPromise = null; resolve(this); }
          return;
        }
        if (message?.type === 'heartbeat_ack') return;
        if (message?.type === 'command' && typeof message.id === 'string') {
          try { this.#send({ type: 'ack', id: message.id }); } catch { /* socket closed */ }
          // Start from a resolved promise so a synchronous command handler
          // throw is converted into the same structured response as an async
          // rejection. A closed socket may race the response; that is a
          // normal reconnect path and must not become an unhandled rejection.
          Promise.resolve().then(() => this.commandHandler?.(message.command, { id: message.id }))
            .then((result) => {
              try { this.#send({ type: 'response', id: message.id, ok: true, result }); } catch { /* socket closed */ }
            })
            .catch((error) => {
              try {
                this.#send({ type: 'response', id: message.id, ok: false,
                  error: { code: error?.code ?? 'connector_command_failed', message: error?.message ?? String(error), details: error?.details ?? {} } });
              } catch { /* socket closed */ }
            });
        }
      };
      socket.onerror = (event) => finishError(event instanceof Error ? event : new Error('WebSocket transport error'));
      socket.onclose = () => {
        const wasReady = this.ready;
        this.ready = false;
        this.socket = null;
        if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
        this.connectPromise = null;
        if (!settled) finishError(new Error('WebSocket closed before Connector hello acknowledgement'));
        if (wasReady && this.reconnect && !this.closed) {
          setTimeout(() => { void this.connect().catch(() => {}); }, this.reconnectDelayMs);
        }
      };
    });
    return this.connectPromise;
  }

  #send(value) {
    if (!this.socket || this.socket.readyState !== 1) throw new ConnectorWebSocketError('connector_disconnected', 'WebSocket is not open');
    const encoded = JSON.stringify(value);
    if (Buffer.byteLength(encoded, 'utf8') > DEFAULT_MAX_MESSAGE_BYTES) throw new ConnectorWebSocketError('connector_message_too_large', 'Connector message exceeds the configured limit');
    this.socket.send(encoded);
  }

  close() {
    this.closed = true;
    this.ready = false;
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState < 2) socket.close(1000, 'Connector stopping');
  }
}

export { PROTOCOL_VERSION };
