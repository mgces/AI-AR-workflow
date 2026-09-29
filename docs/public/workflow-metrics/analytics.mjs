export const known = value => typeof value === 'number' && Number.isFinite(value);
const sum = values => { const valid = values.filter(known); return valid.length ? valid.reduce((a,b) => a+b, 0) : null; };
export function summarize(runs) {
  const durations = runs.map(r => r.effective_seconds).filter(known);
  const measured = runs.filter(r => known(r.failures) && known(r.gate_attempts));
  const failures = sum(measured.map(r => r.failures));
  const attempts = sum(measured.map(r => r.gate_attempts));
  const firstSamples = runs.filter(r => known(r.first_gate_attempts));
  const firstAttempts = sum(firstSamples.map(r => r.first_gate_attempts));
  const firstPasses = sum(firstSamples.map(r => r.first_gate_passes));
  const firstFailures = sum(firstSamples.map(r => r.first_gate_failures));
  const firstReviewHolds = sum(firstSamples.map(r => r.first_gate_review_holds));
  return {count:runs.length, completed:runs.filter(r=>r.status==='completed').length,
    effective:sum(durations), wait:sum(runs.map(r=>r.wait_seconds)), wall:sum(runs.map(r=>r.wall_seconds)),
    average:durations.length ? sum(durations)/durations.length : null, durationSamples:durations.length,
    failures, attempts, failureRate:attempts ? failures/attempts*100 : null,
    firstAttempts,firstPasses,firstFailures,firstReviewHolds,
    firstPassRate:firstAttempts ? firstPasses/firstAttempts*100 : null,
    failureRuns:runs.filter(r=>r.failures>0).length,
    unknownFailureRuns:runs.filter(r=>!known(r.failures)).length};
}
export function filterRuns(runs, filters) {
  const query=(filters.query||'').trim().toLowerCase();
  return runs.filter(r=>(!filters.kind||r.kind===filters.kind) && (!filters.model||r.model===filters.model) &&
    (!filters.status||r.status===filters.status) && (!query||[r.id,r.agent,r.model,r.source].join(' ').toLowerCase().includes(query)));
}
export function phaseTotals(runs) {
  const groups = new Map();
  for(const run of runs) for(const phase of run.phases||[]) {
    if(!groups.has(phase.id)) groups.set(phase.id,[]);
    groups.get(phase.id).push(phase);
  }
  return [...groups].sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([id,phases])=>({id,
    effective_seconds:sum(phases.map(p=>p.effective_seconds)),wait_seconds:sum(phases.map(p=>p.wait_seconds)),
    wall_seconds:sum(phases.map(p=>p.wall_seconds)),failures:sum(phases.map(p=>p.fail_attempts)),
    attempts:sum(phases.map(p=>p.gate_attempts)),samples:phases.filter(p=>known(p.effective_seconds)).length}));
}
export function phaseFailureRuns(runs, phaseId) {
  return runs.flatMap(run=>{
    const phase=(run.phases||[]).find(item=>item.id===phaseId);
    const details=(run.failure_details||[]).filter(item=>item.phase===phaseId);
    return phase&&(phase.fail_attempts>0||details.length) ? [{run,phase,details}] : [];
  });
}
export function runStatusExplanation(run, phaseNames={}, formatTime=value=>value||'未记录') {
  if(run.status==='completed')return '';
  const phase=(run.phases||[]).find(item=>item.id===run.current_phase);
  const stage=phase ? `${phase.id} ${phaseNames[phase.id]||phase.name||'阶段'}` : '未记录';
  const updated=`指标更新：${formatTime(run.updated_at)}\n仅反映该时间的记录，非实时状态`;
  if(run.status==='waiting') {
    const waits=run.open_wait_details||[];
    const lines=waits.length ? waits.map(wait=>{
      const waitStage=wait.phase ? `${wait.phase} ${phaseNames[wait.phase]||'阶段'}` : stage;
      return `等待阶段：${waitStage}\n等待原因：${wait.reason||'等待原因未记录'}\n等待开始：${formatTime(wait.started_at_utc)}`;
    }).join('\n') : `阶段：${stage}\n等待原因未记录`;
    return `等待人工（最近记录）\n${lines}\n${updated}`;
  }
  if(run.status==='running')
    return `进行中（最近记录）\n阶段：${stage}\n最近门禁：${phase?.gate||'未记录'}\n阶段尚未记录完成，无法判断当前进程是否仍在运行\n${updated}`;
  if(run.status==='pending')
    return `未开始（最近记录）\n未记录已开始的阶段\n${updated}`;
  if(run.status!=='blocked')return '';
  const matching=(run.failure_details||[]).filter(item=>
    item.phase===run.current_phase&&(!phase?.gate||item.gate===phase.gate));
  const recorded=matching.at(-1)?.reason;
  const hasRecordedReason=Boolean(recorded&&!recorded.includes('未记录具体失败原因'));
  const reason=hasRecordedReason ? recorded : '原因未记录';
  const gate=phase?.gate||'未记录';
  const review=gate.endsWith(':consent-precheck') ? '（预期人工审核停点）' : '';
  return `受阻（最近记录）\n阶段：${stage}\n门禁：${gate}${review}\n原因：${reason}\n${updated}`;
}
