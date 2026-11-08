// The published weekly reports used these immutable snapshots and reviewed cohorts.
// Keep historical values stable even when a run is updated or a local import is added.
const weeks = [
  {start:'10/12',end:'10/18',snapshot:'02bf99c',runs:4,passes:182,attempts:270},
  {start:'10/19',end:'10/25',snapshot:'c1d186b',runs:4,passes:115,attempts:162},
  {start:'10/26',end:'11/01',snapshot:'f18a5c0',runs:4,passes:174,attempts:239},
  {start:'11/02',end:'11/08',snapshot:'0e63802',runs:4,passes:164,attempts:218,
    review:{uploadFailures:32,preflightFailures:63,preflightRuns:3,missingReasons:15}}
];

const rate = week => 100 * week.passes / week.attempts;
const label = week => `${week.start}–${week.end}`;

export function mountWeeklyOverview() {
  const chart = document.getElementById('weekly-chart');
  const detail = document.getElementById('weekly-detail');
  const change = document.getElementById('weekly-change');
  const latest = weeks.at(-1);
  const previous = weeks.at(-2);
  const values = weeks.map(rate);
  const low = Math.max(0, Math.floor(Math.min(...values) / 5) * 5 - 5);
  const high = Math.min(100, Math.ceil(Math.max(...values) / 5) * 5 + 5);
  const ticks = Array.from({length:(high-low)/5+1}, (_,i) => low+i*5);
  const y = value => 178 - (value-low)/(high-low)*156;
  const points = weeks.map((week,i) => ({week,x:78+844*i/Math.max(weeks.length-1,1),y:y(rate(week))}));
  const path = points.map((point,i) => `${i?'L':'M'}${point.x},${point.y}`).join(' ');
  const first = points[0], last = points.at(-1);
  chart.innerHTML = `<div class="weekly-axis" aria-hidden="true">${ticks.map(tick=>`<span style="top:${y(tick)/2}%">${tick}%</span>`).join('')}</div>
    <div class="weekly-plot"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs><linearGradient id="weekly-fill" x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#387ce9" stop-opacity=".2"/><stop offset="1" stop-color="#387ce9" stop-opacity=".025"/></linearGradient></defs>
      ${ticks.map(tick=>`<line class="weekly-gridline" x1="0" x2="1000" y1="${y(tick)}" y2="${y(tick)}" vector-effect="non-scaling-stroke"/>`).join('')}
      <path d="${path} L${last.x},178 L${first.x},178 Z" fill="url(#weekly-fill)"/>
      <path class="weekly-line" d="${path}" fill="none" vector-effect="non-scaling-stroke"/>
    </svg>${points.map(({week,x,y},i)=>`<button type="button" class="weekly-point" style="left:${x/10}%;top:${y/2}%" data-week="${i}" aria-pressed="false" aria-label="${label(week)}，${rate(week).toFixed(1)}%，通过 ${week.passes} 次，共 ${week.attempts} 次尝试"><span>${rate(week).toFixed(1)}%</span></button>`).join('')}
    ${points.map(({week,x})=>`<span class="weekly-period" style="left:${x/10}%">${label(week)}</span>`).join('')}</div>`;

  const buttons = [...chart.querySelectorAll('[data-week]')];
  function select(i) {
    const week = weeks[i];
    for (const [index,button] of buttons.entries()) button.setAttribute('aria-pressed', String(index===i));
    detail.textContent = `${label(week)} · ${week.runs} 条运行 · ${week.passes} 次通过 / ${week.attempts} 次尝试 · ${week.attempts-week.passes} 次失败`;
  }
  buttons.forEach((button,i) => button.addEventListener('click', () => select(i)));
  select(weeks.length-1);

  const delta = rate(latest)-rate(previous);
  change.textContent = `最新一期 ${delta>=0?'+':'−'}${Math.abs(delta).toFixed(1)} 个百分点`;
  change.classList.toggle('is-down', delta<0);
  change.hidden = false;
  const failures = latest.attempts-latest.passes;
  const {uploadFailures,preflightFailures,preflightRuns,missingReasons} = latest.review;
  document.getElementById('focus-summary').textContent = `${label(latest)} · ${failures} 次正式失败 · ${preflightFailures} 次预检失败（${preflightRuns} 条运行有计数）`;
  document.getElementById('focus-upload').textContent = `${uploadFailures} 次上库失败，占本期正式失败的 ${(100*uploadFailures/failures).toFixed(1)}%。`;
  document.getElementById('focus-evidence').textContent = `另有 ${missingReasons} 次失败缺少逐次原因，需补齐原始证据和复验记录。以上方向仍待验证。`;
}
