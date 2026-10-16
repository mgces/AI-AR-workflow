import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import { reviewBundleDigest, verifyReviewIntent } from '../src/cloud-review-intent.js';

const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);

function signedIntent(bundle, privateKey, keyId = 'cloud-key-1') {
  const unsigned = {
    intent_id: 'intent-1', type: 'review.decision.available', device_id: 'device-1',
    bundle_id: bundle.bundle_id, run_id: bundle.run_id, phase: bundle.phase,
    run_revision: bundle.run_revision, bundle_digest: bundle.bundle_digest,
    decision: 'approved', note: 'reviewed', actor_id: 'reviewer-1', nonce: 'n'.repeat(32),
    created_at: new Date().toISOString(), key_id: keyId,
  };
  const digest = createHash('sha256').update(canonical(unsigned)).digest();
  return { ...unsigned, signature: sign(null, digest, privateKey).toString('base64url') };
}

test('verifies signed cloud review intent against pinned key, local artifact digest, device and current run revision', () => {
  const keys = generateKeyPairSync('ed25519');
  const bundle = {
    bundle_id: 'bundle-1', run_id: 'run-1', phase: 'P2', run_revision: 7,
    artifact_shas: ['a'.repeat(64), 'b'.repeat(64)],
  };
  bundle.bundle_digest = reviewBundleDigest(bundle);
  const intent = signedIntent(bundle, keys.privateKey);
  assert.deepEqual(verifyReviewIntent({
    intent,
    signingKey: { key_id: 'cloud-key-1', public_key: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString() },
    bundle,
    deviceId: 'device-1',
    currentRunRevision: 7,
  }), intent);
});

test('rejects modified signatures, changed artifact bundle, foreign device and stale local revision', () => {
  const keys = generateKeyPairSync('ed25519');
  const bundle = { bundle_id: 'bundle-1', run_id: 'run-1', phase: 'P2', run_revision: 7, artifact_shas: ['a'.repeat(64)] };
  bundle.bundle_digest = reviewBundleDigest(bundle);
  const intent = signedIntent(bundle, keys.privateKey);
  const options = {
    signingKey: { key_id: 'cloud-key-1', public_key: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString() },
    bundle, deviceId: 'device-1', currentRunRevision: 7,
  };
  assert.throws(() => verifyReviewIntent({ ...options, intent: { ...intent, note: 'tampered' } }), { code: 'review_intent_signature_invalid' });
  assert.throws(() => verifyReviewIntent({ ...options, intent, deviceId: 'device-2' }), { code: 'review_intent_scope_invalid' });
  assert.throws(() => verifyReviewIntent({ ...options, intent, currentRunRevision: 8 }), { code: 'review_intent_stale' });
  const receipt = {
    intent_id: intent.intent_id, device_id: intent.device_id, bundle_id: intent.bundle_id,
    run_id: intent.run_id, phase: intent.phase, bundle_digest: intent.bundle_digest,
    run_revision: intent.run_revision, decision: intent.decision, nonce: intent.nonce,
    actor_id: intent.actor_id, status: 'applied', reason_code: null,
  };
  assert.deepEqual(verifyReviewIntent({ ...options, intent, currentRunRevision: 8, receipt }), intent);
  assert.throws(() => verifyReviewIntent({ ...options, intent, currentRunRevision: 8,
    receipt: { ...receipt, intent_id: 'another-intent' } }), { code: 'review_intent_stale' });
  assert.throws(() => verifyReviewIntent({ ...options, intent, bundle: { ...bundle, artifact_shas: ['c'.repeat(64)] } }), { code: 'review_intent_bundle_invalid' });
});
