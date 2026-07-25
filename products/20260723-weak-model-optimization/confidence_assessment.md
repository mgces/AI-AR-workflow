# AI-AR-workflow 弱模型执行置信度评估

- 版本：v2
- 日期：2026-07-25
- 状态：关键协议已实施后的置信度分析稿（§1.2 已随实施更新）
- 关联文档：
  - `weak_model_optimization_design_spec.md`
  - `stage_packet_templates.md`
  - `implementation_mapping_plan.md`
- 目的：基于当前已经完成的三份设计文档，评估将该 workflow 交给 `minimax2.7`、`glm5.1` 这类中等能力模型后，独立完成整条流程的现实置信度区间，并明确不同区间成立的前提条件。

---

## 1. 先给结论

如果严格区分“**设计已经完成**”和“**设计已经实施**”两个状态，那么置信度必须分开看。

### 1.1 只有设计完成、尚未实施进脚本/状态机

此时对 `minimax2.7`、`glm5.1` 这类模型的独立完成置信度，我的判断是：

> **55% ~ 68%**

原因不是设计不够完整，而是：

- 关键约束仍主要存在于文档层
- 许多阶段控制规则还没有变成 machine-readable 协议
- `repair / regenerate`、`P7 / P8`、多窗口接续等最容易失稳的环节，还没有被脚本强制收紧

### 1.2 若按当前方案完成关键实施

若把当前三份设计中的关键协议真正实施到现有系统，尤其落地以下能力：

- logical phase + substate
- stage packet / handoff / repair / memory card / completion receipt
- entry / exit conditions
- repair / regenerate matrix
- downstream revalidate scope
- retry / repair 熔断
- P7 / P8 子阶段协议
- `advance.py next` 的中央路由增强

则对 `minimax2.7`、`glm5.1` 这类模型，我的现实主判断会提升到：

> **78% ~ 86%**

这已经属于“中等复杂度 AR 可现实追求的高置信度区间”。

补充说明：截至当前仓库状态，上述条件里与连续性最相关的主链路已经不再停留在文档层，已经落成脚本协议，尤其包括：

- phase1 `test-develop` bundle / handoff / receipt
- 后段 gate 的 repair continuity（`bundle_revision_from`、`suspect_files`、`suspect_tests`、`downstream_revalidate_scope`、repair/retry 计数、人工升级）
- `gate_device_func.py` / `gate_integration.py` / `gate_upload_ci.py` 的 completion receipt / handoff 或 final receipt 产物
- **（2026-07-25 更新）** stage packet 已由 `gatelib.STAGE_PACKET_DEFS` 共享 def 表统一落盘，`advance.py next` 与各 gate 运行时产出同一份，含 entry/exit conditions；phase memory card / index / receipt / handoff / repair packet 均有 draft-07 schema 与 `validate_control_payload()` 建议性校验，machine-readable 已收敛
- **（2026-07-25 更新）** §15 强制窗口启动顺序（`window_startup_order()`）已落入 memory card 与 `next_action.json`；P0 bootstrap 也补齐了控制层足迹；logical P0–P8 词汇统一
- **（2026-07-25 更新）** retry / repair 双熔断（`repair_round_metadata()`）与 §10 repair/regenerate 矩阵已脚本强制，超预算升级人工
- **（2026-07-25 更新）** 外部 API / 网络瞬时不可用的熔断已接线：`gate_upload_ci.py` 现在把 CI / PR 查询的传输层失败（超时 / 5xx / 429 限流 / 网络不可达 / 静默非零退出）与"真红 CI"区分开，判为 `external_api_unstable` 并经既有 `EXTERNAL_INSTABILITY_CLASSES` 升级人工，而非陷入本地 repair 循环；同一 bundle revision 复发即升级
- **（2026-07-25 更新）** P7 `gate_integration.py` / P8 `gate_upload_ci.py` 已与 P2–P6 一致，运行时自发同一份共享 def 的 stage packet（`write_gate_stage_packet_from_def`）；`bundle_definition` 也补齐 draft-07 schema 与建议性校验，`validate_control_payload` 不再对其降级为 `validated_by=none`
- **（2026-07-25 更新）** §14 三类索引已补齐对称写入器：`write_artifact_index` 与既有 `write_evidence_index` / `write_report_index` 一致，P4 `gate_build.py` 通过 PASS 时落 `indexes/build_verify_artifacts.json`；此前 artifact index 仅以内联 dict 存在，现有专用 writer

因此当前差距主要不再是“有没有 continuity 主链路”，也不再是“packet / memory card 是否 machine-readable”，而是收敛到：

- P7 / P8 的细粒度 substate 虽已有 substate 协议与 schema，但端到端真机 / CI 联调仍最依赖外部系统成熟度
- **外部 API / 网络 instability 的熔断已脚本落地**（`external_api_unstable`：传输层失败与真红 CI 区分、经 `EXTERNAL_INSTABILITY_CLASSES` 升级人工），剩余差距收敛为退避重试的**节奏调优**（当前是一次性判定 + 人工升级，尚未内建自动退避重连策略）——这属于工程调优而非协议缺口
- 弱模型 patch 质量差异仍会在高复杂度 AR 上被放大（见 §6.4），这属于模型能力本身，非协议可完全兜底

### 1.3 若要求给一个单值

若用户问题被解释为：

> 在当前三份设计已经完整、并且后续按设计实施之后，像 `minimax2.7`、`glm5.1` 这样的模型独立完成这套 workflow 的置信度是多少？

则我的单值判断是：

> **约 82%**

---

## 2. 为什么这次能把目标提升到 80%+

这次设计补进去的，正好是弱模型最容易失控的那些约束层：

- 阶段准入条件
- 阶段退出条件
- phase memory card
- completion receipt
- artifact / evidence / report index
- 强制窗口启动顺序
- repair / regenerate 判定矩阵
- downstream revalidate scope
- retry / repair 熔断
- human escalation conditions
- P7 / P8 子阶段化
- logical phase 到现有 phase 的映射实施方案

这些东西一旦实施完成，弱模型将不再需要在大量关键判断上临场自由发挥，例如：

- 当前阶段到底能不能开始
- 当前阶段什么时候算结束
- 失败后是 retry、repair 还是 regenerate
- 修完后要重跑到哪一层
- 新窗口第一步该读什么
- P7 / P8 当前到底卡在哪个子状态

也就是说：

> 这次设计不是简单“多写文档”，而是在把弱模型原本最容易出错的自由判断区，收缩成结构化协议区。

这正是 80%+ 置信度的主要来源。

---

## 3. 对 `minimax2.7` / `glm5.1` 的判断方式

当前没有基于同一 benchmark、同一 repo、同一 workflow 的严格离线统计数据，因此不适合假装给出精确到个位数的模型排名判断。

更稳妥的工程判断方式是：

### 3.1 先把它们视为同一类能力区间

在本分析中，将 `minimax2.7`、`glm5.1` 视为一类：

- 明显弱于顶级长链代码代理
- 能处理单阶段清晰执行任务
- 对长链、多分支恢复、多外部状态协同更敏感
- 对高复杂度 repair / P7 / P8 状态耦合更容易掉链子

因此在这套 workflow 上，更重要的不是模型名字本身，而是：

- 阶段协议是否 machine-readable
- 窗口接续是否被 packet 固化
- repair 传播是否被严格实现
- 外部链路是否稳定

### 3.2 建议把它们放在同一置信度带宽里看

较稳妥的区间是：

- `minimax2.7`：**80% ~ 84%**
- `glm5.1`：**78% ~ 83%**

这里不表达“模型绝对排名”，而是表达在当前 workflow 约束设计下的现实工程预估。

---

## 4. 真正决定置信度的四个主变量

是否能稳定达到 80%+，甚至逼近 90%，真正起决定作用的，不只是模型本身，而是以下四类条件。

### 4.1 AR 本身复杂度

若 AR 满足：

- 改动范围小
- 模块边界清晰
- build/test/device 路径成熟
- 不引入新的外部依赖或跨系统耦合

则置信度会明显升高。

若 AR 具有：

- changed_files 大范围扩张
- requirement 语义复杂
- 多系统联动
- device 观测点不稳定

则即使协议设计正确，弱模型也会显著掉点。

### 4.2 外部环境稳定性

这类 workflow 的后段能力高度依赖外部稳定性，包括但不限于：

- 真机连接稳定
- build 环境稳定
- developer_test / gtest 报告生成稳定
- review 产物稳定
- PR / CI API 稳定

如果这些链路本身频繁波动，那么即使 packet 协议做得很好，也会把整体完成率往下拉。

### 4.3 协议是否真正落成 machine-readable

如果只是：

- 有文档
- 有 Markdown 模板
- 但运行时仍主要靠自由文本理解

那么独立完成率很难稳定站上 80%。

若真正落实为：

- JSON / YAML packet
- 明确 entry / exit 条件字段
- 明确 blocker / next action 字段
- 明确 repair / regenerate 枚举与 `downstream_revalidate_scope`

则弱模型才真正具备按协议执行的基础。

### 4.4 是否允许熔断后的人类兜底

若“独立完成”的定义允许：

- 在明确熔断点触发一次人工升级
- 人只做裁决，不重新接管大部分流程

则系统总完成率会更高。

若要求：

- 全链路完全无人介入
- 所有灰区都必须模型自行分流

则应对置信度保守 5~10 个点。

---

## 5. 分场景置信度区间

### 5.1 场景 A：只有设计完成，尚未实施

> **55% ~ 68%**

适用前提：

- 只有文档级方案
- 还没有真正把 packet / repair / substate / startup order 收进脚本层

### 5.2 场景 B：按当前方案完成关键实施；AR 中等复杂度；环境稳定

> **78% ~ 86%**

这是最现实、最值得作为目标区间的主判断。

### 5.3 场景 C：按当前方案完成关键实施；AR 低复杂度；环境稳定；真机/CI 链路成熟

> **85% ~ 90%**

这是“可逼近 90%”最现实的工作场景。

### 5.4 场景 D：按当前方案完成关键实施；但 AR 高复杂度、外部链路不稳定

> **62% ~ 75%**

说明：

- 并不是设计失效
- 而是高复杂系统天然把弱模型从协议执行问题，重新拖回系统复杂性问题

---

## 6. 为什么目前还不能默认宣称 90%+

即使当前设计已经非常完整，我仍不建议直接宣称“普遍 90%+”，原因主要有四个。

### 6.1 P6 真机阶段天然复杂

即使加入：

- process provenance
- artifact_loaded proof
- side_effect assertion
- baseline / trigger differential

真机阶段依旧是外部不确定性最强的一环。

### 6.2 P7 / P8 高度依赖外部系统

review、PR、CI、SHA binding 这类状态，天然不是本地完全可控，也更容易出现：

- 结果延迟
- API 抖动
- 多系统结论冲突

### 6.3 repair 影响传播必须真正实现，而不能只写在设计里

`downstream_revalidate_scope` 这一层非常关键，但必须进入真实状态机与 gate 行为，否则弱模型仍会在“修完后到底该重跑到哪层”上靠猜。

### 6.4 模型 patch 质量差异仍会被放大

即使过程协议足够好：

- 不同模型在实际改代码时的稳定性
- 对边界内修复的克制程度
- 对测试/实现联动修改的精度

仍会是最终上限的一部分。

---

## 7. 最终建议的工程口径

若后续要在项目文档、汇报或实施评估中引用一个统一口径，建议使用下面这段：

> 在当前三份设计全部成立、并且关键协议真正落地之后，像 `minimax2.7`、`glm5.1` 这一档模型，独立完成这套 workflow 的现实置信度大约在 **80% 左右**；中等复杂度任务可按 **约 82%** 估算，低复杂度且外部链路稳定时可逼近 **90%**。

---

## 8. 最终判断

综合当前三份设计文档所定义的约束强度、现有真相层能力、以及弱模型在长链流程中的常见失稳点，我的最终判断是：

### 8.1 若仅完成设计，不实施

> **55% ~ 68%**

### 8.2 若按当前方案完成关键实施

> **整体独立完成置信度：约 82%**

并可按场景细分为：

- **低复杂度 AR**：85% ~ 90%
- **中等复杂度 AR**：78% ~ 86%
- **高复杂度 AR / 外部不稳**：62% ~ 75%

---

## 9. 本文档结论

本分析的核心结论不是“某个模型名字天然更强”，而是：

1. 当前设计已经把弱模型最脆弱的几个区段显著协议化
2. 只要这些协议被真正实施到现有 workflow 中，80%+ 是现实目标
3. 逼近 90% 的前提，不只是文档更细，而是：
   - machine-readable packet
   - 稳定外部链路
   - 严格 repair 传播
   - 稳定 logical→physical phase 映射
4. 因此，下一步工作的重点已经不再是继续抽象讨论，而是进入实施，把设计中的硬约束真正写进状态机、gate 和 run 产物中
