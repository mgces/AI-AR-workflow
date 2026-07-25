# AI-AR-workflow 阶段 Packet 模板详细版

- 版本：v2
- 日期：2026-07-24
- 状态：设计收敛稿（可进入实施）
- 关联主文档：`products/20260723-weak-model-optimization/weak_model_optimization_design_spec.md`
- 用途：细化弱模型阶段控制层中的 `Stage Packet`、`Handoff Packet`、`Repair Packet`、`Phase Memory Card`、`Completion Receipt` 结构，并为 `P0 ~ P8` 每个逻辑阶段提供可直接套用的模板。

---

## 1. 文档定位

本文是主设计文档的配套细化稿，目标不是描述为什么这样设计，而是回答：

1. 每个阶段 packet 里到底该放什么
2. 每个阶段开始时，窗口允许读什么、做什么、产出什么
3. 阶段结束时，如何把可继续执行的上下文交给下一窗口
4. 失败修复时，如何把连续性压缩进 repair packet，而不是靠长对话记忆
5. 如何把阶段准入、退出、重验范围、熔断、人工升级等规则进一步协议化

本文所有 packet 都属于：

- **执行控制层文档**
- **导航层文档**

而不属于：

- 真相层放行依据

必须始终记住：

> packet 不能替代 signed evidence、consent 或 `advance.py`。

---

## 2. Packet 家族总览

本方案使用五类 packet / card：

### 2.1 Stage Packet

作用：

- 定义当前阶段该做什么
- 限定当前阶段能看什么、能改什么、能产出什么
- 限定当前阶段不能越界做什么
- 固化 entry / exit 条件

### 2.2 Handoff Packet

作用：

- 把上一个阶段已经完成的事实、产物、风险和下一步建议交给下一窗口

### 2.3 Repair Packet

作用：

- 在阶段失败但仍可局部修复时，为新 repair window 提供最小连续上下文
- 规定 allowed fix scope、regen 触发条件与 downstream revalidate scope

### 2.4 Phase Memory Card

作用：

- 给新窗口一张极小启动卡
- 在进入长 packet 之前，先加载当前阶段最重要的 5~10 个事实

### 2.5 Completion Receipt

作用：

- 给 orchestrator 或更弱模型一张超短阶段完结证明
- 快速判断当前阶段是否“语义完成 / 真相层已知通过 / 下一阶段可开始”

---

## 3. 通用 Stage Packet 模板（增强版）

```yaml
phase_identity:
  phase_id: P0
  phase_name: bootstrap
  bundle_id: null
  bundle_revision: null
  upstream_dependencies: []
  packet_version: 2
  derived_from:
    - global_design_doc
    - pipeline_state

authority_boundary:
  packet_role: execution-control
  not_truth_source: true
  truth_sources:
    - evidence/manifest.jsonl
    - advance.py
    - consent binding

phase_goal:
  summary: >-
    本阶段的单句目标。
  completion_definition:
    - 语义上完成的条件 1
    - 语义上完成的条件 2
  non_goals:
    - 本阶段不负责的事情 1
    - 本阶段不负责的事情 2

entry_protocol:
  entry_preconditions:
    - 必须具备的前置条件 1
    - 必须具备的前置条件 2
  entry_blockers:
    - 当前不能开始的阻塞项 1
  entry_checklist:
    - 已读取 memory card
    - 已读取 status --json
    - 已验证 required inputs

required_inputs:
  files:
    - path: ...
      reason: ...
      required: true
  fields:
    - name: ...
      source: ...
      required: true
  prior_evidence:
    - phase: ...
      artifact: ...
      reason: ...

indexes:
  artifact_index:
    primary_artifacts:
      - path: ...
        role: ...
  evidence_index:
    primary_evidence:
      - path: ...
        role: ...
  report_index:
    primary_reports:
      - path: ...
        role: ...

allowed_context:
  readable_docs:
    - ...
  readable_dirs:
    - ...
  readable_evidence:
    - ...
  readable_requirements:
    - REQ-001

forbidden_context:
  - 不读取下一阶段 packet 作为当前阶段主依据
  - 不把 phase_summary/failure_report 当作放行依据
  - 不把历史长对话作为主控制源

allowed_actions:
  - 分析当前阶段输入
  - 修改允许范围内文件
  - 执行当前阶段允许的 gate 或检查

forbidden_actions:
  - 修改未授权目录
  - 提前推进下一阶段
  - 跳过 consent / advance / evidence 校验

change_scope:
  allowed_paths:
    - ...
  forbidden_paths:
    - ...
  expansion_policy:
    if_scope_expands: regenerate

expected_outputs:
  code_changes:
    - ...
  artifacts:
    - ...
  summaries:
    - handoff packet
    - phase summary
    - completion receipt
  must_emit_handoff: true

success_semantics:
  semantic_success:
    - 当前阶段语义完成条件
  advance_note: >-
    真正是否可推进仍由 signed evidence + consent + advance.py 决定。

exit_protocol:
  exit_conditions:
    - 必须满足的退出条件 1
    - 必须满足的退出条件 2
  exit_artifacts_required:
    - ...
  exit_state_transition:
    on_success: next_phase
    on_retry: same_phase
    on_repair: repair_window
    on_regenerate: upstream_phase

failure_classes:
  retry:
    - ...
  repair:
    - ...
  regenerate:
    - ...

retry_policy:
  max_retry_rounds: 2
  max_repair_rounds: 2

human_escalation_conditions:
  - retry 超过阈值
  - repair 超过阈值
  - regen/repair 判定冲突

handoff_requirements:
  must_include:
    - objective_completed
    - produced_artifacts
    - facts_for_next_phase
    - risks
    - recommended_next_action
```

---

## 4. 通用 Handoff Packet 模板（增强版）

```yaml
bundle_id: bundle-001
bundle_revision: r3
from_phase: P3
objective_completed: true
produced_artifacts:
  - path: ...
    role: ...
facts_for_next_phase:
  - ...
risks:
  - ...
open_questions:
  - ...
recommended_next_action:
  phase: P4
  action: build-verify
requires_repair: false
repair_scope_hint: null
downstream_revalidate_scope: P4_P5
```

### 字段说明

- `objective_completed`
  - 只表示本阶段语义目标是否完成，不等于 truth 层已放行
- `facts_for_next_phase`
  - 只写下一阶段必须知道的客观事实
- `downstream_revalidate_scope`
  - 若后续有修复，需要默认知道哪些下游验证会受影响

---

## 5. 通用 Repair Packet 模板（增强版）

```yaml
bundle_id: bundle-001
bundle_revision_from: r3
failed_phase: P4
failure_class: build_symbol_missing
failure_digest: >-
  链接阶段缺少 Foo::Bar 符号，怀疑功能实现与测试引用不一致。
suspect_files:
  - foundation/.../foo.cpp
  - test/.../foo_test.cpp
suspect_tests:
  - FooTest.Case001
allowed_fix_scope:
  - foundation/.../foo.cpp
  - test/.../foo_test.cpp
needs_design_regen: false
repair_disallowed_if:
  - changed_files scope expands
  - requirement semantics change
regen_trigger_if:
  - build_artifacts list changes
  - test_cases target changes
must_rerun:
  - P4 build-verify
  - P5 unit-verify
downstream_revalidate_scope: P4_P5
resume_from_packet:
  - latest_handoff_P3
  - failure_report_P4
```

### 字段说明

- `repair_disallowed_if`
  - 显式声明哪些情况下一旦发生就不能继续 repair
- `regen_trigger_if`
  - 弱模型无需自行总结，只要命中这些条件就升级重派生
- `downstream_revalidate_scope`
  - 直接声明修完后下游必须重跑到哪一层

---

## 6. Phase Memory Card 模板

```yaml
phase: P4
phase_name: build-verify
bundle_revision: r2
current_blocker: none
forbidden_actions:
  - expand_changed_files
  - skip_build_gate
next_expected_action_class: run_build_gate
last_failure_class: null
human_escalation_needed: false
primary_entry_doc: packet/P4-build-verify
primary_failure_doc: evidence/phase4/failure_report.json
primary_handoff_doc: handoff/P3-to-P4.yaml
```

### 用途

- 新窗口第一眼只读这个卡片
- 避免一上来淹没在长 packet 与日志里

---

## 7. Completion Receipt 模板

```yaml
phase: P3
bundle_revision: r2
semantic_done: true
truth_layer_pass_known: false
next_phase_ready: true
human_gate_pending: false
next_phase: P4
```

### 用途

- 让 orchestrator 或更弱模型快速知道当前阶段是否可退出
- 避免将长 handoff 当唯一完结证明

---

## 8. 窗口启动标准协议（增强版）

每个新窗口启动时，统一按以下顺序装载：

1. `phase_memory_card.json`
2. `advance.py status --json`
3. 当前阶段 `Stage Packet`
4. 最近一份 `Handoff Packet` 或 `Repair Packet`
5. 当前阶段 `completion_receipt.json`（若存在）
6. 当前阶段相关的 `phase_summary.json` / `failure_report.json`
7. 当前阶段必需 evidence

禁止默认装载：

- 后续阶段 packet
- 整条历史长对话
- 大量无边界自由文本说明
- 全局 README 作为第一入口

窗口启动时的硬规则：

1. 不先读 memory card，不进入执行
2. 不先读当前状态，不做命令执行
3. 若发现输入缺失，先报告缺口，不自行猜测
4. 若发现 scope 扩张，先升级为 regenerate 判定，不擅自继续
5. 若 retry / repair 超阈值，先人工升级，不继续自动尝试

---

# 9. 分阶段详细模板（增强点说明）

下面不重复所有旧字段，只列出每个阶段在 v2 模板基础上必须补的增强点。

---

## 9.1 P0 `bootstrap`

### 必补 entry 条件

- AR 原文已存在
- repo root 有效
- 当前未存在同名冲突 run

### 必补 exit 条件

- run 已初始化
- 初始状态已写入
- next action 已生成
- completion receipt 已生成

### 必补 memory card 字段

- missing inputs 是否为空
- next phase 是否为 P1

---

## 9.2 P1 `design-orchestrate`

### 必补 entry 条件

- P0 completion receipt 可读
- normalized inputs 已齐全
- 没有未解的 bootstrap blocker

### 必补 exit 条件

- global design doc 已完成
- stage packets P2~P8 已生成
- initial bundle 已建立
- handoff to P2 已生成
- completion receipt 已生成

### 必补索引

- `artifact_index`: design doc、bundle definition、packet index
- `report_index`: design review checklist

### 人工升级条件

- requirement 范围不清
- build / test / device contract 不能闭环

---

## 9.3 P2 `feature-develop`

### 必补 entry 条件

- P1 handoff 已存在
- target changed_files baseline 已冻结

### 必补 exit 条件

- feature code 完成
- development_freeze_snapshot 已生成
- touched files 未超边界
- handoff to P3 已生成

### 必补索引

- `artifact_index`: freeze snapshot
- `evidence_index`: changed_files consistency note

### 人工升级条件

- 必须新增未声明业务文件
- 功能实现导致 requirement 语义变化

---

## 9.4 P3 `test-develop`

### 必补 entry 条件

- P2 freeze snapshot 已存在
- 允许的 test scope 已明确

### 必补 exit 条件

- test intent matrix 已生成
- bundle revision 已更新
- 未突破 feature freeze
- handoff to P4 已生成

### 必补新增结构

`test_intent_matrix` 每条记录必须含：

- `test_case_id`
- `covers_requirement_ids`
- `expected_target`
- `expected_suite`
- `expected_gtest`
- `depends_on_files`
- `negative_cases`
- `device_followup_needed`

### 人工升级条件

- 测试开发必须改功能代码
- 测试目标超出原计划

---

## 9.5 P4 `build-verify`

### 必补 entry 条件

- 完整 bundle 已存在
- P3 handoff 已存在
- 当前无未关闭 repair packet

### 必补 exit 条件

- build target 成功
- success banner 符合
- build_artifacts 齐全
- failure_report 或 phase_summary 已生成
- completion receipt 已生成

### 必补索引

- `artifact_index`: build log、artifact summary
- `evidence_index`: last failure digest
- `report_index`: build banner result

### 必补 repair 字段

- `repair_disallowed_if`
- `regen_trigger_if`
- `downstream_revalidate_scope`

### 人工升级条件

- repair 超过 2 轮
- 编译错误归因在 impl/test/config 之间反复切换

---

## 9.6 P5 `unit-verify`

### 必补 entry 条件

- P4 completion receipt 为 ready
- 当前 bundle revision 已通过 build

### 必补 exit 条件

- fresh report 存在
- required gtests 全部 PASS
- gtest coverage summary 已生成
- handoff to P6 已生成

### 必补索引

- `artifact_index`: summary_report.xml
- `report_index`: gtest coverage summary

### 必补 repair 影响传播

若改动触及：

- 测试断言引用 → `downstream_revalidate_scope = P4_to_P6`
- 功能语义 → regenerate

---

## 9.7 P6 `device-verify`

### 必补 entry 条件

- P5 completion receipt 为 ready
- target device available
- device cases 完整

### 必补 exit 条件

- required device cases all verified
- provenance / side_effect / differential 全满足
- handoff to P7 已生成
- completion receipt 已生成

### 必补索引

- `artifact_index`: hilog windows, device case result summary
- `evidence_index`: provenance proof, side_effect proof
- `report_index`: device summary report

### 必补 evidence priority

- process provenance
- artifact_loaded
- side_effect
- differential
- runtime/e2e marker
- plain marker text

### 人工升级条件

- provenance 与 side_effect 结论冲突
- marker 命中但 artifact_loaded 不成立

---

## 9.8 P7 `integration-quality`

### 必补子阶段

- `P7.a integration-run`
- `P7.b quality-check`
- `P7.c review-check`
- `P7.d human-review-await`

### 每个子阶段必须有

- substate goal
- substate entry conditions
- substate exit conditions
- substate expected artifacts
- next substate

### 必补 exit 条件

- integration suites pass
- quality checklist satisfied
- review zero issue confirmed
- handoff to P8 已生成

### 人工升级条件

- quality 缺项与 review 结论互相矛盾
- 需要降级 quality contract

---

## 9.9 P8 `upload-ci`

### 必补子阶段

- `P8.a precheck`
- `P8.b local-review`
- `P8.c consent-await`
- `P8.d push-pr`
- `P8.e pr-review`
- `P8.f ci-green`
- `P8.g finalize`

### 每个子阶段必须有

- substate goal
- substate entry conditions
- substate exit conditions
- substate expected artifacts
- next substate

### 必补 exit 条件

- push / PR / review / CI / SHA binding 全满足
- final phase summary 已生成
- completion receipt 已生成

### 必补索引

- `artifact_index`: diff artifacts, PR description
- `evidence_index`: review outputs, CI outputs, SHA binding summary
- `report_index`: upload summary report

### 人工升级条件

- review / CI / SHA binding 结论冲突
- 外部 API 状态不稳定超过阈值

---

## 10. 阶段间连续性规则（增强版）

### 10.1 P2 → P3 连续性

- P2 只交付功能实现结果
- P3 只在已声明测试范围内补齐测试
- P3 默认不拥有功能返工权
- 若需返工功能代码，必须先判定 repair 或 regenerate

### 10.2 P3 → P4 连续性

- P3 结束时必须形成完整 development bundle
- P4 只验证该 bundle 是否能编过
- P4 失败默认不打散 P2/P3 结果，而是生成 repair packet

### 10.3 P4 → Repair → P4 → P5 连续性

规则如下：

1. 编译失败优先 repair
2. repair packet 必须声明：
   - suspect files
   - suspect tests
   - allowed fix scope
   - must rerun
   - downstream_revalidate_scope
3. repair 完成后 bundle revision 升级
4. P4 对新 revision 重新编译验证
5. P5 对同一 revision 执行 UT

### 10.4 P5 / P6 / P7 的下游重验

当 repair 发生后：

- 若 `downstream_revalidate_scope = P4_P5`，则重跑 P4/P5
- 若 `P4_to_P6`，则重跑 P4/P5/P6
- 若 `P4_to_P7`，则重跑 P4/P5/P6/P7
- 若 `all_downstream`，则从 P4 一直到 P8 全部失效

这使得修复影响传播变得明确，而非依赖模型感知。

---

## 11. 熔断与人工升级协议

每个阶段默认都要支持：

- `max_retry_rounds = 2`
- `max_repair_rounds = 2`

一旦超过，必须：

- 生成 escalation note
- 把 `human_escalation_needed=true` 写入 memory card
- 停止自动继续

这是把置信度稳定在 80% 以上的必要条件之一。

---

## 12. 建议的后续文档拆分

如果后续继续细化，可以再拆出四份文档：

1. `packet-schema-machine-readable.md`
   - 定义 packet 的 JSON/YAML 机器字段

2. `phase-packet-instances-example.md`
   - 给某个真实 AR 示例，填一套 P1~P8 packet

3. `repair-flow-examples.md`
   - 给出编译失败、测试失败、真机失败三种 repair/regenerate 实例流

4. `substate-protocols-p7-p8.md`
   - 细化 P7/P8 的子阶段状态机

---

## 13. 结论

本文在原有模板基础上补齐了使置信度显著提升所需的硬约束：

- entry / exit protocol
- phase memory card
- completion receipt
- artifact/evidence/report index
- repair/regenerate matrix hooks
- downstream revalidate scope
- retry / repair 熔断
- human escalation conditions
- P7 / P8 子阶段协议

其中最关键的设计点是：

1. 每阶段新起窗口
2. 每窗口先读 memory card，再读 packet，再读 handoff/repair
3. 连续性由 bundle + handoff + repair + downstream revalidate scope 保证
4. 编译失败默认走 repair，而不是默认打回 design-orchestrate
5. repair / regenerate 不再主要依赖弱模型自由判断，而依赖矩阵和显式字段
6. 所有 packet 只做执行控制，不做真相放行

这使得弱模型可以被进一步压缩成：

> 一个严格按阶段 packet 执行、按 handoff 接续、按 repair 修复、按熔断规则停下、按子状态机推进的单阶段执行器。