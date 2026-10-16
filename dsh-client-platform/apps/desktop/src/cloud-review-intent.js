import { createHash, createPublicKey, verify } from 'node:crypto';

function invalid(code, message) {
  throw Object.assign(new Error(message), { code });
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function reviewBundleDigest({ run_id: runId, phase, run_revision: runRevision, artifact_shas: artifactShas } = {}) {
  if (typeof runId !== 'string' || !runId || !/^P[0-8]$/u.test(String(phase))
      || !Number.isSafeInteger(runRevision) || runRevision < 1
      || !Array.isArray(artifactShas) || artifactShas.length < 1
      || artifactShas.some((value) => typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value))) {
    invalid('review_intent_bundle_invalid', 'local review bundle metadata is incomplete');
  }
  const artifactRefs = artifactShas.map((sha) => `artifact:sha256:${sha}`).sort();
  return createHash('sha256').update(canonicalJson({
    run_id: runId, phase, run_revision: runRevision, artifact_refs: artifactRefs,
  })).digest('hex');
}

export function verifyReviewIntent({ intent, signingKey, bundle, deviceId, currentRunRevision, receipt = null } = {}) {
  if (!intent || typeof intent !== 'object' || Array.isArray(intent)
      || typeof signingKey?.key_id !== 'string' || typeof signingKey?.public_key !== 'string') {
    invalid('review_intent_invalid', 'cloud review intent or signing key is incomplete');
  }
  const { signature, ...unsigned } = intent;
  if (intent.type !== 'review.decision.available' || intent.key_id !== signingKey.key_id
      || typeof signature !== 'string' || signature.length > 512) {
    invalid('review_intent_signature_invalid', 'cloud review intent key or signature metadata does not match');
  }
  let trustedKey;
  try { trustedKey = createPublicKey(signingKey.public_key); } catch {
    invalid('review_intent_signature_invalid', 'cloud review signing key is not a valid public key');
  }
  const digest = createHash('sha256').update(canonicalJson(unsigned)).digest();
  let valid = false;
  try { valid = verify(null, digest, trustedKey, Buffer.from(signature, 'base64url')); } catch { valid = false; }
  if (!valid) invalid('review_intent_signature_invalid', 'cloud review intent signature verification failed');
  if (intent.device_id !== deviceId || intent.bundle_id !== bundle?.bundle_id
      || intent.run_id !== bundle?.run_id || intent.phase !== bundle?.phase) {
    invalid('review_intent_scope_invalid', 'cloud review intent is outside this device or local review bundle');
  }
  let localDigest;
  try { localDigest = reviewBundleDigest(bundle); } catch {
    invalid('review_intent_bundle_invalid', 'local review bundle cannot be verified');
  }
  if (intent.bundle_digest !== bundle.bundle_digest || intent.bundle_digest !== localDigest
      || intent.run_revision !== bundle.run_revision) {
    invalid('review_intent_bundle_invalid', 'cloud review digest does not match the locally selected artifacts');
  }
  const receiptMatches = receipt && receipt.intent_id === intent.intent_id
    && receipt.device_id === intent.device_id && receipt.bundle_id === intent.bundle_id
    && receipt.run_id === intent.run_id && receipt.phase === intent.phase
    && receipt.bundle_digest === intent.bundle_digest && receipt.run_revision === intent.run_revision
    && receipt.decision === intent.decision && receipt.nonce === intent.nonce
    && receipt.actor_id === intent.actor_id
    && ['applied', 'rejected', 'stale'].includes(receipt.status);
  if (!Number.isSafeInteger(currentRunRevision)
      || (currentRunRevision !== intent.run_revision && !receiptMatches)) {
    invalid('review_intent_stale', 'local run changed after the review bundle was submitted');
  }
  if (!['approved', 'rejected', 'returned'].includes(intent.decision)
      || typeof intent.nonce !== 'string' || intent.nonce.length < 16
      || typeof intent.actor_id !== 'string' || typeof intent.created_at !== 'string') {
    invalid('review_intent_invalid', 'cloud review decision fields are invalid');
  }
  return structuredClone(intent);
}
