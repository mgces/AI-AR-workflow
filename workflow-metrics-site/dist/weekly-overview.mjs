// P0–P7 counts use the immutable weekly snapshots and reviewed cohorts below.
// Keep historical values stable even when a run is updated or a local import is added.
const earlier = {start:'10/12 前',title:'10/12 前累计',snapshot:'02bf99c',runs:7,passes:159,attempts:239,
  countNote:'含 1 条历史不完整记录，按已有计数统计'};
const weeks = [
  {start:'10/12',end:'10/18',snapshot:'02bf99c',runs:4,passes:180,attempts:247,
    runIds:['2026-10-15-hiview-resmon','20261016-hicollie','20261013-fd-leak-detect','20261014-hitrace-source-completeness'],topics:[
    [['P4 编译验证'],'构建目标与符号检查','fd-leak 缺测试产物，hitrace 遇到反解工具差异与检查超时。构建前核对实际目标、输出路径和符号工具，区分后端超时与真实告警。'],
    [['P5 单元测试'],'测试执行与报告','hicollie 和 resmon 出现零用例或缺报告。验证设备识别与 ABI，在测试初始化前配置 XML 输出，并核对本轮契约用例。'],
    [['P6 功能验证','P7 质量验证'],'部署取证与 trace 时序','hicollie 的部署、服务重启及 trace 落盘受时序影响。核对加载实例、触发进程存活与采集就绪，按批隔离产物并恢复共享状态。']
  ]},
  {start:'10/19',end:'10/25',snapshot:'c1d186b',runs:4,passes:111,attempts:131,
    runIds:['20261022-resmon-cpu-mem-io','20261022-fd-leak-detector','20261020-ftrace-rom-optimization','20261019-unwinder-memcpy'],
    note:'待补证据：ftrace 在 P2–P5、P7–P8 的 19 次失败缺少具体原因，需补查原始日志。',topics:[
    [['P3 测试开发','P4 编译验证','P7 质量验证'],'统一工具与规则','unwinder 发现静态检查路径归一化问题，resmon 发现版权头规则冲突。固定工具和规则版本，明确改动范围，并用真实案例回归。'],
    [['P5 单元测试'],'测试启动前验证依赖','xdevice 配置和设备动态库不匹配曾导致零用例。先验证设备识别、依赖库、程序加载和用例枚举，再执行正式测试。'],
    [['P8 上库评审'],'区分上库失败类型','区分审核停点、PR 状态延迟、真实远端规则问题及平台异常；对当前提交的结果复验。']
  ]},
  {start:'10/26',end:'11/01',snapshot:'f18a5c0',runs:4,passes:171,attempts:219,
    runIds:['20261027-hiperf-no-symbols','20261030-resmon-pwr-net-thr-stb','20261027-sym-map-aggregate','20261024-hdc-dynamic-loglevel'],topics:[
    [['P4 编译验证'],'前置跨平台构建检查','hiperf 涉及设备、Linux 与 MinGW 目标。提前核对公开依赖、生成头和产物路径，使用真实目标编译命令检查，单独记录后端超时。'],
    [['P6 功能验证'],'部署就绪与短进程取证','resmon 遇到动态库替换和服务重启问题，sym-map 的短进程已在取证前退出。验证产物加载、服务就绪和真实输出，单独记录特殊验收条件。'],
    [['P4 编译验证','P5 单元测试'],'核对主机测试依赖与退出行为','补录的 HDC 日志级别任务暴露链接依赖及事件循环退出问题。核对测试目标的链接依赖，完善主机测试隔离和资源释放。'],
    [['P8 上库评审'],'恢复已有 PR 的复验','PR 状态暂旧时分别核对远端分支和 PR 对应的提交，待状态一致后复用已有 PR。']
  ]},
  {start:'11/02',end:'11/08',snapshot:'0e63802',runs:4,passes:161,attempts:183,
    runIds:['20261103-env-init','20261102-hiperf-no-symbolic-host-deps','hdc-file-compress-20261103','hdc-transfer-progress-20261031'],
    note:'15 次失败缺少逐次原因，需补查原始门禁记录。',topics:[
    [['P8 上库评审'],'按当前提交复验','32 次上库失败中有 10 次审核停点。分别核对远端分支、PR head 和 CI 事件对应的提交。'],
    [['P2 开发','P4 编译验证'],'先验证工具和构建输入','HDC 误选 ARM 版格式化工具，环境初始化处理大型编译数据库时内存不足。先验证工具架构，流式读取编译数据库并保留检查覆盖。'],
    [['P5 单元测试'],'验证测试确实运行','针对只生成测试元数据和设备配置不兼容的情况，先检查测试二进制、设备识别和契约用例，再核验本轮非空报告。']
  ]},
  {start:'11/09',end:'11/15',snapshot:'8e7eebb',runs:2,passes:27,attempts:28,
    runIds:['20261112-dev-echo-path-prefix','20261105-elf-parser-batch-fix'],
    countNote:'含 1 条 11/05 的补录；resmon 更新计入当前汇总',
    note:'2 条运行共 9 次原始失败，含 4 次审核停点；剔除已识别停点后通过率 85.3%。',topics:[
    [['P8 上库评审'],'按当前提交复验','两条记录均出现 PR head 暂旧。ELF parser 补录的 CodeCheck 超时经同一提交重跑通过；dev-echo 的后续 CI 红灯在该快照仍受阻。'],
    [['P6 功能验证'],'前置检查设备取证命令','dev-echo 的设备缺少 tr，改用 /proc 进程映射取证后 P6 复验通过。']
  ]},
  {start:'11/16',end:'11/22',snapshot:'312ad95',runs:2,passes:25,attempts:33,
    runIds:['20261120-hiview-cleanup-sa','20261118-elf-mmap-dedup'],
    countNote:'P8 的 4 次尝试另计',
    review:{uploadFailures:4,reviewHolds:2,deviceFailures:5,preflightFailures:21,preflightRuns:2}}
];

const rate = week => 100 * week.passes / week.attempts;
const label = week => week.title??`${week.start}–${week.end}`;
const latest = weeks.at(-1);
const latestWeekLabel = label(latest);
export function selectFailureScope(runs,value) {
  const week = weeks.find(item=>item.snapshot===value);
  return week ? {runs:runs.filter(run=>run.workflow==='ar-development'&&week.runIds.includes(run.id)), title:`周报批次 ${label(week)}`, weekly:true}
    : {runs,title:'全部所选记录',weekly:false};
}

export function mountWeeklyOverview() {
  const chart = document.getElementById('weekly-chart');
  const detail = document.getElementById('weekly-detail');
  const change = document.getElementById('weekly-change');
  const previous = weeks.at(-2);
  const trendWeeks = [earlier,...weeks];
  const values = trendWeeks.map(rate);
  const low = Math.max(0, Math.floor(Math.min(...values) / 5) * 5 - 5);
  const high = Math.min(100, Math.ceil(Math.max(...values) / 5) * 5 + 5);
  const ticks = Array.from({length:(high-low)/5+1}, (_,i) => low+i*5);
  const y = value => 178 - (value-low)/(high-low)*156;
  const points = trendWeeks.map((week,i) => ({week,x:78+844*i/Math.max(trendWeeks.length-1,1),y:y(rate(week))}));
  const path = points.map((point,i) => `${i?'L':'M'}${point.x},${point.y}`).join(' ');
  const first = points[0], last = points.at(-1);
  chart.innerHTML = `<div class="weekly-axis" aria-hidden="true">${ticks.map(tick=>`<span style="top:${y(tick)/2}%">${tick}%</span>`).join('')}</div>
    <div class="weekly-plot"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs><linearGradient id="weekly-fill" x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#387ce9" stop-opacity=".2"/><stop offset="1" stop-color="#387ce9" stop-opacity=".025"/></linearGradient></defs>
      ${ticks.map(tick=>`<line class="weekly-gridline" x1="0" x2="1000" y1="${y(tick)}" y2="${y(tick)}" vector-effect="non-scaling-stroke"/>`).join('')}
      <path d="${path} L${last.x},178 L${first.x},178 Z" fill="url(#weekly-fill)"/>
      <path class="weekly-line" d="${path}" fill="none" vector-effect="non-scaling-stroke"/>
    </svg>${points.map(({week,x,y},i)=>`<button type="button" class="weekly-point${week===earlier?' is-earlier':''}" style="left:${x/10}%;top:${y/2}%" data-week="${i}" aria-pressed="false" aria-label="${label(week)}，${rate(week).toFixed(1)}%，通过 ${week.passes} 次，共 ${week.attempts} 次尝试"><span>${rate(week).toFixed(1)}%</span></button>`).join('')}
    ${points.map(({week,x})=>`<span class="weekly-period" style="left:${x/10}%"><span>${week.start}</span><span class="weekly-period-end">${week.end?'–'+week.end:'累计'}</span></span>`).join('')}</div>`;

  const buttons = [...chart.querySelectorAll('[data-week]')];
  function select(i) {
    const week = trendWeeks[i];
    for (const [index,button] of buttons.entries()) button.setAttribute('aria-pressed', String(index===i));
    detail.textContent = `${label(week)} · ${week.runs} 条运行 · P0–P7 · ${week.passes} 次通过 / ${week.attempts} 次尝试 · ${week.attempts-week.passes} 次失败${week.countNote?' · '+week.countNote:''}`;
  }
  buttons.forEach((button,i) => button.addEventListener('click', () => select(i)));
  select(trendWeeks.length-1);

  const delta = rate(latest)-rate(previous);
  change.textContent = `最新一期 ${delta>=0?'+':'−'}${Math.abs(delta).toFixed(1)} 个百分点`;
  change.classList.toggle('is-down', delta<0);
  change.hidden = false;
  const failures = latest.attempts-latest.passes;
  const {uploadFailures,reviewHolds,deviceFailures,preflightFailures,preflightRuns} = latest.review;
  document.getElementById('focus-summary').textContent = `最近一周 · ${latestWeekLabel} · P0–P7 通过率 ${rate(latest).toFixed(1)}% · ${failures} 次失败 · ${preflightFailures} 次预检失败（${preflightRuns} 条有计数）`;
  document.getElementById('focus-device').textContent = `P6 失败 ${deviceFailures} 次，占本期 P0–P7 的 ${failures} 次失败的 ${(100*deviceFailures/failures).toFixed(1)}%。`;
  document.getElementById('focus-upload').textContent = `P8 原始失败 ${uploadFailures} 次，含 ${reviewHolds} 次审核停点，操作性失败 ${uploadFailures-reviewHolds} 次。`;
  const failureScope = document.getElementById('failure-scope');
  for(const week of weeks.slice().reverse()) {
    failureScope.add(new Option(week===latest?`${label(week)}（最近一周）`:label(week),week.snapshot));
  }
  failureScope.value = 'all';
  document.getElementById('focus-archive-list').innerHTML = weeks.slice(0,-1).reverse().map(week=>`<details class="focus-week">
    <summary><strong>${label(week)}</strong><span>P0–P7 · ${week.attempts-week.passes} 次失败 · 通过率 ${rate(week).toFixed(1)}%</span></summary>
    ${week.topics?.length?`<dl>${week.topics.map(([stages,title,description])=>`<div><dt>${stages.map(stage=>`<span class="focus-stage">${stage}</span>`).join('')}<span>${title}</span></dt><dd>${description}</dd></div>`).join('')}</dl>`:'<p class="focus-week-empty">该期的优化方向待补充。</p>'}
    ${week.note?`<p class="focus-week-note">${week.note}</p>`:''}
  </details>`).join('');
}
