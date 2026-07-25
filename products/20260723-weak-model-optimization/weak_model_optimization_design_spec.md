# AI-AR-workflow 弱模型阶段化门控与窗口隔离设计方案

- 版本：v4
- 日期：2026-07-24
- 状态：设计收敛稿（可进入实施）
- 适用范围：`ohos-ar-dev-workflow` + `ohos-ar-dev-phases`
- 文档目标：在保留现有 signed evidence / consent / `advance.py` 真相层的前提下，补齐一套面向弱模型的**阶段控制层 + 窗口隔离层 + 失败恢复协议层**，使中等能力模型能够稳定执行整条 workflow。

---

## 1. 结论摘要

当前体系对弱模型已经具备较强的**结果层管控**，但对弱模型的**过程层管控**仍不足以支撑高置信度全链路执行。

### 1.1 结果层：当前已经较强

当前已经较稳定地防止以下问题：

- 通过自由文本伪造阶段通过
- 通过手改导航文件推进 phase
- 通过旧日志 / 旧报告 / 旧 CI 回放冒充当前结果
- 复用旧 consent 令牌推进新结果
- 在功能漂移后继续错误推进

原因是：

- `advance.py` 仍是 `pipeline.json` 的唯一状态写入器
- `evidence/manifest.jsonl` 仍是唯一真相源
- artifact sha256 + HMAC + hash-chain 已经建立
- P2/P3/P4/P5/P6 已有结构化硬门控基础
- `phase_summary.json` / `failure_report.json` / `next_action.json` 已经被压回导航层，而非放行层

### 1.2 过程层：当前仍然偏弱

当前对弱模型仍存在以下风险：

- 把当前阶段和下一阶段混着做
- 长上下文污染导致规则遗忘
- 读太多长文档后丢失主线
- 不清楚当前阶段允许改什么、禁止改什么
- 编译失败后，新窗口接不上前序开发与测试上下文
- 明明只该做当前阶段，却提前讨论更后面的阶段
- Repair / Regenerate 边界仍偏“原则判断”，不够机械
- P7 / P8 这类高耦合阶段对弱模型仍然过重

因此：

> 当前系统已经比较能管住“是否能推进”，但还没有充分管住“模型在推进前如何只做当前阶段该做的事，以及失败后如何稳定回到正确分支”。

本方案解决的是第二个问题。

---

## 2. 已完成基线（保留并复用）

以下内容已经落地完成，本方案直接以它们为基线继续设计：

- [已完成] `skills/ohos-ar-dev-workflow/references/pipeline-schema.md`
  - 已同步 `status --json`、`next_action.json`、`todo.json`、`phase_summary.json`、`failure_report.json` 的导航层定位

- [已完成] `skills/ohos-ar-dev-workflow/references/gate-contract.md`
  - 已明确 manifest 是唯一真相源，导航文件没有放行权

- [已完成] `skills/ohos-ar-dev-workflow/references/evidence-protocol.md`
  - 已明确签名账本、导航层、弱模型恢复路径、P2/P3/P5/P6 结构化证据语义

- [已完成] P2 / P3 / P5 / P6 的 `phase_summary.json` / `failure_report.json` 输出统一
  - 已可供 `advance.py next` 和弱模型做导航消费

- [已完成] 当前后段 repair continuity 主链路已落地
  - `gate_build.py`、`gate_test_ut.py`、`gate_device_func.py`、`gate_integration.py`、`gate_upload_ci.py` 已生成/消费 `bundle_revision_from`、`suspect_files`、`suspect_tests`、`downstream_revalidate_scope`、repair/retry 计数与人工升级字段
  - P4/P5/P6（逻辑 P6/P7/P8 对应的当前物理后段）已补齐 completion receipt / handoff 或 final receipt 级控制产物

这意味着：

> 真相层与导航层已经基本分离成功。接下来需要补的是**执行过程控制层**、**阶段窗口隔离层**与**失败恢复协议层**。

---

## 3. 设计目标

### 3.1 一级目标

1. 把大而全的设计文档拆成阶段化执行包
2. 每阶段新起窗口，只消费当前阶段最小必要上下文
3. 把功能开发、测试开发、编译验证、测试执行边界彻底分开
4. 让编译失败后的修复不依赖长对话记忆，而依赖结构化 repair packet
5. 把 Repair / Regenerate 的分流进一步机械化
6. 保持现有真相层不变：放行权仍只来自 signed evidence + consent + `advance.py`

### 3.2 二级目标

1. 降低弱模型对长上下文记忆的依赖
2. 降低“下一步该做什么”对模型自由推理的依赖
3. 让 resume 优先依赖结构化 packet，而不是长历史对话
4. 让失败恢复具备稳定分类、稳定交接、稳定熔断
5. 让每个阶段都可被压缩为一个小而清晰的执行单元
6. 让高复杂度阶段（P7/P8）进一步子阶段化

### 3.3 非目标

1. 不重写现有 HMAC / manifest / evidence 链路
2. 不取消人工 consent
3. 不把 packet / summary / handoff 变成第二真相源
4. 不要求一次性重构当前所有脚本编号与物理目录

---

## 4. 总体架构：三层体系

### 4.1 第一层：真相层（保留现状）

负责：

- `evidence/manifest.jsonl`
- artifact sha256
- HMAC / hash-chain
- consent binding
- `advance.py`
- drift / tamper / replay 校验

特点：

- 唯一放行依据
- 与模型能力强弱无关
- 绝不能被阶段文档替代

### 4.2 第二层：阶段控制层（新增）

负责：

- 当前阶段目标
- 当前阶段准入条件
- 当前阶段输入边界
- 当前阶段输出边界
- 当前阶段允许动作 / 禁止动作
- 当前阶段退出条件
- 当前阶段失败分类
- 当前阶段对下一阶段的交接格式

特点：

- 面向弱模型
- 是执行 contract
- 不是放行 truth

### 4.3 第三层：窗口运行层（新增）

负责：

- 每阶段新起窗口
- 每窗口只加载当前阶段必需材料
- 每阶段结束只产出标准交接包
- 编译失败时通过 repair packet 保持上下文连续
- 通过 memory card / artifact index / startup order 降低迷路概率

特点：

- 面向上下文治理
- 降低弱模型污染
- 用 packet 交接代替“靠聊天记忆接续”

---

## 5. 新阶段命名与顺序（不再使用 1a / 1b）

本方案不再使用 `P1a / P1b` 或 `1a / 1b` 命名，而是采用新的**逻辑阶段序列**。

> 注意：这里定义的是**逻辑阶段**，用于过程控制设计；是否映射为当前脚本的物理 phase 编号，实施时再决定。

| 逻辑阶段 | 阶段名 | 目标 |
|---|---|---|
| P0 | bootstrap | 环境初始化、run 建立、基础签名状态落地 |
| P1 | design-orchestrate | 冻结全局设计，生成阶段 packet 与 bundle |
| P2 | feature-develop | 完成功能代码开发 |
| P3 | test-develop | 完成测试/用例代码开发 |
| P4 | build-verify | 对完整 bundle 做正式编译验证 |
| P5 | unit-verify | 执行 UT，验证 fresh report 与 gtest 覆盖 |
| P6 | device-verify | 真机验证，校验 provenance / side-effect / differential |
| P7 | integration-quality | 集成、MST、质量报告、review 硬门控 |
| P8 | upload-ci | push / PR / CI / SHA 绑定 |

### 5.1 为什么这样重排

你提出把“P3 用例开发”和“P2 编译”调换位置，核心价值是：

> **先把功能代码和测试代码都写完，再做正式编译验证。**

这样可以把开发阶段与验证阶段分得更清楚：

- P2 只负责功能开发
- P3 只负责测试开发
- P4 才是第一次正式编译 gate
- P5 才是第一次正式 UT 执行 gate

### 5.2 开发冻结点

为了进一步强化边界，在 P2 结束后新增逻辑概念：

# `development_freeze_snapshot`

它至少包含：

- 实际 touched files
- changed_files baseline 对齐结果
- requirement → file 覆盖摘要
- 当前 bundle revision
- 风险列表

P3 默认只允许：

- 在声明的测试范围内开发
- 读取 freeze snapshot
- 不突破功能代码冻结边界

若 P3 必须改功能代码，则不默许继续，而是进入 Repair / Regenerate 判定。

---

## 6. P1 新角色：design-orchestrate

抽离出来的原设计阶段，统一命名为：

# `P1 design-orchestrate`

它的职责不是单纯“写一份设计文档”，而是：

1. 冻结全局 AR 设计
2. 固化 requirement / changed_files / build_artifacts / test_cases / device_cases
3. 生成后续每个阶段专用的 Stage Packet
4. 生成初始 Development Bundle
5. 定义每个阶段的输入、输出、允许动作、禁止动作、准入条件、退出条件、成功语义、失败分类、交接模板

也就是说：

> P1 不再只是“设计检查阶段”，而是整个阶段化执行体系的**编排源头**。

---

## 7. 核心新概念：Development Bundle

为了解决“新起窗口后，编译失败如何连贯回修，再与后续测试对齐”的问题，本方案引入：

# `development bundle`

它表示某一轮功能开发 + 测试开发的完整交付单元。

一个 bundle 至少包含：

- bundle_id
- bundle_revision
- requirement IDs
- changed_files 计划
- 测试/用例计划
- build target
- test target / suites
- device cases
- 风险点
- 最近一轮修订说明
- downstream revalidate scope

### 7.1 bundle 的阶段关系

- P1 输出：初始 bundle 定义
- P2 输出：功能开发完成后的 feature half
- P3 输出：测试开发完成后的 test half
- P4 输入：完整 bundle
- P5/P6/P7/P8 消费：某个通过验证的 bundle revision

### 7.2 bundle 的意义

它把原本散落在长对话里的上下文，收敛成一个可被窗口稳定接续的实体：

- 下一窗口不用重新理解全局需求
- 下一窗口只需接 bundle + 当前阶段 packet + handoff / repair packet
- 失败后是否需要向下重验，可通过 bundle revision 传播

---

## 8. 编译失败后的连续性：用 Repair，不默认回设计

### 8.1 类型 A：局部 Repair（默认）

适用场景：

- include / import / 依赖声明错误
- 链接错误
- target 配置小问题
- 新增测试导致的构建错误
- 测试引用错误
- 头文件、命名、路径等工程性问题

这类问题的本质是：

- bundle 意图没变
- requirement 没变
- changed_files 边界没变
- 只是当前 revision 没编过

处理方式：

1. 生成 `Repair Packet`
2. 新开 repair window
3. 允许在 packet 指定 scope 内修复
4. 修复后 bundle revision 升级
5. 回到 P4 重新验证
6. 根据 `downstream_revalidate_scope` 决定后续要不要重跑 P5 / P6 / P7

### 8.2 类型 B：Regenerate（升级回 P1/P2/P3）

适用场景：

- 修复编译错误必须改超出原 `changed_files` 规划的路径
- build_artifacts 目标变化
- test_cases 覆盖语义变化
- device_cases 语义变化
- requirement 含义变化
- 为了让编译通过而改变了原设计边界

处理方式：

1. 停止纯 repair
2. 回到 P1 / P2 / P3 重新派生相关 packet
3. 生成新 bundle revision 基线
4. 再重新走 P4/P5/P6

### 8.3 核心判断原则

默认原则：

> **编译失败优先进入 repair 回路，而不是直接回 design-orchestrate。**

升级原则：

只有当修复会改变以下任一内容时，才升级为 regenerate：

- requirement 语义
- changed_files 边界
- build_artifacts 集
- test_cases 覆盖目标
- device_cases 验证目标

---

## 9. Retry / Repair / Regenerate 三分回路

### 9.1 Retry

适用于：

- 命令失误
- 短暂环境问题
- 报告缺失但代码未变
- 工具执行偶发波动

特点：

- 不变更 bundle revision
- 同阶段内重试
- 必须受 `max_retry_rounds` 限制

### 9.2 Repair

适用于：

- 编译错误
- 测试编译依赖修复
- 测试引用修复
- 小范围配置修复

特点：

- 新开 repair window
- bundle revision 升级
- 不改设计边界
- 必须显式声明 `downstream_revalidate_scope`

### 9.3 Regenerate

适用于：

- 设计边界变化
- changed_files 扩张
- build/test/device contract 变化
- requirement 语义变化

特点：

- 回到 P1 / P2 / P3 重新派生
- 生成新的 bundle 基线

### 9.4 熔断与人工升级

为了避免弱模型死循环，所有阶段都必须有：

- `max_retry_rounds`
- `max_repair_rounds`
- `human_escalation_conditions`

默认建议：

- 同一 failure class 的 retry 超过 2 次 → 人工升级
- 同一 bundle revision 的 repair 超过 2 轮 → 人工升级
- 同一阶段出现 Repair / Regenerate 判定冲突 → 人工升级

---

## 10. Repair / Regenerate 判定矩阵

必须把 Repair / Regenerate 的分流从“原则”再收紧成“矩阵”。

| 变化项 | 允许 Repair | 必须 Regenerate |
|---|---:|---:|
| include / import / link 修复 | 是 | 否 |
| target 配置小修 | 是 | 否 |
| 测试引用路径修复 | 是 | 否 |
| 仅测试支撑代码小修 | 是 | 否 |
| 新增未声明业务文件 | 否 | 是 |
| requirement 语义变化 | 否 | 是 |
| build_artifacts 列表变化 | 否 | 是 |
| test_cases 目标变化 | 否 | 是 |
| device_cases 目标变化 | 否 | 是 |
| changed_files 边界扩张 | 否 | 是 |
| 为修复而新增新的外部依赖能力 | 否 | 是 |

同时每个 Repair Packet 必须带：

- `repair_disallowed_if`
- `regen_trigger_if`

使弱模型无需自行理解边界文字。

---

## 11. Downstream Revalidate Scope

当前方案若不补这一层，repair 之后的连续性仍不完整。

新增字段：

# `downstream_revalidate_scope`

含义：

- 这次修复完成后，必须把哪些下游阶段视为失效并重跑

建议枚举值：

- `P4_only`
- `P4_P5`
- `P4_to_P6`
- `P4_to_P7`
- `all_downstream`

判定原则：

- 纯编译问题，未影响测试语义 → `P4_P5`
- 改动了测试支撑或断言引用 → `P4_to_P6`
- 改动了设备相关逻辑或观测点 → `P4_to_P7`
- 改动触及 review / packaging / output semantics → `all_downstream`

这使得：

> 修完之后不是“感觉上接着跑”，而是明确知道哪些下游验证已经失效。

---

## 12. 文档体系：总设计 + 阶段包 + 交接包 + 修复包 + 启动卡

### 12.1 Global Design Doc

保留一份全局设计文档，只负责描述：

- AR 总目标
- requirements
- 全局 changed_files
- build / test / device 验证总边界
- 阶段依赖关系

### 12.2 Stage Packet

每个阶段唯一执行入口，固定描述：

- 当前阶段目标
- 当前阶段准入条件
- 当前阶段输入边界
- 当前阶段输出边界
- allowed context / actions
- forbidden context / actions
- exit 条件
- failure classes
- handoff template

### 12.3 Handoff Packet

阶段结束后交给下一阶段窗口的事实摘要。

### 12.4 Repair Packet

阶段失败后交给修复窗口的最小连续上下文。

### 12.5 Phase Memory Card

每阶段再补一张极小启动卡，字段严格受控，优先级高于长 handoff。

建议字段：

- current phase
- bundle_revision
- current blocker
- forbidden action set
- next expected command class
- last failure class
- escalation needed?

它的作用是：

> 让弱模型在新窗口启动时先抓到 5~10 个最重要事实，不先淹没在长 packet 里。

---

## 13. 阶段准入与退出协议

这是把置信度拉到 80%+ 的关键之一。

### 13.1 准入条件（Entry Preconditions）

每个阶段必须新增：

- `entry_preconditions`
- `entry_blockers`
- `entry_checklist`

示例：P4 build-verify 的准入条件必须至少包括：

- P3 handoff 已存在
- 完整 bundle 已形成
- 当前不存在未关闭 repair packet
- required inputs 全满足
- 上游阶段没有 pending human gate

### 13.2 退出条件（Exit Conditions）

每个阶段必须新增：

- `exit_conditions`
- `exit_artifacts_required`
- `exit_state_transition`

示例：P3 test-develop 的退出不只是“测试写完”，而是：

- test intent matrix 已生成
- bundle 已更新
- freeze 边界未被突破
- handoff 已生成
- 未触发 regenerate 条件

### 13.3 Completion Receipt

每阶段退出时再生成一个极短的：

# `completion_receipt.json`

建议字段：

- phase
- bundle_revision
- semantic_done
- truth_layer_pass_known
- next_phase_ready
- human_gate_pending

作用：

- 给 orchestrator 或更弱模型快速判断本阶段是否完成
- 避免它把长 handoff 当唯一退出证明

---

## 14. Artifact / Evidence / Report 索引

为了避免弱模型在目录里迷路，每个 packet 必须带三类索引：

- `artifact_index`
- `evidence_index`
- `report_index`

至少要说明：

- 当前阶段主日志在哪里
- 当前阶段失败摘要在哪里
- 当前阶段真相层核心证据在哪里
- 当前阶段下一窗口最应该先读哪个文件

这样弱模型不会在同一阶段读取大量无关文件。

---

## 15. 窗口启动顺序（强制顺序）

仅仅说“加载四类内容”不够，必须把顺序写死。

每个新窗口必须按以下顺序执行：

1. `phase_memory_card.json`
2. `advance.py status --json`
3. 当前阶段 `Stage Packet`
4. 最新 `Handoff Packet` 或 `Repair Packet`
5. 当前阶段 `completion_receipt.json`（若存在）
6. 当前阶段 `failure_report.json` / `phase_summary.json`
7. 当前阶段必要 evidence

禁止的顺序：

- 先读全局 README
- 先读大段日志
- 先读后续阶段 packet
- 先回看整条历史对话

这是置信度从 60% 提到 80% 以上的关键操作层约束。

---

## 16. P3 测试意图矩阵协议

P3 的 `test intent matrix` 还需要再机械化。

每条测试记录建议固定字段：

- `test_case_id`
- `covers_requirement_ids`
- `expected_target`
- `expected_suite`
- `expected_gtest`
- `depends_on_files`
- `negative_cases`
- `device_followup_needed`

这样到 P5：

- 弱模型不需要重新解释“这条测试为什么存在”
- 只需要验证矩阵是否兑现

---

## 17. P4 真机阶段继续沿用已完成增强方向

P6 device-verify 的过程控制必须建立在当前已经完成文档同步的方向上：

- [已完成] `evidence-protocol.md` 中对 nonce / baseline-trigger / provenance / side-effect / negative-control 的说明同步
- [已完成] `gate-contract.md` 中对 P4 结构化证明字段的说明同步

在本设计层中，P6 device-verify 的 packet 必须明确携带：

- `device_cases[].process`
- `device_cases[].artifact_loaded`
- `device_cases[].side_effect`
- `device_cases[].absent_before_trigger`

同时还要定义证据优先级：

1. process provenance
2. artifact_loaded proof
3. side_effect proof
4. baseline/trigger differential
5. runtime/e2e marker
6. 纯文本 marker 命中

这样弱模型不会把 P4 理解成“去找几个 marker 就行”，而是理解成：

> 必须证明“正确进程真实加载了正确产物，并且真实功能触发前后存在差分，还留下了真实副作用”。

---

## 18. P7 / P8 子阶段协议

这是把整体置信度拉向 90% 的关键之一。

### 18.1 P7 integration-quality 子阶段

即使逻辑上仍算一个阶段，也要在 packet 内再拆成固定子状态：

- `P7.a integration-run`
- `P7.b quality-check`
- `P7.c review-check`
- `P7.d human-review-await`

每个子状态都要有：

- substate goal
- entry conditions
- exit conditions
- expected artifacts
- next substate

### 18.2 P8 upload-ci 子阶段

建议固定子状态：

- `P8.a precheck`
- `P8.b local-review`
- `P8.c consent-await`
- `P8.d push-pr`
- `P8.e pr-review`
- `P8.f ci-green`
- `P8.g finalize`

这样：

- 弱模型不需要一次消化整个 P8
- 失败时也能在子状态级别分流

---

## 19. 人工介入触发条件清单

除了原有 P1/P4/P5/P6 的人工审批点，还必须定义**异常情况下的人工升级条件**。

建议每阶段都支持：

- `human_escalation_conditions`

默认触发条件包括：

- repair 超过 2 轮
- retry 超过 2 次
- 需要扩张 changed_files
- 需要新增 requirement 语义
- Repair / Regenerate 判定冲突
- P4 中 provenance / side-effect / differential 结论冲突
- P8 中 review / CI / SHA binding 结论冲突

---

## 20. 达到 80%+ / 90% 置信度所需条件

### 20.1 80%+ 的必要条件

若要把中等能力模型的完整执行置信度拉到 80% 以上，以下设计必须全部落实：

1. 阶段准入条件表
2. 阶段退出条件表
3. Repair / Regenerate 判定矩阵
4. downstream revalidate scope
5. phase memory card
6. artifact/evidence/report index
7. 强制窗口启动顺序
8. P7 / P8 子阶段协议
9. retry / repair 熔断
10. human escalation 条件清单

### 20.2 接近 90% 的附加条件

若要进一步逼近 90%，还需要满足额外前提：

1. P4、P7、P8 的外部接口稳定
   - 真机环境、报告生成、PR/CI API 不频繁抖动
2. 目标 AR 属于中低复杂度
   - 不跨太多子系统，不引入新依赖
3. Packet 协议有机器字段版本
   - 不仅有 Markdown，还要有 JSON/YAML
4. repair 影响传播已严格实现
   - 修一次就知道必须重验到哪层
5. 物理目录与逻辑阶段映射稳定
   - 弱模型不需要自己推断路径

### 20.3 现实判断

- **80%+**：是本方案应追求、也相对现实的目标
- **90%**：只有在协议彻底收紧 + 外部链路稳定 + AR 复杂度受控时才现实

也就是说：

> 90% 不是单靠“多写文档”得到，而是靠“协议化 + 子阶段化 + 外部稳定性 + 熔断机制”共同达到。

---

## 21. 为什么这套方案能显著提升弱模型置信度

### 21.1 把大文档理解变成小 contract 执行

弱模型不擅长长期保持大设计，但擅长按固定模板和固定边界执行。

### 21.2 把全流程代理变成单阶段代理

每个窗口只负责当前阶段，能明显降低串阶段概率。

### 21.3 把记忆接力变成 packet 接力

连续性不依赖“记住前面聊过什么”，而依赖 bundle + handoff + repair。

### 21.4 把失败恢复从自由推理变成矩阵 + 熔断 + 升级

Retry / Repair / Regenerate 三分法配合矩阵与熔断机制，使失败分流更稳定。

### 21.5 把高复杂阶段变成子状态机

P7 / P8 被子阶段化后，不再要求弱模型在单次上下文里同时管理多种外部状态。

---

## 22. 主要风险与规避原则

### 风险 1：packet 太多，和总设计漂移

规避：

- 所有阶段 packet 必须定义为由 `P1 design-orchestrate` 派生
- 不允许各阶段各自手写、彼此脱节

### 风险 2：packet 被误当放行依据

规避：

- 在所有 packet / handoff / repair / memory card 文档中重复声明：它们不是 PASS 依据
- 放行仍只认 signed evidence + consent + `advance.py`

### 风险 3：新窗口导致信息断裂

规避：

- 新窗口必须以 memory card + packet 为入口
- 禁止只靠“重开一个聊天窗口”而不提供 handoff / repair

### 风险 4：编译失败后反复震荡

规避：

- 默认进入 repair 回路
- 只有影响 design boundary 才升级为 regenerate
- repair / retry 超阈值就人工升级

---

## 23. 建议实施顺序

### 第一步：补齐执行协议硬约束

实施项：

- entry / exit conditions
- completion receipt
- memory card
- artifact/evidence/report index
- startup order

### 第二步：补齐恢复协议硬约束

实施项：

- repair/regenerate matrix
- downstream revalidate scope
- max retry / max repair
- human escalation conditions

### 第三步：补齐高复杂阶段子状态机

实施项：

- P7 substates
- P8 substates
- substate-level handoff

### 第四步：将 packet 推向 machine-readable

实施项：

- packet JSON/YAML 字段稳定化
- 与 Markdown 解释层并存

---

## 24. 最终结论

本方案的核心不是重写现有 gate，而是在现有真相层之上补三层能力：

1. **阶段控制层**
2. **窗口隔离层**
3. **失败恢复协议层**

其关键变化是：

1. 不再使用 `1a / 1b` 命名
2. 抽离后的设计阶段统一命名为 `P1 design-orchestrate`
3. 阶段顺序调整为：功能开发 → 测试开发 → 编译验证 → 单元验证
4. 每阶段新起窗口，但连续性由 bundle / handoff / repair / revalidate-scope 保证
5. 编译失败默认走 repair，而不是直接打散前序开发上下文
6. P7 / P8 进一步子阶段化
7. 所有新增文档都只能做执行控制，不能变成第二真相源

最终目标是把系统从：

- 强模型主导的协议型流水线

升级为：

- 结构化状态主导、弱模型可执行、阶段边界清晰、失败恢复连续、可熔断、可升级的阶段化流水线

在落实本稿新增硬约束后，目标置信度应提升为：

- **中等复杂度 AR：80%+**
- **低复杂度且外部环境稳定：可逼近 90%**

---

## 25. 本文档定位

本文件用于：

1. 固化新的阶段命名与顺序
2. 明确 `design-orchestrate` 的新职责
3. 说明弱模型过程控制层、窗口隔离层、失败恢复协议层的整体设计
4. 说明编译失败后的连续性保证方式
5. 给后续 packet 模板细化与实现提供蓝图

当前为设计收敛稿，目标是直接指导下一步实施。