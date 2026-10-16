const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={ci_wait:'CI 等待',pr_review_missing:'等待 PR 评审报告',local_review_missing:'等待本地评审报告'};
export function uploadWaitDetails(run){
  const p=(run.phases||[]).find(p=>p.id==='P8');if(!p)return '';
  const waits=p.upload_wait_history;
  return `<details class="detail-section"><summary>P8 等待与恢复记录</summary><p>新版本的 CI pending 和缺评审报告单独记录为等待，不计为门禁失败，也不会放行 P8。历史失败保留原值。</p>${Array.isArray(waits)?waits.map(w=>`<article class="reason-item"><b>${esc(names[w.kind]||w.kind)}${w.pr?' · PR '+esc(w.pr):''}</b><p>${esc(w.reason)}</p><p class="source">当时等待 · ${esc(w.at)||'时间未记录'}</p></article>`).join('')||'<p>当前记录没有等待事件。</p>':'<p>旧快照未记录独立等待事件，不能据此认定没有发生等待。</p>'}</details>`;
}
