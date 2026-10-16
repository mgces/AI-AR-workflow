import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createCloudAuth } from '../deploy/cloud/proxy-auth.js';

const baseEnv = {
  DSH_CLOUD_PROXY_AUTH_SECRET: 'a-very-long-deployment-only-proxy-secret-value',
  DSH_CLOUD_TENANT_ID: 'tenant-team',
  DSH_CLOUD_PUBLIC_ORIGIN: 'https://dsh.example.test',
  DSH_CLOUD_WORKSPACE_IDS: 'team-workspace,release-workspace',
  DSH_CLOUD_ADMIN_USERS: 'admin@example.test',
};

function request(headers = {}, method = 'GET') { return { headers, method }; }

test('trusted proxy authentication maps a verified identity to configured tenant/workspace scope', async () => {
  const auth = await createCloudAuth({ env: baseEnv });
  const principal = await auth.authenticateUser(request({
    'x-dsh-proxy-auth': baseEnv.DSH_CLOUD_PROXY_AUTH_SECRET,
    'x-dsh-user-id': 'dev@example.test',
  }), { purpose: 'cloud_runs' });
  assert.deepEqual(principal, {
    tenant_id: 'tenant-team', user_id: 'dev@example.test', role: 'member',
    workspace_ids: ['team-workspace', 'release-workspace'],
  });
});

test('trusted proxy authentication assigns tenant admin only to a server-configured identity', async () => {
  const auth = await createCloudAuth({ env: baseEnv });
  const principal = await auth.authenticateUser(request({
    'x-dsh-proxy-auth': baseEnv.DSH_CLOUD_PROXY_AUTH_SECRET,
    'x-dsh-user-id': 'ADMIN@example.test',
  }));
  assert.equal(principal.role, 'tenant_admin');
});

test('trusted proxy authentication rejects missing, forged, or invalid deployment identity', async () => {
  const auth = await createCloudAuth({ env: baseEnv });
  assert.equal(await auth.authenticateUser(request({ 'x-dsh-user-id': 'dev@example.test' })), null);
  assert.equal(await auth.authenticateUser(request({
    'x-dsh-proxy-auth': 'attacker', 'x-dsh-user-id': 'admin@example.test',
  })), null);
  assert.equal(await auth.authenticateUser(request({
    'x-dsh-proxy-auth': baseEnv.DSH_CLOUD_PROXY_AUTH_SECRET, 'x-dsh-user-id': '../admin',
  })), null);
});

test('trusted proxy adapter fails closed without strong proxy secret or tenant identity', async () => {
  await assert.rejects(createCloudAuth({ env: { ...baseEnv, DSH_CLOUD_PROXY_AUTH_SECRET: 'short' } }),
    { code: 'cloud_proxy_auth_configuration_invalid' });
  await assert.rejects(createCloudAuth({ env: { ...baseEnv, DSH_CLOUD_TENANT_ID: '' } }),
    { code: 'cloud_proxy_auth_configuration_invalid' });
  await assert.rejects(createCloudAuth({ env: { ...baseEnv, DSH_CLOUD_PUBLIC_ORIGIN: 'http://dsh.example.test' } }),
    { code: 'cloud_proxy_auth_configuration_invalid' });
});

test('deployment example proxy secret cannot pass production adapter validation', async () => {
  const example = readFileSync(new URL('../deploy/cloud/.env.example', import.meta.url), 'utf8');
  const secret = example.match(/^DSH_CLOUD_PROXY_AUTH_SECRET=(.+)$/mu)?.[1];
  assert.ok(secret);
  await assert.rejects(createCloudAuth({ env: {
    ...baseEnv,
    DSH_CLOUD_PROXY_AUTH_SECRET: secret,
  } }), { code: 'cloud_proxy_auth_configuration_invalid' });
});
