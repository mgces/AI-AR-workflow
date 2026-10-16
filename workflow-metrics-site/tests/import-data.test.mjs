import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync} from 'node:fs';
const url=new URL('../dist/import-data.mjs',import.meta.url);
async function api(){assert.ok(existsSync(url),'implement direct JSON import');return import(url);}
const raw=(id='import-run',updated='2026-10-12T01:00:00Z')=>({schema_version:2,run_id:id,updated_at_utc:updated,started_at_utc:'2026-10-12T00:00:00Z',execution_context:{agent:'test-agent',model:'test-model',token:'never-store'},
 phases:{'1':{name:'design',last_verdict:'PASS',opened_at_utc:'2026-10-12T00:00:00Z',closed_at_utc:'2026-10-12T00:30:00Z',elapsed_seconds:1800,human_wait_excluded_seconds:60,effective_elapsed_seconds:1740,gate_attempts:2,pass_attempts:1,fail_attempts:1,runs:[{opened_at_utc:'2026-10-12T00:00:00Z',closed_at_utc:'2026-10-12T00:30:00Z'}],attempt_history:[{id:'manifest:1',verdict:'FAIL',gate:'gate_design.py',reason:'missing contract field',first_attempt:true,fixes:[{root_cause:'field omitted',action:'add field',verification_verdict:'PASS'}]}]}},timing:{history_complete:true,initialization_count:1}});
test('raw metrics become existing dashboard schema with recorded failures and fixes',async()=>{
 const {parseImport}=await api();const [r]=parseImport(JSON.stringify(raw()));
 assert.equal(r.id,'import-run');assert.equal(r.effective_seconds,1740);assert.equal(r.failures,1);
 assert.equal(r.failure_details[0].fixes[0].action,'add field');assert.equal(r.phases[0].rounds,1);
 assert.equal(r.recording_quality.status,'complete');assert.equal(r.kind,'AR');
});
test('whitelist and redaction omit commands, credentials, IPs and personal paths but retain diagnostics',async()=>{
 const {parseImport}=await api();const d=raw();const a=d.phases['1'].attempt_history[0];
 a.reason='push https://oauth2:fictional-secret@gitcode.com/repo failed; host 172.20.0.2 path /home/alice/src/main.cpp; fix BUILD.gn';a.argv=['never-expose-command'];a.hmac='never-expose-hmac';
 const text=JSON.stringify(parseImport(JSON.stringify(d)));
 for(const x of ['fictional-secret','never-store','never-expose','172.20.0.2','/home/alice'])assert.ok(!text.includes(x),x);
 assert.ok(text.includes('BUILD.gn'));assert.ok(text.includes('push'));
});
test('malformed or incompatible JSON and invalid counters are rejected without echoing input',async()=>{
 const {parseImport}=await api();assert.throws(()=>parseImport('{"secret":"fictional-secret"'),e=>!e.message.includes('fictional-secret'));
 for(const d of [{schema_version:99},[],{...raw(),phases:[]}, {...raw(),run_id:''}])assert.throws(()=>parseImport(JSON.stringify(d)));
 const d=raw();d.phases['1'].fail_attempts=-1;assert.throws(()=>parseImport(JSON.stringify(d)));
 d.phases['1'].fail_attempts=1;d.phases['1'].gate_attempts=0;assert.throws(()=>parseImport(JSON.stringify(d)));
});
test('requirement counts remain unknown; preflight and upload waits stay separate',async()=>{
 const {parseImport}=await api();const d=raw();d.phases={'R2':{attempts:3,last_result:'failed',last_note:'dependency missing'}};
 const [r]=parseImport(JSON.stringify(d));assert.equal(r.kind,'Requirement');assert.equal(r.failures,null);assert.equal(r.gate_attempts,null);
 const ar=raw();ar.phases['8']={last_verdict:'INFO',wait_history:[{kind:'ci_wait',reason:'pending',pr:4593}]};ar.preflight_summary={attempts:1,failed_attempts:1,issues:1};ar.preflight_history=[{id:'preflight-1',phase:1,status:'FAIL',checks:[{id:'field',status:'FAIL',reason:'missing field',output:'OAT.3 hidden-output',argv:['private']}]}];
 const [n]=parseImport(JSON.stringify(ar));assert.equal(n.failures,1);assert.equal(n.preflight_summary.failed_attempts,1);assert.deepEqual(n.preflight_failures[0].checks[0].rule_ids,['OAT.3']);assert.equal(n.phases[1].upload_wait_history[0].pr,4593);assert.ok(!JSON.stringify(n).includes('hidden-output'));
});
test('merge deduplicates by workflow/id, compares actual dates and never overwrites newer published runs',async()=>{
 const {parseImport,mergeRuns}=await api();const old=parseImport(JSON.stringify(raw('a','2026-10-12T00:00:00Z')))[0],later=parseImport(JSON.stringify(raw('a','2026-10-12T10:00:00+08:00')))[0];
 assert.equal(mergeRuns([later],[old])[0].updated_at,later.updated_at);assert.equal(mergeRuns([old],[later,later]).length,1);
 assert.equal(mergeRuns([old],[{...old,workflow:'requirement',kind:'Requirement'}]).length,2);
});
test('normalized backup can be restored but unknown nested fields are not retained',async()=>{
 const {parseImport}=await api();const runs=parseImport(JSON.stringify(raw()));runs[0].env={token:'never-store'};runs[0].failure_details[0].argv=['never-expose'];
 const restored=parseImport(JSON.stringify({schema_version:1,runs}));assert.equal(restored[0].id,'import-run');assert.ok(!JSON.stringify(restored).includes('never-'));
});
test('local storage is transactional, persists only sanitized records and reports corrupt cache',async()=>{
 const {parseImport,saveLocalRuns,loadLocalRuns,STORAGE_KEY}=await api();const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 saveLocalRuns(storage,parseImport(JSON.stringify(raw())));assert.equal(loadLocalRuns(storage).runs.length,1);assert.ok(!map.get(STORAGE_KEY).includes('never-store'));
 const before=map.get(STORAGE_KEY);assert.throws(()=>saveLocalRuns({setItem(){throw Error('quota');}},parseImport(JSON.stringify(raw('b')))));assert.equal(map.get(STORAGE_KEY),before);
 map.set(STORAGE_KEY,'bad');assert.ok(loadLocalRuns(storage).error);assert.equal(map.get(STORAGE_KEY),'bad');
});
test('known incomplete history remains incomplete and previously excluded runs are not resurrected',async()=>{
 const {parseImport}=await api();const d=raw('20261009-fd-leak-detect');d.started_at_utc='2026-10-09T12:50:46Z';delete d.timing;
 assert.equal(parseImport(JSON.stringify(d))[0].recording_quality.status,'incomplete');
 assert.throws(()=>parseImport(JSON.stringify(raw('e2e-supervisor-20260915-1'))));
});
test('backups reject inconsistent phase counters and mixed workflow stages',async()=>{
 const {parseImport}=await api();const runs=parseImport(JSON.stringify(raw()));
 runs[0].phases[0].fail_attempts=3;
 assert.throws(()=>parseImport(JSON.stringify({schema_version:1,runs})),/失败次数/);
 runs[0].phases[0].fail_attempts=1;runs[0].phases[0].id='R1';
 assert.throws(()=>parseImport(JSON.stringify({schema_version:1,runs})),/阶段/);
});
test('missing shared snapshot opens an empty dashboard and preserves browser imports',async()=>{
 const {loadPublishedSnapshot,mergeSnapshot,parseImport}=await api();
 assert.equal(typeof loadPublishedSnapshot,'function');
 const snapshot=await loadPublishedSnapshot(async()=>({status:404,ok:false}));
 assert.deepEqual(snapshot.runs,[]);
 assert.equal(snapshot.source_count,0);
 assert.equal(snapshot.generated_at,'');
 const merged=mergeSnapshot(snapshot,parseImport(JSON.stringify(raw())));
 assert.deepEqual(merged.runs.map(r=>r.id),['import-run']);
});
test('shared snapshot loading validates existing published runs',async()=>{
 const {loadPublishedSnapshot,parseImport}=await api();
 assert.equal(typeof loadPublishedSnapshot,'function');
 const runs=parseImport(JSON.stringify(raw()));
 const snapshot=await loadPublishedSnapshot(async()=>({status:200,ok:true,json:async()=>({schema_version:1,runs})}));
 assert.equal(snapshot.runs[0].id,'import-run');
 assert.equal(snapshot.source_count,1);
});
test('shared snapshot loading reports server failures and invalid data',async()=>{
 const {loadPublishedSnapshot}=await api();
 assert.equal(typeof loadPublishedSnapshot,'function');
 await assert.rejects(()=>loadPublishedSnapshot(async()=>({status:500,ok:false})),/数据文件暂时无法读取/);
 await assert.rejects(()=>loadPublishedSnapshot(async()=>({status:200,ok:true,json:async()=>({schema_version:2,runs:[]})})),/快照版本/);
});
