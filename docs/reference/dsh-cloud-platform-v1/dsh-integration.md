# DSH 官方 Web UI 接入边界

本平台的前门使用 DeepSeek Harness 官方 Web profile。页面由 `@deepseek-ai/dsh-web-app`
及其官方 client bundles 提供，工作区、Session、Tool call、Approval、Subagent 和 Workflow
的交互语义均来自 DSH；本仓不复制一套“看起来像 DSH”的前端。

本仓的 `dsh-workflow` 以 Cordis plugin 形式装载到官方 profile。默认的 `ar_*` 工具负责模块路由、
repair packet 和需求投影；启用 `enableDeliveryRuntime` 后，再注册下面的权威 AR 工具：

- `ohos_delivery_start`：创建或挂接真实 P0–P8 run；
- `ohos_task_claim/context/heartbeat/submit/release`：阶段租约和产物提交；
- `ohos_delivery_validate/consent/sync`：调用 Python gate、人工门控和恢复；
- `ohos_run_status/observability/events/artifacts`：读取 DSH runtime 的事件、阶段耗时、尝试、
  阻塞原因、人工介入和产物哈希。
- `ohos_run_observability` 的时间字段按权威事件账本计算：`wall_elapsed_ms` 是阶段区间并集，
  `human_wait_ms` 是人工等待区间与阶段区间的交集，`effective_elapsed_ms` 为两者之差；每个阶段
  和 `human_wait_intervals` 都保留同一计算结果。没有足够事件闭合的旧数据会标记
  `human_wait_unknown_count`/`human_wait_data_quality=partial`，不会把未知等待当作零。
- `GET /api/ohos-ar/processes`：读取脱敏的 ProcessSupervisor 快照（状态计数、PID/PGID 和
  operation id），用于区分实际运行、重启后 unknown、失败和已取消的子进程；命令参数、提示词和
  stdout/stderr 不会通过此入口返回。可用 `limit`（1–2000）限制结果，并用 `run_id` 或
  `operation_id` 聚焦单次运行；overview 也带有同一份 `process_supervisor` 快照。

同一个插件还提供官方 DSH 客户端扩展 `src/dsh/client.js`。它使用 DSH 的 `main`、
`sidebar.panellist` 和官方主题 token，把 **AR Delivery Workbench** 直接挂进官方左侧导航和主面板；
面板通过同一个 DSH Web Server 的认证路由 `/api/ohos-ar/*` 读取上述 runtime。用户不需要打开第二个
local-console 页面，也不会在页面之间复制状态。

当前本地部署不使用 DeepSeek API 作为 AR 工作台的前置条件：patch 会关闭官方
`ui-settings-models` 的首次使用 API Key onboarding，并把官方
`@deepseek-ai/dsh-subagent-claude-code` provider 挂入同一个 Host。默认
`claude-code` Agent Preset 开启 `subagent_claude_code`，Claude Code 在 WSL 工作区中执行一次性代码任务；
Claude 的账号认证和原生设置仍由 Claude Code 自己管理。页面中的 AR overview 会报告该 provider 是否已加载。

同一 AR 主面板提供 **CodeAgent 设置**。可以选择 Claude Code、OpenCode、Codex CLI、Cursor Agent、Trae CLI
或自定义命令；设置通过同一个认证路由 `GET/PUT /api/ohos-ar/codeagents` 保存到 runtime 数据目录，
新建 run 自动带上当前 `agent`/`model`，历史 run 保留启动时的值。`POST /api/ohos-ar/codeagents/refresh`
会重新探测已知 CLI 并返回命令名、实际解析路径、版本及失败原因。页面会显示 WSL CLI 探测状态；官方
Claude provider 可在 DSH 主机执行，也可以在 `workspaceGateway.profiles` 登记
`claude-code: codeagent.claude` 后改由代码端 `claude` CLI 执行。OpenCode/Codex 需要安装并配置相应宿主适配器或 Gateway profile 后才会自动派发。

远端代码根没有完整 DSH 仓库时，还要在登记的 `remoteRoot/.dsh/ar-workflow/` 安装管理员维护的只读
gate bundle，并在 patch 中设置 `workspaceGateway.deliveryScriptsRoot` 与
`workspaceGateway.deliveryBridgePath`。远端适配器只从这两个部署配置注入固定 profile 变量；P0 会
通过签名 `workspace.probe` 逐项检查 gate、`lib/environments.py` 和 bridge，发现 bundle 不可见就阻断，
不会等到 P4 才失败。两个路径必须位于登记的 `remoteRoot` 内，代码端 CodeAgent 仍只拥有项目文件的写权限。
未显式配置时，适配器会按本次 run 的 `repo_root` 使用其下的标准
`skills/ohos-ar-dev-phases/scripts` 和 `runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py`；
多个项目共用一个 `remoteRoot` 时，建议为每个项目显式配置只读 bundle，避免路径误指向父目录。

工具调用会出现在官方 DSH Session 的标准 Tool card 和 event timeline 中。AR 面板顶部的“受监督进程”
KPI 和调度卡片来自上述快照，出现 unknown 时必须先完成 reconcile 才能继续派发。`ohos_run_observability`
返回的 `token_usage.status=unknown` 是真实的未观测结果，只有宿主或模型 provider 提供结构化
usage 时才会填充 token 数量，不允许由模型估算成事实。

## 本地启动

先安装官方 CLI（Node 22.19+）：

```bash
npm install --prefix /tmp/dsh-official @deepseek-ai/dsh@0.1.5-rc.1
# 先初始化官方 Web profile；否则 npm 只会创建普通 package.json，缺少
# dsh.profile.bundles，官方 Web bundle 和 patch 无法组成。
DSH_HOME="$DSH_HOME" /tmp/dsh-official/node_modules/.bin/dsh \
  --profile web --dump-config >/dev/null
npm install --prefix "$DSH_HOME/profiles/web" --save @deepseek-ai/dsh-subagent-claude-code@0.1.5-rc.2
mkdir -p "$DSH_HOME/profiles/web/node_modules/@ai-ar"
ln -sfn /abs/path/AI-AR-workflow/dsh-workflow \
  "$DSH_HOME/profiles/web/node_modules/@ai-ar/dsh-workflow"
```

然后从本仓启动官方 Web profile，并把 `dsh-workflow/cordis.patch.yml` 作为最后一层 patch：

```bash
DSH_HOME=/path/to/dsh-home \
/tmp/dsh-official/node_modules/.bin/dsh \
  --profile web \
  --patch /abs/path/AI-AR-workflow/dsh-workflow/cordis.patch.yml \
  --no-open --host 127.0.0.1 --port 8787
```

命令打印的 `?token=...` URL 是官方 Web UI 的一次性浏览器会话交换入口；它不是用户登录。
首次打开后 DSH 会写入绑定当前地址的 HttpOnly cookie，后续访问使用干净的 `/` 地址。

官方 Web UI 的模型设置、工作区选择和权限审批仍由 DSH 管理；AR 通过上述工具和同页路由使用本仓的
SQLite runtime 和 `advance.py`/`gate_*.py` 事实源。`platform/apps/local-console` 只保留自动化测试和
故障隔离用途，不是用户入口，也不需要在运行 DSH Web 时另开端口。仓库已经删除它原先提供的独立
HTML 页面；误访问其根路径会收到 `410 legacy_local_console_ui_removed`，不会再显示一套容易混淆的旧界面。

## 生产部署约束

官方 Web server 默认只监听 `127.0.0.1`，不提供 TLS 或多租户身份认证。云部署必须在前面加
反向代理、身份系统和租户隔离，并把 DSH 进程的 workspace、`DSH_HOME`、runtime 数据库和
代码端 SSH 主机按租户分开。不能把 `--host 0.0.0.0` 作为公网部署方案，也不能把 launch token
当作多用户身份系统。

参考：

- [DeepSeek Harness Web UI quickstart](https://deepseek-harness.github.io/deepseek-harness/en/guide/quickstart)
- [Web client](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/web-client)
- [Workflow subsystem](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/workflow)
- [Subagent subsystem](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/subagent)
- [Web server](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/web-server)
