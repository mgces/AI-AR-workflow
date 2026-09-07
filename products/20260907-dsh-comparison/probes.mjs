// Review-only probes using synthetic files and temporary state.
// A passing assertion confirms a documented limitation of the reviewed snapshot.
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
const localRepo = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../../', import.meta.url)));
if (!process.argv[3]) throw new Error('Usage: node probes.mjs <local-repo> <remote-checkout>');
const remoteRepo = path.resolve(process.argv[3]);
const load = (repo, file) => import(pathToFileURL(path.join(repo, file)).href);
const { AdaptiveWorkflowController } = await load(localRepo, 'dsh-workflow/src/core/controller.js');
const { createToolCatalog } = await load(localRepo, 'dsh-workflow/src/tools/catalog.js');
const { ModuleRegistry } = await load(localRepo, 'dsh-workflow/src/core/module-registry.js');
const { OhosController, SqliteStore, TaskCredentials } = await load(remoteRepo, 'runtime/dsh-ohos/src/index.js');
const root = await mkdtemp('/tmp/dsh-compare-probes-');
const local = await AdaptiveWorkflowController.create({stateDir: path.join(root,'state')});
const req = local.requirements;
const docsDir = path.join(root,'docs');
const outputs = [];
await req.start({runId:'probe', docsDir});
for (const [stage,file,status] of [
 ['R1','01-requirement.md','Clarified'], ['R2','02-feasibility.md','Clarified'],
 ['R3','03-arch-decision-record.md','Accepted'], ['R4','04-feature.md','Baseline']]) {
 await writeFile(path.join(docsDir,file), `---\nstatus: ${status}\n---\n`);
 if(stage==='R1') {
  const submit = createToolCatalog(local).find(t=>t.name==='ar_requirement_submit');
  const result = await submit.execute({runId:'probe',stage,humanActor:'synthetic-reviewer'});
  assert.equal(result.currentStage, 'R2');
  outputs.push({probe:'local_approval_omitted',result:result.currentStage,humanApproved:'omitted'});
 } else await req.submit('probe',{stage,humanApproval:{approved:true,actor:'synthetic-reviewer'}});
}
const fakeEvidence = path.join(docsDir,'review.json');
await writeFile(fakeEvidence,JSON.stringify({gate:'Not Ready',summary:{fail:12}}));
let result=await req.submit('probe',{stage:'R5',gateDecision:'Ready',evidence:[fakeEvidence]});
assert.equal(result.currentStage,'R6');
outputs.push({probe:'local_R5_contradictory_evidence',evidenceGate:'Not Ready',submittedDecision:'Ready',result:result.currentStage});
result=await req.submit('probe',{stage:'R6',reviewDecision:'accepted',humanApproval:{approved:false,actor:'synthetic-reviewer'}});
assert.equal(result.currentStage,'R7');
outputs.push({probe:'local_R6_explicit_disapproval',humanApproved:false,result:result.currentStage});
for(const name of ['IR.md','SR-unrelated.md']) await writeFile(path.join(docsDir,name),'');
await writeFile(path.join(docsDir,'05-proposal-unapproved.md'),'---\nstatus: Draft\n---\n');
result=await req.submit('probe',{stage:'R7'});
assert.equal(result.currentStage,'R8');
outputs.push({probe:'local_R7_unapproved_proposal',proposalStatus:'Draft',srBytes:0,result:result.currentStage});
for(const [stage,name] of [['R8','handoff.md'],['R9','AR.md']]) {
 await writeFile(path.join(docsDir,name),'');
 result=await req.submit('probe',{stage});
}
await writeFile(path.join(docsDir,'01-requirement.md'),'changed upstream');
assert.equal((await req.status('probe')).result,'completed');
outputs.push({probe:'local_empty_handoff_AR_and_upstream_change',result:(await req.status('probe')).result});
const invalid=await local.developmentGate({pipelineDir:path.join(root,'missing-pipeline'),gate:'gate_build.py'});
const invalidEvents=await local.experience.list();
assert.equal(invalidEvents.length,1);
outputs.push({probe:'local_experience_before_gate_execution',ok:invalid.ok,source:invalidEvents[0].source,result:invalidEvents[0].result});
const ws=path.join(root,'fake-workspace');
const scripts=path.join(ws,'skills/ohos-ar-dev-phases/scripts');
const pipeline=path.join(root,'p8');
await mkdir(scripts,{recursive:true}); await mkdir(pipeline);
await writeFile(path.join(pipeline,'pipeline.json'),'{}');
await writeFile(path.join(scripts,'advance.py'),`import json\nprint(json.dumps({'current_phase':8,'current_substate':'awaiting_consent'}))\n`);
await writeFile(path.join(scripts,'gate_upload_ci.py'),`print('DRY RUN (no --allow-push); signed precheck only; no PASS emitted')\n`);
const p8=await AdaptiveWorkflowController.create({workspaceRoot:ws,stateDir:path.join(root,'p8-state')});
result=await p8.developmentGate({pipelineDir:pipeline,gate:'gate_upload_ci.py'});
const event=(await p8.experience.list())[0];
assert.equal(event.result,'pass');
outputs.push({probe:'local_zero_exit_precheck_synthetic_subprocess',commandOk:result.ok,businessPass:false,experienceResult:event.result});
const cycleFile=path.join(root,'cycle.json');
await writeFile(cycleFile,JSON.stringify({modules:[
 {id:'a',workflows:['development'],phases:['P2'],defaultForPhase:true,requires:['b']},
 {id:'b',requires:['a']}
]}));
const cycle=await new ModuleRegistry({workspaceRoot:ws,registryFile:cycleFile}).load();
try {cycle.resolve({workflow:'development',phase:'P2'});throw new Error('expected recursion error');}
catch(error){assert.equal(error.name,'RangeError');outputs.push({probe:'local_module_cycle',error:error.message});}
const store = new SqliteStore(':memory:');
let now=new Date('2026-09-07T00:00:00Z');
const remote=new OhosController({store,credentials:new TaskCredentials(Buffer.alloc(32,9)),clock:()=>now,leaseMs:1000,requirementPreflight:()=>{}});
remote.registerHost({binding_id:'probe-host',host_kind:'codex',capabilities:{mcp_tools:true,native_subagent:true,workspace_write:true,build_execution:true},capability_source:'synthetic',idempotency_key:'host'});
const run=remote.startRun({workflow:'delivery',pipeline_dir:'/tmp/synthetic-pipeline',workspace_root:'/tmp/synthetic-workspace',initial_phase:'P4',input_ref:'synthetic',idempotency_key:'start'});
const claimArgs={run_id:run.run_id,role:'build-runner',host_binding_id:'probe-host',expected_revision:1};
const a=remote.claimTask({...claimArgs,idempotency_key:'claim-1'});
now=new Date(now.getTime()+2000);
const b=remote.claimTask({...claimArgs,idempotency_key:'claim-2'});
assert.equal(b.status,'leased'); assert.equal(b.attempt,2);
outputs.push({probe:'remote_delivery_expired_lease_reissued',firstAttempt:a.attempt,secondAttempt:b.attempt,requiresOldProcessStoppedProof:false,note:'controller-only simulation; no actual worker process was started'});
store.close();
console.log(JSON.stringify({root,outputs},null,2));
