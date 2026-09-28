import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const path = new URL('../dist/analytics.mjs', import.meta.url);
const analytics = existsSync(path) ? await import(path) : {};
test('null durations are not counted as zero samples', () => {
  assert.equal(typeof analytics.summarize, 'function');
  const result = analytics.summarize([{effective_seconds: 100}, {effective_seconds: null}, {effective_seconds: 0}]);
  assert.equal(result.average, 50);
  assert.equal(result.durationSamples, 2);
});
test('failure rate uses gate attempts including recovered runs', () => {
  assert.equal(typeof analytics.summarize, 'function');
  const result = analytics.summarize([{failures: 2, gate_attempts: 5}, {failures: 0, gate_attempts: 5}, {failures: null}]);
  assert.equal(result.failureRate, 20);
  assert.equal(result.failures, 2);
});
test('empty results have no fabricated rates', () => {
  assert.equal(typeof analytics.summarize, 'function');
  assert.equal(analytics.summarize([]).failureRate, null);
  assert.equal(analytics.summarize([]).average, null);
});
test('filters combine search model workflow and status', () => {
  assert.equal(typeof analytics.filterRuns, 'function');
  const runs = [{id: 'Hiperf', model: 'm1', kind: 'AR', status: 'blocked'}, {id:'other', model:'m2',kind:'AR',status:'running'}];
  assert.deepEqual(analytics.filterRuns(runs, {query:'hip',model:'m1',kind:'AR',status:'blocked'}), [runs[0]]);
});
test('phase rollup preserves unknown times and separates R and P stages', () => {
  assert.equal(typeof analytics.phaseTotals, 'function');
  const result = analytics.phaseTotals([{phases:[{id:'P1',effective_seconds:10,wait_seconds:5}]}, {phases:[{id:'P1',effective_seconds:20,wait_seconds:0},{id:'R1',effective_seconds:null}]}]);
  assert.equal(result[0].effective_seconds, 30);
  assert.equal(result[0].wait_seconds, 5);
  assert.equal(result[1].effective_seconds, null);
});
