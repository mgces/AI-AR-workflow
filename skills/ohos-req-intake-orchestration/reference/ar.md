---
rr_id: ""
feature_id: ""
generated_by: ohos-req-intake-orchestration
status: Accepted
---

# AR: <Feature 名称>

> 本 AR 由需求分析与设计工作流（Requirement workflow）生成，作为 `ohos-ar-dev-workflow` 的需求输入。
> 它不是 `AR_design.md`，也不包含可直接放行开发的 `ar-contract`。

## 1. 需求来源与基线

| 字段 | 值 |
|---|---|
| RR 单号 | `<rr_id>` |
| Feature ID | `<feature_id>` |
| Requirement | `<01-requirement.md 绝对路径>` |
| Feasibility | `<02-feasibility.md 绝对路径>` |
| Decision | `<03-arch-decision-record.md 绝对路径>` |
| Feature | `<04-feature.md 绝对路径>` |
| IR | `<IR.md 绝对路径>` |
| Proposal / SR | `<05-proposal*.md / SR-*.md 绝对路径>` |
| 需求分析与设计工作流 handoff | `<handoff.md 绝对路径>` |
| 需求分析与设计工作流 metrics | `<workflow_metrics.json 绝对路径，advisory>` |

## 2. 目标与非目标

### 目标

- `<从已批准 Feature/IR/SR 提取>`

### 非目标

- `<从已批准 Feature/IR/SR 提取>`

## 3. 功能与非功能需求

| ID | 需求 | 优先级 | 来源 |
|---|---|---|---|
| `<FR/NFR-ID>` | `<需求原文>` | `<P0/P1/P2>` | `<源文档与章节>` |

## 4. 验收基线

| AC ID | Given | When | Then | 禁止结果 | 来源 |
|---|---|---|---|---|---|
| `<AC-ID>` | `<前置条件>` | `<动作>` | `<可观察结果>` | `<不可接受结果>` | `<04-feature/IR/SR>` |

## 5. 已评审方案与交付边界

- 选定方案：`<03-arch-decision-record.md §5 结论>`
- Proposal/SR 拆分：`<边界、Owner、依赖>`
- 允许范围：`<已批准范围>`
- 禁止扩展：未经需求分析与设计工作流评审的新需求、新 API 或新交付边界。

## 6. 候选影响范围与源码复核要求

| 候选仓/模块 | 需求分析与设计工作流阶段证据 | 需求开发工作流必须复核 |
|---|---|---|
| `<repo/module>` | `<路径、文档或 Owner 结论>` | 当前 HEAD、文件、API、GN target、依赖、测试和运行配置 |

需求分析与设计工作流中的源码路径和接口仅作为定位输入。`ohos-ar-dev-workflow` 在 P1 生成
`AR_design.md` 与 `ar-contract` 前，必须在当前 OHOS 源码 HEAD 重新验证。

## 7. 未关闭条件与观测项

| ID | 类型 | 内容 | Owner | 关闭动作/阶段 |
|---|---|---|---|---|
| `<ID>` | `condition/observation/risk` | `<内容>` | `<Owner>` | `<动作和时点>` |

## 8. 下游入口

显式启动下游 workflow：

```text
/ohos-ar-dev-workflow <本 AR.md 绝对路径>
```

下游需求开发工作流拷贝本文档为运行目录的 `ar.md`，之后独立执行 P0-P8；需求分析与设计工作流不继续推进。
