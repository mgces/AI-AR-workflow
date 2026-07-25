# AI-AR-workflow 逻辑阶段到现有 phase/scripts 的映射实施方案

- 版本：v1
- 日期：2026-07-24
- 状态：实施中映射稿（部分协议已按本文落地）
- 关联文档：
  - `products/20260723-weak-model-optimization/weak_model_optimization_design_spec.md`
  - `products/20260723-weak-model-optimization/stage_packet_templates.md`
- 目的：把逻辑阶段 `P0 ~ P8`、阶段 packet 体系、repair/regenerate 协议、窗口隔离协议，映射到当前仓库现有 `phase0 ~ phase6`、已有 gate 脚本和已有目录结构上，形成可分批实施的落地路径。

---

## 1. 文档定位

前两份文档已经完成了：

1. 新逻辑阶段和弱模型过程控制体系设计
2. packet / handoff / repair / memory card / completion receipt 的详细模板设计

本文件回答最后一个问题：

> **这套新逻辑阶段体系，如何落到当前仓库已有实现上，而不是推翻重来？**

本文件不是代码修改说明书，而是：

- 逻辑阶段与现有 phase 的映射图
- 现有脚本复用关系
- 新增文件/新增状态的挂载点
- 分批实施顺序
- 兼容策略与迁移原则

---

## 2. 当前现有物理结构基线

当前仓库中，和本方案最相关的现有结构是：

### 2.1 现有 phase 状态机

当前物理 phase 仍以 `phase0 ~ phase6` 组织，核心状态由：

- `skills/ohos-ar-dev-phases/scripts/advance.py`
- `pipeline.json`
- `evidence/manifest.jsonl`

管理。

### 2.2 现有核心 gate 脚本

- `gate_env_init.py`
- `gate_design.py`
- `gate_develop.py`
- `gate_build.py`
- `gate_test_ut.py`
- `gate_device_func.py`
- `gate_integration.py`
- `gate_upload_ci.py`

### 2.3 现有共享真相层

- `skills/ohos-ar-dev-phases/scripts/lib/gatelib.py`
- `evidence/manifest.jsonl`
- consent binding
- functional/code fingerprint
- drift / tamper / replay protection

### 2.4 已经完成的导航层增强

- `status --json`
- `next_action.json`
- `todo.json`
- `phase_summary.json`
- `failure_report.json`

这些都已经是未来实施的可复用基础。

---

## 3. 逻辑阶段与现有物理 phase 的映射原则

必须先明确：

> **逻辑阶段 P0~P8 不是要求你立刻把当前 phase0~phase6 全部推翻重编号。**

建议采用的原则是：

### 原则 1：逻辑阶段优先，物理 phase 暂不强制重排

即：

- 对弱模型暴露 `P0 ~ P8` 逻辑阶段
- 对底层状态机保留现有 `phase0 ~ phase6`
- 通过兼容映射层把逻辑阶段投影到现有脚本与目录

### 原则 2：先做“逻辑子阶段化”，再考虑物理 phase 重构

例如：

- 当前物理 `phase1` 可以先承载 `P1 design-orchestrate + P2 feature-develop`
- 当前物理 `phase5/6` 也可以先通过 `substate` 承载更多逻辑阶段

### 原则 3：弱模型只看逻辑阶段，不直接暴露底层旧编号语义

也就是：

- 对模型展示：`P3 test-develop`
- 对底层脚本仍可复用：`gate_test_ut.py`、`phase3` 目录等

### 原则 4：先兼容落地，再决定是否重构物理 phase 编号

这样风险最低，也最符合当前仓库已经存在的大量 phase 代码与测试。

---

## 4. 逻辑阶段到现有 phase 的映射表

建议采用如下映射：

| 逻辑阶段 | 逻辑职责 | 当前物理 phase / 子状态 | 主要复用脚本 | 实施方式 |
|---|---|---|---|---|
| P0 bootstrap | 初始化 run、输入归一化、环境签名 | `phase0` | `advance.py`, `gate_env_init.py` | 原地扩展 |
| P1 design-orchestrate | 冻结设计、生成 packet、生成 bundle | `phase1` 子状态 A | `gate_design.py` | 原地扩展 + 新增派生产物 |
| P2 feature-develop | 功能代码开发 | `phase1` 子状态 B | `gate_develop.py` | 原地扩展 |
| P3 test-develop | 测试/用例代码开发 | 新逻辑阶段，物理先挂 `phase1` 子状态 C 或 `phase2-prebuild` | 新增轻量 gate / orchestrator 逻辑 | 新增薄层，不先拆底层 truth phase |
| P4 build-verify | 正式编译验证 | `phase2` | `gate_build.py` | 原地扩展 |
| P5 unit-verify | UT 执行与 gtest 覆盖 | `phase3` | `gate_test_ut.py` | 原地扩展 |
| P6 device-verify | 真机验证 | `phase4` | `gate_device_func.py` | 原地扩展 |
| P7 integration-quality | 集成、质量、review | `phase5` | `gate_integration.py` | 原地扩展 + 子状态增强 |
| P8 upload-ci | push / PR / CI / SHA 绑定 | `phase6` | `gate_upload_ci.py` | 原地扩展 + 子状态增强 |

这是整个实施方案最重要的一张表。

---

## 5. 为什么推荐把 P1 / P2 / P3 先映射到当前物理 phase1

你当前的新设计里：

- P1 = design-orchestrate
- P2 = feature-develop
- P3 = test-develop

而当前底层物理实现里最接近的是：

- `gate_design.py`
- `gate_develop.py`
- 后续才进入 `gate_build.py`

所以最稳妥的落地方式是：

## 5.1 当前 phase1 变成“逻辑多子阶段容器”

在物理 `phase1` 内先引入逻辑子状态：

- `phase1.design_orchestrate`
- `phase1.feature_develop`
- `phase1.test_develop`

其中：

### `phase1.design_orchestrate`
复用：
- `gate_design.py`

新增职责：
- 生成 global design doc
- 生成 stage packets
- 生成初始 bundle

### `phase1.feature_develop`
复用：
- `gate_develop.py`

新增职责：
- 输出 `development_freeze_snapshot`
- 输出 P2 handoff

### `phase1.test_develop`
新增：
- 一层新的测试开发控制逻辑
- 生成 `test_intent_matrix`
- 更新 bundle revision
- 输出 P3 handoff

### 为什么这样最稳
因为：

- 不需要立刻修改 `advance.py` 的主 phase 编号体系
- 不需要立刻打断现有 P2/P3/P4 真相层签名逻辑
- 只需先在 phase1 内增加子状态机与新产物

这非常适合作为第一波实施。

---

## 6. 逻辑 P3 `test-develop` 的落地建议

这是当前仓库里“新增概念”最多的一段。

### 6.1 不建议一开始就把它做成新的 truth phase

原因：

- 当前真正的真相层 test gate 是 `gate_test_ut.py`
- `test-develop` 本质上还不是“真相层判通过”，而是“开发控制阶段”

所以建议：

> **先把 `P3 test-develop` 做成 phase1 内的逻辑子阶段 / orchestrator 子阶段，而不是新增一个签名 truth phase。**

### 6.2 它需要哪些新增产物

建议最先新增：

- `test_intent_matrix.json` / `.md`
- `handoff_p3_test_develop.json`
- `completion_receipt_p3.json`
- `phase_memory_card_p3.json`

### 6.3 是否需要新增脚本

建议新增一个薄层脚本，而不是改重 gate：

可选命名：
- `prepare_test_bundle.py`
- 或 `stage_test_develop.py`

职责：
- 不做 truth pass/fail
- 只做：
  - test intent matrix 生成
  - 测试范围边界检查
  - feature freeze 违规检查
  - bundle revision 更新
  - handoff packet 输出

这样可以最大复用现有 `gate_test_ut.py` 作为后续正式 UT gate。

---

## 7. 逻辑 P4~P8 与现有 gate 的原地扩展映射

这部分最适合“原地增强”。

---

## 7.1 P4 `build-verify` → 现有 `gate_build.py`

### 现有可复用
- build 真相层
- build artifacts 校验
- `phase_summary.json` / `failure_report.json`

### 需要新增的协议层字段
- entry / exit conditions
- memory card
- completion receipt
- repair packet 扩展字段：
  - `repair_disallowed_if`
  - `regen_trigger_if`
  - `downstream_revalidate_scope`
- artifact/evidence index

### 实施方式
- 原地增强 `gate_build.py`
- 配套增强 `advance.py next`
- 不改变 manifest 权威地位

---

## 7.2 P5 `unit-verify` → 现有 `gate_test_ut.py`

### 现有可复用
- fresh report 检查
- gtest 覆盖校验
- summary/failure report

### 需要新增
- `test_intent_matrix` 消费
- completion receipt
- downstream revalidate propagation
- repair / regenerate 矩阵对接

### 实施方式
- 原地增强 `gate_test_ut.py`
- 新增读 `test_intent_matrix` 的薄层 helper

---

## 7.3 P6 `device-verify` → 现有 `gate_device_func.py`

### 现有可复用
- nonce
- uptime
- artifact sha
- runtime/e2e markers
- contract marker coverage

### 需要新增 / 已在设计中定义
- process provenance
- artifact_loaded proof
- side_effect assertions
- baseline/trigger differential
- evidence priority ordering
- completion receipt
- device-stage memory card

### 实施方式
- 原地增强 `gate_device_func.py`
- 配套增强 report 渲染层
- 不引入第二真相源

---

## 7.4 P7 `integration-quality` → 现有 `gate_integration.py`

### 现有可复用
- integration / MST 执行
- quality report presence
- review hard gate
- summary/failure report

### 需要新增
- 逻辑子状态：
  - `integration-run`
  - `quality-check`
  - `review-check`
  - `human-review-await`
- checklist index
- completion receipt
- escalation 条件

### 实施方式
- 物理 phase5 不拆
- 在 `advance.py next` / state payload 中引入 substate
- `gate_integration.py` 输出可消费的 substate payload

---

## 7.5 P8 `upload-ci` → 现有 `gate_upload_ci.py`

### 现有可复用
- precheck / dry-run / push / verify_pr 的区分
- review gate
- PR / CI / SHA binding
- summary/failure report
- repair packet / completion receipt continuity（已落地）

### 需要新增
- 逻辑子状态：
  - precheck
  - local-review
  - consent-await
  - push-pr
  - pr-review
  - ci-green
  - finalize
- upload memory card
- external API instability 熔断
- review / CI / SHA conflict escalation

### 当前已落地对齐
- `gate_upload_ci.py` 已补齐：
  - `completion_receipt.json`
  - 失败时 repair packet（含 `bundle_revision_from` / `suspect_*` / `downstream_revalidate_scope`）
  - PASS 时 repair 清除标记
- 因此 P8 目前的主要剩余项不再是 continuity，而是更细粒度的 substate / external instability 协议

### 实施方式
- 物理 phase6 不拆
- 通过 `substate` + packet/card 增强来承载新协议

---

## 8. `advance.py` 的实施角色：中央映射器

整套逻辑阶段能否顺利落到现有系统，核心在 `advance.py`。

它需要承担新的“中央映射器”角色，而不只是当前的状态推进器。

---

## 8.1 `advance.py` 需要新增/增强的核心能力

### A. 逻辑阶段到物理 phase 的映射输出

新增 payload 字段，例如：

```json
{
  "logical_phase": "P4",
  "logical_phase_name": "build-verify",
  "physical_phase": 2,
  "physical_phase_name": "build",
  "logical_substate": "ready"
}
```

### B. 子状态机输出

特别用于：

- 物理 phase1 内承载 P1/P2/P3
- 物理 phase5 内承载 P7 子状态
- 物理 phase6 内承载 P8 子状态

### C. `next_action.json` 扩展

新增字段：

- `logical_phase`
- `logical_phase_name`
- `logical_substate`
- `entry_preconditions`
- `entry_blockers`
- `recommended_packet`
- `memory_card`
- `completion_receipt`

### D. repair / regenerate 路由器

`advance.py next` 应能根据：

- 当前 failure class
- 当前 repair packet
- downstream revalidate scope
- retry / repair 计数

输出：

- 继续 retry
- 进入 repair window
- 升级 regenerate
- 触发人工介入

这一步对弱模型成功率影响极大。

---

## 9. `gatelib.py` 的实施角色：共享协议 helper 层

为了避免每个 gate 自己手写一套 packet/card/receipt 逻辑，建议把新增协议通用化到 `gatelib.py`。

建议新增 helper：

### 9.1 新增 helper 类型

- `write_phase_memory_card(...)`
- `read_phase_memory_card(...)`
- `write_completion_receipt(...)`
- `read_completion_receipt(...)`
- `write_handoff_packet(...)`
- `read_handoff_packet(...)`
- `write_repair_packet(...)`
- `read_repair_packet(...)`
- `write_artifact_index(...)`
- `write_report_index(...)`
- `write_evidence_index(...)`

### 9.2 判定矩阵 helper

建议新增：

- `classify_repair_vs_regenerate(...)`
- `compute_downstream_revalidate_scope(...)`
- `repair_budget_exhausted(...)`
- `retry_budget_exhausted(...)`

### 9.3 好处

- 不让每个 gate 各写各的协议字段
- 降低后续维护成本
- 让 packet 结构稳定，便于弱模型消费

---

## 10. 新增文件与新增目录的推荐挂载点

为了不污染现有真相层目录，建议新增内容优先挂到 run 目录下的导航/控制层区域。

推荐结构：

```text
specs/pipeline/<run>/
├── pipeline.json
├── next_action.json
├── todo.json
├── controls/
│   ├── packets/
│   │   ├── P1-design-orchestrate.yaml
│   │   ├── P2-feature-develop.yaml
│   │   ├── P3-test-develop.yaml
│   │   ├── P4-build-verify.yaml
│   │   └── ...
│   ├── memory_cards/
│   │   ├── P1.json
│   │   ├── P2.json
│   │   └── ...
│   ├── handoffs/
│   │   ├── P1-to-P2.json
│   │   ├── P2-to-P3.json
│   │   └── ...
│   ├── repairs/
│   │   ├── P4-r3-repair.json
│   │   └── ...
│   ├── receipts/
│   │   ├── P1.json
│   │   ├── P2.json
│   │   └── ...
│   └── indexes/
│       ├── P4-artifacts.json
│       ├── P4-evidence.json
│       └── P4-reports.json
├── evidence/
└── reports/
```

### 关键原则

- `evidence/` 继续只放真相层真实产物
- `controls/` 统一承载执行控制层与导航层增强产物
- 不把 packet/handoff/repair 混进 manifest 真相层目录里

---

## 11. 分批实施计划（推荐批次）

以下是建议的实施批次，按风险最低、收益最高排序。

---

## 批次 A：中央协议底座

### 目标
先不动复杂 gate，先把中央控制协议搭起来。

### 修改点
- `advance.py`
- `gatelib.py`

### 实施项
1. 逻辑阶段字段输出
2. `substate` 扩展
3. memory card / completion receipt helper
4. handoff / repair / index helper
5. next_action 增强

### 完成标志
- 单看 `advance.py next --json` 就能知道：
  - 当前 logical phase
  - 当前 physical phase
  - 当前 substate
  - 当前 packet / card / receipt 路径
  - 是否应 retry / repair / regenerate / escalate

---

## 批次 B：phase1 逻辑拆层

### 目标
先把最关键的新设计顺序落地：

- P1 design-orchestrate
- P2 feature-develop
- P3 test-develop

### 修改点
- `gate_design.py`
- `gate_develop.py`
- 新增 `stage_test_develop.py`（或类似薄层脚本）
- `advance.py`

### 实施项
1. phase1 子状态机
2. global design doc / bundle / packet 生成
3. freeze snapshot
4. test intent matrix
5. P1/P2/P3 handoff

### 完成标志
- 编译前就能完整走通：
  - 设计冻结
  - 功能开发
  - 测试开发
  - bundle 成形

---

## 批次 C：P4/P5 恢复链闭环

### 目标
把“最容易掉链子”的 build → repair → rebuild → UT 连贯性先做扎实。

### 当前状态
- 已完成并已落地到当前仓库：
  - repair/regenerate 路由基础
  - downstream revalidate scope 传播
  - P4/P5 以及后续后段 gate 的 receipt / handoff / repair continuity 主链路
  - repair/retry 计数与人工升级基础
- 因此本批次的核心连续性目标已完成，后续剩余工作更多转移到 P7/P8 子状态与 packet 机器化。

### 修改点
- `gate_build.py`
- `gate_test_ut.py`
- `gatelib.py`
- `advance.py`

### 实施项
1. repair/regenerate matrix
2. downstream revalidate scope
3. P4/P5 memory card / receipt / repair packet
4. 熔断与人工升级

### 完成标志
- 一个典型编译失败场景能够：
  - 正确生成 repair packet
  - 新窗口接 repair
  - 修后升级 revision
  - 重跑 P4/P5
  - 不丢上下文

---

## 批次 D：P6 真机增强闭环

### 目标
把 P6 真机阶段的弱模型抗伪造与执行协议同时补齐。

### 修改点
- `gate_device_func.py`
- report 渲染脚本
- `advance.py`

### 实施项
1. provenance / artifact_loaded / side_effect / differential
2. device memory card / receipt
3. P6 evidence priority
4. 异常冲突人工升级

### 完成标志
- 弱模型不能再把“文本像真的日志”误当成真实通过证据

---

## 批次 E：P7/P8 子状态机

### 目标
把最复杂的后段外部动作拆成弱模型能稳定执行的小状态。

### 修改点
- `gate_integration.py`
- `gate_upload_ci.py`
- `advance.py`

### 实施项
1. P7 substates
2. P8 substates
3. external API instability 熔断
4. review / CI / SHA conflict escalation

### 完成标志
- 弱模型不再需要在单一阶段里同时管理全部 P7/P8 状态

---

## 批次 F：machine-readable packet 化

### 目标
把 Markdown 方案真正落到 JSON/YAML 协议层。

### 修改点
- packet writer/reader helpers
- references / schemas

### 实施项
1. packet schema 固定
2. memory card schema 固定
3. receipt schema 固定
4. repair packet schema 固定

### 完成标志
- 弱模型优先读 JSON/YAML
- Markdown 仅作解释层

---

## 12. 对现有测试体系的映射建议

实施时，建议测试也按批次推进，而不是一次性补全。

### 12.1 批次 A/B 需要的测试

- `advance.py next` 逻辑阶段输出测试
- phase1 子状态转移测试
- bundle / handoff / receipt 生成测试
- test-develop 薄层脚本测试

### 12.2 批次 C 需要的测试

- repair/regenerate matrix 测试
- downstream revalidate scope 测试
- retry/repair 熔断测试
- P4→repair→P4→P5 连贯性测试

### 12.3 批次 D/E 需要的测试

- P6 新证据字段与 failure class 测试
- P7 substates 测试
- P8 substates 测试
- review / CI / SHA 冲突分流测试

---

## 13. 兼容策略

为了降低重构风险，建议明确兼容策略。

### 13.1 对旧 run 的兼容

- 老 run 仍可按旧物理 phase 跑
- 若缺 packet/control 目录，则以 legacy_mode 消费
- 新增强协议默认只对新 run 开启

### 13.2 对旧脚本接口的兼容

- 先扩字段，不删旧字段
- 先新增 output 文件，不直接改原 evidence 路径语义
- `advance.py next` 可以先扩，不立即替换旧 status 用法

### 13.3 对弱模型入口的兼容

- 新模型优先读 logical phase + packet
- 老流程仍可回退读 `phase_summary.json` / `failure_report.json`

---

## 14. 最后推荐：哪些地方原地扩，哪些地方新增薄层

### 14.1 适合原地增强的

- `advance.py`
- `gatelib.py`
- `gate_design.py`
- `gate_develop.py`
- `gate_build.py`
- `gate_test_ut.py`
- `gate_device_func.py`
- `gate_integration.py`
- `gate_upload_ci.py`

### 14.2 适合新增薄层的

- `stage_test_develop.py` / `prepare_test_bundle.py`
- packet schema files
- packet/card/receipt writer utilities

### 14.3 不建议现在就做的

- 立刻重编号所有物理 phase
- 立刻拆 manifest truth phase
- 立刻让旧 run 全量适配新协议

---

## 15. 最终实施判断

如果严格按照这份映射方案推进：

- 真相层不用推翻
- 现有 gate 大多原地增强即可
- 逻辑阶段可以先通过 `substate` / `logical_phase` 挂到旧物理 phase 上
- 最难的新设计（P3 test-develop、repair continuity、P7/P8 substates）都能以低风险方式渐进落地

这意味着：

> 这套“弱模型阶段化门控 + 窗口隔离 + 恢复协议”不是一个需要推翻现有系统的大重构，
> 而是一套可以挂接在现有 truth layer 之上的渐进增强方案。

---

## 16. 本文档结论

本文件给出的不是抽象设计，而是可落地的映射路径：

1. **逻辑阶段怎么映射到现有物理 phase**
2. **哪些脚本原地扩展**
3. **哪些新增薄层最合适**
4. **哪些状态先用 substate 承载**
5. **按什么批次实施风险最低**

到这一步，三份文档已经形成完整闭环：

- 主设计文档：定义为什么做、目标结构是什么
- packet 模板文档：定义阶段执行协议怎么写
- 映射实施文档：定义如何落到当前仓库

这已经足够作为后续正式实施的蓝图。