import {parseImport,redact,mergeRuns,previewChanges,mergeSnapshot,loadLocalRuns,saveLocalRuns,clearLocalRuns,MAX_FILE_BYTES} from './import-data.mjs';
import {preparePublish,commitPublish} from './publish-data.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=v=>v==null?'—':v;
const date=v=>v?new Date(v).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未记录';
const storage=()=>{try{return window.localStorage;}catch{return {getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};}};
function previewDetail(r){
 const phases=r.phases.map(p=>`<p><b>${esc(p.id)} ${esc(p.name)}</b> · 有效 ${count(p.effective_seconds)} 秒 · 等待 ${count(p.wait_seconds)} 秒 · 失败 ${count(p.fail_attempts)} / ${count(p.gate_attempts)}</p>`).join('');
 const failures=r.failure_details.map(d=>`<article><b>${esc(d.phase)} · ${esc(d.gate)||'未记录门禁'}</b><p>${esc(d.reason)}</p>${(d.fixes||[]).map(f=>`<p>根因：${esc(f.root_cause)||'未记录'}；修改：${esc(f.action)||'未记录'} ${esc(f.change_ref)}；复验：${esc(f.verification_verdict)||'待复验'}</p>`).join('')}${(d.session_findings||[]).map(f=>`<p>${esc(f.reason)}；处理：${esc(f.action)}；结果：${esc(f.outcome)}；${esc(f.basis)} ${esc((f.evidence_refs||[]).join('、'))}</p>`).join('')}<p>修复状态：${esc(d.resolution_status)||'未记录'} · ${esc(d.at)}</p></article>`).join('');
 const preflights=(r.preflight_failures||[]).map(f=>`<article><b>${esc(f.phase)} 预检 ${esc(f.id)}</b>${f.checks.map(c=>`<p>${esc(c.id)}：${esc(c.reason)} ${esc(c.rule_ids.join('、'))}</p>`).join('')}${f.fixes.map(x=>`<p>根因：${esc(x.cause)}；修改：${esc(x.action)}；复验：${esc(x.verification_status)}</p>`).join('')}</article>`).join('');
 const interventions=r.human_interventions.map(i=>`<p>${esc(i.phase)} ${esc(i.category)}：${esc(i.reason)}</p>`).join('');
 return `<details><summary>查看将保存的明细</summary><div class="import-run-detail"><p>模型：${esc(r.agent)} / ${esc(r.model)} · 状态：${esc(r.status)}</p><p>历史完整性：${esc(r.recording_quality?.note)||'未验证'}</p>${phases}<h4>失败原因、修改与复验</h4>${failures||'<p>没有记录失败原因</p>'}${preflights?'<h4>预检记录</h4>'+preflights:''}${interventions?'<h4>人工介入</h4>'+interventions:''}${r.session_later_outcome?'<p>后续进展：'+esc(r.session_later_outcome)+'</p>':''}</div></details>`;
}
export function createImportController({getSnapshot,onChange}){
 const $=id=>document.getElementById(id),dialog=$('import-dialog');
 let local=[],pending=[],draft=null,busy=false,revision=0;
 const candidates=()=>mergeRuns(local,pending);
 function message(id,text,error=false){$(id).textContent=text;$(id).hidden=!text;$(id).classList.toggle('error',error);}
 function invalidate(){draft=null;$('publish-review').hidden=true;$('confirm-publish').disabled=true;}
 function preview(){
  const runs=candidates(),rows=previewChanges(getSnapshot().runs,runs);$('import-count').textContent=runs.length;
  $('import-preview-rows').innerHTML=rows.map(({run:r,action})=>`<tr><td><b>${esc(r.id)}</b><div class="run-meta">${date(r.updated_at)}</div>${previewDetail(r)}</td><td>${esc(r.kind)}</td><td>${count(r.failures)} / ${count(r.gate_attempts)}</td><td>${esc(action)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">请选择文件；已保存的浏览器导入也会出现在这里。</td></tr>';
  $('save-import').disabled=busy||!pending.length;$('export-import').disabled=busy||!runs.length;$('clear-import').disabled=busy||(!runs.length&&!loadLocalRuns(storage()).error);
  $('prepare-publish').disabled=busy||!runs.length;$('close-import').disabled=busy;$('import-files').disabled=busy;$('admin-token').disabled=busy;
  $('confirm-publish').disabled=busy||!draft?.changes.some(c=>c.action==='新增'||c.action==='更新');
 }
 function apply(){onChange(mergeSnapshot(getSnapshot(),local),local.length);}
 function refreshFromStorage(){const cached=loadLocalRuns(storage());local=cached.runs;invalidate();preview();apply();if(cached.error)message('import-errors',cached.error,true);}
 function open(){refreshFromStorage();if(!dialog.open)dialog.showModal();}
 $('open-import').addEventListener('click',open);
 $('close-import').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 dialog.addEventListener('close',()=>{$('admin-token').value='';invalidate();revision++;});
 window.addEventListener('pagehide',()=>{$('admin-token').value='';invalidate();});
 $('admin-token').addEventListener('input',invalidate);
 $('import-files').addEventListener('change',async()=>{
  const rev=++revision;invalidate();pending=[];message('publish-result','');message('import-message','正在读取并去敏…');message('import-errors','');busy=true;preview();
  const files=Array.from($('import-files').files||[]),errors=[],runs=[];
  if(files.length>20)errors.push('一次最多选择 20 份文件，请减少文件数量后重新选择');
  else for(const file of files){try{if(file.size>MAX_FILE_BYTES)throw Error('文件不能超过 10 MB');let text;try{text=await file.text();}catch{throw Error('文件无法读取，请重新选择');}runs.push(...parseImport(text));}catch(e){errors.push(`${redact(file.name)}：${e.message}`);}}
  busy=false;if(rev!==revision){preview();return;}
  pending=mergeRuns([],runs);if(mergeRuns(local,pending).length>2000){pending=[];errors.push('浏览器导入总数不能超过 2000 条，请先备份并归档历史记录');}preview();message('import-errors',errors.join('\n'),true);message('import-message',`已读取 ${pending.length} 条有效运行${errors.length?`，${errors.length} 项未导入`:''}。尚未保存或上传，请核对预览。`);
 });
 $('save-import').addEventListener('click',()=>{
  try{const next=candidates();saveLocalRuns(storage(),next);local=next;pending=[];invalidate();apply();preview();message('import-errors','');message('import-message','已保存在当前浏览器并更新统计，其他访问者尚不可见。管理员可继续发布。');}catch(e){message('import-errors',e.message,true);}
 });
 $('clear-import').addEventListener('click',()=>{
  if(!window.confirm('清除本浏览器的导入记录和待导入文件？已发布的共享记录不会删除。'))return;
  try{clearLocalRuns(storage());local=[];pending=[];$('import-files').value='';invalidate();apply();preview();message('import-errors','');message('import-message','已清除本浏览器导入，共享快照保留。');}catch{message('import-errors','浏览器无法清除缓存，请检查存储权限。',true);}
 });
 $('export-import').addEventListener('click',()=>{
  const snapshot=mergeSnapshot({schema_version:1,runs:[],generated_at:new Date().toISOString(),source_label:'浏览器导入备份'},candidates());
  const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='workflow-metrics-imports.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('prepare-publish').addEventListener('click',async()=>{
  invalidate();message('publish-result','');const rev=++revision;busy=true;preview();message('publish-review','正在检查写入权限和云端最新版本，尚未上传…');
  try{const next=await preparePublish($('admin-token').value,candidates());if(rev!==revision)return;draft=next;const n=next.changes.filter(c=>['新增','更新'].includes(c.action)).length;
   message('publish-review',`管理员 ${redact(next.account)} · 将公开 ${n} 条新增或更新运行；共享快照共 ${next.snapshot.runs.length} 条。\n`+next.changes.map(c=>`${c.run.id}：${c.action}`).join('\n')+'\n请核对上面的去敏明细，再点击“确认公开并发布”。');
  }catch(e){$('admin-token').value='';message('publish-review',e.message,true);}finally{busy=false;preview();}
 });
 $('confirm-publish').addEventListener('click',async()=>{
  if(!draft||busy)return;busy=true;preview();message('publish-result','正在提交共享快照，请稍候…');
  try{const result=await commitPublish($('admin-token').value,draft);
   message('publish-result','共享快照已提交，网站部署中。稍后点击“刷新快照”查看公开数据。');
   const a=document.createElement('a');a.href=result.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=' 查看此次提交 ↗';$('publish-result').append(a);
   message('import-message','已发布到 GitHub。网站部署完成后，所有访问者无需登录即可查看。');
  }catch(e){message('publish-result',e.message,true);}finally{$('admin-token').value='';invalidate();busy=false;preview();}
 });
 window.addEventListener('storage',e=>{if(e.key==='workflow-metrics.browser-imports.v1')refreshFromStorage();});
 window.addEventListener('hashchange',()=>{if(location.hash==='#import')open();});
 refreshFromStorage();if(location.hash==='#import')open();
 return {refreshFromStorage,setBase(){invalidate();preview();apply();}};
}
