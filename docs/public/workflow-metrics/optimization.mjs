import {plans,planUpdatedAt,priorityLabels,statusLabels,attributionLabels,scopeLabels,filterPlans,validatePlans,offlineAssessment,realRunAssessment} from './optimization-plan.mjs';
import {mergeSnapshot,loadLocalRuns} from './import-data.mjs';
import {failureReview,runName} from './failure-review.mjs';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list = values => '<ul>'+values.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>';
function caseHtml(c) {
  return '<article class="case"><button type="button" class="evidence-link" data-evidence-run="'+esc(c.runId)+'" data-evidence-phase="'+esc(c.phase)+'">'+esc(runName(c.runId))+' · '+esc(c.phase)+'</button>'+
    '<p class="scope scope-'+esc(c.scope)+'">'+esc(scopeLabels[c.scope])+(c.confidence==='inferred'?' · 根据会话顺序推断':'')+'</p><p>'+esc(c.reason)+'</p><p><strong>当时处理结果：</strong>'+esc(c.result)+'</p></article>';
}
function rowHtml(p) {
  const progress = [
    p.owner ? '<p class="progress-note">负责人：'+esc(p.owner)+'</p>' : '',
    p.changeRef ? '<p class="progress-note">实现记录：'+esc(p.changeRef)+'</p>' : '',
    p.regressionEvidence ? '<p class="progress-note">回归：'+esc(p.regressionEvidence)+'</p>' : '',
    p.effectEvidence ? '<p class="progress-note">效果验证：'+esc(p.effectEvidence)+'</p>' : ''
  ].join('');
  return '<tr><td><span class="item-id">'+esc(p.id)+'</span><strong class="item-title">'+esc(p.title)+'</strong><span class="tag priority-'+esc(p.priority)+'">'+esc(priorityLabels[p.priority])+'优先级</span><div>'+p.phases.map(s=>'<span class="tag">'+esc(s)+'</span>').join('')+'</div></td>'+
    '<td><p>'+esc(p.problem)+'</p>'+p.attributions.map(a=>'<span class="tag">'+esc(attributionLabels[a]||a)+'</span>').join('')+'</td>'+
    '<td>'+list(p.actions)+'<p class="benefit">'+esc(p.benefit)+'</p></td><td>'+list(p.acceptance)+'</td>'+
    '<td><span class="status status-'+esc(p.status)+'">'+esc(statusLabels[p.status])+'</span>'+progress+'<details><summary>失败案例与当时处理（'+p.sourceCases.length+'）</summary>'+p.sourceCases.map(caseHtml).join('')+'</details></td></tr>';
}
const priorities = {high:0,medium:1,low:2};
function render() {
  const filters = {query:$('plan-search').value,phase:$('plan-phase').value,attribution:$('plan-attribution').value,priority:$('plan-priority').value,status:$('plan-status').value};
  const matches = filterPlans(plans,filters).slice().sort((a,b)=>priorities[a.priority]-priorities[b.priority]||a.id.localeCompare(b.id));
  $('plan-count').textContent = matches.length+' / '+plans.length+' 项';
  $('plan-rows').innerHTML = matches.length ? matches.map(rowHtml).join('') : '<tr><td colspan="5" class="empty">没有符合筛选条件的改进项，请调整筛选或重置。</td></tr>';
}
function fillSelect(id, labels) {
  for (const [value,label] of Object.entries(labels)) {
    const option = document.createElement('option');option.value=value;option.textContent=label;$(id).append(option);
  }
}
let snapshotPromise;
async function snapshot() {
  if (!snapshotPromise) snapshotPromise = fetch('./data.json',{cache:'no-store'}).then(r=>{
    if(r.status===404)return {schema_version:1,runs:[]};
    if(!r.ok)throw new Error('快照暂不可用');
    return r.json();
  }).catch(e=>{snapshotPromise=null;throw e;});
  const base=await snapshotPromise;
  let imports=[];try{imports=loadLocalRuns(window.localStorage).runs;}catch{}
  return mergeSnapshot(base,imports);
}
const dialog = $('evidence-dialog');
async function showEvidence(runId,phase) {
  $('evidence-title').textContent = runName(runId)+' · '+phase+' 运行证据';
  $('evidence-content').textContent='正在读取当前指标快照…';
  dialog.showModal();
  try {
    const data = await snapshot();
    const run = (data.runs||[]).find(r=>r.id===runId);
    if (!run) { $('evidence-content').textContent='当前快照未收录该运行，请查看改进项中的历史线索。';return; }
    const details = (run.failure_details||[]).filter(d=>d.phase===phase);
    const meta = '<p class="evidence-meta">运行：'+esc(runName(run.id))+'<br>以下是当前快照的阶段证据；后续会话线索不能反推旧 FAIL。</p>';
    const body = details.map(d=>{
      const findings = (d.session_findings||[]).map(f=>'<article class="evidence-card"><strong>'+esc(f.reason)+'</strong><p>处理：'+esc(f.action||'未记录')+'</p><p>结果：'+esc(f.outcome||'未记录')+'</p><p class="evidence-meta">依据：'+esc(f.basis||'未记录')+(f.evidence_refs?.length?' · '+esc(f.evidence_refs.join('、')):'')+'</p></article>').join('');
      return '<article class="evidence-card"><strong>'+esc(d.gate||'门禁')+' · '+(d.count==null?'仅最近结果':esc(d.count)+' 次失败')+'</strong><p>'+esc(d.reason)+'</p><p>'+esc(resolutionText(d))+'</p>'+fixHtml(d.fixes)+findings+'</article>';
    }).join('');
    const preflights=(run.preflight_failures||[]).filter(f=>f.phase===phase).map(f=>'<article class="evidence-card"><strong>预检 '+esc(f.id)+'</strong>'+list((f.checks||[]).map(c=>c.id+'：'+c.reason+(c.rule_ids?.length?' · '+c.rule_ids.join('、'):'')))+'<p>'+esc(resolutionText(f))+'</p>'+fixHtml(f.fixes,true)+'</article>').join('');
    $('evidence-content').innerHTML=meta+(body||'<p>当前快照未记录该阶段的失败明细。改进项的手动排查或后续会话仍保留各自证据口径。</p>')+(preflights?'<h3>预检记录（单独统计）</h3>'+preflights:'')+(run.session_later_outcome?'<p class="evidence-meta">后续进展：'+esc(run.session_later_outcome)+'</p>':'');
  } catch(e) {
    $('evidence-content').textContent='暂时无法读取运行快照。改进项中仍保留失败原因、当时处理和证据口径。';
  }
}
const resolutionLabels={resolved:'修改后同检查复验通过',not_resolved:'修改后仍失败',pending_verification:'已登记修改，待复验',unresolved:'尚未复验',passed_without_recorded_fix:'重跑通过，未登记修改',failed_again_without_recorded_fix:'再次失败，未登记修改',gate_still_failed_different_reason:'门禁仍失败，报错已变化；原问题是否解决待确认',review_hold_released:'人工确认后放行'};
function resolutionText(item){if(item.resolution_status==='resolved'&&!item.fixes?.length)return '记录为已解决，未登记修改';return resolutionLabels[item.resolution_status]||'未记录修复与复验结论';}
function fixHtml(fixes,preflight=false){return (fixes||[]).map(f=>'<p class="fix-record">已登记根因：'+esc(preflight?f.cause:f.root_cause)+'<br>修改：'+esc(f.action)+'<br>记录的复验：'+esc(preflight?f.verification_status||'未记录':f.verification_verdict||'未记录')+'</p>').join('');}
const count=n=>n==null?'未知':String(n);
function reviewRow(row){
  const r=row.run;
  const phases=[...new Set([...row.details,...row.preflightDetails].map(d=>d.phase))];
  const observations=row.observations.length?row.observations.map(c=>'<li><strong>'+esc(c.phase)+'</strong> '+esc(c.reason)+'<p class="progress-note">'+esc(c.result)+'</p></li>').join(''):'<li>尚未人工归因，下面保留本次导入的原始原因与修复记录。</li>';
  const records=row.details.map(d=>'<article class="evidence-card"><strong>'+esc(d.phase)+' · '+esc(d.gate||'门禁')+' · '+(d.count==null?'次数未记录':esc(d.count)+' 次')+'</strong><p>'+esc(d.reason||'原因未记录')+'</p><p class="progress-note">'+esc(resolutionText(d))+'</p>'+fixHtml(d.fixes)+'</article>').join('');
  const links=phases.map(phase=>'<button class="evidence-link" data-evidence-run="'+esc(r.id)+'" data-evidence-phase="'+esc(phase)+'">'+esc(phase)+' 证据</button>').join(' · ');
  return '<tr><td><strong>'+esc(runName(r.id))+'</strong><p class="progress-note">'+esc(r.agent)+' / '+esc(r.model)+'</p><span class="status '+(row.reviewed?'':'status-in_progress')+'">'+(row.reviewed?'已纳入本轮复盘':'新增或更新 · 待人工复盘')+'</span>'+(r.recording_quality?.status==='incomplete'?'<p class="error">历史不完整，仅覆盖现有记录</p>':'')+'</td>'+
    '<td>'+count(r.failures)+' / '+count(r.gate_attempts)+'<p class="progress-note">缺原因 '+row.missing+' 次'+(row.stage?' · 阶段线索 '+row.stage+' 次':'')+'</p>'+(row.unknownDetailCounts?'<p class="progress-note">另有 '+row.unknownDetailCounts+' 条次数未知的明细</p>':'')+(row.countConflict?'<p class="error">明细计数超过汇总，待核对</p>':'')+'</td>'+
    '<td>'+count(row.preflight)+(row.preflight===null?'<p class="progress-note">未记录完整计数；不当作零</p>':' 次')+'<p class="progress-note">可查看 '+row.preflightDetails.length+' 条预检记录</p></td>'+
    '<td><details><summary>失败总结与处理结果（'+row.observations.length+' 条线索）</summary><ul class="review-observations">'+observations+'</ul></details><details><summary>原始门禁记录（'+row.details.length+' 条）</summary>'+records+'</details><p class="evidence-links">'+links+'</p></td>'+
    '<td>'+row.linkedPlans.map(p=>'<button class="evidence-link plan-jump" data-plan-id="'+esc(p.id)+'">'+esc(p.id)+' '+esc(p.title)+'</button>').join('<br>')+(row.linkedPlans.length?'':'待补人工改进项；先保存逐次证据')+'</td></tr>';
}
async function renderLatestReview(){
  $('review-refresh').disabled=true;
  try{
    const data=await snapshot();const review=failureReview(data,plans);
    $('review-state').textContent=review.runCount?'当前共享快照及本浏览器导入共 '+review.runCount+' 次运行；'+review.pending+' 次新增或更新记录待人工复盘。':'当前没有运行记录；在统计首页导入 JSON 后刷新本页。';
    $('review-metrics').innerHTML=[['运行记录',review.runCount],['门禁 FAIL / 尝试',count(review.failures)+' / '+count(review.attempts)],['预检失败',count(review.preflight)],['缺少原因',review.missing+' 次']].map(([label,value])=>'<div><span>'+label+'</span><strong>'+value+'</strong></div>').join('');
    $('review-limits').textContent='预检计数缺失的运行 '+review.unknownPreflight+' 次，不按零处理。已有阶段级原因涉及 '+review.stage+' 次 FAIL，不能逐次归因；明确标记的人工审核停点 '+review.reviewHolds+' 次、CI 等待 '+review.ciWaits+' 次，仍保留在原始 FAIL 中，不能当作产品缺陷。'+(review.unknownFailures?review.unknownFailures+' 次运行缺门禁总数。':'')+(review.incomplete?review.incomplete+' 次运行历史不完整。':'')+'原始原因、修复与复验均按记录展示；后续 PASS 不等于已验证优化效果。';
    $('review-rows').innerHTML=review.rows.map(reviewRow).join('')||'<tr><td colspan="5" class="empty">暂无运行，历史优化清单仍可查看。</td></tr>';
  }catch{
    $('review-state').textContent='当前运行快照读取失败，请刷新重试；历史优化清单仍可查看。';
    $('review-rows').innerHTML='<tr><td colspan="5" class="error">未读取到有效快照，未生成或猜测失败结论。</td></tr>';
  }finally{$('review-refresh').disabled=false;}
}
try {
  validatePlans(plans);
  $('plan-updated').textContent=planUpdatedAt;
  $('plan-total').textContent=plans.length;
  $('plan-high').textContent=plans.filter(p=>p.priority==='high').length;
  $('plan-implemented').textContent=plans.filter(p=>p.status==='implemented').length;
  $('plan-planned').textContent=plans.filter(p=>p.status==='planned').length;
  $('plan-verified').textContent=plans.filter(p=>p.status==='verified').length;
  const a=offlineAssessment;
  $('assessment-rows').innerHTML=[
    ['历史误判/配置/取证样例（'+a.misleading_rejection_scenarios+' 类）',a.before_misleading_rejections+' 类未达到预期',a.after_misleading_rejections+' 类未达到预期','覆盖样例问题减少 '+a.scenario_reduction_percent+'%'],
    ['检查器错误/超时（2 类）','0 类提供预期结构化阻断','2 类明确阻断','修复检查状态；不是减少真实缺陷'],
    ['真实问题/旧证据对照（6 个）','6 个正确拒绝','6 个正确拒绝','保留真实阻断'],
    ['历史基线',a.historical_gate_failures+' FAIL / '+a.historical_gate_attempts+' 次尝试','已有首个新运行','见下方实测对照，不能套用样例降幅']
  ].map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
  const real=realRunAssessment, current=real.new_run, comparison=real.same_task;
  const incomplete=real.recording_quality?.status==='incomplete';
  const realRows=[
    ['P0–P7 正式门禁失败（主要口径）',comparison.old_pre_upload_failures+' / '+comparison.old_pre_upload_attempts,comparison.new_pre_upload_failures+' / '+comparison.new_pre_upload_attempts,incomplete?'历史不完整，暂停减少度评估':comparison.pre_upload_failure_count_reduction_percent==null?'无法计算':'记录次数减少 '+comparison.pre_upload_failure_count_reduction_percent.toFixed(1)+'%'],
    ...comparison.phase_rows.filter(r=>r.phase!=='P8').map(r=>[r.phase,r.old_failures+' 次',r.new_failures+' 次',r.new_failures===0?'当前快照未记录正式 FAIL':'保留具体失败原因']),
    ['P0–P7 预检失败','历史未记录',current.preflight_failures+' 次 / '+current.preflight_issues+' 项','不能当作零失败；均有后续同检查通过记录'],
    ['P0–P7 已记录失败合计','9 次正式 FAIL；预检未知','2 次正式 + 4 次预检 = 6 次','新快照遗漏初始化前历史；不能比较完整任务'],
    ['P0–P7 有效耗时','5 时 33 分','4 时 02 分','新快照仅覆盖重新初始化后；不能计算完整任务耗时下降']
  ];
  $('real-run-report').innerHTML='<p><strong>'+esc(real.run_id)+'</strong>：P0–P8 最新结果全部 PASS。当前快照的 50 次预检均记录策略版本 1，检查器摘要与仓库一致；Agent 和模型与旧 fd-leak 任务相同。</p>'+
    '<p><strong>历史不完整，暂停完整任务效果评估。</strong>后续 session 确认同一 run-id 中途强制重新初始化，首次设计、开发及多轮返工记录被覆盖。P1 的 56 秒、P2 的 46 秒、P3 的 13 秒仅为初始化后的累计记录；原 77.8% 失败减少和 27.4% 耗时下降结论撤回。下表保留原始快照数字供核对。</p>'+
    '<div class="table-wrap"><table class="plan-table"><thead><tr><th>口径</th><th>旧 fd-leak</th><th>新任务</th><th>解释</th></tr></thead><tbody>'+realRows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
    '<h3>仍需关注的开发与验证问题</h3><ul><li>P5：正式测试报告 tests=0、契约用例 0/10；不能根据这份 JSON 判断是执行、回收还是启动问题。</li><li>P6：runtime=False，其余列出的证据检查通过；缺实际运行时标记匹配的逐步证据。</li><li>预检：重复/乱序/独立测试缺新报告（同一次失败的 3 项）；漏传 UT 套件；DC-4 注入观察值缺失；`.clang-format` 的许可证/版权头 OAT.3/OAT.4。后续检查通过，但修复动作均未登记。</li></ul>'+
    '<p>下一步优先：测试启动前验证目标和输出；规范本轮报告索引；对运行时标记缺失输出具体诊断；核对工具配置的许可规则与生成模板；把修复登记接入每次重试。原历史路径、HWTEST、插件许可证和 PID 问题在当前快照未见相同失败，但不能证明所有边界场景都已覆盖。</p>'+
    '<p>当前快照只记录设备构建矩阵，未见 host/MinGW 与导出符号检查记录；这些能力不能据本次运行标为已验证。当前快照修复登记数为 0；该指标也没有覆盖重新初始化前的完整过程。</p>'+
    '<p><button class="evidence-link" data-evidence-run="'+esc(real.run_id)+'" data-evidence-phase="P5">查看 P5 失败</button> · <button class="evidence-link" data-evidence-run="'+esc(real.run_id)+'" data-evidence-phase="P6">查看 P6 失败</button> · <a href="./index.html#overview">查看完整运行与预检记录</a></p>'+
    '<details><summary>P8 上库说明（次要，不纳入主要优化评价）</summary><p>P8 记录 11 次 FAIL：5 次确认停点、1 次 CI 等待、3 次重复创建已有 PR、1 次非快进推送、1 次缺评审报告；最终 PASS。记录不删除，但不作为开发质量恶化的结论。</p><p>当前快照记录 13 次正式 FAIL，加 4 次预检共 17 次；重新初始化前的历史缺失，不能将其作为完整流程计数或与旧任务计算改善幅度。</p></details>';
  $('real-run-report').addEventListener('click',e=>{const b=e.target.closest('[data-evidence-run]');if(b)showEvidence(b.dataset.evidenceRun,b.dataset.evidencePhase);});
  fillSelect('plan-attribution',attributionLabels);fillSelect('plan-status',statusLabels);
  $('plan-filters').addEventListener('submit',e=>e.preventDefault());
  $('plan-filters').addEventListener('input',render);
  $('plan-filters').addEventListener('change',render);
  $('plan-reset').addEventListener('click',()=>{$('plan-filters').reset();render();});
  $('plan-rows').addEventListener('click',e=>{
    const button=e.target.closest('[data-evidence-run]');
    if(button) showEvidence(button.dataset.evidenceRun,button.dataset.evidencePhase);
  });
  $('evidence-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{
    const rect=dialog.getBoundingClientRect();
    if(e.target===dialog&&(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)) dialog.close();
  });
  $('review-refresh').addEventListener('click',()=>{snapshotPromise=null;renderLatestReview();});
  $('latest-review').addEventListener('click',e=>{
    const evidence=e.target.closest('[data-evidence-run]');
    if(evidence){showEvidence(evidence.dataset.evidenceRun,evidence.dataset.evidencePhase);return;}
    const plan=e.target.closest('[data-plan-id]');
    if(plan){$('plan-filters').reset();$('plan-search').value=plan.dataset.planId;render();$('plan').scrollIntoView({behavior:'smooth'});}
  });
  window.addEventListener('storage',e=>{if(e.storageArea===window.localStorage)renderLatestReview();});
  window.addEventListener('pageshow',()=>renderLatestReview());
  render();renderLatestReview();
} catch(e) {
  $('plan-count').textContent='清单校验未通过';
  $('plan-rows').innerHTML='<tr><td colspan="5" class="error">优化清单字段不完整，请修正后重新加载。</td></tr>';
}
