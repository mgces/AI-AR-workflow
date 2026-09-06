# 两个 workflow 的 DSH 化与 Codex subagent 接入分析

分析日期：2026-09-05。范围：静态检查当前仓库，并核对 DeepSeek Harness 上游和 OpenAI 官方文档。本文是设计提案，未安装 DSH、修改运行脚本、执行 OHOS 流水线或验证套餐扣量。

范围更新：本文保留最初 Codex 专用路线的历史分析。当前目标已扩展为 Codex、Claude Code、Cursor、Trae 等宿主，默认采用宿主原生 subagent 领取任务；实施以 [2026-09-06 跨宿主详细方案](./dsh-implementation-plan.md) 为准，不再以 Codex App Server 为唯一后端。另见历史 [收益优先架构](./dsh-maximum-benefit-design.md)。

## 结论

建议采用 **Codex 原生领域 subagent + DSH 确定性工作流服务 + 原有 Python 证据门控**。Codex 承担模型推理、代码和文档生成；DSH 插件承载运行管理、任务契约、恢复和工具接口；原有门控继续拥有开发阶段 PASS 判定权。

这样同时满足三个目标：两个 workflow 可以作为领域能力被通用 Codex 调用；阶段控制从长篇提示词迁移为可执行契约；模型调用保持在 Codex 的 ChatGPT 登录链路中。

“使用 Codex 套餐”取决于执行推理的 Codex 实例使用 ChatGPT 登录。它不等于 DSH 可以直接把套餐当成任意 LLM API。官方区分 ChatGPT 订阅访问和 API key 按量访问。[OpenAI Authentication](https://learn.chatgpt.com/docs/auth)

## 当前仓库已经具备什么

| 项目 | 需求分析与设计 workflow | 需求开发 workflow |
|---|---|---|
| 入口 | `skills/ohos-req-intake-orchestration/SKILL.md` | `skills/ohos-ar-dev-workflow/SKILL.md` |
| 流程 | 需求、可行性、方案决策、Feature、Gate、评审决策、IR/proposal/SR、handoff、AR | P0 环境、P1 设计、P2 代码、P3 测试开发、P4 编译、P5 单测、P6 真机、P7 质量、P8 上库 |
| 当前编排方式 | 主会话按技能文本调度；有独立 reviewer 和串行降级模式 | 主会话循环调用技能、gate、advance |
| 状态基础 | R1–R9 有维测记录，但明确不承担业务状态机职责 | `pipeline.json`、`advance.py`、HMAC manifest、功能指纹 |
| 机器接口 | 结构化 Review Gate JSON；其他校验较多写在提示词中 | `status --json`、`next --json`、stage/handoff/repair packet、completion receipt |
| 输出 | `AR.md`，生成后停止 | PR/CI 与签名证据、人读报告 |
| 主要改造量 | 新增权威业务状态、机器校验及恢复协议 | 对现有脚本做受控适配，补并发与权限边界 |

关键源码位置：

- `skills/ohos-req-intake-orchestration/scripts/requirement_metrics.py`：文件开头明确说明维测不授予任何流程决策。
- `skills/ohos-req-review-gate/SKILL.md`：当前需求 Gate 是隔离 reviewer 的结构化判断，不能与开发流程的真实执行证据混为一谈。
- `skills/ohos-ar-dev-phases/scripts/advance.py`：`_derive_next_action`、`cmd_next`、`cmd_consent`、`cmd_status`。
- `skills/ohos-ar-dev-phases/scripts/schemas/stage_packet.schema.json`：已有上下文、修改范围、预期输出、失败分类、重试预算字段。
- `skills/ohos-ar-dev-phases/scripts/schemas/completion_receipt.schema.json`：明确 receipt 是导航信息，不是 PASS 真相。
- `skills/ohos-ar-dev-phases/scripts/lib/gatelib.py`：`save_state`、`emit`、`load_secret`、`make_consent_record`。

现有 `advance.py --model` 只把模型名称记入维测，不负责选择或调用模型。改变这个参数不能完成模型后端接入。

## DSH 上游能力与调用方向

DSH 可以按 profile/bundle 组合服务、工具、会话和运行循环，因此可以设计专用 workflow 服务组合。本文提出的 OHOS MCP 服务和无自主推理的控制 profile 仍需开发，不能仅通过现有配置就宣称已经实现。[DSH Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)

上游已经提供 `@deepseek-ai/dsh-subagent-codex`：通过官方 App Server 启动真实 Codex 子任务。它的方向是 **DSH → Codex**，不是把 DSH 自动注册成 Codex 原生 subagent。目前该 provider 是单次临时任务，不支持恢复、人工交互和可选输出 schema，模型省略时使用子 Codex 原生配置。[Provider 文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/subagent-codex/README.md)

DSH 原生 workflow 的 specialized consumer 可指定 `subagentProvider`。但 `phases` 只是进度描述，不能代替本仓的阶段状态机；workflow 的执行完成也不能解释为业务验收通过。[DSH Workflow](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/workflow.md)

## 推荐的接法

```text
用户
  ↓
Codex 主 agent：理解请求、分派领域任务、呈现人工决策
  ├─ ohos_requirement：Codex 原生 subagent，执行需求阶段任务
  ├─ ohos_delivery：Codex 原生 subagent，执行开发阶段任务
  └─ ohos_requirement_reviewer：由宿主分派的独立审阅任务
          ↓ 调用新建 MCP/CLI 接口
DSH OHOS workflow 服务：任务租约、状态读取、任务包、校验、恢复
  ├─ requirement controller：新增业务状态机与产物检查
  └─ delivery adapter：调用现有 advance.py / gate_*.py
          ↓
需求文档 / 当前源码 checkout / 构建主机 / 真机 / CI / 证据
```

外层两个名称是领域入口，不代表每个入口必须用一个会话从头跑到尾。领域入口可以返回阶段任务需求，由宿主分派新的执行或审阅 subagent。这样不依赖“子 agent 还能无限创建孙 agent”，也能保留需求 reviewer 的独立上下文。

Codex 官方支持自定义 subagent 配置；具体注册字段以落地时的客户端版本为准。建议领域角色默认不写死模型，沿用宿主配置。用户显式选型时才配置覆盖值。[Codex Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

此模式中 DSH 不启动自主 LLM 循环；生成行为全部在 Codex 原生子任务中完成。所有工作流状态转换仍由代码限制。原生子任务消耗同一账户适用额度，并不会获得单独或免费的额度。

另一条可选路径是 `Codex → OHOS MCP façade → DSH controller → Codex provider → 阶段 worker`。这适合未来把整个流程封成外部领域 agent，但需要额外宿主会话适配、人工问题转交和运行映射。它在 Codex 中通常呈现为工具任务，不能保证与原生 subagent 有相同的活动展示。

若采用第二条路径，DSH 控制器依然应由代码调度；不要为了编排再启动一个额外的 DSH 模型会话，否则“全部推理走 Codex 套餐”的目标并未实现。阶段间通过文件任务包恢复，不能依赖现成 Codex provider 保存对话。

## 需求 workflow 的改造

新增 `requirement_state.json` 和唯一状态写入器，独立于 `workflow_metrics.json`。状态至少包含：当前 R 阶段、输入文档 revision/hash、待解决问题、用户决策记录、Gate 引用、proposal/SR 子任务列表、输出引用与完成状态。

主路径保持：

```text
R1 需求 → R2 可行性 → R3 方案 → R4 Feature → R5 Gate
→ R6 用户评审决策 → R7 IR/proposal/SR → R8 handoff → R9 AR
```

每阶段都允许明确的 `needs_input`、`failed` 和返工转换。现有“串行无环”措辞与 Not Ready 返工行为应在新规范中统一为“主路径串行、返工有记录”，避免调度器解释冲突。

从技能正文抽出两类检查：

- 确定性检查：必需文件与章节、RR/FR/AC 编号传播、proposal 与 SR 对应关系、GA 状态、Owner 字段、条件项和 handoff 完整性。
- 语义审阅：方案合理性、AC 可验证性、影响覆盖等，由隔离 Codex reviewer 产生结构化 finding；附输入 hash 与引用。程序验证其结构和约束，但不能声称结构校验证明了语义正确。

R6 的接纳、不接纳、重新评审必须消费已有用户决策或新用户输入。把“等待用户”转成持久化问题对象，返回宿主后释放 worker；收到答案再校验 revision 并续跑，不让 worker 在会话里空等。

R7 用 proposal 子任务表记录各自状态，只对没有依赖、输出路径独立的任务并行。实际并发取宿主可用额度与仓库上限的较小值；不能机械地把每个技能都映射成长期在线 agent。

AR 输出保留原有编号和未关闭条件。建议新增交接索引，绑定 `AR.md` hash、需求 run ID、来源文档引用。上层显式发起开发任务；需求 Gate 永远不能映射成开发 P1 PASS。

## 开发 workflow 的改造

保留 Python 的阶段顺序、HMAC 链、功能指纹、repair/reset 和真实构建/真机/CI 证据规则，不在 TypeScript 中再实现一套放行逻辑。

新增 delivery adapter：读取 `next --json`，将其阶段包转换为 worker 任务；执行者只生成被允许的代码、测试或文档。控制服务负责调用白名单 gate、核验、推进，再生成下一任务包。

典型循环：

```text
读取权威状态 → 校验 run/revision → 领取当前阶段任务
→ Codex 产出文件 → 控制服务运行 gate
→ FAIL：按已有 Retry/Repair/Regenerate 规则处理
→ 需要确认：返回 needs_input + 可审阅产物
→ 已具备有效 consent：advance → 下一阶段
```

P1、P6、P7、P8 的证据绑定确认保持原含义。P8 先产出签名 diff/目标，再获取适用于该产物的用户授权；证据变化后旧授权失效。宿主的工具权限批准与业务 consent 是两层状态，不能互相替代。

复用已有 stage/handoff/repair packet 和 memory card。新增任务协议只包一层运行标识、租约和 revision，避免维护两套阶段字段。

P0 的环境、组件、源码根、构建根与设备连接必须进入 run 配置。Windows/WSL/Linux 路径由执行适配器显式映射；DSH 服务的 cwd 不能误作 OHOS 源码根。开发依赖关系保持串行，同一 checkout 不允许多个 worker 同时修改功能代码，同一设备验证使用独占租约。

## 新增接口草案

以下名称是本提案接口，不是 DSH 已有工具名称。

| 接口 | 用途 |
|---|---|
| `workflow_start` | 输入 workflow 类型、需求/AR 引用与执行环境，返回 run ID |
| `workflow_status` | 返回业务状态、当前阶段、阻塞项、可审阅产物 |
| `workflow_claim` | 领取当前允许执行的任务包及租约 |
| `workflow_submit` | 提交产物引用；服务端验证输入版本和产物，不能由 worker 提交 PASS |
| `workflow_validate` | 服务端运行白名单检查/gate，并按既定规则推进 |
| `workflow_resume` | 验证并重建当前任务，不依赖历史聊天全文 |
| `workflow_cancel` | 取消 worker/进程树，保留已有证据并记录实际副作用 |

人工确认另走宿主可信输入通道，模型可读待确认事项，但普通 worker 不能自行签发授权。首版如只能由主 agent 转述用户意见，必须说明这是协议约束，尚非身份认证级隔离。

任务输入建议为：

```json
{
  "run_id": "example-run",
  "workflow": "delivery",
  "phase": "P2",
  "revision": 3,
  "lease_id": "opaque-lease",
  "task_packet_path": "<absolute-path>",
  "input_refs": [{"path": "<absolute-path>", "sha256": "<hash>"}],
  "output_dir": "<absolute-path>"
}
```

任务结果只包含 `completed/needs_input/failed/cancelled`、产物路径、简短摘要与问题引用。这里 `completed` 只表示 worker 返回；领域任务完成必须再依据需求控制器或开发门控确认。长日志落盘，不回灌主 agent 全量上下文。

每次提交验证 run、phase、revision、input hash 与租约；迟到结果拒收。启动、提交与恢复操作带幂等键，断线不能造成重复提交或重复上库。

## 上线前必须补的实际边界

1. **并发写入。** 当前 `save_state()` 是固定 `.tmp` 加 `os.replace()`；`emit()` 读取链尾再追加，函数内部没有把这两步包进跨进程锁。原子替换不等于事务。服务需串行化同一 run 的所有状态/证据写入，并处理崩溃恢复；旧 CLI 入口也必须参与同一锁协议，或部署时禁止绕开服务写入。
2. **读取的副作用。** `cmd_next()` 会写控制快照，`cmd_status()` 可能刷新维测。因此不能把二者当成可任意并发轮询的纯读接口。可在服务中串行封装，后续再拆出纯读取方法。
3. **签名的信任边界。** 密钥位于证据目录外、权限为 600，并不天然阻止同一 OS 用户且拥有相同读权限的 worker 获取密钥。`load_secret()` 与 `emit()` 本身也不认证调用者。需要由独立权限的受控服务持有密钥和不可改写的 gate 代码；否则应准确描述为防误改/检测篡改，而不是对任意 agent 的强隔离。
4. **人工身份。** `cmd_consent()` 验证证据绑定，但 `--token` 是调用者传入的字符串，不能仅凭它证明真人审批。新增宿主决策来源与证据绑定，禁止 worker 直接使用 consent 写入能力。
5. **避免规则漂移。** 入口文本提到最多重试 3 次，控制包默认 retry/repair 预算各 2。需要先统一计数口径（首次尝试是否计入）再固化配置，由一处代码派生给提示词。
6. **套餐与环境不能隐式继承。** 新启动的 Codex 进程依赖自己的本地配置、登录状态和可用模型；与父任务同账户，不等于自动继承父任务临时模型覆盖、MCP 工具、权限和设备环境。需要明确传递非敏感配置并验证认证模式。限额不足返回可恢复状态，不能静默切换 API key。

如果以后自建长会话执行后端，使用官方 App Server 的线程/轮次与认证接口，持久化运行映射并转发必要事件。不要把它包装成无状态 Chat Completions 模型接口。[Codex App Server](https://learn.chatgpt.com/docs/app-server)

## 建议落地顺序与验收

**第一步：打通开发闭环。** 增加 delivery adapter、两个领域角色定义的设计、任务 envelope；先实现 P1→人工确认→P2，以及中断后恢复。这个切面可以验证模型调用路径、证据推进和交接，无需一开始接完真机与 CI。

**第二步：补齐需求控制器。** 固化 R1–R9、独立 reviewer、用户决策、proposal 子任务与 AR 交接。用仓库已有需求产物作为回归输入，但明确它们只是文档样本，不是当前源码证据。

**第三步：接入完整交付。** 完成构建/设备租约、P4–P8 作业跟踪、确认桥接、取消与恢复；需要真实环境验证。根据运行数据决定是否再采用 DSH 调用 Codex provider 的外部 agent 形态。

验收重点：

- 无有效证据时，伪造 worker 成功或修改 receipt 不能推进。
- 两个 worker 领取同一阶段只能成功一个；过期 revision 的提交被拒绝。
- 在产物写完、gate 完成、advance 完成等不同位置中断，都能正确恢复，P8 不重复提交外部动作。
- Requirement Gate 通过不能跳过开发 P1；AR 或源码 HEAD 改变必须触发相应重验。
- 需要用户意见时有具体产物和问题，恢复后旧确认不能绑定新证据。
- 在 ChatGPT 登录的 Codex 测试环境中验证执行路径和额度使用；未执行该测试前不宣称套餐复用已实测成功。

现有 `test_advance_next.py`、`test_control_protocol.py`、`test_manifest_chain.py`、`test_advance_consent.py`、`test_reset_clears_controls.py`、`test_requirement_metrics.py` 可作为回归基础；新增测试集中覆盖边界和恢复，不重复复制现有门控实现。
