export const known = value => typeof value === 'number' && Number.isFinite(value);
const knownCount = value => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const sum = values => { const valid = values.filter(known); return valid.length ? valid.reduce((a,b) => a+b, 0) : null; };
const MISSING_REASON = /未记录具体失败原因|逐次门禁原因未记录|原因未记录|仅记录最近结果|阶段原因（无法逐次对应）/;
export const DERIVATION_VERSION = 'p8-hold-exclusion-v1';

export const isReviewHold = detail =>
  detail?.failure_kind === 'expected_review_hold' ||
  /:consent-precheck$/i.test(String(detail?.gate || ''));

/** Use the stored operational view when complete, otherwise subtract only
 * recognized holds from the raw counts. Unknown holds stay in the failure
 * numerator so mixed/legacy data cannot silently disappear. */
const operationalView = (failures, attempts, operationalFailures, operationalAttempts, holds) => {
  if (known(operationalFailures) && known(operationalAttempts)) {
    return {failures: operationalFailures, attempts: operationalAttempts, fallback: false};
  }
  if (!knownCount(failures) || !knownCount(attempts)) return null;
  const recognized = knownCount(holds) ? holds : 0;
  if (recognized > attempts) return null;
  return {failures: failures - recognized, attempts: attempts - recognized, fallback: true};
};

/**
 * Additive operational view. Raw fail_attempts / gate_attempts are never
 * changed; recognized consent holds are removed from both the failure and
 * attempt totals. Unknown failures remain in the operational count.
 */
export function deriveAttribution(failures, attempts, details, knownHolds = null) {
  const rows = Array.isArray(details) ? details : [];
  const count = detail => knownCount(detail?.count) ? detail.count : null;
  let holds = knownCount(knownHolds) ? knownHolds : null;
  let holdsUnknown = false;
  if (holds === null) {
    holds = 0;
    for (const detail of rows) {
      if (!isReviewHold(detail)) continue;
      const value = count(detail);
      if (value === null) holdsUnknown = true;
      else holds += value;
    }
  }
  let knownTotal = 0;
  let unknownDetail = false;
  let missingReason = 0;
  for (const detail of rows) {
    const value = count(detail);
    if (value === null) {
      unknownDetail = true;
      continue;
    }
    knownTotal += value;
    if (!isReviewHold(detail) && MISSING_REASON.test(String(detail?.reason || ''))) {
      missingReason += value;
    }
  }
  const unknown = !knownCount(failures) || holdsUnknown || unknownDetail;
  let quality = 'unknown';
  let operational = null;
  let operationalAttempts = null;
  let unclassified = null;
  if (!unknown) {
    if (knownTotal > failures || holds > failures) {
      quality = 'unknown';
    } else {
      unclassified = Math.max(0, failures - knownTotal) + missingReason;
      quality = unclassified > 0 ? 'incomplete' : 'complete';
      operational = failures - holds;
      if (knownCount(attempts) && attempts >= holds) {
        operationalAttempts = attempts - holds;
      }
    }
  }
  return {
    review_hold_attempts: holdsUnknown ? null : holds,
    operational_fail_attempts: operational,
    operational_gate_attempts: operationalAttempts,
    review_hold_derivation: quality,
    unclassified_fail_attempts: unclassified,
    derivation_version: DERIVATION_VERSION,
  };
}

/** Recompute the additive view for a run and each of its phases. */
export function deriveRunView(run) {
  const details = Array.isArray(run?.failure_details) ? run.failure_details : [];
  const phases = (run?.phases || []).map(phase => {
    const phaseDetails = details.filter(detail => detail.phase === phase.id);
    const hasHoldDetail = phaseDetails.some(isReviewHold);
    const persisted = !hasHoldDetail && knownCount(phase.review_hold_attempts)
      ? phase.review_hold_attempts : null;
    return { ...phase, ...deriveAttribution(
      phase.fail_attempts, phase.gate_attempts, phaseDetails, persisted) };
  });
  const phaseHolds = phases.map(phase => phase.review_hold_attempts);
  const hasRunHoldDetail = details.some(isReviewHold);
  const knownHolds = !hasRunHoldDetail && phaseHolds.length && phaseHolds.every(knownCount)
    ? phaseHolds.reduce((total, value) => total + value, 0) : null;
  const derived = deriveAttribution(run?.failures, run?.gate_attempts, details, knownHolds);
  const p8 = phases.find(phase => phase.id === 'P8');
  if (p8) {
    const p8Derived = deriveAttribution(
      p8.fail_attempts, p8.gate_attempts,
      details.filter(detail => detail.phase === 'P8'), p8.review_hold_attempts);
    derived.review_hold_derivation = p8Derived.review_hold_derivation;
  } else {
    // No P8 phase means there is no P8 consent-hold evidence to classify.
    // Do not report the broader run-level failure attribution as "complete".
    derived.review_hold_derivation = 'not_applicable';
  }
  return { ...run, phases, ...derived };
}

export function withDerivedRuns(runs) {
  return (Array.isArray(runs) ? runs : []).map(deriveRunView);
}

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
  const holdValues = measured.map(r => known(r.review_hold_attempts) ? r.review_hold_attempts : null);
  const reviewHolds = holdValues.some(known) ? sum(holdValues) : null;
  const operationalViews = measured.map(r => operationalView(
    r.failures, r.gate_attempts, r.operational_fail_attempts,
    r.operational_gate_attempts, r.review_hold_attempts)).filter(Boolean);
  const operationalFailures = sum(operationalViews.map(v => v.failures));
  const operationalAttempts = sum(operationalViews.map(v => v.attempts));
  const operationalPasses = operationalAttempts === null || operationalFailures === null
    ? null : operationalAttempts - operationalFailures;
  return {count:runs.length, completed:runs.filter(r=>r.status==='completed').length,
    effective:sum(durations), wait:sum(runs.map(r=>r.wait_seconds)), wall:sum(runs.map(r=>r.wall_seconds)),
    average:durations.length ? sum(durations)/durations.length : null, durationSamples:durations.length,
    failures, attempts, passes:attempts===null ? null : attempts-failures,
    passRate:attempts ? (attempts-failures)/attempts*100 : null,
    failureRate:attempts ? failures/attempts*100 : null,
    rawFailures:failures, rawAttempts:attempts,
    rawPasses:attempts===null ? null : attempts-failures,
    reviewHolds,
    operationalFailures, operationalAttempts, operationalPasses,
    operationalFailureRate:operationalAttempts ? operationalFailures/operationalAttempts*100 : null,
    operationalPassRate:operationalAttempts ? operationalPasses/operationalAttempts*100 : null,
    operationalSamples:operationalViews.length,
    operationalFallbackRuns:operationalViews.filter(v=>v.fallback).length,
    operationalUnavailableRuns:measured.length-operationalViews.length,
    completeRuns:measured.filter(r=>r.review_hold_derivation==='complete').length,
    incompleteRuns:measured.filter(r=>r.review_hold_derivation==='incomplete').length,
    unknownRuns:measured.filter(r=>r.review_hold_derivation==='unknown').length,
    notApplicableRuns:measured.filter(r=>r.review_hold_derivation==='not_applicable').length,
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
  return [...groups].sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([id,phases])=>{
    const views=phases.map(p=>operationalView(
      p.fail_attempts,p.gate_attempts,p.operational_fail_attempts,
      p.operational_gate_attempts,p.review_hold_attempts)).filter(Boolean);
    return {id,
      effective_seconds:sum(phases.map(p=>p.effective_seconds)),wait_seconds:sum(phases.map(p=>p.wait_seconds)),
      wall_seconds:sum(phases.map(p=>p.wall_seconds)),failures:sum(phases.map(p=>p.fail_attempts)),
      attempts:sum(phases.map(p=>p.gate_attempts)),samples:phases.filter(p=>known(p.effective_seconds)).length,
      reviewHolds:sum(phases.map(p=>known(p.review_hold_attempts)?p.review_hold_attempts:null)),
      operationalFailures:sum(views.map(v=>v.failures)),
      operationalAttempts:sum(views.map(v=>v.attempts)),
      operationalFallbackPhases:views.filter(v=>v.fallback).length,
      operationalUnavailablePhases:phases.length-views.length};
  });
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
  const review=isReviewHold({gate}) ? '（预期人工审核停点）' : '';
  return `受阻（最近记录）\n阶段：${stage}\n门禁：${gate}${review}\n原因：${reason}\n${updated}`;
}
