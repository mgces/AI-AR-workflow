import assert from 'node:assert/strict';
import test from 'node:test';
import {plans,validatePlans,filterPlans,offlineAssessment} from '../dist/optimization-plan.mjs';
import {reviewedRunUpdates} from '../dist/failure-review.mjs';

test('each improvement has actionable workflow measures, acceptance and scoped evidence',()=>{
  assert.equal(validatePlans(plans),true);
});
test('combined search and filters preserve phase and cause constraints',()=>{
  const matches=filterPlans(plans,{phase:'P4',attribution:'gate',priority:'high'});
  assert.ok(matches.length>0);
  assert.ok(matches.every(p=>p.phases.includes('P4')&&p.attributions.includes('gate')&&p.priority==='high'));
  assert.ok(filterPlans(plans,{query:'  unique_fd.h  '}).some(p=>p.sourceCases.some(c=>c.scope==='later')));
  assert.deepEqual(filterPlans(plans,{query:'unmatched-workflow-search'}),[]);
});
test('unverified effects and missing implementation evidence are rejected',()=>{
  const item=structuredClone(plans[0]);
  assert.throws(()=>validatePlans([{...item,status:'implemented',changeRef:'',regressionEvidence:''}]));
  assert.throws(()=>validatePlans([{...item,status:'verified'}]));
  assert.equal(validatePlans([{...item,status:'verified',changeRef:'commit:test',regressionEvidence:'historical regression passed',effectEvidence:'subsequent run comparison'}]),true);
});
test('offline assessment never claims measured real-world improvement',()=>{
  assert.equal(offlineAssessment.actual_run_failure_reduction_percent,null);
  assert.equal(offlineAssessment.cases.length,16);
  assert.equal(offlineAssessment.cases.filter(c=>c.category==='misleading_rejection').length,8);
  assert.ok(offlineAssessment.cases.every(c=>c.after_expected_behavior));
  const historical=plans.filter(p=>Number(p.id.slice(3))<=15);
  assert.equal(historical.length,15);
  assert.ok(historical.every(p=>p.status==='implemented'&&p.changeRef&&p.regressionEvidence&&!p.effectEvidence));
});
test('new snapshot review covers every reviewed run without claiming shipped improvements',()=>{
  for(const runId of Object.keys(reviewedRunUpdates))assert.ok(plans.some(p=>p.sourceCases.some(c=>c.runId===runId)),runId);
  const followUps=plans.filter(p=>Number(p.id.slice(3))>15);
  assert.equal(followUps.length,8);
  assert.ok(followUps.every(p=>p.status==='planned'&&!p.changeRef&&!p.regressionEvidence&&!p.effectEvidence));
});
test('duplicate IDs and unsupported phases are rejected',()=>{
  assert.throws(()=>validatePlans([plans[0],plans[0]]));
  assert.throws(()=>validatePlans([{...plans[0],phases:['P9']}]));
});
test('unknown resmon attempts and later discoveries remain separate',()=>{
  const cases=plans.flatMap(p=>p.sourceCases);
  for(const phase of ['P2','P3','P7','P8']) {
    assert.ok(cases.some(c=>c.runId==='20260923-resmon'&&c.phase===phase&&c.scope==='unknown'));
  }
  assert.ok(cases.some(c=>c.reason.includes('No.bundle.002')&&c.scope==='later'));
  assert.ok(cases.some(c=>c.reason.includes('unique_fd.h')&&c.scope==='later'));
});
