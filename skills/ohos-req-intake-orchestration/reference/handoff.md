---
feature_id: ""
rr_id: ""          # RR单号：从 01-requirement.md 继承，全链路追踪
generated_by: ""
date: ""
status: Draft
---

# Handoff 摘要 — OHOS SDD → AR 生成

> 本文档汇总 OHOS SDD 的已评审需求基线，供同一 workflow 生成 `AR.md`。
> `AR.md` 生成后 SDD workflow 结束；用户或上层编排再将 AR 显式传给独立的 `ohos-ar-dev-workflow`。

## Phase 0 完成状态

| 检查项 | 状态 | 路径 |
|--------|------|------|
| 01-requirement.md status=Clarified | ✅/⚠️/❌ | `{docs_dir}/01-requirement.md` |
| 02-feasibility.md 存在 | ✅/⚠️/❌ | `{docs_dir}/02-feasibility.md` |
| 03-arch-decision-record.md status=Accepted | ✅/⚠️/❌ | `{docs_dir}/03-arch-decision-record.md` |
| 04-feature.md Gate=Ready/Conditional Ready | ✅/⚠️/❌ | `{docs_dir}/04-feature.md` |
| 拆分结果已用户确认 | ✅/⚠️/❌ | 04-feature.md §五 |
| IR.md 存在 | ✅/⚠️/❌ | `{docs_dir}/IR.md` |
| proposal 文件存在 | ✅/⚠️/❌ | `{docs_dir}/05-proposal*.md` |
| SR 文件存在（GA-Approved 后） | ✅/⚠️/❌ | `{docs_dir}/SR.md` 或 `{docs_dir}/SR-*.md` |

## Gate 状态

| 字段 | 值 |
|------|-----|
| Gate 结论 | Ready / Conditional Ready / Not Ready |
| 评审决策状态 | Accepted / Rejected / PendingRe-review |
| ADR 状态 | Accepted |
| IR 状态 | Baseline / Conditional |
| 条件项（Conditional Ready 时） | [列出条件项、Owner、关闭时点] |

## Phase 0 产物路径

| 产物 | 路径 |
|------|------|
| requirement | `{docs_dir}/01-requirement.md` |
| feasibility | `{docs_dir}/02-feasibility.md` |
| decision | `{docs_dir}/03-arch-decision-record.md` |
| feature | `{docs_dir}/04-feature.md` |
| IR | `{docs_dir}/IR.md` |
| SR | `{docs_dir}/SR.md`（单一 proposal）或 `{docs_dir}/SR-*.md`（多 proposal，每个一个） |
| 下游 AR | `{docs_dir}/AR.md`（handoff 校验通过后生成） |

## 关键决策摘要

| 决策 | 结论 | 来源 |
|------|------|------|
| RR单号 | [RR单号，全链路追踪] | 01-requirement.md |
| 选定方案 | [方案名称一句话] | 03-arch-decision-record.md §五 |
| Gate 结论 | [Ready/Conditional Ready/Not Ready] | `tmp/decision_gate_*.json`（ohos-req-review-gate 产出） |
| 拆分方式 | [按仓+领域/按功能点/单一] | 04-feature.md §五 |

## Proposal 清单

| Proposal | 文件 | 拆分方式 | 估算工作量 | Owner | GA 状态 | SR 文件 |
|----------|------|----------|-----------|-------|---------|---------|
| [PROP-01] | `05-proposal-01.md` | [方式] | [X 人月，≤5] | [Owner] | GA-Approved / 待GA | `SR-01.md` |
| [PROP-02] | `05-proposal-02.md` | [方式] | [Y 人月，≤5] | [Owner] | GA-Approved / 待GA | `SR-02.md` |

## AR 生成前置检查

> `ohos-req-intake-orchestration` 生成 AR.md 前必须验证以下全部通过：

- [ ] handoff.md 存在且可读取
- [ ] IR.md 文件存在
- [ ] 04-feature.md 存在且 Gate ≠ Not Ready
- [ ] 04-feature.md 拆分结果已经用户确认
- [ ] 03-arch-decision-record.md 存在且 status=Accepted
- [ ] 03-arch-decision-record.md §6 遗留问题由用户评审会议输入（非占位）（旧版文档可能标注为 §四，需兼容）
- [ ] 03-arch-decision-record.md §6 每条遗留项负责人/解决动作/计划关闭时间齐全（任一缺失→阻断交接）
- [ ] 每个 proposal 估算工作量 ≤5 人月
- [ ] 至少一个 proposal 文件存在
- [ ] GA-Approved 的 proposal 均有对应 SR 文件

**任一检查不通过 → 阻断 AR 生成，提示用户回到对应 SDD 步骤补齐。**

## 交接说明

- AR 以 `05-proposal*.md` 和 `SR-*.md` 的已批准边界为交付范围，IR 和 feature 作为需求上下文。
- SDD 产物（01-05/IR/SR/handoff）是 AR 的溯源基线，生成 AR 时不得扩展未评审范围。
- `ohos-ar-dev-workflow` 读取 AR 后独立初始化 P0-P8，并在 P1 从当前源码 HEAD 重新验证动态代码事实。

## 状态流转

| handoff.md status | 含义 | 允许动作 |
|-------------------|------|----------|
| Draft | Phase 0 流程进行中 | 仅 ohos-req-intake-orchestration 可更新 |
| Ready | SDD 完成，所有前置检查通过 | 可生成 AR.md |
| ConditionalReady | SDD 有条件完成 | 可生成 AR.md，但必须携带条件项 |
| Blocked | SDD 前置检查不通过 | 禁止生成 AR.md |
