export const known = value => typeof value === 'number' && Number.isFinite(value);
const sum = values => { const valid = values.filter(known); return valid.length ? valid.reduce((a,b) => a+b, 0) : null; };
export function summarize(runs) {
  const durations = runs.map(r => r.effective_seconds).filter(known);
  const measured = runs.filter(r => known(r.failures) && known(r.gate_attempts));
  const failures = sum(measured.map(r => r.failures));
  const attempts = sum(measured.map(r => r.gate_attempts));
  return {count:runs.length, completed:runs.filter(r=>r.status==='completed').length,
    effective:sum(durations), wait:sum(runs.map(r=>r.wait_seconds)), wall:sum(runs.map(r=>r.wall_seconds)),
    average:durations.length ? sum(durations)/durations.length : null, durationSamples:durations.length,
    failures, attempts, failureRate:attempts ? failures/attempts*100 : null,
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
