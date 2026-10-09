import {plans,planUpdatedAt,priorityLabels,statusLabels,attributionLabels,scopeLabels,filterPlans,validatePlans,offlineAssessment} from './optimization-plan.mjs';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list = values => '<ul>'+values.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>';
const sourceNames = {'20260922-fd-leak-detection':'fd-leak-detection','20260923-resmon':'resmon','20260924-hiperf-symbol-mem':'hiperf-symbol-mem'};
function caseHtml(c) {
  return '<article class="case"><button type="button" class="evidence-link" data-evidence-run="'+esc(c.runId)+'" data-evidence-phase="'+esc(c.phase)+'">'+esc(sourceNames[c.runId]||c.runId)+' · '+esc(c.phase)+'</button>'+
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
  if (!snapshotPromise) snapshotPromise = fetch('./data.json').then(r=>{if(!r.ok) throw new Error('快照暂不可用');return r.json();}).catch(e=>{snapshotPromise=null;throw e;});
  return snapshotPromise;
}
const dialog = $('evidence-dialog');
async function showEvidence(runId,phase) {
  $('evidence-title').textContent = (sourceNames[runId]||runId)+' · '+phase+' 运行证据';
  $('evidence-content').textContent='正在读取当前指标快照…';
  dialog.showModal();
  try {
    const data = await snapshot();
    const run = (data.runs||[]).find(r=>r.id===runId);
    if (!run) { $('evidence-content').textContent='当前快照未收录该运行，请查看改进项中的历史线索。';return; }
    const details = (run.failure_details||[]).filter(d=>d.phase===phase);
    const meta = '<p class="evidence-meta">运行 ID：'+esc(run.id)+'<br>指标更新：'+esc(run.updated_at||'未记录')+'<br>以下是当前快照的阶段证据；后续会话线索不能反推旧 FAIL。</p>';
    const body = details.map(d=>{
      const findings = (d.session_findings||[]).map(f=>'<article class="evidence-card"><strong>'+esc(f.reason)+'</strong><p>处理：'+esc(f.action||'未记录')+'</p><p>结果：'+esc(f.outcome||'未记录')+'</p><p class="evidence-meta">依据：'+esc(f.basis||'未记录')+(f.evidence_refs?.length?' · '+esc(f.evidence_refs.join('、')):'')+'</p></article>').join('');
      return '<article class="evidence-card"><strong>'+esc(d.gate||'门禁')+' · '+(d.count==null?'仅最近结果':esc(d.count)+' 次失败')+'</strong><p>'+esc(d.reason)+'</p>'+findings+'</article>';
    }).join('');
    $('evidence-content').innerHTML=meta+(body||'<p>当前快照未记录该阶段的失败明细。改进项的手动排查或后续会话仍保留各自证据口径。</p>')+(run.session_later_outcome?'<p class="evidence-meta">后续进展：'+esc(run.session_later_outcome)+'</p>':'');
  } catch(e) {
    $('evidence-content').textContent='暂时无法读取运行快照。改进项中仍保留失败原因、当时处理和证据口径。';
  }
}
try {
  validatePlans(plans);
  $('plan-updated').textContent=planUpdatedAt;
  $('plan-total').textContent=plans.length;
  $('plan-high').textContent=plans.filter(p=>p.priority==='high').length;
  $('plan-implemented').textContent=plans.filter(p=>p.status==='implemented').length;
  $('plan-verified').textContent=plans.filter(p=>p.status==='verified').length;
  const a=offlineAssessment;
  $('assessment-rows').innerHTML=[
    ['历史误判/配置/取证样例（'+a.misleading_rejection_scenarios+' 类）',a.before_misleading_rejections+' 类未达到预期',a.after_misleading_rejections+' 类未达到预期','覆盖样例问题减少 '+a.scenario_reduction_percent+'%'],
    ['检查器错误/超时（2 类）','0 类提供预期结构化阻断','2 类明确阻断','修复检查状态；不是减少真实缺陷'],
    ['真实问题/旧证据对照（6 个）','6 个正确拒绝','6 个正确拒绝','保留真实阻断'],
    ['真实运行门禁失败',a.historical_gate_failures+' FAIL / '+a.historical_gate_attempts+' 次尝试','尚无新运行','实际降幅待测']
  ].map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
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
  render();
} catch(e) {
  $('plan-count').textContent='清单校验未通过';
  $('plan-rows').innerHTML='<tr><td colspan="5" class="error">优化清单字段不完整，请修正后重新加载。</td></tr>';
}
