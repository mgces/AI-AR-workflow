import { createServer } from 'node:http';
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { trustedClientAddress } from './client-address.js';
import { validateRunEvent, verifySignedRunEvent } from '../../../packages/contracts/src/run-event.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(HERE, '../../cloud-web');
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;
const MAX_BATCH_EVENTS = 500;
const ALLOWED_ARTIFACT_TYPES = new Set(['text/plain', 'application/json', 'application/pdf', 'image/png', 'image/jpeg']);
const ALLOWED_ARTIFACT_CLASSES = new Set(['public', 'internal']);
const ALLOWED_REVIEW_DECISIONS = new Set(['approved', 'rejected', 'returned']);
const SENSITIVE_EVENT_FIELDS = new Set([
  'content', 'prompt', 'raw_prompt', 'stdout', 'stderr', 'output', 'agent_output',
  'path', 'file_path', 'absolute_path', 'repo_root', 'workspace_root', 'source_root',
  'host', 'hostname', 'ssh_address', 'ssh_host', 'command', 'argv',
  'token', 'api_key', 'authorization', 'password', 'secret', 'credential', 'private_key', 'ssh_key',
]);

function cloudError(code, message, status = 400, details = {}) {
  return Object.assign(new Error(message), { code, status, details });
}

function hashSecret(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function send(res, status, value, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(typeof value === 'string' ? value : JSON.stringify(value));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw cloudError('body_too_large', 'request body exceeds the cloud API limit', 413);
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw cloudError('invalid_json', 'request body must be valid JSON'); }
}

async function readBinary(req, maximumBytes) {
  const declared = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw cloudError('artifact_too_large', 'artifact body exceeds the upload limit', 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maximumBytes) throw cloudError('artifact_too_large', 'artifact body exceeds the upload limit', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function loopbackAddress(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function isDevicePrincipal(principal, deviceId, { requireSigningKey = false } = {}) {
  return Boolean(principal && principal.device_id === deviceId
    && typeof principal.tenant_id === 'string' && principal.tenant_id.trim()
    && typeof principal.workspace_id === 'string' && principal.workspace_id.trim()
    && typeof principal.key_id === 'string' && principal.key_id.trim()
    && (!requireSigningKey || principal.public_key));
}

function rejectSensitiveEventFields(value, parent = 'payload') {
  if (Array.isArray(value)) {
    for (const item of value) rejectSensitiveEventFields(item, parent);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replaceAll('-', '_');
    if (SENSITIVE_EVENT_FIELDS.has(normalized)) {
      throw cloudError('event_payload_sensitive_field', 'event payload contains a field forbidden by the default cloud data policy', 400,
        { field: `${parent}.${key}` });
    }
    rejectSensitiveEventFields(child, `${parent}.${key}`);
  }
}

function loadIntentSigningKey(databasePath, configuredKey, configuredKeyPath) {
  if (configuredKey) return typeof configuredKey === 'string' ? createPrivateKey(configuredKey) : configuredKey;
  if (databasePath === ':memory:') return generateKeyPairSync('ed25519').privateKey;
  const keyPath = resolve(configuredKeyPath ?? `${databasePath}.intent-ed25519.pem`);
  mkdirSync(dirname(keyPath), { recursive: true });
  try { return createPrivateKey(readFileSync(keyPath, 'utf8')); } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const generated = generateKeyPairSync('ed25519').privateKey;
  const pem = generated.export({ type: 'pkcs8', format: 'pem' }).toString();
  try {
    writeFileSync(keyPath, pem, { flag: 'wx', mode: 0o600 });
    chmodSync(keyPath, 0o600);
    return generated;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    return createPrivateKey(readFileSync(keyPath, 'utf8'));
  }
}

class CloudEventStore {
  constructor(databasePath, { artifactRoot = resolve(dirname(databasePath), 'artifacts'), intentPrivateKey = null,
    intentKeyPath = null, intentKeyId = null } = {}) {
    if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
    this.artifactRoot = resolve(artifactRoot);
    mkdirSync(resolve(this.artifactRoot, 'objects'), { recursive: true });
    mkdirSync(resolve(this.artifactRoot, 'staging'), { recursive: true });
    this.intentPrivateKey = loadIntentSigningKey(databasePath, intentPrivateKey, intentKeyPath);
    this.intentPublicKey = createPublicKey(this.intentPrivateKey);
    const fingerprint = createHash('sha256').update(this.intentPublicKey.export({ type: 'spki', format: 'der' })).digest('hex').slice(0, 16);
    this.intentKeyId = intentKeyId ?? `cloud-${fingerprint}`;
    this.db = new DatabaseSync(databasePath);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS run_events (
        event_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        client_seq INTEGER NOT NULL,
        run_revision INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_hash TEXT NOT NULL,
        event_json TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        received_at TEXT NOT NULL,
        UNIQUE(tenant_id, device_id, client_seq)
      );
      CREATE INDEX IF NOT EXISTS idx_cloud_events_run ON run_events(tenant_id, run_id, client_seq);
      CREATE TABLE IF NOT EXISTS run_projection (
        tenant_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        workflow_id TEXT,
        status TEXT NOT NULL,
        current_phase TEXT,
        revision INTEGER NOT NULL,
        last_client_seq INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(tenant_id, device_id, run_id)
      );
      CREATE INDEX IF NOT EXISTS idx_cloud_runs_tenant_updated ON run_projection(tenant_id, updated_at DESC);
      CREATE TABLE IF NOT EXISTS pairing_sessions (
        session_id TEXT PRIMARY KEY,
        pairing_code_hash TEXT NOT NULL UNIQUE,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        owner_user_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        client_version TEXT NOT NULL,
        key_id TEXT NOT NULL,
        public_key_pem TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_seen_at TEXT,
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS artifact_manifests (
        artifact_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        name TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        content_type TEXT NOT NULL,
        classification TEXT NOT NULL,
        data_policy TEXT NOT NULL,
        status TEXT NOT NULL,
        object_key TEXT,
        created_at TEXT NOT NULL,
        uploaded_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_artifacts_run ON artifact_manifests(tenant_id, device_id, run_id, phase);
      CREATE TABLE IF NOT EXISTS artifact_uploads (
        upload_id TEXT PRIMARY KEY,
        artifact_id TEXT NOT NULL REFERENCES artifact_manifests(artifact_id),
        tenant_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_artifact_upload_token ON artifact_uploads(token_hash, status);
      CREATE TABLE IF NOT EXISTS review_bundles (
        bundle_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        run_revision INTEGER NOT NULL,
        bundle_digest TEXT NOT NULL,
        artifact_ids_json TEXT NOT NULL,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_review_bundles_pending ON review_bundles(tenant_id, state, created_at DESC);
      CREATE TABLE IF NOT EXISTS review_decisions (
        decision_id TEXT PRIMARY KEY,
        bundle_id TEXT NOT NULL UNIQUE REFERENCES review_bundles(bundle_id),
        tenant_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        run_revision INTEGER NOT NULL,
        bundle_digest TEXT NOT NULL,
        decision TEXT NOT NULL,
        note TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        nonce TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS device_intents (
        intent_id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL UNIQUE REFERENCES review_decisions(decision_id),
        tenant_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        intent_json TEXT NOT NULL,
        status TEXT NOT NULL,
        result_reason TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_device_intents_pending ON device_intents(tenant_id, device_id, status, created_at);
    `);
  }

  createPairingSession({ tenantId, userId, ttlMs = 5 * 60 * 1000 }) {
    const code = randomBytes(6).toString('hex').toUpperCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
    this.db.prepare(`INSERT INTO pairing_sessions(
      session_id, pairing_code_hash, tenant_id, user_id, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`).run(randomUUID(), hashSecret(code), tenantId, userId, expiresAt, now.toISOString());
    return { pairing_code: code, expires_at: expiresAt };
  }

  pairDevice({ pairingCode, deviceId, keyId, publicKeyPem, deviceName, clientVersion, workspaceId }) {
    if (typeof pairingCode !== 'string' || !/^[A-F0-9]{12}$/u.test(pairingCode)) {
      throw cloudError('pairing_code_invalid', 'pairing code is invalid or expired', 400);
    }
    for (const [field, value] of Object.entries({ deviceId, keyId, deviceName, clientVersion, workspaceId })) {
      if (typeof value !== 'string' || value.trim() === '' || value.length > 256 || /[\0\r\n]/u.test(value)) {
        throw cloudError('device_pairing_invalid', `${field} is invalid`, 400, { field });
      }
    }
    if (!/^[a-zA-Z0-9._-]{4,128}$/u.test(deviceId)) throw cloudError('device_pairing_invalid', 'deviceId has invalid characters', 400);
    if (typeof publicKeyPem !== 'string' || publicKeyPem.length > 4096) throw cloudError('device_public_key_invalid', 'public key is invalid', 400);
    let publicKey;
    try { publicKey = createPublicKey(publicKeyPem); } catch {
      throw cloudError('device_public_key_invalid', 'public key could not be parsed', 400);
    }
    if (publicKey.asymmetricKeyType !== 'ed25519') throw cloudError('device_public_key_invalid', 'device keys must be Ed25519', 400);

    const now = new Date().toISOString();
    const session = this.db.prepare(`SELECT session_id, tenant_id, user_id FROM pairing_sessions
      WHERE pairing_code_hash = ? AND used_at IS NULL AND expires_at > ?`).get(hashSecret(pairingCode), now);
    if (!session) throw cloudError('pairing_code_invalid', 'pairing code is invalid, expired, or already used', 400);
    const accessToken = randomBytes(32).toString('base64url');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare(`INSERT INTO devices(
        device_id, tenant_id, owner_user_id, workspace_id, device_name, client_version,
        key_id, public_key_pem, token_hash, created_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(deviceId, session.tenant_id, session.user_id, workspaceId, deviceName, clientVersion,
          keyId, publicKey.export({ type: 'spki', format: 'pem' }).toString(), hashSecret(accessToken), now, now);
      this.db.prepare('UPDATE pairing_sessions SET used_at = ? WHERE session_id = ?').run(now, session.session_id);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      if (String(error?.code ?? '').includes('SQLITE_CONSTRAINT')) {
        throw cloudError('device_already_registered', 'device id is already registered', 409);
      }
      throw error;
    }
    return {
      device_id: deviceId, tenant_id: session.tenant_id, workspace_id: workspaceId,
      key_id: keyId, access_token: accessToken, token_type: 'Bearer',
    };
  }

  authenticateDevice(authorization) {
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return null;
    const tokenHash = hashSecret(authorization.slice(7));
    const row = this.db.prepare(`SELECT device_id, tenant_id, workspace_id, key_id, public_key_pem
      FROM devices WHERE token_hash = ? AND revoked_at IS NULL`).get(tokenHash);
    if (!row) return null;
    this.db.prepare('UPDATE devices SET last_seen_at = ? WHERE device_id = ?').run(new Date().toISOString(), row.device_id);
    return {
      device_id: row.device_id, tenant_id: row.tenant_id, workspace_id: row.workspace_id,
      key_id: row.key_id, public_key: createPublicKey(row.public_key_pem),
    };
  }

  listDevices(tenantId, { userId, role, workspaceIds = [] } = {}) {
    const isAdmin = ['admin', 'tenant_admin'].includes(role);
    const scopes = Array.isArray(workspaceIds) ? workspaceIds.filter((item) => typeof item === 'string' && item.trim()) : [];
    let rows;
    if (isAdmin) {
      rows = this.db.prepare(`SELECT device_id, workspace_id, device_name, client_version, key_id,
        created_at, last_seen_at, revoked_at FROM devices WHERE tenant_id = ? ORDER BY created_at DESC`).all(tenantId);
    } else if (scopes.length) {
      rows = this.db.prepare(`SELECT device_id, workspace_id, device_name, client_version, key_id,
        created_at, last_seen_at, revoked_at FROM devices WHERE tenant_id = ?
        AND (owner_user_id = ? OR workspace_id IN (${scopes.map(() => '?').join(',')})) ORDER BY created_at DESC`)
        .all(tenantId, userId, ...scopes);
    } else {
      rows = this.db.prepare(`SELECT device_id, workspace_id, device_name, client_version, key_id,
        created_at, last_seen_at, revoked_at FROM devices WHERE tenant_id = ? AND owner_user_id = ?
        ORDER BY created_at DESC`).all(tenantId, userId);
    }
    return rows.map((row) => {
        const online = row.last_seen_at && Date.now() - Date.parse(row.last_seen_at) < 90_000;
        return { ...row, status: row.revoked_at ? 'revoked' : online ? 'online' : 'offline' };
      });
  }

  heartbeatDevice(deviceId, { clientVersion = null } = {}) {
    const version = typeof clientVersion === 'string' && clientVersion.trim() ? clientVersion.slice(0, 64) : null;
    const result = this.db.prepare(`UPDATE devices SET last_seen_at = ?,
      client_version = COALESCE(?, client_version) WHERE device_id = ? AND revoked_at IS NULL`)
      .run(new Date().toISOString(), version, deviceId);
    return Number(result.changes) === 1;
  }

  revokeDevice(tenantId, deviceId, { userId, role } = {}) {
    const isAdmin = ['admin', 'tenant_admin'].includes(role);
    const result = this.db.prepare(`UPDATE devices SET revoked_at = ?
      WHERE tenant_id = ? AND device_id = ? AND revoked_at IS NULL
      AND (owner_user_id = ? OR ? = 1)`).run(new Date().toISOString(), tenantId, deviceId, userId, Number(isAdmin));
    if (Number(result.changes) === 0) throw cloudError('device_not_found', 'active device was not found', 404);
    return { device_id: deviceId, revoked: true };
  }

  userCanAccess(tenantId, deviceId, workspaceId, user = {}) {
    const userId = user.userId ?? user.user_id;
    const role = user.role;
    const workspaceIds = user.workspaceIds ?? user.workspace_ids ?? [];
    if (['admin', 'tenant_admin'].includes(role)) return true;
    if (Array.isArray(workspaceIds) && workspaceIds.includes(workspaceId)) return true;
    return Boolean(this.db.prepare(`SELECT 1 FROM devices WHERE tenant_id = ? AND device_id = ? AND owner_user_id = ?`)
      .get(tenantId, deviceId, userId));
  }

  artifactRow(artifactId, tenantId) {
    return this.db.prepare(`SELECT * FROM artifact_manifests WHERE artifact_id = ? AND tenant_id = ?`)
      .get(artifactId, tenantId);
  }

  artifactView(row) {
    if (!row) return null;
    return {
      artifact_id: row.artifact_id, device_id: row.device_id, workspace_id: row.workspace_id,
      run_id: row.run_id, phase: row.phase, name: row.name, sha256: row.sha256,
      size_bytes: row.size_bytes, content_type: row.content_type, classification: row.classification,
      data_policy: row.data_policy, status: row.status, created_at: row.created_at,
      uploaded_at: row.uploaded_at,
    };
  }

  createArtifactManifest(principal, input) {
    const run = this.db.prepare(`SELECT run_id FROM run_projection
      WHERE tenant_id = ? AND device_id = ? AND workspace_id = ? AND run_id = ?`)
      .get(principal.tenant_id, principal.device_id, principal.workspace_id, input.run_id);
    if (!run) throw cloudError('run_not_found', 'run was not found for the authenticated device workspace', 404);
    if (input.data_policy !== 'review_bundle') {
      throw cloudError('artifact_data_policy_forbidden', 'only explicitly selected review_bundle content may be uploaded', 400);
    }
    if (!ALLOWED_ARTIFACT_TYPES.has(input.content_type)) throw cloudError('artifact_content_type_forbidden', 'artifact content type is not allowed', 400);
    if (!ALLOWED_ARTIFACT_CLASSES.has(input.classification)) throw cloudError('artifact_classification_forbidden', 'confidential and restricted artifacts cannot be uploaded', 400);
    if (!Number.isSafeInteger(input.size_bytes) || input.size_bytes < 1 || input.size_bytes > MAX_ARTIFACT_BYTES) {
      throw cloudError('artifact_size_invalid', `size_bytes must be between 1 and ${MAX_ARTIFACT_BYTES}`, 400);
    }
    if (typeof input.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(input.sha256)) throw cloudError('artifact_digest_invalid', 'sha256 must be a lowercase SHA-256 digest', 400);
    if (typeof input.phase !== 'string' || !/^P[0-8]$/u.test(input.phase)) throw cloudError('artifact_phase_invalid', 'phase must be P0 through P8', 400);
    if (typeof input.name !== 'string' || input.name.trim() === '' || input.name.length > 160
        || /[\\/\0\r\n]/u.test(input.name) || input.name === '.' || input.name === '..') {
      throw cloudError('artifact_name_invalid', 'name must be a display name without paths or control characters', 400);
    }
    const artifactId = randomUUID();
    const createdAt = new Date().toISOString();
    this.db.prepare(`INSERT INTO artifact_manifests(
      artifact_id, tenant_id, device_id, workspace_id, run_id, phase, name, sha256, size_bytes,
      content_type, classification, data_policy, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_upload', ?)`)
      .run(artifactId, principal.tenant_id, principal.device_id, principal.workspace_id,
        input.run_id, input.phase, input.name, input.sha256, input.size_bytes, input.content_type,
        input.classification, input.data_policy, createdAt);
    return this.artifactView(this.artifactRow(artifactId, principal.tenant_id));
  }

  createArtifactUpload(principal, artifactId) {
    const artifact = this.db.prepare(`SELECT * FROM artifact_manifests WHERE artifact_id = ?
      AND tenant_id = ? AND device_id = ? AND workspace_id = ?`).get(
      artifactId, principal.tenant_id, principal.device_id, principal.workspace_id);
    if (!artifact) throw cloudError('artifact_not_found', 'artifact was not found', 404);
    if (artifact.status !== 'awaiting_upload') throw cloudError('artifact_upload_unavailable', 'artifact is already uploaded or no longer accepts uploads', 409);
    const uploadId = randomUUID();
    const uploadToken = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    this.db.prepare(`INSERT INTO artifact_uploads(
      upload_id, artifact_id, tenant_id, device_id, workspace_id, token_hash, expires_at, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'issued', ?)`)
      .run(uploadId, artifactId, principal.tenant_id, principal.device_id, principal.workspace_id,
        hashSecret(uploadToken), expiresAt, now.toISOString());
    return { upload_id: uploadId, upload_token: uploadToken, expires_at: expiresAt, method: 'PUT', max_bytes: MAX_ARTIFACT_BYTES };
  }

  validateArtifactUpload(uploadId, uploadToken, expectedArtifactId) {
    const upload = this.db.prepare(`SELECT u.artifact_id, u.expires_at, u.status, a.status AS artifact_status
      FROM artifact_uploads u JOIN artifact_manifests a ON a.artifact_id = u.artifact_id
      WHERE u.upload_id = ? AND u.token_hash = ?`).get(uploadId, hashSecret(uploadToken));
    return Boolean(upload && upload.artifact_id === expectedArtifactId && upload.status === 'issued'
      && Date.parse(upload.expires_at) > Date.now() && upload.artifact_status === 'awaiting_upload');
  }

  async storeArtifactUpload(uploadId, uploadToken, bytes, expectedArtifactId) {
    const upload = this.db.prepare(`SELECT u.*, a.sha256, a.size_bytes, a.status AS artifact_status
      FROM artifact_uploads u JOIN artifact_manifests a ON a.artifact_id = u.artifact_id
      WHERE u.upload_id = ? AND u.token_hash = ?`).get(uploadId, hashSecret(uploadToken));
    if (!upload || upload.artifact_id !== expectedArtifactId || upload.status !== 'issued' || Date.parse(upload.expires_at) <= Date.now()
        || upload.artifact_status !== 'awaiting_upload') {
      throw cloudError('artifact_upload_token_invalid', 'upload token is invalid, expired, or already used', 401);
    }
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== upload.size_bytes || digest !== upload.sha256) {
      this.db.prepare(`UPDATE artifact_uploads SET status = 'integrity_failed' WHERE upload_id = ? AND status = 'issued'`).run(uploadId);
      throw cloudError('artifact_integrity_mismatch', 'uploaded content does not match its declared length and digest', 400);
    }
    const objectKey = randomUUID();
    const stagingPath = resolve(this.artifactRoot, 'staging', `${randomUUID()}.part`);
    const objectPath = resolve(this.artifactRoot, 'objects', objectKey);
    try {
      await writeFile(stagingPath, bytes, { flag: 'wx', mode: 0o600 });
      await rename(stagingPath, objectPath);
      const now = new Date().toISOString();
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const updated = this.db.prepare(`UPDATE artifact_uploads SET status = 'completed'
          WHERE upload_id = ? AND status = 'issued' AND expires_at > ?`).run(uploadId, now);
        if (Number(updated.changes) !== 1) throw cloudError('artifact_upload_token_invalid', 'upload token was concurrently consumed or expired', 409);
        const saved = this.db.prepare(`UPDATE artifact_manifests SET status = 'available', object_key = ?, uploaded_at = ?
          WHERE artifact_id = ? AND status = 'awaiting_upload'`).run(objectKey, now, upload.artifact_id);
        if (Number(saved.changes) !== 1) throw cloudError('artifact_upload_unavailable', 'artifact no longer accepts this upload', 409);
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
      return this.artifactView(this.artifactRow(upload.artifact_id, upload.tenant_id));
    } catch (error) {
      await unlink(stagingPath).catch(() => {});
      await unlink(objectPath).catch(() => {});
      throw error;
    }
  }

  getArtifactForUser(artifactId, user) {
    const row = this.artifactRow(artifactId, user.tenant_id);
    return row && this.userCanAccess(user.tenant_id, row.device_id, row.workspace_id, user) ? row : null;
  }

  async readArtifactContent(row) {
    if (!row || row.status !== 'available' || !row.object_key || !/^[0-9a-f-]{36}$/u.test(row.object_key)) return null;
    const path = resolve(this.artifactRoot, 'objects', row.object_key);
    try { return await readFile(path); } catch { return null; }
  }

  createReviewBundle(principal, { runId, phase, runRevision, artifactIds }) {
    if (!Array.isArray(artifactIds) || artifactIds.length < 1 || artifactIds.length > 100
        || artifactIds.some((item) => typeof item !== 'string') || new Set(artifactIds).size !== artifactIds.length) {
      throw cloudError('review_bundle_artifacts_invalid', 'artifact_ids must contain 1 to 100 unique artifact ids', 400);
    }
    if (typeof phase !== 'string' || !/^P[0-8]$/u.test(phase)
        || !Number.isSafeInteger(runRevision) || runRevision < 1) {
      throw cloudError('review_bundle_invalid', 'phase and run_revision are invalid', 400);
    }
    const run = this.db.prepare(`SELECT revision FROM run_projection
      WHERE tenant_id = ? AND device_id = ? AND workspace_id = ? AND run_id = ?`)
      .get(principal.tenant_id, principal.device_id, principal.workspace_id, runId);
    if (!run) throw cloudError('run_not_found', 'run was not found for the authenticated device workspace', 404);
    if (run.revision !== runRevision) throw cloudError('review_bundle_stale', 'review bundle revision must match the current run revision', 409,
      { current_revision: run.revision });
    const artifacts = artifactIds.map((artifactId) => this.db.prepare(`SELECT artifact_id, sha256 FROM artifact_manifests
      WHERE artifact_id = ? AND tenant_id = ? AND device_id = ? AND workspace_id = ? AND run_id = ?
        AND phase = ? AND status = 'available'`).get(artifactId, principal.tenant_id, principal.device_id,
      principal.workspace_id, runId, phase));
    if (artifacts.some((item) => !item)) throw cloudError('review_bundle_artifact_unavailable', 'all review artifacts must be uploaded and belong to this run, phase, workspace, and device', 400);
    const artifactRefs = artifacts.map((item) => `artifact:sha256:${item.sha256}`).sort();
    const digestPayload = { run_id: runId, phase, run_revision: runRevision, artifact_refs: artifactRefs };
    const bundleDigest = createHash('sha256').update(canonicalJson(digestPayload)).digest('hex');
    const bundleId = randomUUID();
    const createdAt = new Date().toISOString();
    this.db.prepare(`INSERT INTO review_bundles(
      bundle_id, tenant_id, device_id, workspace_id, run_id, phase, run_revision,
      bundle_digest, artifact_ids_json, state, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`)
      .run(bundleId, principal.tenant_id, principal.device_id, principal.workspace_id, runId,
        phase, runRevision, bundleDigest, JSON.stringify(artifactIds), createdAt);
    return { bundle_id: bundleId, run_id: runId, phase, run_revision: runRevision,
      bundle_digest: bundleDigest, artifact_ids: artifactIds, state: 'pending', created_at: createdAt };
  }

  reviewBundleView(row) {
    const ids = JSON.parse(row.artifact_ids_json);
    const artifacts = ids.map((id) => this.db.prepare(`SELECT * FROM artifact_manifests WHERE artifact_id = ?`).get(id))
      .filter(Boolean).map((artifact) => this.artifactView(artifact));
    return {
      bundle_id: row.bundle_id, device_id: row.device_id, workspace_id: row.workspace_id,
      run_id: row.run_id, phase: row.phase, run_revision: row.run_revision,
      bundle_digest: row.bundle_digest, state: row.state, created_at: row.created_at, artifacts,
    };
  }

  pendingReviews(user) {
    return this.db.prepare(`SELECT * FROM review_bundles WHERE tenant_id = ? AND state = 'pending'
      ORDER BY created_at DESC LIMIT 500`).all(user.tenant_id)
      .filter((row) => this.userCanAccess(user.tenant_id, row.device_id, row.workspace_id, user))
      .map((row) => this.reviewBundleView(row));
  }

  reviewBundleForUser(bundleId, user) {
    const row = this.db.prepare(`SELECT * FROM review_bundles WHERE tenant_id = ? AND bundle_id = ?`)
      .get(user.tenant_id, bundleId);
    return row && this.userCanAccess(user.tenant_id, row.device_id, row.workspace_id, user)
      ? { row, view: this.reviewBundleView(row) } : null;
  }

  createReviewDecision(bundleId, user, decision, note = '') {
    const bundle = this.db.prepare(`SELECT * FROM review_bundles WHERE tenant_id = ? AND bundle_id = ?`)
      .get(user.tenant_id, bundleId);
    if (!bundle || !this.userCanAccess(user.tenant_id, bundle.device_id, bundle.workspace_id, user)) {
      throw cloudError('review_bundle_not_found', 'review bundle was not found', 404);
    }
    if (bundle.state !== 'pending') throw cloudError('review_already_decided', 'review bundle already has a decision', 409);
    const currentRun = this.db.prepare(`SELECT revision FROM run_projection WHERE tenant_id = ? AND device_id = ? AND run_id = ?`)
      .get(user.tenant_id, bundle.device_id, bundle.run_id);
    if (!currentRun || currentRun.revision !== bundle.run_revision) {
      throw cloudError('review_bundle_stale', 'run evidence changed after this review bundle was sealed', 409,
        { current_revision: currentRun?.revision ?? null, bundle_revision: bundle.run_revision });
    }
    if (!ALLOWED_REVIEW_DECISIONS.has(decision)) throw cloudError('review_decision_invalid', 'decision must be approved, rejected, or returned', 400);
    if (typeof note !== 'string' || note.length > 4000 || /\0/u.test(note)) throw cloudError('review_note_invalid', 'review note must be at most 4000 characters', 400);
    const createdAt = new Date().toISOString();
    const decisionId = randomUUID();
    const intentId = randomUUID();
    const nonce = randomBytes(24).toString('base64url');
    const intent = {
      intent_id: intentId, type: 'review.decision.available', device_id: bundle.device_id,
      bundle_id: bundle.bundle_id, run_id: bundle.run_id, phase: bundle.phase,
      run_revision: bundle.run_revision, bundle_digest: bundle.bundle_digest,
      decision, note, actor_id: user.user_id, nonce, created_at: createdAt, key_id: this.intentKeyId,
    };
    const signature = sign(null, Buffer.from(createHash('sha256').update(canonicalJson(intent)).digest()), this.intentPrivateKey).toString('base64url');
    const signedIntent = { ...intent, signature };
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db.prepare(`UPDATE review_bundles SET state = ? WHERE bundle_id = ? AND state = 'pending'`)
        .run(decision, bundleId);
      if (Number(result.changes) !== 1) throw cloudError('review_already_decided', 'review bundle already has a decision', 409);
      this.db.prepare(`INSERT INTO review_decisions(
        decision_id, bundle_id, tenant_id, device_id, workspace_id, run_id, phase, run_revision,
        bundle_digest, decision, note, actor_id, nonce, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(decisionId, bundleId, user.tenant_id, bundle.device_id, bundle.workspace_id, bundle.run_id,
          bundle.phase, bundle.run_revision, bundle.bundle_digest, decision, note, user.user_id, nonce, createdAt);
      this.db.prepare(`INSERT INTO device_intents(
        intent_id, decision_id, tenant_id, device_id, workspace_id, intent_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`)
        .run(intentId, decisionId, user.tenant_id, bundle.device_id, bundle.workspace_id,
          JSON.stringify(signedIntent), createdAt);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return {
      decision_id: decisionId, bundle_id: bundle.bundle_id, run_id: bundle.run_id,
      phase: bundle.phase, run_revision: bundle.run_revision, bundle_digest: bundle.bundle_digest,
      decision, actor_id: user.user_id, nonce, created_at: createdAt, intent_id: intentId,
    };
  }

  pendingIntents(tenantId, deviceId) {
    return this.db.prepare(`SELECT intent_json FROM device_intents
      WHERE tenant_id = ? AND device_id = ? AND status = 'pending' ORDER BY created_at LIMIT 500`)
      .all(tenantId, deviceId).map((row) => JSON.parse(row.intent_json));
  }

  resolveIntent(tenantId, deviceId, intentId, status, reasonCode = null) {
    if (!['applied', 'stale', 'rejected'].includes(status)) throw cloudError('intent_result_invalid', 'intent status must be applied, stale, or rejected', 400);
    if (reasonCode !== null && (typeof reasonCode !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/u.test(reasonCode))) {
      throw cloudError('intent_result_invalid', 'reason_code must be a stable identifier', 400);
    }
    const select = this.db.prepare(`SELECT status, result_reason, resolved_at FROM device_intents
      WHERE tenant_id = ? AND device_id = ? AND intent_id = ?`);
    const update = this.db.prepare(`UPDATE device_intents SET status = ?, result_reason = ?, resolved_at = ?
      WHERE tenant_id = ? AND device_id = ? AND intent_id = ? AND status = 'pending'`);
    const existing = select.get(tenantId, deviceId, intentId);
    if (!existing) throw cloudError('intent_not_found', 'pending intent was not found', 404);
    if (existing.status !== 'pending') {
      if (existing.status === status && existing.result_reason === reasonCode) {
        return { intent_id: intentId, status: existing.status,
          reason_code: existing.result_reason, resolved_at: existing.resolved_at };
      }
      throw cloudError('intent_result_conflict', 'intent was already resolved with a different result', 409);
    }
    const now = new Date().toISOString();
    const result = update.run(status, reasonCode, now, tenantId, deviceId, intentId);
    if (Number(result.changes) === 1) {
      return { intent_id: intentId, status, reason_code: reasonCode, resolved_at: now };
    }
    const raced = select.get(tenantId, deviceId, intentId);
    if (raced?.status === status && raced.result_reason === reasonCode) {
      return { intent_id: intentId, status: raced.status,
        reason_code: raced.result_reason, resolved_at: raced.resolved_at };
    }
    throw cloudError('intent_result_conflict', 'intent was already resolved with a different result', 409);
  }

  signingsPublicKey() {
    return { key_id: this.intentKeyId, algorithm: 'ed25519', public_key: this.intentPublicKey.export({ type: 'spki', format: 'pem' }).toString() };
  }

  acceptBatch(events) {
    const accepted = [];
    const duplicates = [];
    let acceptedThrough = 0;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const getEvent = this.db.prepare('SELECT event_hash, device_id FROM run_events WHERE event_id = ?');
      const getAtSeq = this.db.prepare(`SELECT event_id, event_hash FROM run_events
        WHERE tenant_id = ? AND device_id = ? AND client_seq = ?`);
      const getCursor = this.db.prepare(`SELECT COALESCE(MAX(client_seq), 0) AS seq FROM run_events
        WHERE tenant_id = ? AND device_id = ?`);
      const insertEvent = this.db.prepare(`INSERT INTO run_events(
        event_id, tenant_id, device_id, workspace_id, run_id, client_seq, run_revision,
        event_type, event_hash, event_json, occurred_at, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const getProjection = this.db.prepare(`SELECT revision FROM run_projection
        WHERE tenant_id = ? AND device_id = ? AND run_id = ?`);
      const upsertProjection = this.db.prepare(`INSERT INTO run_projection(
        tenant_id, device_id, workspace_id, run_id, workflow_id, status, current_phase,
        revision, last_client_seq, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, device_id, run_id) DO UPDATE SET
        workspace_id = excluded.workspace_id,
        workflow_id = COALESCE(excluded.workflow_id, run_projection.workflow_id),
        status = excluded.status,
        current_phase = COALESCE(excluded.current_phase, run_projection.current_phase),
        revision = excluded.revision,
        last_client_seq = excluded.last_client_seq,
        updated_at = excluded.updated_at
      WHERE excluded.revision >= run_projection.revision`);

      for (const event of events) {
        const old = getEvent.get(event.event_id);
        if (old) {
          if (old.event_hash !== event.event_hash || old.device_id !== event.device_id) {
            throw cloudError('event_replay_conflict', 'event_id was already used for different content', 409,
              { event_id: event.event_id });
          }
          duplicates.push(event.event_id);
          acceptedThrough = Math.max(acceptedThrough, event.client_seq);
          continue;
        }
        const atSeq = getAtSeq.get(event.tenant_id, event.device_id, event.client_seq);
        if (atSeq) {
          if (atSeq.event_id !== event.event_id || atSeq.event_hash !== event.event_hash) {
            throw cloudError('event_sequence_conflict', 'client sequence was already used for different content', 409,
              { expected_next_client_seq: Number(getCursor.get(event.tenant_id, event.device_id).seq) + 1 });
          }
          duplicates.push(event.event_id);
          acceptedThrough = Math.max(acceptedThrough, event.client_seq);
          continue;
        }
        const expected = Number(getCursor.get(event.tenant_id, event.device_id).seq) + 1;
        if (event.client_seq !== expected) {
          throw cloudError('event_sequence_gap', 'event batch must continue the device sequence without gaps', 409,
            { expected_next_client_seq: expected, received_client_seq: event.client_seq });
        }
        const now = new Date().toISOString();
        insertEvent.run(event.event_id, event.tenant_id, event.device_id, event.workspace_id,
          event.run_id, event.client_seq, event.run_revision, event.type, event.event_hash,
          JSON.stringify(event), event.occurred_at, now);
        if (event.run_id !== '__connector_telemetry__') {
          const previous = getProjection.get(event.tenant_id, event.device_id, event.run_id);
          const projected = projectEvent(event);
          upsertProjection.run(event.tenant_id, event.device_id, event.workspace_id, event.run_id,
            projected.workflowId, projected.status, projected.phase, event.run_revision,
            event.client_seq, now, now);
          if (previous && event.run_revision < previous.revision) {
            throw cloudError('run_revision_stale', 'run revision cannot move backwards', 409,
              { current_revision: previous.revision, received_revision: event.run_revision });
          }
        }
        accepted.push(event.event_id);
        acceptedThrough = Math.max(acceptedThrough, event.client_seq);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return { accepted, duplicates, acceptedThrough };
  }

  cursor(tenantId, deviceId) {
    const row = this.db.prepare(`SELECT COALESCE(MAX(client_seq), 0) AS seq FROM run_events
      WHERE tenant_id = ? AND device_id = ?`).get(tenantId, deviceId);
    return Number(row.seq);
  }

  listProbes(tenantId, { limit = 100, userId, role, workspaceIds = [] } = {}) {
    const bounded = Math.max(1, Math.min(500, Number.isInteger(limit) ? limit : 100));
    const isAdmin = ['admin', 'tenant_admin'].includes(role);
    const scopes = Array.isArray(workspaceIds) ? workspaceIds.filter((item) => typeof item === 'string' && item.trim()) : [];
    let rows = [];
    if (isAdmin) {
      rows = this.db.prepare(`SELECT event_json FROM run_events WHERE tenant_id = ? AND run_id = '__connector_telemetry__'
        AND event_type IN ('environment.probed', 'device.probed') ORDER BY occurred_at DESC, client_seq DESC LIMIT ?`)
        .all(tenantId, bounded);
    } else if (userId) {
      const workspaceClause = scopes.length ? ` OR workspace_id IN (${scopes.map(() => '?').join(',')})` : '';
      rows = this.db.prepare(`SELECT e.event_json FROM run_events e WHERE e.tenant_id = ?
        AND e.run_id = '__connector_telemetry__' AND e.event_type IN ('environment.probed', 'device.probed')
        AND (e.device_id IN (SELECT device_id FROM devices WHERE tenant_id = ? AND owner_user_id = ?)${workspaceClause})
        ORDER BY e.occurred_at DESC, e.client_seq DESC LIMIT ?`)
        .all(tenantId, tenantId, userId, ...scopes, bounded);
    }
    return rows.map((row) => {
      const event = JSON.parse(row.event_json);
      return { event_id: event.event_id, device_id: event.device_id, workspace_id: event.workspace_id,
        type: event.type, occurred_at: event.occurred_at, payload: event.payload };
    });
  }

  listRuns(tenantId, { limit = 100, cursor = null, userId, role, workspaceIds = [] } = {}) {
    const bounded = Math.max(1, Math.min(500, Number.isInteger(limit) ? limit : 100));
    const isAdmin = ['admin', 'tenant_admin'].includes(role);
    const scopes = Array.isArray(workspaceIds) ? workspaceIds.filter((item) => typeof item === 'string' && item.trim()) : [];
    let rows;
    if (isAdmin) {
      rows = this.db.prepare(`SELECT run_id, device_id, workspace_id, workflow_id, status,
        current_phase, revision, last_client_seq, created_at, updated_at
        FROM run_projection WHERE tenant_id = ? AND (? IS NULL OR updated_at < ?)
        ORDER BY updated_at DESC, run_id LIMIT ?`).all(tenantId, cursor, cursor, bounded);
    } else if (userId) {
      const workspaceClause = scopes.length ? ` OR workspace_id IN (${scopes.map(() => '?').join(',')})` : '';
      rows = this.db.prepare(`SELECT run_id, device_id, workspace_id, workflow_id, status,
        current_phase, revision, last_client_seq, created_at, updated_at
        FROM run_projection WHERE tenant_id = ? AND (? IS NULL OR updated_at < ?)
          AND (device_id IN (SELECT device_id FROM devices WHERE tenant_id = ? AND owner_user_id = ?)${workspaceClause})
        ORDER BY updated_at DESC, run_id LIMIT ?`)
        .all(tenantId, cursor, cursor, tenantId, userId, ...scopes, bounded);
    } else {
      rows = [];
    }
    return rows.map((row) => ({
      run_id: row.run_id, device_id: row.device_id, workspace_id: row.workspace_id,
      workflow_id: row.workflow_id, status: row.status, current_phase: row.current_phase,
      revision: row.revision, last_client_seq: row.last_client_seq,
      created_at: row.created_at, updated_at: row.updated_at,
      sync_state: 'synced',
    }));
  }

  runDetails(tenantId, runId, { deviceId = null, userId, role, workspaceIds = [] } = {}) {
    const isAdmin = ['admin', 'tenant_admin'].includes(role);
    const scopes = Array.isArray(workspaceIds) ? workspaceIds.filter((item) => typeof item === 'string' && item.trim()) : [];
    const rows = this.db.prepare(`SELECT run_id, device_id, workspace_id, workflow_id, status,
      current_phase, revision, last_client_seq, created_at, updated_at
      FROM run_projection WHERE tenant_id = ? AND run_id = ? AND (? IS NULL OR device_id = ?)
      ORDER BY updated_at DESC`).all(tenantId, runId, deviceId, deviceId);
    const run = rows.find((row) => isAdmin || scopes.includes(row.workspace_id)
      || this.db.prepare(`SELECT 1 FROM devices WHERE tenant_id = ? AND device_id = ? AND owner_user_id = ?`)
        .get(tenantId, row.device_id, userId));
    if (!run) return null;
    const events = this.db.prepare(`SELECT event_json FROM run_events
      WHERE tenant_id = ? AND device_id = ? AND run_id = ? ORDER BY client_seq`)
      .all(tenantId, run.device_id, run.run_id)
      .map((row) => JSON.parse(row.event_json))
      .map((event) => ({
        event_id: event.event_id,
        client_seq: event.client_seq,
        run_revision: event.run_revision,
        type: event.type,
        occurred_at: event.occurred_at,
        event_hash: event.event_hash,
        payload: event.payload,
      }));
    const observability = aggregateRunObservability(events, run.status);
    const artifacts = this.db.prepare(`SELECT * FROM artifact_manifests
      WHERE tenant_id = ? AND device_id = ? AND workspace_id = ? AND run_id = ? ORDER BY created_at`)
      .all(tenantId, run.device_id, run.workspace_id, run.run_id).map((row) => this.artifactView(row));
    const reviews = this.db.prepare(`SELECT b.bundle_id, b.phase, b.run_revision, b.bundle_digest, b.state,
      b.created_at, d.decision, d.note, d.actor_id, d.created_at AS decided_at
      FROM review_bundles b LEFT JOIN review_decisions d ON d.bundle_id = b.bundle_id
      WHERE b.tenant_id = ? AND b.device_id = ? AND b.workspace_id = ? AND b.run_id = ? ORDER BY b.created_at`)
      .all(tenantId, run.device_id, run.workspace_id, run.run_id);
    return { run, events, stages: observability.stages, observability, artifacts, reviews };
  }

  close() { this.db.close(); }
}

function projectEvent(event) {
  const workflowId = typeof event.payload.workflow_id === 'string' ? event.payload.workflow_id : null;
  const phase = typeof event.payload.phase === 'string' ? event.payload.phase : null;
  switch (event.type) {
    case 'run.created': return { workflowId, status: event.payload.status ?? 'created', phase };
    case 'run.completed': return { workflowId, status: 'completed', phase };
    case 'run.failed': return { workflowId, status: 'failed', phase };
    case 'run.cancelled': return { workflowId, status: 'cancelled', phase };
    case 'review.requested': return { workflowId, status: 'awaiting_review', phase };
    case 'review.applied': return { workflowId, status: 'running', phase };
    case 'human.wait_started': return { workflowId, status: 'awaiting_review', phase };
    case 'human.input_recorded': return { workflowId, status: 'running', phase };
    case 'human.wait_completed': return { workflowId, status: 'running', phase };
    case 'stage.blocked': return { workflowId, status: 'blocked', phase };
    case 'stage.gate_completed': return {
      workflowId,
      status: event.payload.status === 'failed' ? 'blocked'
        : event.payload.status === 'awaiting_review' ? 'awaiting_review' : 'running',
      phase,
    };
    case 'stage.started':
    case 'stage.resumed': return { workflowId, status: 'running', phase };
    default: return { workflowId, status: event.payload.run_status ?? 'running', phase };
  }
}

function aggregateRunObservability(events, runStatus) {
  const stageMap = new Map();
  const activeStageStarts = new Map();
  const openHumanWaits = new Map();
  let humanWaitCount = 0;
  let humanInterventionCount = 0;
  let humanInputCount = 0;
  let humanWaitDurationMs = 0;
  let tokenSamples = 0;
  let completeTokenSamples = 0;
  const tokens = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
  let failureClass = null;

  const stageFor = (phase) => {
    if (typeof phase !== 'string') return null;
    if (!stageMap.has(phase)) stageMap.set(phase, {
      phase, attempts: 0, status: 'not_started', duration_ms: 0,
      failure_class: null, started_at: null, completed_at: null,
    });
    return stageMap.get(phase);
  };
  for (const event of events) {
    const payload = event.payload ?? {};
    const at = Date.parse(event.occurred_at ?? '');
    if (event.type === 'stage.started') {
      const stage = stageFor(payload.phase);
      if (stage) {
        stage.attempts += 1;
        stage.status = 'running';
        stage.started_at ??= event.occurred_at;
        const starts = activeStageStarts.get(payload.phase) ?? [];
        starts.push(at);
        activeStageStarts.set(payload.phase, starts);
      }
    } else if (event.type === 'stage.gate_completed') {
      const stage = stageFor(payload.phase);
      if (stage) {
        stage.status = payload.status;
        stage.completed_at = event.occurred_at;
        const starts = activeStageStarts.get(payload.phase) ?? [];
        const startedAt = starts.pop();
        activeStageStarts.set(payload.phase, starts);
        const measured = Number.isSafeInteger(payload.duration_ms) ? payload.duration_ms
          : Number.isFinite(at) && Number.isFinite(startedAt) ? Math.max(0, at - startedAt) : null;
        if (measured !== null) stage.duration_ms += measured;
        if (payload.status === 'failed' && payload.failure_class) {
          stage.failure_class = payload.failure_class;
          failureClass = payload.failure_class;
        }
      }
    } else if (event.type === 'stage.blocked') {
      const stage = stageFor(payload.phase);
      if (stage) {
        stage.status = 'blocked';
        stage.failure_class = payload.failure_class ?? null;
      }
      failureClass = payload.failure_class ?? failureClass;
    } else if (event.type === 'human.wait_started') {
      humanWaitCount += 1;
      if (typeof payload.wait_id === 'string' && Number.isFinite(at)) openHumanWaits.set(payload.wait_id, at);
    } else if (event.type === 'human.wait_completed') {
      humanInterventionCount += 1;
      const startedAt = openHumanWaits.get(payload.wait_id);
      if (Number.isFinite(startedAt) && Number.isFinite(at)) {
        humanWaitDurationMs += Math.max(0, at - startedAt);
        openHumanWaits.delete(payload.wait_id);
      }
    } else if (event.type === 'human.input_recorded') {
      humanInputCount += 1;
    } else if (event.type === 'agent.execution_completed') {
      tokenSamples += 1;
      if (payload.usage_complete === true) completeTokenSamples += 1;
      for (const key of Object.keys(tokens)) {
        if (Number.isSafeInteger(payload[key]) && payload[key] >= 0) tokens[key] += payload[key];
      }
    }
  }

  const stages = [...stageMap.values()].sort((left, right) => Number(left.phase.slice(1)) - Number(right.phase.slice(1)));
  const hasTokenValue = (key) => events.some((event) => Number.isSafeInteger(event.payload?.[key]) && event.payload[key] >= 0);
  const firstTime = events.length ? Date.parse(events[0].occurred_at) : NaN;
  const lastTime = events.length ? Date.parse(events.at(-1).occurred_at) : NaN;
  return {
    event_count: events.length,
    stage_attempt_count: stages.reduce((sum, stage) => sum + stage.attempts, 0),
    stage_success_count: events.filter((event) => event.type === 'stage.gate_completed' && event.payload?.status === 'passed').length,
    stage_failure_count: events.filter((event) => event.type === 'stage.gate_completed' && event.payload?.status === 'failed').length,
    human_wait_count: humanWaitCount,
    human_intervention_count: humanInterventionCount,
    human_input_count: humanInputCount,
    human_wait_duration_ms: humanWaitDurationMs,
    human_wait_open_count: openHumanWaits.size,
    token_usage: {
      input_tokens: hasTokenValue('input_tokens') ? tokens.input_tokens : null,
      output_tokens: hasTokenValue('output_tokens') ? tokens.output_tokens : null,
      total_tokens: hasTokenValue('total_tokens') ? tokens.total_tokens : null,
      samples: tokenSamples,
      completeness: tokenSamples === 0 ? 'unknown' : completeTokenSamples === tokenSamples ? 'complete' : 'partial',
    },
    success_count: runStatus === 'completed' ? 1 : 0,
    failure_class: failureClass,
    total_duration_ms: Number.isFinite(firstTime) && Number.isFinite(lastTime) ? Math.max(0, lastTime - firstTime) : null,
    stages,
  };
}

async function authenticate(authenticator, req, purpose) {
  if (typeof authenticator !== 'function') return null;
  try { return await authenticator(req, purpose); }
  catch { return null; }
}

export function createCloudApiServer({
  databasePath = process.env.DSH_CLOUD_DATABASE ?? './data/cloud.sqlite3',
  artifactRoot = process.env.DSH_CLOUD_ARTIFACT_ROOT ?? resolve(dirname(databasePath), 'artifacts'),
  intentPrivateKey = null,
  intentKeyPath = process.env.DSH_CLOUD_INTENT_KEY_FILE ?? null,
  intentKeyId = null,
  authenticateDevice = null,
  authenticateUser = null,
  allowInsecureLocalUser = false,
  trustProxyClientIp = process.env.DSH_CLOUD_TRUST_PROXY_CLIENT_IP === 'true',
  maxBatchEvents = MAX_BATCH_EVENTS,
} = {}) {
  const store = new CloudEventStore(databasePath, { artifactRoot, intentPrivateKey, intentKeyPath, intentKeyId });
  const userPrincipal = async (req, purpose) => {
    const supplied = await authenticate(authenticateUser, req, { purpose });
    if (supplied) return supplied;
    return allowInsecureLocalUser && loopbackAddress(req.socket.remoteAddress)
      ? { tenant_id: 'local-dev', user_id: 'local-dev', role: 'tenant_admin' } : null;
  };
  const devicePrincipal = async (req, deviceId, purpose) => {
    if (typeof authenticateDevice === 'function') {
      return await authenticate(authenticateDevice, req, { purpose, device_id: deviceId });
    }
    return store.authenticateDevice(req.headers.authorization);
  };
  const pairingFailures = new Map();
  const pairingWindowMs = 5 * 60 * 1000;
  const maxPairingFailures = 8;
  const pairingAttemptState = (address, now = Date.now()) => {
    for (const [key, state] of pairingFailures) {
      if (now - state.startedAt >= pairingWindowMs) pairingFailures.delete(key);
    }
    const key = address || 'unknown';
    let state = pairingFailures.get(key);
    if (!state || now - state.startedAt >= pairingWindowMs) {
      if (!state && pairingFailures.size >= 2048) {
        const oldestKey = pairingFailures.keys().next().value;
        if (oldestKey !== undefined) pairingFailures.delete(oldestKey);
      }
      state = { startedAt: now, count: 0 };
      pairingFailures.set(key, state);
    }
    return state;
  };
  const api = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://dsh-cloud.local');
    try {
      if (req.method === 'GET' && url.pathname === '/healthz') {
        send(res, 200, { status: 'ok', service: 'dsh-client-cloud-api', protocol_version: 1 });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/') {
        const page = await readFile(resolve(WEB_ROOT, 'index.html'), 'utf8');
        send(res, 200, page, 'text/html; charset=utf-8');
        return;
      }
      if (req.method === 'GET' && url.pathname === '/app.js') {
        const script = await readFile(resolve(WEB_ROOT, 'app.js'), 'utf8');
        send(res, 200, script, 'text/javascript; charset=utf-8');
        return;
      }
      if (req.method === 'GET' && url.pathname === '/styles.css') {
        const css = await readFile(resolve(WEB_ROOT, 'styles.css'), 'utf8');
        send(res, 200, css, 'text/css; charset=utf-8');
        return;
      }
      if (req.method === 'GET' && url.pathname === '/devices.css') {
        const css = await readFile(resolve(WEB_ROOT, 'devices.css'), 'utf8');
        send(res, 200, css, 'text/css; charset=utf-8');
        return;
      }
      if (req.method === 'GET' && url.pathname === '/details.css') {
        const css = await readFile(resolve(WEB_ROOT, 'details.css'), 'utf8');
        send(res, 200, css, 'text/css; charset=utf-8');
        return;
      }
      if (req.method === 'POST' && url.pathname === '/v1/pairing/sessions') {
        const user = await userPrincipal(req, 'create_device_pairing');
        if (!user || typeof user.tenant_id !== 'string' || typeof user.user_id !== 'string') {
          send(res, 401, { error: { code: 'user_authentication_required' } });
          return;
        }
        const pairing = store.createPairingSession({ tenantId: user.tenant_id, userId: user.user_id });
        send(res, 201, { ...pairing, expires_in_seconds: 300 });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/v1/devices/pair') {
        const remoteAddress = trustedClientAddress(req, { trustProxy: trustProxyClientIp });
        const attemptState = pairingAttemptState(remoteAddress);
        if (attemptState.count >= maxPairingFailures) {
          const retryAfter = Math.max(1, Math.ceil((pairingWindowMs - (Date.now() - attemptState.startedAt)) / 1000));
          res.setHeader('retry-after', String(retryAfter));
          send(res, 429, { error: { code: 'pairing_rate_limited', message: 'too many invalid pairing attempts' } });
          return;
        }
        const body = await readJson(req);
        try {
          const pairing = store.pairDevice({
            pairingCode: body.pairing_code,
            deviceId: body.device_id,
            keyId: body.key_id,
            publicKeyPem: body.public_key,
            deviceName: body.device_name,
            clientVersion: body.client_version,
            workspaceId: body.workspace_id,
          });
          pairingFailures.delete(remoteAddress);
          send(res, 201, pairing);
        } catch (error) {
          if (error?.code === 'pairing_code_invalid') attemptState.count += 1;
          throw error;
        }
        return;
      }
      if (req.method === 'GET' && url.pathname === '/v1/devices') {
        const user = await userPrincipal(req, 'list_devices');
        if (!user || typeof user.tenant_id !== 'string' || !user.tenant_id
            || typeof user.user_id !== 'string' || !user.user_id) {
          send(res, 401, { error: { code: 'user_authentication_required' } }); return;
        }
        send(res, 200, { devices: store.listDevices(user.tenant_id, {
          userId: user.user_id, role: user.role, workspaceIds: user.workspace_ids,
        }) });
        return;
      }
      const revokeMatch = /^\/v1\/devices\/([^/]+)\/revoke$/u.exec(url.pathname);
      if (req.method === 'POST' && revokeMatch) {
        const user = await userPrincipal(req, 'revoke_device');
        if (!user || typeof user.tenant_id !== 'string' || !user.tenant_id
            || typeof user.user_id !== 'string' || !user.user_id) {
          send(res, 401, { error: { code: 'user_authentication_required' } }); return;
        }
        send(res, 200, store.revokeDevice(user.tenant_id, decodeURIComponent(revokeMatch[1]), {
          userId: user.user_id, role: user.role,
        }));
        return;
      }
      const heartbeatMatch = /^\/v1\/devices\/([^/]+)\/heartbeat$/u.exec(url.pathname);
      if (req.method === 'POST' && heartbeatMatch) {
        const deviceId = decodeURIComponent(heartbeatMatch[1]);
        const principal = await devicePrincipal(req, deviceId, 'device_heartbeat');
        if (!isDevicePrincipal(principal, deviceId)) {
          send(res, 401, { error: { code: 'device_authentication_required' } });
          return;
        }
        const body = await readJson(req);
        if (!store.heartbeatDevice(deviceId, { clientVersion: body.client_version })) {
          send(res, 401, { error: { code: 'device_authentication_required' } });
          return;
        }
        send(res, 200, { status: 'online', server_time: new Date().toISOString() });
        return;
      }
      const batchMatch = /^\/v1\/devices\/([^/]+)\/events:batch$/u.exec(url.pathname);
      if (req.method === 'POST' && batchMatch) {
        const deviceId = decodeURIComponent(batchMatch[1]);
        const principal = await devicePrincipal(req, deviceId, 'device_events');
        if (!principal) { send(res, 401, { error: { code: 'device_authentication_required' } }); return; }
        if (!isDevicePrincipal(principal, deviceId, { requireSigningKey: true })) {
          send(res, 403, { error: { code: 'device_identity_mismatch' } });
          return;
        }
        const body = await readJson(req);
        if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > maxBatchEvents) {
          throw cloudError('event_batch_invalid', `events must contain between 1 and ${maxBatchEvents} entries`);
        }
        const events = body.events.map((item) => {
          rejectSensitiveEventFields(item?.payload);
          const event = validateRunEvent(item);
          const probeEvent = ['environment.probed', 'device.probed'].includes(event.type);
          if ((event.run_id === '__connector_telemetry__') !== probeEvent) {
            throw cloudError('event_telemetry_scope_invalid', 'connector telemetry event scope is invalid', 400);
          }
          return event;
        });
        const seen = new Set();
        for (const event of events) {
          if (event.device_id !== principal.device_id || event.tenant_id !== principal.tenant_id) {
            throw cloudError('event_identity_mismatch', 'event tenant or device does not match the authenticated identity', 403);
          }
          if (event.workspace_id !== principal.workspace_id) {
            throw cloudError('event_workspace_mismatch', 'event workspace does not match the workspace registered to this device', 403);
          }
          if (principal.key_id && event.device_signature?.key_id !== principal.key_id) {
            throw cloudError('event_key_mismatch', 'event signing key is not the active key for this device', 403);
          }
          if (seen.has(event.event_id)) throw cloudError('event_batch_invalid', 'event_id appears more than once in one batch');
          seen.add(event.event_id);
          verifySignedRunEvent(event, principal.public_key);
        }
        events.sort((left, right) => left.client_seq - right.client_seq);
        const result = store.acceptBatch(events);
        send(res, 200, {
          accepted_event_ids: result.accepted,
          duplicate_event_ids: result.duplicates,
          accepted_through_client_seq: store.cursor(principal.tenant_id, principal.device_id),
          expected_next_client_seq: store.cursor(principal.tenant_id, principal.device_id) + 1,
          server_time: new Date().toISOString(),
        });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/v1/artifacts/manifests') {
        const principal = await devicePrincipal(req, null, 'artifact_manifest');
        if (!isDevicePrincipal(principal, principal?.device_id)) {
          send(res, 401, { error: { code: 'device_authentication_required' } }); return;
        }
        const body = await readJson(req);
        const allowed = new Set(['run_id', 'phase', 'name', 'sha256', 'size_bytes', 'content_type', 'classification', 'data_policy']);
        if (Object.keys(body).some((key) => !allowed.has(key))) {
          throw cloudError('artifact_manifest_invalid', 'artifact manifest contains unsupported fields', 400);
        }
        for (const field of ['run_id', 'phase', 'name', 'sha256', 'content_type', 'classification', 'data_policy']) {
          if (typeof body[field] !== 'string') throw cloudError('artifact_manifest_invalid', `${field} is required`, 400, { field });
        }
        send(res, 201, store.createArtifactManifest(principal, body));
        return;
      }
      const artifactUploadInitMatch = /^\/v1\/artifacts\/([^/]+)\/uploads$/u.exec(url.pathname);
      if (req.method === 'POST' && artifactUploadInitMatch) {
        const principal = await devicePrincipal(req, null, 'artifact_upload_create');
        if (!isDevicePrincipal(principal, principal?.device_id)) {
          send(res, 401, { error: { code: 'device_authentication_required' } }); return;
        }
        send(res, 201, store.createArtifactUpload(principal, decodeURIComponent(artifactUploadInitMatch[1])));
        return;
      }
      const artifactUploadMatch = /^\/v1\/artifacts\/([^/]+)\/uploads\/([^/]+)$/u.exec(url.pathname);
      if (req.method === 'PUT' && artifactUploadMatch) {
        const uploadId = decodeURIComponent(artifactUploadMatch[2]);
        const authorization = req.headers.authorization;
        if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
          send(res, 401, { error: { code: 'artifact_upload_token_required' } }); return;
        }
        const token = authorization.slice(7);
        const artifactId = decodeURIComponent(artifactUploadMatch[1]);
        if (!store.validateArtifactUpload(uploadId, token, artifactId)) {
          send(res, 401, { error: { code: 'artifact_upload_token_invalid' } }); return;
        }
        const bytes = await readBinary(req, MAX_ARTIFACT_BYTES);
        const artifact = await store.storeArtifactUpload(uploadId, authorization.slice(7), bytes,
          artifactId);
        send(res, 200, artifact);
        return;
      }
      const artifactContentMatch = /^\/v1\/artifacts\/([^/]+)\/content$/u.exec(url.pathname);
      if (req.method === 'GET' && artifactContentMatch) {
        const user = await userPrincipal(req, 'artifact_content');
        if (!user || typeof user.tenant_id !== 'string' || typeof user.user_id !== 'string') {
          send(res, 401, { error: { code: 'user_authentication_required' } }); return;
        }
        const row = store.getArtifactForUser(decodeURIComponent(artifactContentMatch[1]), user);
        const bytes = row ? await store.readArtifactContent(row) : null;
        if (!bytes) { send(res, 404, { error: { code: 'artifact_not_found' } }); return; }
        const safeName = encodeURIComponent(row.name).replaceAll("'", '%27').replaceAll('(', '%28').replaceAll(')', '%29');
        res.writeHead(200, {
          'content-type': 'application/octet-stream',
          'content-length': String(bytes.length),
          'content-disposition': `attachment; filename="artifact"; filename*=UTF-8''${safeName}`,
          'cache-control': 'private, no-store',
          'x-content-type-options': 'nosniff',
        });
        res.end(bytes);
        return;
      }
      const artifactMatch = /^\/v1\/artifacts\/([^/]+)$/u.exec(url.pathname);
      if (req.method === 'GET' && artifactMatch) {
        const user = await userPrincipal(req, 'artifact_metadata');
        if (!user || typeof user.tenant_id !== 'string' || typeof user.user_id !== 'string') {
          send(res, 401, { error: { code: 'user_authentication_required' } }); return;
        }
        const row = store.getArtifactForUser(decodeURIComponent(artifactMatch[1]), user);
        if (!row) { send(res, 404, { error: { code: 'artifact_not_found' } }); return; }
        send(res, 200, store.artifactView(row));
        return;
      }
      const reviewBundleCreateMatch = /^\/v1\/runs\/([^/]+)\/review-bundles$/u.exec(url.pathname);
      if (req.method === 'POST' && reviewBundleCreateMatch) {
        const principal = await devicePrincipal(req, null, 'review_bundle_create');
        if (!isDevicePrincipal(principal, principal?.device_id)) {
          send(res, 401, { error: { code: 'device_authentication_required' } }); return;
        }
        const runId = decodeURIComponent(reviewBundleCreateMatch[1]);
        const body = await readJson(req);
        const allowed = new Set(['phase', 'run_revision', 'artifact_ids']);
        if (Object.keys(body).some((key) => !allowed.has(key))) throw cloudError('review_bundle_invalid', 'review bundle contains unsupported fields', 400);
        send(res, 201, store.createReviewBundle(principal, {
          runId, phase: body.phase, runRevision: body.run_revision, artifactIds: body.artifact_ids,
        }));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/v1/reviews/pending') {
        const user = await userPrincipal(req, 'pending_reviews');
        if (!user || typeof user.tenant_id !== 'string' || typeof user.user_id !== 'string') {
          send(res, 401, { error: { code: 'user_authentication_required' } }); return;
        }
        send(res, 200, { reviews: store.pendingReviews(user) });
        return;
      }
      const reviewDecisionMatch = /^\/v1\/review-bundles\/([^/]+)\/decisions$/u.exec(url.pathname);
      if (req.method === 'POST' && reviewDecisionMatch) {
        const user = await userPrincipal(req, 'review_decision');
        if (!user || typeof user.tenant_id !== 'string' || typeof user.user_id !== 'string') {
          send(res, 401, { error: { code: 'user_authentication_required' } }); return;
        }
        const body = await readJson(req);
        if (Object.keys(body).some((key) => !['decision', 'note'].includes(key))) {
          throw cloudError('review_decision_invalid', 'review decision contains unsupported fields', 400);
        }
        send(res, 201, store.createReviewDecision(decodeURIComponent(reviewDecisionMatch[1]), user,
          body.decision, body.note ?? ''));
        return;
      }
      const reviewBundleMatch = /^\/v1\/review-bundles\/([^/]+)$/u.exec(url.pathname);
      if (req.method === 'GET' && reviewBundleMatch) {
        const user = await userPrincipal(req, 'review_bundle_detail');
        if (!user || typeof user.tenant_id !== 'string' || typeof user.user_id !== 'string') {
          send(res, 401, { error: { code: 'user_authentication_required' } }); return;
        }
        const bundle = store.reviewBundleForUser(decodeURIComponent(reviewBundleMatch[1]), user);
        if (!bundle) { send(res, 404, { error: { code: 'review_bundle_not_found' } }); return; }
        send(res, 200, bundle.view);
        return;
      }
      const intentsMatch = /^\/v1\/devices\/([^/]+)\/intents$/u.exec(url.pathname);
      if (req.method === 'GET' && intentsMatch) {
        const deviceId = decodeURIComponent(intentsMatch[1]);
        const principal = await devicePrincipal(req, deviceId, 'device_intents');
        if (!isDevicePrincipal(principal, deviceId)) {
          send(res, 401, { error: { code: 'device_authentication_required' } }); return;
        }
        send(res, 200, {
          intents: store.pendingIntents(principal.tenant_id, principal.device_id),
          signing_key: store.signingsPublicKey(),
        });
        return;
      }
      const intentResultMatch = /^\/v1\/intents\/([^/]+)\/result$/u.exec(url.pathname);
      if (req.method === 'POST' && intentResultMatch) {
        const body = await readJson(req);
        const deviceId = body.device_id;
        const principal = await devicePrincipal(req, deviceId, 'intent_result');
        if (!isDevicePrincipal(principal, deviceId) || Object.keys(body).some((key) => !['device_id', 'status', 'reason_code'].includes(key))) {
          send(res, 401, { error: { code: 'device_authentication_required' } }); return;
        }
        send(res, 200, store.resolveIntent(principal.tenant_id, principal.device_id,
          decodeURIComponent(intentResultMatch[1]), body.status, body.reason_code ?? null));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/v1/intents/signing-key') {
        const authorization = await userPrincipal(req, 'intent_signing_key');
        if (!authorization) {
          const deviceId = req.headers['x-dsh-device-id'];
          const principal = await devicePrincipal(req, deviceId, 'intent_signing_key');
          if (!isDevicePrincipal(principal, deviceId)) {
            send(res, 401, { error: { code: 'authentication_required' } }); return;
          }
        }
        send(res, 200, store.signingsPublicKey());
        return;
      }
      const syncMatch = /^\/v1\/devices\/([^/]+)\/sync-state$/u.exec(url.pathname);
      if (req.method === 'GET' && syncMatch) {
        const deviceId = decodeURIComponent(syncMatch[1]);
        const principal = await devicePrincipal(req, deviceId, 'device_sync_state');
        if (!isDevicePrincipal(principal, deviceId)) {
          send(res, 401, { error: { code: 'device_authentication_required' } });
          return;
        }
        const accepted = store.cursor(principal.tenant_id, principal.device_id);
        send(res, 200, { accepted_through_client_seq: accepted, expected_next_client_seq: accepted + 1 });
        return;
      }
      const runDetailMatch = /^\/v1\/runs\/([^/]+)$/u.exec(url.pathname);
      if (req.method === 'GET' && runDetailMatch) {
        const user = await userPrincipal(req, 'cloud_run_detail');
        if (!user || typeof user.tenant_id !== 'string' || !user.tenant_id
            || typeof user.user_id !== 'string' || !user.user_id) {
          send(res, 401, { error: { code: 'user_authentication_required' } }); return;
        }
        const detail = store.runDetails(user.tenant_id, decodeURIComponent(runDetailMatch[1]), {
          deviceId: url.searchParams.get('device_id'), userId: user.user_id,
          role: user.role, workspaceIds: user.workspace_ids,
        });
        if (!detail) { send(res, 404, { error: { code: 'run_not_found' } }); return; }
        send(res, 200, detail);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/v1/probes') {
        const user = await userPrincipal(req, 'cloud_probes');
        if (!user || typeof user.tenant_id !== 'string' || !user.tenant_id
            || typeof user.user_id !== 'string' || !user.user_id) {
          send(res, 401, { error: { code: 'user_authentication_required' } }); return;
        }
        const rawLimit = Number(url.searchParams.get('limit') ?? 100);
        const limit = Number.isInteger(rawLimit) ? rawLimit : 100;
        send(res, 200, { probes: store.listProbes(user.tenant_id, {
          userId: user.user_id, role: user.role, workspaceIds: user.workspace_ids, limit,
        }), generated_at: new Date().toISOString() });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/v1/runs') {
        const user = await userPrincipal(req, 'cloud_runs');
        if (!user || typeof user.tenant_id !== 'string' || !user.tenant_id
            || typeof user.user_id !== 'string' || !user.user_id) {
          send(res, 401, { error: { code: 'user_authentication_required' } });
          return;
        }
        const rawLimit = Number(url.searchParams.get('limit') ?? 100);
        const limit = Number.isInteger(rawLimit) ? rawLimit : 100;
        const runs = store.listRuns(user.tenant_id, {
          userId: user.user_id, role: user.role, workspaceIds: user.workspace_ids,
          limit, cursor: url.searchParams.get('cursor'),
        });
        send(res, 200, { runs, generated_at: new Date().toISOString() });
        return;
      }
      send(res, 404, { error: { code: 'not_found' } });
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status
        : error?.code?.startsWith('run_event_') ? 400 : 500;
      send(res, status, {
        ...(error?.details && typeof error.details === 'object' ? error.details : {}),
        error: { code: error?.code ?? 'cloud_api_failed', message: error?.message ?? 'request failed', details: error?.details ?? {} },
      });
    }
  });
  api.on('close', () => store.close());
  api.cloudStore = store;
  return api;
}

const entrypoint = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (entrypoint) {
  const host = process.env.DSH_CLOUD_HOST ?? '127.0.0.1';
  const port = Number(process.env.DSH_CLOUD_PORT ?? 8791);
  const databasePath = process.env.DSH_CLOUD_DATABASE ?? './data/cloud.sqlite3';
  const loopbackHost = host === '127.0.0.1' || host === '::1';
  const authModulePath = process.env.DSH_CLOUD_AUTH_MODULE;
  const localDevAuth = process.env.DSH_CLOUD_ALLOW_LOCAL_DEV_AUTH === 'true';
  if (!loopbackHost && authModulePath === undefined) {
    process.stderr.write('Refusing non-loopback cloud bind without an authentication adapter (DSH_CLOUD_AUTH_MODULE).\n');
    process.exitCode = 2;
  } else if (localDevAuth && (!loopbackHost || authModulePath !== undefined)) {
    process.stderr.write('Refusing local development authentication outside an isolated loopback-only development server.\n');
    process.exitCode = 2;
  } else {
    let auth = {};
    if (authModulePath) {
      const loaded = await import(pathToFileURL(resolve(authModulePath)).href);
      auth = await loaded.createCloudAuth?.() ?? {};
      if (typeof auth.authenticateUser !== 'function') {
        process.stderr.write('Cloud authentication adapter must provide authenticateUser(request).\n');
        process.exitCode = 2;
      }
    }
    if (process.exitCode !== 2) {
      const server = createCloudApiServer({
        databasePath,
        authenticateDevice: auth.authenticateDevice,
        authenticateUser: auth.authenticateUser,
        allowInsecureLocalUser: localDevAuth,
        trustProxyClientIp: process.env.DSH_CLOUD_TRUST_PROXY_CLIENT_IP === 'true',
      });
      server.listen(port, host, () => process.stdout.write(`DSH cloud console listening on http://${host}:${port}\n`));
      const shutdown = () => server.close(() => process.exit(0));
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    }
  }
}
