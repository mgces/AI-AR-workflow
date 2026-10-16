import assert from 'node:assert/strict';
import test from 'node:test';
import { localReviewPhaseForBundle, processCloudReviewIntent } from '../src/cloud-review-processor.js';

test('retries cloud acknowledgement from a durable receipt without replaying a local action', async () => {
  let receipt = null;
  let applyCount = 0;
  let acknowledgeCount = 0;
  const verificationReceipts = [];
  const intent = {
    intent_id: 'intent-1', device_id: 'device-1', bundle_id: 'bundle-1',
    run_id: 'run-1', phase: 'P1', bundle_digest: 'a'.repeat(64),
    run_revision: 4, decision: 'approved', nonce: 'nonce-1', actor_id: 'reviewer-1',
  };
  const common = {
    intent,
    signingKey: { key_id: 'key-1' },
    bundle: { bundle_id: 'bundle-1' },
    deviceId: 'device-1',
    currentRunRevision: 4,
    getReceipt: async () => receipt,
    verify: async ({ intent: verifiedIntent, receipt: priorReceipt }) => {
      verificationReceipts.push(priorReceipt ?? null);
      return verifiedIntent;
    },
    applyDecision: async () => {
      applyCount += 1;
      return { status: 'applied', reason_code: null };
    },
    saveReceipt: async (next) => { receipt = next; },
    acknowledge: async (next) => {
      acknowledgeCount += 1;
      assert.equal(next.status, 'applied');
      if (acknowledgeCount === 1) throw new Error('cloud temporarily offline');
    },
  };

  await assert.rejects(processCloudReviewIntent(common), /cloud temporarily offline/u);
  assert.equal(applyCount, 1);
  assert.equal(receipt.intent_id, 'intent-1');

  const retried = await processCloudReviewIntent({ ...common, currentRunRevision: 9 });
  assert.equal(retried.replayed, true);
  assert.equal(applyCount, 1);
  assert.equal(acknowledgeCount, 2);
  assert.equal(verificationReceipts[0], null);
  assert.equal(verificationReceipts[1], receipt);
});

test('does not persist a receipt when the local action fails', async () => {
  let saved = false;
  await assert.rejects(processCloudReviewIntent({
    intent: {
      intent_id: 'intent-2', device_id: 'device-1', bundle_id: 'bundle-1',
      run_id: 'run-1', phase: 'P1', bundle_digest: 'b'.repeat(64),
      run_revision: 1, decision: 'approved', nonce: 'nonce-2', actor_id: 'reviewer-1',
    }, signingKey: {}, bundle: { bundle_id: 'bundle-1' }, deviceId: 'device-1',
    currentRunRevision: 1, getReceipt: async () => null,
    verify: async () => ({}),
    applyDecision: async () => { throw new Error('local action failed'); },
    saveReceipt: async () => { saved = true; }, acknowledge: async () => {},
  }), /local action failed/u);
  assert.equal(saved, false);
});

test('maps cloud P8 review bundles to the local P8-precheck consent task', () => {
  assert.equal(localReviewPhaseForBundle('P8'), 'P8-precheck');
  assert.equal(localReviewPhaseForBundle('P7'), 'P7');
  assert.throws(() => localReviewPhaseForBundle('P9'), /phase/u);
});
