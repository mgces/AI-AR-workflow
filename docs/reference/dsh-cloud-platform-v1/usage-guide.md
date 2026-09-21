# DSH 云端 Agent 编排平台使用手册

版本：2.0 · 日期：2026-09-20
适用范围：官方 DSH Web 页面中的 AR Delivery Workbench、CodeAgent 选择、AR P0–P8 run 和维测查看。

这份手册面向实际使用者、测试人员和负责接入 CodeAgent 的工程师。部署步骤见 [迁移到计算云部署手册](deploy-to-compute-cloud.md)。

## 第一次使用：按顺序完成一次 AR run

本节是推荐操作路线，按顺序完成即可。这里以“云端运行 DSH、Windows 打开网页、Windows 本地运行 CodeAgent、WSL 或 SSH 提供源码”为例。当前页面的完整工作流入口要求本机 Connector 真实在线，不能用云端 CLI 冒充本机 CodeAgent。

开始前，请由部署管理员确认云端已启用 `localConnector` 和 `workspaceGateway`、已登记 AR gate 与 CodeAgent profiles，并为你准备好 Connector token、`workspace_id` 和 SSH 代码根。首次部署配置见[部署手册](deploy-to-compute-cloud.md)。RAG 不是运行 AR workflow 的前置条件；只有设备接在本机、而 P6/P7 gate 要在 SSH 主机运行时，才需要配置 HDC relay。

### 第 1 步：打开官方 DSH 页面

1. 打开部署管理员提供的 DSH 地址。若页面提示 `dsh web authentication required`，使用 DSH 启动时输出的有效 URL 重新打开；Connector token 不能代替网页会话认证。
2. 页面加载后确认这是官方 DSH Web 页面，并能进入 **AR Delivery**。

**完成标志：** 页面显示 AR Delivery 工作台。看不到入口时，先检查部署 patch 和插件加载情况，见下方“第一次打开 DSH”章节。

### 第 2 步：下载并启动本机 Connector 客户端

1. 准备本地 CodeAgent 并完成其登录；需要设备调试时确认本机能运行 `hdc.exe`。只有选择 SSH 时才需要 Windows OpenSSH Client。Windows 无需预装 Node.js。
2. 打开 **本机 Connector**，点击 **首次接入：下载 Connector 安装器**。浏览器会把 `Install-DSH-Connector.cmd` 保存到“下载”目录；在下载列表运行一次后，安装器会放到 `%LOCALAPPDATA%\DSH\Connector`，创建开始菜单入口，并注册网页启动链接。若本机没有 Node.js 24+，安装器会从官方 Node.js 源下载固定版本并校验 SHA-256，然后放入 Connector 私有目录，不修改系统 PATH。不需要手工解压或克隆 AI-AR-workflow 仓库。浏览器和 Windows 仍会要求用户确认运行下载文件。
3. 安装器会在同一窗口启动 Connector，选择 **WSL** 或 **SSH**：

   - 选择 **WSL**：客户端自动发现发行版；只有一个时自动选择，多个时显示列表。它通过 `wsl.exe` 直接检查并访问所选发行版里的源码目录，不需要安装或启动 `sshd`。`remote_root` 必须是该发行版中真实存在且可写的 POSIX 目录。
   - 选择 **SSH**：确认远端 SSH 可连通并知道代码根目录。私钥和 `known_hosts` 留在 Windows 本机。若已在 `~/.ssh/config` 配置 Host 别名，可直接测试：

```powershell
ssh wsl-dev "pwd && test -d /srv/project && test -w /srv/project"
```

   把 `wsl-dev` 替换成自己的 SSH Host 别名，或使用 `builder@127.0.0.1`。首次连接前核对 SSH 主机指纹并保存到 `known_hosts`。

4. 按提示输入部署管理员提供的 Connector token。token 以隐藏输入方式读取，不会写入 JSON；Windows 使用当前用户 DPAPI 加密保存，后续启动无需重复输入。Connector 随后连接 DSH；页面自动检测状态，无需手动刷新。
   `remote_tools.mcp_config_format` 默认为 `auto`；Connector 会为 Claude Code、OpenCode 和 Codex 生成各自的 MCP 配置，使 Agent 失败后的自动切换无需重启 Connector。

**完成标志：** 终端输出 `connected`，DSH 页面显示 Connector 在线、所选源码工作区可读写。保持该窗口运行，直到本次 AR run 完成。Connector 在 Windows 本机启动 CodeAgent，再通过受限工作区操作修改 WSL 或 SSH 源码；本机只保存 Connector 客户端，不保存整套 AI-AR-workflow 仓库或远端源码副本。

### Connector 掉线时：页面内恢复

如果页面显示 **本机 Connector offline**，不要重新创建 run。AR Delivery 会每 5 秒自动检查一次连接，并在 **Connector 恢复**区域提供恢复入口：

1. 安装过 Windows 客户端时，点击 **启动已安装的 Connector**；若浏览器询问是否打开本机应用，选择允许。页面会自动显示连接结果。
2. 如果 Connector 正在重连或刚启动，点击 **检测连接**。
3. 如果本机客户端尚未安装或文件损坏，重新运行下载列表中的 `Install-DSH-Connector.cmd`。仍不需要仓库路径或手工编辑配置。WSL/Linux 用户展开备用选项下载便携 ZIP。
4. 如果管理员轮换了 Connector token，删除 `%LOCALAPPDATA%\DSH\Connector\connector-token.dpapi`，再启动 Connector 输入新 token。

页面同时显示工作区、最近心跳、最近断开原因、待回放操作、最近探测原因和 outbox 错误。若提示 `outbox_load_failed`，先修复或恢复 Connector 的 outbox 文件再启动；不要删除操作库，也不要创建第二个 run。云端网页出于浏览器安全边界不能直接启动用户电脑进程，因此本机 Connector 客户端负责运行 CodeAgent、SSH 和 HDC；网页负责下载客户端、编排 workflow、展示审核与维测数据。

**如果 USB 设备接在 Windows 本机：** 先确认本机 `hdc list targets` 能看到设备，再按部署手册的 HDC relay 步骤配置隧道。没有配置 relay 时，P6/P7 要求设备能被 SSH gate 主机直接访问。

### 第 3 步：下载要使用的 Workflow 到所选代码目录

1. 在 **本机 Connector** 页面找到 **下载 Workflow 到源码目录**。
2. 在 AR workflow 卡片点击 **下载到源码目录**。
3. 等待页面显示已下载。Workflow 内容经本机 Connector 写入所选 WSL 或 SSH 代码根的 `.dsh/workflows/ar-delivery/current`，不是下载 AI-AR-workflow 仓库或 Connector 程序，不需要手工复制。
4. 卡片会分别显示**云端源码位置**（如 `workspace-gateway/bin/dsh-ar-delivery.js`、`runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py`、`skills/ohos-ar-dev-phases/scripts/`）和**下载目标**（`<所选代码根>/.dsh/workflows/ar-delivery/current`）。本机 Connector 客户端另行保存在 `%LOCALAPPDATA%\DSH\Connector`。

**完成标志：** AR workflow 显示 `installed`。只有下载完成的 workflow 才能进入选择和运行页面。

### 第 4 步：智能检测并启用 CodeAgent

1. 在 **CodeAgent 设置**点击 **智能检测并启用**。
2. 页面会刷新本机发现结果，先真实运行当前首选 Agent；调用失败时会记录错误码、原因和修复步骤，并自动尝试下一个可用的本机 Agent。
3. 显示“测试成功”后再进入工作流。若全部失败，按页面列出的步骤在本机修复登录、命令路径、网络或适配器，然后点击 **修复后重试**。
4. 只有需要固定某个 Agent、模型或自定义命令时，才展开 **高级手动设置**；保存配置本身不等于 Agent 已经运行成功。

**完成标志：** 页面显示 Agent 已在本机 Connector 真实运行，执行模式为 `local_connector`，并解锁“下一步：选择工作流”。只被发现、但真实调用失败或没有 adapter 的 Agent不会解锁工作流。

### 第 5 步：选择 AR workflow

进入 **选择工作流**，点击已下载的 **AR workflow**。进入后直接显示“提交任务”，不再要求先填写一页环境参数。

**完成标志：** 页面只显示“源码目录”和“AR 描述”两个业务输入。

### 第 6 步：填写两项并自动启动

1. **源码目录**：填写相对 Connector `remote_root` 的项目目录，例如 `openharmony` 或 `product/system`；如果登记根本身就是源码根，填写 `.`。
2. **AR 描述**：写清要实现的能力、预期行为和验收条件。
3. 点击 **自动检查并启动 P0 →**。

系统会自动完成以下工作：

- 通过环境 profile 或真实源码标志识别 OpenHarmony、HarmonyOS system、HarmonyOS chip；
- 使用已测试成功的本机 CodeAgent；
- 探测 SSH 读写、Python、Git、workflow gate 和 bridge；
- 唯一 HDC 设备自动选中，并核对 HDC relay；
- 读取 Git HEAD、当前分支和已清洗凭据的 remote，自动推导基线及 GitCode/Gerrit 发布目标；
- 记录默认构建参数确认并创建 P0 run。

**完成标志：** Run 列表出现新的 `run_id`，详情进入 P0。后续继续同一个 run。

### 第 7 步：只在系统提示时补充

无法唯一识别环境、检测到多个设备、没有可用 Git remote、发布认证不可用或到达人工审核点时，页面会显示“系统需要你补充信息”，并列出具体检查项。补齐后在同一任务继续；不要为了绕过阻断创建第二个 run，也不要手工伪造预检通过。

终端里能运行 `hdc` 只证明该终端的 PATH 可用。系统会分别核对 Windows Connector、HDC relay 和 SSH gate 主机；`source_tree_layout`、`device_transport` 等结果会标明实际探测位置及影响阶段。

### 第 8 步：按阶段推进 P0–P8

在 Run 详情查看当前阶段和下一步状态。每个阶段都要经过“领取任务 → 执行 → 提交产物 → 确定性 gate 验证 → 同步状态”；页面或 DSH worker 要求继续时，在同一个 DSH Session 中继续该 `run_id`。

| 阶段 | 主要工作 | 需要留意 |
|---|---|---|
| P0 | 工程初始化、环境和依赖预检 | 确认工程分支、工具链和工作区 |
| P1 | 设计和接口方案 | 查看设计产物后审核 |
| P2–P3 | 开发和测试用例 | 确认代码变更、测试内容和 gate 证据 |
| P4–P5 | 编译和单元测试 | 失败时修复后在同一 run 重新验证 |
| P6–P7 | 端到端设备测试和质量验证 | 核对设备、产物和真实测试报告；按要求审核 |
| P8 | 上库前检查和发布 | 先审核 diff/目标，再执行授权发布并核对远端回执 |

**遇到暂停时：** `awaiting_consent` 表示等人工审核；`needs_reconcile` 表示要先确认旧进程停止并对账；`connector_offline` 表示本机连接器掉线。不要通过创建第二个 run 绕过这些状态。详细处理见“失败和重试”及“状态含义速查”。

### 第 9 步：审核并记录人工输入

出现 **需要人工审核** 时，先打开当前 run 的阶段和产物，核对 revision、文件 hash、源码提交、设备信息及 gate 报告，再按页面提示提交审核。意见或补充要求写入人工输入框；只有 authority 为当前 run/阶段生成的有效 token 才能完成 consent。

**完成标志：** 审核记录出现在当前 run 的事件和维测中，阶段按 Python authority 的结果继续推进。不要把普通备注、模型总结或旧 run 的批准当作通过。

### 第 10 步：确认完成、查看产物并导出记录

1. 打开 **阶段与人工审核**、**产物**和**事件**页签，检查每个阶段的状态、失败原因、人工介入、耗时和审核记录。
2. 打开报告或审核产物全文；对二进制文件查看 Gateway 计算的大小和 SHA-256，按需下载原始文件。
3. 仅当页面显示 run `completed`、Python authority 的 `complete=true`，且 P8 有可查询的发布回执时，才报告完整完成。
4. 需要留档时，下载 JSON 或 CSV 审计记录。

**数据保存位置：** run/阶段事件、耗时、人工输入和审核、失败原因、真实 token usage、设备探测和 relay 状态保存在云端 DSH runtime SQLite；云端 `dataRoot` 必须挂持久盘并纳入备份。源码和编译产物仍保存在 SSH 工作区，页面经 Gateway 读取/校验后展示，不会自动将整个仓库复制到云对象存储。若 Agent 没有返回结构化 token 用量，页面会显示 `unknown`，不会按耗时估算。

后面的章节用于查字段、处理异常和使用 RAG/API；第一次跑 workflow 时，按以上步骤即可，不需要先配置 RAG 或调用 API。

## 运行方式和能力边界

平台有两个运行形态。使用前先确认你部署的是哪一种：

| 能力 | 当前单云节点 MVP | 目标云架构 |
|---|---|---|
| DSH 页面和 AR Delivery 面板 | 可用 | 可用 |
| Claude Code | 官方 DSH provider 可直接派发；也可由远端 profile 或 Connector 承载 | Connector 在用户电脑执行，代码通过 SSHFS 或 remote-tools MCP 访问 |
| OpenCode、Codex | 本机探测成功后由内置非交互 adapter 派发 | Connector 在用户电脑执行；SSHFS、remote-tools MCP 或 Gateway profile 均可按配置选择 |
| Cursor、Trae | 可发现、可保存；当前没有内置 adapter，启动会被拒绝 | 接入对应 adapter 后再派发 |
| 自定义命令 | 使用受限 `argv` adapter，本机可执行 | 由 Gateway 注册 `codeagent.custom` 固定 profile 后派发 |
| 代码位置 | 必须是 DSH 所在主机的绝对路径 | Connector 的 SSHFS 本地目录或 remote-tools broker 映射到 SSH 代码根；Gate 通过 Workspace Gateway 访问同一远端根 |
| OpenHarmony/HarmonyOS AR runtime | 由同一主机上的 Python gate/advance 执行 | 由 SSH 主机 authority 执行，云端只保存投影 |
| RAG | 本地/Gateway 模式均支持受限词法索引；配置 OpenAI-compatible endpoint 后真实执行 embedding、reranker，并在命中返回前回读 hash | 生产级 pgvector、ACL 过滤、分块流水线和离线评测仍需按部署规模配置；无 endpoint 时明确使用词法 fallback |
| 设备和产物调试 | 本机 Connector 可只读发现设备；可选的 loopback SSH HDC relay 可将同一设备提供给远端 gate | 已接通 relay 与设备身份核对；真实 P6/P7 仍以 SSH gate 产生的测试报告为准 |

“能发现 Agent”不等于“能执行 Agent”，“能看到产物”不等于“产物已经通过 gate”。所有 P0–P8 通过和完成状态仍由对应环境的 Python authority、gate 和 `advance.py` 决定。

目标云模式中的“用户电脑本地 CodeAgent + SSHFS 挂载”以及“不挂载源码的 remote-tools MCP”均已接入：
运行 Connector 后，页面会显示 `local_connector`、本机 Agent、`workspace_access` 和远端工作区探测结果。
两条路径都只下发固定 Agent id 与相对远端路径；完整 P0–P8 仍要求 SSH Workspace Gateway、真实环境
profile、设备通道和发布凭据通过预检。本机 USB 设备可以通过可选的 loopback SSH HDC relay 暴露给远端 gate；
只有 Connector 与 SSH 端的唯一 serial 完全匹配，预检才会认可设备可达。

下面第 1–7 章是上方步骤的详细说明，按需要查阅对应章节即可；RAG、API 和状态表属于参考内容，不是额外的启动步骤。

## 1. 第一次打开 DSH

### 1.1 获取入口

开发或内网部署时，入口通常是：

```text
http://127.0.0.1:8787/?token=<DSH_PRINTED_TOKEN>
```

计算云部署时，使用反向代理域名或 SSH 隧道。token 只用于第一次交换 DSH 浏览器会话，打开后浏览器保存 HttpOnly cookie，之后直接访问 `/` 即可。不要把 token 当成长期密码。

打开页面后应看到官方 DSH 的侧边栏、Session、工具和审批交互，并在同一页面中看到 **AR Delivery** 入口。当前 patch 已关闭只针对 DeepSeek API key 的首次 onboarding，所以 AR 工作台不会先强制弹出“添加 API Key 开始使用”。

如果侧边栏没有 AR Delivery：

1. 检查 `@ai-ar/dsh-workflow` 是否链接到完整仓库；
2. 检查 DSH 启动命令是否使用了正确的 `cordis.patch.yml`；
3. 查看 `dsh --dump-config` 和 systemd 日志；
4. 确认 patch 是最后加载的一层，且 `enableDeliveryRuntime: true`。

### 1.2 页面布局

AR Delivery 页面分成五块：

- 顶部 KPI：当前运行/等待审核、成功运行数、人工审核次数和数据来源；
- 左侧 CodeAgent 设置、启动 AR 工作流和 run 列表；
- 右侧当前 run 的阶段、审核、产物和事件；
- 右侧 **AI 问题分析**窗口：可直接追问，也可将本次 P0 预检或当前 run 诊断提交给 DSH Agent；
- 页面顶部“刷新”和“新建运行”操作。

页面自动每 3.5 秒刷新 run 列表。长时间构建、设备测试或 SSH 任务不要靠浏览器一直开着来维持执行；目标云架构由 Connector/Supervisor 保持任务，浏览器只负责查看和审核。

点击 **分析当前问题** 会把本次预检的结构化检查结果、执行端信息和阻断原因发送给当前 DSH Session/Agent；对运行中的问题会额外带上阶段状态、失败原因、最近事件、人工输入和最多 3 份文本产物片段。二进制产物不会上传到对话，诊断会限制长度并遮蔽常见凭据字段。AI 回复和后续追问保存在 DSH Session 中。未点击分析或发送前，页面不会把诊断内容提交给模型。

## 2. 配置 CodeAgent

### 2.1 智能发现、真实测试和自动切换

点击 **智能检测并启用** 后，DSH 依次执行以下闭环：

1. 要求本机 Connector 在线，并重新执行受限的 `--version` 探测；
2. 只选择 `available=true`、有适配器且 `execution_mode=local_connector` 的候选；
3. 首先测试当前首选 Agent，然后按 Claude Code、Codex、OpenCode 等候选顺序自动回退；
4. 每个候选都必须通过 `/ai/analyze` 发起一次真实、只读的非交互调用；发现命令并不算成功；
5. 成功后保存实际可用的 Agent 并解锁 workflow；全部失败时显示每个 Agent 的错误码、原始消息和修复步骤。

探测结果会展示：

- Agent 名称和类型；
- `available`/`missing`/`probe_failed` 状态；
- 命令名和解析出的实际路径；
- 版本首行和失败原因；
- 是否有已加载的 DSH 宿主适配器。

探测的是 Connector 进程实际使用的本机 PATH，不是浏览器、WSL shell 或云主机的 PATH。不会因为另一个终端能运行 CLI 就自动让 Connector 看见它。页面应显示 `source=local-connector` 和 `execution_mode=local_connector`。

常见失败会形成可重试的修复建议：命令不存在时检查 Connector PATH 或配置完整路径；认证失败时在本机终端完成 Agent 登录；网络超时时检查本机代理和模型服务；Connector 断线时先重新检测 Connector。修复完成后点击 **修复后重试**，无需重新创建 workflow run。

对应 API：

```http
GET  /api/ohos-ar/healthz
GET  /api/ohos-ar/codeagents
POST /api/ohos-ar/codeagents/refresh
```

`healthz` 与 AR API 共用官方 DSH 会话认证，返回 `status=ok`、服务名和当前工作区模式。

### 2.2 选择和保存

下拉框目前包含：

| 选项 | 说明 |
|---|---|
| Claude Code | `@deepseek-ai/dsh-subagent-claude-code` 官方 provider；官方页面可直接派发 |
| OpenCode | 探测 `opencode --version`；内置 `run --format json --dir ...` adapter，本机或 Gateway profile 可派发 |
| Codex CLI | 探测 `codex --version`；内置 `exec --json` adapter，本机或 Gateway profile 可派发 |
| Cursor Agent | 探测 `cursor-agent --version`；需 Cursor 宿主 adapter |
| Trae CLI | 探测 `trae --version`；需 Trae 宿主 adapter |
| 自定义 CodeAgent | 配置自己的命令、固定参数和模型名；发现阶段不会执行命令 |

选好后点击 **保存 CodeAgent 设置**。配置保存到 DSH runtime 数据目录的 `codeagent-settings.json`，新建 run 时复制到 run 的 `agent`/`model` 字段；已创建的 run 不会被修改。

如果选择自定义 Agent，还要填写：

- 显示名称；
- 模型名（可选）；
- 命令绝对路径或服务用户 PATH 中的命令；
- 固定参数，每行一个。

自定义命令使用受限 `argv` 协议：命令通过 `shell:false` 启动，固定参数可使用 `{{prompt}}`、`{{workspace_root}}`、`{{model}}` 等变量。本机命令探测成功后可直接运行；目标云模式必须先在 Gateway 登记固定的 `codeagent.custom` profile，否则启动会返回 `codeagent_adapter_unavailable`（HTTP 422）。

### 2.3 如何判断状态

页面中的“已发现（待适配器）”表示可执行文件存在、版本探测成功，但 DSH 尚不知道如何向这个 CLI 发送 AR 阶段上下文、权限请求、取消、恢复和 usage 回执。OpenCode/Codex 在本仓内置 adapter 或已登记 Gateway profile 后会显示为可派发；自定义命令只有 `argv` 协议且本机探测成功，或已登记 Gateway profile 时才可派发；Cursor、Trae 仍需正式 adapter。不要通过修改 JSON 或数据库绕过 adapter 门控。

Claude Code 通过官方 DSH provider 识别，不要求 `claude --version` 必须在 WSL shell 中成功。Provider 的认证仍由 Claude Code/Provider 原生设置管理，不从其他用户借用凭据。

## 3. 准备代码工作区和工程环境

### 3.1 单云节点 MVP

当前实现要求 `repo_root` 是 DSH 进程所在主机上的绝对路径，并且位于 patch 配置的 `repoRoot` 目录内。推荐：

```text
/srv/dsh/workspaces/default/project/
  build.sh                         # OpenHarmony 标志
  test/testfwk/developer_test/     # OpenHarmony 测试标志
  specs/pipeline/                  # AR pipeline 由 P0 创建
```

不要传 `ssh://host/path`、相对路径或工作区外路径。Python adapter 会在这个代码根下创建 `specs/pipeline/<run_id>`，读取并执行 gate/advance。

### 3.2 目标云架构

用户不把源码复制到云。先在 Connector 中登记：

1. 本地 CodeAgent 及其版本；
2. SSH profile、known_hosts 和允许的源码根；
3. 可用设备、构建目标和发布目标；
4. Connector 能力、版本和连接状态。

云端 run 固定 `workspace_id` 和 `environment_profile_digest`，通过 WSS 发固定 schema 的操作意图。SSH 私钥只留在用户端或 SSH Gateway 的 secret store；云端页面只显示脱敏连接名和能力结果。

### 3.3 工程环境必须先分支

启动前确认代码属于哪一类：

| 页面选择 | 后续路径 |
|---|---|
| OpenHarmony | OpenHarmony `build.sh`、developer_test、对应 gate 和 GitCode/CI |
| HarmonyOS + system | HarmonyOS system profile、system 编译/测试和对应 Gerrit 流程 |
| HarmonyOS + chip | HarmonyOS chip profile、chip 编译/测试和对应 Gerrit 流程 |

当前页面的“代码环境”下拉框先选择 OpenHarmony 或 HarmonyOS；选择 HarmonyOS 后再选择 `system` 或 `chip`。没有完整 profile、工具链、产品和设备信息时，不要把默认的 OpenHarmony 示例参数当作 HarmonyOS 配置。

### 3.4 启动前置检查

AR Delivery 左侧的 **前置条件检查** 会调用同一个官方 DSH Web Server 的
`GET /api/ohos-ar/preflight`。它只做探测和展示，不写 pipeline，也不能代替 Python gate；每次真正
领取任务时，代码端仍会再次校验相同事实。检查结果有三种主要状态：

| 状态 | 含义 |
|---|---|
| `blocked` | 不能安全派发 P0，例如代码根不可达、CodeAgent 未适配、Python/gate 缺失或 Gateway 不通；先处理所有阻断项 |
| `ready_for_p0` | DSH 可以创建并派发 P0，但环境 profile、设备、发布目标等后续条件仍未齐全；P8 不能据此报告可完成 |
| `ready_for_p8` | 当前 workspace、运行时、Agent、环境/分支、设备和发布目标都已通过前置探测；P0–P8 仍必须由真实 gate、人工审核和发布回执闭环 |

页面会同时显示：代码根在哪台主机、Agent 在 DSH 主机还是 SSH 代码端执行、加载方式（官方
provider、本机 CLI 路径或 Gateway profile）、凭据应由哪台主机的原生配置提供，以及当前每一项
阻断原因。`pending` 表示还没有绑定或验证，不能当作通过；尤其环境 profile 或发布凭据为
`pending` 时，P8 一定保持不可完成。

预检失败时，启动错误只把 `required_for` 包含 P0 的失败项列为 P0 阻断；其他失败项显示为
“后续阶段待处理（不阻断 P0）”。例如 `device_transport`/`runtime_hdc` 仅要求 P6–P8 时，真正的
P0 阻断可能是另一个检查，如 `source_tree_layout`。点右侧 **分析当前问题** 后，AI 对话会收到原始
预检 checks（包括每项的 `required_for`、探测结果和缺失标志）。可以先在 AI 对话输入框补充现象，例如
“我的 PowerShell 可以运行 hdc”，再点 **分析当前问题**；这段补充会和结构化预检一起提交，也可以继续追问应该在哪台主机验证 PATH、设备 relay 或源码根。

对“本机 shell 能运行 `hdc`，页面却显示 `executable_not_found`”先区分检查端：若预检由 DSH 服务执行，
需要让服务进程获得正确的 `HDC_BIN`/`DSH_HDC_CLI` 或配置的 `hdcCommand`，然后重启服务并重新检查；
若 HDC 只在 Windows Connector 上，本机设备要供 SSH gate 使用还需配置 HDC relay，单纯改云端 PATH
不会让 SSH 主机看到 Windows 的设备。`source_layout_markers_missing` 则说明实际探测的源码根没有满足
当前 OpenHarmony/HarmonyOS profile 声明的入口标志；确认所选 `repo_root`，再按真实工程更新受信 profile。

远端 workspace 的检查不是只请求 Gateway `/healthz`：DSH 预检会在签名 Authority envelope 中发送
`workspace.probe`，让 SSH 代码端解析登记的 `remoteRoot` 或其下本次 run 的 `repo_root`，确认它是目录并同时具备读、写权限。
因此“Gateway 进程在线”与“当前 SSH 代码根可用”会分别显示；任何一项失败都会阻断 P0。预检请求
会带上本次选择的 `environment`、HarmonyOS 的 `component_type`（`system` 或 `chip`）、可选的
`device_type`/`device_serial`、`agent` 和 `model`，这些值会随 run 固化，避免页面选择与实际分支不一致。

本地预检还会逐一检查 P0–P8 所需的 `advance.py`、9 个阶段 gate、`prepare_test_bundle.py`、
`lib/environments.py` 和 `delivery_bridge.py`，并检查 AR 输入是否为项目根内的可读文件或非空内联文本。
远端预检使用 `workspace.probe` 的 `expect=file|directory` 检查源码入口：OpenHarmony 默认要求
可执行的 `build.sh` 文件、`test/testfwk/developer_test` 目录和可执行的 `start.sh` 测试入口；HarmonyOS system/chip 的 root markers
必须写入对应环境 profile（也可以由受信 profile 提供 `sourceLayoutVerified` 及其证据），没有配置时
明确显示 `source_layout_markers_unconfigured`，不会把仅存在 `build_system.sh`/`build_vendor.sh`
当成完整 HarmonyOS 环境。远端 AR 输入没有云端示例路径，启动时请填 SSH 代码根下的 AR 文件，或
直接粘贴 `ar_text`；只有部署配置显式设置 `remoteDefaultArPath` 时才会使用默认文件。

建议每次换工程、换设备或换 Agent 后先点击“重新检查”，再点击“启动 P0”。OpenHarmony 与
HarmonyOS 的 profile digest 必须分别绑定环境；在同一 DSH 实例上切换 `system`/`chip` 时，
重新绑定对应 profile，不能复用另一分支的 digest。

### 3.5 CodeAgent 加载方式和 SSH 代码端

CodeAgent 的“加载”分为发现、适配和执行三个步骤：

1. **发现**：页面刷新会在实际执行主机运行受限的 `--version` 探测。看到命令存在只表示可发现，
   不表示已经能接收 AR 阶段上下文、取消和 usage 回执。
2. **适配**：Claude Code 可由官方 DSH provider 执行；OpenCode、Codex 和自定义命令要么使用本机
   内置 argv adapter，要么在 Workspace Gateway 登记固定 profile。Cursor、Trae 目前只有发现信息，
   没有兼容 adapter 时会在启动前拒绝。
3. **执行**：每个 run 固定 Agent、model、workspace、environment profile 和 revision。凭据始终由
   执行主机的 CodeAgent 原生配置或 secret store 提供，页面只保存选择和非敏感 profile id。

SSH 代码端有四种模式，均已有对应代码路径；是否可完成 P0–P8 仍由远端 gate、设备和发布预检决定：

| 模式 | Agent 和 gate 在哪里执行 | 本地 Agent 修改 SSH 代码的代价 | 建议 |
|---|---|---|---|
| DSH 本机模式 | DSH 主机本地绝对路径 | 最低；代码、Agent、Python gate 使用同一文件系统 | 单云节点或代码也在云主机时使用 |
| Gateway 远端 profile | SSH 代码主机；CodeAgent、Python gate、编译和产物都在远端 | 低；不复制源码，远端 Agent 直接改注册的 `remoteRoot` | 计算云 + 用户 SSH 代码的推荐模式 |
| 本地 Connector + SSHFS/受控挂载 | 本地 Connector 启动 CLI，挂载目录映射到 SSH 代码；gate 仍在 SSH Gateway | 大仓读写、软链接、权限、断线和并发锁会明显受挂载影响；Connector 与 Gateway 必须同时在线 | 当前可用；适合需要本地 Claude/OpenCode/Codex 凭据的完整编排路径，性能需按仓库实测 |
| 本地 Connector + remote-tools MCP | 本地 Connector 启动 CLI；CLI 通过一次性 MCP socket 调用 SSH read/search/write/diff 和登记 profile；gate 仍在 SSH Gateway | 不复制源码、不需要 SSHFS；每次工具调用有网络往返，目标 CLI 的 MCP 配置格式必须正确 | 当前可用；适合不能安装 FUSE/SSHFS 的环境 |

本地 CLI 不能把未挂载的 `/srv/project` 或 `ssh://host/path` 当作 `cwd`；这样会导致 Agent 看不到文件，
或把临时文件写到错误主机。Gateway 模式会把 prompt 写入远端受限目录，调用登记的
`codeagent.claude`/`codeagent.opencode`/`codeagent.codex` profile，随后清理临时 prompt，把 stdout、
stderr、usage 和 artifact 引用回传到云端；云端不保存原始 prompt/远端进程输出。AR 的六个
`ar.delivery.*` profile 还会在同一 `remoteRoot` 调用 `advance.py` 和 `delivery_bridge.py`，因此
CodeAgent 修改的文件与 gate 读取的文件是同一份，不需要同步或打包上传源码。

如果 SSH 代码根没有完整 DSH 仓库，部署管理员还要把 gate bundle 放到该 `remoteRoot` 下的只读
`.dsh/ar-workflow/`，并在 Gateway patch 设置 `deliveryScriptsRoot`/`deliveryBridgePath`。P0 会
逐文件探测这两个路径；没有 bundle 时会在前置条件中直接显示缺失项。云端的同名路径（例如
`/opt/dsh/AI-AR-workflow/...`）不会自动对 SSH 主机可见，也不能替代远端 bundle。

完成远端 profile 绑定后，在前置检查中应看到：`代码端=ssh_code_host`、`加载方式=gateway_registered_profile`、
`编辑策略=remote_codeagent_profile`。使用本地 Connector 时应看到：`workspace_mode=local_connector`、
`加载方式=connector_local_agent`、`编辑策略=connector_sshfs_mount`，并有一个 `connector_transport`
检查通过。若仍看到 `local_cli_remote_edit=unsupported`，说明选中的 Agent 仍在 DSH 云主机；请选择
`source=local-connector` 的 Agent。SSHFS 或 Gateway 断线时不要重复创建 run，先查看 Connector/远端
Supervisor 的 operation 状态并完成 `reconcile`，再继续原 run。

### 3.6 启动本地 Connector

在用户电脑或 WSL 中可以选择 SSHFS 挂载，使挂载目录对应 SSH Gateway 的 `remoteRoot`。可以手动挂载：

```bash
mkdir -p /mnt/dsh-code
sshfs <ssh-user>@<ssh-host>:/srv/project /mnt/dsh-code \
  -o StrictHostKeyChecking=yes,reconnect,ServerAliveInterval=15
```

也可以让 Connector 自动完成受控挂载。配置 `auto_mount: true` 和 `ssh` 块（host、username、
port、mount_point、identity_file、known_hosts_file、固定 options），它会以 `shell:false`
调用 `sshfs`，验证 `/proc/self/mountinfo` 后才发送 hello，退出时卸载本次创建的挂载。未挂载的
空目录会被阻断；完整示例见仓库文件 `workspace-gateway/README.md`。

如果是 **Windows 打开网页、WSL 保存源码**，Windows 安装启动器里的 **WSL** 方式会直接调用 `wsl.exe`，
自动发现并选择发行版，然后用管理员下发的 `remote_root` 检查源码目录；无需在 WSL 开启 `sshd`，
也无需手工编辑 SSH 别名。高级手动配置可参考
[`local-connector-windows-wsl.json`](../../../workspace-gateway/examples/local-connector-windows-wsl.json)。
需要连接独立 Linux 服务器时，选择 **SSH** 并使用 Windows OpenSSH 配置。

复制仓库示例 `dsh-workflow/examples/local-connector-config.json` 并填写真实的 DSH URL、工作区、
本地挂载目录和远端根。SSHFS 模式还必须填写 `ssh.host`（以及 user、密钥和 known_hosts）；Connector
不会把一个普通本地目录冒充 SSH 代码端。token 可改为环境变量 `DSH_CONNECTOR_TOKEN`，不要提交配置文件中的长期密钥。
然后运行：

```bash
export DSH_CONNECTOR_TOKEN='<connector-token>'
node workspace-gateway/bin/dsh-local-connector.js \
  --config /absolute/path/connector.json
```

Connector 启动时会探测 Claude Code、OpenCode、Codex、Cursor、Trae 和自定义命令的 `--version`，
并通过固定的 `hdc list targets` 只读探测本机设备；Agent 清单和设备探测结果随 hello 发送到云端。云端 Overview 的 `connector.workspaces` 变为在线后，
CodeAgent 卡片会显示本地 Agent；选择它再执行预检，预检必须同时通过：

1. `connector_transport`：Connector 在线、workspace_id 与 SSHFS/remote-tools 工作区绑定一致；
2. `workspace_binding`/`workspace_transport`：SSH Workspace Gateway 可读写远端根；
3. `source_tree_layout`：OpenHarmony 或 HarmonyOS 对应入口已核验；
4. `workflow_scripts` 和 `runtime_python`：所有 P0–P8 gate/bridge/profile 在 SSH 代码端可执行；
5. `device_transport`：P6/P7 所用设备必须能被 SSH gate 主机访问；只在 Connector 上发现设备不会满足此项。启用并验证 HDC 反向隧道后，预检会要求 SSH 端返回同一 serial。

运行时不需要浏览器保持打开。关闭浏览器只停止查看；取消按钮会向本地 Connector 发送
`agent.cancel`，本地进程退出后 scheduler 才会释放该阶段。SSHFS 断开或本地电脑休眠时，页面会显示
`connector_offline`/`needs_reconcile`，不要再次点击“启动 P0”创建第二个 run。

当前 Connector 命令面是固定的 `probe`、`device.probe`、`agent.start`、`agent.status`、`agent.cancel`。
`device.probe` 在本机只执行固定的 `hdc list targets`（启用 relay 时固定到配置的 loopback HDC server 端口），不接受云端传入的 HDC 命令、shell 或本地路径；Connector
也不接收云端任意 shell、任意本地路径或未发现的 Agent。设备探测会回传来源、在线目标、耗时和检查时间。若不使用 SSHFS，
将配置改为 `workspace_access: "remote_tools"` 并提供 `remote_tools.allowed_profiles`；Connector
会为每次 Agent run 生成 MCP 配置和一次性 socket，支持 `dsh_workspace_read/list/search/write/diff/
hash/read_binary/exec_profile`。远端 profile 仍只允许运行管理员登记的固定命令，P4–P8 的 gate 仍由
SSH Workspace Gateway 执行。

### 3.7 云端页面调用本机能力与数据回传

浏览器本身不能直接启动本机 `hdc`、`ssh` 或 CodeAgent。需要在持有这些程序和凭据的电脑/WSL 上运行
`dsh-local-connector`；它主动通过 WSS 连接云端 DSH。页面上的操作由 DSH 经该连接发给 Connector，
Connector 再按已绑定的工作区、固定命令和已发现的 Agent 执行。关闭网页不会停止已经派发的阶段；
Connector 下线时，新请求会阻断或显示需要对账。

目前可调用范围是：

- **本地 CodeAgent**：Connector 用本机已登录的 Claude Code、OpenCode、Codex 或已配置 argv adapter 执行；
  结果状态、退出码、耗时、可观测的 token usage 和 artifact 引用通过 WSS 回到云端。
- **SSH 代码**：SSHFS 模式由本机 Connector 保持挂载，Agent 对挂载根内的文件读写；remote-tools 模式由
  Connector 使用配置的 SSH 身份，经受限 MCP 操作访问同一远端代码根。Gateway 的编译和 AR gate 在
  SSH 代码主机运行，完成回执、日志摘要和产物引用回云端。
- **本机 HDC**：Connector 只允许固定只读的本机设备探测，不接收云端任意 HDC 参数或本地 shell。可选的
  `device_relay` 已实现为 HDC server + SSH reverse forward：本机有服务时复用现有实例，没有服务时才启动并托管一个；
  遵守 HDC 每个运行环境只允许单一服务实例的限制。本机监听和 SSH 远端监听都绑定 `127.0.0.1`，
  Gateway 的固定设备 profile 与 P0/P4–P7 gate 通过 `HDC_HOST_OVERRIDE` 使用该隧道。云端会要求本机与 SSH 端
  profile 返回完全相同的唯一 serial 才将设备标记为可达。启用前需满足：本机 Connector 的 SSH host 指向
  DSH Workspace Gateway 的同一代码主机；SSH 服务端允许 remote forwarding；本机 `hdc` 能看到目标设备；
  Gateway profile 将 `HDC_HOST_OVERRIDE` 绑定到 `{{device_hdc_host_override}}`。详细示例见部署手册。
- 当前已经接通隧道启停、设备 serial 对照和 gate 环境传递，但此开发环境没有接入真实 USB 设备，
  因此不能据此声称真实设备的 HAP 安装、刷机或 P6/P7 已完成。只有对应 gate 产生真实报告并通过后，AR 阶段才会通过。

DSH 把 run/阶段状态、事件、阶段耗时、人工输入与审核记录、真实 usage 回执、失败原因、本机和 SSH 端
HDC 探测结果、设备 serial 对照与 relay 状态保存到云端 DSH runtime SQLite（`dataRoot/controller.sqlite3`）。云端需把 `dataRoot` 配到持久盘并
纳入备份；临时开发默认目录不适合作为云端留存位置。源码和编译产物仍在 SSH 工作区，由云端通过 Gateway
读取或计算 hash；当前没有自动把整个 SSH 工作区复制到对象存储。生产部署示例把 `dataRoot` 设为
`/var/lib/dsh/runtime`，备份步骤见部署手册“日志、备份和升级”。

如果本机不能安装 SSHFS，使用下面的最小 remote-tools 配置片段（完整文件见
`workspace-gateway/examples/local-connector-remote-tools.json`）：

```json
{
  "workspace_access": "remote_tools",
  "remote_tools": {
    "enabled": true,
    "allowed_profiles": ["codeagent.build"],
    "mcp_config_format": "auto"
  },
  "remote_root": "/srv/project",
  "ssh": {
    "host": "code-host.example",
    "username": "builder",
    "identity_file": "/home/user/.ssh/id_ed25519",
    "known_hosts_file": "/home/user/.ssh/known_hosts"
  }
}
```

该模式不填写 `local_root`。Connector 先通过 SSH `workspace.probe` 验证远端根，再为每次 Agent
run 创建短时 MCP 配置和 Unix socket；本地 Agent 只能使用 `dsh_workspace_*` 工具，文件修改直接
落在 SSH 主机。Claude 使用 `--strict-mcp-config --mcp-config` 加载 JSON，OpenCode 使用
`OPENCODE_CONFIG` 加载官方 flat `mcp.dsh_remote` JSON（通过官方 `permission` deny 规则拒绝本地 bash/read/write 工具），Codex 使用隔离 `CODEX_HOME/config.toml` 加载
`[mcp_servers.dsh_remote]`；Codex 会复制本机存在的 `auth.json`/`credentials.json` 到本次临时
home，API key 环境变量和钥匙串继续由本机 CLI 使用。由于这个临时 home/工作目录只是受限 MCP
启动目录，不是 SSH 源码仓，DSH 在 `remote_tools` 模式下会自动向 Codex 加入
`--skip-git-repo-check`；源码仍只能通过允许的 `dsh_workspace_*` 工具访问。固定私有/旧版 OpenCode 可显式设置
`opencodeConfigShape: "v2"`；默认仍是官方 flat 结构。自定义 argv Agent 必须显式设置 `mcp_config_arg` 或在固定参数
中使用 `{{mcp_config_file}}`；页面中 `编辑策略` 会显示 `connector_remote_tools_mcp`，远端根不可达
或没有允许的 profile 时 P0 直接阻断。

## 4. 启动一个 AR run

### 4.1 用页面启动

在 **提交 AR 任务**卡片只填写：

1. **源码目录**：相对 Connector/Gateway 登记根的源码根，登记根本身可填 `.`；
2. **AR 描述**：非空的需求、预期行为与验收条件。

点击 **自动检查并启动 P0 →**。服务端会再次执行权威预检，并把自动识别的环境分支、唯一设备、Git HEAD、发布目标和默认构建确认写入 run。无法唯一识别的字段不会猜测，页面会返回需要补充的检查项。

启动成功后：

- run 列表出现新的 `run_id`；
- 列表显示启动时的 Agent、当前阶段和人工次数；
- 详情显示 `Agent claude-code`（或保存的 Agent id）；
- P0 Python pipeline 位于代码根下的 `specs/pipeline/<run_id>`；
- 服务返回 `dispatch_needed` 时，表示需要 DSH/host worker 领取下一阶段，不表示阶段已经通过。

### 4.2 用 API 启动

先通过浏览器完成 token 交换，使用同一个 DSH cookie：

```bash
curl -X POST 'https://dsh.example.com/api/ohos-ar/runs' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <DSH_SESSION_COOKIE>' \
  -H 'Idempotency-Key: ar-demo-001' \
  --data '{
    "repo_root": "project",
    "ar_text": "实现示例能力，并完成编译、真机验证和上库",
    "idempotency_key": "ar-demo-001"
  }'
```

API 同样只要求 `repo_root` 和非空 `ar_text`；`idempotency_key` 建议由调用方提供。服务端会应用与页面相同的自动识别结果。重试同一个请求必须复用相同 key 和请求内容；同 key 不同内容会被拒绝。

## 5. P0–P8 的实际使用流程

AR run 不是点击启动后自动把所有阶段标成成功。每个阶段都要经历“领取 → 执行 → 提交产物 → 确定性验证 → 必要时人工确认 → 推进”。

### 5.1 阶段表

| 阶段 | 主要工作 | 常见人工门 |
|---|---|---|
| P0 | 工程初始化、环境和依赖预检 | 环境/profile 信息确认 |
| P1 | 设计、方案和接口边界 | 审核设计产物后同意继续 |
| P2 | 代码开发 | 无固定 consent，但必须有代码和 gate 证据 |
| P3 | 测试开发 | 测试框架、覆盖目标和测试产物 |
| P4 | 编译和产物生成 | 编译失败必须修复后重新 gate |
| P5 | 单元测试 | gtest/测试报告和失败分类 |
| P6 | 端到端功能、设备和调试 | 审核设备/产物证据后同意 |
| P7 | 质量、覆盖率、性能、稳定性等验证 | 审核完整质量报告后同意 |
| P8-precheck | 上库前预检、diff、目标和发布条件 | 审核发布前证据 |
| P8-publish | 实际 GitCode/Gerrit/CI 发布 | 最终发布授权；发布回执异常需对账 |

P8 预检和 P8 发布是两个不同 task。预检 HOLD 不等于运行失败，也不能用预检结果代替实际发布回执。

### 5.2 DSH worker 的标准动作

在官方 DSH Session 中，让宿主 Agent 按 run 返回的 `next` 执行，不要直接改 SQLite 或 `pipeline.json`。推荐给 DSH 的任务提示：

```text
请继续 AR Delivery run <RUN_ID>。
只使用 ohos_task_claim、ohos_task_context、ohos_task_heartbeat、
ohos_task_submit、ohos_delivery_validate、ohos_delivery_consent、
ohos_delivery_sync 等官方工具；按返回的 role/revision 工作。
先阅读 task context 和当前环境 profile，使用仓库已有 Skill 与 gate 脚本。
不要把模型文本当作 PASS，不要直接写 pipeline 状态，不要替用户提交 consent。
```

标准顺序如下：

1. 调用 `ohos_task_claim`，带 `run_id`、`role`、`expected_revision` 和当前 host binding；
2. 领取成功后调用 `ohos_task_context`，读取 `workspace_root`、`pipeline_dir`、阶段约束和 artifact 输出要求；
3. 执行该阶段允许的 Skill、源码操作、编译/测试/设备命令；
4. 长任务期间发送 `ohos_task_heartbeat`，确认租约仍有效；
5. 停止并回收自己启动的所有子进程，将产物写入指定目录；
6. 用 `ohos_task_submit` 提交 artifact 引用和简短摘要；提交只表示“交给 gate 检查”，不表示通过；
7. 调用 `ohos_delivery_validate`，读取真实 gate 结果和失败原因；
8. gate 通过且阶段要求人工审核时，等待网页用户审阅后再调用 `ohos_delivery_consent`；
9. 调用 `ohos_delivery_sync`，让 runtime 对齐 Python authority 的最新阶段；
10. 按新的 `next` 重复，直到 P8 publish 回执和 `complete=true` 同时成立。

如果 `claim` 返回 `dispatch_needed`、`awaiting_host`、`needs_input`、`needs_reconcile` 或 `no_available_task`，按返回状态处理，不要重新创建另一个 run 来绕过当前状态。

### 5.3 失败和重试

gate 失败时，先在详情的“当前不成功原因”、阶段失败次数和事件中确认失败来源：

- 代码或测试失败：按 Python gate 的 repair 信息修复，再提交新的 artifact；
- 环境缺失：补齐 profile、工具链、设备或 SSH 能力，重新执行 P0；
- `needs_reconcile`：先确认旧 Agent/构建/设备进程已经停止，再 release/sync；
- `resource_busy`：等待同一工作区、设备或发布目标的其他 task 释放；
- `source_root_outside_workspace`：修正工作区绑定，不要传越界路径；
- `pipeline_conflict`：使用原 run 和原 pipeline，不能用新 run 覆盖历史；
- `codeagent_adapter_unavailable`：安装或挂载该 Agent 的宿主 adapter，不能改状态字段绕过。

提交失败 artifact、过期租约或未知进程后，不要并行启动第二个写入者。旧 attempt 必须按协议 release/reconcile，确保工作区和设备没有孤儿进程。

## 6. 人工审核和输入

### 6.1 什么时候需要人工

P1、P6、P7、P8-precheck/publish 可能进入 `awaiting_consent`。详情卡会出现黄色的 **需要人工审核**区域，其中包含 task id、phase 和 evidence-bound token 输入框。

用户应先查看当前版本的：

- artifact 文件名、路径、sha256 和全文/报告；
- 阶段状态、尝试次数、gate 失败次数和事件时间线；
- environment/profile、代码提交和设备属性；
- diff、测试报告、编译日志和发布目标。

确认看到的证据与当前 revision、run、workspace 和 profile 一致后，粘贴 authority 产生的真实 consent token，点击 **记录审核并同步**。空 token、任意自造字符串、旧 revision 或其他 run 的 token 都会被拒绝。

当前 AR 面板提供的是 evidence-bound consent 入口；“拒绝/要求修改”要通过 runtime 的 reject/release/repair 流程处理，不能把页面上的普通备注当作批准。

### 6.2 记录人工输入

人工输入正文、追问、审核意见和纠偏应通过结构化 input API 或已接入的审批组件提交。每条输入都需要绑定 run、actor、时间和 revision。不要把密码、SSH 私钥、模型 token 或未授权源码粘贴到输入框。

目标云架构中，人工输入与 Agent 的 tool-call permission response 分开计量：用户允许某次工具调用不等同于通过 AR 阶段。

## 7. 查看状态、产物和维测

### 7.1 Run 列表

每个 run 行显示：

- run id；
- 当前状态（queued、working、awaiting_consent、needs_reconcile、completed 等）；
- 启动时 Agent；
- 当前阶段；
- 已创建阶段数；
- 人工介入次数。

点击某一行即可加载详情。历史 run 保留原 Agent，即使之后修改了全局 CodeAgent 设置。

### 7.2 阶段与人工审核页签

详情 KPI 包括：

- 当前阶段；
- run 墙钟时长、人工等待时长和扣除等待后的有效执行时长；
- 人工介入次数；
- token usage 状态；
- 成功次数、失败次数和事件数量。

阶段表中的字段：

| 字段 | 含义 |
|---|---|
| 阶段/角色 | 例如 `P4`、`build-engineer` |
| 状态 | task 当前状态，不等于 gate PASS 文本 |
| 墙钟 | 从 task 创建到结束或当前的阶段区间 |
| 人工等待 | 该阶段人工审核等待区间与阶段区间的并集时长 |
| 有效耗时 | 墙钟减去人工等待；重叠等待只扣一次 |
| 尝试 | attempts 数量，包括重试和被替代的尝试 |
| 门控失败 | 该阶段被确定性 validation 拒绝的次数 |

“人工等待区间”表会列出每个 `wait_id` 的打开/关闭时间、闭合状态和时长。`open` 表示当前仍在等
待审核；`unknown` 表示旧事件缺少可配对的人工动作，需对账后才能用于精确效率统计。

### 7.3 Token 和模型用量

`token_usage.status=unknown` 或 `partial` 是真实的计量覆盖状态，不是 0。本地 Connector 的 Claude/OpenCode/Codex/custom CLI 会解析进程返回的结构化 usage（若 CLI 输出了 JSON usage）；没有输出 usage 的 provider 仍会显示 `unknown`，只有拿到真实 usage 回执后才可以填 input/output token 和费用。页面不会根据耗时或字符数估算 token。

不要把 DSH 上下文 token、CodeAgent token、embedding token 和 reranker token 相加成一个未经来源标记的数字。目标云架构要求按执行器、模型、run、阶段和 usage 来源分账。

### 7.4 产物页签

产物页签显示当前 pipeline 下可安全展示的 `evidence/`、`reports/`、`controls/` 文件：

- 相对路径和文件角色；
- 字节数；
- sha256；
- 小文件全文；
- 大文件是否截断；
- `.hap`、`.hsp`、`.so`、`.img` 等二进制默认显示代码端计算的大小和 sha256，页面不会把二进制按 UTF-8 解码成伪正文；点击“下载原始文件”时走 `artifacts/download`，Gateway 返回 base64 后由服务端校验字节数和 sha256 再下载。

审批对象是带 hash 的不可变 artifact bundle。工作区里后来被修改的同名文件不自动替换已经审核的版本；源码变化后必须重新提交并重新 gate。

不要把页面里显示的相对路径拼成任意文件下载路径。当前实现只接受认证的 `GET /api/ohos-ar/runs/<RUN_ID>/artifacts/download?path=...`，并限制在三个 artifact 根目录；旧 Gateway 不支持 `workspace.read_binary` 时只提供元数据，路径遍历、软链接逃逸和跨租户 artifact id 都必须被拒绝。生产对象存储接入后再将响应替换为短期下载 URL。

### 7.5 事件页签

事件页签按序号展示 `run.started`、`task.claimed`、`task.submitted`、`task.validation_rejected`、`task.awaiting_consent`、`delivery.synced` 等事件及 JSON payload。

用事件判断“什么时候发生了什么”，用阶段状态判断“现在是否可操作”，用 Python gate/advance 证据判断“是否真的通过”。三者不能互相替代。

## 8. 可选功能：RAG

### 8.1 当前状态

本仓 `platform/apps/local-console` 提供一个授权代码根上的本地索引；启用 Workspace Gateway 后，官方 DSH AR 主面板使用远端索引，从 WSL/SSH 代码端读取允许范围的文本并在返回结果前回读 hash。两种模式都提供同一 RAG 状态、索引、检索和模型配置入口。模型配置可以登记 provider、embedding/reranker 模型和服务地址；当宿主配置了 OpenAI-compatible endpoint（`/embeddings` 与 `/rerank`）时执行真实向量和重排，profile 为 `execution=active`，检索结果标记 `retrieval_mode=embedding_reranker`。没有 endpoint 或模型请求失败时，profile 会明确显示 `planned`/`partial`，检索结果标记词法 fallback 和原因，不会伪造模型已启用。

在 AR Delivery 页面 **代码知识库（RAG）** 卡片中选择执行模式并保存模型配置，然后点击“建立 / 刷新索引”。Gateway 模式默认把索引缓存写入 DSH `dataRoot/remote-rag-index.json`；若代码不允许上云，部署配置设置 `workspaceGateway.ragEnabled: false`。配置不接收 API key、token 或密码；部署时把 endpoint 放入受信 patch 或 `DSH_RAG_ENDPOINT`，把凭据放入宿主 secret 环境变量 `DSH_RAG_API_KEY`（也可由 `apiKeyEnv` 指定变量名）。远端检索会在结果返回前回读当前文件 hash，发现变化会重建索引；引用结果带相对路径、行号、源码 revision 和 hash。

### 8.2 正式 RAG 的使用流程

正式 RAG 部署后，使用顺序应是：

1. 选择已授权 workspace、路径前缀和 environment profile；
2. 查看索引版本、源码 snapshot hash、embedding 模型和维度；
3. 建立初始或增量索引；
4. 以符号/全文/向量召回并进行可选 rerank；
5. 结果必须带文件、行号、hash、profile 和 index version；
6. DSH 或 CodeAgent 使用前回 SSH 核验当前文件 hash；
7. 代码变化时标记 `RAG_SOURCE_STALE`，重新检索；
8. 记录检索延迟、命中数、embedding/reranker usage 和 fallback 原因。

对应 DSH API 为 `GET/PUT /api/ohos-ar/rag/profile`、`GET /api/ohos-ar/rag/status`、`POST /api/ohos-ar/rag/index` 和 `POST /api/ohos-ar/rag/search`；本地 fallback 也提供同名的 `/api/rag/*` 路由。`embedding_reranker` 在适配器和服务健康时返回 `execution=active`，否则返回 `planned` 或 `partial` 并保留 fallback 原因。生产部署仍需对模型服务做健康检查、ACL/向量库隔离和评测登记。

RAG 只提供上下文线索，不能决定 OpenHarmony/HarmonyOS 分支、不能修改 gate、不能生成 consent、不能宣布 AR run 成功。详细约束见 [RAG、工程初始化与调试扩展](rag-environment-debug.md)。

## 9. 进阶参考：SSH、产物和设备调试

### 9.1 SSH 代码操作

目标云 Connector 只能通过 Workspace Gateway 访问用户授权的 SSH workspace。安全的操作类型包括：

- `probe`：在 SSH 主机确认登记的 `remoteRoot` 是可读（以及 P0 要求的可写）目录；
- `list/read/search`：读取和搜索当前源码；
- `patch`：携带 expected hash 的 CAS 修改；
- `diff`：查看当前变更；
- `exec`：调用固定白名单命令，不拼任意 shell；
- `status/cancel`：查看或停止受管操作；
- `artifact`：按 run 绑定收集证据。

每次 P4 构建、P6 设备操作和 P8 发布都要记录源码快照、工作区资源锁和进程状态。SSH channel 断开不等于远端作业已经停止；恢复前必须从 Supervisor/authority 对账。

### 9.2 产物识别

产物识别先给出类型、产品、ABI、架构、来源、sha256 和来源 workspace，再由 profile 匹配决定是否允许进入设备流程。手动上传或扩展名判断只能标为 advisory，不能冒充 P4 正式产物。

### 9.3 设备选择

设备调试入口应展示：连接来源、本地/WSL/Linux/SSH 位置、serial、OS、产品、ABI、build、权限和在线状态。

- 0 台设备：保持等待或阻塞；
- 1 台设备：仍需核对 profile 和授权；
- 多台设备：必须人工选择，不能自动挑第一台；
- 属性 unknown 或不匹配：不允许部署；
- 设备重连后：重新读取属性并核对 nonce/uptime/加载证据。

设备识别不会自动刷机。正式 P6/P7 证据必须来自受管部署、实际加载和对应 gate；云端页面展示的本地调试结果若未绑定 authority receipt，只能作为诊断信息。

## 10. API 参考（首跑非必需）

所有 API 都走同一个 DSH Web Server 和浏览器会话。下面的 `<COOKIE>`、`<RUN_ID>`、`<TASK_ID>`、`<REVISION>` 要替换成真实值。

### 10.1 查看总览和 Agent

```bash
curl -b '<COOKIE>' \
  https://dsh.example.com/api/ohos-ar/overview

curl -b '<COOKIE>' \
  https://dsh.example.com/api/ohos-ar/codeagents

curl -X POST -b '<COOKIE>' \
  https://dsh.example.com/api/ohos-ar/codeagents/refresh
```

### 10.2 查看 run

```bash
curl -b '<COOKIE>' \
  "https://dsh.example.com/api/ohos-ar/runs/<RUN_ID>"

curl -b '<COOKIE>' \
  "https://dsh.example.com/api/ohos-ar/runs/<RUN_ID>/artifacts"

curl -b '<COOKIE>' \
  "https://dsh.example.com/api/ohos-ar/runs/<RUN_ID>/events?cursor=0"
```

### 10.3 导出审计结果

同一个官方 DSH 页面提供 JSON 和 CSV 下载。JSON 保留 run 状态、阶段耗时、Agent/Token 维测、人工输入、失败原因、事件和产物哈希；CSV 是面向表格审计的阶段汇总。默认包含人工输入，若只需要元数据可显式关闭正文：

```bash
curl -L -b '<COOKIE>' \
  "https://dsh.example.com/api/ohos-ar/runs/<RUN_ID>/export?format=json" \
  -o ar-run-<RUN_ID>.json

curl -L -b '<COOKIE>' \
  "https://dsh.example.com/api/ohos-ar/runs/<RUN_ID>/export?format=csv&include_inputs=false" \
  -o ar-run-<RUN_ID>.csv
```

导出只读取当前用户有权查看的 run 和 artifact；CSV 会对以 `=`, `+`, `-`, `@` 开头的文本做安全转义。导出文件仍应按项目保密级别保存，不要提交到代码仓库。

### 10.4 阶段控制

阶段控制请求必须使用 runtime 返回的 task、revision、attempt、lease epoch 和 credential。不要手写或复用其他 run 的值。

```bash
# 领取
curl -X POST -b '<COOKIE>' -H 'Content-Type: application/json' \
  "https://dsh.example.com/api/ohos-ar/runs/<RUN_ID>/claim" \
  --data '{"role":"environment-analyst","expected_revision":1}'

# 读取领取结果返回的 context
curl -X POST -b '<COOKIE>' -H 'Content-Type: application/json' \
  "https://dsh.example.com/api/ohos-ar/runs/<RUN_ID>/context" \
  --data '{"attempt_id":"<ATTEMPT_ID>","lease_epoch":1,"task_credential":"<CREDENTIAL>"}'

# gate 验证
curl -X POST -b '<COOKIE>' -H 'Content-Type: application/json' \
  "https://dsh.example.com/api/ohos-ar/runs/<RUN_ID>/validate" \
  --data '{"task_id":"<TASK_ID>","expected_revision":1}'

# 人工 consent（token 必须来自 authority）
curl -X POST -b '<COOKIE>' -H 'Content-Type: application/json' \
  "https://dsh.example.com/api/ohos-ar/runs/<RUN_ID>/consent" \
  --data '{"task_id":"<TASK_ID>","phase":1,"token":"<EVIDENCE_BOUND_TOKEN>"}'

# 对账
curl -X POST -b '<COOKIE>' \
  "https://dsh.example.com/api/ohos-ar/runs/<RUN_ID>/sync"
```

API 返回的 HTTP 202 只表示 run intent 已接受，不表示 gate 或发布成功；最终状态要读取 status、events 和 Python evidence。

## 11. 状态含义速查

| 状态 | 使用者动作 |
|---|---|
| `queued` | 等待 host/worker 领取；不要重复创建 run |
| `awaiting_host` / `dispatch_needed` | 按 `next.role` 派发正确 Agent |
| `working` | 等待 Agent heartbeat、artifact 和提交 |
| `validating` | 等待确定性 gate，不要手工改状态 |
| `awaiting_consent` | 用户查看当前 revision 的完整证据并输入真实 token |
| `needs_reconcile` | 先确认旧进程停止并对账，再 release/sync |
| `completed` | Python complete、最终证据和发布回执均已满足 |
| `failed`/`rejected` | 根据失败事件和 gate 输出修复，不把模型总结当原因 |
| `cancelled` | 任务停止；重新开始必须创建新 run 或按协议 resume |

## 12. 安全和数据处理

- 不把 SSH 私钥、CodeAgent 登录 token、模型 API key、HMAC secret 放进 AR 输入、artifact 正文、Git 或页面截图；
- 只给 Agent 当前阶段需要的 workspace、工具和输出路径；
- 不让 worker 直接调用 parent/consent/publish 权限；
- 任何需要写源码、执行构建、访问设备或发布的动作都必须绑定 run、task、revision、lease epoch 和资源锁；
- 页面上的 artifact、事件和人工输入按租户/用户权限过滤；
- 运行未知时标记 `needs_reconcile`，不自动重试有副作用的命令；
- 关闭浏览器不会自动停止目标云架构中的 Connector/Supervisor 作业；重新打开页面后通过 cursor/reconcile 恢复视图；
- 免登录模式只适合私有网络。公网部署必须使用 OIDC/SSO、HTTPS 和租户隔离。

## 13. 故障排查

| 问题 | 处理方式 |
|---|---|
| 看不到 AR Delivery | 检查 patch、插件软链接、profile 日志和浏览器缓存 |
| 仍出现 API key onboarding | 确认加载的是包含 `ui-settings-models.disabled=true` 的最终 patch |
| CodeAgent 列表为空 | 以 DSH 服务用户执行 refresh；检查 PATH 和 `DSH_*_CLI` |
| Claude provider missing | 检查官方 Claude bundle、preset root 和 DSH 重启日志 |
| OpenCode/Codex 已发现但不能启动 | 检查本机 CLI 的非交互协议、Gateway profile、Authority 签名和 scheduler `last_error`；这是 adapter/连接错误，不是 AR gate 失败 |
| Codex 提示 `Not inside a trusted directory` | 确认执行模式为 `local_connector` 且编辑策略为 `connector_remote_tools_mcp`；该模式会自动加入 `--skip-git-repo-check`。如果仍失败，在 AI 分析窗口查看透传的 `diagnostic`、`exit_code` 和 `operation_id`，不要把 SSH 源码复制到本地临时目录 |
| P0 repo_root 越界 | 使用 patch 配置根下面的绝对路径；不要传 SSH URL |
| 页面显示待审核但没有产物 | 先查看 run events 和 pipeline 的 evidence/reports/controls 是否已写入，再同步 |
| consent 被拒绝 | 核对 task id、phase、revision、run 和 authority token 是否对应同一证据包 |
| token usage 是 unknown | 当前 provider 没有结构化 usage 回执；不能手工填 0 |
| 设备很多或属性 unknown | 不自动选择/部署；先完成设备选择和 profile 匹配 |
| SSH 断开后想重跑 | 先查 Supervisor/authority 是否仍有进程和锁，完成 reconcile 后再继续 |

## 14. 使用完成判定

一次 AR run 只有同时满足以下条件，才可以向用户报告完成：

- `environment_profile` 已确认且与 run 固定 digest 一致；
- P0–P8（含 P8-precheck 与 P8-publish）按正确分支完成；
- 每个阶段有真实 artifact、gate/validation 结果和 revision 关联；
- P1/P6/P7/P8 所需人工审核已绑定当前不可变证据；
- P4/P5/P6/P7 的构建、测试、设备和质量报告来自实际执行环境；
- P8 发布有远端 PR/Change/CI 的可查询回执，网络中断已完成对账；
- run status 为 `completed`，Python authority 的 `complete=true`；
- 页面维测中的失败原因、人工次数、阶段耗时、Agent 和 usage 覆盖状态可追溯；
- 没有未回收的构建、测试、设备或发布子进程；
- 导出内容包含 run id、revision、源码/产物 hash、profile、事件 cursor 和审核记录。

相关文档：[迁移到计算云部署手册](deploy-to-compute-cloud.md) · [接口与数据契约](contracts.md) · [验收矩阵](acceptance.md) · [DSH 官方 Web UI 接入边界](dsh-integration.md)。
