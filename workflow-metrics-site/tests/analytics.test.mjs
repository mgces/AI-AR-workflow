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
test('total gate pass rate is weighted by attempts and excludes unmeasured runs', () => {
  const result=analytics.summarize([{failures:1,gate_attempts:1},{failures:0,gate_attempts:9},{failures:null,gate_attempts:15}]);
  assert.equal(result.passes,9);
  assert.equal(result.passRate,90);
  assert.equal(analytics.summarize([{failures:0,gate_attempts:0}]).passRate,null);
  assert.equal(analytics.summarize([{failures:2,gate_attempts:2}]).passRate,0);
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
test('blocked explanation uses the filled reason in its original failure detail', () => {
  const run={status:'blocked',current_phase:'P4',phases:[{id:'P4',gate:'gate_build.py'}],
    failure_details:[{phase:'P4',gate:'gate_build.py',
      reason:'会话记录的阶段级原因（无法逐次对应）：changed-line static check rejected helper'}]};
  const explanation=analytics.runStatusExplanation(run);
  assert.match(explanation,/changed-line static check rejected helper/);
  assert.match(explanation,/阶段级/);
});

test('derived operational view removes recognized holds without changing raw counts', () => {
  const run = analytics.deriveRunView({
    failures: 3, gate_attempts: 3, phases: [{id: 'P8', fail_attempts: 3, gate_attempts: 3}],
    failure_details: [
      {phase: 'P8', count: 1, failure_kind: 'expected_review_hold', gate: 'gate_upload_ci.py:consent-precheck'},
      {phase: 'P8', count: 2, failure_kind: 'gate_failure', gate: 'gate_upload_ci.py'},
    ],
  });
  assert.equal(run.failures, 3);
  assert.equal(run.gate_attempts, 3);
  assert.equal(run.review_hold_attempts, 1);
  assert.equal(run.operational_fail_attempts, 2);
  assert.equal(run.operational_gate_attempts, 2);
  assert.equal(run.review_hold_derivation, 'complete');
  const summary = analytics.summarize([run]);
  assert.equal(summary.rawFailures, 3);
  assert.equal(summary.rawAttempts, 3);
  assert.equal(summary.operationalFailures, 2);
  assert.equal(summary.operationalAttempts, 2);
  assert.equal(summary.reviewHolds, 1);
  assert.equal(summary.completeRuns, 1);
  assert.equal(summary.incompleteRuns, 0);
});

test('incomplete P8 details keep unknown holds in the operational failure count', () => {
  const run = analytics.deriveRunView({
    failures: 5, gate_attempts: 5, phases: [{id: 'P8', fail_attempts: 5, gate_attempts: 5}],
    failure_details: [{phase: 'P8', count: 5, reason: '未记录具体失败原因'}],
  });
  assert.equal(run.failures, 5);
  assert.equal(run.review_hold_attempts, 0);
  assert.equal(run.operational_fail_attempts, 5);
  assert.equal(run.review_hold_derivation, 'incomplete');
  assert.equal(run.unclassified_fail_attempts, 5);
});

test('unknown detail counts do not fabricate zero operational failures', () => {
  const derived = analytics.deriveAttribution(2, 2, [{count: null, reason: '仅最近结果'}]);
  assert.equal(derived.review_hold_derivation, 'unknown');
  assert.equal(derived.operational_fail_attempts, null);
  assert.equal(derived.operational_gate_attempts, null);
  assert.equal(derived.unclassified_fail_attempts, null);
});

test('explicit hold details override a stale persisted phase counter', () => {
  const run = analytics.deriveRunView({
    failures: 2, gate_attempts: 2,
    phases: [{id: 'P8', fail_attempts: 2, gate_attempts: 2, review_hold_attempts: 0}],
    failure_details: [
      {phase: 'P8', count: 1, failure_kind: 'expected_review_hold', gate: 'gate_upload_ci.py:consent-precheck'},
      {phase: 'P8', count: 1, failure_kind: 'gate_failure', gate: 'gate_upload_ci.py'},
    ],
  });
  assert.equal(run.review_hold_attempts, 1);
  assert.equal(run.operational_fail_attempts, 1);
  assert.equal(run.review_hold_derivation, 'complete');
});

test('summarize keeps unknown runs in operational totals conservatively', () => {
  const complete = analytics.deriveRunView({
    failures: 1, gate_attempts: 1, phases: [{id: 'P8', fail_attempts: 1, gate_attempts: 1}],
    failure_details: [{phase: 'P8', count: 1, failure_kind: 'expected_review_hold', gate: 'gate_upload_ci.py:consent-precheck'}],
  });
  const unknown = analytics.deriveRunView({
    failures: 1, gate_attempts: 1, phases: [{id: 'P8', fail_attempts: 1, gate_attempts: 1}],
    failure_details: [{phase: 'P8', count: null, reason: '仅最近结果'}],
  });
  const summary = analytics.summarize([complete, unknown]);
  assert.equal(summary.rawFailures, 2);
  assert.equal(summary.operationalFailures, 1);
  assert.equal(summary.operationalAttempts, 1);
  assert.equal(summary.operationalSamples, 2);
  assert.equal(summary.operationalFallbackRuns, 1);
  assert.equal(summary.operationalUnavailableRuns, 0);
});

test('phaseTotals keeps unknown phases in operational totals conservatively', () => {
  const phases = analytics.phaseTotals([
    {phases: [{id: 'P8', fail_attempts: 1, gate_attempts: 1, review_hold_attempts: 1,
               operational_fail_attempts: 0, operational_gate_attempts: 0}]},
    {phases: [{id: 'P8', fail_attempts: 1, gate_attempts: 1, review_hold_attempts: null,
               operational_fail_attempts: null, operational_gate_attempts: null}]},
  ]);
  assert.equal(phases[0].operationalFailures, 1);
  assert.equal(phases[0].operationalAttempts, 1);
  assert.equal(phases[0].operationalFallbackPhases, 1);
  assert.equal(phases[0].operationalUnavailablePhases, 0);
});

test('a run without P8 is not_applicable for P8 hold attribution, not complete', () => {
  const run = analytics.deriveRunView({
    failures: 2, gate_attempts: 2,
    phases: [{id: 'P1', fail_attempts: 2, gate_attempts: 2}],
    failure_details: [{phase: 'P1', count: null, reason: '仅记录最近结果'}],
  });
  assert.equal(run.review_hold_derivation, 'not_applicable');
  assert.equal(run.operational_fail_attempts, null);
  const summary = analytics.summarize([run]);
  assert.equal(summary.notApplicableRuns, 1);
  assert.equal(summary.completeRuns, 0);
});
