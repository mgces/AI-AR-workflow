import assert from 'node:assert/strict';
import test from 'node:test';
import {failureReview,runName} from '../dist/failure-review.mjs';
const run = overrides => ({id:'test',workflow:'ar-development',kind:'AR',updated_at:'2026-10-18T00:00:00Z',failures:4,gate_attempts:8,failure_details:[],...overrides});

test('unknown reasons, aggregate stage evidence and unrepresented failures stay separate',()=>{
  const result=failureReview({runs:[run({failure_details:[
    {count:1,reason:'未记录具体失败原因'},
    {count:2,reason:'阶段原因（无法逐次对应）：测试未启动'}
  ]})]});
  assert.equal(result.failures,4);assert.equal(result.attempts,8);
  assert.equal(result.missing,2);assert.equal(result.stage,2);
  assert.equal(result.rows[0].details.length,2);
});
test('preflight is separate from formal FAIL; missing counts do not become zero',()=>{
  const result=failureReview({runs:[run({preflight_summary:{failed_attempts:0}}),run({id:'other',preflight_failures:[{id:'p1',checks:[{reason:'failed'}]}]})]});
  assert.equal(result.failures,8);assert.equal(result.preflight,0);assert.equal(result.unknownPreflight,1);
  assert.equal(result.rows.find(r=>r.run.id==='other').preflightDetails.length,1);
});
test('a newer import and a reused ID in another workflow require a fresh review',()=>{
  const reviewed={test:'2026-10-18T00:00:00Z'};
  assert.equal(failureReview({runs:[run()]},[],reviewed).pending,0);
  assert.equal(failureReview({runs:[run({updated_at:'2026-10-18T01:00:00Z'})]},[],reviewed).pending,1);
  assert.equal(failureReview({runs:[run({workflow:'requirement',kind:'Requirement'})]},[],reviewed).pending,1);
  assert.equal(failureReview({runs:[run({id:'new-import'})]},[],reviewed).rows.length,1);
});
test('review holds, CI wait and unknown detail counts are preserved without fabricated attribution',()=>{
  const result=failureReview({runs:[run({failures:3,failure_details:[
    {count:1,reason:'dry run',failure_kind:'expected_review_hold'},
    {count:1,reason:'pending',failure_category:'ci_wait'},
    {count:null,reason:'only latest result'},
    {count:1,reason:'unclassified real failure'}
  ]})]});
  assert.equal(result.reviewHolds,1);assert.equal(result.ciWaits,1);assert.equal(result.failures,3);
  assert.equal(result.rows[0].unknownDetailCounts,1);assert.equal(result.missing,0);
  assert.equal(result.rows[0].details[3].reason,'unclassified real failure');
});
test('conflicting counts and absent totals are exposed, and empty data has no invented rates',()=>{
  assert.equal(failureReview({runs:[run({failures:1,failure_details:[{count:2,reason:'known'}]})]}).rows[0].countConflict,true);
  const unknown=failureReview({runs:[run({failures:null,gate_attempts:null})]});
  assert.equal(unknown.failures,null);assert.equal(unknown.unknownFailures,1);
  assert.equal(failureReview({runs:[]}).preflight,null);
});
test('display names retain task identity and embedded non-prefix dates',()=>{
  assert.equal(runName('2026-10-15-hiview-resmon'),'hiview-resmon');
  assert.equal(runName('20261016-hicollie'),'hicollie');
  assert.equal(runName('task-20261016'),'task-20261016');
});
