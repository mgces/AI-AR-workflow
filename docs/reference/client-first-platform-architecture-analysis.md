# DSH 平台客户端化与框架价值分析

版本：1.0<br>
日期：2026-09-21<br>
审计基线：`597d703`

> 客户端、Cloud API、独立网页端、数据协议和运行时的可实施详细设计，见[《DSH Agent 客户端与云端网页分离详细设计》](client-cloud-separated-detailed-design.md)。

## 1. 结论

建议将产品调整为 **本地客户端执行 + 自有云端管理与观测 + DSH 作为可插拔 Agent 内核**。

本地客户端负责 CodeAgent、源码、WSL/SSH、hdc、编译、测试、P0–P8 门控、人工审核和断线恢复；云端网页负责客户端与工作流目录、运行统计、审核产物、维测数据和团队视图。云端默认不直接执行用户代码，也不把安装 Connector 作为网页中的第一道工作流门槛。

云端主页面建议从 DSH 官方 Web 中独立出来。当前 AR 主面板虽然挂载在 DSH 页面里，但业务交互走的是本仓自建 REST API、调度器、SQLite、产物接口和 Connector 协议。继续把完整平台 UI 塞进 DSH Web，会持续受到页面结构、认证方式、启动 token、客户端扩展 API 和 DSH 版本的约束，却得不到与约束相匹配的 DSH 能力收益。

不建议立刻删除 DSH。应把 DSH 的定位从“产品框架”改成“Agent runtime adapter”：在客户端或可选云端 AI 服务中使用它的 Agent、Session、Tool、Subagent、Provider 和上下文管理能力。P0–P8 的权威状态机、确定性 gate、证据签名和 consent 继续由现有 OHOS runtime 管理，不迁入自由度更高的模型 workflow。

## 2. 当前架构的实际数据流

当前目标部署的数据流是：

```text
浏览器中的 DSH 官方 Web
  └─ 本仓 client.js 扩展面板
       └─ /api/ohos-ar/*（本仓 REST 路由）
            ├─ 本仓 ArDeliveryScheduler / ArRuntimeService
            ├─ 本仓 SQLite、事件、维测、产物接口
            └─ DSH Web 内的 Connector WebSocket Hub
                 └─ Windows 本机 Connector
                      ├─ 本机 CodeAgent
                      ├─ WSL 或 SSH 源码
                      ├─ hdc / 设备
                      └─ 下载后的 AR workflow bundle
```

这里的 DSH 主要位于最外层。用户真正关心的代码修改、编译、设备调试、门控、运行恢复和维测均由本仓实现。

首次使用之所以复杂，不是某一个 PowerShell 错误造成的，而是职责分配导致的：浏览器必须跨过操作系统安全边界去安装并启动本机程序，然后该程序还要完成 Node runtime、token、WSL/SSH、源码根、workflow bundle、CodeAgent 和 WebSocket 的初始化。普通网页不能静默安装或启动本机可执行程序，因此这条链路只能不断增加引导、下载、确认、协议处理器和恢复逻辑，无法变成真正的“一键无感安装”。

## 3. 当前 DSH 到底用了多少

### 3.1 可核实的代码事实

本次审计覆盖 `dsh-workflow/src`、`runtime/dsh-ohos/src`、`platform/apps/local-console/src` 和 `workspace-gateway/src`：

- 共 91 个 JavaScript 源文件、约 27,134 行代码；
- 直接出现 DSH 包导入或 DSH 服务注册的生产文件只有 5 个；
- `dsh-workflow/src/dsh/client.js`、`plugin.js`、`web-routes.js`、`official-provider.js` 和 `delivery-runtime.js` 共约 5,276 行，其中大部分是本仓自建 UI、REST、Connector 和 runtime glue；
- `dsh-workflow` 直接依赖的 DSH 包主要是 `@deepseek-ai/cordis` 和 `@deepseek-ai/dsh-tools`；其他 DSH 模块主要由官方 Web profile 和 preset 提供；
- AR 面板的常规操作直接调用 `/api/ohos-ar/*`，没有通过 DSH Session 中的模型 Tool Call 驱动；
- 当前要求本机 Connector 的目标配置中，CodeAgent 由 `ConnectorCodeAgentExecutor` 派发，DSH 官方 provider runner 不在主执行路径。

代码行数不能直接等价为产品价值，但它可以说明当前业务控制面主要掌握在本仓，而不是 DSH 内部。

### 3.2 能力使用审计

| DSH 能力 | 当前使用情况 | 评价 |
|---|---|---|
| Cordis 插件加载、配置和生命周期 | 插件通过 patch 加载，注入 tools、webServer、connection、subagents、agents | 已真实使用 |
| 官方 Web 外壳、主题和 Slot | AR Delivery 注册到 `sidebar.panellist` 和 `main` | 已真实使用，但主要是容器价值 |
| Web 会话认证 | `/api/ohos-ar/*` 复用 DSH connection 的 `requestRejection` | 已真实使用，但不是多租户产品身份系统 |
| Tool Registry | 注册了 AR、Requirement、运行状态、RAG 等工具 | 已真实使用；网页主路径很少通过模型调用这些工具 |
| Agent / Subagent / Claude Code Provider | 存在短生命周期 parent Agent 和 subagent runner | 条件使用；本机 Connector 主路径会绕过它 |
| Session 事件与 Token 统计 | official provider 路径会从 Session assistant events 汇总 usage | 局部使用；Connector usage、阶段统计主要是自建 |
| DSH Workflow Engine | preset 中加载了 workflow 工具，但 P0–P8 使用本仓 scheduler/runtime | 基本未使用 |
| DSH Approval | 人工审核使用自建 evidence-bound consent API 和页面 | 未作为业务审核主路径 |
| DSH Attachment / Artifact | 产物使用本仓文件、哈希和下载接口 | 未作为业务产物主路径 |
| DSH Experience、Goal、Ralph、Compaction | preset 可用，但不参与 AR 自动执行闭环 | 基本未使用 |
| DSH 主模型与对话 | 已按产品要求禁用默认主模型，问题分析直接调用选中的本机 CodeAgent | 当前主路径不使用 |

按“是否进入用户的主要 P0–P8 执行路径”做工程估算，当前 DSH 核心 Agent 能力利用率约为 **15%–25%**；把 Web 外壳、插件生命周期、认证路由和 Tool 注册也算进去，整体集成利用约为 **25%–35%**。这是架构审计区间，不是官方指标或运行统计。

因此，“什么都没用”并不准确；更准确的说法是：**用了 DSH 的外壳和扩展点，较少使用 DSH 的 Agent 编排内核**。

## 4. 为什么继续维持当前模式性价比低

### 4.1 首次使用链路天然脆弱

网页下载 `.cmd`、系统确认、PowerShell、私有 Node、token、WSL/SSH、协议处理器和 WebSocket 任何一步失败，用户看到的都是“Connector offline”。网页无法获得足够的本机权限自行诊断和修复，最终仍需要用户打开命令行或让开发者远程定位。

### 4.2 UI 已经是独立产品，只是寄居在 DSH 页面

AR 面板约 1,900 行，承担导航、配置、工作流目录、运行、人工审核、产物、RAG、设备调试、AI 对话和维测。它不是 DSH 标准 Session 页的轻量扩展，而是一套完整业务应用。继续寄居会同时承担自研页面成本和 DSH UI 兼容成本。

### 4.3 两套编排概念并存

DSH 有 Session、Tool、Subagent 和 Workflow；本仓又有 Run、Task Lease、Scheduler、Gate、Consent、Event 和 Artifact。当前没有明确规定哪一套是产品真相层，维护者容易误以为 DSH workflow 会自动执行 P0–P8，实际执行却在自研 scheduler 中。

### 4.4 云端 DSH 与本地能力的位置冲突

hdc、设备驱动、已认证 CodeAgent、源码和大规模构建环境天然位于用户电脑、WSL 或内网 SSH 主机。将 Agent 控制中心放在云端，就必须长期维护复杂的远程执行协议；而这些能力放在本地客户端后，云端只需要接收结构化事件和用户明确上传的产物。

## 5. 四种可选路线

评分为 1–5，5 最好。

| 路线 | 首次体验 | 本地执行可靠性 | DSH 价值 | 产品可控性 | 长期维护 | 判断 |
|---|---:|---:|---:|---:|---:|---|
| A. 保持 DSH Web + Connector | 2 | 3 | 2 | 2 | 2 | 不建议继续作为主路线 |
| B. 本地客户端执行，云端仍用 DSH 官方 Web 展示 | 4 | 5 | 2 | 3 | 3 | 可作为短期过渡 |
| C. 本地客户端 + 自有云门户 + DSH Agent 内核 | 5 | 5 | 4 | 5 | 4 | 推荐目标架构 |
| D. 完全去掉 DSH，自研全部 Agent 能力 | 5 | 5 | 0 | 5 | 2 | 仅在 DSH 内核无法稳定嵌入时采用 |

路线 C 保留已有确定性 workflow 资产，也避免为了“看起来使用了 DSH”而把业务状态机强行迁入 DSH。

## 6. 推荐目标架构

```text
┌──────────────────── DSH 云管理平台 ────────────────────┐
│ 自有 Web Portal                                           │
│  客户端/设备  工作流目录  Run 统计  审核产物  维测  团队视图 │
│                         │                                 │
│ 自有 Cloud API          │ 可选 DSH Agent Service          │
│  配对/身份  事件摄取     │  Session / Tool / Subagent      │
│  投影/统计  Artifact     │  云端问题分析/协作会话           │
│  Workflow Registry      │                                 │
└───────────────▲─────────┴─────────────────────────────────┘
                │ 出站 TLS：事件、指标、审核和明确选择的产物
                │
┌───────────────┴──────── 本地 Agent Client ───────────────┐
│ 桌面 UI：环境发现、AR 输入、源码选择、运行、审核、恢复       │
│ Local Control API / SQLite / Durable Outbox                │
│ Workflow Runtime：P0–P8、gate、签名证据、consent            │
│ DSH Agent Adapter：Session、Tool、Subagent、Provider（可选） │
│ CodeAgent Adapter：Claude Code / OpenCode / Codex / 自定义  │
│ Workspace Adapter：Windows / WSL / SSH                      │
│ Device Adapter：hdc / 设备 / 日志 / 产物                     │
└─────────────────────────────────────────────────────────────┘
```

### 6.1 客户端职责

客户端成为唯一执行平面：

1. 安装后常驻托盘或按需启动，自动更新；
2. 自动发现 WSL 发行版、Windows SSH config、CodeAgent、hdc、设备和源码候选目录；
3. 用户只需选择源码目录并输入 AR 描述；
4. 下载并校验签名 workflow bundle，自动选择 OpenHarmony/HarmonyOS 分支；
5. 在本机运行 P0–P8，所有编译、测试、设备和 Git 操作保持在本地或用户配置的 SSH 主机；
6. 本地保存完整日志、断点、凭据和待同步事件；
7. 只向云端同步脱敏指标、结构化事件、审核摘要和用户允许上传的产物。

Windows 第一版建议使用 **Electron + 现有 Node runtime sidecar**。现有实现大量使用 Node 子进程、WebSocket、SQLite、文件系统和 CLI，Electron 能最大程度复用。Tauri 安装包更小，但需要维护 Rust command bridge 或额外 Node sidecar，第一期会增加改造量。产品稳定后再评估 Tauri/原生壳。

### 6.2 云端职责

云端网页不再承担“安装并唤醒本机执行器”的工作流步骤。它负责：

- 客户端下载和版本发布；
- 一次性设备配对码或浏览器回跳配对；
- workflow 目录、版本、签名和灰度策略；
- run/event 摄取、幂等去重、状态投影和团队统计；
- 阶段时长、人工介入、Token、失败分类、成功率和客户端健康度；
- 审核产物、维测产物和明确上传的证据；
- 管理员策略、租户、角色和审计。

云端默认不向客户端主动下发任意 shell 命令。需要远程控制时，只下发固定 schema 的 workflow intent，并由客户端显示、授权和执行。

### 6.3 更简单的首次使用流程

1. 用户打开云门户，下载签名的客户端安装包；
2. 用户只做一次操作系统安装确认；
3. 客户端自动启动，浏览器通过一次性配对码或 deep link 完成绑定，不再手输长期 token；
4. 客户端自动完成 CodeAgent、WSL/SSH、hdc 和 workflow 检测，并给出可修复项；
5. 用户输入 AR 描述、选择源码目录，开始运行；
6. 云端网页自动出现该客户端的 run、阶段、审核和维测数据。

操作系统不会允许网页静默安装本机程序。客户端化能做到的是把确认压缩为一次标准安装，并把之后所有升级、启动、诊断和恢复放进客户端，不再反复下载脚本或编辑配置。

## 7. 今后 DSH 可以真正用在哪里

### 7.1 应当使用

| DSH 能力 | 目标用法 |
|---|---|
| Session | 每个客户端 run 可绑定一个本地 Agent Session，保留问题分析、上下文和模型事件 |
| Tool Registry | 把 P0–P8 的 status/claim/context/submit/validate、设备和产物能力注册成工具 |
| Subagent Provider | Claude Code 等原生 provider 用于阶段 worker；OpenCode/Codex 继续通过适配器接入 |
| Agent / Model Routing | 由客户端按 workflow 策略选择 Agent、模型和角色，不由页面硬编码 |
| Context / Compaction | 长周期 P0–P8 会话做阶段隔离和上下文压缩 |
| Token Meter | 对 DSH provider 路径直接采集结构化 usage，并与外部 CodeAgent 回执统一 |
| Approval | 用于模型工具执行前的交互审批；最终业务 PASS 仍由 evidence-bound consent 决定 |
| Attachment | 将关键报告镜像到协作 Session；权威产物仍保存在 workflow artifact store |

### 7.2 不应强行使用

- 不把 DSH 模型的自然语言结论当成 P0–P8 PASS；
- 不把确定性 gate、签名 manifest 和功能指纹改成模型 workflow；
- 不让云端 DSH 持有用户 SSH 私钥、CodeAgent 登录态或 hdc 设备权限；
- 不为了使用 DSH Workflow Engine 重写已具备恢复、租约和证据约束的 runtime；
- 不再把完整产品后台依赖于 DSH 官方 Web 的页面结构。

按这个边界，DSH 在 Agent 执行链中的实际利用可提升到约 **60%–75%**，而平台 UI 和数据服务不再被 DSH 绑定。该区间仍是架构目标，最终应通过“DSH 驱动的阶段任务占比、Session usage 覆盖率、Subagent 成功率、工具调用占比”四项运行指标验证。

## 8. 现有代码的保留与改造

| 现有模块 | 处理建议 | 预计复用 |
|---|---|---:|
| `skills/ohos-ar-dev-phases` | 原样保留为权威 gate 和证据层 | 95%–100% |
| `runtime/dsh-ohos` | 保留 workflow 状态、租约、恢复和事件；去除宿主假设 | 85%–95% |
| `workspace-gateway` | 下沉为客户端的 workspace/device/CodeAgent adapter | 75%–90% |
| `platform/apps/local-console` runtime 部分 | 抽成共享 `packages/runtime`，由客户端和测试使用 | 70%–85% |
| `dsh-workflow/src/dsh/official-provider.js` | 作为可选 DSH Agent Adapter 保留 | 80%–100% |
| `dsh-workflow/src/dsh/delivery-runtime.js` | 保留工具定义，改为连接本地 runtime | 70%–90% |
| `dsh-workflow/src/dsh/client.js` | 不再作为主产品 UI；按业务组件迁入桌面端/云门户 | 逻辑 40%–60%，代码不宜整搬 |
| `dsh-workflow/src/dsh/web-routes.js` | 拆成客户端 Local API 与云端 Ingest/Query API | 30%–50% |
| Connector 脚本安装器 | 被标准安装包和自动更新替代，只保留诊断/便携模式 | 10%–30% |

这些是迁移目标估算，实施前需按模块测试覆盖和依赖图再细化。

## 9. 分阶段实施计划

### 阶段 0：冻结当前网页安装链

- 只修阻断性缺陷，不再扩充 `.cmd`/PowerShell onboarding；
- 当前 Connector 保留为开发和兼容入口；
- 定义客户端、云端和 DSH adapter 三条稳定接口。

完成条件：形成版本化协议，现有 P0–P8 回归继续通过。

### 阶段 1：抽离共享 runtime

- 将 ArRuntimeService、Scheduler、CodeAgent、preflight、RAG/debug 接口从 `local-console` 路径抽成共享包；
- DSH plugin 和新客户端都只依赖共享接口；
- 明确本地 SQLite 是执行真相源，云端是观测投影。

完成条件：CLI/测试、当前 DSH 页面和新 Local API 使用同一个 runtime，无双写。

### 阶段 2：Windows 客户端 MVP

- Electron 壳、签名安装包、开始菜单、托盘和自动更新；
- 无需用户安装 Node 或克隆 AI-AR-workflow；
- 自动发现 WSL/SSH/CodeAgent/hdc；
- AR 描述 + 源码目录即可启动 P0；
- 本地展示阶段、审核、产物、维测和恢复动作。

完成条件：全新 Windows 用户从下载到 P0 预检只需一次安装确认，无命令行、无 JSON、无 token 手输。

### 阶段 3：云端观测平台

- 设备配对、心跳、workflow registry、事件摄取、run projection、artifact store；
- 团队统计、审核产物、维测、失败聚类、客户端版本和在线状态；
- 客户端 outbox 支持离线重放和幂等。

完成条件：客户端断网运行后重连，云端状态无重复、无阶段倒退、产物哈希一致。

### 阶段 4：DSH Agent 内核接入

- 客户端内启动 headless DSH adapter，或通过受控本地服务接入；
- P1/P2/P3/P7 等模型阶段优先使用 DSH Session + Tool + Subagent；
- 外部 CodeAgent adapter 与 DSH provider 返回统一的结果、usage、取消和 artifact contract；
- 云端可选 DSH Service 只做协作分析，不直接控制本地 shell。

完成条件：至少一个完整 AR 的模型阶段由 DSH Session 驱动，所有阶段仍由真实 gate 判定；DSH 关闭时客户端可用外部 adapter 降级运行。

### 阶段 5：退役旧入口

- 云门户替代 DSH Web 中的完整 AR 主面板；
- DSH Web 仅保留开发/运维诊断入口；
- Connector `.cmd` 安装器降级为便携和故障恢复工具。

完成条件：生产用户不再依赖 `?token=...` DSH 启动 URL，也不再通过网页脚本完成日常客户端启动。

## 10. 关键协议

建议先固定以下协议，再开发 UI：

- `client.register / client.pair / client.heartbeat`：设备身份、版本和能力；
- `workflow.catalog / workflow.install / workflow.update`：版本、SHA-256、签名和兼容范围；
- `run.snapshot / run.event.batch`：单调 revision、幂等 event id、客户端时间和服务端接收时间；
- `metrics.stage`：墙钟、人工等待、有效耗时、尝试、Token 和失败分类；
- `artifact.manifest / artifact.upload`：默认只传元数据，内容需策略或用户明确允许；
- `review.request / review.response`：审核内容、actor、证据 digest 和不可抵赖时间；
- `agent.execution`：agent、model、provider、usage、取消状态和输出引用；
- `support.bundle`：一键导出脱敏诊断，不包含凭据和源码正文。

所有云同步都应支持断点续传、幂等和客户端离线。云端不能仅凭事件到达顺序推导阶段状态，必须使用 run revision 和 authority digest。

## 11. 安全与运维门槛

- 客户端和 workflow bundle 必须代码签名；自动更新必须校验发布签名；
- 配对使用短期一次性 code，客户端生成设备密钥，不能继续让用户复制长期 Connector token；
- 本地凭据使用 Windows Credential Manager/DPAPI，SSH 和 CodeAgent 登录态不上传；
- 云端按租户、用户、设备、workspace 和 run 做权限隔离；
- 默认只上传指标和元数据，源码、prompt、stdout、设备日志和人工输入分别配置数据策略；
- 本地执行固定 operation schema，禁止云端任意 shell；
- 客户端必须提供“暂停同步、解绑设备、清除本地数据、导出诊断”入口；
- DSH 作为依赖需要固定版本和兼容测试；把它打包进客户端前还需确认再分发许可和升级策略。

## 12. 投入估算与决策门

以 3–4 人并行、复用现有代码为前提：

| 工作包 | 估算 |
|---|---:|
| runtime 抽离和协议定稿 | 2–3 人周 |
| Windows 客户端 MVP、安装、更新 | 4–6 人周 |
| 云端摄取、投影、门户 MVP | 4–6 人周 |
| DSH Agent adapter 和统一 usage | 2–4 人周 |
| 安全、签名、离线恢复、E2E | 3–5 人周 |

总体约 15–24 人周。单人串行通常需要 4–6 个月；3–4 人并行可按 8–12 周规划首个可用版本。真实设备、企业签名证书、多租户身份和制品基础设施可能拉长周期。

实施前设置两个决策门：

1. 用一个最小 headless prototype 验证 DSH Session + Tool + Claude Code Subagent 能否在客户端稳定运行和关闭；若不稳定，保留统一 Agent Adapter，客户端首版不嵌 DSH。
2. 用一台全新 Windows 机器验收“安装、配对、发现、P0、断网、重连、云端统计”；这条链未通过前，不再扩充云端功能。

## 13. 最终建议

产品层面应独立建设自己的客户端和云门户；Agent 层面继续利用 DSH，但把它放到正确的位置。DSH 适合管理模型、会话、工具和子 Agent，不适合替代本产品的 Windows 安装器、设备管理、OHOS 确定性 gate、运行数据仓库和团队统计门户。

下一步不应继续修饰网页 Connector 下载页，而应先实施“共享 runtime 抽离 + Windows 客户端 MVP + 云端事件协议”。当前网页与 Connector 保持兼容，等客户端能够从全新 Windows 环境稳定跑通 P0，再迁移 P1–P8 和云端观测。
