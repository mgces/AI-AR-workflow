# DSH Adaptive Workflow Controller 完整方案

> 状态：架构候选方案，暂不进入实现。
>
> 目标：评估并设计一个以 DeepSeek Harness（DSH）承载自适应编排能力、以 MCP 作为跨 Agent 边界、以现有 AR workflow 门禁作为不可绕过权威层的控制器。

## 1. 结论摘要

推荐采用 **MCP-first、DSH-optional、Gate-authoritative** 的分层架构：

```text
Codex / Claude Code / CodeBuddy / TRAE
              │
        宿主 Agent Adapter
              │ MCP
              ▼
     DSH Adaptive Controller
     ├─ 能力分析与模块按需选择
     ├─ 执行会话与断点恢复
     ├─ 失败分类与 repair loop
     ├─ 经验、评分和演进提案
     └─ 可选模型/Sampling Provider
              │
              ▼
       AR Workflow Core
     ├─ requirement workflow FSM
     ├─ advance.py
     ├─ gate_*.py
     ├─ signed manifest / sha256
     └─ evidence-bound consent
```

关键判断：

1. DSH 最有价值的部分不是替代现有 workflow，而是实现“按需装载模块、失败后重选能力、会话恢复、经验沉淀”。
2. 宿主 Agent 继续提供模型推理和代码修改能力；没有模型 Provider 时，DSH 不能独立完成语义分析与修复。
3. `advance.py`、`gate_*.py`、签名证据和 consent 始终是推进权威，DSH 的判断不能直接把阶段标记为 PASS。
4. 自进化只能优化路由、Prompt、Skill 组合和 repair 策略，不允许自动修改权威门禁。
5. 同一个 MCP controller 可以跨 Agent 复用，但 Codex、Claude Code、CodeBuddy、TRAE 分别需要薄适配层。

## 2. 背景与问题

本仓包含两条作业线：

- 需求分析与设计 workflow：通过多个需求分析 Skill 收敛需求、形成设计与 AR 交接产物。
- 需求开发 workflow：使用 P0–P8 状态机、确定性 gate、签名证据与人工 consent 完成开发、测试、真机、质量和上库。

当前优势是门禁确定、证据可验证、断点可恢复；主要可优化点是：

- 不同任务会加载大量不相关 Skill，增加模型上下文负担。
- 需求设计阶段主要依赖 Prompt 路由，缺少统一的 capability manifest。
- gate 失败后的修复选择仍依赖 Agent 临场判断，经验难以复用。
- 跨 Codex、Claude Code、CodeBuddy、TRAE 时，需要重复编写编排提示和宿主配置。
- 成功与失败轨迹尚未形成可评测、可晋级的路由策略闭环。

本方案尝试吸收 DSH 的插件化、Skill、session、workflow 和可扩展 provider 能力，但不以“使用 DSH”为目标本身。

## 3. 目标与非目标

### 3.1 目标

- 根据 AR、源码影响范围和当前阶段，只向宿主模型提供必要模块。
- 将“规划 → 执行 → gate → 修复 → 重验”变成可恢复的闭环。
- 复用 gate 失败经验，逐步提高模块选择和修复成功率。
- 保持现有确定性门禁、签名证据和人工确认语义不变。
- 使用一套 MCP 协议服务多个 Agent 宿主。
- 所有策略变化可审计、可回放、可回滚。

### 3.2 非目标

- 不用 DSH 重写 `advance.py` 或 `gate_*.py`。
- 不让模型或 DSH 自行决定门禁 PASS。
- 不默认给 DSH 配置独立模型。
- 不追求四个平台完全相同的子 Agent 声明格式和 UI 行为。
- 不在首期实现自动修改 Skill 或自动发布演进策略。
- 不把 DSH session、摘要或评分作为第二真相源。

## 4. 架构原则

### 4.1 权威层与自适应层分离

```text
自适应层：可以试错、重选、学习、回滚
权威层：确定性、失败闭合、不可由模型绕过
```

DSH 可以推荐下一动作，但 `advance.py` 仍是 `pipeline.json` 的唯一写入器；DSH 可以发起 gate，但只能接受 gate 的真实 verdict。

### 4.2 MCP 是可移植边界

业务状态机和数据契约不能出现以下宿主专有内容：

- Codex task/thread id
- Claude Code 专有工具名或 hook 名
- CodeBuddy 专有消息格式
- TRAE Agent/Rules 配置字段
- `AskUserQuestion`、`TodoWrite` 等宿主工具名

这些差异由 Agent Adapter 转换。

### 4.3 最小上下文而非最少能力

按需加载不是简单减少 Skill 数量，而是加载完成当前动作所需的最小闭包：

```text
阶段基础模块
+ 任务类型模块
+ 语言/组件模块
+ 风险触发模块
+ gate 失败修复模块
```

若依赖不明确，优先多加载安全/契约模块，不能为了压缩上下文降低门禁质量。

### 4.4 自进化先提案、后评测、再晋级

任何演进策略必须先进入 staging，经历史 case 回放和人工批准后才能成为默认策略。

## 5. 分层设计

### 5.1 AR Workflow Core：权威执行层

保留现有实现：

- `advance.py`：唯一状态写入器。
- `gate_*.py`：确定性阶段判定。
- signed manifest：HMAC 和哈希链。
- artifact sha256：证据与当前产物绑定。
- consent：绑定当前签名证据的人工确认。
- `status` / `next` / `resume` / `verify-all`：导航与恢复。

需求 workflow 后续可增加独立 FSM，但遵循同一原则：导航状态可以由控制器生成，最终状态只能由权威写入器更新。

### 5.2 DSH Adaptive Controller：自适应控制层

职责：

- 管理跨阶段执行 session。
- 根据 action card 解析 capability requirements。
- 从 Module Registry 选择最小模块闭包。
- 为宿主 Agent 生成 execution packet。
- 接收执行结果并发起权威 gate。
- 把 gate 失败转化为 repair packet。
- 维护策略效果、失败分类和演进候选。

不负责：

- 伪造或重写 gate verdict。
- 直接修改 pipeline 权威状态。
- 绕过人工 consent。
- 在缺少模型 Provider 时独立执行语义修复。

### 5.3 Agent Adapter：宿主适配层

每个平台只维护薄层：

| 适配内容 | 示例 |
|---|---|
| MCP 安装与连接 | STDIO / Streamable HTTP / SSE |
| 原生子 Agent 壳 | Codex custom subagent、Claude/CodeBuddy/TRAE agent |
| 模块注入 | Skill 路径、Prompt、MCP resource 或 execution packet |
| 人工交互 | 提问、审批、授权、等待 |
| 权限映射 | 文件写入、shell、网络、设备、push |
| 进度展示 | todo、task、消息或报告 |

宿主适配层不能包含 P0–P8 业务规则。

### 5.4 Module Registry：能力目录

每个可装载模块都需要机器可读元数据：

```yaml
id: ohos-dev-sa-codegen
version: 1.0.0
kind: skill
phases: [P1, P2]
capabilities:
  - sa-architecture
  - system-ability-codegen
triggers:
  component_types: [system_component]
  keywords: [SystemAbility, SA, service]
requires:
  - ohos-dev-cpp-coding-style
conflicts: []
inputs:
  - AR_design.md
outputs:
  - source_diff
risk_tags:
  - ipc
  - privilege-boundary
context_cost_hint: medium
authority: advisory
```

模块类型包括：

- `skill`：给模型的领域指令和参考资料。
- `tool`：确定性命令或 MCP tool。
- `gate`：权威验证入口，只能被调用，不能被覆盖。
- `repair-strategy`：失败类别到修复流程的映射。
- `knowledge-source`：按需加载的知识库导航与源码证据。

## 6. 运行时闭环

### 6.1 正常执行

```text
1. Adapter 调 workflow_next(run_id)
2. Controller 读取 advance.py status --json / next
3. Controller 形成 capability requirements
4. Module Resolver 选择最小模块闭包
5. Controller 返回 execution packet
6. 宿主模型执行代码/文档/测试工作
7. Adapter 调 workflow_submit(...)
8. Controller 发起对应 gate
9. gate PASS 后调用 advance.py advance
10. 返回下一阶段；遇到 consent 则 HOLD
```

### 6.2 Repair Loop

```text
gate FAIL
  → Failure Normalizer
  → failure_class + evidence + allowed_scope
  → Repair Planner 选择修复模块
  → 宿主模型执行 scoped fix
  → 重新运行同一 gate
  → PASS / 再次修复 / 人工升级
```

建议默认最大自动修复轮次：

- 同一 failure fingerprint：最多 2 次。
- 同一阶段总自动修复：最多 3 次。
- 发现功能指纹漂移、门禁契约冲突、安全高风险或不可逆动作：立即停止并升级人工。

### 6.3 Consent Loop

DSH 只负责：

1. 提供需要审核的签名证据摘要。
2. 记录等待开始、结束和宿主交互状态。
3. 在用户明确批准后调用现有 consent 命令。

DSH 不得自行生成 reviewer token，不得因为历史批准而复用失效 consent。

## 7. 按需模块加载设计

### 7.1 Capability Manifest

P1 设计阶段新增非权威导航产物 `capability_manifest.json`：

```json
{
  "schema_version": "1.0",
  "run_id": "ar-20260831-001",
  "phase": "P1",
  "task": {
    "type": "sa_feature",
    "component_type": "system_component",
    "languages": ["cpp"],
    "risk_tags": ["ipc", "permission", "device-runtime"]
  },
  "required_capabilities": [
    "source-verification",
    "sa-architecture",
    "cpp-contract",
    "security-review"
  ],
  "required_modules": [
    "ohos-dev-sa-codegen",
    "ohos-dev-cpp-coding-style"
  ],
  "conditional_modules": [
    {
      "when": "public IPC interface changes",
      "module": "ohos-dev-security-code-review"
    }
  ],
  "expected_artifacts": ["AR_design.md"],
  "next_gate": "gate_design.py"
}
```

该文件用于路由，不参与 PASS 签名；真正的设计契约仍由 `gate_design.py` 验证和签名。

### 7.2 选择算法

首期使用可解释规则，不直接使用不可审计的自主选择：

```text
候选模块 = phase_modules
          ∪ task_type_modules
          ∪ language_modules
          ∪ risk_modules
          ∪ failure_repair_modules

选择结果 = required dependencies 闭包
          - conflicts
          - 当前动作不需要的高成本模块
```

每次选择必须输出 `selection_reason`，便于评测和回放。

### 7.3 注入方式

不同宿主采用不同方式，但内容来自同一 execution packet：

- Codex：原生代理子 Agent 读取 MCP 返回的模块清单和 Skill 资源。
- Claude Code：subagent/command 适配器注入同一模块内容。
- CodeBuddy：Agent + MCP；支持时可选 MCP Sampling。
- TRAE：自定义 Agent/Rules + MCP tool。

不要求宿主支持动态安装 Skill；最小兼容模式是由 MCP 返回经过裁剪的模块指令和资源引用。

## 8. 数据契约

### 8.1 Execution Packet

```json
{
  "run_id": "ar-20260831-001",
  "action_id": "P2-feature-develop-01",
  "phase": "P2",
  "objective": "按签名设计实现 SA 功能",
  "allowed_scope": ["services/foo/**", "test/**"],
  "forbidden_actions": ["advance-state", "push", "edit-gate"],
  "modules": [
    {
      "id": "ohos-dev-sa-codegen",
      "version": "1.0.0",
      "reason": "task.type=sa_feature"
    }
  ],
  "inputs": ["AR_design.md", "design_refs.md"],
  "expected_outputs": ["source_diff"],
  "next_gate": "gate_develop.py"
}
```

### 8.2 Execution Receipt

```json
{
  "run_id": "ar-20260831-001",
  "action_id": "P2-feature-develop-01",
  "host": "codex",
  "agent": "ar-workflow-proxy",
  "modules_used": ["ohos-dev-sa-codegen"],
  "changed_paths": ["services/foo/foo_service.cpp"],
  "semantic_done": true,
  "truth_layer_pass_known": false,
  "notes": "等待 gate_develop.py 验证"
}
```

Receipt 只用于追踪，不能替代 gate 结果。

### 8.3 Repair Packet

```json
{
  "failure_id": "sha256:...",
  "phase": "P4",
  "failure_class": "compile_error",
  "source_gate": "gate_build.py",
  "evidence_refs": ["evidence/phase4/build_stdout.log"],
  "allowed_scope": ["services/foo/**"],
  "recommended_modules": [
    "ohos-dev-build-execution-diagnosis",
    "ohos-dev-cpp-coding-style"
  ],
  "repair_objective": "修复编译错误，不改变公开接口和验收契约",
  "must_reset_to_p1_if": [
    "public API changes",
    "acceptance criteria changes",
    "dependency contract changes"
  ]
}
```

### 8.4 Evolution Proposal

```json
{
  "proposal_id": "evo-20260831-001",
  "scope": "module-routing",
  "current_rule": "P4 compile_error -> build-diagnosis",
  "proposed_rule": "linker undefined symbol -> build-diagnosis + dependency-verification",
  "supporting_runs": ["run-a", "run-b", "run-c"],
  "expected_effect": "降低同类失败的第二轮重试率",
  "risk": "low",
  "evaluation_suite": "historical-linker-failures-v1",
  "status": "staging"
}
```

## 9. MCP 接口建议

### 9.1 最小稳定接口

| Tool | 作用 | 是否能改变权威状态 |
|---|---|---:|
| `workflow_start` | 创建或绑定 run | 仅通过 core init |
| `workflow_status` | 聚合权威状态和控制器状态 | 否 |
| `workflow_next` | 生成 execution packet | 否 |
| `module_resolve` | 解析最小模块闭包 | 否 |
| `workflow_submit` | 提交执行 receipt | 否 |
| `workflow_gate` | 调用权威 gate | gate 可写证据，不直接推进 |
| `workflow_advance` | 调用 `advance.py advance` | 是，由 core 校验 |
| `workflow_repair` | 生成 repair packet | 否 |
| `workflow_consent` | 在明确人工批准后调用 consent | 是，由 core 签名 |
| `workflow_resume` | verify-all + status + next | 可能触发权威回退 |
| `evolution_propose` | 生成 staging 演进提案 | 否 |

### 9.2 Client Capability Negotiation

首次连接可声明宿主能力：

```json
{
  "host": "codex",
  "capabilities": {
    "mcp_sampling": false,
    "native_subagents": true,
    "structured_output": true,
    "background_jobs": false,
    "interactive_consent": true,
    "workspace_write": true
  }
}
```

Controller 必须按公共最低能力运行；Sampling、后台任务和宿主 UI 只能作为增强项。

## 10. DSH 能力使用方式

### 10.1 首期直接使用

- 插件生命周期和模块注册。
- Session、事件轨迹、恢复和回放。
- Skill/Tool catalog。
- Controller 状态与策略版本管理。
- 结构化 workflow orchestration。
- 可选日志、指标和管理 UI。

### 10.2 需要本项目实现

以下不是“安装 DSH 即自动获得”的能力：

- capability manifest 生成规则。
- OpenHarmony Skill 元数据和依赖关系。
- gate failure normalizer。
- repair 策略映射。
- 演进提案、离线评测和晋级流程。
- Codex/Claude Code/CodeBuddy/TRAE 适配器。
- DSH 到宿主 MCP Sampling 的模型 Adapter。

### 10.3 无模型模式限制

没有独立模型或 MCP Sampling 时：

- DSH 可以管理模块、状态、策略和循环。
- 宿主 Agent 必须执行所有语义规划、代码修改和文档生成。
- DSH 的 `agent()`、模型驱动 `parallel()` / `pipeline()` 不能成为关键依赖。

因此首期应实现“宿主驱动循环”：宿主 Agent 持续调用 `next → submit → gate → repair`，DSH 提供控制和记忆。

## 11. 自修复设计

### 11.1 Failure Taxonomy

建议标准化以下 failure class：

- `input_incomplete`
- `design_contract_invalid`
- `scope_violation`
- `style_or_static_rule_failed`
- `test_authorship_incomplete`
- `compile_error`
- `unit_test_failed`
- `device_or_deploy_failed`
- `runtime_evidence_missing`
- `quality_report_failed`
- `review_gate_failed`
- `consent_missing`
- `remote_ci_failed`
- `environment_unavailable`
- `authority_or_signature_invalid`

每类失败定义：

- 可否自动修复。
- 允许修改范围。
- 推荐模块。
- 必须回退的阶段。
- 最大重试次数。
- 人工升级条件。

### 11.2 修复安全规则

- P3–P8 发现功能代码必须变化时，不允许“原地修复”，按现有规则 repair/reset。
- 签名、哈希链或 consent 异常只允许权威层恢复，DSH 不尝试重写状态。
- P8 push、PR、CI 等不可逆动作必须保留人工批准和现有上传门禁。
- 环境不可用不应反复调用模型修代码，应转为环境诊断或等待。

## 12. 自进化设计

### 12.1 可演进对象

- capability 到 module 的映射。
- 模块依赖和冲突规则。
- execution packet 的提示模板。
- failure class 到 repair strategy 的映射。
- 同类任务的优先模块顺序。
- 历史成功案例的检索排序。

### 12.2 不可演进对象

- gate PASS 条件。
- evidence schema 的权威校验。
- HMAC、sha256、hash chain。
- consent 绑定规则。
- P0–P8 顺序与不可逆动作边界。
- 权限和安全底线。

### 12.3 演进流水线

```text
运行轨迹采集
  → 失败聚类 / 模块效果评分
  → 生成 evolution proposal
  → staging 策略
  → 历史 case 回放
  → 与 baseline 对比
  → 人工审核
  → canary
  → default / rollback
```

策略版本必须和 run 绑定，确保失败可复现。

### 12.4 防止错误自强化

- 不以 Agent 自报“完成”作为奖励，只以真实 gate、人工批准和最终 CI 为结果信号。
- 不使用单个成功 case 晋级策略。
- 按 failure class、任务类型和组件类型分层评估，避免全局错误泛化。
- 保留 baseline 与回滚开关。
- gate 失败或安全退化指标一票否决。

## 13. 可观测性与评测

### 13.1 每个 run 记录

- 宿主、模型标识（若宿主可提供）、Adapter 版本。
- DSH/controller 版本、策略版本。
- 每阶段候选模块、实际模块和选择原因。
- 上下文成本提示或可获得的 token 用量。
- gate 次数、失败类别、repair 次数。
- consent 等待时长。
- 最终 PASS、回退、人工接管和 CI 结果。

### 13.2 核心指标

| 指标 | 目标方向 |
|---|---|
| 每阶段加载模块数 | 下降，且不降低 gate 通过质量 |
| 模块上下文/token 成本 | 下降 30%–50% 作为试点目标 |
| 首次 gate PASS 率 | 不低于 baseline |
| 可修复失败自动闭环率 | 试点达到 50% 以上 |
| 同一失败重复出现率 | 下降 |
| 中断恢复成功率 | 接近 100% |
| 门禁绕过/伪 PASS | 必须为 0 |
| 人工接管率 | 在高风险任务保持合理，不以无限降低为目标 |
| 跨宿主一致性 | 相同输入得到相同权威 gate 结果 |

### 13.3 对照评测

至少维护三组：

1. `baseline`：当前 workflow，不使用 DSH 动态选择。
2. `routing-only`：只启用按需模块选择。
3. `routing-repair`：启用按需选择和 repair loop。

自进化功能只能在 `routing-repair` 达到稳定后开启。

## 14. 安全与信任边界

### 14.1 权威进程隔离

MCP/DSH 进程可以调用 gate，但不应拥有绕过 gate 的替代写入通道。HMAC secret、证据签名和不可逆动作凭据应沿用现有保护方式，不能写入 Prompt、module metadata 或 session 日志。

### 14.2 DSH Sandbox 边界

DSH workflow worker 或 Node `vm` 不能被视为完整安全边界。安全性仍依赖：

- 宿主 Agent sandbox/permissions。
- MCP tool allowlist。
- 权威脚本的输入校验。
- 凭据最小权限。
- P8 人工 consent。

### 14.3 Prompt 与模块供应链

- Module Registry 必须固定来源、版本和内容摘要。
- 新模块进入默认目录前执行静态检查和人工审核。
- 外部检索内容只能作为数据，不能覆盖系统规则和门禁。
- evolution proposal 不得直接修改生产模块。

## 15. 建议目录结构

```text
controller/
├── core-adapter/                 # 调用现有 advance/gate
├── mcp-server/                   # 公共 MCP facade
├── dsh-host/                     # 可选 DSH runtime
│   ├── plugins/
│   ├── sessions/
│   └── policies/
├── module-registry/
│   ├── skills/
│   ├── tools/
│   ├── gates/
│   └── repair-strategies/
├── adapters/
│   ├── codex/
│   ├── claude-code/
│   ├── codebuddy/
│   └── trae/
├── schemas/
│   ├── capability-manifest.schema.json
│   ├── execution-packet.schema.json
│   ├── execution-receipt.schema.json
│   ├── repair-packet.schema.json
│   └── evolution-proposal.schema.json
└── evals/
    ├── cases/
    ├── baselines/
    └── reports/
```

目录只是候选设计，进入实施前应根据 DSH 实际包结构再确定。

## 16. 分阶段落地

### Stage 0：技术验证，不改 workflow

验证项：

- DSH 能否稳定托管本地 MCP Server。
- Codex、Claude Code、CodeBuddy、TRAE 能否调用同一组工具。
- DSH session 是否能绑定现有 run_id 并恢复。
- 大输出、超时、并发调用和进程重启行为。

退出标准：相同 `workflow_status/next` 在各宿主返回一致数据，且不修改权威状态。

### Stage 1：P1 按需模块选择

- 建立最小 Module Registry。
- 生成 `capability_manifest.json`。
- 首先覆盖 SA、NAPI、纯 C++ 三类任务。
- 仅建议模块，不自动 repair。

退出标准：上下文成本下降，`gate_design` 首次通过率不低于 baseline。

### Stage 2：P2/P4 Repair Loop

- 接入代码开发和编译失败分类。
- 生成结构化 repair packet。
- 宿主 Agent 执行 scoped repair。
- 达到重试上限后人工接管。

退出标准：可修复失败自动闭环率达到试点目标，且无功能指纹违规。

### Stage 3：覆盖需求 workflow 与 P0–P8

- 为需求分析过程补充轻量 FSM。
- 扩展测试、真机、质量、review 和 CI failure taxonomy。
- 统一 consent 和中断恢复体验。

退出标准：两个 workflow 均可从至少两个宿主执行和恢复。

### Stage 4：演进提案

- 开启策略评分和演进提案。
- 建立历史 case 回放。
- 所有策略仅手动晋级。

退出标准：至少一个路由或 repair 策略通过 baseline 对照后 canary 发布并可回滚。

### Stage 5：可选模型能力

按实际收益选择：

- CodeBuddy 等支持 MCP Sampling 的宿主：验证 Sampling Model Adapter。
- 需要独立后台 Agent 时：为 DSH 配置独立模型 Provider。
- 不满足明确收益时保持宿主驱动模式。

## 17. Go / No-Go 决策门

### 进入 Stage 0 的条件

- 确实需要支持两个以上 Agent 宿主；或
- 当前 Skill 上下文成本和错路由已成为稳定痛点；或
- 有明确的 repair loop 和运行追踪需求。

### 进入全面实现的条件

Stage 0/1 至少证明以下两项：

- 相同 MCP 服务能跨宿主稳定运行。
- 按需加载显著降低上下文成本。
- gate 首次通过率不下降。
- DSH session/trace 比现有 run 目录提供额外可操作价值。
- 维护成本可被复用收益覆盖。

### No-Go 条件

- DSH 只是包装 `status/next/gate`，没有承担动态路由、修复或演进。
- 为接入 DSH 必须复制或替换现有权威状态机。
- 跨宿主只能通过大量平台专有逻辑实现。
- 上下文成本、成功率和恢复能力没有可测改善。
- DSH 版本或接口稳定性不足以支撑长期维护。

No-Go 时保留更简单方案：直接以 Python workflow core 暴露薄 MCP facade。

## 18. 主要风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 把 DSH 自进化误解为开箱能力 | 实施范围失控 | 将 evolution loop 明确列为项目自研 |
| DSH 无模型导致 agent workflow 空转 | 收益不足 | 首期采用宿主驱动循环，只使用控制和会话能力 |
| 多宿主行为不一致 | 结果难复现 | 公共数据契约 + Adapter capability negotiation |
| 动态加载遗漏关键模块 | gate 首次通过率下降 | required dependency 闭包、安全模块保守加载、baseline 对照 |
| repair 无限循环 | 成本和风险增加 | fingerprint、轮次上限、功能漂移立即升级 |
| 自进化错误强化 | 质量退化 | 只用真实 gate/CI 信号、staging 回放、人工晋级、可回滚 |
| DSH 与现有状态重复 | 双真相源 | DSH 状态仅是投影，恢复时始终回读 core |
| 安全边界被弱化 | 凭据或上库风险 | 保留宿主权限、MCP allowlist、P8 consent、权威脚本校验 |

## 19. 后续需要验证的问题

1. DSH 当前版本的 plugin/session/workflow API 稳定性及升级成本。
2. DSH Skill 装载是否能输出适合外部宿主消费的最小内容包。
3. Codex、Claude Code、TRAE 是否支持或计划支持 MCP Sampling；不能以 MCP 基础支持替代该验证。
4. CodeBuddy Sampling 的上下文、工具递归、并发和权限语义是否满足 DSH provider 需求。
5. requirement workflow 的阶段粒度和权威状态写入器如何设计。
6. 模块元数据由人工维护还是从 SKILL.md 半自动生成。
7. 现有 run evidence 与 DSH session event 的保留和脱敏策略。
8. 历史 case 是否足够建立可信的 baseline 和演进评测集。

## 20. 参考资料

- [DeepSeek Harness](https://www.deepseek.com/harness/en/)
- [DeepSeek Harness Workflow README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/workflow/workflow/README.md)
- [DeepSeek Harness Skills](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)
- [Codex MCP](https://developers.openai.com/codex/extend/mcp)
- [Codex Subagents](https://developers.openai.com/codex/agent-configuration/subagents)
- [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [CodeBuddy MCP](https://www.codebuddy.ai/docs/cli/mcp)
- [TRAE MCP](https://docs.trae.cn/cli_model-context-protocol)
- [本仓状态机](/reference/workflow-state-machine)
- [本仓门控契约](/reference/gate-contract)
- [本仓 Skills 能力吸收基线](/reference/capability-absorption)

## 21. 当前建议

暂不直接落地完整 DSH controller。后续若决定启动，应从 Stage 0 技术验证开始，并把首个业务试点限制在 **P1 capability manifest + 按需模块选择**。

只有试点证明上下文成本、模块命中率或 repair 成功率有实际改善，才继续扩展；否则回退为简单 MCP facade，不因已投入 DSH 适配而扩大实施范围。
