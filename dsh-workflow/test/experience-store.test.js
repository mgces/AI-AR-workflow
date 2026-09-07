import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { ExperienceStore } from '../src/core/experience-store.js';

test('evolution output stays staging and requires a sample floor', async () => {
  const stateDir = await mkdtemp('/tmp/ai-ar-exp-');
  const store = new ExperienceStore({ stateDir });
  for (let index = 0; index < 3; index += 1) {
    await store.record({
      workflow: 'development',
      phase: 'P4',
      gate: 'gate_build.py',
      result: index === 0 ? 'fail' : 'pass',
      failureClass: index === 0 ? 'compile_error' : null,
      moduleIds: ['ohos-dev-build-execution-diagnosis'],
    });
  }
  const output = await store.proposals({ minSamples: 2 });
  assert.ok(output.proposals.length >= 1);
  assert.ok(output.proposals.every((item) => item.status === 'staging'));
  assert.ok(output.proposals.every((item) => item.promotionPolicy.includes('human approval')));
});
