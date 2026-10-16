// Only dashboard fields survive import. Original JSON and credentials are never cached.
export const STORAGE_KEY='workflow-metrics.browser-imports.v1';
export const MAX_FILE_BYTES=10*1024*1024;
const excluded=new Set(['e2e-supervisor-20260915-1','e2e-wsl-20260915-aa64eb79']);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=name=>{throw Error(`字段 ${name} 格式不正确`);};
const array=(v,name='数组')=>{if(v==null)return [];if(!Array.isArray(v)||v.length>10000)fail(name);return v;};
const number=(v,name='数值',integer=false)=>{if(v==null)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||(integer&&!Number.isInteger(v)))fail(name);return v;};
const count=v=>number(v,'计数',true);
const sum=values=>values.some(v=>v!==null)?values.reduce((s,v)=>s+(v??0),0):null;
const boolean=v=>typeof v==='boolean'?v:null;
export function redact(value){
 let s=typeof value==='string'?value:typeof value==='number'?String(value):'';
 s=s.replace(/-----BEGIN[^\n]*PRIVATE KEY-----[\s\S]*?(?:-----END[^\n]*PRIVATE KEY-----|$)/g,'[私钥已隐藏]')
  .replace(/\bhttps?:\/\/[^/@\s]+@/gi,m=>m.split('://')[0]+'://[凭据]@')
  .replace(/\b(?:github_pat_[a-z0-9_]{20,}|gh[pousr]_[a-z0-9]{20,})\b/gi,'[凭据已隐藏]')
  .replace(/\bBearer\s+[^\s,;"']+/gi,'Bearer [已隐藏]')
  .replace(/(?:--)?\b(token|password|secret|api[_-]?key|authorization|device_serial|serial_number|serial)\s*[:=]\s*(?:"[^"\n]*"|'[^'\n]*'|[^\s,;]+)/gi,'$1=[已隐藏]')
  .replace(/--(token|password|secret|api-key)\s+[^\s,;]+/gi,'--$1 [已隐藏]')
  .replace(/(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?!\d)/g,'[IP地址]')
  .replace(/(?<![\w.])[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[邮箱]')
  .replace(/[A-Za-z]:[\\/][^\s,;'"()<>]+/g,'[本机路径]')
  .replace(/(?<!\w)\/(?:home|Users|root|mnt\/[a-z]\/Users|data|system|vendor|dev|tmp)\/[^\s,;'"()<>]+/g,'[敏感路径]')
  .replace(/\b[A-Za-z0-9_.-]+\.(?:pem|key|p12|pfx)\b|\bCERT\.(?:ENC|SF)\b/gi,'[证书文件]');
 return s.slice(0,3000);
}
const date=v=>{if(v==null||v==='')return '';if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT/.test(v)||!Number.isFinite(Date.parse(v)))fail('时间');return v;};
const phaseId=k=>{const id=/^R/i.test(String(k))?String(k).toUpperCase():'P'+String(k).replace(/^P/i,'');if(!/^(P[0-8]|R[1-9])$/.test(id))fail('阶段编号');return id;};
const sourceFor=r=>'browser-import/'+encodeURIComponent(r.workflow)+'/'+encodeURIComponent(r.id)+'/workflow_metrics.json';
const passed=new Set(['PASS','PASSED','COMPLETED','ACCEPTED','SUCCESS','READY']);
const failed=new Set(['FAIL','FAILED','ERROR','BLOCKED','REJECTED','NOT_READY']);
function category(reason,gate){const s=(reason+' '+gate).toLowerCase();if(s.includes('consent-precheck'))return '待人工确认';if(/source root|build.sh|环境|toolchain|dependency|依赖/.test(s))return '环境与依赖';if(/test|assert|测试|coverage|覆盖/.test(s))return '测试与验证';if(/build|compile|编译|构建/.test(s))return '编译构建';if(/device|hdc|设备/.test(s))return '设备连接';return s.includes('未记录')?'原因缺失':'其他门禁问题';}
function quality(d){
 if(d.run_id==='20261009-fd-leak-detect'&&d.started_at_utc==='2026-10-09T12:50:46Z')return {status:'incomplete',initialization_count:null,note:'会话已确认同一 run-id 重新初始化覆盖早期历史；当前阶段时间及失败数不能代表完整任务。'};
 const complete=d.timing?.history_complete;
 return {status:complete===true?'complete':complete===false?'incomplete':'unknown',initialization_count:count(d.timing?.initialization_count),note:complete===true?'指标历史连续保留；实际工作起点仍需登记。':complete===false?'历史不完整，不能评估完整任务成本。':'旧记录未验证历史完整性。'};
}
function fixes(values){return array(values).map(f=>{if(!obj(f))fail('修复记录');return {root_cause:redact(f.root_cause),action:redact(f.action),change_ref:redact(f.change_ref),verification_verdict:['PASS','FAIL'].includes(f.verification_verdict)?f.verification_verdict:null};});}
function finding(f){if(!obj(f))fail('会话线索');return {phase:phaseId(f.phase),reason:redact(f.reason),action:redact(f.action),outcome:redact(f.outcome),basis:redact(f.basis),evidence_refs:array(f.evidence_refs).map(redact)};}
export function normalizeMetrics(d){
 if(!obj(d)||d.schema_version!==2||typeof d.run_id!=='string'||!d.run_id.trim()||d.run_id.length>300)fail('schema_version / run_id');
 if(excluded.has(d.run_id))throw Error('该运行已被标记为无效，不纳入统计');
 if(!obj(d.phases)||!Object.keys(d.phases).length)fail('phases');
 const ids=Object.keys(d.phases).map(phaseId);if(new Set(ids).size!==ids.length||new Set(ids.map(s=>s[0])).size!==1)fail('重复或混合阶段');
 const requirement=ids[0].startsWith('R'),ctx=d.execution_context??{},summary=d.summary??{};
 if(!obj(ctx)||!obj(summary))fail('execution_context / summary');
 const r={id:redact(d.run_id),workflow:redact(d.workflow)||(requirement?'requirement':'ar-development'),kind:requirement?'Requirement':'AR',agent:redact(ctx.agent)||'unknown',model:redact(ctx.model)||'unknown',updated_at:date(d.updated_at_utc),started_at:date(d.started_at_utc),phases:[],failure_details:[],human_interventions:[],open_wait_details:[],import_origin:'browser'};
 r.source=sourceFor(r);
 for(const [key,p] of Object.entries(d.phases).sort((a,b)=>Number(phaseId(a[0]).slice(1))-Number(phaseId(b[0]).slice(1)))){
  if(!obj(p))fail('阶段');const id=phaseId(key),verdict=redact(p.last_verdict||p.last_result).toUpperCase().replaceAll(' ','_');
  const wall=number(p.elapsed_seconds),wait=number(p.human_wait_excluded_seconds),effective=number(p.effective_elapsed_seconds)??(wall!==null&&wait!==null?Math.max(0,wall-wait):null);
  const rounds=array(p.runs,'runs'),active=Boolean(p.opened_at_utc||rounds.length||wall!==null||verdict);
  const phase={id,name:redact(p.name)||id,status:p.current_epoch_active===false?'pending':failed.has(verdict)?'failed':passed.has(verdict)?'passed':active?'running':'pending',wall_seconds:wall,wait_seconds:wait,effective_seconds:effective,gate_attempts:count(p.gate_attempts),pass_attempts:count(p.pass_attempts),fail_attempts:count(p.fail_attempts),stage_attempts:count(p.attempts),rounds:rounds.length,skills:array(p.skills_used).map(redact),gate:redact(p.last_gate||p.last_action),opened_at:date(p.opened_at_utc),closed_at:date(p.closed_at_utc),rounds_detail:rounds.map(a=>({opened_at:date(a.opened_at_utc),closed_at:date(a.closed_at_utc),kind:redact(a.kind)||'phase',interrupted:Boolean(a.interrupted)})),upload_wait_history:p.wait_history==null?null:array(p.wait_history).map(w=>({kind:redact(w.kind),reason:redact(w.reason),at:date(w.at_utc),pr:count(w.pr)}))};
  if(phase.gate_attempts!==null&&phase.fail_attempts!==null&&phase.fail_attempts>phase.gate_attempts)fail('失败次数超过尝试次数');
  r.phases.push(phase);
  let history=array(p.attempt_history).filter(a=>{if(!obj(a))fail('attempt_history');return a.verdict==='FAIL';});
  if(phase.fail_attempts!==null)history=phase.fail_attempts?history.slice(-phase.fail_attempts):[];
  for(const a of history){const reason=redact(a.reason)||'未记录具体失败原因';r.failure_details.push({id:redact(a.id),phase:id,gate:redact(a.gate),reason,at:date(a.at_utc),source:r.source,first_attempt:boolean(a.first_attempt),round:count(a.round),failure_kind:redact(a.failure_kind),failure_category:redact(a.failure_category),resolution_status:redact(a.resolution_status),verified_by:redact(a.verified_by),fixes:fixes(a.fixes),count:1,category:category(reason,redact(a.gate))});}
  const missing=phase.fail_attempts===null?null:phase.fail_attempts-history.length;
  if(missing>0||phase.fail_attempts===null&&failed.has(verdict)){
   const reason=(failed.has(verdict)&&(missing===1||missing===null)?redact(p.last_note):'')||(missing===null?'仅记录最近结果，未记录具体失败原因':'未记录具体失败原因');
   r.failure_details.push({phase:id,gate:phase.gate,reason,count:missing,category:category(reason,phase.gate),at:date(p.last_attempt_at_utc||p.last_result_at_utc),source:r.source});
  }
 }
 const analysis=d.session_failure_analysis;
 if(analysis!=null){if(!obj(analysis))fail('会话补充');const fs=array(analysis.findings).map(finding);
  for(const detail of r.failure_details){if(!detail.reason.includes('未记录具体失败原因'))continue;const related=fs.filter(f=>f.phase===detail.phase);if(!related.length)continue;
   const causes=related.filter(f=>!f.basis.includes('未证实计入')&&!f.reason.includes('无法确认是否计入')).map(f=>f.reason).join('；');
   detail.reason=causes?redact('阶段原因（无法逐次对应）：'+causes):'逐次门禁原因未记录；会话线索未证实计入失败次数';detail.category=causes?'阶段原因':'原因缺失';detail.session_findings=related;detail.session_scope=redact(analysis.scope);detail.session_source=redact(analysis.source);
  }
  if(analysis.later_outcome)r.session_later_outcome=redact(analysis.later_outcome);
 }
 r.human_interventions=array(d.human_interventions).map(i=>({category:redact(i.category),reason:redact(i.reason),phase:phaseId(i.phase)}));
 r.open_wait_details=array(d.human_wait_intervals).filter(w=>!w.ended_at_utc).map(w=>({phase:phaseId(w.phase),category:redact(w.category),reason:redact(w.reason),started_at_utc:date(w.started_at_utc)}));
 r.open_waits=count(summary.human_wait_open_count)??0;
 const active=r.phases.filter(p=>p.status!=='pending').sort((a,b)=>(Date.parse(a.opened_at)||0)-(Date.parse(b.opened_at)||0));const latest=active.at(-1),result=redact(d.result).toUpperCase();
 r.current_phase=latest?.id||'—';r.status=passed.has(result)?'completed':failed.has(result)?'blocked':r.open_waits?'waiting':latest?.status==='failed'?'blocked':latest?'running':'pending';
 if(!failed.has(result)&&r.phases.every(p=>p.closed_at&&p.status==='passed'))r.status='completed';
 r.failures=sum(r.phases.map(p=>p.fail_attempts));r.gate_attempts=sum(r.phases.map(p=>p.gate_attempts));
 for(const [out,key,field] of [['effective_seconds','workflow_effective_elapsed_seconds','effective_seconds'],['wall_seconds','workflow_wall_elapsed_seconds','wall_seconds'],['wait_seconds','workflow_human_wait_excluded_seconds','wait_seconds']])r[out]=number(summary[key])??sum(r.phases.map(p=>p[field]));
 for(const key of ['attempts','failures','passes','review_holds'])r['first_gate_'+key]=count(summary['first_gate_'+key+'_total']);r.unrecorded_gate_attempts=count(summary.unrecorded_gate_attempts_total);
 r.preflight_summary=d.preflight_summary==null?null:{attempts:count(d.preflight_summary.attempts),failed_attempts:count(d.preflight_summary.failed_attempts),issues:count(d.preflight_summary.issues)};
 r.preflight_failures=array(d.preflight_history).filter(a=>a.status!=='PASS').map(a=>({id:redact(a.id),phase:phaseId(a.phase),at:date(a.at_utc),status:redact(a.status),policy_version:count(a.policy_version),verified_by:redact(a.verified_by),resolution_status:redact(a.resolution_status),checks:array(a.checks).filter(c=>c.status!=='PASS').map(c=>({id:redact(c.id),status:redact(c.status),reason:redact(c.reason),rule_ids:[...new Set(redact(c.output).match(/\b(?:OAT\.\d+|H[1-5]\.[A-Z0-9_]+|G\.[A-Z]+\.\d+(?:-CPP)?|WordsTool\.\d+)\b/g)||[])].sort()})),fixes:array(a.fixes).map(f=>({cause:redact(f.cause),action:redact(f.action),verification_status:redact(f.verification_status)}))}));
 r.recording_quality=quality(d);return r;
}

// Explicit shapes also protect backups/public snapshots from extra untrusted fields.
function project(value,shape){if(!obj(value))fail('快照对象');const out={};for(const [key,type] of Object.entries(shape)){const v=value[key];out[key]=type==='s'?redact(v):type==='n'?number(v):type==='c'?count(v):type==='b'?boolean(v):type==='d'?date(v):typeof type==='function'?type(v):project(v??{},type);}return out;}
const textList=v=>array(v).map(redact),list=shape=>v=>array(v).map(x=>project(x,shape));
const findingShape={phase:'s',reason:'s',action:'s',outcome:'s',basis:'s',evidence_refs:textList};
const failureShape={id:'s',phase:'s',gate:'s',reason:'s',at:'d',source:'s',first_attempt:'b',round:'c',failure_kind:'s',failure_category:'s',resolution_status:'s',verified_by:'s',count:'c',category:'s',fixes:list({root_cause:'s',action:'s',change_ref:'s',verification_verdict:'s'}),session_findings:list(findingShape),session_scope:'s',session_source:'s'};
const phaseShape={id:'s',name:'s',status:'s',wall_seconds:'n',wait_seconds:'n',effective_seconds:'n',gate_attempts:'c',pass_attempts:'c',fail_attempts:'c',stage_attempts:'c',rounds:'c',skills:textList,gate:'s',opened_at:'d',closed_at:'d',rounds_detail:list({opened_at:'d',closed_at:'d',kind:'s',interrupted:'b'}),upload_wait_history:v=>v==null?null:list({kind:'s',reason:'s',at:'d',pr:'c'})(v)};
const runShape={id:'s',workflow:'s',kind:'s',status:'s',current_phase:'s',agent:'s',model:'s',updated_at:'d',started_at:'d',source:'s',phases:list(phaseShape),failure_details:list(failureShape),failures:'c',gate_attempts:'c',human_interventions:list({category:'s',reason:'s',phase:'s'}),open_waits:'c',open_wait_details:list({phase:'s',category:'s',reason:'s',started_at_utc:'d'}),effective_seconds:'n',wall_seconds:'n',wait_seconds:'n',first_gate_attempts:'c',first_gate_failures:'c',first_gate_passes:'c',first_gate_review_holds:'c',unrecorded_gate_attempts:'c',preflight_summary:v=>v==null?null:project(v,{attempts:'c',failed_attempts:'c',issues:'c'}),preflight_failures:list({id:'s',phase:'s',at:'d',status:'s',policy_version:'c',verified_by:'s',resolution_status:'s',checks:list({id:'s',status:'s',reason:'s',rule_ids:textList}),fixes:list({cause:'s',action:'s',verification_status:'s'})}),session_later_outcome:'s',recording_quality:{status:'s',initialization_count:'c',note:'s'},import_origin:'s'};
export function validateSnapshot(snapshot){
 if(!obj(snapshot)||snapshot.schema_version!==1||!Array.isArray(snapshot.runs)||snapshot.runs.length>2000)fail('快照版本 / runs');
 const runs=snapshot.runs.map(v=>{const r=project(v,runShape);if(!r.id||!r.workflow||!r.phases.length||excluded.has(r.id))fail('运行标识 / 阶段');
  const ids=new Set();for(const p of r.phases){phaseId(p.id);if(ids.has(p.id)||(r.kind==='AR'?!p.id.startsWith('P'):!p.id.startsWith('R')))fail('重复或混合阶段');ids.add(p.id);if(!['pending','running','passed','failed'].includes(p.status))fail('阶段状态');
   if(p.gate_attempts!==null&&p.fail_attempts!==null&&p.fail_attempts>p.gate_attempts)fail('失败次数超过尝试次数');
  }
  for(const [totalKey,phaseKey] of [['failures','fail_attempts'],['gate_attempts','gate_attempts']]){const expected=sum(r.phases.map(p=>p[phaseKey]));if(r[totalKey]!==null&&expected!==null&&r[totalKey]!==expected)fail('汇总计数与阶段不一致');}
  if(!['completed','blocked','waiting','running','pending'].includes(r.status)||!['AR','Requirement'].includes(r.kind))fail('运行状态');
  if(!['complete','incomplete','unknown'].includes(r.recording_quality.status))r.recording_quality={status:'unknown',initialization_count:null,note:'历史完整性未验证。'};
  if(r.id==='20261009-fd-leak-detect'&&r.started_at==='2026-10-09T12:50:46Z')r.recording_quality=quality({run_id:r.id,started_at_utc:r.started_at});
  if(v.import_origin!=='browser')delete r.import_origin;return r;});
 return {schema_version:1,generated_at:date(snapshot.generated_at),source_label:redact(snapshot.source_label),source_count:count(snapshot.source_count)??runs.length,duplicate_count:count(snapshot.duplicate_count)??0,warnings:array(snapshot.warnings).map(redact),runs,redacted:true,redaction_scope:'sensitive_fragments'};
}
export async function loadPublishedSnapshot(fetcher=fetch){
 const response=await fetcher('./data.json',{cache:'no-store'});
 if(response.status===404)return validateSnapshot({schema_version:1,runs:[],source_label:'尚未发布共享指标'});
 if(!response.ok)throw Error('数据文件暂时无法读取');
 return validateSnapshot(await response.json());
}
export function parseImport(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_FILE_BYTES)throw Error('文件不能超过 10 MB');
 let d;try{d=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('JSON 无法解析，请检查文件格式');}
 const runs=d?.schema_version===2?[normalizeMetrics(d)]:validateSnapshot(d).runs;
 if(!runs.length)throw Error('没有可导入的运行记录');
 return runs.map(r=>({...r,source:sourceFor(r),import_origin:'browser'}));
}
const key=r=>JSON.stringify([r.workflow,r.id]);
export function mergeRuns(base,incoming){const map=new Map(base.map(r=>[key(r),r]));for(const r of incoming){const old=map.get(key(r));if(!old||(Date.parse(r.updated_at)||0)>(Date.parse(old.updated_at)||0))map.set(key(r),r);}return [...map.values()].sort((a,b)=>(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0));}
export function previewChanges(base,incoming){const before=new Map(base.map(r=>[key(r),r])),rows=mergeRuns([],incoming);return rows.map(r=>({run:r,action:!before.has(key(r))?'新增':(Date.parse(r.updated_at)||0)>(Date.parse(before.get(key(r)).updated_at)||0)?'更新':'已存在或版本较旧'}));}
export function mergeSnapshot(base,imports){const valid=validateSnapshot(base);return {...valid,runs:mergeRuns(valid.runs,imports),source_count:mergeRuns(valid.runs,imports).length};}
export function loadLocalRuns(storage){try{const text=storage.getItem(STORAGE_KEY);return {runs:text?validateSnapshot(JSON.parse(text)).runs:[],error:null};}catch{return {runs:[],error:'浏览器导入记录无法读取。原缓存未删除，请导出备份或清除后重新导入。'};}}
export function saveLocalRuns(storage,runs){const snapshot=validateSnapshot({schema_version:1,runs});try{storage.setItem(STORAGE_KEY,JSON.stringify(snapshot));}catch{throw Error('浏览器无法保存数据，可能是存储空间不足或存储被禁用；本次未应用，请先导出备份。');}}
export function clearLocalRuns(storage){storage.removeItem(STORAGE_KEY);}
