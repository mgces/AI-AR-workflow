import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { resolveSecretReference, validateSshfsConnectorConfig } from '../bin/dsh-local-connector.js';
import { loadProfiles } from '../bin/workspace-gateway.js';

test('local Connector resolves an environment-backed token without persisting or sending the reference literal', () => {
  assert.equal(resolveSecretReference('${DSH_CONNECTOR_TOKEN}', { DSH_CONNECTOR_TOKEN: 'secret-value' }), 'secret-value');
  assert.equal(resolveSecretReference('${MISSING_TOKEN}', {}), null);
  assert.equal(resolveSecretReference('literal-token', {}), 'literal-token');
});

test('local Connector rejects an SSHFS mode that has no SSH binding', () => {
  assert.throws(() => validateSshfsConnectorConfig({
    workspaceAccess: 'sshfs_mount',
    localRoot: '/mnt/dsh-code',
    remoteRoot: '/srv/project',
    sshConfig: null,
  }), /SSHFS mode requires an ssh binding/u);
  assert.throws(() => validateSshfsConnectorConfig({
    workspaceAccess: 'sshfs_mount',
    localRoot: '/mnt/dsh-code',
    remoteRoot: '/srv/project',
    sshConfig: { username: 'builder' },
  }), /ssh\.host is required/u);
});

test('local Connector accepts a declared SSHFS binding and keeps remote-tools separate', () => {
  assert.equal(validateSshfsConnectorConfig({
    workspaceAccess: 'sshfs_mount',
    localRoot: '/mnt/dsh-code',
    remoteRoot: '/srv/project',
    sshConfig: { host: 'code-host.example', username: 'builder' },
  }), true);
  assert.equal(validateSshfsConnectorConfig({
    workspaceAccess: 'remote_tools',
    localRoot: null,
    remoteRoot: '/srv/project',
    sshConfig: null,
  }), true);
});

test('gateway loads a validated profile bundle from an absolute profile file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-gateway-profiles-'));
  const file = join(directory, 'profiles.json');
  try {
    writeFileSync(file, JSON.stringify({ 'codeagent.codex': { command: 'codex', args: ['exec'] } }));
    assert.deepEqual(loadProfiles({ file }), { 'codeagent.codex': { command: 'codex', args: ['exec'] } });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('gateway profile loader rejects relative paths, invalid JSON, non-object bundles, and inline/file conflicts', () => {
  assert.throws(() => loadProfiles({ file: 'profiles.json' }), /DSH_GATEWAY_PROFILES_FILE must be an absolute path/u);
  assert.throws(() => loadProfiles({ inline: '{' }), /DSH_GATEWAY_PROFILES must be valid JSON/u);
  assert.throws(() => loadProfiles({ inline: '[]' }), /DSH_GATEWAY_PROFILES must be a JSON object/u);
  assert.throws(() => loadProfiles({ inline: '{}', file: '/tmp/profiles.json' }), /set only one of/u);
});

test('gateway launcher rejects non-numeric authority revisions', async () => {
  const bin = new URL('../bin/workspace-gateway.js', import.meta.url);
  const env = {
    ...process.env,
    DSH_GATEWAY_HOST: '127.0.0.1',
    DSH_GATEWAY_REMOTE_ROOT: '/tmp',
    DSH_TENANT_ID: 'tenant-1',
    DSH_WORKSPACE_ID: 'workspace-1',
    DSH_CLOUD_RUN_ID: 'run-1',
    DSH_AUTHORITY_RUN_ID: 'authority-1',
    DSH_REVISION: '1abc',
    DSH_PHASE_EPOCH: 'P0-a',
    DSH_CONNECTION_EPOCH: '1',
    DSH_GATEWAY_ALLOW_UNSIGNED: '1',
  };
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [bin.pathname], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.once('close', (code) => resolve({ code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') }));
    child.stdin.end();
  });
  assert.equal(result.code, 2);
});

test('gateway launcher supports workspace-scoped dynamic run authority', async () => {
  const bin = new URL('../bin/workspace-gateway.js', import.meta.url);
  const env = {
    ...process.env,
    DSH_GATEWAY_HOST: '127.0.0.1',
    DSH_GATEWAY_REMOTE_ROOT: '/tmp',
    DSH_TENANT_ID: 'tenant-1',
    DSH_WORKSPACE_ID: 'workspace-1',
    DSH_GATEWAY_ALLOW_UNSIGNED: '1',
  };
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [bin.pathname], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.once('close', (code) => resolve({ code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') }));
    child.stdin.end();
  });
  assert.equal(result.code, 0);
});

test('gateway launcher creates the configured durable operation journal', async () => {
  const bin = new URL('../bin/workspace-gateway.js', import.meta.url);
  const directory = mkdtempSync(join(tmpdir(), 'dsh-gateway-journal-'));
  const journal = join(directory, 'operations.sqlite');
  try {
    const env = {
      ...process.env,
      DSH_GATEWAY_HOST: '127.0.0.1',
      DSH_GATEWAY_REMOTE_ROOT: '/tmp',
      DSH_TENANT_ID: 'tenant-1',
      DSH_WORKSPACE_ID: 'workspace-1',
      DSH_GATEWAY_ALLOW_UNSIGNED: '1',
      DSH_GATEWAY_JOURNAL_DB: journal,
    };
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [bin.pathname], { env, stdio: ['pipe', 'pipe', 'pipe'] });
      const stdout = [];
      const stderr = [];
      child.stdout.on('data', (chunk) => stdout.push(chunk));
      child.stderr.on('data', (chunk) => stderr.push(chunk));
      child.once('close', (code) => resolve({ code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') }));
      child.stdin.end();
    });
    assert.equal(result.code, 0);
    assert.equal(existsSync(journal), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
