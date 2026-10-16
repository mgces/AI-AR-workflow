const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function timingDetails(run) {
  const q = run.recording_quality || {status:'unknown'};
  const label = {complete:'指标历史已保留',incomplete:'历史不完整',unknown:'历史完整性未验证'}[q.status] || '历史完整性未验证';
  const rows = (run.phases || []).filter(p => ['P1','P2','P3'].includes(p.id)).flatMap(p =>
    (p.rounds_detail || []).map((r,i) => `<tr><td>${esc(p.id)} · 第 ${i+1} 轮</td><td>${esc(r.opened_at)||'未记录'}</td><td>${esc(r.closed_at)||'进行中'}</td><td>${r.kind==='work'?'实际工作登记':'阶段计时'}${r.interrupted?' · 回退/切换结束':''}</td></tr>`));
  return `<section class="detail-section"><h3>计时覆盖：${label}</h3><p>${esc(q.note || '旧记录未验证历史完整性。')}</p><p>初始化次数：${q.initialization_count == null ? '未记录' : esc(q.initialization_count)}。阶段耗时累计各轮已登记区间，扣除区间内人工等待；没有登记的前期工作不会自动补算。</p>${rows.length?`<details><summary>P1 / P2 / P3 各轮计时区间（UTC）</summary><div class="table-wrap"><table><thead><tr><th>阶段 / 轮次</th><th>开始</th><th>结束</th><th>记录类型</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></details>`:''}</section>`;
}
