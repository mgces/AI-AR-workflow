import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeliveryRuntimeTools } from '../src/dsh/delivery-runtime.js';

test('DSH delivery tools preserve the authoritative runtime input and observability projection', async () => {
  const calls = [];
  const service = {
    async start(input) { calls.push(['start', input]); return { run_id: input.runId, status: 'awaiting_host' }; },
    async status(runId) { calls.push(['status', runId]); return { run_id: runId, observability: { stage_count: 10 } }; },
  };
  const definitions = createDeliveryRuntimeTools({ service });
  const start = definitions.find((item) => item.name === 'ohos_delivery_start');
  const observability = definitions.find((item) => item.name === 'ohos_run_observability');
  assert.ok(start);
  assert.deepEqual(await start.execute({
    input_ref: 'inline://ar', idempotency_key: 'idempotent', ar_text: '# AR',
    repo_root: '/workspace', environment: 'openharmony', component_type: 'system',
  }), { run_id: undefined, status: 'awaiting_host' });
  assert.deepEqual(calls[0], ['start', {
    runId: undefined, inputRef: 'inline://ar', arText: '# AR', arPath: undefined,
    pipelineDir: undefined, repoRoot: '/workspace', environment: 'openharmony',
    componentType: 'system', deviceType: undefined, deviceSerial: undefined,
    gitDir: undefined, buildTarget: undefined, part: undefined, baseCommit: undefined,
    agent: undefined, model: undefined, confirmDefaults: undefined, skills: undefined,
    idempotencyKey: 'idempotent',
  }]);
  assert.deepEqual(await observability.execute({ run_id: 'ar-1' }), { stage_count: 10 });
  assert.deepEqual(calls[1], ['status', 'ar-1']);
});
