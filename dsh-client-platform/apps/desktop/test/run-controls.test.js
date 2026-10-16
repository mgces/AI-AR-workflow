import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunControls } from '../src/run-controls.js';

test('run controls expose status, artifact, human intervention and lifecycle operations through Local Core', async () => {
  const calls = [];
  const controls = createRunControls(async (...args) => { calls.push(args); return { ok: true }; });

  await controls.detail('run-one');
  await controls.artifacts('run-one');
  await controls.artifactContent('run-one', 'reports/AR_design.md');
  await controls.recordInput('run-one', { content: 'review note', kind: 'review' });
  await controls.consent('run-one', { task_id: 'p1', phase: 1, token: 'reviewer token', content: 'approved' });
  await controls.reviewDecision('run-one', { task_id: 'p1', phase: 'P1', decision: 'returned',
    actor: 'reviewer', note: '补充说明', idempotency_key: 'intent-1' });
  await controls.cancel('run-one', 'stop');
  await controls.resume('run-one');

  assert.deepEqual(calls, [
    ['GET', '/api/ar/runs/run-one'],
    ['GET', '/api/ar/runs/run-one/artifacts'],
    ['GET', '/api/ar/runs/run-one/artifacts/content?path=reports%2FAR_design.md'],
    ['POST', '/api/ar/runs/run-one/inputs', { content: 'review note', kind: 'review' }],
    ['POST', '/api/ar/runs/run-one/consent', { task_id: 'p1', phase: 1, token: 'reviewer token', content: 'approved' }],
    ['POST', '/api/ar/runs/run-one/review', { task_id: 'p1', phase: 'P1', decision: 'returned',
      actor: 'reviewer', note: '补充说明', idempotency_key: 'intent-1' }],
    ['POST', '/api/ar/runs/run-one/cancel', { reason: 'stop' }],
    ['POST', '/api/ar/runs/run-one/resume', {}],
  ]);
});

test('run controls reject malformed paths and payloads before sending requests', async () => {
  let requests = 0;
  const controls = createRunControls(async () => { requests += 1; });
  assert.throws(() => controls.artifactContent('../secret', 'reports/a.md'), { code: 'run_id_invalid' });
  assert.throws(() => controls.artifactContent('run-1', '../secret'), { code: 'artifact_path_invalid' });
  assert.throws(() => controls.recordInput('run-1', { content: '  ' }), { code: 'human_input_required' });
  assert.throws(() => controls.consent('run-1', { task_id: 'p1', phase: 1, token: ' ' }), { code: 'consent_token_required' });
  assert.throws(() => controls.reviewDecision('run-1', { task_id: 'p1', phase: 'P1', decision: 'approved', actor: 'reviewer', idempotency_key: 'intent-1' }), { code: 'review_decision_invalid' });
  assert.equal(requests, 0);
});
