const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function preflightDetails(run) {
 const summary=run.preflight_summary;
 if(!summary)return '<section class="detail-section"><h3>预检</h3><p class="muted">历史记录未记录预检，不能当作零次失败。</p></section>';
 const items=(run.preflight_failures||[]).map(a=>`<article class="reason-item"><div class="reason-head"><b>${esc(a.phase)} · ${esc(a.id)}</b><span class="small-tag">预检失败</span></div>${(a.checks||[]).map(c=>`<p><b>${esc(c.id)}</b>：${esc(c.reason)}${c.rule_ids?.length?' · '+c.rule_ids.map(esc).join('、'):''}</p>`).join('')}${(a.fixes||[]).map(f=>`<p>根因：${esc(f.cause)} · 修改：${esc(f.action)} · ${esc(f.verification_status)}</p>`).join('')}<p class="source">${a.verified_by?`后续复验 ${esc(a.verified_by)} · ${a.resolution_status==='resolved'?'同检查后续通过':'检查仍未全部通过'}`:'尚未记录复验'}${a.fixes?.length?'':' · 未登记修复动作，不能推断具体处理方式'}</p></article>`).join('');
 return `<section class="detail-section"><h3>预检记录（与正式门禁分开）</h3><p>预检 ${esc(summary.attempts)} 次，失败 ${esc(summary.failed_attempts)} 次，失败检查项 ${esc(summary.issues)} 个。一个失败预检可包含多个检查项。</p><div class="reason-list">${items||'<p class="muted">未记录失败预检</p>'}</div></section>`;
}
