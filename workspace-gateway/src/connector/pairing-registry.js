import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

const SCHEMA_VERSION = 1;
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RECORDS = 4096;
const MAX_LABEL_LENGTH = 256;

function pairingError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function boundedId(value, field) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 128 || !/^[A-Za-z0-9._:-]+$/u.test(value)) {
    throw pairingError('connector_pairing_input_invalid', `${field} is invalid`, { field });
  }
  return value.trim();
}

function normalizeFingerprint(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 256 || !/^[a-f0-9:]+$/iu.test(value)) {
    throw pairingError('connector_pairing_input_invalid', 'certificate fingerprint is invalid');
  }
  return value.replaceAll(':', '').toLowerCase();
}

function clone(value) {
  return structuredClone(value);
}

function nowDate(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('clock must return a valid Date');
  return date;
}

function tokenHash(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function tokenMatches(expected, actual) {
  if (typeof expected !== 'string' || typeof actual !== 'string') return false;
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(actual, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function recordView(record, { token = undefined } = {}) {
  const value = {
    pairing_id: record.pairing_id,
    device_id: record.device_id,
    workspace_id: record.workspace_id,
    label: record.label,
    state: record.state,
    created_at: record.created_at,
    updated_at: record.updated_at,
    expires_at: record.expires_at,
    last_seen_at: record.last_seen_at ?? null,
    certificate_fingerprint: record.certificate_fingerprint ?? null,
    ...(record.revoked_at ? { revoked_at: record.revoked_at } : {}),
    ...(record.revoke_reason ? { revoke_reason: record.revoke_reason } : {}),
  };
  if (token !== undefined) value.token = token;
  return value;
}

/**
 * Persistent Connector device pairing registry.
 *
 * Pairing tokens are returned only from `pair()` and are stored as SHA-256
 * digests. The registry can be used directly by a deployment or passed to
 * ConnectorWebSocketHub, which validates the device/workspace/token tuple at
 * hello time. Revocation and rotation are durable when filePath is set.
 */
export class ConnectorPairingRegistry {
  constructor({ filePath = null, clock = () => new Date(), defaultTtlMs = DEFAULT_TTL_MS, maxRecords = MAX_RECORDS } = {}) {
    if (filePath !== null && (typeof filePath !== 'string' || !isAbsolute(filePath))) throw new TypeError('filePath must be an absolute path or null');
    if (!Number.isSafeInteger(defaultTtlMs) || defaultTtlMs < 1) throw new TypeError('defaultTtlMs is invalid');
    if (!Number.isSafeInteger(maxRecords) || maxRecords < 1 || maxRecords > MAX_RECORDS) throw new TypeError('maxRecords is invalid');
    this.filePath = filePath === null ? null : resolve(filePath);
    this.clock = clock;
    this.defaultTtlMs = defaultTtlMs;
    this.maxRecords = maxRecords;
    this.records = new Map();
    this.loaded = false;
    this.loading = null;
    this.writeChain = Promise.resolve();
  }

  async ready() {
    if (this.loaded) return this;
    if (!this.loading) this.loading = this.#load();
    await this.loading;
    return this;
  }

  async #load() {
    if (!this.filePath) {
      this.loaded = true;
      this.loading = null;
      return;
    }
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8'));
      if (!parsed || parsed.schema_version !== SCHEMA_VERSION || !Array.isArray(parsed.records)) {
        throw pairingError('connector_pairing_registry_corrupt', 'Connector pairing registry schema is invalid');
      }
      for (const record of parsed.records) {
        if (!record || typeof record.pairing_id !== 'string' || typeof record.token_sha256 !== 'string'
          || typeof record.device_id !== 'string' || typeof record.workspace_id !== 'string') continue;
        if (!['active', 'revoked', 'expired'].includes(record.state)) continue;
        this.records.set(record.pairing_id, {
          pairing_id: record.pairing_id,
          token_sha256: record.token_sha256,
          device_id: record.device_id,
          workspace_id: record.workspace_id,
          label: typeof record.label === 'string' ? record.label : '',
          state: record.state,
          created_at: record.created_at,
          updated_at: record.updated_at ?? record.created_at,
          expires_at: record.expires_at,
          last_seen_at: record.last_seen_at ?? null,
          certificate_fingerprint: record.certificate_fingerprint ?? null,
          ...(record.revoked_at ? { revoked_at: record.revoked_at } : {}),
          ...(record.revoke_reason ? { revoke_reason: record.revoke_reason } : {}),
        });
      }
      this.#expire();
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    } finally {
      this.loaded = true;
      this.loading = null;
    }
  }

  async pair({ deviceId, workspaceId, label = '', expiresAt = null, certificateFingerprint = null, ttlMs = this.defaultTtlMs } = {}) {
    await this.ready();
    const device = boundedId(deviceId, 'device_id');
    const workspace = boundedId(workspaceId, 'workspace_id');
    if (typeof label !== 'string' || label.length > MAX_LABEL_LENGTH) throw pairingError('connector_pairing_input_invalid', 'label is invalid');
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 1) throw pairingError('connector_pairing_input_invalid', 'ttlMs is invalid');
    const now = nowDate(this.clock);
    const expiry = expiresAt === null || expiresAt === undefined
      ? new Date(now.getTime() + ttlMs)
      : new Date(expiresAt);
    if (!Number.isFinite(expiry.getTime()) || expiry <= now) throw pairingError('connector_pairing_input_invalid', 'expiresAt must be in the future');
    const token = randomBytes(32).toString('base64url');
    const pairingId = randomBytes(16).toString('hex');
    const record = {
      pairing_id: pairingId,
      token_sha256: tokenHash(token),
      device_id: device,
      workspace_id: workspace,
      label: label.trim(),
      state: 'active',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: expiry.toISOString(),
      last_seen_at: null,
      certificate_fingerprint: normalizeFingerprint(certificateFingerprint),
    };
    this.records.set(pairingId, record);
    this.#trim();
    await this.#flush();
    return recordView(record, { token });
  }

  async authorize({ deviceId, workspaceId, token, certificateFingerprint = null } = {}) {
    await this.ready();
    if (typeof deviceId !== 'string' || typeof workspaceId !== 'string' || typeof token !== 'string' || token.length < 16) return null;
    this.#expire();
    const presentedFingerprint = normalizeFingerprint(certificateFingerprint);
    const digest = tokenHash(token);
    const record = [...this.records.values()].find((item) => item.state === 'active'
      && item.device_id === deviceId && item.workspace_id === workspaceId
      && tokenMatches(item.token_sha256, digest)
      && (!item.certificate_fingerprint || item.certificate_fingerprint === presentedFingerprint));
    if (!record) return null;
    record.last_seen_at = nowDate(this.clock).toISOString();
    record.updated_at = record.last_seen_at;
    await this.#flush();
    return recordView(record);
  }

  async revoke({ pairingId = null, deviceId = null, workspaceId = null, reason = 'revoked by operator' } = {}) {
    await this.ready();
    const target = pairingId ? boundedId(pairingId, 'pairing_id') : null;
    const device = deviceId === null ? null : boundedId(deviceId, 'device_id');
    const workspace = workspaceId === null ? null : boundedId(workspaceId, 'workspace_id');
    const now = nowDate(this.clock).toISOString();
    let count = 0;
    for (const record of this.records.values()) {
      if (record.state !== 'active') continue;
      if (target && record.pairing_id !== target) continue;
      if (device && record.device_id !== device) continue;
      if (workspace && record.workspace_id !== workspace) continue;
      record.state = 'revoked';
      record.revoked_at = now;
      record.updated_at = now;
      record.revoke_reason = typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 512) : 'revoked by operator';
      count += 1;
    }
    if (count > 0) await this.#flush();
    return { revoked: count, pairing_id: target };
  }

  async rotate({ deviceId, workspaceId, label = '', certificateFingerprint = null, ttlMs = this.defaultTtlMs } = {}) {
    await this.revoke({ deviceId, workspaceId, reason: 'rotated by operator' });
    return this.pair({ deviceId, workspaceId, label, certificateFingerprint, ttlMs });
  }

  async list({ deviceId = null, workspaceId = null } = {}) {
    await this.ready();
    this.#expire();
    return [...this.records.values()]
      .filter((record) => !deviceId || record.device_id === deviceId)
      .filter((record) => !workspaceId || record.workspace_id === workspaceId)
      .map((record) => recordView(record));
  }

  snapshot() {
    return [...this.records.values()].map((record) => recordView(record));
  }

  #expire() {
    const now = nowDate(this.clock);
    let changed = false;
    for (const record of this.records.values()) {
      if (record.state === 'active' && Date.parse(record.expires_at) <= now.getTime()) {
        record.state = 'expired';
        record.updated_at = now.toISOString();
        changed = true;
      }
    }
    if (changed && this.filePath) void this.#flush().catch(() => {});
  }

  #trim() {
    while (this.records.size > this.maxRecords) {
      const removable = [...this.records.values()]
        .filter((record) => record.state !== 'active')
        .sort((left, right) => String(left.updated_at).localeCompare(String(right.updated_at)))[0];
      if (!removable) break;
      this.records.delete(removable.pairing_id);
    }
  }

  async #flush() {
    if (!this.filePath) return;
    this.writeChain = this.writeChain.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
      const serialized = `${JSON.stringify({ schema_version: SCHEMA_VERSION, records: [...this.records.values()] }, null, 2)}\n`;
      const temporary = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temporary, serialized, { encoding: 'utf8', mode: 0o600 });
      await chmod(temporary, 0o600).catch(() => {});
      await rename(temporary, this.filePath);
    });
    return this.writeChain;
  }
}
