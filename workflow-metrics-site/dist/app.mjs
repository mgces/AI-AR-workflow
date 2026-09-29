import {summarize,filterRuns,phaseTotals,phaseFailureRuns,runStatusExplanation,known} from './analytics.mjs';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={completed:'已完成',running:'进行中',blocked:'受阻',waiting:'等待人工',pending:'未开始',passed:'已通过',failed:'失败'};
const phaseNames={P0:'环境准备',P1:'设计',P2:'代码开发',P3:'测试开发',P4:'编译验证',P5:'单元测试',P6:'功能测试',P7:'质量验证',P8:'上库评审',R1:'需求导入',R2:'可行性',R3:'架构决策',R4:'特性基线',R5:'评审门禁',R6:'评审决策',R7:'IR / SR',R8:'交接',R9:'生成 AR'};
const interventionLabels={required_workflow:'流程内审核',blocked_unplanned:'非计划解阻',user_correction:'用户纠偏'};
const resolutionLabels={unresolved:'尚未复验',pending_verification:'修改已记录，待重跑',resolved:'修改后门禁通过',not_resolved:'相同原因仍失败',gate_still_failed_different_reason:'门禁仍失败，但报错已变化；原根因是否解决待确认',passed_without_recorded_fix:'重跑通过，未记录修改',failed_again_without_recorded_fix:'再次失败，未记录修改',review_hold_released:'人工确认后放行'};
let data={runs:[],warnings:[]};
let selected=[];
const fmt=n=>known(n)?n.toLocaleString('zh-CN',{maximumFractionDigits:1}):'—';
function duration(n){if(!known(n))return '—';if(n<60)return `${fmt(n)} 秒`;if(n<3600)return `${Math.floor(n/60)} 分 ${Math.floor(n%60)} 秒`;return `${Math.floor(n/3600)} 时 ${Math.floor(n%3600/60)} 分`;}
function compact(n){if(!known(n))return '—';if(n>=3600)return `${(n/3600).toFixed(1)}h`;if(n>=60)return `${(n/60).toFixed(1)}m`;return `${fmt(n)}s`;}
function date(value){const d=new Date(value);return Number.isNaN(d.valueOf())?'未记录':new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);}
const badge=(s,source='')=>source&&s!=='completed' ? `<button type="button" class="badge status-action ${esc(s)}" data-status-run="${esc(source)}" aria-label="查看${esc(labels[s]||s)}状态说明">${esc(labels[s]||s)}</button>` : `<span class="badge ${esc(s)}">${esc(labels[s]||s)}</span>`;
function filters(){return {query:$('search').value,kind:$('kind').value,model:$('model').value,status:$('status').value};}
function render(){
 selected=filterRuns(data.runs,filters());const s=summarize(selected), phases=phaseTotals(selected);
 $('live-summary').textContent=`当前显示 ${s.count} 次运行，已记录 ${fmt(s.failures)} 次门禁失败。`;
 $('metrics').innerHTML=[
  ['累计有效耗时',duration(s.effective),`单次平均 ${duration(s.average)} · ${s.durationSamples} 个有效样本`,'featured','◷'],
  ['运行总数',`${s.count}<small>次</small>`,`已完成 ${s.completed} · 有失败历史 ${s.failureRuns}`,'','▤'],
  ['门禁失败',`${fmt(s.failures)}<small>次</small>`,`失败率 ${s.failureRate===null?'—':s.failureRate.toFixed(1)+'%'} · ${fmt(s.attempts)} 次尝试`,'','⊗'],
  ['首次通过率',s.firstPassRate===null?'—':`${s.firstPassRate.toFixed(1)}<small>%</small>`,s.firstAttempts===null?'旧记录缺少逐次历史':`首次通过 ${fmt(s.firstPasses)} / ${fmt(s.firstAttempts)} · 首次失败 ${fmt(s.firstFailures)}`,'','◎'],
  ['人工等待',duration(s.wait),`阶段墙钟累计 ${duration(s.wall)}`,'','◴']
 ].map(([title,value,note,cls,icon])=>`<article class="metric ${cls}"><div class="metric-label">${title}<span class="metric-icon" aria-hidden="true">${icon}</span></div><div class="metric-value">${value}</div><p class="metric-note">${note}</p></article>`).join('');
 const wall=$('time-mode').value==='wall';
 const max=Math.max(1,...phases.map(p=>wall?(p.effective_seconds||0)+(p.wait_seconds||0):p.effective_seconds||0));
 $('phase-chart').innerHTML=phases.length?phases.map(p=>`<div class="bar-row"><span class="bar-label"><b>${esc(p.id)}</b>${esc(phaseNames[p.id]||'阶段')}</span><div class="bar-track" role="img" aria-label="${esc(p.id)}：有效 ${duration(p.effective_seconds)}，等待 ${duration(p.wait_seconds)}"><i class="blue" style="width:${(p.effective_seconds||0)/max*100}%"></i>${wall?`<i class="light-blue" style="width:${(p.wait_seconds||0)/max*100}%"></i>`:''}</div><span class="bar-number" title="${duration(wall?p.wall_seconds:p.effective_seconds)}">${compact(wall?p.wall_seconds:p.effective_seconds)}</span></div>`).join(''):'<p class="empty">暂无阶段数据</p>';
 const bottleneck=[...phases].filter(p=>known(p.effective_seconds)).sort((a,b)=>b.effective_seconds-a.effective_seconds)[0];
 $('timing-note').textContent=bottleneck?`有效耗时最多：${bottleneck.id} ${phaseNames[bottleneck.id]||''} · ${duration(bottleneck.effective_seconds)}`:'未记录有效耗时';
 const maxFail=Math.max(1,...phases.map(p=>p.failures||0));
 $('failure-chart').innerHTML=`<div class="failure-stats"><div><strong>${s.failureRate===null?'—':s.failureRate.toFixed(1)+'%'}</strong> <span>门禁失败率</span></div><span>${s.failureRuns} 次运行存在失败记录</span></div><div class="failure-bars">${phases.map(p=>`<button class="failure-col" type="button" data-phase="${esc(p.id)}" title="查看 ${esc(p.id)} 对应运行的失败详情" aria-label="查看 ${esc(p.id)} ${esc(phaseNames[p.id]||'阶段')}的 ${fmt(p.failures)} 次失败与对应运行"><span class="n">${fmt(p.failures)}</span><span class="column ${p.failures===maxFail?'strong':''} ${p.failures?'':'zero'}" style="height:${(p.failures||0)/maxFail*135}px"></span><span class="name">${esc(p.id)}</span></button>`).join('')}</div>`;
 const details=selected.flatMap(r=>r.failure_details.map(d=>({...d,run:r})));
 const missing=details.filter(d=>d.session_findings?.length||d.reason.includes('未记录具体失败原因')).reduce((n,d)=>n+(d.count||0),0);
 const sessionFindingCount=details.reduce((n,d)=>n+(d.session_findings?.length||0),0);
 const firstReasons=[...new Set(details.filter(d=>d.first_attempt===true&&d.failure_kind!=='expected_review_hold'&&d.reason!=='未记录具体失败原因').map(d=>d.reason))];
 $('failure-note').textContent=`${missing} 次失败缺少逐次原始原因${sessionFindingCount?` · 已补 ${sessionFindingCount} 条阶段级会话线索`:''}${s.unknownFailureRuns?` · ${s.unknownFailureRuns} 次运行缺少历史失败计数`:''}。${s.firstAttempts===null?'旧记录没有逐次首轮证据。':`首轮失败 ${fmt(s.firstFailures)} 次，其中人工审核停点 ${fmt(s.firstReviewHolds||0)} 次。${firstReasons.length?'首轮原因：'+firstReasons.slice(0,2).join('；').slice(0,120):''}`}`;
 $('run-count').textContent=s.count;
 $('run-rows').innerHTML=selected.map(r=>`<tr><td><button class="run-link" data-run="${esc(r.source)}">${esc(r.id)}</button><div class="run-meta">${esc(r.agent)} / ${esc(r.model)} · ${date(r.updated_at)}</div></td><td>${badge(r.status,r.source)}</td><td>${duration(r.effective_seconds)}</td><td class="muted">${duration(r.wait_seconds)}</td><td><span class="${r.failures?'failure-count':''}">${fmt(r.failures)}</span> <span class="muted">/ ${fmt(r.gate_attempts)}</span></td><td><div class="phase-dots" aria-label="各阶段状态">${r.phases.map(p=>`<span class="${esc(p.status)}" title="${esc(p.id)} ${esc(labels[p.status])}"></span>`).join('')}</div><span class="progress-note">${r.phases.filter(p=>p.closed_at).length} / ${r.phases.length} 阶段已关闭</span></td><td><button class="text-button" data-run="${esc(r.source)}" aria-label="查看 ${esc(r.id)} 详情">详情 ↗</button></td></tr>`).join('');
 $('empty').hidden=selected.length>0;
 const reasons=new Map();for(const d of details){const key=d.reason;const v=reasons.get(key)||{reason:key,count:0,unknown:0,category:d.category,example:d};v.count+=d.count||0;v.unknown+=d.count===null?1:0;reasons.set(key,v);}
 $('reason-list').innerHTML=[...reasons.values()].sort((a,b)=>b.count-a.count).map(r=>`<article class="reason-item"><div class="reason-head"><b>${esc(r.category)}</b><span class="small-tag">${r.count?fmt(r.count)+' 次':''}${r.unknown?' 最近失败记录 '+r.unknown+' 条':''}</span></div><p>${esc(r.reason)}</p>${r.example.session_findings?.length?sessionEvidenceHtml(r.example):''}</article>`).join('')||'<p class="empty">当前范围没有失败记录</p>';
 const interventions=selected.flatMap(r=>r.human_interventions.filter(i=>i.category!=='required_workflow').map(i=>({...i,run:r})));
 $('intervention-list').innerHTML=interventions.map(i=>`<article class="reason-item"><div class="reason-head"><b>${esc(i.phase)} · ${esc(interventionLabels[i.category]||i.category)}</b></div><p>${esc(i.reason)}</p><button class="text-button" data-run="${esc(i.run.source)}">${esc(i.run.id)} ↗</button></article>`).join('')||'<p class="empty">没有记录非计划人工介入</p>';
 $('quality-notes').innerHTML=data.warnings.map(w=>`<p class="quality-warning">${esc(w)}</p>`).join('')+`<p class="quality-warning">${data.duplicate_count||0} 份重复运行快照已去重；状态与耗时均截至指标更新时间。${data.redacted?'公开版仅遮掩敏感片段；':''}在线页面展示已发布快照，本机新增文件需重新导出并发布。</p>`;
}
function fixDetails(d){
 const fixes=(d.fixes||[]).map(f=>`<p class="fix-line">根因：${esc(f.root_cause)||'未记录'} · 修改：${esc(f.action)||'未填写'}${f.change_ref?' · '+esc(f.change_ref):''} · 复验：${f.verification_verdict==='PASS'?'通过':f.verification_verdict==='FAIL'?'仍失败':'待重跑'}</p>`).join('');
 if(d.session_findings?.length)return `${fixes}${sessionEvidenceHtml(d)}`;
 return `${fixes}<p class="source">${d.first_attempt===true?'首次尝试 · ':d.first_attempt===false?'重试 · ':''}${d.failure_kind==='expected_review_hold'?'预期人工审核停点 · ':''}${esc(resolutionLabels[d.resolution_status]|| (d.resolution_status?'状态未知':'历史记录未提供修复结果'))}${d.verified_by?' · 复验 '+esc(d.verified_by):''}</p>`;
}
function sessionEvidenceHtml(detail){
 return `<div class="session-evidence"><p class="source">${esc(detail.session_scope)} 来源：${esc(detail.session_source)}</p>${detail.session_findings.map(f=>`<div class="session-evidence-item"><b>${esc(f.reason)}</b><p>处理：${esc(f.action)||'未记录'}</p><p>结果：${esc(f.outcome)||'未记录'}</p><p class="source">${esc(f.basis)}${f.evidence_refs?.length?' · '+esc(f.evidence_refs.join('、')):''}</p></div>`).join('')}</div>`;
}
function openStatus(source){
 const run=data.runs.find(item=>item.source===source);
 if(!run||run.status==='completed')return;
 $('status-title').textContent=`${run.id} · ${labels[run.status]||run.status}`;
 $('status-explanation').textContent=runStatusExplanation(run,phaseNames,date);
 $('status-dialog').showModal();
}
function openPhase(phaseId){
 const phase=phaseTotals(selected).find(item=>item.id===phaseId);
 if(!phase)return;
 const rows=phaseFailureRuns(selected,phaseId);
 $('detail-kind').textContent='PHASE INSPECTOR';
 $('detail-title').textContent=`${phaseId} ${phaseNames[phaseId]||'阶段'} · 失败明细`;
 $('detail-content').innerHTML=`<div class="detail-meta"><span>${fmt(phase.failures)} 次失败 / ${fmt(phase.attempts)} 次门禁尝试</span><span>${rows.length} 次运行涉及失败</span></div><div class="phase-run-list">${rows.map(({run,phase:runPhase,details})=>`<section class="phase-run"><div class="reason-head"><div><button class="run-link" data-run="${esc(run.source)}">${esc(run.id)} ↗</button><p class="run-meta">${esc(run.model)} · ${badge(run.status,run.source)}</p></div><span class="small-tag">${fmt(runPhase.fail_attempts)} 次失败 / ${fmt(runPhase.gate_attempts)} 次尝试</span></div><div class="reason-list">${details.map(d=>`<article class="reason-item"><div class="reason-head"><b>${esc(d.gate)||'门禁未记录'}</b><span class="small-tag">${d.count===null?'仅最近结果':fmt(d.count)+' 次'}</span></div><p>${esc(d.reason)}</p>${fixDetails(d)}<p class="source">${esc(d.source)}${d.at?' · '+date(d.at):''}</p></article>`).join('')||'<p class="muted">此运行只有失败计数，缺少逐次原因</p>'}</div></section>`).join('')||'<p class="empty">当前筛选范围内，这个阶段没有失败记录。</p>'}</div>`;
 if(!$('detail').open)$('detail').showModal();
}
function detail(source){
 const r=data.runs.find(r=>r.source===source);if(!r)return;
 const alreadyOpen=$('detail').open;
 $('detail-kind').textContent='RUN INSPECTOR';
 $('detail-title').textContent=r.id;
 $('detail-content').innerHTML=`<div class="detail-meta">${badge(r.status,r.source)}<span>${esc(r.kind)} · ${esc(r.agent)} / ${esc(r.model)}</span><span>指标更新 ${date(r.updated_at)}</span></div><div class="detail-kpis"><div>有效耗时<strong>${duration(r.effective_seconds)}</strong></div><div>人工等待<strong>${duration(r.wait_seconds)}</strong></div><div>门禁失败 / 尝试<strong>${fmt(r.failures)} / ${fmt(r.gate_attempts)}</strong></div></div><h3>阶段明细</h3><div class="table-wrap"><table><thead><tr><th>阶段</th><th>最近结果</th><th>有效耗时</th><th>人工等待</th><th>失败 / 尝试</th><th>轮次</th><th>最近门禁</th></tr></thead><tbody>${r.phases.map(p=>`<tr><td title="${esc(p.name)}">${esc(p.id)} ${esc(phaseNames[p.id]||p.name)}</td><td>${badge(p.status)}</td><td>${duration(p.effective_seconds)}</td><td>${duration(p.wait_seconds)}</td><td>${fmt(p.fail_attempts)} / ${fmt(p.gate_attempts)}</td><td>${p.rounds}</td><td>${esc(p.gate)||'—'}</td></tr>`).join('')}</tbody></table></div><section class="detail-section"><h3>失败原因、修改与复验</h3><div class="reason-list">${r.failure_details.map(d=>`<article class="reason-item"><div class="reason-head"><b>${esc(d.phase)} · ${esc(d.gate)||'门禁未记录'}</b><span class="small-tag">${d.count===null?'仅最近结果':d.count+' 次失败'}</span></div><p>${esc(d.reason)}</p>${fixDetails(d)}<p class="source">来源：${esc(d.source)}${d.at?' · '+date(d.at):''}</p></article>`).join('')||'<p class="muted">没有记录失败</p>'}</div></section><section class="detail-section"><h3>人工介入说明（${r.human_interventions.length}）</h3><div class="reason-list">${r.human_interventions.map(i=>`<article class="reason-item"><div class="reason-head"><b>${esc(i.phase)} · ${esc(interventionLabels[i.category]||i.category)}</b></div><p>${esc(i.reason)||'未填写原因'}</p></article>`).join('')||'<p class="muted">没有记录人工介入</p>'}</div></section><p class="detail-source">指标来源：${esc(r.source)}<br>快照状态由最近阶段结果与等待记录推断。历史 FAIL 不意味着该运行最终失败。${r.session_later_outcome?`<br>后续进展：${esc(r.session_later_outcome)}`:''}</p>`;
 if(!alreadyOpen)$('detail').showModal();else $('close-detail').focus();
}
async function load(){
 $('refresh').disabled=true;$('load-error').hidden=true;
 try{const response=await fetch('./data.json',{cache:'no-store'});if(!response.ok)throw Error('数据文件暂时无法读取');const next=await response.json();if(!Array.isArray(next.runs)||next.schema_version!==1)throw Error('数据快照格式不兼容');data=next;
  for(const [id,key,label] of [['kind','kind','全部工作流'],['model','model','全部模型']]){const current=$(id).value;$(id).innerHTML=`<option value="">${label}</option>`+[...new Set(data.runs.map(r=>r[key]))].sort().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if([...$(id).options].some(o=>o.value===current))$(id).value=current;}
  $('snapshot-time').textContent=`快照生成 ${date(data.generated_at)}`;
  const dates=data.runs.map(r=>r.updated_at).filter(Boolean).sort();
  $('source-info').textContent=`${data.source_count} 份指标文件${dates.length?' · 指标最近更新 '+date(dates.at(-1)):''}`;
  render();
 }catch(error){$('load-error').textContent=`${error.message}。请点击“刷新快照”重试。${data.runs.length?'当前保留上次成功读取的数据。':''}`;$('load-error').hidden=false;if(!data.runs.length)render();}
 finally{$('refresh').disabled=false;}
}
function reset(){for(const id of ['search','kind','model','status'])$(id).value='';render();}
for(const id of ['kind','model','status','time-mode'])$(id).addEventListener('change',render);
$('search').addEventListener('input',render);$('reset').addEventListener('click',reset);$('empty-reset').addEventListener('click',reset);$('refresh').addEventListener('click',load);
document.addEventListener('click',event=>{const status=event.target.closest('[data-status-run]');if(status){openStatus(status.dataset.statusRun);return;}const phase=event.target.closest('[data-phase]');if(phase){openPhase(phase.dataset.phase);return;}const button=event.target.closest('[data-run]');if(button)detail(button.dataset.run);});
$('close-detail').addEventListener('click',()=>$('detail').close());
$('detail').addEventListener('click',event=>{if(event.target===$('detail')){const r=$('detail').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('detail').close();}});
$('close-status').addEventListener('click',()=>$('status-dialog').close());
$('status-dialog').addEventListener('click',event=>{if(event.target===$('status-dialog')){const r=$('status-dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('status-dialog').close();}});
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('nav a.active')?.classList.remove('active');a.classList.add('active');}));
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 try{Promise.resolve(document.modelContext.registerTool({
  name:'read_workflow_summary',title:'读取当前工作流统计',
  description:'读取页面当前筛选范围的耗时与失败统计，以及对应运行的标识，不修改页面状态。',
  inputSchema:{type:'object',properties:{},additionalProperties:false},
  annotations:{readOnlyHint:true,untrustedContentHint:true},
  execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw Error('输入必须为空对象');return {filters:filters(),summary:summarize(selected),runs:selected.map(r=>({id:r.id,status:r.status,failures:r.failures})),snapshot:data.generated_at||null};}
 },{signal:lifecycle.signal})).catch(()=>{});}catch{}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
load();
