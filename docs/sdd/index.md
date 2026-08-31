# 需求分析与设计工作流（Requirement workflow）

需求分析与设计工作流（Requirement workflow）是“OpenHarmony 需求分析与开发作业线”的需求分析与设计入口，负责把原始需求经过澄清、可行性分析、
方案决策、Feature Gate、IR、Proposal 和 SR 收敛为 `AR.md`；需求开发工作流再以该 AR 为输入，
执行 P0-P8 开发流程。

```text
原始需求
  → ohos-req-intake-orchestration
  → 01-requirement.md → 02-feasibility.md → 03-arch-decision-record.md
  → 04-feature.md → IR.md → 05-proposal*.md → SR-*.md
  → handoff.md → AR.md

AR.md
  → 需求开发工作流（ohos-ar-dev-workflow）
  → P0 环境 → P1 设计 → P2-P8 开发与上库
```

## 作业线分工

| 作业阶段 | 入口 Skill | 输入 | 结束产物 |
|---|---|---|---|
| 需求分析与设计工作流（Requirement workflow） | `ohos-req-intake-orchestration` | 原始需求、RR、PRD/会议纪要 | `AR.md` |
| 需求开发工作流 | `ohos-ar-dev-workflow` | 自然语言 AR 或需求分析与设计工作流 `AR.md` | PR、CI 和 P0-P8 证据 |

需求分析与设计工作流完成后通过 `AR.md` 显式交接，不自动启动需求开发工作流。这样可在交接点独立评审、断点恢复和版本演进。

## 需求分析与设计工作流核心阶段

| 步骤 | 主要产物 | 目的 |
|---|---|---|
| 0.1 | `01-requirement.md` | 需求澄清、FR/NFR 和 RR 基线 |
| 0.2 | `02-feasibility.md` | 代码证据、候选路径、风险和工作量 |
| 0.3 | `03-arch-decision-record.md` | 记录用户/评审会议选定的方案 |
| 0.4-0.6 | `04-feature.md` + Gate + 决策纪要 | 收敛验收和 proposal 拆分 |
| 0.7-0.9 | `IR.md` + Proposal + SR | 形成电子流和交付基线 |
| 0.9.1-0.9.2 | `handoff.md` + `AR.md` | 生成需求开发工作流可读输入 |

## 安装与触发

分析设计与需求开发所需 skills 都位于根 `skills/`，由同一命令安装：

```bash
bash sync-skills.sh --agent codex
```

重启 Agent 后，说“执行 Requirement workflow，从这份需求生成 AR”触发入口。

## 与知识库的关系

需求分析与设计工作流可使用 OpenHarmony 知识库缩小候选子系统、组件和仓库范围。知识库仍只是稳定导航；
文件、API、GN target、依赖和运行行为必须在当前源码中确认，并且在需求开发工作流 P1 再次复核。

## 维测

需求分析与设计工作流（Requirement workflow）在 `docs_dir/workflow_metrics.json` 记录每个 R1-R9 阶段的墙钟时间、人工等待
排除时间、有效耗时、实际调用的 skills 和人工介入分类。R1/R2/R3/R4/R6 的澄清、决策和评审等待
使用 `required_workflow`；意外解阻和用户主动纠偏分别使用 `blocked_unplanned`、
`user_correction`。维测是 advisory，不参与 Requirement Gate 或 `AR.md` 生成；命令细节见仓内
`skills/ohos-req-intake-orchestration/reference/observability.md`。

## 继续阅读

- [需求分析与设计工作流到 AR 交接](/sdd/ar-handoff)
- [需求开发生命周期](/workflow/lifecycle-overview)
- [知识库如何支撑 workflow](/knowledge-base/how-it-supports-workflow)
