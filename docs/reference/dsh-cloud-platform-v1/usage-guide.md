# DSH 云端 Agent 编排平台使用手册

版本：1.2 · 日期：2026-09-15
适用范围：官方 DSH Web 页面中的 AR Delivery Workbench、CodeAgent 选择、AR P0–P8 run 和维测查看。

这份手册面向实际使用者、测试人员和负责接入 CodeAgent 的工程师。部署步骤见 [迁移到计算云部署手册](deploy-to-compute-cloud.md)。

## 先了解当前边界

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
| 设备和产物调试 | 当前以只读识别和 artifact 展示为主；远端二进制通过 `workspace.hash` 在代码端计算摘要 | Connector/SSH 主机完成受管传输、部署和正式证据 |

“能发现 Agent”不等于“能执行 Agent”，“能看到产物”不等于“产物已经通过 gate”。所有 P0–P8 通过和完成状态仍由对应环境的 Python authority、gate 和 `advance.py` 决定。

目标云模式中的“用户电脑本地 CodeAgent + SSHFS 挂载”以及“不挂载源码的 remote-tools MCP”均已接入：
运行 Connector 后，页面会显示 `local_connector`、本机 Agent、`workspace_access` 和远端工作区探测结果。
两条路径都只下发固定 Agent id 与相对远端路径；完整 P0–P8 仍要求 SSH Workspace Gateway、真实环境
profile、设备和发布凭据通过预检。

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

AR Delivery 页面分成四块：

- 顶部 KPI：当前运行/等待审核、成功运行数、人工审核次数和数据来源；
- 左侧 CodeAgent 设置、启动 AR 工作流和 run 列表；
- 右侧当前 run 的阶段、审核、产物和事件；
- 页面顶部“刷新”和“新建运行”操作。

页面自动每 3.5 秒刷新 run 列表。长时间构建、设备测试或 SSH 任务不要靠浏览器一直开着来维持执行；目标云架构由 Connector/Supervisor 保持任务，浏览器只负责查看和审核。

## 2. 配置 CodeAgent

### 2.1 获取本地主机 Agent 列表

在左侧 **CodeAgent 设置**卡片点击 **刷新本地 Agent**。DSH 会在运行它的主机上执行受限的 `--version` 探测，并展示：

- Agent 名称和类型；
- `available`/`missing`/`probe_failed` 状态；
- 命令名和解析出的实际路径；
- 版本首行和失败原因；
- 是否有已加载的 DSH 宿主适配器。

探测的是实际执行主机的 PATH。单云节点模式探测云主机；目标云模式由 Connector 在用户电脑上重新探测，
不会因为 Windows 安装了某个 CLI 就自动让 WSL 或云主机看到它。Connector 在线后点击“刷新 CodeAgent”，
页面会显示 `source=local-connector` 和 `execution_mode=local_connector`。

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
并把可用 Agent 清单随 hello 发送到云端。云端 Overview 的 `connector.workspaces` 变为在线后，
CodeAgent 卡片会显示本地 Agent；选择它再执行预检，预检必须同时通过：

1. `connector_transport`：Connector 在线、workspace_id 与 SSHFS/remote-tools 工作区绑定一致；
2. `workspace_binding`/`workspace_transport`：SSH Workspace Gateway 可读写远端根；
3. `source_tree_layout`：OpenHarmony 或 HarmonyOS 对应入口已核验；
4. `workflow_scripts` 和 `runtime_python`：所有 P0–P8 gate/bridge/profile 在 SSH 代码端可执行。

运行时不需要浏览器保持打开。关闭浏览器只停止查看；取消按钮会向本地 Connector 发送
`agent.cancel`，本地进程退出后 scheduler 才会释放该阶段。SSHFS 断开或本地电脑休眠时，页面会显示
`connector_offline`/`needs_reconcile`，不要再次点击“启动 P0”创建第二个 run。

当前 Connector 命令面是固定的 `probe`、`agent.start`、`agent.status`、`agent.cancel`，并且只接受
相对登记工作区的路径；它不接受云端任意 shell、任意本地路径或未发现的 Agent。若不使用 SSHFS，
将配置改为 `workspace_access: "remote_tools"` 并提供 `remote_tools.allowed_profiles`；Connector
会为每次 Agent run 生成 MCP 配置和一次性 socket，支持 `dsh_workspace_read/list/search/write/diff/
hash/read_binary/exec_profile`。远端 profile 仍只允许运行管理员登记的固定命令，P4–P8 的 gate 仍由
SSH Workspace Gateway 执行。

如果本机不能安装 SSHFS，使用下面的最小 remote-tools 配置片段（完整文件见
`workspace-gateway/examples/local-connector-remote-tools.json`）：

```json
{
  "workspace_access": "remote_tools",
  "remote_tools": {
    "enabled": true,
    "allowed_profiles": ["codeagent.build"],
    "mcp_config_format": "claude"
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
home，API key 环境变量和钥匙串继续由本机 CLI 使用。固定私有/旧版 OpenCode 可显式设置
`opencodeConfigShape: "v2"`；默认仍是官方 flat 结构。自定义 argv Agent 必须显式设置 `mcp_config_arg` 或在固定参数
中使用 `{{mcp_config_file}}`；页面中 `编辑策略` 会显示 `connector_remote_tools_mcp`，远端根不可达
或没有允许的 profile 时 P0 直接阻断。

## 4. 启动一个 AR run

### 4.1 用页面启动

在 **启动 AR 工作流**卡片按以下顺序填写：

1. **代码环境**：选择 OpenHarmony 或 HarmonyOS；
2. **HarmonyOS 分支**：环境为 HarmonyOS 时选择 `system` 或 `chip`；OpenHarmony 时该项禁用；
3. **SSH 项目目录**（Gateway 或 Connector 模式）：如果登记的 `remoteRoot` 是多个项目的父目录，填写项目根的相对路径；留空表示直接使用登记根。页面会先用 `workspace.probe` 验证目录、读写权限和源码标志；绝对路径也必须落在登记根内；
4. **AR 文件**：本机模式可留空使用仓库示例；Gateway/Connector 模式请填写所选 SSH 项目目录下的相对路径，或使用下面的内联需求框；
5. **直接粘贴 AR 需求**：可直接粘贴本次需求。填写后以文本内容为准；留空才读取 AR 文件；
6. 勾选“我确认使用 AR 示例默认组件”，确认你了解默认组件参数；
7. 点击 **启动 P0 →**。

启动按钮在没有代码根或没有勾选确认时保持禁用。服务端还会检查路径边界、AR 内容（文件或非空内联文本）、环境值、幂等 key 和 Python 初始化结果。

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
    "input_ref": "user://demo/ar-001",
    "ar_path": "docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json",
    "repo_root": "/srv/dsh/workspaces/default/project",
    "environment": "openharmony",
    "confirm_defaults": true,
    "agent": "claude-code",
    "idempotency_key": "ar-demo-001"
  }'
```

如果不使用文件，传入非空的 `ar_text`。重试同一个请求必须复用相同的 `idempotency_key` 和请求内容；同 key 不同内容会被拒绝。

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

## 8. RAG 使用方式

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

## 9. SSH、产物和设备调试

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

## 10. 常用 API

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

## 12. 状态含义速查

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

## 13. 典型完整操作示例

下面是一条 OpenHarmony 的安全操作路径：

1. 登录/打开 DSH 官方页面，进入 AR Delivery；
2. 刷新 CodeAgent，确认 Claude Code 为 `available`；
3. 确认代码根、`build.sh`、developer_test 和 Python gate 存在；
4. 选择 OpenHarmony，输入 AR 文件，勾选默认组件确认；
5. 启动 P0，等待环境报告和 profile 结果；
6. 让 DSH worker 按 `claim → context → heartbeat → submit → validate` 完成 P0；
7. 查看 P0 证据，确认环境和源码根；
8. P1 进入 `awaiting_consent` 时，检查设计文件和 hash，提交真实 consent；
9. P2/P3/P4/P5 按阶段 gate 运行，失败则修复同一个 workspace 并重新提交；
10. P6 先核对产物与设备 ABI/product/profile，再进行受管设备测试；
11. P7 审核质量、覆盖率、性能和稳定性报告；
12. P8-precheck 审核 diff、目标仓库、Change-Id/PR 和发布策略；
13. P8-publish 只在最终授权后执行，回包丢失时先查询远端 SHA/Change 状态，不重复发布；
14. 确认 run 为 `completed`，导出带 run/revision/profile/artifact hash 的审计结果。

## 14. 安全和数据处理

- 不把 SSH 私钥、CodeAgent 登录 token、模型 API key、HMAC secret 放进 AR 输入、artifact 正文、Git 或页面截图；
- 只给 Agent 当前阶段需要的 workspace、工具和输出路径；
- 不让 worker 直接调用 parent/consent/publish 权限；
- 任何需要写源码、执行构建、访问设备或发布的动作都必须绑定 run、task、revision、lease epoch 和资源锁；
- 页面上的 artifact、事件和人工输入按租户/用户权限过滤；
- 运行未知时标记 `needs_reconcile`，不自动重试有副作用的命令；
- 关闭浏览器不会自动停止目标云架构中的 Connector/Supervisor 作业；重新打开页面后通过 cursor/reconcile 恢复视图；
- 免登录模式只适合私有网络。公网部署必须使用 OIDC/SSO、HTTPS 和租户隔离。

## 15. 故障排查

| 问题 | 处理方式 |
|---|---|
| 看不到 AR Delivery | 检查 patch、插件软链接、profile 日志和浏览器缓存 |
| 仍出现 API key onboarding | 确认加载的是包含 `ui-settings-models.disabled=true` 的最终 patch |
| CodeAgent 列表为空 | 以 DSH 服务用户执行 refresh；检查 PATH 和 `DSH_*_CLI` |
| Claude provider missing | 检查官方 Claude bundle、preset root 和 DSH 重启日志 |
| OpenCode/Codex 已发现但不能启动 | 检查本机 CLI 的非交互协议、Gateway profile、Authority 签名和 scheduler `last_error`；这是 adapter/连接错误，不是 AR gate 失败 |
| P0 repo_root 越界 | 使用 patch 配置根下面的绝对路径；不要传 SSH URL |
| 页面显示待审核但没有产物 | 先查看 run events 和 pipeline 的 evidence/reports/controls 是否已写入，再同步 |
| consent 被拒绝 | 核对 task id、phase、revision、run 和 authority token 是否对应同一证据包 |
| token usage 是 unknown | 当前 provider 没有结构化 usage 回执；不能手工填 0 |
| 设备很多或属性 unknown | 不自动选择/部署；先完成设备选择和 profile 匹配 |
| SSH 断开后想重跑 | 先查 Supervisor/authority 是否仍有进程和锁，完成 reconcile 后再继续 |

## 16. 使用完成判定

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
