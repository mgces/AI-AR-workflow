import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { afterCloseAndRemove } from '../../../test/test-cleanup.js';
import { createCloudApiServer } from '../../cloud-api/src/server.js';
import { createCloudReviewUploader } from '../src/cloud-review-upload.js';
import { verifyReviewIntent } from '../src/cloud-review-intent.js';

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test('desktop selected-artifact upload reaches Cloud Console and returns a locally verifiable signed approval', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-review-e2e-'));
  const server = createCloudApiServer({
    databasePath: join(directory, 'cloud.sqlite3'),
    artifactRoot: join(directory, 'objects'),
    authenticateUser: async () => ({ tenant_id: 'tenant-1', user_id: 'reviewer-1', role: 'tenant_admin' }),
    authenticateDevice: async (_request, context) => ({
      tenant_id: 'tenant-1', device_id: context.device_id ?? 'device-1', workspace_id: 'workspace-1', key_id: 'device-key-1',
    }),
  });
  afterCloseAndRemove(t, () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())), directory);
  const origin = await listen(server);
  const now = new Date().toISOString();
  server.cloudStore.db.prepare(`INSERT INTO run_projection(
    tenant_id, device_id, workspace_id, run_id, workflow_id, status, current_phase,
    revision, last_client_seq, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run('tenant-1', 'device-1', 'workspace-1', 'run-e2e', 'ar-delivery', 'awaiting_consent', 'P2', 3, 9, now, now);

  const content = '# P2 reviewed output\n';
  const sha = createHash('sha256').update(content).digest('hex');
  const localRequests = [];
  let savedBundle;
  const uploader = createCloudReviewUploader({
    async getCredentials() { return { cloud_url: origin, device_id: 'device-1', access_token: 'device-token' }; },
    async syncEvents() { return { status: 'connected' }; },
    async apiRequest(method, path) {
      localRequests.push([method, path]);
      if (path === '/api/ar/runs/run-e2e') return { run_id: 'run-e2e', revision: 3 };
      if (path === '/api/ar/runs/run-e2e/artifacts') return { artifacts: [{ relative_path: 'reports/p2.md', filename: 'p2.md', binary: false }] };
      if (path.includes('artifacts/content?')) return { content };
      throw new Error(`unexpected local request: ${path}`);
    },
    async cloudJson(method, path, body, token) {
      const response = await fetch(new URL(path, origin), {
        method,
        headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const value = await response.json();
      assert.equal(response.ok, true, JSON.stringify(value));
      return value;
    },
    async cloudBinary(path, token, bytes) {
      const response = await fetch(new URL(path, origin), { method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: bytes });
      const value = await response.json();
      assert.equal(response.ok, true, JSON.stringify(value));
      return value;
    },
    async saveBundle(bundle) { savedBundle = bundle; },
  });

  const sealed = await uploader.upload({ run_id: 'run-e2e', phase: 'P2', artifact_paths: ['reports/p2.md'] });
  assert.equal(sealed.bundle_id, savedBundle.bundle_id);
  assert.equal(savedBundle.artifact_shas[0], sha);
  assert.deepEqual(localRequests.map(([, path]) => path).filter((path) => path.includes('artifacts/content')), [
    '/api/ar/runs/run-e2e/artifacts/content?path=reports%2Fp2.md',
  ]);

  const decisionResponse = await fetch(new URL(`/v1/review-bundles/${sealed.bundle_id}/decisions`, origin), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision: 'approved', note: 'P2 审核通过' }),
  });
  assert.equal(decisionResponse.status, 201);
  const intentsResponse = await fetch(new URL('/v1/devices/device-1/intents', origin), { headers: { authorization: 'Bearer device-token' } });
  const { intents, signing_key: signingKey } = await intentsResponse.json();
  const verified = verifyReviewIntent({ intent: intents[0], signingKey, bundle: savedBundle, deviceId: 'device-1', currentRunRevision: 3 });
  assert.equal(verified.decision, 'approved');
  assert.equal(verified.note, 'P2 审核通过');
});
