import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createCloudReviewReceiptStore } from '../src/cloud-review-receipts.js';

test('review receipt survives a client restart and refuses a conflicting replay', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-review-receipts-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const first = createCloudReviewReceiptStore({ directory: root });
  const receipt = {
    intent_id: 'intent-1', device_id: 'device-1', bundle_id: 'bundle-1', run_id: 'run-1',
    phase: 'P1', bundle_digest: 'a'.repeat(64), run_revision: 4, decision: 'approved',
    nonce: 'nonce-1', actor_id: 'reviewer-1', status: 'applied', reason_code: null,
  };
  await first.save(receipt);
  const restarted = createCloudReviewReceiptStore({ directory: root });
  assert.deepEqual(await restarted.get('intent-1'), receipt);
  await assert.rejects(restarted.save({ ...receipt, status: 'rejected' }), { code: 'review_receipt_conflict' });
  assert.throws(() => restarted.pathFor('../escape'), { code: 'review_receipt_id_invalid' });
});
