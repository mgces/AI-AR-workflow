import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createCloudReviewUploader } from '../src/cloud-review-upload.js';
import { reviewBundleDigest } from '../src/cloud-review-intent.js';

test('uploads only explicitly selected artifacts, verifies bytes and seals a revision-bound review bundle', async () => {
  const bytes = Buffer.from('# P2 implementation summary\n', 'utf8');
  const digest = createHash('sha256').update(bytes).digest('hex');
  const calls = [];
  let storedBundle;
  const uploader = createCloudReviewUploader({
    async getCredentials() { return { cloud_url: 'https://cloud.example', device_id: 'device-1', access_token: 'device-token' }; },
    async syncEvents() { calls.push(['sync']); return { status: 'connected' }; },
    async apiRequest(method, path) {
      calls.push(['local', method, path]);
      if (path === '/api/ar/runs/run-1') return { run_id: 'run-1', revision: 9 };
      if (path === '/api/ar/runs/run-1/artifacts') return { artifacts: [{ relative_path: 'reports/summary.md', filename: 'summary.md', binary: false, content_available: true }] };
      if (path.includes('/artifacts/content?')) return { content: bytes.toString('utf8'), relative_path: 'reports/summary.md' };
      throw new Error(`unexpected local API ${path}`);
    },
    async cloudJson(method, path, body, token) {
      calls.push(['cloud', method, path, body, token]);
      if (path === '/v1/artifacts/manifests') return { artifact_id: 'artifact-1', sha256: digest };
      if (path === '/v1/artifacts/artifact-1/uploads') return { upload_id: 'upload-1', upload_token: 'once-token' };
      if (path === '/v1/runs/run-1/review-bundles') return { bundle_id: 'bundle-1', bundle_digest: reviewBundleDigest({ run_id: 'run-1', phase: 'P2', run_revision: 9, artifact_shas: [digest] }), run_revision: 9 };
      throw new Error(`unexpected cloud API ${path}`);
    },
    async cloudBinary(path, token, content) {
      calls.push(['binary', path, token, Buffer.from(content).toString('hex')]);
      return { status: 'available' };
    },
    async saveBundle(value) { storedBundle = value; },
  });

  const result = await uploader.upload({ run_id: 'run-1', phase: 'P2', artifact_paths: ['reports/summary.md'] });
  assert.equal(result.bundle_id, 'bundle-1');
  assert.equal(result.run_revision, 9);
  assert.equal(storedBundle.artifact_shas[0], digest);
  assert.equal(storedBundle.bundle_digest, reviewBundleDigest({ run_id: 'run-1', phase: 'P2', run_revision: 9, artifact_shas: [digest] }));
  const manifest = calls.find((call) => call[1] === 'POST' && call[2] === '/v1/artifacts/manifests');
  assert.equal(manifest[3].name, 'summary.md');
  assert.equal(manifest[3].data_policy, 'review_bundle');
  assert.equal(manifest[3].classification, 'internal');
  assert.equal(Object.hasOwn(manifest[3], 'path'), false);
  assert.ok(calls.some((call) => call[0] === 'binary' && call[2] === 'once-token'));
});

test('refuses implicit uploads, path traversal, unsupported files and cloud sync that is still offline', async () => {
  const base = {
    async getCredentials() { return { cloud_url: 'https://cloud.example', device_id: 'device-1', access_token: 'device-token' }; },
    async syncEvents() { return { status: 'connected' }; },
    async apiRequest(method, path) {
      if (path === '/api/ar/runs/run-1') return { run_id: 'run-1', revision: 1 };
      if (path === '/api/ar/runs/run-1/artifacts') return { artifacts: [{ relative_path: 'reports/a.exe', filename: 'a.exe', binary: true }] };
      return { content_base64: 'AA==' };
    },
    async cloudJson() { throw new Error('must not upload'); },
    async cloudBinary() { throw new Error('must not upload'); },
    async saveBundle() {},
  };
  const uploader = createCloudReviewUploader(base);
  await assert.rejects(() => uploader.upload({ run_id: 'run-1', phase: 'P2', artifact_paths: [] }), { code: 'review_artifact_selection_required' });
  await assert.rejects(() => uploader.upload({ run_id: 'run-1', phase: 'P2', artifact_paths: ['../secret'] }), { code: 'review_artifact_path_invalid' });
  await assert.rejects(() => uploader.upload({ run_id: 'run-1', phase: 'P2', artifact_paths: ['reports/a.exe'] }), { code: 'review_artifact_type_forbidden' });
  const offline = createCloudReviewUploader({ ...base, async syncEvents() { return { status: 'offline' }; } });
  await assert.rejects(() => offline.upload({ run_id: 'run-1', phase: 'P2', artifact_paths: ['reports/a.exe'] }), { code: 'cloud_sync_required' });
});
