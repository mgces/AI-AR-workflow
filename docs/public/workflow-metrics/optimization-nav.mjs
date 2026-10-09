// 为运行统计首页增加优化清单入口，不改变原有统计与钻取逻辑。
if (!document.querySelector('[data-workflow-optimization-nav]')) {
  const link=document.createElement('a');
  link.href='./optimization.html';
  link.textContent='门禁失败的下一步优化总结';
  link.dataset.workflowOptimizationNav='true';
  const target=document.querySelector('nav')||document.querySelector('.sidebar')||document.querySelector('header');
  if (target) {
    const sibling=target.querySelector('a');
    if (sibling) link.className=sibling.className.split(/\s+/).filter(c=>!['active','selected','is-active'].includes(c)).join(' ');
    link.style.whiteSpace='normal';
    target.append(link);
  } else {
    link.style.cssText='position:fixed;bottom:20px;right:20px;z-index:20;background:#2563eb;color:white;padding:10px 16px;border-radius:8px;font:14px system-ui;text-decoration:none;box-shadow:0 2px 10px #17255430';
    document.body.append(link);
  }
}
