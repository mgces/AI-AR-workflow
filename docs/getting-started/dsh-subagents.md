# 在不同 Agent 中使用 DSH workflow subagent

本文说明如何在 **Codex、Claude Code、Cursor、Trae** 中配置和调用本仓库的两个领域 subagent：

| Subagent | 负责的流程 | 输入 | 完成后交付 |
|---|---|---|---|
| `ohos-requirement` | 需求分析 R1–R9 | 原始需求、补充材料、人工决策 | 需求文档、评审记录、IR、proposal、SR、handoff、`AR.md` |
| `ohos-delivery` | AR 开发 P0–P8 | `AR.md`、源码位置、构建与设备参数 | 设计、代码、测试、门控证据及授权后的上库结果 |

适用版本：仓库 `runtime/dsh-ohos` v0.3.0；宿主官方文档核对日期：2026-09-06。

**当前可以按本文进行本地接入与试运行；四宿主真实全流程、真实 OHOS 构建/设备链路和 DSH profile 尚未完成实机验收。**配置导出和本地协议测试通过，不代表宿主实机验收通过。

## 1. 先了解运行方式

本指南使用已有的 **宿主原生 subagent + 本地 MCP 控制器** 路径，无须先安装 DeepSeek Harness CLI，也无须配置额外的 DeepSeek 模型 API。

```text
你：在宿主主对话中提出任务、选择模型、作出业务决策
                         |
宿主父 agent ------------+---- ohos_parent MCP：启动、校验、决策、恢复
                         |
                         +---- 宿主原生 subagent（每次执行一个阶段任务）
                                  |
                                  +---- ohos_worker MCP：领取、上下文、心跳、提交
                                                |
                                   同一 OHOS workflow 控制器与状态目录
                                      |                       |
                                requirement R1–R9       delivery P0–P8
                                文档/决策校验            原有 Python 门禁
```

两个 MCP 连接可以启动各自的 Node 进程，但必须共享同一个 `OHOS_DSH_DATA_ROOT`。模型推理发生在宿主中，控制器负责阶段状态和校验。

**subagent 文件只定义阶段执行者。父 agent 仍需读取父协议、创建 run、派发任务并调用验证工具。**控制器返回 `dispatch_needed` 时，不会自行启动 Codex、Claude Code、Cursor 或 Trae 进程。主对话关闭后，也没有独立后台调度器替你持续派发。

需求完成后，通过 `AR.md` 显式启动另一个 delivery run；两者不会自动串成开发和发布授权。

### 套餐模型如何使用

先在宿主中使用自己的正常登录方式，并选择可用模型。本仓库生成的 Codex 配置省略模型和推理强度字段，Claude Code、Cursor 配置写入 `model: inherit`，Trae 配置省略 `model`。

这表示把模型选择交给宿主，不会读取或转发宿主登录凭据。实际模型及费用仍由宿主的登录方式、账户、套餐、组织策略和派发设置决定；`inherit` 不能作为相同模型或零额外费用的证明。若宿主不提供实际模型/用量信息，记录为“不可观测”。

## 2. 准备环境和目录

| 项目 | 要求 |
|---|---|
| 本仓库 | 保留完整 `runtime/dsh-ohos/` 和 `skills/`，生成配置后不要随意移动目录 |
| Node.js | 24 或更新版本，需可用内置 `node:sqlite` |
| Python | 可运行本仓库现有 workflow 脚本的 Python 3；通过下方预检确认 |
| 宿主 | 能加载本地 MCP、派发原生 subagent，并允许任务所需的文件与终端操作 |
| 需求分析 | 独立、可写的文档目录；R5 还需真实独立审阅上下文和可记录的会话身份 |
| AR 开发 | 已准备好的源码、构建环境、测试工具；设备和发布阶段还需相应访问能力 |

区分三个位置：

| 变量 | 示例 | 用途 |
|---|---|---|
| `DshRepo` / `DSH_REPO` | `D:/AI/AI-AR-workflow` | 保存本仓库代码和 skills |
| `DshWork` / `DSH_WORK` | `D:/work/openharmony` | 在宿主中打开的项目；实际任务工作区 |
| `DshState` / `DSH_STATE` | `D:/work/openharmony/.dsh-ohos/state` | 控制器 SQLite、任务凭证密钥；所有父/子连接保持一致 |

状态目录建议放在工作区内且不提交版本库。本仓库已忽略 `.dsh-ohos/`；外部项目需要添加对应忽略规则。需求产物可以放在 `<工作区>/requirements/feature-001/`，每个需求 run 使用自己的 `docs_root`。

**Windows、WSL、容器或远程开发机要使用各自实际可访问的路径。**例如在 WSL 中执行任务，应使用 Linux Node、Python 和 `/home/...` 或 `/mnt/...` 路径，并在同一执行环境中生成配置。Windows 示例用于配置本地宿主，不代表 Windows 已具备 OHOS 编译能力。当前导出器不提供跨机器路径转换或远程 MCP 服务部署。

### Windows PowerShell：预检并导出

替换下面的仓库、工作区和 Python 路径。`DshHostKind` 可选 `codex`、`claude-code`、`cursor`、`trae`。

```powershell
$DshRepo = 'D:\AI\AI-AR-workflow'
$DshWork = 'D:\work\openharmony'
$DshPython = 'C:\Python312\python.exe' # 替换为本机真实解释器路径
$DshNode = (Get-Command node -ErrorAction Stop).Source
$DshHostKind = 'codex'
$DshState = Join-Path $DshWork '.dsh-ohos\state'
$DshExport = Join-Path $DshWork ".dsh-ohos\bundles\$DshHostKind"

if (-not (Test-Path -LiteralPath $DshWork -PathType Container)) {
  throw '请先设置已存在的任务工作区'
}
if (-not (Test-Path -LiteralPath $DshPython -PathType Leaf)) {
  throw '请设置真实 Python 解释器路径'
}

& $DshNode --input-type=module -e 'import { DatabaseSync } from "node:sqlite"; const db = new DatabaseSync(":memory:"); db.close(); console.log(process.version);'
if ($LASTEXITCODE -ne 0) { throw 'Node/SQLite 预检失败' }
& $DshPython --version
if ($LASTEXITCODE -ne 0) { throw 'Python 预检失败' }

$env:OHOS_REQ_SKILLS_DIR = Join-Path $DshRepo 'skills'
& $DshPython (Join-Path $DshRepo 'skills\ohos-req-intake-orchestration\scripts\install_related_skills.py') --check
if ($LASTEXITCODE -ne 0) { throw '需求 skill 依赖预检失败，请先修复输出中列出的缺项' }

& $DshNode (Join-Path $DshRepo 'runtime\dsh-ohos\src\hosts\export-cli.js') `
  --host $DshHostKind `
  --workspace-root $DshWork `
  --data-root $DshState `
  --node-command $DshNode `
  --python-command $DshPython `
  --delivery-scripts-root (Join-Path $DshRepo 'skills\ohos-ar-dev-phases\scripts') `
  --requirement-skills-root (Join-Path $DshRepo 'skills') `
  --output-root $DshExport
if ($LASTEXITCODE -ne 0) { throw '宿主配置导出失败' }
```

若只使用 AR，可跳过需求 skill 预检；AR 环境仍由自身初始化和 P0 校验。导出器只生成文件，不安装依赖、不验证构建环境，也不启动 workflow。

### Linux / macOS / WSL：预检并导出

以下示例在 Bash 中运行，路径需替换成当前环境的实际路径。

```bash
set -e
DSH_REPO='/home/me/AI-AR-workflow'
DSH_WORK='/home/me/openharmony'
DSH_NODE="$(command -v node)"
DSH_PYTHON="$(command -v python3)"
DSH_HOST_KIND='claude-code'
DSH_STATE="$DSH_WORK/.dsh-ohos/state"
DSH_EXPORT="$DSH_WORK/.dsh-ohos/bundles/$DSH_HOST_KIND"

test -d "$DSH_WORK"
"$DSH_NODE" --input-type=module -e 'import { DatabaseSync } from "node:sqlite"; const db = new DatabaseSync(":memory:"); db.close(); console.log(process.version);'
"$DSH_PYTHON" --version
OHOS_REQ_SKILLS_DIR="$DSH_REPO/skills" "$DSH_PYTHON" \
  "$DSH_REPO/skills/ohos-req-intake-orchestration/scripts/install_related_skills.py" --check

"$DSH_NODE" "$DSH_REPO/runtime/dsh-ohos/src/hosts/export-cli.js" \
  --host "$DSH_HOST_KIND" \
  --workspace-root "$DSH_WORK" \
  --data-root "$DSH_STATE" \
  --node-command "$DSH_NODE" \
  --python-command "$DSH_PYTHON" \
  --delivery-scripts-root "$DSH_REPO/skills/ohos-ar-dev-phases/scripts" \
  --requirement-skills-root "$DSH_REPO/skills" \
  --output-root "$DSH_EXPORT"
```

成功输出包含 `status: exported`、实际文件路径和 `warnings`。如遇 `export_conflict`，改用新的导出目录比较差异；`--force` 会覆盖目标文件，仅在确认覆盖内容后使用。

## 3. 把生成文件接入宿主

下表路径相对于 **导出目录**。安装时，以你在宿主中打开的 **工作区目录** 为目标，保留对应的隐藏目录结构。

| 宿主 | Subagent 文件 | MCP 需要如何接入 |
|---|---|---|
| Codex | `.codex/agents/ohos-requirement.toml`、`ohos-delivery.toml` | 将 `.codex/ohos-parent-mcp.snippet.toml` 合并到工作区 `.codex/config.toml`；worker 已写在各 agent 文件中 |
| Claude Code | `.claude/agents/ohos-requirement.md`、`ohos-delivery.md` | 将 `.claude/ohos-parent-mcp.fragment.json` 的 `mcpServers.ohos_parent` 合并到工作区 `.mcp.json`；worker 已内联 |
| Cursor | `.cursor/agents/ohos-requirement.md`、`ohos-delivery.md` | 将 `.cursor/mcp.json` 中两个 server 合并到工作区同名文件 |
| Trae IDE | `.trae/agents/ohos-requirement.md`、`ohos-delivery.md` | 将 `.trae/mcp.json` 中两个 server 合并到工作区同名文件，并启用项目 MCP |

每个导出目录还包含：

- `ohos-requirement-parent.md`：父 agent 的需求调度协议。
- `ohos-delivery-parent.md`：父 agent 的 AR 调度协议。
- `ohos-host-bundle.json`：本次导出的路径、文件清单和适配限制。

这三个文件可以保留在导出目录；启动任务时让父 agent 按绝对路径读取。它们不会仅因存在就自动成为宿主指令。

首次安装可以复制不存在的文件。已有配置时，只合并 `ohos_parent` / `ohos_worker` 对应条目，保留其他服务和设置；不要把整个导出目录覆盖到项目根目录。`*.snippet.toml`、`*.fragment.json` 是待合并材料，宿主不会自动加载它们。

### 3.1 Codex

1. 复制两个 TOML 文件到工作区 `.codex/agents/`。
2. 合并父 MCP snippet 到工作区 `.codex/config.toml`。也可使用用户配置，但示例中的路径绑定了当前项目，项目配置更方便区分。
3. 在 Codex 中打开该工作区，按客户端提示加载/信任项目配置，重新开始会话或重载 MCP。
4. CLI 中可以运行 `codex mcp list` 检查配置，交互会话用 `/mcp` 查看连接。父会话应能看到 `ohos_parent`；worker 连接需要在实际子会话中检查。
5. 使用第 5 节提示词，明确要求父 agent 调用 `ohos-requirement` 或 `ohos-delivery` 原生 subagent。

生成文件省略 `model` 和 `model_reasoning_effort`。若要沿用父模型，检查项目 `[agents]` 默认值及派发参数是否另有覆盖。自定义 agent 的 TOML 目录和内联 MCP 配置见 [Codex Subagents 官方文档](https://learn.chatgpt.com/docs/agent-configuration/subagents)；MCP 配置与诊断见 [Codex MCP 官方文档](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)。

如果生成文件未被当前客户端识别，先检查该版本的自定义 agent 支持和加载日志；只把内容复制到普通对话里，不能算原生 subagent 接入成功。

### 3.2 Claude Code

1. 复制两个 Markdown 文件到工作区 `.claude/agents/`。
2. 合并父 MCP fragment 到工作区 `.mcp.json`；根对象保留 `mcpServers`，将 `ohos_parent` 放在它下面。
3. 在该项目中启动 Claude Code，完成项目配置所需的信任操作。使用 `/agents` 检查两个定义，使用 `/mcp` 检查父连接；手动新增文件后可重启会话确保加载。
4. 子 agent 启动后，检查其内联 `ohos_worker` 可用，再执行第 5 节流程。

导出文件使用 `model: inherit` 和项目 agent 内联 `mcpServers`。这里采用项目 subagent 文件形式；不要直接当成 Claude 插件包安装。官方对项目 subagent 与插件 subagent 的 MCP 字段支持有区别。[Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)、[Claude Code MCP](https://code.claude.com/docs/en/mcp)

### 3.3 Cursor

1. 复制两个 Markdown 文件到工作区 `.cursor/agents/`。
2. 合并 `.cursor/mcp.json`，保留 `ohos_parent` 和 `ohos_worker` 两个不同名称、不同 principal 的服务。
3. 在该项目的本地 Agent 会话中启用并检查 MCP，重新加载会话后执行第 4 节连接验收。
4. 按第 5 节提示词，从父会话派发指定名称的 subagent。

导出文件使用 `model: inherit`。Cursor 本地 subagent 会继承父会话工具，因此它可能同时看到 parent 和 worker 服务；本项目的父子职责在这个宿主上不能当作严格的工具隔离。模型继承还可能受套餐和组织策略影响。[Cursor Subagents 官方文档](https://cursor.com/docs/subagents)

本文配置面向本地会话。Cursor 云端任务使用云端环境及其 MCP 配置，不能直接使用本机 `D:/.../stdio.js`；本仓库当前没有生成云端部署方案。

### 3.4 Trae IDE

1. 复制两个 Markdown 文件到工作区 `.trae/agents/`，保持 UTF-8、无 BOM。
2. 合并 `.trae/mcp.json`。在当前版本的 MCP 设置中启用项目配置，并确认 `ohos_parent`、`ohos_worker` 服务名称与 agent 文件一致；若通过界面添加，逐项复制生成 JSON 的 `command`、`args`、`env`。
3. 若未发现文件定义的 subagent，检查“设置 → Beta → Subagents → 启用 Subagents 目录”。该功能在部分版本中已默认开启。
4. 使用内置 **Agent** 作为父 agent，按第 5 节提示词调用两个 subagent。

导出文件省略 `model`，并通过 `tools` 与 `mcpServers` 限定 worker 工具。官方说明未指定模型时使用父 Agent 当前所选模型；文件目录、开关和调用限制见 [Trae 子智能体官方文档](https://docs.trae.cn/ide_subagents)。MCP 接入入口见 [Trae MCP 官方文档](https://docs.trae.cn/ide_model-context-protocol)。不同地区和版本以客户端实际设置为准。

**Trae CLI 补充：**导出器同时生成 `.traecli/agents/*.md` 和 `.traecli/ohos-mcp.snippet.toml`，当前模板目标是将后者合并到 `~/.trae/traecli.toml`。这条 CLI 路径尚未实机验收，也没有在本次核对中完成其版本配置路径确认；先对照已安装 CLI 的文档确认目录和格式，再安装并进行第 4 节验收。不要把 IDE 接入结果直接当成 CLI 接入结果。

## 4. 首次连接验收与宿主注册

先验证连接，再启动真实业务。可以向父 agent 发送下面的提示词，将路径换成实际值：

```text
请检查本项目 OHOS workflow subagent 的接入：
1. 读取 D:/work/openharmony/.dsh-ohos/bundles/codex/ohos-host-bundle.json。
2. 检查 ohos_parent 的工具发现结果，确认能看到 ohos_host_register、
   ohos_requirement_start、ohos_delivery_start。
3. 分别启动 ohos-requirement 和 ohos-delivery 原生 subagent 做连接探测。
   这次没有业务 run；只检查 worker 工具可见性和所需文件可读性，不领取业务任务。
4. 在 .dsh-ohos/probe/ 下创建并读取一个小型探测文件，确认工作区写入能力。
5. 记录真实宿主版本、子会话身份及是否独立上下文；无法观测的能力如实标记。
6. 返回检查结果和缺项，不启动需求或 AR pipeline。
```

**探测不会自动完成注册。**父 agent 需要调用 `ohos_host_register` 保存实际探测结果。下面是“已验证 MCP、原生 subagent 和工作区写入”的注册示例，尚未验证的能力为 `false`：

```json
{
  "binding_id": "codex-local-01",
  "host_kind": "codex",
  "execution_mode": "host_native",
  "capabilities": {
    "mcp_tools": true,
    "native_subagent": true,
    "workspace_write": true,
    "isolated_context": false,
    "build_execution": false,
    "device_access": false,
    "network_publish": false
  },
  "capability_source": "local-probe:20260906-01",
  "idempotency_key": "codex-local-01-register-1"
}
```

`capability_source` 填实际探测记录的标识，建议将过程保存到 `.dsh-ohos/probe/`。`binding_id` 由父 agent 为本次宿主环境命名；换宿主使用新的 binding。控制器保存声明，不替宿主探测，不能照抄未验证的 `true`。

| 到达阶段 | 还需要验证并注册的能力 |
|---|---|
| 需求 R5 | `isolated_context`；审阅子会话必须独立于文档作者上下文 |
| AR P4、P5 | `build_execution` |
| AR P6 | `device_access` |
| AR P7 | `build_execution`、`device_access` |
| AR P8 | `network_publish`；仅代表有访问能力，不代替发布确认 |

能力变化后，使用同一个 `binding_id`、完整更新后的能力对象和新的幂等键重新注册。能力对象会整体替换，更新时不要漏掉之前仍有效的能力。`ohos_host_capabilities` 可以读取注册结果。

父连接提供业务操作；worker 连接应提供 `ohos_task_claim/context/heartbeat/submit/release`。如果 worker 看不到领取工具，检查它是否误连 `OHOS_DSH_PRINCIPAL=parent`。开发默认值 `all` 不作为正式父子配置使用。

## 5. 开始使用两个 workflow

下面的提示词发送给 **宿主父 agent**，其中路径、输入及运行标识应替换成实际值。MCP 工具在不同产品中可能有服务名前缀；以下使用仓库定义的原始工具名，JSON 是工具参数，不是终端命令。

### 5.1 从原始需求生成 AR

先准备一个实际存在、非空的 UTF-8 原始需求文件，例如 `D:/work/openharmony/requirements/raw-request.md`。选用尚未绑定其他 run 的文档目录。

```text
请作为父 agent，使用 ohos-requirement 原生 subagent 执行需求分析 R1–R9。
读取父协议：D:/work/openharmony/.dsh-ohos/bundles/codex/ohos-requirement-parent.md。
原始需求：D:/work/openharmony/requirements/raw-request.md。
产物目录：D:/work/openharmony/requirements/feature-001。
宿主绑定：codex-local-01，开始前检查其实际能力。

先调用 ohos_requirement_start。每次 dispatch_needed 派发一个阶段任务；
将真实 run_id、role、expected_revision、host_binding_id 和子会话 context_id 传入。
使用宿主当前模型，不另设模型服务。子任务提交后，由你调用 ohos_requirement_validate。
遇到 needs_input 展示对应材料并收集我的实际决定；已有明确决定可据实记录。
R5 使用独立于文档作者的新审阅上下文。无法提供真实会话身份时报告能力缺项。
持续推进到下一人工等待点或完成，保留 run_id、阶段及阻塞原因。
完成后展示 AR.md 及交接材料；本次范围仅为需求分析。
```

对应的启动工具是 `ohos_requirement_start`：

```json
{
  "run_id": "req-feature-001",
  "input_ref": "D:/work/openharmony/requirements/raw-request.md",
  "docs_root": "D:/work/openharmony/requirements/feature-001",
  "idempotency_key": "req-feature-001-start"
}
```

也可同时传 `input_text`：这时 `input_ref` 是来源标签，文本保存为该文档目录内的 `source-requirement.md`。仅传文件路径时，文件必须真实可读。

需求流程会等待澄清、补充材料、方案选择、拆分确认、评审纪要和各 proposal 的 GA 证据。父 agent 把真实回复保存为独立 UTF-8 文件，再用 `ohos_requirement_decide` 绑定当前 `snapshot_digest`；不能依据候选文件的 `Accepted` 字样推断用户已同意。

每个 worker 应先读取控制器返回的 `requirement.contract_path` 和 `skill_paths`，按原 skill 生成产物，并提交 `requirement.manifest_path`。manifest 位于 `<docs_root>/_dsh/`，用户无需手动编写。完整字段以本仓库 `runtime/dsh-ohos/docs/requirement/contract.md` 为准，导出的父协议包含其绝对路径。

### 5.2 从 AR 开始开发

准备 `AR.md` 和实际构建参数。以下示例沿用 Windows 配置路径；若执行机是 Linux/WSL，请替换全部路径，宿主工作区也应位于该环境。

```text
请作为父 agent，使用 ohos-delivery 原生 subagent 执行 AR 开发 workflow。
读取父协议：D:/work/openharmony/.dsh-ohos/bundles/codex/ohos-delivery-parent.md。
AR：D:/work/openharmony/requirements/feature-001/AR.md。
源码根目录：D:/work/openharmony；environment=openharmony。
组件 Git 目录、build_target、part 和设备参数请从本项目实际配置核实。
宿主绑定：codex-local-01，按阶段核实构建、设备及发布访问能力。

调用 ohos_delivery_start 后，每次只派发当前 role/revision 的阶段任务。
使用宿主当前模型；worker 按现有 skill 和 Python gate 生成真实证据。
提交后由你调用 ohos_delivery_validate，遇到需要修复时按返回的新 revision 继续。
在 P1、P6、P7 和 P8 的确认点展示材料并据实记录我的决定。
P8 先完成预检，获得对应发布授权后才进入发布任务。
中断后通过 ohos_delivery_sync 恢复。每次汇报 run_id、pipeline_dir、当前阶段和阻塞原因。
```

下面是 `ohos_delivery_start` 的参数形状；`base/example/component`、`component_package`、`component_part` 是示例占位值，执行前必须换成真实组件参数：

```json
{
  "run_id": "delivery-feature-001",
  "input_ref": "D:/work/openharmony/requirements/feature-001/AR.md",
  "ar_path": "D:/work/openharmony/requirements/feature-001/AR.md",
  "repo_root": "D:/work/openharmony",
  "environment": "openharmony",
  "component_type": "system",
  "git_dir": "base/example/component",
  "build_target": "component_package",
  "part": "component_part",
  "idempotency_key": "delivery-feature-001-start"
}
```

按需补充 `device_serial`、`device_type`、`base_commit`。`environment` 仅接受 `openharmony` 或 `harmonyos`。不要为了跳过参数核实而默认添加 `confirm_defaults: true`。

工具中的可选 `model` 用于向原 Python 流程传递记录信息，不负责选择宿主推理模型。worker 的门禁与输出要求取自 `ohos_task_context`；完整父调用契约在 `runtime/dsh-ohos/docs/ar-delivery/contract.md`。

若已有原 Python pipeline，使用其真实 `pipeline_dir` 连接现有进度：

```json
{
  "input_ref": "existing-ar-pipeline",
  "pipeline_dir": "D:/work/openharmony/specs/pipeline/existing-run",
  "idempotency_key": "existing-ar-pipeline-attach-1"
}
```

此时 pipeline 中须已有可读取的 `ar.md`，否则补充 `ar_path`。如果已经存在 DSH delivery run，则优先使用它的 `run_id` 调用 sync，不重新 attach 或 start 创建另一份调度记录。

### 5.3 父子 agent 如何继续执行

两条业务共用下面的任务生命周期，业务校验工具各自独立：

| 时机 | 负责者 | 操作 |
|---|---|---|
| 返回 `dispatch_needed` | 父 agent | 启动对应原生 subagent，传入返回的 run、角色、revision、绑定及新的操作幂等键 |
| 开始执行 | worker | `ohos_task_claim` → `ohos_task_context`，领取成功后再进行任务读写 |
| 执行较久 | worker | 租约到期前调用 `ohos_task_heartbeat`；收到取消或丢失租约后停止 |
| 候选产物完成 | worker | `ohos_task_submit`；只进入 `validating`，不代表 PASS |
| 验证候选 | 父 agent | 按业务调用 `ohos_requirement_validate` 或 `ohos_delivery_validate` |
| 等待实际决定 | 父 agent | 需求用 `ohos_requirement_decide`；AR 用 `ohos_delivery_consent` |
| 无法完成 | worker | 返回原因，并用 `ohos_task_release` 列出全部部分产物 |

`role` 是阶段角色，例如 `requirement-analyst`、`build-runner`；它不是另一个需要安装的 agent。两份 agent 定义分别承接各自所有阶段。

任务 ID、revision、租约 epoch 和凭证均使用实际返回值，不自行拼接。需求 `context_id` 必须来自真实子会话身份，可稳定编码为合法 ID；给同一上下文换一个随机名称不构成独立审阅。若创建子会话后才能获得 ID，父 agent 先创建并让它等待，再把真实 ID 和任务信息传入。

AR 确认使用 `run_id/task_id/phase/token/idempotency_key`；`phase` 为数字。`token` 必须来自该阶段原 Python 人工确认协议，不是 `task_credential`，也不能假定 `needs_input` 一定返回可直接使用的 token。父 agent 应读取当前 pipeline 的确认要求并据实执行。

## 6. 恢复、切换宿主和修改需求

### 中断后继续

保留 run ID，并在原状态目录中恢复。下面分别是两个 sync 工具的参数：

`ohos_requirement_sync`：

```json
{
  "run_id": "req-feature-001",
  "idempotency_key": "req-feature-001-sync-2"
}
```

`ohos_delivery_sync`：

```json
{
  "run_id": "delivery-feature-001",
  "idempotency_key": "delivery-feature-001-sync-2"
}
```

查询状态也可调用 `ohos_run_status`，它提供持久化状态和事件；需要核实外部文件或 Python 变化并继续路由时使用业务 sync。

每个新操作使用新幂等键；网络或工具超时后，重试同一次操作复用原键和原参数。复用旧键得到的是历史回执，不能当成最新状态查询。

### 从一个宿主切到另一个宿主

例如从 Codex 切到 Claude Code，先以同机、同路径接续为试点范围：

1. 在旧宿主停止活动子任务及其实际构建/终端进程，记录部分产物并释放租约。租约失效不等于操作系统进程已停止。
2. 为新宿主导出并安装配置，保持相同的工作区、`OHOS_DSH_DATA_ROOT`、文档目录和 pipeline 绝对路径。
3. 新父 agent 读取对应父协议，探测并注册新的 `host_binding_id`。
4. 使用原 `run_id` 调用业务 sync，处理返回的等待、验证或协调状态。
5. 为下一阶段创建新子会话，重新领取并使用新凭证。旧 attempt 凭证不传给新宿主。

这是协议支持的接续方式，四宿主交叉接续尚未实机验收。跨机器迁移另外涉及 SQLite 一致性备份、凭证密钥、证据文件和绝对路径，不支持仅复制一个数据库文件或聊天记录就恢复。

### 修改需求或处理未完成任务

需求变更通过 `ohos_requirement_reset` 指定已经到达的最低受影响阶段、当前 revision 和原因。原始需求文件变化需显式 reset 到 R1；上游基线修改会使受影响的下游证据与人工确认失效。

遇到 `needs_reconcile`，先核实旧写入者停止并检查部分产物。需求与 AR 的过期租约都会隔离任务，防止自动出现第二个写入者。AR 原 worker 停止并回收构建/设备子进程后，可用原凭证 release；部分产物由 parent sync 对账。进程状态未知时继续隔离，不直接重派。融合能力的边界见[实施状态](/reference/dsh-fusion-implementation-status)。

AR 若使用原 `advance.py reset` 回退，完成后调用 `ohos_delivery_sync` 对齐控制器；不要手改 `pipeline.json`、签名证据或 SQLite 状态。

## 7. 常见问题

| 现象 | 检查与处理 |
|---|---|
| 文件生成了，agent 没出现 | 是否只留在导出目录？复制到当前工作区对应的 agents 目录，核对名称、格式和功能开关后重载 |
| agent 出现了，但没有业务工具 | 父 MCP snippet/fragment 是否真正合并？检查 MCP 连接日志和 `command/args` 的绝对路径 |
| worker 无法领取任务 | 检查 `worker` principal、实际宿主绑定和当前 `role/revision`；父连接没有领取工具 |
| `host_not_found` / 能力不足 | 先探测、注册或刷新绑定；未具备构建、设备、隔离等能力时保留阻塞 |
| 父子看到的 run 不一致 | 对照所有连接的 `OHOS_DSH_DATA_ROOT`；相对路径和不同工作目录可能创建不同数据库 |
| `node:sqlite` 不可用 | 检查 MCP 实际使用的 Node 路径和版本，不只检查终端 PATH；使用 Node 24+ |
| Python 启动失败 / `requirement_preflight_failed` | 检查 `OHOS_DSH_PYTHON` 的实际路径、`OHOS_REQ_SKILLS_DIR` 和预检缺项 |
| skill 无法读取或不能执行命令 | MCP 的 env 不会自动赋给 worker 的所有终端；在任务终端按实际路径设置 Python/skills，并检查文件和执行权限 |
| `docs_root_in_use` | 同目录已有需求 run；使用原 run sync/reset，另一个需求应使用新目录 |
| R5 被拒绝 | 检查 `isolated_context` 能力及真实 `context_id`；不能复用作者上下文冒充新审阅 |
| 提交后一直 `validating` | 父 agent 还需调用对应业务 validate；让它读取父协议并继续 |
| `needs_input` | 展示该阶段材料并记录真实决定；它是流程等待点，不是服务故障 |
| revision、凭证或租约过期 | 停止旧执行，sync 获取当前状态，再按返回值领取；不要强行重放旧提交 |
| `needs_reconcile` | 检查实际旧进程和部分产物，释放或回退后再派发，不直接并发启动第二个 worker |
| Python 调用超时 / `external_state_unknown` | 先检查外部进程并 sync，确认操作结果后再处理，避免重复执行发布等动作 |
| subagent 使用了不同模型 | 检查模型覆盖、父派发参数及宿主套餐策略；以实际运行记录为准 |
| 手动启动 stdio 后没有网页 | 正常；它通过标准输入输出服务于 MCP 客户端，没有浏览器 UI，正常由宿主启动 |

原始 skill 依赖仍是本仓库 `skills/`。配置生成器没有把全部 skill 安装到每个宿主的原生技能目录；worker 应读取阶段引用的文件并遵循其指令。若某技能依赖宿主专有工具，应先完成对应接入，不能把缺失能力当作已执行。

## 8. 如何确认“已经能用”

按层记录验收结果，不把上一层成功代替下一层：

| 层次 | 成功标准 |
|---|---|
| 配置导出 | 生成目标宿主文件，路径、模型策略、父子 principal 正确 |
| 宿主接入 | 父 MCP 实际连接、原生子会话实际出现、worker 实际能发现工具和读取 skill |
| 最小需求闭环 | 真实模型完成 R1，submit 后父 validate 进入澄清确认，实际确认后继续到材料等待点 |
| 最小 AR 闭环 | 在真实环境完成初始化及 P0，证据验证通过后进入 P1 |
| 业务全流程 | 真实 R1–R9 或 P0–P8 跑通，人工记录、评审、构建/设备结果均可核对 |
| 恢复与模型验证 | 实际中断恢复或换宿主成功，并记录可观测的模型与用量信息 |

接入维护者可以在 `runtime/dsh-ohos/` 运行以下局部测试，检查四宿主配置导出与 Node stdio 协议；它们不启动真实模型或 OHOS 构建：

```bash
node --test test/hosts/render.test.js test/core/stdio.test.js
```

本指南走本地 MCP 路径。若还需要验收 **DeepSeek Harness 本体**，应另行完成 profile 安装、插件启动/关闭和工具兼容性检查；当前入口位于 `runtime/dsh-ohos/src/dsh/plugin.js`，配置在 `runtime/dsh-ohos/cordis.patch.yml`。运行本地 MCP 不等于完成了该项验收。

2026-09-06 文档核验：PowerShell 示例替换为本机真实路径后，成功导出四宿主配置，生成的 JSON/TOML 均通过解析；上面的 8 项局部测试通过。未安装到实际宿主，未执行业务 workflow；Bash 示例未在 Linux/WSL 环境实跑。提交前已修复设计文档的跨目录链接，文档站构建通过。
