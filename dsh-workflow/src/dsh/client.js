/*
 * Official DSH browser extension.  This file intentionally follows the
 * browser bundle contract used by DeepSeek Harness client packages: the host
 * half is loaded by Cordis and this factory is materialized by
 * @deepseek-ai/dsh-client-modules.  The AR workbench is therefore a normal
 * DSH `main` panel and sidebar entry, rather than a second web application.
 */
window.__ModuleLoader__.load({
  id: '@ai-ar/dsh-workflow',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require('react');
    const { createElement: h, Fragment, useCallback, useEffect, useMemo, useState } = React;

    const API = '/api/ohos-ar';
    const PANEL_ID = 'ar-delivery';
    const DEFAULT_AR_PATH = 'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json';

    const css = `
      .aiArPanel{height:100%;overflow:auto;box-sizing:border-box;background:var(--dsw-alias-bg-base,#f7f8fa);color:var(--dsw-alias-label-primary,#182230);font-size:14px}
      .aiArShell{max-width:1480px;margin:0 auto;padding:28px 34px 48px}
      .aiArTop{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:24px}
      .aiArEyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,#718096);font-weight:700}
      .aiArTitle{margin:5px 0 4px;font-size:27px;line-height:1.16;letter-spacing:-.025em}
      .aiArSubtitle{margin:0;color:var(--dsw-alias-label-secondary,#5d6b7c);max-width:760px}
      .aiArTopActions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .aiArButton{border:1px solid var(--dsw-alias-border-l3,#d4dce6);background:var(--dsw-alias-button-elevated-fill,#fff);color:inherit;border-radius:9px;padding:8px 12px;cursor:pointer;font:inherit;transition:background .15s,border-color .15s,transform .15s}
      .aiArButton:hover{background:var(--dsw-alias-interactive-bg-hover,#eef3f8);border-color:var(--dsw-alias-border-l2,#bdc8d6)}
      .aiArButton:active{transform:translateY(1px)}
      .aiArButton:disabled{opacity:.52;cursor:wait;transform:none}
      .aiArButtonPrimary{background:#246bfe;color:#fff;border-color:#246bfe;box-shadow:0 4px 14px #246bfe2b}
      .aiArButtonPrimary:hover{background:#185be2;border-color:#185be2}
      .aiArButtonDanger{color:#bd3445}
      .aiArGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
      .aiArKpi{border:1px solid var(--dsw-alias-border-l3,#d4dce6);border-radius:12px;padding:15px 16px;background:var(--dsw-alias-bg-elevated,#fff);min-height:74px}
      .aiArKpiLabel{font-size:12px;color:var(--dsw-alias-label-secondary,#5d6b7c);margin-bottom:8px}
      .aiArKpiValue{font-size:23px;font-weight:650;letter-spacing:-.02em}
      .aiArLayout{display:grid;grid-template-columns:minmax(250px,.82fr) minmax(0,2.18fr);gap:16px;align-items:start}
      .aiArCard{border:1px solid var(--dsw-alias-border-l3,#d4dce6);border-radius:13px;background:var(--dsw-alias-bg-elevated,#fff);box-shadow:0 5px 22px #1720330a;overflow:hidden}
      .aiArCardHeader{padding:15px 17px;border-bottom:1px solid var(--dsw-alias-border-l3,#d4dce6);display:flex;align-items:center;justify-content:space-between;gap:10px}
      .aiArCardHeader h2{font-size:14px;margin:0;font-weight:650}
      .aiArCardBody{padding:16px 17px}
      .aiArRunList{max-height:520px;overflow:auto}
      .aiArRunRow{width:100%;text-align:left;border:0;border-bottom:1px solid var(--dsw-alias-border-l3,#d4dce6);background:transparent;color:inherit;padding:13px 17px;cursor:pointer;display:block}
      .aiArRunRow:last-child{border-bottom:0}
      .aiArRunRow:hover,.aiArRunRowActive{background:var(--dsw-alias-interactive-bg-hover,#f2f5f8)}
      .aiArRunRowActive{box-shadow:inset 3px 0 #246bfe}
      .aiArRunTop{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:7px}
      .aiArRunId{font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .aiArRunMeta{display:flex;gap:8px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary,#5d6b7c);font-size:12px}
      .aiArStatus{border-radius:999px;padding:3px 8px;font-size:11px;font-weight:650;white-space:nowrap}
      .aiArStatusGood{color:#147a4b;background:#dff7eb}.aiArStatusRun{color:#155dcc;background:#e1ecff}.aiArStatusWait{color:#9a5d00;background:#fff0cc}.aiArStatusBad{color:#b22d3c;background:#ffe2e5}.aiArStatusNeutral{color:#5d6b7c;background:#edf1f5}
      .aiArEmpty{padding:28px 17px;color:var(--dsw-alias-label-secondary,#5d6b7c);line-height:1.6}
      .aiArForm{display:grid;gap:11px}
      .aiArField{display:grid;gap:5px}.aiArField label{font-size:12px;color:var(--dsw-alias-label-secondary,#5d6b7c)}
      .aiArField input,.aiArField select,.aiArField textarea{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3,#d4dce6);border-radius:8px;padding:8px 10px;background:var(--dsw-alias-bg-base,#f7f8fa);color:inherit;font:inherit;outline:0}
      .aiArField input:focus,.aiArField select:focus,.aiArField textarea:focus{border-color:#246bfe;box-shadow:0 0 0 3px #246bfe1f}
      .aiArField textarea{min-height:74px;resize:vertical}.aiArTwo{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .aiArNotice{border-radius:9px;padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.55}.aiArNoticeWarn{background:#fff5dc;color:#865300}.aiArNoticeBad{background:#ffe7e9;color:#a32a39}.aiArNoticeInfo{background:#e9f1ff;color:#1c579e}
      .aiArAgentMeta{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:12px}.aiArAgentMeta strong{font-size:13px}.aiArAgentHint{margin-top:6px;color:var(--dsw-alias-label-secondary,#5d6b7c);font-size:11px;line-height:1.5}
      .aiArDetailTitle{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.aiArDetailTitle h2{margin:0 0 5px;font-size:17px}.aiArDetailTitle p{margin:0;color:var(--dsw-alias-label-secondary,#5d6b7c);font-size:12px}
      .aiArTabs{display:flex;gap:4px;border-bottom:1px solid var(--dsw-alias-border-l3,#d4dce6);margin:15px -17px 0;padding:0 17px}.aiArTab{border:0;background:transparent;color:var(--dsw-alias-label-secondary,#5d6b7c);padding:8px 10px;cursor:pointer;font:inherit;font-size:12px;border-bottom:2px solid transparent}.aiArTabActive{color:#246bfe;border-bottom-color:#246bfe;font-weight:650}
      .aiArTable{width:100%;border-collapse:collapse;font-size:12px}.aiArTable th{text-align:left;color:var(--dsw-alias-label-secondary,#5d6b7c);font-weight:550;padding:10px 8px;border-bottom:1px solid var(--dsw-alias-border-l3,#d4dce6)}.aiArTable td{padding:10px 8px;border-bottom:1px solid var(--dsw-alias-border-l3,#d4dce6);vertical-align:top}.aiArTable tr:last-child td{border-bottom:0}
      .aiArMono{font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}.aiArMuted{color:var(--dsw-alias-label-secondary,#5d6b7c)}.aiArTiny{font-size:11px}.aiArBar{height:5px;border-radius:999px;background:#e8edf3;overflow:hidden;min-width:80px}.aiArBar i{display:block;height:100%;background:#246bfe;border-radius:inherit}.aiArStack{display:grid;gap:13px}.aiArDivider{height:1px;background:var(--dsw-alias-border-l3,#d4dce6);margin:15px 0}.aiArArtifact{border:1px solid var(--dsw-alias-border-l3,#d4dce6);border-radius:9px;padding:11px}.aiArArtifact + .aiArArtifact{margin-top:8px}.aiArArtifactTop{display:flex;justify-content:space-between;gap:10px}.aiArArtifact pre{white-space:pre-wrap;overflow:auto;background:var(--dsw-alias-bg-base,#f7f8fa);border-radius:6px;padding:9px;font-size:11px;max-height:240px}.aiArEvent{display:grid;grid-template-columns:125px 1fr;gap:10px;padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l3,#d4dce6);font-size:12px}.aiArEvent:last-child{border-bottom:0}.aiArError{color:#b22d3c;margin:0 0 15px}.aiArLoading{padding:50px;text-align:center;color:var(--dsw-alias-label-secondary,#5d6b7c)}
      @media (max-width:1000px){.aiArGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.aiArLayout{grid-template-columns:1fr}.aiArRunList{max-height:300px}}
      @media (max-width:620px){.aiArShell{padding:20px 16px 36px}.aiArTop{display:block}.aiArTopActions{justify-content:flex-start;margin-top:14px}.aiArGrid{grid-template-columns:1fr 1fr}.aiArTwo{grid-template-columns:1fr}.aiArEvent{grid-template-columns:1fr;gap:3px}}
    `;

    function injectStyles() {
      if (typeof document === 'undefined' || document.querySelector('style[data-ai-ar-dsh]')) return;
      const tag = document.createElement('style');
      tag.dataset.aiArDsh = 'true';
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    function formatDuration(value) {
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
      const ms = Math.max(0, Number(value));
      if (ms < 1000) return `${Math.round(ms)} ms`;
      const seconds = ms / 1000;
      if (seconds < 60) return `${seconds.toFixed(1)} s`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${Math.round(seconds % 60)}s`;
    }

    function statusTone(status) {
      const value = String(status ?? '').toLowerCase();
      if (['completed', 'accepted', 'passed', 'success'].includes(value)) return 'aiArStatusGood';
      if (value.includes('await') || value.includes('consent') || value.includes('human')) return 'aiArStatusWait';
      if (['failed', 'rejected', 'cancelled', 'error'].includes(value) || value.includes('fail')) return 'aiArStatusBad';
      if (['running', 'leased', 'active', 'started', 'accepted_by_host'].includes(value)) return 'aiArStatusRun';
      return 'aiArStatusNeutral';
    }

    function Status({ value }) {
      return h('span', { className: `aiArStatus ${statusTone(value)}` }, String(value ?? 'unknown'));
    }

    function Button({ children, primary = false, danger = false, ...props }) {
      return h('button', { ...props, className: `aiArButton${primary ? ' aiArButtonPrimary' : ''}${danger ? ' aiArButtonDanger' : ''}` }, children);
    }

    function Kpi({ label, value }) {
      return h('div', { className: 'aiArKpi' }, h('div', { className: 'aiArKpiLabel' }, label), h('div', { className: 'aiArKpiValue' }, value));
    }

    async function api(path, options = {}) {
      const response = await fetch(`${API}${path}`, {
        credentials: 'same-origin',
        ...options,
        headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers ?? {}) },
      });
      let value;
      try { value = await response.json(); } catch { value = {}; }
      if (!response.ok) throw new Error(value?.error?.message ?? `DSH API ${response.status}`);
      return value;
    }

    function agentStatusLabel(option) {
      if (!option) return '未选择';
      if (option.available === true) {
        const found = option.version ? `已发现 · ${option.version}` : '已发现';
        return option.dispatchable === false ? `${found}（待适配器）` : found;
      }
      if (option.available === false) return option.status === 'provider_missing' ? 'Provider 未加载' : '未发现';
      return option.status === 'configured' ? '已配置（待适配器）' : '待配置';
    }

    function CodeAgentSettings({ overview, onSaved }) {
      const catalog = overview?.codeagents ?? {};
      const options = catalog.options ?? [];
      const [selected, setSelected] = useState(catalog.selected ?? 'claude-code');
      const [custom, setCustom] = useState(catalog.custom ?? { name: '自定义 CodeAgent', command: '', args: [], model: '' });
      const [busy, setBusy] = useState(false);
      const [refreshing, setRefreshing] = useState(false);
      const [message, setMessage] = useState('');
      const selectedOption = options.find((item) => item.id === selected) ?? catalog.selected_config;
      useEffect(() => { if (catalog.selected) setSelected(catalog.selected); }, [catalog.selected]);
      useEffect(() => {
        if (catalog.custom) setCustom({ name: '自定义 CodeAgent', command: '', args: [], model: '', ...catalog.custom });
      }, [catalog.custom?.name, catalog.custom?.command, catalog.custom?.model, JSON.stringify(catalog.custom?.args ?? [])]);
      const save = async () => {
        setBusy(true); setMessage('');
        try {
          const value = await api('/codeagents', { method: 'PUT', body: JSON.stringify({ selected, custom }) });
          onSaved(value);
          setMessage('CodeAgent 设置已保存，新建 run 时生效。');
        } catch (cause) { setMessage(cause.message); } finally { setBusy(false); }
      };
      const refresh = async () => {
        setRefreshing(true); setMessage('');
        try {
          const value = await api('/codeagents/refresh', { method: 'POST' });
          onSaved(value);
          setMessage('本地 CodeAgent 探测已刷新。');
        } catch (cause) { setMessage(cause.message); } finally { setRefreshing(false); }
      };
      const updateCustom = (field, value) => setCustom((current) => ({ ...current, [field]: value }));
      return h('section', { className: 'aiArCard' },
        h('div', { className: 'aiArCardHeader' }, h('h2', null, 'CodeAgent 设置'),
          h('div', { className: 'aiArTopActions' },
            h(Status, { value: selectedOption?.available === false ? 'unavailable' : 'configured' }),
            h(Button, { disabled: busy || refreshing, onClick: refresh }, refreshing ? '探测中…' : '刷新本地 Agent'),
          ),
        ),
        h('div', { className: 'aiArCardBody' },
          h('div', { className: 'aiArForm' },
            h('div', { className: 'aiArField' },
              h('label', null, '执行 Agent'),
              h('select', { value: selected, onChange: (event) => setSelected(event.target.value) },
                options.map((option) => h('option', { value: option.id, key: option.id }, `${option.name} · ${agentStatusLabel(option)}`)),
              ),
              h('div', { className: 'aiArMuted aiArTiny' }, '可配置 Claude Code、OpenCode、Codex CLI、Cursor Agent、Trae CLI 或自定义命令。可用性按当前 DSH 云主机探测结果显示。'),
            ),
            selectedOption && h('div', { className: `aiArNotice ${selectedOption.available === false ? 'aiArNoticeWarn' : 'aiArNoticeInfo'}`, style: { marginBottom: 0 } },
              h('div', { className: 'aiArAgentMeta' }, h('strong', null, selectedOption.name), h('span', null, agentStatusLabel(selectedOption))),
              h('div', { className: 'aiArAgentHint' }, selectedOption.description || '这个 Agent 将用于新建的 AR workflow run。'),
              selectedOption.command && h('div', { className: 'aiArAgentHint' }, `命令：${selectedOption.command}${selectedOption.path ? ` · 路径：${selectedOption.path}` : ''}`),
              selectedOption.dispatchable === false && h('div', { className: 'aiArAgentHint' }, '当前只完成本地发现和配置；对应宿主适配器加载前，新建 run 会被拒绝。'),
              selectedOption.kind === 'official-provider' && h('div', { className: 'aiArAgentHint' }, `工具：${selectedOption.tool || 'subagent_claude_code'} · 认证：${selectedOption.auth || '由 Agent 原生设置管理'}`),
            ),
            selected === 'custom' && h(Fragment, null,
              h('div', { className: 'aiArTwo' },
                h('div', { className: 'aiArField' }, h('label', null, '显示名称'), h('input', { value: custom.name, onChange: (event) => updateCustom('name', event.target.value), placeholder: '我的 CodeAgent' })),
                h('div', { className: 'aiArField' }, h('label', null, '模型（可选）'), h('input', { value: custom.model, onChange: (event) => updateCustom('model', event.target.value), placeholder: '由命令自行选择' })),
              ),
              h('div', { className: 'aiArField' }, h('label', null, '命令路径'), h('input', { value: custom.command, onChange: (event) => updateCustom('command', event.target.value), placeholder: '/usr/local/bin/my-codeagent' })),
              h('div', { className: 'aiArField' }, h('label', null, '固定参数（每行一个，可选）'), h('textarea', { value: (custom.args ?? []).join('\\n'), onChange: (event) => updateCustom('args', event.target.value.split(/\\r?\\n/u).map((item) => item.trim()).filter(Boolean)), placeholder: '--workspace\\n{{repo_root}}' })),
            ),
            h(Button, { primary: true, disabled: busy || !selected || (selected === 'custom' && !custom.command.trim()), onClick: save }, busy ? '保存中…' : '保存 CodeAgent 设置'),
          ),
          h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 10 } }, '设置保存在 DSH runtime 数据目录；已创建的 run 保留启动时的 Agent。'),
          message && h('div', { className: `aiArNotice ${message.includes('已保存') ? 'aiArNoticeInfo' : 'aiArNoticeWarn'}`, style: { marginTop: 10, marginBottom: 0 } }, message),
        ),
      );
    }

    function StartCard({ overview, onStarted }) {
      const [environment, setEnvironment] = useState('openharmony');
      const [component, setComponent] = useState('system');
      const [arPath, setArPath] = useState('');
      const [arText, setArText] = useState('');
      const [confirmDefaults, setConfirmDefaults] = useState(false);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const start = async () => {
        setBusy(true); setError('');
        try {
          const value = await api('/runs', { method: 'POST', body: JSON.stringify({
            input_ref: `local://dsh/ar/${Date.now()}`,
            ar_path: arPath || overview?.default_ar_path || DEFAULT_AR_PATH,
            ar_text: arText || undefined,
            repo_root: overview?.repo_root || undefined,
            environment,
            component_type: environment === 'harmonyos' ? component : undefined,
            confirm_defaults: confirmDefaults,
            agent: overview?.codeagents?.selected ?? 'claude-code',
            model: overview?.codeagents?.selected_config?.model || undefined,
            idempotency_key: `dsh-web-start-${Date.now()}`,
          }) });
          onStarted(value.run_id);
          setArText('');
        } catch (cause) { setError(cause.message); } finally { setBusy(false); }
      };
      return h('section', { className: 'aiArCard' },
        h('div', { className: 'aiArCardHeader' }, h('h2', null, '启动 AR 工作流'), h(Status, { value: overview?.service ? 'ready' : 'offline' })),
        h('div', { className: 'aiArCardBody' },
          error && h('div', { className: 'aiArNotice aiArNoticeBad' }, error),
          overview?.codeagents?.selected_config && h('div', { className: `aiArNotice ${overview.codeagents.selected_config.available === false ? 'aiArNoticeWarn' : 'aiArNoticeInfo'}` }, `当前新建 run 使用：${overview.codeagents.selected_config.name}（${agentStatusLabel(overview.codeagents.selected_config)}）`),
          h('div', { className: 'aiArForm' },
            h('div', { className: 'aiArTwo' },
              h('div', { className: 'aiArField' }, h('label', null, '代码环境'), h('select', { value: environment, onChange: (event) => setEnvironment(event.target.value) }, h('option', { value: 'openharmony' }, 'OpenHarmony'), h('option', { value: 'harmonyos' }, 'HarmonyOS'))),
              h('div', { className: 'aiArField' }, h('label', null, 'HarmonyOS 分支'), h('select', { value: component, disabled: environment !== 'harmonyos', onChange: (event) => setComponent(event.target.value) }, h('option', { value: 'system' }, 'system'), h('option', { value: 'chip' }, 'chip'))),
            ),
            h('div', { className: 'aiArField' }, h('label', null, 'AR 文件（留空使用仓库示例）'), h('input', { value: arPath, placeholder: overview?.default_ar_path || DEFAULT_AR_PATH, onChange: (event) => setArPath(event.target.value) })),
            h('div', { className: 'aiArField' }, h('label', null, '补充需求（可选）'), h('textarea', { value: arText, placeholder: '可直接粘贴本次需求；同时提供文件时以文件为准。', onChange: (event) => setArText(event.target.value) })),
            h('label', { className: 'aiArTiny', style: { display: 'flex', gap: 7, alignItems: 'flex-start', color: 'var(--dsw-alias-label-secondary,#5d6b7c)' } }, h('input', { type: 'checkbox', checked: confirmDefaults, onChange: (event) => setConfirmDefaults(event.target.checked) }), h('span', null, '我确认使用 AR 示例默认组件（OpenHarmony: hiview；其他环境请先填写明确的组件参数）。')),
            h(Button, { primary: true, disabled: busy || !overview?.repo_root || !confirmDefaults, onClick: start }, busy ? '启动中…' : '启动 P0 →'),
          ),
          overview?.repo_root && h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 12 } }, `WSL 代码根：${overview.repo_root}`),
        ),
      );
    }

    function RunRow({ run, active, onClick }) {
      const observation = run.observability ?? {};
      return h('button', { type: 'button', className: `aiArRunRow${active ? ' aiArRunRowActive' : ''}`, onClick },
        h('div', { className: 'aiArRunTop' }, h('span', { className: 'aiArRunId' }, run.run_id), h(Status, { value: run.status })),
        h('div', { className: 'aiArRunMeta' },
          h('span', null, `Agent ${run.agent ?? '—'}`),
          h('span', null, `当前阶段 ${observation.current_stage ?? '—'}`),
          h('span', null, `${observation.stage_count ?? 0} stages`),
          h('span', null, `${observation.human_intervention_count ?? 0} 次人工`),
        ),
      );
    }

    function StageTable({ stages }) {
      if (!stages?.length) return h('div', { className: 'aiArEmpty' }, '运行已创建，等待 P0 证据写入。');
      return h('div', { style: { overflowX: 'auto' } }, h('table', { className: 'aiArTable' },
        h('thead', null, h('tr', null, h('th', null, '阶段'), h('th', null, '状态'), h('th', null, '耗时'), h('th', null, '尝试'), h('th', null, '门控失败'))),
        h('tbody', null, stages.map((stage) => h('tr', { key: `${stage.phase}-${stage.revision}` },
          h('td', null, h('div', { className: 'aiArMono' }, stage.phase), h('div', { className: 'aiArMuted aiArTiny' }, stage.role ?? '—')),
          h('td', null, h(Status, { value: stage.status })),
          h('td', null, formatDuration(stage.elapsed_ms)),
          h('td', null, `${stage.attempts?.length ?? 0}`),
          h('td', null, `${stage.validation_failures ?? 0}`),
        )))
      ));
    }

    function ConsentBox({ runId, blockers, onChanged }) {
      const [taskId, setTaskId] = useState(blockers?.[0]?.task_id ?? '');
      const [phase, setPhase] = useState(blockers?.[0]?.phase ?? 1);
      const [token, setToken] = useState('');
      const [busy, setBusy] = useState(false);
      const [message, setMessage] = useState('');
      useEffect(() => { setTaskId(blockers?.[0]?.task_id ?? ''); setPhase(blockers?.[0]?.phase ?? 1); }, [blockers]);
      if (!blockers?.length) return null;
      const submit = async () => {
        setBusy(true); setMessage('');
        try { await api(`/runs/${encodeURIComponent(runId)}/consent`, { method: 'POST', body: JSON.stringify({ task_id: taskId, phase: Number(phase), token }) }); setToken(''); setMessage('人工审核已记录，正在同步状态。'); onChanged(); }
        catch (cause) { setMessage(cause.message); } finally { setBusy(false); }
      };
      return h('div', { className: 'aiArNotice aiArNoticeWarn' },
        h('strong', null, `需要人工审核：${blockers.map((item) => item.phase).join(', ')}`),
        h('div', { className: 'aiArForm', style: { marginTop: 8 } },
          h('div', { className: 'aiArTwo' }, h('input', { value: taskId, placeholder: 'task_id', onChange: (event) => setTaskId(event.target.value) }), h('input', { value: phase, type: 'number', min: 1, max: 8, onChange: (event) => setPhase(event.target.value) })),
          h('input', { value: token, placeholder: '输入 evidence-bound consent token', onChange: (event) => setToken(event.target.value) }),
          h(Button, { primary: true, disabled: busy || !taskId || !token, onClick: submit }, busy ? '提交中…' : '记录审核并同步'),
          message && h('span', { className: 'aiArTiny' }, message),
        ),
      );
    }

    function Detail({ detail, artifacts, events, onRefresh }) {
      const [tab, setTab] = useState('overview');
      const [syncing, setSyncing] = useState(false);
      if (!detail) return h('div', { className: 'aiArLoading' }, '选择一个运行以查看完整维测。');
      const observation = detail.observability ?? {};
      const sync = async () => { setSyncing(true); try { await api(`/runs/${encodeURIComponent(detail.run_id)}/sync`, { method: 'POST' }); onRefresh(); } finally { setSyncing(false); } };
      const blockers = observation.current_blockers ?? [];
      return h('section', { className: 'aiArCard' },
        h('div', { className: 'aiArCardBody' },
          h('div', { className: 'aiArDetailTitle' }, h('div', null, h('h2', null, detail.run_id), h('p', null, `${detail.workflow ?? 'ar-delivery'} · ${detail.environment_profile ?? 'environment pending'} · Agent ${detail.agent ?? '—'}`)), h('div', { className: 'aiArTopActions' }, h(Status, { value: detail.status }), h(Button, { disabled: syncing, onClick: sync }, syncing ? '同步中…' : '同步证据'))),
          blockers.length > 0 && h(ConsentBox, { runId: detail.run_id, blockers, onChanged: onRefresh }),
          h('div', { className: 'aiArGrid', style: { marginTop: 15, marginBottom: 0 } },
            h(Kpi, { label: '当前阶段', value: observation.current_stage ?? '—' }),
            h(Kpi, { label: '运行时长', value: formatDuration(Date.parse(observation.run_updated_at ?? detail.updated_at) - Date.parse(observation.run_started_at ?? detail.created_at)) }),
            h(Kpi, { label: '人工介入', value: `${observation.human_intervention_count ?? 0} 次` }),
            h(Kpi, { label: 'Token 用量', value: observation.token_usage?.status === 'unknown' ? '待接入' : `${observation.token_usage?.input_tokens ?? 0} + ${observation.token_usage?.output_tokens ?? 0}` }),
          ),
          (observation.current_blockers?.length > 0 || observation.failure_count > 0) && h('div', { className: 'aiArNotice aiArNoticeBad', style: { marginTop: 14, marginBottom: 0 } }, h('strong', null, '当前不成功原因'), ': ', (observation.current_blockers ?? []).map((item) => `${item.code}(${item.phase})`).join('、') || `${observation.failure_count} 次确定性门控失败`),
          h('div', { className: 'aiArTabs' }, ['overview', 'artifacts', 'events'].map((name) => h('button', { key: name, className: `aiArTab${tab === name ? ' aiArTabActive' : ''}`, onClick: () => setTab(name) }, name === 'overview' ? '阶段与人工审核' : name === 'artifacts' ? `产物 (${artifacts?.artifacts?.length ?? 0})` : `事件 (${events?.length ?? 0})`))),
          tab === 'overview' && h('div', { className: 'aiArStack', style: { marginTop: 14 } }, h(StageTable, { stages: observation.stages }), h('div', { className: 'aiArDivider' }), h('div', { className: 'aiArMuted aiArTiny' }, `成功 ${observation.success_count ?? 0} 次 · 失败 ${observation.failure_count ?? 0} 次 · 事件 ${observation.event_count ?? 0} 条 · 最后序号 ${observation.last_event_seq ?? 0}`), observation.human_inputs?.length > 0 && h('div', null, h('div', { className: 'aiArEyebrow', style: { marginBottom: 7 } }, '人工输入记录'), observation.human_inputs.map((input, index) => h('div', { className: 'aiArEvent', key: `${input.at}-${index}` }, h('span', { className: 'aiArMuted aiArMono' }, input.at), h('span', null, `${input.kind} · P${input.phase} · ${input.task_id ?? '—'}${input.evidence ? ` · ${input.evidence}` : ''}`))))),
          tab === 'artifacts' && h('div', { style: { marginTop: 14 } }, artifacts?.artifacts?.length ? artifacts.artifacts.map((artifact) => h('div', { className: 'aiArArtifact', key: artifact.artifact_id }, h('div', { className: 'aiArArtifactTop' }, h('strong', null, artifact.relative_path), h('span', { className: 'aiArMuted aiArTiny' }, artifact.role)), h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 5 } }, `${artifact.size_bytes} bytes · sha256 ${artifact.sha256}`), artifact.content !== null && h('pre', null, artifact.content))) : h('div', { className: 'aiArEmpty' }, '当前 run 尚未产生可展示产物。')),
          tab === 'events' && h('div', { style: { marginTop: 14 } }, events?.length ? [...events].reverse().map((event) => h('div', { className: 'aiArEvent', key: event.seq }, h('span', { className: 'aiArMuted aiArMono' }, `#${event.seq} ${event.created_at}`), h('span', null, h('strong', null, event.type), h('pre', { style: { margin: '5px 0 0' } }, JSON.stringify(event.payload ?? {}, null, 2))))) : h('div', { className: 'aiArEmpty' }, '暂无事件。')),
        ),
      );
    }

    function ARPanel() {
      const [overview, setOverview] = useState(null);
      const [selected, setSelected] = useState(null);
      const [detail, setDetail] = useState(null);
      const [artifacts, setArtifacts] = useState(null);
      const [events, setEvents] = useState([]);
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(true);
      const loadOverview = useCallback(async (preferred = null) => {
        try {
          const value = await api('/overview');
          setOverview(value);
          const next = preferred || selected || value.runs?.[0]?.run_id || null;
          setSelected(next);
          setError('');
        } catch (cause) { setError(cause.message); } finally { setLoading(false); }
      }, [selected]);
      const loadDetail = useCallback(async (runId) => {
        if (!runId) { setDetail(null); return; }
        try {
          const [status, runArtifacts, runEvents] = await Promise.all([
            api(`/runs/${encodeURIComponent(runId)}`),
            api(`/runs/${encodeURIComponent(runId)}/artifacts`),
            api(`/runs/${encodeURIComponent(runId)}/events`),
          ]);
          setDetail(status); setArtifacts(runArtifacts); setEvents(runEvents.events ?? []); setError('');
        } catch (cause) { setError(cause.message); }
      }, []);
      useEffect(() => { injectStyles(); loadOverview(); const timer = window.setInterval(() => loadOverview(), 3500); return () => window.clearInterval(timer); }, []);
      useEffect(() => { loadDetail(selected); }, [selected, loadDetail]);
      const active = useMemo(() => (overview?.runs ?? []).filter((run) => !['completed', 'cancelled', 'rejected'].includes(String(run.status))), [overview]);
      if (loading) return h('div', { className: 'aiArPanel' }, h('div', { className: 'aiArLoading' }, '正在连接 DSH AR runtime…'));
      return h('div', { className: 'aiArPanel' }, h('div', { className: 'aiArShell' },
        h('div', { className: 'aiArTop' }, h('div', null, h('div', { className: 'aiArEyebrow' }, 'DeepSeek Harness · Official Web UI extension'), h('h1', { className: 'aiArTitle' }, 'AR Delivery Workbench'), h('p', { className: 'aiArSubtitle' }, '在官方 DSH 页面内编排 OpenHarmony / HarmonyOS 生命周期，查看确定性门控、人工审核、SSH 代码端、设备调试与产物证据。')), h('div', { className: 'aiArTopActions' }, h(Button, { onClick: () => loadOverview(selected) }, '刷新'), h(Button, { onClick: () => setSelected(null) }, '新建运行'))),
        error && h('div', { className: 'aiArNotice aiArNoticeBad' }, error),
        h('div', { className: 'aiArGrid' }, h(Kpi, { label: '运行中 / 等待审核', value: `${active.length} / ${active.filter((run) => run.status?.includes('consent')).length}` }), h(Kpi, { label: '已成功运行', value: `${(overview?.runs ?? []).filter((run) => run.status === 'completed').length}` }), h(Kpi, { label: '人工审核总次数', value: `${(overview?.runs ?? []).reduce((sum, run) => sum + (run.observability?.human_intervention_count ?? 0), 0)}` }), h(Kpi, { label: '数据来源', value: 'SQLite + gates' })),
        h('div', { className: 'aiArLayout' }, h('div', { className: 'aiArStack' }, h(CodeAgentSettings, { overview, onSaved: (value) => setOverview((current) => ({ ...current, codeagents: value })) }), h(StartCard, { overview, onStarted: (runId) => { setSelected(runId); loadOverview(runId); } }), h('section', { className: 'aiArCard' }, h('div', { className: 'aiArCardHeader' }, h('h2', null, `AR runs (${overview?.runs?.length ?? 0})`), h('span', { className: 'aiArMuted aiArTiny' }, '自动刷新 3.5s')), overview?.runs?.length ? h('div', { className: 'aiArRunList' }, overview.runs.map((run) => h(RunRow, { key: run.run_id, run, active: selected === run.run_id, onClick: () => setSelected(run.run_id) }))) : h('div', { className: 'aiArEmpty' }, '还没有 run。启动左侧 P0 预检后，完整状态会出现在这里。'))), h(Detail, { detail, artifacts, events, onRefresh: () => { loadOverview(selected); loadDetail(selected); } })),
      ));
    }

    function PanelIcon({ size = 16 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' }, h('path', { d: 'M6 4.75h12A1.25 1.25 0 0 1 19.25 6v12A1.25 1.25 0 0 1 18 19.25H6A1.25 1.25 0 0 1 4.75 18V6A1.25 1.25 0 0 1 6 4.75Z', stroke: 'currentColor', strokeWidth: '1.7' }), h('path', { d: 'm8 9 2.25 3L8 15m4.5 0H16', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }

    const inject = ['slots', 'layout'];
    function apply(ctx) {
      injectStyles();
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 10, label: 'AR Delivery' }, PanelIcon));
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, ARPanel));
      if (ctx.layout) {
        ctx.effect(() => {
          let selected = false;
          const choose = () => {
            if (selected || !ctx.slots.entries('main').some((entry) => entry.options.key === PANEL_ID)) return;
            selected = true;
            try { ctx.layout.selectPanel(PANEL_ID); } catch { selected = false; }
          };
          const dispose = ctx.slots.subscribe('main', choose);
          choose();
          return dispose;
        }, 'ai-ar: select official delivery panel');
      }
    }
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
