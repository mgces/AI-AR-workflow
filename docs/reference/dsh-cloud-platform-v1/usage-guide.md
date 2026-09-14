# DSH 云端 Agent 编排平台使用手册

版本：1.0 · 日期：2026-09-12
适用范围：官方 DSH Web 页面中的 AR Delivery Workbench、CodeAgent 选择、AR P0–P8 run 和维测查看。

这份手册面向实际使用者、测试人员和负责接入 CodeAgent 的工程师。部署步骤见 [迁移到计算云部署手册](deploy-to-compute-cloud.md)。

## 先了解当前边界

平台有两个运行形态。使用前先确认你部署的是哪一种：

| 能力 | 当前单云节点 MVP | 目标云架构 |
|---|---|---|
| DSH 页面和 AR Delivery 面板 | 可用 | 可用 |
| Claude Code | 官方 DSH provider 可直接派发 | 通过用户 Connector 在用户电脑派发 |
| OpenCode、Codex、Cursor、Trae、自定义命令 | 可发现、可保存；没有适配器时不能启动 run | 由对应本地 adapter 派发 |
| 代码位置 | 必须是 DSH 所在主机的绝对路径 | 用户 Connector 通过 SSH Workspace Gateway 访问 |
| OpenHarmony/HarmonyOS AR runtime | 由同一主机上的 Python gate/advance 执行 | 由 SSH 主机 authority 执行，云端只保存投影 |
| RAG | 本仓 local-console 有词法 fallback；不是官方 DSH 主面板 | 云 RAG worker、embedding、reranker 和引用核验 |
| 设备和产物调试 | 当前以只读识别和 artifact 展示为主 | Connector/SSH 主机完成受管传输、部署和正式证据 |

“能发现 Agent”不等于“能执行 Agent”，“能看到产物”不等于“产物已经通过 gate”。所有 P0–P8 通过和完成状态仍由对应环境的 Python authority、gate 和 `advance.py` 决定。

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

探测的是 DSH 服务用户的 PATH。单云节点模式探测云主机，目标云模式应由 Connector 在用户电脑上重新探测；不会因为 Windows 安装了某个 CLI 就自动让 WSL 或云主机看到它。

对应 API：

```http
GET  /api/ohos-ar/codeagents
POST /api/ohos-ar/codeagents/refresh
```

### 2.2 选择和保存

下拉框目前包含：

| 选项 | 说明 |
|---|---|
| Claude Code | `@deepseek-ai/dsh-subagent-claude-code` 官方 provider；当前唯一直接派发的选项 |
| OpenCode | 探测 `opencode --version`；需 OpenCode 宿主 adapter |
| Codex CLI | 探测 `codex --version`；需 Codex 宿主 adapter |
| Cursor Agent | 探测 `cursor-agent --version`；需 Cursor 宿主 adapter |
| Trae CLI | 探测 `trae --version`；需 Trae 宿主 adapter |
| 自定义 CodeAgent | 配置自己的命令、固定参数和模型名；发现阶段不会执行命令 |

选好后点击 **保存 CodeAgent 设置**。配置保存到 DSH runtime 数据目录的 `codeagent-settings.json`，新建 run 时复制到 run 的 `agent`/`model` 字段；已创建的 run 不会被修改。

如果选择自定义 Agent，还要填写：

- 显示名称；
- 模型名（可选）；
- 命令绝对路径或服务用户 PATH 中的命令；
- 固定参数，每行一个。

自定义命令只作为配置入口。当前没有通用 CLI 协议，未挂载 adapter 时保存成功但启动 run 会返回 `codeagent_adapter_unavailable`，HTTP 状态为 422。

### 2.3 如何判断状态

页面中的“已发现（待适配器）”表示可执行文件存在、版本探测成功，但 DSH 尚不知道如何向这个 CLI 发送 AR 阶段上下文、权限请求、取消、恢复和 usage 回执。不要通过修改 JSON 或数据库把它改成可执行；应实现并加载正式 adapter。

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

## 4. 启动一个 AR run

### 4.1 用页面启动

在 **启动 AR 工作流**卡片按以下顺序填写：

1. **代码环境**：选择 OpenHarmony 或 HarmonyOS；
2. **HarmonyOS 分支**：环境为 HarmonyOS 时选择 `system` 或 `chip`；OpenHarmony 时该项禁用；
3. **AR 文件**：输入代码根下的 AR 文件路径，留空使用仓库示例；
4. **补充需求**：可直接粘贴本次需求。若同时提供 AR 文件，以文件内容为准；
5. 勾选“我确认使用 AR 示例默认组件”，确认你了解默认组件参数；
6. 点击 **启动 P0 →**。

启动按钮在没有代码根或没有勾选确认时保持禁用。服务端还会检查路径边界、AR 内容、环境值、幂等 key 和 Python 初始化结果。

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
- run 墙钟时长；
- 人工介入次数；
- token usage 状态；
- 成功次数、失败次数和事件数量。

阶段表中的字段：

| 字段 | 含义 |
|---|---|
| 阶段/角色 | 例如 `P4`、`build-engineer` |
| 状态 | task 当前状态，不等于 gate PASS 文本 |
| 耗时 | 从 task 创建到结束或当前的墙钟时间 |
| 尝试 | attempts 数量，包括重试和被替代的尝试 |
| 门控失败 | 该阶段被确定性 validation 拒绝的次数 |

### 7.3 Token 和模型用量

`token_usage.status=unknown` 或 `partial` 是真实的计量覆盖状态，不是 0。当前官方 AR runtime 尚未从所有宿主 provider 接收结构化 token usage，因此页面显示“待接入”是预期结果。只有拿到 provider/Connector 的真实 usage 回执后，才可以填 input/output token 和费用。

不要把 DSH 上下文 token、CodeAgent token、embedding token 和 reranker token 相加成一个未经来源标记的数字。目标云架构要求按执行器、模型、run、阶段和 usage 来源分账。

### 7.4 产物页签

产物页签显示当前 pipeline 下可安全展示的 `evidence/`、`reports/`、`controls/` 文件：

- 相对路径和文件角色；
- 字节数；
- sha256；
- 小文件全文；
- 大文件是否截断。

审批对象是带 hash 的不可变 artifact bundle。工作区里后来被修改的同名文件不自动替换已经审核的版本；源码变化后必须重新提交并重新 gate。

不要把页面里显示的相对路径拼成任意文件下载路径。正式云服务使用 artifact id、权限检查和短期下载 URL；路径遍历、软链接逃逸和跨租户 artifact id 都必须被拒绝。

### 7.5 事件页签

事件页签按序号展示 `run.started`、`task.claimed`、`task.submitted`、`task.validation_rejected`、`task.awaiting_consent`、`delivery.synced` 等事件及 JSON payload。

用事件判断“什么时候发生了什么”，用阶段状态判断“现在是否可操作”，用 Python gate/advance 证据判断“是否真的通过”。三者不能互相替代。

## 8. RAG 使用方式

### 8.1 当前状态

本仓 `platform/apps/local-console` 提供一个授权代码根上的本地词法 fallback，可用于开发检查和检索试用；它不是官方 DSH AR 主面板的正式云 RAG 服务。若官方页面没有知识库、索引或模型配置入口，表示云 RAG worker 尚未部署，不是浏览器故障。

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

RAG 只提供上下文线索，不能决定 OpenHarmony/HarmonyOS 分支、不能修改 gate、不能生成 consent、不能宣布 AR run 成功。详细约束见 [RAG、工程初始化与调试扩展](rag-environment-debug.md)。

## 9. SSH、产物和设备调试

### 9.1 SSH 代码操作

目标云 Connector 只能通过 Workspace Gateway 访问用户授权的 SSH workspace。安全的操作类型包括：

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

### 10.3 阶段控制

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

## 12. 典型完整操作示例

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

## 13. 安全和数据处理

- 不把 SSH 私钥、CodeAgent 登录 token、模型 API key、HMAC secret 放进 AR 输入、artifact 正文、Git 或页面截图；
- 只给 Agent 当前阶段需要的 workspace、工具和输出路径；
- 不让 worker 直接调用 parent/consent/publish 权限；
- 任何需要写源码、执行构建、访问设备或发布的动作都必须绑定 run、task、revision、lease epoch 和资源锁；
- 页面上的 artifact、事件和人工输入按租户/用户权限过滤；
- 运行未知时标记 `needs_reconcile`，不自动重试有副作用的命令；
- 关闭浏览器不会自动停止目标云架构中的 Connector/Supervisor 作业；重新打开页面后通过 cursor/reconcile 恢复视图；
- 免登录模式只适合私有网络。公网部署必须使用 OIDC/SSO、HTTPS 和租户隔离。

## 14. 故障排查

| 问题 | 处理方式 |
|---|---|
| 看不到 AR Delivery | 检查 patch、插件软链接、profile 日志和浏览器缓存 |
| 仍出现 API key onboarding | 确认加载的是包含 `ui-settings-models.disabled=true` 的最终 patch |
| CodeAgent 列表为空 | 以 DSH 服务用户执行 refresh；检查 PATH 和 `DSH_*_CLI` |
| Claude provider missing | 检查官方 Claude bundle、preset root 和 DSH 重启日志 |
| OpenCode/Codex 已发现但不能启动 | 当前缺宿主 adapter，等待适配器；这是保护性 422，不是 AR gate 失败 |
| P0 repo_root 越界 | 使用 patch 配置根下面的绝对路径；不要传 SSH URL |
| 页面显示待审核但没有产物 | 先查看 run events 和 pipeline 的 evidence/reports/controls 是否已写入，再同步 |
| consent 被拒绝 | 核对 task id、phase、revision、run 和 authority token 是否对应同一证据包 |
| token usage 是 unknown | 当前 provider 没有结构化 usage 回执；不能手工填 0 |
| 设备很多或属性 unknown | 不自动选择/部署；先完成设备选择和 profile 匹配 |
| SSH 断开后想重跑 | 先查 Supervisor/authority 是否仍有进程和锁，完成 reconcile 后再继续 |

## 15. 使用完成判定

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
