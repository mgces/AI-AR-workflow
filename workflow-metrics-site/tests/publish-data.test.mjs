import test from 'node:test';
import assert from 'node:assert/strict';
import {parseImport} from '../dist/import-data.mjs';
const api=()=>import('../dist/publish-data.mjs');
const run=(id='中文运行',time='2026-10-12T01:00:00Z')=>parseImport(JSON.stringify({schema_version:2,run_id:id,updated_at_utc:time,phases:{1:{last_verdict:'FAIL',gate_attempts:1,fail_attempts:1,last_note:'缺少 BUILD.gn 字段'}}}))[0];
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const encoded=s=>Buffer.from(JSON.stringify(s),'utf8').toString('base64');
function mock(base={schema_version:1,runs:[]},putStatus=200){const calls=[];return {calls,fetch:async(url,opts={})=>{calls.push({url,opts});if(url.endsWith('/user'))return response({login:'admin'});if(url.endsWith('/repos/mgces/AI-AR-workflow'))return response({permissions:{push:true}});if(opts.method==='PUT')return response({commit:{sha:'abc123',html_url:'https://github.com/mgces/AI-AR-workflow/commit/abc123'}},putStatus);return response({sha:'oldsha',encoding:'base64',content:encoded(base)});}};}
test('prepare reviews latest shared data, deduplicates, redacts and never uploads before confirmation',async()=>{
 const {preparePublish,commitPublish}=await api();const m=mock({schema_version:1,runs:[run('已有')]});
 const draft=await preparePublish('fictional-token',[run()],m.fetch);
 assert.equal(draft.snapshot.runs.length,2);assert.equal(draft.sha,'oldsha');assert.equal(draft.changes[0].action,'新增');
 assert.ok(m.calls.every(c=>c.opts.method!=='PUT'));assert.ok(!JSON.stringify(draft).includes('fictional-token'));
 const result=await commitPublish('fictional-token',draft,m.fetch);assert.equal(result.sha,'abc123');
 const put=m.calls.at(-1);assert.match(put.url,/^https:\/\/api.github.com\/repos\/mgces\/AI-AR-workflow\/contents\/docs\/public\/workflow-metrics\/data.json$/);
 const body=JSON.parse(put.opts.body);assert.equal(body.sha,'oldsha');assert.equal(body.branch,'main');
 const snapshot=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));assert.ok(snapshot.runs.some(r=>r.id==='中文运行'));assert.ok(!put.opts.body.includes('fictional-token'));
 assert.ok(m.calls.every(c=>c.opts.redirect==='error'));assert.equal(put.opts.headers.Authorization,'Bearer fictional-token');
});
test('older input cannot overwrite newer shared versions and no-op publication is refused',async()=>{
 const {preparePublish,commitPublish}=await api();const m=mock({schema_version:1,runs:[run('x','2026-10-12T03:00:00Z')]});
 const draft=await preparePublish('t',[run('x')],m.fetch);assert.equal(draft.changes[0].action,'已存在或版本较旧');
 await assert.rejects(()=>commitPublish('t',draft,m.fetch),/没有新增或更新/);assert.ok(m.calls.every(c=>c.opts.method!=='PUT'));
});
test('permission failures and concurrent update errors are safe, never retry blindly',async()=>{
 const {preparePublish,commitPublish}=await api();
 for(const status of [401,403,404])await assert.rejects(()=>preparePublish('fictional-secret',[run()],async()=>response({message:'fictional-secret'},status)),e=>!e.message.includes('fictional-secret'));
 await assert.rejects(()=>preparePublish('t',[run()],async url=>response(url.endsWith('/user')?{login:'reader'}:{permissions:{push:false}})),/写入权限/);
 const m=mock(undefined,409);const draft=await preparePublish('t',[run()],m.fetch);
 await assert.rejects(()=>commitPublish('t',draft,m.fetch),/远端已更新/);assert.equal(m.calls.filter(c=>c.opts.method==='PUT').length,1);
});
test('unsupported or missing shared files fail closed, credentials must be nonempty',async()=>{
 const {preparePublish}=await api();await assert.rejects(()=>preparePublish('',[run()],mock().fetch),/授权/);
 const m=mock();const f=async(u,o)=>u.includes('/contents/')?response({sha:'sha',encoding:'base64',content:encoded({schema_version:99,runs:[]})}):m.fetch(u,o);
 await assert.rejects(()=>preparePublish('t',[run()],f),/格式/);
});

test('read preview does not claim token write permission is verified',async()=>{
 const {preparePublish}=await api();const draft=await preparePublish('t',[run()],mock().fetch);
 assert.equal(draft.tokenWriteVerified,false);
});
test('write denial distinguishes token permission and rate limits without exposing response secrets',async()=>{
 const {preparePublish,commitPublish}=await api();const draft=await preparePublish('t',[run()],mock().fetch);
 const denied=async()=>({...response({message:'Resource not accessible by personal access token fictional-secret'},403),headers:{get:k=>k.toLowerCase()==='x-github-request-id'?'ABCD:1234:5678:9ABC':null}});
 await assert.rejects(()=>commitPublish('t',draft,denied),e=>e.message.includes('HTTP 403')&&e.message.includes('Contents')&&e.message.includes('Read and write')&&e.message.includes('ABCD:1234:5678:9ABC')&&!e.message.includes('fictional-secret'));
 const limited=async()=>({...response({message:'private arbitrary body'},403),headers:{get:k=>k.toLowerCase()==='x-ratelimit-remaining'?'0':null}});
 await assert.rejects(()=>commitPublish('t',draft,limited),/API.*额度|请求.*限流/);
 await assert.rejects(()=>commitPublish('t',draft,async()=>response({message:'You have exceeded a secondary rate limit.'},403)),/限流/);
});
test('branch rule failures and write 404 give actionable diagnostics',async()=>{
 const {preparePublish,commitPublish}=await api();const draft=await preparePublish('t',[run()],mock().fetch);
 await assert.rejects(()=>commitPublish('t',draft,async()=>response({message:'GH013: Repository rule violations found; fictional-secret'},422)),e=>e.message.includes('main')&&e.message.includes('分支')&&!e.message.includes('fictional-secret'));
 await assert.rejects(()=>commitPublish('t',draft,async()=>response({},404)),e=>e.message.includes('HTTP 404')&&e.message.includes('Token')&&e.message.includes('mgces/AI-AR-workflow'));
});
