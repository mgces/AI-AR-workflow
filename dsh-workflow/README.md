# AI-AR DSH Workflow

本目录是与原有实现隔离的 DSH 自适应 workflow 试验实现。它不会复制或修改现有
`skills/ohos-ar-dev-phases/scripts/advance.py`、`gate_*.py`、签名证据和 consent 规则；开发流只通过
子进程调用这些权威脚本。

当前状态：`0.1.0` 本地可运行版。官方 Web 面板和本地 scheduler 已接入真实 runtime、CodeAgent 执行、产物、人工审核和 usage；生产云仍需按部署手册绑定真实 OHOS/HarmonyOS 主机、身份、对象存储和 Gateway。

官方 AR 面板还提供 RAG 模型配置入口；`ohos_rag_profile`/`ohos_rag_profile_update` 只保存 provider、模型和服务地址等非敏感配置。单机模式执行本地索引；启用 Workspace Gateway 后执行带文件元数据的远端索引，并在返回命中前回读 hash。为 RAG 服务配置 OpenAI-compatible endpoint（通过 `DSH_RAG_ENDPOINT` 或受信 patch 配置）并由宿主注入 `DSH_RAG_API_KEY` 后，索引和查询会真实调用 embedding/reranker，profile 返回 `execution=active`；没有模型服务时明确返回 `execution=planned` 并使用可观测的词法 fallback，不伪装成向量检索。API key 不会写入 profile、SQLite 或日志。远端调试面板通过 `workspace.hash` 在代码端识别二进制产物，旧 Gateway 才回退文本读取。

## 已实现

- DSH Cordis bundle：向 DSH Agent 注册 AI-AR workflow 工具。
- 标准 MCP stdio Server：Codex、Claude Code、CodeBuddy、TRAE 可复用同一个入口。
- P0–P8 控制器：读取 `status/next`、调用 allowlist gate、推进、consent、verify-all。
- R1–R9 需求 workflow 投影：状态保存在本目录 `.runtime/`，正式文档仍是业务依据。
- Module Registry：按阶段、任务标签、能力和 failure class 计算最小 Skill 依赖闭包。
- Repair Packet：标准化 gate 失败并给出修复模块、轮次策略和不可破坏约束。
- Experience Store：只采集真实 gate 执行结果，生成 staging 演进候选，不自动修改策略。

## 架构边界

```text
宿主 Agent 模型
    │
    ├─ MCP stdio ───────────────┐
    │                           ▼
    └─ DSH Cordis tools → AdaptiveWorkflowController
                                ├─ Module Resolver
                                ├─ Repair / Experience
                                ├─ Requirement R1-R9 projection
                                └─ AuthorityAdapter
                                      │
                                      ▼
                              原有 advance.py + gate_*.py
```

DSH/MCP 不能直接写 `pipeline.json`。任何阶段推进都必须重新通过现有签名 manifest、artifact sha256、
功能指纹和 consent 校验。

## 安装与检查

要求 Node.js 22.19+：

```bash
cd dsh-workflow
npm install
npm run check
npm test
```

## CLI 试用

模块解析不需要已有 pipeline：

```bash
node bin/ai-ar-dsh.js modules \
  --workflow development --phase P2 --tags sa,cpp,ipc
```

读取现有 run：

```bash
node bin/ai-ar-dsh.js dev-status --pipeline-dir /abs/path/specs/pipeline/<run>
node bin/ai-ar-dsh.js dev-next \
  --pipeline-dir /abs/path/specs/pipeline/<run> --tags sa,cpp
```

运行 gate：

```bash
node bin/ai-ar-dsh.js dev-gate \
  --pipeline-dir /abs/path/specs/pipeline/<run> \
  --gate gate_build.py
```

gate 失败时返回 `repairPacket`；控制器不会自行把失败改成 PASS。

P8 真正 push 时还必须显式传入 `allowIrreversible=true`，且原有 gate 仍会重新校验绑定当前预检证据的
P8 consent。`gateArgs` 不能覆盖 controller 已验证的 `pipelineDir`。

需求 workflow：

```bash
node bin/ai-ar-dsh.js req-start \
  --run-id rr-example --docs-dir /abs/path/docs/features/rr-example
node bin/ai-ar-dsh.js req-next --run-id rr-example
```

阶段提交使用 JSON 文件，必须提供当前阶段、证据和所需人工确认：

```json
{
  "stage": "R1",
  "expectedRevision": 1,
  "humanApproval": { "approved": true, "actor": "reviewer" },
  "evidence": []
}
```

```bash
node bin/ai-ar-dsh.js req-submit \
  --run-id rr-example --submission /abs/path/r1-submission.json
```

## 作为 MCP Server

入口：

```bash
AI_AR_WORKSPACE=/abs/path/AI-AR-workflow \
node /abs/path/AI-AR-workflow/dsh-workflow/src/mcp/server.js
```

客户端配置见 [`examples/mcp-config.json`](examples/mcp-config.json) 和
[`examples/codex-config.toml`](examples/codex-config.toml)。必须把占位路径替换为绝对路径。

主要工具：

| 工具 | 作用 |
|---|---|
| `ar_dev_status` | 读取权威 P0–P8 状态 |
| `ar_dev_next` | 下一动作 + 按需模块 |
| `ar_dev_gate` | 调真实 gate；失败返回 repair packet |
| `ar_dev_advance` | 通过 `advance.py` 推进 |
| `ar_dev_consent` | 记录明确人工批准 |
| `ar_dev_verify` | 恢复前执行 verify-all |
| `ar_requirement_*` | R1–R9 需求控制器 |
| `ar_module_resolve` | 独立解析模块闭包 |
| `ar_evolution_proposals` | 从真实 gate 轨迹生成 staging 提案 |

## 作为 DSH Bundle

已安装 DSH CLI 后，在仓库父目录执行：

```bash
dsh plugin --profile ai-ar add ./dsh-workflow
AI_AR_WORKSPACE=/abs/path/AI-AR-workflow dsh --profile ai-ar
```

验证配置层：

```bash
dsh --profile ai-ar --dump-config
```

`cordis.patch.yml` 会加载 `@ai-ar/dsh-workflow` 插件，插件向 `ctx.tools` 注册与 MCP 入口相同的控制工具。

将 `cordis.patch.yml` 作为官方 `dsh --profile web --patch ...` 的最后一层加载时，设置
`enableDeliveryRuntime: true` 会额外注册 `ohos_delivery_*`、`ohos_task_*` 和
`ohos_run_observability/events/artifacts` 工具。这样官方 Web UI 的 Session、Tool card 和
Approval 展示直接承载 AR workflow；P0–P8 的 PASS 仍由本仓 runtime 调用 Python authority 决定。

同一 patch 还加载 `src/dsh/client.js` 官方客户端扩展：左侧会出现 **AR Delivery** 主面板，
面板内提供 OpenHarmony/HarmonyOS 启动、阶段耗时、人工审核、阻塞原因、事件和哈希产物展示。
面板调用官方 DSH Web Server 的 `/api/ohos-ar/*` 认证路由，因此用户只需要一个 DSH 页面；
`platform/apps/local-console` 仅作为自动化测试面，不是第二个用户入口。

官方 AR 面板还会在启动区展示 `/api/ohos-ar/preflight` 前置检查：它列出代码工作区是否可达可写、
Python/Git/gate、选中的 CodeAgent、环境 profile digest、设备通道和 P8 发布目标，并明确标记
Agent 的加载方式（DSH provider、本机 CLI 或 Gateway profile）及执行主机。`ready_for_p0` 只说明
可以派发 P0；环境/设备/发布检查为 `pending` 时不会报告 `ready_for_p8`。

计算云 DSH 使用 SSH 代码端时，应登记 `workspaceGateway.profiles` 和六个
`workspaceGateway.deliveryProfiles`，让 CodeAgent 与 Python gate 在同一 `remoteRoot` 执行。
本地 CLI 不能直接把未挂载的 SSH 路径作为 cwd。当前可选 SSHFS 挂载模式，也可在不安装 SSHFS 时
使用 Connector 的 remote-tools MCP：CLI 在一次性本地 sandbox 运行，通过受限工具读写 SSH 工作区；
页面会显示 `connector_sshfs_mount` 或 `connector_remote_tools_mcp`。大仓编译和断线恢复的成本仍需按
实际仓库实测，远端 profile 适合希望 Agent 与 gate 完全在代码主机运行的部署。

本地 patch 同时关闭只针对 DeepSeek API 的首次使用 onboarding，并挂载官方
`@deepseek-ai/dsh-subagent-claude-code`。`dsh-workflow/config/presets/claude-code/`
是默认 Agent Preset，开启 `subagent_claude_code`，让同一个 DSH Session 可以把一次性代码任务交给
WSL 工作区中的 Claude Code；Claude 认证仍使用 Claude Code 原生设置或 provider 显式环境变量。

官方 AR 面板中的 **CodeAgent 设置**支持在 Claude Code、OpenCode、Codex CLI、Cursor Agent、Trae CLI
和自定义命令之间选择。选择保存在 DSH runtime 数据目录的 `codeagent-settings.json`，新建 run 会把
选择的 `agent` 和可选 `model` 写入权威 SQLite 状态；每个 run 详情和列表都会显示启动时的 Agent。
OpenCode 等非官方 provider 会先探测 WSL CLI 是否存在；自定义命令只保存配置，不会在探测阶段执行。
面板中的“刷新本地 Agent”会重新执行受限的 `--version` 探测，并返回命令名、解析路径、版本和失败原因。
当前 DSH 官方 provider 直接可执行 Claude Code；OpenCode 和 Codex CLI 在本机探测成功时可由内置非交互 adapter 派发。自定义命令使用受限 `argv-cli` adapter，本机可直接执行，远端需登记 `codeagent.custom` profile。部署 `workspaceGateway` 并登记 `codeagent.claude`/`codeagent.opencode`/`codeagent.codex` profile 后，Claude Code、OpenCode 和 Codex 也可通过受限 SSH Gateway 派发；未登记 `codeagent.claude` 时 Claude 继续使用官方 DSH provider。同时登记 `debug.device_probe` 后，官方页面可扫描远端产物并探测 hdc 设备。Cursor、Trae 和没有受支持协议的命令仍会被 adapter 门控拒绝。

如果 DSH 配有模型 Provider，可将 [`examples/dsh-repair-workflow.js`](examples/dsh-repair-workflow.js)
作为动态 workflow script 的参考。DSH 当前的 workflow 是模型提交的脚本，并不是稳定的“保存 workflow”接口，
因此该文件仅是脚本模板。

## 宿主驱动与 DSH 模型模式

默认采用宿主驱动：

```text
Codex/Claude/CodeBuddy/TRAE
  → ar_dev_next
  → 执行任务
  → ar_dev_gate
  → repairPacket
  → 修复并重跑 gate
```

这种模式不要求 DSH 自带模型。DSH 负责按需模块、状态投影、失败分类和经验记录。

DSH 配置独立模型 Provider 后才可以用 `agent()` / `parallel()` / `pipeline()` 驱动子 Agent；这些模型请求
不等同于复用 Codex 当前会话模型。MCP Sampling 只能作为客户端明确支持时的可选 Provider，不能成为公共基础。

## 自进化规则

Experience Store 只接受 `ar_dev_gate` 实际调用产生的 PASS/FAIL，不接受 Agent 自报完成。当前演进能力仅生成：

- 阶段、gate、failure class 聚类；
- 实际使用模块频率；
- 失败率和候选路由建议；
- staging 状态与人工晋级要求。

它不会自动修改：

- `config/modules.json`；
- repair strategy；
- 原有 Skill；
- `advance.py`、`gate_*.py`；
- consent 或签名规则。

## 目录隔离

- 所有新增源码均位于 `dsh-workflow/`。
- 默认控制状态和经验写入 `dsh-workflow/.runtime/`，已被 `.gitignore` 忽略。
- 可用 `AI_AR_DSH_STATE_DIR` 指向其他独立状态目录。
- `AI_AR_WORKSPACE` 只用于定位原有权威脚本和 Skill，controller 不会改写这些文件。

## 后续落地门

在扩大范围前至少验证：

1. 两个以上宿主可稳定调用同一 MCP Server。
2. 按需加载使上下文成本下降，且首次 gate PASS 率不低于原流程。
3. repair loop 没有越过功能指纹、人工 consent 或阶段顺序。
4. DSH session/experience 提供了现有 run 目录之外的实际价值。

若无法证明以上收益，应保留 MCP facade，停止继续扩大 DSH 适配。
