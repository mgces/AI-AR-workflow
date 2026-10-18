// Reviewed snapshot revisions are evidence boundaries, not a claim that a workflow fix shipped.
export const reviewedRunUpdates = {
  '2026-10-15-hiview-resmon': '2026-10-16T11:24:01Z',
  '20261016-hicollie': '2026-10-16T08:48:57Z',
  '20261013-fd-leak-detect': '2026-10-15T03:21:14Z',
  '20261014-hitrace-source-completeness': '2026-10-15T02:44:38Z',
  '20261009-fd-leak-detect': '2026-10-10T03:13:07Z',
  '20260924-hiperf-symbol-mem': '2026-09-24T08:49:41Z',
  '20260923-resmon': '2026-09-24T07:26:56Z',
  '20260923-unwinder-memcpy': '2026-09-24T04:06:21Z',
  '20260921-hdc-client-diagnostics-compatible': '2026-09-23T01:25:26Z',
  '20260922-fd-leak-detection': '2026-09-22T12:27:09Z',
  '20260921-data-clean-mode': '2026-09-21T12:17:19Z',
};

const known = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const missingReason = reason => !reason || /未记录具体失败原因|逐次门禁原因未记录|原因未记录/.test(reason);
const stageReason = reason => /阶段原因（无法逐次对应）/.test(reason || '');
export const runName = id => String(id ?? '').replace(/^(?:\d{4}-\d{2}-\d{2}|\d{8})[-_\s]+/, '') || String(id ?? '');

export function failureReview(snapshot, plans = [], reviewed = reviewedRunUpdates) {
  const rows = (snapshot.runs || []).map(run => {
    const details = run.failure_details || [];
    const detailCount = details.reduce((n, d) => n + (known(d.count) ? d.count : 0), 0);
    const missing = details.filter(d => missingReason(d.reason)).reduce((n, d) => n + (known(d.count) ? d.count : 0), 0);
    const stage = details.filter(d => !missingReason(d.reason) && stageReason(d.reason)).reduce((n, d) => n + (known(d.count) ? d.count : 0), 0);
    const unmatched = known(run.failures) ? Math.max(0, run.failures - detailCount) : 0;
    const linkedPlans = run.kind === 'Requirement' ? [] : plans.filter(p => p.sourceCases.some(c => c.runId === run.id));
    const observations = [...new Map(linkedPlans.flatMap(p => p.sourceCases.filter(c => c.runId === run.id))
      .map(c => [[c.phase, c.reason, c.result].join('\n'), c])).values()];
    const reviewedAt = Date.parse(reviewed[run.id]);
    const updatedAt = Date.parse(run.updated_at);
    const reviewHolds = details.filter(d => d.failure_kind === 'expected_review_hold' || d.gate?.endsWith(':consent-precheck')).reduce((n,d) => n+(known(d.count)?d.count:0),0);
    const ciWaits = details.filter(d => d.failure_category === 'ci_wait').reduce((n,d) => n+(known(d.count)?d.count:0),0);
    return {run, details, observations, linkedPlans, missing:missing + unmatched, stage, reviewHolds, ciWaits,
      preflight:known(run.preflight_summary?.failed_attempts) ? run.preflight_summary.failed_attempts : null,
      preflightDetails:run.preflight_failures || [],
      unknownDetailCounts:details.filter(d => !known(d.count)).length,
      countConflict:known(run.failures) && detailCount > run.failures,
      reviewed:run.workflow === 'ar-development' && Number.isFinite(reviewedAt) && Number.isFinite(updatedAt) && updatedAt <= reviewedAt};
  }).sort((a, b) => (Date.parse(b.run.updated_at) || 0) - (Date.parse(a.run.updated_at) || 0));
  const sum = values => {const measured = values.filter(known); return measured.length ? measured.reduce((a,b) => a+b,0) : null;};
  return {rows, runCount:rows.length, failures:sum(rows.map(r => r.run.failures)), attempts:sum(rows.map(r => r.run.gate_attempts)),
    unknownFailures:rows.filter(r => !known(r.run.failures)).length,
    missing:rows.reduce((n,r) => n+r.missing,0), stage:rows.reduce((n,r) => n+r.stage,0),
    reviewHolds:rows.reduce((n,r) => n+r.reviewHolds,0), ciWaits:rows.reduce((n,r) => n+r.ciWaits,0),
    preflight:sum(rows.map(r => r.preflight)), unknownPreflight:rows.filter(r => r.preflight === null).length,
    pending:rows.filter(r => !r.reviewed).length,
    incomplete:rows.filter(r => r.run.recording_quality?.status === 'incomplete').length};
}
