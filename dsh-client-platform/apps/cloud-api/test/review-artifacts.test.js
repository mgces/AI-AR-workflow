import assert from 'node:assert/strict';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { afterCloseAndRemove } from '../../../test/test-cleanup.js';

const { createCloudApiServer } = await import('../src/server.js');

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

function json(response) { return response.json(); }

test('cloud intent signing identity remains stable across service restarts', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-cloud-intent-key-'));
  const options = { databasePath: join(dir, 'cloud.sqlite3'), artifactRoot: join(dir, 'objects') };
  const first = createCloudApiServer(options);
  const before = first.cloudStore.signingsPublicKey();
  first.cloudStore.close();
  const second = createCloudApiServer(options);
  afterCloseAndRemove(t, () => second.cloudStore.close(), dir);
  assert.deepEqual(second.cloudStore.signingsPublicKey(), before);
});

async function fixture(t, { user = 'alice' } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-cloud-review-'));
  const server = createCloudApiServer({
    databasePath: join(dir, 'cloud.sqlite3'),
    artifactRoot: join(dir, 'objects'),
    authenticateUser: async (request) => ({
      tenant_id: 'tenant-1', user_id: request.headers['x-user'] ?? user,
      workspace_ids: request.headers['x-user'] === 'bob' ? ['workspace-2'] : ['workspace-1'],
    }),
    authenticateDevice: async (request, { device_id: deviceId }) => request.headers.authorization === 'Bearer device-token'
      ? { tenant_id: 'tenant-1', device_id: deviceId ?? 'device-1', workspace_id: 'workspace-1', key_id: 'key-1' }
      : null,
  });
  afterCloseAndRemove(t, () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())), dir);
  const origin = await listen(server);
  const request = (path, options = {}) => fetch(`${origin}${path}`, options);
  const headers = { authorization: 'Bearer device-token', 'content-type': 'application/json' };
  const now = new Date().toISOString();
  server.cloudStore.db.prepare(`INSERT INTO run_projection(
    tenant_id, device_id, workspace_id, run_id, workflow_id, status, current_phase,
    revision, last_client_seq, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run('tenant-1', 'device-1', 'workspace-1', 'run-1', 'ar-delivery', 'awaiting_review', 'P2', 1, 1, now, now);
  return { request, headers, server };
}

async function createManifest(request, headers, bytes, extra = {}) {
  return request('/v1/artifacts/manifests', {
    method: 'POST', headers,
    body: JSON.stringify({
      run_id: 'run-1', phase: 'P2', name: 'implementation-summary.txt',
      sha256: createHash('sha256').update(bytes).digest('hex'), size_bytes: bytes.length,
      content_type: 'text/plain', classification: 'internal', data_policy: 'review_bundle',
      ...extra,
    }),
  });
}

test('review artifacts accept bounded content, verify its digest, and only expose it to authorized workspace users', async (t) => {
  const { request, headers } = await fixture(t);
  const bytes = Buffer.from('approved implementation summary\n', 'utf8');
  const manifestResponse = await createManifest(request, headers, bytes);
  assert.equal(manifestResponse.status, 201);
  const manifest = await json(manifestResponse);
  assert.equal(manifest.status, 'awaiting_upload');
  assert.equal(manifest.size_bytes, bytes.length);

  const uploadResponse = await request(`/v1/artifacts/${manifest.artifact_id}/uploads`, { method: 'POST', headers });
  assert.equal(uploadResponse.status, 201);
  const upload = await json(uploadResponse);
  const wrongArtifactPath = await request(`/v1/artifacts/00000000-0000-4000-8000-000000000000/uploads/${upload.upload_id}`, {
    method: 'PUT', headers: { authorization: `Bearer ${upload.upload_token}` }, body: bytes,
  });
  assert.equal(wrongArtifactPath.status, 401);
  const stored = await request(`/v1/artifacts/${manifest.artifact_id}/uploads/${upload.upload_id}`, {
    method: 'PUT', headers: { authorization: `Bearer ${upload.upload_token}`, 'content-type': 'application/octet-stream' }, body: bytes,
  });
  assert.equal(stored.status, 200);
  assert.equal((await json(stored)).status, 'available');
  const replay = await request(`/v1/artifacts/${manifest.artifact_id}/uploads/${upload.upload_id}`, {
    method: 'PUT', headers: { authorization: `Bearer ${upload.upload_token}` }, body: bytes,
  });
  assert.equal(replay.status, 401);

  const metadata = await request(`/v1/artifacts/${manifest.artifact_id}`);
  assert.equal(metadata.status, 200, await metadata.clone().text());
  assert.equal((await json(metadata)).sha256, manifest.sha256);
  const denied = await request(`/v1/artifacts/${manifest.artifact_id}`, { headers: { 'x-user': 'bob' } });
  assert.equal(denied.status, 404);
  const deniedBytes = await request(`/v1/artifacts/${manifest.artifact_id}/content`, { headers: { 'x-user': 'bob' } });
  assert.equal(deniedBytes.status, 404);
  const content = await request(`/v1/artifacts/${manifest.artifact_id}/content`);
  assert.equal(content.status, 200);
  assert.equal(content.headers.get('content-type'), 'application/octet-stream');
  assert.equal(content.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(Buffer.from(await content.arrayBuffer()).toString('utf8'), bytes.toString('utf8'));
});

test('artifact manifests reject arbitrary paths, implicit data upload, and mismatched payloads', async (t) => {
  const { request, headers } = await fixture(t);
  const bytes = Buffer.from('review only');
  const unauthenticated = await createManifest(request, { 'content-type': 'application/json' }, bytes);
  assert.equal(unauthenticated.status, 401);
  const pathAttempt = await createManifest(request, headers, bytes, { path: 'C:\\private\\source' });
  assert.equal(pathAttempt.status, 400);
  const policyAttempt = await createManifest(request, headers, bytes, { data_policy: 'metrics_only' });
  assert.equal(policyAttempt.status, 400);
  const disallowedType = await createManifest(request, headers, bytes, { content_type: 'text/html' });
  assert.equal(disallowedType.status, 400);

  const manifest = await json(await createManifest(request, headers, bytes));
  const upload = await json(await request(`/v1/artifacts/${manifest.artifact_id}/uploads`, { method: 'POST', headers }));
  const wrongBytes = Buffer.from('unapproved body');
  const mismatch = await request(`/v1/artifacts/${manifest.artifact_id}/uploads/${upload.upload_id}`, {
    method: 'PUT', headers: { authorization: `Bearer ${upload.upload_token}` }, body: wrongBytes,
  });
  assert.equal(mismatch.status, 400);
  assert.equal((await json(mismatch)).error.code, 'artifact_integrity_mismatch');
  const content = await request(`/v1/artifacts/${manifest.artifact_id}/content`);
  assert.equal(content.status, 404);
});

test('web review decisions bind the current bundle digest and are delivered only to its paired device', async (t) => {
  const { request, headers, server } = await fixture(t);
  const bytes = Buffer.from('reviewed evidence');
  const manifest = await json(await createManifest(request, headers, bytes));
  const upload = await json(await request(`/v1/artifacts/${manifest.artifact_id}/uploads`, { method: 'POST', headers }));
  assert.equal((await request(`/v1/artifacts/${manifest.artifact_id}/uploads/${upload.upload_id}`, {
    method: 'PUT', headers: { authorization: `Bearer ${upload.upload_token}` }, body: bytes,
  })).status, 200);

  const bundleResponse = await request('/v1/runs/run-1/review-bundles', {
    method: 'POST', headers,
    body: JSON.stringify({ phase: 'P2', run_revision: 1, artifact_ids: [manifest.artifact_id] }),
  });
  assert.equal(bundleResponse.status, 201);
  const bundle = await json(bundleResponse);
  assert.match(bundle.bundle_digest, /^[a-f0-9]{64}$/u);

  const pending = await request('/v1/reviews/pending');
  assert.equal(pending.status, 200, await pending.clone().text());
  assert.equal((await json(pending)).reviews.length, 1);
  const hidden = await request('/v1/reviews/pending', { headers: { 'x-user': 'bob' } });
  assert.equal((await json(hidden)).reviews.length, 0);

  const decisionResponse = await request(`/v1/review-bundles/${bundle.bundle_id}/decisions`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision: 'approved', note: '通过 P2 设计审核' }),
  });
  assert.equal(decisionResponse.status, 201);
  const decision = await json(decisionResponse);
  assert.equal(decision.bundle_digest, bundle.bundle_digest);
  assert.equal(decision.actor_id, 'alice');
  assert.ok(decision.nonce);

  const intents = await request('/v1/devices/device-1/intents', { headers: { authorization: 'Bearer device-token' } });
  assert.equal(intents.status, 200);
  const intentPayload = await json(intents);
  assert.equal(intentPayload.intents.length, 1);
  assert.equal(intentPayload.intents[0].type, 'review.decision.available');
  assert.equal(intentPayload.intents[0].decision, 'approved');
  assert.equal(intentPayload.intents[0].bundle_digest, bundle.bundle_digest);
  assert.equal(intentPayload.intents[0].note, '通过 P2 设计审核');
  assert.equal(typeof intentPayload.intents[0].signature, 'string');
  const signedIntent = intentPayload.intents[0];
  const { signature, ...unsignedIntent } = signedIntent;
  const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
      : JSON.stringify(value);
  const key = server.cloudStore.signingsPublicKey();
  assert.equal(signedIntent.key_id, key.key_id);
  assert.equal(verify(null, createHash('sha256').update(canonical(unsignedIntent)).digest(),
    createPublicKey(key.public_key), Buffer.from(signature, 'base64url')), true);
  assert.deepEqual(Object.keys(intentPayload.intents[0]).sort(), [
    'actor_id', 'bundle_digest', 'bundle_id', 'created_at', 'decision', 'device_id', 'intent_id',
    'key_id', 'nonce', 'note', 'phase', 'run_id', 'run_revision', 'signature', 'type',
  ].sort());

  const secondDecision = await request(`/v1/review-bundles/${bundle.bundle_id}/decisions`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'rejected' }),
  });
  assert.equal(secondDecision.status, 409);

  const runDetail = await request('/v1/runs/run-1');
  assert.equal(runDetail.status, 200);
  const runPayload = await json(runDetail);
  assert.equal(runPayload.artifacts.length, 1);
  assert.equal(runPayload.reviews[0].decision, 'approved');

  const resolved = await request(`/v1/intents/${signedIntent.intent_id}/result`, {
    method: 'POST', headers,
    body: JSON.stringify({ device_id: 'device-1', status: 'applied' }),
  });
  assert.equal(resolved.status, 200);
  const resolvedPayload = await json(resolved);
  assert.equal(resolvedPayload.status, 'applied');
  const replay = await request(`/v1/intents/${signedIntent.intent_id}/result`, {
    method: 'POST', headers,
    body: JSON.stringify({ device_id: 'device-1', status: 'applied' }),
  });
  assert.equal(replay.status, 200);
  assert.deepEqual(await json(replay), resolvedPayload);
  const conflictingReplay = await request(`/v1/intents/${signedIntent.intent_id}/result`, {
    method: 'POST', headers,
    body: JSON.stringify({ device_id: 'device-1', status: 'rejected', reason_code: 'changed_result' }),
  });
  assert.equal(conflictingReplay.status, 409);
  assert.equal((await json(await request('/v1/devices/device-1/intents', { headers: { authorization: 'Bearer device-token' } }))).intents.length, 0);

  const laterBundle = await request('/v1/runs/run-1/review-bundles', {
    method: 'POST', headers,
    body: JSON.stringify({ phase: 'P2', run_revision: 1, artifact_ids: [manifest.artifact_id] }),
  });
  assert.equal(laterBundle.status, 201);
  const later = await json(laterBundle);
  server.cloudStore.db.prepare('UPDATE run_projection SET revision = 2 WHERE run_id = ?').run('run-1');
  const staleDecision = await request(`/v1/review-bundles/${later.bundle_id}/decisions`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision: 'approved' }),
  });
  assert.equal(staleDecision.status, 409);
  assert.equal((await json(staleDecision)).error.code, 'review_bundle_stale');
});
