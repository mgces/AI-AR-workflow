#!/usr/bin/env node

import { timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createHmacVerifier, MIN_AUTHORITY_SECRET_BYTES } from '../src/authority/signature.js';
import { WorkspaceConnector } from '../src/connector/workspace-connector.js';
import { createGatewayHttpServer, createJsonlGateway, WorkspaceGatewayService } from '../src/connector/jsonl-gateway.js';
import { cgroupOptionsFromEnv, ProcessSupervisor } from '../src/supervisor/process-supervisor.js';
import { DurableResourceLockStore } from '../src/supervisor/resource-locks.js';

function required(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} is required`);
  return value.trim();
}

function positive(name) {
  const raw = required(name);
  if (!/^[0-9]+$/u.test(raw)) throw new Error(`${name} must be a valid positive integer`);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || (name === 'DSH_GATEWAY_HTTP_PORT' && value > 65535)) throw new Error(`${name} must be a valid positive integer`);
  return value;
}

function optionalPath(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

export function loadProfiles({ inline = null, file = null } = {}) {
  const inlineValue = typeof inline === 'string' && inline.trim() !== '' ? inline : null;
  const fileValue = typeof file === 'string' && file.trim() !== '' ? file.trim() : null;
  if (inlineValue && fileValue) throw new Error('set only one of DSH_GATEWAY_PROFILES or DSH_GATEWAY_PROFILES_FILE');
  if (fileValue && !isAbsolute(fileValue)) throw new Error('DSH_GATEWAY_PROFILES_FILE must be an absolute path');
  if (!inlineValue && !fileValue) return undefined;
  let raw = inlineValue;
  if (fileValue) {
    try { raw = readFileSync(fileValue, 'utf8'); }
    catch (error) { throw new Error(`could not read DSH_GATEWAY_PROFILES_FILE: ${error.message}`); }
  }
  let value;
  try { value = JSON.parse(raw); }
  catch { throw new Error(`${fileValue ? 'DSH_GATEWAY_PROFILES_FILE' : 'DSH_GATEWAY_PROFILES'} must be valid JSON`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fileValue ? 'DSH_GATEWAY_PROFILES_FILE' : 'DSH_GATEWAY_PROFILES'} must be a JSON object`);
  }
  return value;
}

function profiles() {
  return loadProfiles({
    inline: process.env.DSH_GATEWAY_PROFILES,
    file: process.env.DSH_GATEWAY_PROFILES_FILE,
  });
}

function resourceLockStore() {
  const lockPath = optionalPath('DSH_GATEWAY_LOCK_DB');
  const journalPath = optionalPath('DSH_GATEWAY_JOURNAL_DB') || lockPath;
  if (lockPath && !isAbsolute(lockPath)) throw new Error('DSH_GATEWAY_LOCK_DB must be an absolute path');
  if (journalPath && !isAbsolute(journalPath)) throw new Error('DSH_GATEWAY_JOURNAL_DB must be an absolute path');
  const paths = new Map();
  for (const path of [lockPath, journalPath]) {
    if (!path || paths.has(path)) continue;
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(path);
    db.exec('PRAGMA busy_timeout = 5000');
    paths.set(path, db);
  }
  const lockDb = lockPath ? paths.get(lockPath) : null;
  const journalDb = journalPath ? paths.get(journalPath) : null;
  return {
    store: lockDb ? new DurableResourceLockStore({ db: lockDb, ownerNamespace: 'gateway' }) : null,
    db: lockDb,
    journalDb,
    close() {
      for (const db of paths.values()) db.close();
    },
  };
}

function authorityVerifier() {
  // Secrets are opaque bytes encoded as UTF-8 text. Do not trim them: a
  // leading/trailing byte is part of the shared key and must match the cloud.
  const secret = process.env.DSH_GATEWAY_SHARED_SECRET || null;
  const allowUnsigned = process.env.DSH_GATEWAY_ALLOW_UNSIGNED === '1';
  if (!secret) {
    if (allowUnsigned) return null;
    throw new Error(`DSH_GATEWAY_SHARED_SECRET is required (or set DSH_GATEWAY_ALLOW_UNSIGNED=1 only for an isolated development gateway)`);
  }
  if (Buffer.byteLength(secret, 'utf8') < MIN_AUTHORITY_SECRET_BYTES) {
    throw new Error(`DSH_GATEWAY_SHARED_SECRET must contain at least ${MIN_AUTHORITY_SECRET_BYTES} UTF-8 bytes`);
  }
  return createHmacVerifier({
    secret,
    keyId: process.env.DSH_GATEWAY_KEY_ID?.trim() || 'dsh-cloud',
  });
}

async function main() {
  const authorityContext = {
    tenant_id: required('DSH_TENANT_ID'),
    workspace_id: required('DSH_WORKSPACE_ID'),
    // Run-specific fields are optional for a workspace-scoped gateway. The
    // cloud adapter fills them per operation; when supplied, Connector still
    // enforces them as an immutable single-run binding.
    ...(process.env.DSH_CLOUD_RUN_ID?.trim() ? { cloud_run_id: process.env.DSH_CLOUD_RUN_ID.trim() } : {}),
    ...(process.env.DSH_AUTHORITY_RUN_ID?.trim() ? { authority_run_id: process.env.DSH_AUTHORITY_RUN_ID.trim() } : {}),
    ...(process.env.DSH_REVISION?.trim() ? { revision: positive('DSH_REVISION') } : {}),
    ...(process.env.DSH_PHASE_EPOCH?.trim() ? { phase_epoch: process.env.DSH_PHASE_EPOCH.trim() } : {}),
    ...(process.env.DSH_CONNECTION_EPOCH?.trim() ? { connection_epoch: positive('DSH_CONNECTION_EPOCH') } : {}),
  };
  const verifySignature = authorityVerifier();
  const locks = resourceLockStore();
  const processSupervisor = new ProcessSupervisor({
    db: locks.journalDb,
    ...cgroupOptionsFromEnv(process.env),
  });
  const reconciled = await processSupervisor.reconcile();
  if (reconciled.length > 0) {
    process.stderr.write(`workspace-gateway: reconciled ${reconciled.length} in-flight process(es); state retained as unknown for higher-level reconciliation\n`);
  }
  const connector = new WorkspaceConnector({
    host: required('DSH_GATEWAY_HOST'),
    username: process.env.DSH_GATEWAY_USER?.trim() || null,
    port: process.env.DSH_GATEWAY_PORT ? positive('DSH_GATEWAY_PORT') : 22,
    remoteRoot: required('DSH_GATEWAY_REMOTE_ROOT'),
    identityFile: optionalPath('DSH_GATEWAY_IDENTITY_FILE'),
    knownHostsFile: optionalPath('DSH_GATEWAY_KNOWN_HOSTS_FILE'),
    verifySignature,
    resourceLocks: locks.store,
    journalDb: locks.journalDb,
    processSupervisor,
    authorityContext,
    profiles: profiles(),
  });
  const service = new WorkspaceGatewayService({ connector });
  const httpPort = process.env.DSH_GATEWAY_HTTP_PORT ? positive('DSH_GATEWAY_HTTP_PORT') : null;
  if (httpPort !== null) {
    const bearer = process.env.DSH_GATEWAY_BEARER_TOKEN?.trim();
    if (!bearer) throw new Error('DSH_GATEWAY_BEARER_TOKEN is required for HTTP transport');
    const authorize = async (req) => {
      const presented = String(req.headers.authorization ?? '');
      const expected = `Bearer ${bearer}`;
      const actual = Buffer.from(presented);
      const wanted = Buffer.from(expected);
      return actual.length === wanted.length && timingSafeEqual(actual, wanted);
    };
    const server = createGatewayHttpServer({ service, authorize });
    const host = process.env.DSH_GATEWAY_HTTP_HOST?.trim() || '127.0.0.1';
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(httpPort, host, resolve);
    });
    process.stdout.write(`workspace-gateway HTTP listening on http://${host}:${httpPort}\n`);
    const shutdown = async () => new Promise((resolve) => server.close(() => {
      try { locks.close(); } finally { resolve(); }
    }));
    process.once('SIGTERM', () => { void shutdown().finally(() => process.exit(0)); });
    process.once('SIGINT', () => { void shutdown().finally(() => process.exit(0)); });
    await new Promise(() => {});
    return;
  }
  // SSH and supervisor transports can expose fd 0/1 as socket-backed pipes.
  // Node's process.stdin/stdout wrappers may observe EOF or retain buffered
  // output across the final response, so keep explicit fd streams for the
  // lifetime of the JSONL gateway.
  const input = createReadStream(null, { fd: 0, autoClose: false });
  const output = createWriteStream(null, { fd: 1, autoClose: false });
  const gateway = createJsonlGateway({ service, input, output }).start();
  const shutdown = async () => {
    gateway.stop();
    await gateway.waitForIdle();
    locks.close();
  };
  process.once('SIGTERM', () => { void shutdown().finally(() => process.exit(0)); });
  process.once('SIGINT', () => { void shutdown().finally(() => process.exit(0)); });
  await new Promise((resolve) => input.once('end', resolve));
  await gateway.waitForIdle();
  locks.close();
}

const entrypoint = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (entrypoint) {
  main().catch((error) => {
    process.stderr.write(`dsh-workspace-gateway: ${error.message}\n`);
    process.exitCode = 2;
  });
}
