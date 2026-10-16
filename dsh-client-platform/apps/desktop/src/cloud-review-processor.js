const RESULT_STATUSES = new Set(['applied', 'rejected', 'stale']);

export function localReviewPhaseForBundle(phase) {
  if (!/^P[0-8]$/u.test(String(phase))) {
    throw Object.assign(new Error('cloud review phase is invalid'), { code: 'review_phase_invalid' });
  }
  return phase === 'P8' ? 'P8-precheck' : phase;
}

function receiptFor(intent, result) {
  if (!result || !RESULT_STATUSES.has(result.status)
      || (result.reason_code !== null && result.reason_code !== undefined
        && (typeof result.reason_code !== 'string' || result.reason_code.length > 128))) {
    throw Object.assign(new Error('local review action returned an invalid result'), {
      code: 'review_result_invalid',
    });
  }
  return {
    intent_id: intent.intent_id,
    device_id: intent.device_id,
    bundle_id: intent.bundle_id,
    run_id: intent.run_id,
    phase: intent.phase,
    bundle_digest: intent.bundle_digest,
    run_revision: intent.run_revision,
    decision: intent.decision,
    nonce: intent.nonce,
    actor_id: intent.actor_id,
    status: result.status,
    reason_code: result.reason_code ?? null,
    recorded_at: new Date().toISOString(),
  };
}

function assertReceiptMatches(receipt, intent) {
  if (!receipt || receipt.intent_id !== intent.intent_id
      || receipt.device_id !== intent.device_id || receipt.bundle_id !== intent.bundle_id
      || receipt.run_id !== intent.run_id || receipt.phase !== intent.phase
      || receipt.bundle_digest !== intent.bundle_digest || receipt.run_revision !== intent.run_revision
      || receipt.decision !== intent.decision || receipt.nonce !== intent.nonce
      || receipt.actor_id !== intent.actor_id || !RESULT_STATUSES.has(receipt.status)
      || (receipt.reason_code !== null && receipt.reason_code !== undefined
        && typeof receipt.reason_code !== 'string')) {
    throw Object.assign(new Error('stored local review receipt does not match the signed intent'), {
      code: 'review_receipt_mismatch',
    });
  }
}

/**
 * Apply a signed review once and persist its result before attempting the
 * remote acknowledgement. A later sync can replay only the acknowledgement.
 */
export async function processCloudReviewIntent({
  intent, signingKey, bundle, deviceId, currentRunRevision,
  getReceipt, verify, applyDecision, saveReceipt, acknowledge,
} = {}) {
  for (const [name, value] of Object.entries({ getReceipt, verify, applyDecision, saveReceipt, acknowledge })) {
    if (typeof value !== 'function') throw new TypeError(`${name} must be a function`);
  }
  const previous = await getReceipt(intent?.intent_id);
  if (previous) assertReceiptMatches(previous, intent);
  const verified = await verify({
    intent, signingKey, bundle, deviceId, currentRunRevision,
    ...(previous ? { receipt: previous } : {}),
  });
  const receipt = previous ?? receiptFor(verified, await applyDecision(verified));
  if (!previous) await saveReceipt(receipt);
  await acknowledge(receipt);
  return { verified, receipt, replayed: Boolean(previous) };
}
