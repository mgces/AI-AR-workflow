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
test('first-pass rate uses recorded initial attempts and separates review holds', () => {
  const runs=[{first_gate_attempts:3,first_gate_passes:1,first_gate_failures:2,first_gate_review_holds:1},
    {first_gate_attempts:null,first_gate_passes:null,first_gate_failures:null},
    {first_gate_attempts:2,first_gate_passes:2,first_gate_failures:0,first_gate_review_holds:0}];
  const result=analytics.summarize(runs);
  assert.equal(result.firstPassRate,60);
  assert.equal(result.firstFailures,2);
  assert.equal(result.firstReviewHolds,1);
  assert.equal(analytics.summarize([{first_gate_attempts:null}]).firstPassRate,null);
});
test('phase failure drill-down keeps selected run and its matching details', () => {
  assert.equal(typeof analytics.phaseFailureRuns,'function');
  const runs=[
    {id:'a',phases:[{id:'P4',fail_attempts:3,gate_attempts:4}],failure_details:[{phase:'P4',count:3,reason:'compile error'},{phase:'P5',count:1,reason:'UT fail'}]},
    {id:'b',phases:[{id:'P4',fail_attempts:0,gate_attempts:1}],failure_details:[]},
    {id:'c',phases:[{id:'P4',fail_attempts:2,gate_attempts:2}],failure_details:[{phase:'P4',count:2,reason:'linker error'}]},
  ];
  const rows=analytics.phaseFailureRuns(runs,'P4');
  assert.deepEqual(rows.map(row=>row.run.id),['a','c']);
  assert.deepEqual(rows.map(row=>row.details[0].reason),['compile error','linker error']);
  assert.equal(rows[0].phase.fail_attempts,3);
});
test('blocked status explanation names the current phase, gate, recorded cause and snapshot time', () => {
  assert.equal(typeof analytics.runStatusExplanation,'function');
  const run={status:'blocked',current_phase:'P4',updated_at:'2026-09-29T02:00:00Z',
    phases:[{id:'P4',name:'build-verify',gate:'gate_build.py'}],failure_details:[
      {phase:'P4',gate:'older_gate.py',reason:'unrelated old failure'},
      {phase:'P4',gate:'gate_build.py',reason:'未记录具体失败原因'}]};
  const tip=analytics.runStatusExplanation(run,{P4:'编译验证'},value=>value);
  assert.match(tip,/P4 编译验证/);
  assert.match(tip,/gate_build.py/);
  assert.match(tip,/原因未记录/);
  assert.match(tip,/2026-09-29T02:00:00Z/);
  assert.doesNotMatch(tip,/unrelated old failure/);
  assert.match(tip,/非实时/);
});
test('blocked status explanation uses the exact gate reason and completed has no explanation', () => {
  assert.equal(typeof analytics.runStatusExplanation,'function');
  const run={status:'blocked',current_phase:'P5',phases:[{id:'P5',gate:'gate_test_ut.py'}],
    failure_details:[{phase:'P5',gate:'gate_test_ut.py',reason:'unit test assertion failed'}]};
  assert.match(analytics.runStatusExplanation(run,{P5:'单元测试'}),/unit test assertion failed/);
  assert.equal(analytics.runStatusExplanation({...run,status:'completed'}),'');
});
test('waiting status explanation shows the open wait rather than a historical failure', () => {
  const run={status:'waiting',current_phase:'P5',updated_at:'2026-09-29T02:00:00Z',
    phases:[{id:'P5',name:'unit-test'}],
    open_wait_details:[{phase:'P5',reason:'设备掉线，等待重连',started_at_utc:'2026-09-28T09:00:00Z'}],
    failure_details:[{phase:'P5',reason:'old test failure'}]};
  const tip=analytics.runStatusExplanation(run,{P5:'单元测试'},value=>value);
  assert.match(tip,/等待人工/);
  assert.match(tip,/P5 单元测试/);
  assert.match(tip,/设备掉线，等待重连/);
  assert.match(tip,/2026-09-28T09:00:00Z/);
  assert.match(tip,/2026-09-29T02:00:00Z/);
  assert.doesNotMatch(tip,/old test failure/);
});
test('running and pending explanations explain evidence limits', () => {
  const running={status:'running',current_phase:'P4',updated_at:'2026-09-29T02:00:00Z',
    phases:[{id:'P4',name:'build',gate:'gate_build.py'}]};
  const active=analytics.runStatusExplanation(running,{P4:'编译验证'},value=>value);
  assert.match(active,/进行中/);
  assert.match(active,/P4 编译验证/);
  assert.match(active,/gate_build.py/);
  assert.match(active,/无法判断.*仍在运行/);
  const pending=analytics.runStatusExplanation({status:'pending',current_phase:'—',updated_at:'2026-09-29T02:00:00Z',phases:[]},{},value=>value);
  assert.match(pending,/未开始/);
  assert.match(pending,/未记录已开始的阶段/);
  assert.match(pending,/2026-09-29T02:00:00Z/);
  assert.match(pending,/非实时/);
});
