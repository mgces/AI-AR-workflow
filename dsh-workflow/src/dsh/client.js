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
      .aiArArtifactActions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:9px}.aiArScheduler{border:1px solid var(--dsw-alias-border-l3,#d4dce6);border-radius:9px;background:var(--dsw-alias-bg-base,#f7f8fa);padding:10px 12px;margin:13px 0}.aiArProcess{border:1px solid var(--dsw-alias-border-l3,#d4dce6);border-radius:9px;background:var(--dsw-alias-bg-base,#f7f8fa);padding:11px 12px}.aiArProcessTitle{display:flex;justify-content:space-between;gap:10px;align-items:center}.aiArProcessTable{margin-top:8px}.aiArRagResults{display:grid;gap:7px;margin-top:10px}.aiArRagResult{border:1px solid var(--dsw-alias-border-l3,#d4dce6);border-radius:8px;padding:9px;background:var(--dsw-alias-bg-base,#f7f8fa)}
      .aiArPreflight{display:grid;gap:10px}.aiArPreflightPlan{border-radius:9px;padding:10px 12px;background:var(--dsw-alias-bg-base,#f7f8fa);line-height:1.55}.aiArPreflightChecks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.aiArPreflightCheck{border:1px solid var(--dsw-alias-border-l3,#d4dce6);border-radius:8px;padding:9px 10px;background:var(--dsw-alias-bg-base,#f7f8fa)}
      @media (max-width:1000px){.aiArGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.aiArLayout{grid-template-columns:1fr}.aiArRunList{max-height:300px}}
      @media (max-width:620px){.aiArShell{padding:20px 16px 36px}.aiArTop{display:block}.aiArTopActions{justify-content:flex-start;margin-top:14px}.aiArGrid{grid-template-columns:1fr 1fr}.aiArTwo{grid-template-columns:1fr}.aiArEvent{grid-template-columns:1fr;gap:3px}.aiArPreflightChecks{grid-template-columns:1fr}}
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

    function formatTokenUsage(usage) {
      if (!usage || usage.status === 'unknown') return '待接入';
      const input = usage.input_tokens === null || usage.input_tokens === undefined ? '—' : usage.input_tokens;
      const output = usage.output_tokens === null || usage.output_tokens === undefined ? '—' : usage.output_tokens;
      const total = usage.total_tokens === null || usage.total_tokens === undefined ? null : ` · 合计 ${usage.total_tokens}`;
      return `输入 ${input} + 输出 ${output}${total ?? ''}`;
    }

    function statusTone(status) {
      const value = String(status ?? '').toLowerCase();
      if (['completed', 'accepted', 'passed', 'success'].includes(value)) return 'aiArStatusGood';
      if (value.includes('await') || value.includes('consent') || value.includes('human')) return 'aiArStatusWait';
      if (['failed', 'rejected', 'cancelled', 'error', 'blocked'].includes(value) || value.includes('fail')) return 'aiArStatusBad';
      if (['running', 'leased', 'active', 'started', 'accepted_by_host'].includes(value)) return 'aiArStatusRun';
      return 'aiArStatusNeutral';
    }

    function Status({ value }) {
      return h('span', { className: `aiArStatus ${statusTone(value)}` }, String(value ?? 'unknown'));
    }

    function environmentSummary(value) {
      const config = value?.config ?? {};
      const environment = value?.environment ?? config.environment ?? value?.environment_profile;
      const environmentLabel = environment === 'openharmony'
        ? 'OpenHarmony'
        : environment === 'harmonyos' ? 'HarmonyOS' : (environment || '环境待确认');
      const component = value?.component_type ?? config.component_type;
      const device = value?.device_type ?? config.device_type;
      const parts = [`环境 ${environmentLabel}`];
      if (component) parts.push(`分支 ${component}`);
      if (device) parts.push(`设备 ${device}`);
      return parts.join(' · ');
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

    function preflightStatusLabel(value) {
      return ({ pass: '通过', pending: '待配置', warn: '警告', blocked: '阻断', failed: '失败' })[value] ?? value ?? '未知';
    }

    /**
     * Recheck the dispatch prerequisites at the moment a run is submitted.
     * The card is useful for planning, but a stale card must never be the
     * reason a run is queued after its workspace or CodeAgent disappeared.
     * P4/P6/P8 requirements remain authoritative in the workflow gates.
     */
    async function preflightBeforeStart(environment, componentType, options = {}) {
      const result = await api('/preflight', { method: 'POST', body: JSON.stringify({
        environment,
        component_type: environment === 'harmonyos' ? componentType : undefined,
        repo_root: options.repoRoot || undefined,
        device_type: options.deviceType || undefined,
        device_serial: options.deviceSerial || undefined,
        agent: options.agent || undefined,
        model: options.model || undefined,
        ar_path: options.arPath || undefined,
        ar_text: options.arText || undefined,
        publication: options.publication,
      }) });
      if (result?.can_start_p0 !== true) {
        const blocked = (result?.checks ?? [])
          .filter((item) => ['blocked', 'failed'].includes(item.status))
          .map((item) => `${item.label ?? item.id}: ${item.reason ?? '需要处理'}`);
        throw new Error(`前置检查阻断 P0${blocked.length > 0 ? `：${blocked.join('；')}` : ''}`);
      }
      return result;
    }

    function PreflightCard({ overview }) {
      const [value, setValue] = useState(null);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const [environment, setEnvironment] = useState('openharmony');
      const [componentType, setComponentType] = useState('system');
      const [deviceType, setDeviceType] = useState('');
      const [deviceSerial, setDeviceSerial] = useState('');
      const [repoRoot, setRepoRoot] = useState('');
      const load = async () => {
        setBusy(true); setError('');
        try {
          const query = [`environment=${encodeURIComponent(environment)}`];
          if (repoRoot.trim()) query.push(`repo_root=${encodeURIComponent(repoRoot.trim())}`);
          if (environment === 'harmonyos') query.push(`component_type=${encodeURIComponent(componentType)}`);
          if (environment === 'harmonyos' && deviceType.trim()) query.push(`device_type=${encodeURIComponent(deviceType.trim())}`);
          if (deviceSerial.trim()) query.push(`device_serial=${encodeURIComponent(deviceSerial.trim())}`);
          const selectedAgent = overview?.codeagents?.selected;
          const selectedModel = overview?.codeagents?.selected_config?.model;
          if (selectedAgent) query.push(`agent=${encodeURIComponent(selectedAgent)}`);
          if (selectedModel) query.push(`model=${encodeURIComponent(selectedModel)}`);
          const result = await api(`/preflight?${query.join('&')}`);
          setValue(result);
        } catch (cause) { setError(cause.message); }
        finally { setBusy(false); }
      };
      useEffect(() => { load(); }, [overview?.workspace_mode, overview?.repo_root, overview?.codeagents?.selected, overview?.codeagents?.selected_config?.model, environment, componentType, deviceType, deviceSerial, repoRoot]);
      const plan = value?.execution_plan ?? {};
      const checks = value?.checks ?? [];
      return h('section', { className: 'aiArCard' },
        h('div', { className: 'aiArCardHeader' },
          h('h2', null, '前置条件检查'),
          h('div', { className: 'aiArTopActions' },
            h(Status, { value: value?.status ?? 'pending' }),
            h(Button, { disabled: busy, onClick: load }, busy ? '检查中…' : '重新检查'),
          ),
        ),
        h('div', { className: 'aiArCardBody aiArPreflight' },
          error && h('div', { className: 'aiArNotice aiArNoticeBad' }, error),
          h('div', { className: 'aiArTwo' },
            h('div', { className: 'aiArField' },
              h('label', null, '预检环境'),
              h('select', { value: environment, onChange: (event) => setEnvironment(event.target.value) },
                h('option', { value: 'openharmony' }, 'OpenHarmony'),
                h('option', { value: 'harmonyos' }, 'HarmonyOS'),
              ),
            ),
            h('div', { className: 'aiArField' },
              h('label', null, 'HarmonyOS 分支'),
              h('select', { value: componentType, disabled: environment !== 'harmonyos', onChange: (event) => setComponentType(event.target.value) },
                h('option', { value: 'system' }, 'HarmonyOS system'),
                h('option', { value: 'chip' }, 'HarmonyOS chip'),
              ),
            ),
          ),
          overview?.workspace_mode === 'workspace_gateway' && h('div', { className: 'aiArField' },
            h('label', null, 'SSH 项目目录（相对登记的 remoteRoot，可选）'),
            h('input', { value: repoRoot, placeholder: overview?.workspace_gateway?.registered_root ? '例如 project-a 或 project-a/product' : '例如 project-a', onChange: (event) => setRepoRoot(event.target.value) }),
            h('div', { className: 'aiArMuted aiArTiny' }, `登记根：${overview?.workspace_gateway?.registered_root ?? overview?.repo_root ?? '未绑定'}；留空检查登记根本身。`),
          ),
          environment === 'harmonyos' && h('div', { className: 'aiArTwo' },
            h('div', { className: 'aiArField' },
              h('label', null, 'HarmonyOS 设备类型（必填）'),
              h('input', { value: deviceType, placeholder: '例如 general_all_phone_standard', onChange: (event) => setDeviceType(event.target.value) }),
            ),
            h('div', { className: 'aiArField' },
              h('label', null, '设备序列号（可选）'),
              h('input', { value: deviceSerial, placeholder: '例如 127.0.0.1:5555', onChange: (event) => setDeviceSerial(event.target.value) }),
            ),
          ),
          h('div', { className: 'aiArPreflightPlan' },
            h('strong', null, value?.status === 'ready_for_p8' ? '可以完整运行到 P8' : value?.status === 'ready_for_p0' || value?.can_start_p0 ? '可以启动 P0，后续仍有阻断项' : '尚不能启动 P0'),
            h('div', { className: 'aiArAgentHint' }, `代码端：${plan.source_root ?? '未绑定'} · CodeAgent：${plan.codeagent_host ?? '未解析'} · Gate：${plan.gate_execution ?? '未解析'}`),
            h('div', { className: 'aiArAgentHint' }, `加载方式：${plan.agent_load_strategy ?? '未解析'}${plan.agent_profile_id ? ` · profile ${plan.agent_profile_id}` : ''} · 凭据来源：${plan.agent_auth_source ?? '未解析'}`),
            h('div', { className: 'aiArAgentHint' }, plan.operator_action ?? '先完成检查项后再启动。'),
            plan.local_cli_remote_edit === 'unsupported' && h('div', { className: 'aiArNotice aiArNoticeWarn', style: { marginTop: 7, marginBottom: 0 } }, '本地 CLI 不能直接编辑 SSH 路径，请切换到 Gateway profile 或使用受控挂载。'),
          ),
          checks.length > 0 && h('div', { className: 'aiArPreflightChecks' }, checks.map((item) => h('div', { className: 'aiArPreflightCheck', key: item.id },
            h('div', { className: 'aiArArtifactTop' }, h('strong', null, item.label ?? item.id), h(Status, { value: preflightStatusLabel(item.status) })),
            h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 4 } }, item.reason ?? (item.status === 'pass' ? '已满足' : '需要处理')),
          ))),
          h('div', { className: 'aiArMuted aiArTiny' }, '前置检查只说明运行条件；P0–P8 仍由代码端真实 gate、设备回执和发布回执决定。'),
        ),
      );
    }

    function CodeAgentSettings({ overview, onSaved }) {
      const catalog = overview?.codeagents ?? {};
      const options = catalog.options ?? [];
      const [selected, setSelected] = useState(catalog.selected ?? 'claude-code');
      const [custom, setCustom] = useState(catalog.custom ?? { name: '自定义 CodeAgent', command: '', args: [], model: '' });
      const [model, setModel] = useState(catalog.model ?? catalog.selected_config?.model ?? '');
      const [busy, setBusy] = useState(false);
      const [refreshing, setRefreshing] = useState(false);
      const [message, setMessage] = useState('');
      const selectedOption = options.find((item) => item.id === selected) ?? catalog.selected_config;
      useEffect(() => { if (catalog.selected) setSelected(catalog.selected); }, [catalog.selected]);
      useEffect(() => {
        setModel(catalog.model ?? catalog.selected_config?.model ?? '');
      }, [catalog.model, catalog.selected_config?.model]);
      useEffect(() => {
        if (catalog.custom) setCustom({ name: '自定义 CodeAgent', command: '', args: [], model: '', ...catalog.custom });
      }, [catalog.custom?.name, catalog.custom?.command, catalog.custom?.model, JSON.stringify(catalog.custom?.args ?? [])]);
      const save = async () => {
        setBusy(true); setMessage('');
        try {
          const value = await api('/codeagents', {
            method: 'PUT',
            body: JSON.stringify({
              selected,
              model: model.trim() || null,
              custom: selected === 'custom' ? { ...custom, model: model.trim() } : custom,
            }),
          });
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
              h('div', { className: 'aiArMuted aiArTiny' }, '可配置 Claude Code、OpenCode、Codex CLI、Cursor Agent、Trae CLI 或自定义命令。使用 Connector 时，版本和可用性来自用户电脑；否则来自 DSH/Gateway 执行端。'),
            ),
            selectedOption && h('div', { className: `aiArNotice ${selectedOption.available === false ? 'aiArNoticeWarn' : 'aiArNoticeInfo'}`, style: { marginBottom: 0 } },
              h('div', { className: 'aiArAgentMeta' }, h('strong', null, selectedOption.name), h('span', null, agentStatusLabel(selectedOption))),
              h('div', { className: 'aiArAgentHint' }, selectedOption.description || '这个 Agent 将用于新建的 AR workflow run。'),
              selectedOption.command && h('div', { className: 'aiArAgentHint' }, `命令：${selectedOption.command}${selectedOption.path ? ` · 路径：${selectedOption.path}` : ''}`),
              selectedOption.dispatchable === false && h('div', { className: 'aiArAgentHint' }, '当前只完成本地发现和配置；对应宿主适配器加载前，新建 run 会被拒绝。'),
              selectedOption.execution_mode === 'workspace_gateway' && h('div', { className: 'aiArAgentHint' }, '代码端执行：CodeAgent 通过 Workspace Gateway 在 SSH 代码根修改文件，云端无需复制源码。'),
              selectedOption.execution_mode === 'local_connector' && h('div', { className: 'aiArAgentHint' }, selectedOption.workspace_access === 'remote_tools'
                ? '本地 Connector 执行：CodeAgent 在用户电脑运行，通过受限 remote-tools MCP 访问 SSH 代码；gate 仍在 SSH 代码端执行。'
                : '本地 Connector 执行：CodeAgent 在用户电脑运行，编辑受控 SSHFS 挂载；gate 仍在 SSH 代码端执行。'),
              selectedOption.execution_mode === 'local_cli' && ['workspace_gateway', 'local_connector'].includes(overview?.workspace_mode) && h('div', { className: 'aiArNotice aiArNoticeWarn', style: { marginTop: 7, marginBottom: 0 } }, '当前 Agent 是 DSH 云端本地 CLI，不能直接编辑未挂载的 SSH 路径；请选择 Connector Agent 或 Gateway profile。'),
              selectedOption.kind === 'official-provider' && h('div', { className: 'aiArAgentHint' }, `工具：${selectedOption.tool || 'subagent_claude_code'} · 认证：${selectedOption.auth || '由 Agent 原生设置管理'}`),
            ),
            h('div', { className: 'aiArField' },
              h('label', null, '模型（可选，适用于当前 CodeAgent）'),
              h('input', {
                value: model,
                onChange: (event) => setModel(event.target.value),
                placeholder: '例如 claude-sonnet-4-5、deepseek-reasoner；留空使用 Agent 默认模型',
                maxLength: 256,
              }),
              h('div', { className: 'aiArMuted aiArTiny' }, '保存后用于新建 run；每次运行也会把实际模型和可观测 token 状态记录到维测。'),
            ),
            selected === 'custom' && h(Fragment, null,
              h('div', { className: 'aiArTwo' },
                h('div', { className: 'aiArField' }, h('label', null, '显示名称'), h('input', { value: custom.name, onChange: (event) => updateCustom('name', event.target.value), placeholder: '我的 CodeAgent' })),
              ),
              h('div', { className: 'aiArField' }, h('label', null, '命令路径'), h('input', { value: custom.command, onChange: (event) => updateCustom('command', event.target.value), placeholder: '/usr/local/bin/my-codeagent' })),
              h('div', { className: 'aiArField' }, h('label', null, '固定参数（每行一个，可选）'), h('textarea', { value: (custom.args ?? []).join('\\n'), onChange: (event) => updateCustom('args', event.target.value.split(/\\r?\\n/u).map((item) => item.trim()).filter(Boolean)), placeholder: '--workspace\\n{{repo_root}}' })),
            ),
            h(Button, { primary: true, disabled: busy || !selected || (selected === 'custom' && !custom.command.trim() && !selectedOption?.profile_id), onClick: save }, busy ? '保存中…' : '保存 CodeAgent 设置'),
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
      const [pipelineDir, setPipelineDir] = useState('');
      const [gitDir, setGitDir] = useState('');
      const [repoRoot, setRepoRoot] = useState('');
      const [deviceType, setDeviceType] = useState('');
      const [deviceSerial, setDeviceSerial] = useState('');
      const [buildTarget, setBuildTarget] = useState('');
      const [part, setPart] = useState('');
      const [baseCommit, setBaseCommit] = useState('');
      const [publicationBackend, setPublicationBackend] = useState('gitcode');
      const [publicationProject, setPublicationProject] = useState('');
      const [publicationBranch, setPublicationBranch] = useState('');
      const [publicationBase, setPublicationBase] = useState('main');
      const [publicationIssue, setPublicationIssue] = useState('');
      const [publicationTitle, setPublicationTitle] = useState('');
      const [publicationHeadOwner, setPublicationHeadOwner] = useState('');
      const [publicationLocalReview, setPublicationLocalReview] = useState('');
      const [publicationPrReview, setPublicationPrReview] = useState('');
      const [publicationChangeId, setPublicationChangeId] = useState('');
      const [confirmDefaults, setConfirmDefaults] = useState(false);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const selectedConfig = overview?.codeagents?.selected_config;
      const needsDefaultConfirmation = !gitDir.trim() && !buildTarget.trim() && !part.trim();
      const selectedUnavailable = Boolean(selectedConfig
        && (selectedConfig.available === false || selectedConfig.dispatchable === false));
      const remoteWorkspace = ['workspace_gateway', 'local_connector'].includes(overview?.workspace_mode);
      const effectiveRepoRoot = repoRoot.trim() || overview?.repo_root || '';
      const defaultArPath = remoteWorkspace ? '' : (overview?.default_ar_path || DEFAULT_AR_PATH);
      const publication = [publicationProject, publicationBranch, publicationIssue,
        publicationTitle, publicationHeadOwner, publicationLocalReview, publicationPrReview,
        publicationChangeId].some((item) => item.trim() !== '')
        ? {
            backend: publicationBackend,
            ...(publicationBackend === 'gerrit'
              ? { project: publicationProject || undefined }
              : { repo_slug: publicationProject || undefined }),
            branch: publicationBranch || undefined,
            base: publicationBase || undefined,
            issue: publicationIssue || undefined,
            title: publicationTitle || undefined,
            head_owner: publicationHeadOwner || undefined,
            local_review_report: publicationLocalReview || undefined,
            pr_review_report: publicationPrReview || undefined,
            change_id: publicationChangeId || undefined,
          }
        : undefined;
      const start = async () => {
        setBusy(true); setError('');
        try {
          await preflightBeforeStart(environment, environment === 'harmonyos' ? component : null, {
            repoRoot: effectiveRepoRoot,
            deviceType: environment === 'harmonyos' ? deviceType.trim() : null,
            deviceSerial: deviceSerial.trim() || null,
            agent: overview?.codeagents?.selected ?? 'claude-code',
            model: overview?.codeagents?.selected_config?.model || null,
            arPath: arPath.trim() || null,
            arText: arText || null,
            publication,
          });
          const value = await api('/runs', { method: 'POST', body: JSON.stringify({
            input_ref: `local://dsh/ar/${Date.now()}`,
            ar_path: arPath || defaultArPath || undefined,
            ar_text: arText || undefined,
            pipeline_dir: pipelineDir || undefined,
            git_dir: gitDir || undefined,
            repo_root: effectiveRepoRoot || undefined,
            environment,
            component_type: environment === 'harmonyos' ? component : undefined,
            device_type: environment === 'harmonyos' ? (deviceType || undefined) : undefined,
            device_serial: deviceSerial || undefined,
            build_target: buildTarget || undefined,
            part: part || undefined,
            base_commit: baseCommit || undefined,
            confirm_defaults: confirmDefaults,
            publication,
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
          selectedConfig && h('div', { className: `aiArNotice ${selectedUnavailable ? 'aiArNoticeWarn' : 'aiArNoticeInfo'}` },
            `当前新建 run 使用：${selectedConfig.name}（${agentStatusLabel(selectedConfig)}）`,
            selectedUnavailable && h('div', { className: 'aiArAgentHint' }, '该 Agent 当前不可执行，请在上方设置中选择已发现且已适配的 Agent，或先完成对应宿主/Gateway 配置。')),
          overview?.workspace_mode === 'workspace_gateway' && h('div', { className: 'aiArNotice aiArNoticeInfo' },
            h('strong', null, 'SSH 代码端已绑定'),
            h('div', { className: 'aiArAgentHint' }, 'AR 初始化、CodeAgent、gate 和产物读取都会在登记的远端工作区执行；云端只保存签名状态与维测。'),
            h('div', { className: 'aiArAgentHint' }, `登记根：${overview?.workspace_gateway?.registered_root ?? overview?.repo_root ?? '未绑定'}；可在下方选择其下的具体项目目录。`)),
          overview?.workspace_mode === 'local_connector' && h('div', { className: 'aiArNotice aiArNoticeInfo' },
            h('strong', null, '本地 Connector 已纳入执行链路'),
            h('div', { className: 'aiArAgentHint' }, `CodeAgent 在用户电脑执行并通过${overview?.connector?.workspace_access === 'remote_tools' ? '受限 remote-tools MCP' : 'SSHFS 挂载'}修改 SSH 代码；Connector：${overview?.connector?.workspace_id ?? '未绑定'}。`),
            h('div', { className: `aiArAgentHint${overview?.connector?.security?.outbox_load_error ? ' aiArNoticeWarn' : ''}` }, `断线恢复：${overview?.connector?.replay_pending ?? 0} 个待回放操作 · 持久记录 ${overview?.connector?.durable_outbox_records ?? 0}${overview?.connector?.security?.persistent_outbox_enabled ? '' : '（未启用文件 outbox）'}`),
            overview?.connector?.security?.outbox_load_error && h('div', { className: 'aiArNotice aiArNoticeBad', style: { marginTop: 7, marginBottom: 0 } }, `Connector outbox 读取失败：${overview.connector.security.outbox_load_error}`),
            h('div', { className: 'aiArAgentHint' }, '完整 P0–P8 还要求 SSH Workspace Gateway 在线，以便在代码端执行环境初始化、编译、设备验证和发布 gate。')),
          h('div', { className: 'aiArForm' },
            h('div', { className: 'aiArTwo' },
              h('div', { className: 'aiArField' }, h('label', null, '代码环境'), h('select', { value: environment, onChange: (event) => setEnvironment(event.target.value) }, h('option', { value: 'openharmony' }, 'OpenHarmony'), h('option', { value: 'harmonyos' }, 'HarmonyOS'))),
              h('div', { className: 'aiArField' }, h('label', null, 'HarmonyOS 分支'), h('select', { value: component, disabled: environment !== 'harmonyos', onChange: (event) => setComponent(event.target.value) }, h('option', { value: 'system' }, 'system'), h('option', { value: 'chip' }, 'chip'))),
            ),
            remoteWorkspace && h('div', { className: 'aiArField' }, h('label', null, 'SSH 项目目录（相对登记的 remoteRoot，可选）'), h('input', { value: repoRoot, placeholder: '例如 project-a 或 project-a/product', onChange: (event) => setRepoRoot(event.target.value) }), h('div', { className: 'aiArMuted aiArTiny' }, '留空使用登记根；目录必须是远端工作区中的真实项目根，预检会再次探测。')),
            h('div', { className: 'aiArField' }, h('label', null, remoteWorkspace ? 'AR 文件（相对所选 SSH 项目目录；也可直接粘贴需求）' : 'AR 文件（留空使用仓库示例）'), h('input', { value: arPath, placeholder: remoteWorkspace ? '例如 docs/AR.md（远端必填）' : defaultArPath, onChange: (event) => setArPath(event.target.value) })),
            h('div', { className: 'aiArField' }, h('label', null, '直接粘贴 AR 需求（可选）'), h('textarea', { value: arText, placeholder: '可直接粘贴本次需求；填写后优先使用文本，留空才读取 AR 文件。', onChange: (event) => setArText(event.target.value) })),
            h('div', { className: 'aiArTwo' },
              h('div', { className: 'aiArField' }, h('label', null, 'Pipeline 目录（可选）'), h('input', { value: pipelineDir, placeholder: 'specs/pipeline/已有 run 目录', onChange: (event) => setPipelineDir(event.target.value) })),
              h('div', { className: 'aiArField' }, h('label', null, 'Git 目录（可选）'), h('input', { value: gitDir, placeholder: '默认使用代码根目录', onChange: (event) => setGitDir(event.target.value) })),
            ),
            h('div', { className: 'aiArTwo' },
              h('div', { className: 'aiArField' }, h('label', null, environment === 'harmonyos' ? '设备类型（HarmonyOS 必填）' : '设备类型（可选）'), h('input', { value: deviceType, placeholder: environment === 'harmonyos' ? '例如 general_all_phone_standard' : 'rk3568 / emulator', onChange: (event) => setDeviceType(event.target.value) })),
              h('div', { className: 'aiArField' }, h('label', null, '设备序列号（可选）'), h('input', { value: deviceSerial, placeholder: 'hdc list targets 中的序列号', onChange: (event) => setDeviceSerial(event.target.value) })),
            ),
            h('div', { className: 'aiArTwo' },
              h('div', { className: 'aiArField' }, h('label', null, '构建目标（可选）'), h('input', { value: buildTarget, placeholder: '如 rk3568', onChange: (event) => setBuildTarget(event.target.value) })),
              h('div', { className: 'aiArField' }, h('label', null, '部件 / 模块（可选）'), h('input', { value: part, placeholder: '如 hiview', onChange: (event) => setPart(event.target.value) })),
            ),
            h('div', { className: 'aiArField' }, h('label', null, '基线提交（可选）'), h('input', { value: baseCommit, placeholder: 'commit SHA 或分支基线', onChange: (event) => setBaseCommit(event.target.value) })),
            h('div', { className: 'aiArDivider', style: { margin: '4px 0 0' } }),
            h('div', { className: 'aiArEyebrow' }, 'P8 上库目标（可选，未填写时 P8 会明确阻断）'),
            h('div', { className: 'aiArTwo' },
              h('div', { className: 'aiArField' }, h('label', null, '上库后端'), h('select', { value: publicationBackend, onChange: (event) => setPublicationBackend(event.target.value) }, h('option', { value: 'gitcode' }, 'GitCode / oh-gc'), h('option', { value: 'gerrit' }, 'Gerrit'))),
              h('div', { className: 'aiArField' }, h('label', null, publicationBackend === 'gerrit' ? 'Gerrit project' : 'GitCode repo（owner/repo）'), h('input', { value: publicationProject, placeholder: publicationBackend === 'gerrit' ? '例如 platform/frameworks' : '例如 mgce1/AI-AR-workflow', onChange: (event) => setPublicationProject(event.target.value) })),
            ),
            h('div', { className: 'aiArTwo' },
              h('div', { className: 'aiArField' }, h('label', null, '发布分支'), h('input', { value: publicationBranch, placeholder: '例如 codex/ar-run-42', onChange: (event) => setPublicationBranch(event.target.value) })),
              h('div', { className: 'aiArField' }, h('label', null, '目标基线'), h('input', { value: publicationBase, placeholder: 'main / master', onChange: (event) => setPublicationBase(event.target.value) })),
            ),
            h('div', { className: 'aiArTwo' },
              h('div', { className: 'aiArField' }, h('label', null, 'Issue（GitCode 可选）'), h('input', { value: publicationIssue, placeholder: '#123', onChange: (event) => setPublicationIssue(event.target.value) })),
              h('div', { className: 'aiArField' }, h('label', null, '标题（可选）'), h('input', { value: publicationTitle, placeholder: 'AR delivery change', onChange: (event) => setPublicationTitle(event.target.value) })),
            ),
            h('div', { className: 'aiArTwo' },
              h('div', { className: 'aiArField' }, h('label', null, '本地 review 报告（相对 pipeline）'), h('input', { value: publicationLocalReview, placeholder: 'reports/local-review.json', onChange: (event) => setPublicationLocalReview(event.target.value) })),
              h('div', { className: 'aiArField' }, h('label', null, 'PR review 报告（相对 pipeline）'), h('input', { value: publicationPrReview, placeholder: 'reports/pr-review.json', onChange: (event) => setPublicationPrReview(event.target.value) })),
            ),
            h('div', { className: 'aiArTwo' },
              h('div', { className: 'aiArField' }, h('label', null, 'Head owner（可选）'), h('input', { value: publicationHeadOwner, placeholder: 'fork owner', onChange: (event) => setPublicationHeadOwner(event.target.value) })),
              h('div', { className: 'aiArField' }, h('label', null, 'Change-Id（Gerrit 可选）'), h('input', { value: publicationChangeId, placeholder: 'I…', onChange: (event) => setPublicationChangeId(event.target.value) })),
            ),
            h('label', { className: 'aiArTiny', style: { display: 'flex', gap: 7, alignItems: 'flex-start', color: 'var(--dsw-alias-label-secondary,#5d6b7c)' } }, h('input', { type: 'checkbox', checked: confirmDefaults, onChange: (event) => setConfirmDefaults(event.target.checked) }), h('span', null, needsDefaultConfirmation ? '我确认使用 AR 示例默认组件（OpenHarmony: hiview；其他环境请先填写明确的组件参数）。' : '已填写明确的组件参数，仍可勾选以记录本次确认。')),
            h(Button, { primary: true, disabled: busy || !overview?.repo_root || (needsDefaultConfirmation && !confirmDefaults) || selectedUnavailable, onClick: start }, busy ? '启动中…' : '启动 P0 →'),
          ),
          effectiveRepoRoot && h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 12 } }, `${remoteWorkspace ? '本次 SSH 项目根' : 'WSL 代码根'}：${effectiveRepoRoot}`),
        ),
      );
    }

    function RunRow({ run, active, onClick }) {
      const observation = run.observability ?? {};
      return h('button', { type: 'button', className: `aiArRunRow${active ? ' aiArRunRowActive' : ''}`, onClick },
        h('div', { className: 'aiArRunTop' }, h('span', { className: 'aiArRunId' }, run.run_id), h(Status, { value: run.status })),
        h('div', { className: 'aiArRunMeta' },
          h('span', null, environmentSummary(run)),
          h('span', null, `Agent ${run.agent ?? '—'}`),
          h('span', null, `当前阶段 ${observation.current_stage ?? '—'}`),
          h('span', null, `${observation.stage_count ?? 0} stages`),
          h('span', null, `${observation.human_intervention_count ?? 0} 次人工`),
        ),
      );
    }

    function ProcessSupervisorCard({ snapshot }) {
      if (!snapshot) return null;
      const counts = snapshot.counts ?? {};
      const operations = snapshot.operations ?? [];
      const summary = [
        '运行 ', counts.running ?? 0, ' · 未知 ', counts.unknown ?? 0,
        ' · 已完成 ', counts.completed ?? 0, ' · 失败 ', counts.failed ?? 0,
        ' · 取消 ', counts.cancelled ?? 0, snapshot.truncated ? ' · 已截断' : '',
      ].join('');
      return h('div', { className: 'aiArProcess' },
        h('div', { className: 'aiArProcessTitle' },
          h('strong', null, 'CodeAgent 进程监督'),
          h('span', { className: 'aiArMuted aiArTiny' }, snapshot.durable ? '持久化 SQLite' : '内存模式'),
        ),
        h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 5 } }, summary),
        operations.length > 0
          ? h('div', { className: 'aiArProcessTable', style: { overflowX: 'auto' } },
            h('table', { className: 'aiArTable' },
              h('thead', null, h('tr', null, h('th', null, '操作'), h('th', null, '状态'), h('th', null, 'PID / PGID'), h('th', null, '阶段 / Agent'), h('th', null, '耗时'), h('th', null, '诊断'))),
              h('tbody', null, operations.map((operation) => h('tr', { key: operation.operation_id },
                h('td', null, h('div', { className: 'aiArMono' }, operation.operation_id), h('div', { className: 'aiArMuted aiArTiny' }, operation.parent_operation_id && operation.parent_operation_id !== operation.operation_id ? 'parent ' + operation.parent_operation_id : '')),
                h('td', null, h(Status, { value: operation.state })),
                h('td', null, h('div', { className: 'aiArMono' }, String(operation.pid ?? '—') + ' / ' + String(operation.pgid ?? '—')), operation.identity_verified === false && h('div', { className: 'aiArMuted aiArTiny' }, 'identity 未确认')),
                h('td', null, [operation.metadata?.phase ?? '—', ' · ', operation.metadata?.agent ?? operation.metadata?.role ?? '—'].join('')),
                h('td', null, formatDuration(operation.duration_ms)),
                h('td', null, operation.error ? String(operation.error.code ?? 'error') + '：' + String(operation.error.message ?? '') : '—'),
              ))),
            ),
          )
          : h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 8 } }, '该 run 尚未创建受监督 CodeAgent 进程。'),
      );
    }

    function StageTable({ stages }) {
      if (!stages?.length) return h('div', { className: 'aiArEmpty' }, '运行已创建，等待 P0 证据写入。');
      return h('div', { style: { overflowX: 'auto' } }, h('table', { className: 'aiArTable' },
        h('thead', null, h('tr', null, h('th', null, '阶段'), h('th', null, '状态'), h('th', null, '墙钟'), h('th', null, '人工等待'), h('th', null, '有效耗时'), h('th', null, 'CodeAgent'), h('th', null, 'Token'), h('th', null, '尝试'), h('th', null, '门控 / 执行失败'))),
        h('tbody', null, stages.map((stage) => h('tr', { key: `${stage.phase}-${stage.revision}` },
          h('td', null, h('div', { className: 'aiArMono' }, stage.phase), h('div', { className: 'aiArMuted aiArTiny' }, stage.role ?? '—')),
          h('td', null, h(Status, { value: stage.status })),
          h('td', null, formatDuration(stage.wall_ms ?? stage.elapsed_ms)),
          h('td', null, formatDuration(stage.human_wait_ms)),
          h('td', null, formatDuration(stage.effective_elapsed_ms)),
          h('td', null, formatDuration(stage.codeagent_duration_ms)),
          h('td', null, formatTokenUsage(stage.token_usage)),
          h('td', null, `${stage.attempts?.length ?? 0}`),
          h('td', null, `${stage.validation_failures ?? 0} / ${stage.execution_failures ?? 0}`),
        )))
      ));
    }

    function HumanWaitTable({ intervals }) {
      if (!intervals?.length) return null;
      return h('div', null,
        h('div', { className: 'aiArEyebrow', style: { marginBottom: 7 } }, '人工等待区间'),
        h('div', { style: { overflowX: 'auto' } }, h('table', { className: 'aiArTable' },
          h('thead', null, h('tr', null, h('th', null, '阶段'), h('th', null, '状态'), h('th', null, '打开时间'), h('th', null, '关闭时间'), h('th', null, '等待时长'), h('th', null, '动作'))),
          h('tbody', null, intervals.map((item) => h('tr', { key: item.wait_id },
            h('td', null, `${item.phase ?? '—'} · ${item.task_id ?? '—'}`),
            h('td', null, h(Status, { value: item.status })),
            h('td', null, h('span', { className: 'aiArMono' }, item.opened_at ?? '—')),
            h('td', null, h('span', { className: 'aiArMono' }, item.closed_at ?? '—')),
            h('td', null, formatDuration(item.duration_ms)),
            h('td', null, item.action_id ?? '—'),
          )))
        )),
      );
    }

    function ArtifactCard({ runId, artifact }) {
      const [content, setContent] = useState(artifact.content ?? null);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      useEffect(() => { setContent(artifact.content ?? null); }, [artifact.content, artifact.relative_path]);
      const loadContent = async () => {
        setBusy(true); setError('');
        try {
          const value = await api(`/runs/${encodeURIComponent(runId)}/artifacts/content?path=${encodeURIComponent(artifact.relative_path)}`);
          setContent(value.content ?? '');
        } catch (cause) { setError(cause.message); } finally { setBusy(false); }
      };
      const downloadArtifact = async () => {
        setBusy(true); setError('');
        try {
          const response = await fetch(`${API}/runs/${encodeURIComponent(runId)}/artifacts/download?path=${encodeURIComponent(artifact.relative_path)}`, { credentials: 'same-origin' });
          if (!response.ok) {
            let value = {};
            try { value = await response.json(); } catch { /* preserve the HTTP status below */ }
            throw new Error(value?.error?.message ?? `下载失败（HTTP ${response.status}）`);
          }
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = artifact.filename || artifact.relative_path.split('/').at(-1) || 'artifact.bin';
          link.rel = 'noopener';
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (cause) { setError(cause.message); } finally { setBusy(false); }
      };
      return h('div', { className: 'aiArArtifact' },
        h('div', { className: 'aiArArtifactTop' }, h('strong', null, artifact.relative_path), h('span', { className: 'aiArMuted aiArTiny' }, artifact.role)),
        h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 5 } }, `${artifact.size_bytes} bytes · sha256 ${artifact.sha256}`),
        artifact.binary === true
          ? h('div', { className: 'aiArArtifactActions' }, h('span', { className: 'aiArMuted aiArTiny' }, '二进制产物已保留在 SSH 代码端；下载前会校验字节数和 SHA-256。'), h(Button, { disabled: busy, onClick: downloadArtifact }, busy ? '下载中…' : '下载原始文件'))
          : content !== null
          ? h('pre', null, content)
          : h('div', { className: 'aiArArtifactActions' }, h('span', { className: 'aiArMuted aiArTiny' }, '正文较大，按需读取完整内容。'), h(Button, { disabled: busy, onClick: loadContent }, busy ? '读取中…' : '查看完整正文')),
        error && h('div', { className: 'aiArNotice aiArNoticeBad', style: { marginTop: 8, marginBottom: 0 } }, error),
      );
    }

    function RagCard({ overview, onChanged }) {
      const rag = overview?.rag;
      const modelProfile = rag?.model_profile ?? {};
      const [query, setQuery] = useState('');
      const [result, setResult] = useState(null);
      const [busy, setBusy] = useState(false);
      const [message, setMessage] = useState('');
      const [ragMode, setRagMode] = useState(modelProfile.mode ?? 'local_lexical');
      const [provider, setProvider] = useState(modelProfile.provider ?? '');
      const [embeddingModel, setEmbeddingModel] = useState(modelProfile.embedding_model ?? '');
      const [rerankerModel, setRerankerModel] = useState(modelProfile.reranker_model ?? '');
      const [endpoint, setEndpoint] = useState(modelProfile.endpoint ?? '');
      useEffect(() => {
        setRagMode(modelProfile.mode ?? 'local_lexical');
        setProvider(modelProfile.provider ?? '');
        setEmbeddingModel(modelProfile.embedding_model ?? '');
        setRerankerModel(modelProfile.reranker_model ?? '');
        setEndpoint(modelProfile.endpoint ?? '');
      }, [JSON.stringify(modelProfile)]);
      const index = async () => {
        setBusy(true); setMessage('');
        try { const value = await api('/rag/index', { method: 'POST' }); setMessage(`索引完成：${value.file_count ?? 0} 个文件`); onChanged?.(); }
        catch (cause) { setMessage(cause.message); } finally { setBusy(false); }
      };
      const saveProfile = async () => {
        setBusy(true); setMessage('');
        try {
          await api('/rag/profile', {
            method: 'PUT',
            body: JSON.stringify({
              mode: ragMode,
              provider: provider.trim() || null,
              embedding_model: embeddingModel.trim() || null,
              reranker_model: rerankerModel.trim() || null,
              endpoint: endpoint.trim() || null,
            }),
          });
          setMessage(`RAG 模型配置已保存。执行状态：${rag?.model_profile?.execution ?? '待探测'}；凭据由服务端 secret 注入。`);
          onChanged?.();
        } catch (cause) { setMessage(cause.message); } finally { setBusy(false); }
      };
      const search = async () => {
        setBusy(true); setMessage('');
        try { setResult(await api('/rag/search', { method: 'POST', body: JSON.stringify({ query }) })); }
        catch (cause) { setMessage(cause.message); } finally { setBusy(false); }
      };
      return h('section', { className: 'aiArCard' },
        h('div', { className: 'aiArCardHeader' }, h('h2', null, '代码知识库（RAG）'), h(Status, { value: rag?.state ?? 'unknown' })),
        h('div', { className: 'aiArCardBody' },
          h('div', { className: 'aiArAgentHint' }, rag?.state === 'ready' ? `${rag.file_count ?? 0} 个文件 · revision ${rag.revision ?? '—'}` : '索引仅读取当前 DSH 工作区，结果在使用前必须回到源码复核。'),
          rag?.metrics && h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 5 } }, `查询 ${rag.metrics.query_count ?? 0} 次 · 命中 ${rag.metrics.hit_count ?? 0} 条 · 回退 ${rag.metrics.fallback_count ?? 0} 次 · 最近查询 ${rag.metrics.last_query_latency_ms ?? '—'} ms`),
          h('div', { className: 'aiArDivider' }),
          h('div', { className: 'aiArField' },
            h('label', null, 'RAG 执行模式'),
            h('select', { value: ragMode, onChange: (event) => setRagMode(event.target.value) },
              h('option', { value: 'local_lexical' }, '本地词法（当前可用）'),
              h('option', { value: 'embedding_reranker' }, 'Embedding + Reranker（已配置服务时执行）'),
            ),
          ),
          h('div', { className: 'aiArTwo' },
            h('div', { className: 'aiArField' }, h('label', null, 'Provider（可选）'), h('input', { value: provider, onChange: (event) => setProvider(event.target.value), placeholder: '例如 qwen-compatible' })),
            h('div', { className: 'aiArField' }, h('label', null, '服务地址（可选）'), h('input', { value: endpoint, onChange: (event) => setEndpoint(event.target.value), placeholder: 'https://rag.example/v1' })),
          ),
          h('div', { className: 'aiArTwo' },
            h('div', { className: 'aiArField' }, h('label', null, 'Embedding 模型'), h('input', { value: embeddingModel, onChange: (event) => setEmbeddingModel(event.target.value), placeholder: 'qwen3-embedding' })),
            h('div', { className: 'aiArField' }, h('label', null, 'Reranker 模型'), h('input', { value: rerankerModel, onChange: (event) => setRerankerModel(event.target.value), placeholder: 'qwen3-reranker' })),
          ),
          rag?.model_profile?.execution !== 'active' && rag?.model_profile?.mode === 'embedding_reranker' && h('div', { className: 'aiArNotice aiArNoticeWarn', style: { marginBottom: 10 } }, `Embedding/Reranker 当前状态为 ${rag?.model_profile?.execution ?? 'unknown'}，检索会明确显示词法回退；请在服务端注入模型适配器，页面不会保存 API Key。`),
          h(Button, { disabled: busy || rag?.state === 'unavailable', onClick: saveProfile }, busy ? '保存中…' : '保存 RAG 模型配置'),
          h('div', { className: 'aiArDivider' }),
          h('div', { className: 'aiArTopActions', style: { justifyContent: 'flex-start', marginTop: 10 } }, h(Button, { disabled: busy || rag?.state === 'unavailable', onClick: index }, busy ? '处理中…' : '建立 / 刷新索引')),
          h('div', { className: 'aiArField', style: { marginTop: 10 } }, h('label', null, '检索代码、环境或历史证据'), h('input', { value: query, placeholder: '例如 environment profile / gate_env_init', onChange: (event) => setQuery(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter') search(); } })),
          h(Button, { disabled: busy || !query.trim() || rag?.state === 'unavailable', onClick: search }, busy ? '检索中…' : '检索当前工作区'),
          message && h('div', { className: 'aiArNotice aiArNoticeInfo', style: { marginTop: 10, marginBottom: 0 } }, message),
          result && h('div', { className: 'aiArRagResults' }, result.results?.length ? result.results.map((item) => h('div', { className: 'aiArRagResult', key: `${item.relative_path}:${item.line}` }, h('div', { className: 'aiArArtifactTop' }, h('strong', null, `${item.relative_path}:${item.line}`), h('span', { className: 'aiArMuted aiArTiny' }, `score ${item.score}`)), h('div', { className: 'aiArMono aiArTiny', style: { marginTop: 5 } }, item.snippet), h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 5 } }, `mode ${result.retrieval_mode ?? 'lexical'} · source ${item.source_revision ?? '—'} · ${item.stale_check ?? 'revalidate'}`))) : h('div', { className: 'aiArEmpty' }, '没有匹配结果。')),
        ),
      );
    }

    function DebugCard({ overview, onChanged }) {
      const initial = overview?.debug ?? { state: 'unavailable' };
      const [snapshot, setSnapshot] = useState(initial);
      const [busy, setBusy] = useState(false);
      const [message, setMessage] = useState('');
      useEffect(() => { setSnapshot(initial); }, [JSON.stringify(initial)]);
      const request = async (path, method = 'GET') => {
        setBusy(true); setMessage('');
        try {
          const value = await api(path, { method });
          setSnapshot(value);
          onChanged?.();
          setMessage(method === 'POST' ? '调试扫描已完成。' : '调试状态已刷新。');
        } catch (cause) { setMessage(cause.message); } finally { setBusy(false); }
      };
      const artifactSnapshot = snapshot?.artifacts ?? {};
      const artifacts = artifactSnapshot.artifacts ?? [];
      const device = snapshot?.device_probe ?? {};
      const targets = device.targets ?? [];
      const targetLabels = targets.map((target) => typeof target === 'string'
        ? target : `${target.id ?? 'unknown'}${target.state ? ` (${target.state})` : ''}`).join('、');
      return h('section', { className: 'aiArCard' },
        h('div', { className: 'aiArCardHeader' },
          h('h2', null, '设备 / 产物调试'),
          h('div', { className: 'aiArTopActions' },
            h(Status, { value: snapshot?.status ?? snapshot?.state ?? 'unknown' }),
            h(Button, { disabled: busy, onClick: () => request('/debug/status') }, '刷新状态'),
          ),
        ),
        h('div', { className: 'aiArCardBody' },
          h('div', { className: 'aiArTwo' },
            h('div', { className: 'aiArNotice aiArNoticeInfo', style: { margin: 0 } },
              h('strong', null, '设备探测'),
              h('div', { className: 'aiArAgentHint' }, `${device.status ?? 'unknown'} · ${device.command ?? 'hdc'}${targets.length ? ` · ${targets.length} 个目标` : ''}`),
              targets.length > 0 && h('div', { className: 'aiArMono aiArTiny', style: { marginTop: 6 } }, targetLabels),
            ),
            h('div', { className: 'aiArNotice aiArNoticeInfo', style: { margin: 0 } },
              h('strong', null, '工作区产物'),
              h('div', { className: 'aiArAgentHint' }, `${artifactSnapshot.status ?? 'unknown'} · ${artifacts.length} 个可识别文件 · ${artifactSnapshot.bytes_scanned ?? 0} bytes`),
              h('div', { className: 'aiArAgentHint' }, snapshot?.deployment ?? '仅做只读识别，兼容性仍需真实 profile / gate 验证。'),
            ),
          ),
          h('div', { className: 'aiArTopActions', style: { justifyContent: 'flex-start', marginTop: 10 } },
            h(Button, { primary: true, disabled: busy || snapshot?.status === 'unavailable', onClick: () => request('/debug/scan', 'POST') }, busy ? '扫描中…' : '扫描设备与产物'),
          ),
          artifacts.length > 0 && h('div', { className: 'aiArRagResults' }, artifacts.slice(0, 8).map((artifact) => h('div', { className: 'aiArRagResult', key: `${artifact.relative_path}:${artifact.sha256}` },
            h('div', { className: 'aiArArtifactTop' }, h('strong', null, artifact.relative_path), h('span', { className: 'aiArMuted aiArTiny' }, artifact.role ?? 'artifact')),
            h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 5 } }, `${artifact.size_bytes ?? 0} bytes · sha256 ${artifact.sha256 ?? '—'} · ${artifact.compatibility ?? 'not_verified'}`),
          ))),
          message && h('div', { className: 'aiArNotice aiArNoticeInfo', style: { marginTop: 10, marginBottom: 0 } }, message),
        ),
      );
    }

    function ConsentBox({ runId, blockers, onChanged }) {
      const [taskId, setTaskId] = useState(blockers?.[0]?.task_id ?? '');
      const [phase, setPhase] = useState(blockers?.[0]?.phase ?? 1);
      const [token, setToken] = useState('');
      const [content, setContent] = useState('');
      const [busy, setBusy] = useState(false);
      const [message, setMessage] = useState('');
      useEffect(() => { setTaskId(blockers?.[0]?.task_id ?? ''); setPhase(blockers?.[0]?.phase_number ?? blockers?.[0]?.phase ?? 1); }, [blockers]);
      if (!blockers?.length) return null;
      const submit = async () => {
        setBusy(true); setMessage('');
        try { await api(`/runs/${encodeURIComponent(runId)}/consent`, { method: 'POST', body: JSON.stringify({ task_id: taskId, phase: Number(phase), token, content: content || undefined }) }); setToken(''); setContent(''); setMessage('人工审核已记录，正在同步状态。'); onChanged(); }
        catch (cause) { setMessage(cause.message); } finally { setBusy(false); }
      };
      return h('div', { className: 'aiArNotice aiArNoticeWarn' },
        h('strong', null, `需要人工审核：${blockers.map((item) => item.phase).join(', ')}`),
        h('div', { className: 'aiArForm', style: { marginTop: 8 } },
          h('div', { className: 'aiArTwo' }, h('input', { value: taskId, placeholder: 'task_id', onChange: (event) => setTaskId(event.target.value) }), h('input', { value: phase, type: 'number', min: 1, max: 8, onChange: (event) => setPhase(event.target.value) })),
          h('input', { value: token, placeholder: '输入 evidence-bound consent token', onChange: (event) => setToken(event.target.value) }),
          h('textarea', { value: content, placeholder: '审核意见（可选，但会作为人工输入留痕）', onChange: (event) => setContent(event.target.value) }),
          h(Button, { primary: true, disabled: busy || !taskId || !token, onClick: submit }, busy ? '提交中…' : '记录审核并同步'),
          message && h('span', { className: 'aiArTiny' }, message),
        ),
      );
    }

    function Detail({ detail, artifacts, events, scheduler, processes, onRefresh }) {
      const SCHEDULER_FAILURE = 'SCHEDULER_FAILURE';
      const [tab, setTab] = useState('overview');
      const [syncing, setSyncing] = useState(false);
      if (!detail) return h('div', { className: 'aiArLoading' }, '选择一个运行以查看完整维测。');
      const observation = detail.observability ?? {};
      const runConfig = detail.config ?? {};
      const runPath = encodeURIComponent(detail.run_id);
      const sync = async () => {
        setSyncing(true);
        try { await api(`/runs/${runPath}/sync`, { method: 'POST' }); onRefresh(); }
        finally { setSyncing(false); }
      };
      const downloadExport = (format) => {
        if (typeof document === 'undefined') return;
        const link = document.createElement('a');
        link.href = `${API}/runs/${runPath}/export?format=${format}`;
        link.download = `ar-run-${detail.run_id}.${format}`;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
      };
      const schedulerAction = async (action) => {
        setSyncing(true);
        try {
          const options = action === 'cancel'
            ? { method: 'POST', body: JSON.stringify({ reason: 'cancelled from DSH Web UI' }) }
            : { method: 'POST' };
          await api(`/runs/${runPath}/${action}`, options);
          onRefresh();
        } catch {
          // The next durable poll renders the scheduler's persisted failure.
        } finally { setSyncing(false); }
      };
      const blockers = observation.current_blockers ?? [];
      const schedulerStatus = scheduler?.status ?? detail.scheduler?.status;
      const canCancel = Boolean(schedulerStatus)
        && !['completed', 'cancelled', 'failed', 'blocked', 'needs_repair', 'awaiting_consent', 'needs_reconcile'].includes(schedulerStatus);
      const canResume = ['failed', 'blocked', 'needs_repair', 'needs_reconcile'].includes(schedulerStatus);
      const humanInputs = observation.human_inputs?.length > 0
        ? h('div', null,
          h('div', { className: 'aiArEyebrow', style: { marginBottom: 7 } }, '人工输入记录'),
          observation.human_inputs.map((input, index) => h('div', { className: 'aiArEvent', key: `${input.at}-${index}` },
            h('span', { className: 'aiArMuted aiArMono' }, input.at),
            h('span', null,
              h('div', null, `${input.kind} · ${input.category ?? 'informational'}${input.decision ? ` · ${input.decision}` : ''} · P${input.phase ?? '—'} · ${input.task_id ?? '—'}${input.evidence ? ` · ${input.evidence}` : ''} · ${input.actor ?? 'web-user'}`),
              input.content && h('pre', { style: { margin: '5px 0 0' } }, input.content),
            ),
          )),
        ) : null;
      const failureReasons = observation.failure_reasons?.length > 0
        ? h('div', null,
          h('div', { className: 'aiArEyebrow', style: { marginBottom: 7 } }, '失败原因记录'),
          observation.failure_reasons.map((failure, index) => h('div', { className: 'aiArEvent', key: `${failure.at}-${index}` },
            h('span', { className: 'aiArMuted aiArMono' }, failure.at ?? '—'),
            h('span', null,
              h('div', null, `${failure.type ?? 'failure'} · ${failure.code ?? 'unknown'} · P${failure.phase ?? '—'} · ${failure.task_id ?? '—'}`),
              h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 4 } }, failure.message ?? 'Workflow execution failed.'),
              failure.details && Object.keys(failure.details).length > 0 && h('pre', { style: { margin: '5px 0 0' } }, JSON.stringify(failure.details, null, 2)),
            ),
          )),
        ) : null;
      const tabNames = ['overview', 'artifacts', 'events'];
      const tabLabels = {
        overview: '阶段与人工审核',
        artifacts: `产物 (${artifacts?.artifacts?.length ?? 0})`,
        events: `事件 (${events?.length ?? 0})`,
      };
      const overviewContent = h('div', { className: 'aiArStack', style: { marginTop: 14 } },
          h(StageTable, { stages: observation.stages }),
          h(HumanWaitTable, { intervals: observation.human_wait_intervals }),
          h(ProcessSupervisorCard, { snapshot: processes }),
          h('div', { className: 'aiArDivider' }),
        h('div', { className: 'aiArMuted aiArTiny' }, `运行成功 ${observation.run_success_count ?? observation.success_count ?? 0} 次 · gate 通过 ${observation.gate_pass_count ?? 0} · 阶段完成 ${observation.stage_completion_count ?? 0} · 失败 ${observation.failure_count ?? 0} · 事件 ${observation.event_count ?? 0} 条 · 最后序号 ${observation.last_event_seq ?? 0}`),
        failureReasons,
        humanInputs,
      );
      const artifactContent = h('div', { style: { marginTop: 14 } },
        artifacts?.artifacts?.length
          ? artifacts.artifacts.map((artifact) => h(ArtifactCard, { key: artifact.artifact_id, runId: detail.run_id, artifact }))
          : h('div', { className: 'aiArEmpty' }, '当前 run 尚未产生可展示产物。'),
      );
      const eventContent = h('div', { style: { marginTop: 14 } },
        events?.length
          ? [...events].reverse().map((event) => h('div', { className: 'aiArEvent', key: event.seq },
            h('span', { className: 'aiArMuted aiArMono' }, `#${event.seq} ${event.created_at}`),
            h('span', null, h('strong', null, event.type), h('pre', { style: { margin: '5px 0 0' } }, JSON.stringify(event.payload ?? {}, null, 2))),
          ))
          : h('div', { className: 'aiArEmpty' }, '暂无事件。'),
      );
      return h('section', { className: 'aiArCard' },
        h('div', { className: 'aiArCardBody' },
          h('div', { className: 'aiArDetailTitle' },
            h('div', null,
              h('h2', null, detail.run_id),
              h('p', null, `${detail.workflow ?? 'ar-delivery'} · ${environmentSummary({ ...detail, config: runConfig })} · Agent ${detail.agent ?? '—'}`),
              (runConfig.environment_profile_digest || runConfig.product) && h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 4 } },
                `${runConfig.product ? `产品 ${runConfig.product}` : ''}${runConfig.product && runConfig.environment_profile_digest ? ' · ' : ''}${runConfig.environment_profile_digest ? `profile ${runConfig.environment_profile_digest}` : ''}`),
            ),
            h('div', { className: 'aiArTopActions' },
              h(Status, { value: detail.status }),
              canCancel && h(Button, { danger: true, disabled: syncing, onClick: () => schedulerAction('cancel') }, '取消运行'),
              canResume && h(Button, { primary: true, disabled: syncing, onClick: () => schedulerAction('resume') }, '继续调度'),
              h(Button, { disabled: syncing, onClick: () => downloadExport('json') }, '导出 JSON'),
              h(Button, { disabled: syncing, onClick: () => downloadExport('csv') }, '导出 CSV'),
              h(Button, { disabled: syncing, onClick: sync }, syncing ? '同步中…' : '同步证据'),
            ),
          ),
          scheduler && h('div', { className: 'aiArScheduler' },
            h('div', { className: 'aiArArtifactTop' }, h('strong', null, '调度状态'), h(Status, { value: scheduler.status })),
            h('div', { className: 'aiArMuted aiArTiny', style: { marginTop: 5 } }, `尝试 ${scheduler.attempts ?? 0} · 活跃 attempt ${scheduler.active_attempt_id ?? '—'} · 更新于 ${scheduler.updated_at ?? '—'}`),
            scheduler.last_error && h('div', { className: 'aiArNotice aiArNoticeBad', style: { marginTop: 8, marginBottom: 0 } }, `${scheduler.last_error.code ?? 'scheduler_error'}：${scheduler.last_error.message ?? '调度失败'}`),
          ),
          blockers.some((item) => item.code === 'HUMAN_CONSENT_REQUIRED') && h(ConsentBox, {
            runId: detail.run_id,
            blockers: blockers.filter((item) => item.code === 'HUMAN_CONSENT_REQUIRED'),
            onChanged: onRefresh,
          }),
          h('div', { className: 'aiArGrid', style: { marginTop: 15, marginBottom: 0 } },
            h(Kpi, { label: '当前阶段', value: observation.current_stage ?? '—' }),
            h(Kpi, { label: '墙钟耗时', value: formatDuration(observation.wall_elapsed_ms ?? (Date.parse(observation.run_updated_at ?? detail.updated_at) - Date.parse(observation.run_started_at ?? detail.created_at))) }),
            h(Kpi, { label: '人工介入', value: `${observation.human_intervention_count ?? 0} 次` }),
            h(Kpi, { label: 'Token 用量', value: formatTokenUsage(observation.token_usage) }),
            h(Kpi, { label: 'Gate / 阶段通过', value: `${observation.gate_pass_count ?? 0} / ${observation.stage_completion_count ?? 0}` }),
            h(Kpi, { label: '成功率', value: observation.run_success_rate === null || observation.run_success_rate === undefined ? '无样本' : `${Math.round(observation.run_success_rate * 100)}%` }),
            h(Kpi, { label: '人工等待', value: `${observation.human_wait_count ?? 0} 次 · ${observation.human_wait_open_count ?? 0} 待处理` }),
            h(Kpi, { label: '人工等待时长', value: formatDuration(observation.human_wait_ms) }),
            h(Kpi, { label: '有效执行时长', value: formatDuration(observation.effective_elapsed_ms) }),
          ),
              (observation.current_blockers?.length > 0 || observation.failure_count > 0) && h('div', { className: 'aiArNotice aiArNoticeBad', style: { marginTop: 14, marginBottom: 0 } }, h('strong', null, '当前不成功原因'), ': ', (observation.current_blockers ?? []).map((item) => `${item.code ?? SCHEDULER_FAILURE}(${item.phase ?? '—'})`).join('、') || `${observation.failure_count} 条失败记录`),
          h('div', { className: 'aiArTabs' }, tabNames.map((name) => h('button', { key: name, className: `aiArTab${tab === name ? ' aiArTabActive' : ''}`, onClick: () => setTab(name) }, tabLabels[name]))),
          tab === 'overview' ? overviewContent : null,
          tab === 'artifacts' ? artifactContent : null,
          tab === 'events' ? eventContent : null,
        ),
      );
    }

    function ARPanel() {
      const [overview, setOverview] = useState(null);
      const [selected, setSelected] = useState(null);
      const [detail, setDetail] = useState(null);
      const [artifacts, setArtifacts] = useState(null);
      const [events, setEvents] = useState([]);
      const [scheduler, setScheduler] = useState(null);
      const [processes, setProcesses] = useState(null);
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
        if (!runId) { setDetail(null); setArtifacts(null); setEvents([]); setScheduler(null); setProcesses(null); return; }
        try {
          const runProcesses = api('/processes?run_id=' + encodeURIComponent(runId)).catch(() => null);
          const [status, runArtifacts, runEvents, runScheduler, runProcessSnapshot] = await Promise.all([
            api(`/runs/${encodeURIComponent(runId)}`),
            api(`/runs/${encodeURIComponent(runId)}/artifacts`),
            api(`/runs/${encodeURIComponent(runId)}/events`),
            api(`/runs/${encodeURIComponent(runId)}/scheduler`).catch(() => null),
            runProcesses,
          ]);
          setDetail(status); setArtifacts(runArtifacts); setEvents(runEvents.events ?? []); setScheduler(runScheduler); setProcesses(runProcessSnapshot); setError('');
        } catch (cause) { setError(cause.message); }
      }, []);
      useEffect(() => { injectStyles(); loadOverview(); const timer = window.setInterval(() => loadOverview(), 3500); return () => window.clearInterval(timer); }, [loadOverview]);
      useEffect(() => {
        loadDetail(selected);
        const timer = window.setInterval(() => loadDetail(selected), 3500);
        return () => window.clearInterval(timer);
      }, [selected, loadDetail]);
      const active = useMemo(() => (overview?.runs ?? []).filter((run) => !['completed', 'cancelled', 'rejected'].includes(String(run.status))), [overview]);
      const supervisorCounts = overview?.process_supervisor?.counts ?? {};
      if (loading) return h('div', { className: 'aiArPanel' }, h('div', { className: 'aiArLoading' }, '正在连接 DSH AR runtime…'));
      return h('div', { className: 'aiArPanel' }, h('div', { className: 'aiArShell' },
        h('div', { className: 'aiArTop' }, h('div', null, h('div', { className: 'aiArEyebrow' }, 'DeepSeek Harness · Official Web UI extension'), h('h1', { className: 'aiArTitle' }, 'AR Delivery Workbench'), h('p', { className: 'aiArSubtitle' }, '在官方 DSH 页面内编排 OpenHarmony / HarmonyOS 生命周期，查看确定性门控、人工审核、SSH 代码端、设备调试与产物证据。')), h('div', { className: 'aiArTopActions' }, h(Button, { onClick: () => loadOverview(selected) }, '刷新'), h(Button, { onClick: () => setSelected(null) }, '新建运行'))),
        error && h('div', { className: 'aiArNotice aiArNoticeBad' }, error),
        h('div', { className: 'aiArGrid' }, h(Kpi, { label: '运行中 / 等待审核', value: `${active.length} / ${active.filter((run) => run.status?.includes('consent')).length}` }), h(Kpi, { label: '已成功运行', value: `${(overview?.runs ?? []).filter((run) => run.status === 'completed').length}` }), h(Kpi, { label: '人工审核总次数', value: `${(overview?.runs ?? []).reduce((sum, run) => sum + (run.observability?.human_intervention_count ?? 0), 0)}` }), h(Kpi, { label: '受监督进程', value: `${supervisorCounts.running ?? 0} 运行 · ${supervisorCounts.unknown ?? 0} 未知` }), h(Kpi, { label: '数据来源', value: 'SQLite + gates' })),
        h('div', { className: 'aiArLayout' }, h('div', { className: 'aiArStack' }, h(PreflightCard, { overview }), h(CodeAgentSettings, { overview, onSaved: (value) => setOverview((current) => ({ ...current, codeagents: value })) }), h(RagCard, { overview, onChanged: () => loadOverview(selected) }), h(DebugCard, { overview, onChanged: () => loadOverview(selected) }), h(StartCard, { overview, onStarted: (runId) => { setSelected(runId); loadOverview(runId); } }), h('section', { className: 'aiArCard' }, h('div', { className: 'aiArCardHeader' }, h('h2', null, `AR runs (${overview?.runs?.length ?? 0})`), h('span', { className: 'aiArMuted aiArTiny' }, '自动刷新 3.5s')), overview?.runs?.length ? h('div', { className: 'aiArRunList' }, overview.runs.map((run) => h(RunRow, { key: run.run_id, run, active: selected === run.run_id, onClick: () => setSelected(run.run_id) }))) : h('div', { className: 'aiArEmpty' }, '还没有 run。启动左侧 P0 预检后，完整状态会出现在这里。'))), h(Detail, { detail, artifacts, events, scheduler, processes, onRefresh: () => { loadOverview(selected); loadDetail(selected); } })),
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
