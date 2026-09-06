# Requirement workflow DSH 调用契约（v1）

本契约供宿主父 agent 和 `ohos-requirement` 原生 subagent 使用。R1–R9 采用同一个控制器，
模型推理由宿主负责。DSH 不调用额外模型 API，也不接管宿主的登录凭据。

## 父 agent 的调用循环

1. 核实并注册宿主的 `mcp_tools`、`native_subagent`、`workspace_write` 能力；R5 还要求
   `isolated_context`。能力必须来自实际探测。父 MCP 使用 `parent`，子 MCP 使用 `worker`，共享数据目录。
2. 调用 `ohos_requirement_start`。`docs_root` 必须是绝对目录；一个目录绑定一个 run。
   `input_ref` 可以是原始需求文件的绝对路径；若同时提供 `input_text`，它作为来源标签，文本保存到
   `docs_root/source-requirement.md`。启动执行仓库原有 `install_related_skills.py --check`，不自动安装依赖。
3. `next.status=dispatch_needed` 时启动一个宿主原生 `ohos-requirement` subagent，传递
   `run_id/role/expected_revision/host_binding_id/context_id`、输入路径和任务摘要。
   `context_id` 必须对应真实宿主子会话；可稳定编码为 128 字符内 ID，不能给同一上下文换名冒充独立审阅。
4. 子 agent 调用 claim → context → 执行阶段 skill → submit。上下文中的 `requirement` 给出
   skill 绝对路径、本文档路径、输出 manifest 路径、已接纳产物引用和已记录人工结论。
5. 父 agent 调用 `ohos_requirement_validate`，传入 `run_id/task_id/expected_revision/idempotency_key`。
   只有这一步完成结构校验后才会产生 `accepted`；submit 本身只是 `validating`。
6. `next.status=needs_input` 时展示对应文件和候选结论，收集用户实际回复；已明确给过的结论可据实记录。
   保存原文为独立的 UTF-8 文件，用 `ohos_requirement_decide` 提交 `source_ref`、`decision`、
   当前 `snapshot_digest` 及 task/revision。需要修改候选时调用 reset 后重新派发。
7. 断开或切换宿主后调用 `ohos_requirement_sync`；返回当前任务、等待点或已完成 AR 路径。
   每次新操作使用新幂等键，重试同一次操作复用原键。相同键的回放是历史回执；查询最新状态用新的 sync 键。

启动示例：

```json
{
  "input_ref": "D:/requirements/raw-request.md",
  "docs_root": "D:/requirements/feature-001",
  "idempotency_key": "req-feature-001-start"
}
```

## 阶段与产物

阶段中的子步骤沿用原 R1–R9 维测归属，例如 `R7-plan` 与 `R7-SR` 都记录为 R7。
已有 Markdown 可作为候选输入，但不会因存在 `status: Accepted` 就自动跳过任何阶段或人工结论。

| DSH 任务 | Skill / 角色 | 必需产物 | 人工等待 |
|---|---|---|---|
| R1 | requirement-intake / requirement-analyst | `01-requirement.md`（Clarified）、`clarification-questions.md` | 已知事实与澄清确认 |
| R2-input | 父 agent | 用户材料说明；提供材料或明确不额外提供 | 分析前材料确认 |
| R2 | feasibility-analysis / feasibility-analyst | `02-feasibility.md`（Clarified）、`_draft/feasibility-inputs.md` | 可行性澄清 |
| R3-options | arch-decision / architecture-analyst | `_draft/arch-options.md`（PendingDecision） | 选定方案、理由、决策者、遗留问题 |
| R3 | arch-decision / architecture-analyst | `03-arch-decision-record.md`（Accepted） | 使用已记录的架构决策 |
| R4 | feature-baseline / feature-analyst | `04-feature.md` | 展示并确认拆分边界、Owner、工作量、依赖 |
| R5 | review-gate / requirement-reviewer | 原生 Gate JSON、摘要 Markdown、FR→AC 追溯 JSON | 独立审阅；Not Ready 自动退回 R4 |
| R6-input | 父 agent | 用户提供的评审会议纪要 | 接纳、不接纳或重新上会 |
| R6 | value-decision / value-review-recorder | `value-decision-record.md` 及原生决策 JSON | 按已记录结论路由 |
| R7-plan | feature-to-ir / requirement-planner | `IR.md`、`05-proposal*.md`、完整拆解矩阵 | 每个 proposal 的 GA 证据 |
| R7-SR | proposal-to-sr / sr-author | 每个 proposal 独立的 `SR[-*].md` | 仅所有 GA 确认后派发 |
| R8 | intake-orchestration / handoff-author | `handoff.md`（Accepted） | — |
| R9 | intake-orchestration / ar-author | `AR.md`（Accepted，原模板 1–8 节） | — |

R1 必须包含 `feature_id`、`rr_id` 和明确 FR 编号；未立项使用已向用户确认的 `rr_id: 未立项`。
可行性和架构等原模板未全部强制 rr_id，DSH 提交时需补齐同名 frontmatter 追踪字段；它们不会替代原有业务字段。
Feature、IR、proposal、SR、handoff、AR 全程继承相同的 `feature_id/rr_id`。
R3 候选另存草稿，正式 ADR 在用户选型后生成，避免修改已经绑定确认的候选文件。

R5 只写审阅输出：FR→AC 追溯表另存 JSON，不修改已经确认的 Feature。
若需回填 Feature 备注或修改基线，先 reset R4，完成修改与拆分确认后重跑 R5。
R6 的纪要也单独保存；如需修改 01–04，按最低受影响阶段退回。可选 PPT 仍仅在用户提出时执行。

## 子 agent 提交文件

每次只向 `ohos_task_submit.artifact_refs` 提交当前上下文指定的 `requirement.manifest_path`，
默认为 `<docs_root>/_dsh/<phase>-r<revision>.json`。先创建父目录。
manifest 是额外 sidecar，不改变原生 Gate 的 schema。

```json
{
  "schema_version": 1,
  "run_id": "req-example",
  "phase": "R1",
  "revision": 1,
  "context_id": "host-session-001",
  "data": {}
}
```

字段必须取自当前领取结果。固定产物按上表命名，其他引用可以是 docs_root 内相对路径或绝对路径。
文件必须为非空 UTF-8 文件，每个最多 2 MB。路径逃逸（包括指向外部的符号链接）会被拒绝。
Markdown frontmatter 使用标量字段；本校验器不解析 YAML anchor、多行值或复杂对象。

需要填写 `data` 的任务：

| 任务 | `data` |
|---|---|
| R3-options | `{"options":["方案A","方案B"]}`；名称与候选文档保持一致 |
| R5 | `gate_ref`、`gate_summary_ref`、`traceability_ref` 三个文件路径 |
| R6 | `decision_ref`：原生 `ohos-req-value-decision` JSON 路径 |
| R7-plan | `proposals` 数组，格式见下方 |
| 其余 | `{}` |

R5 的追溯文件示例：

```json
{"links":[{"fr":"FR-01","ac":"AC-01"},{"fr":"FR-02","ac":"AC-02"}]}
```

每个 FR 和 AC 至少出现一次，不允许引用未知编号。Gate 采用原 skill 的 12 项检查，
`summary` 与 checks 数量必须一致；`conditions/observations` 使用原生字段，即使为空也应为数组。
控制器验证独立评审输出的结构与内部一致性，不自行阅读文档得出新的语义 Gate 结论。
Not Ready 退回 R4；Conditional Ready 的条件项必须携带 Owner、关闭动作和关闭时点，并传播到 IR/handoff/AR。

R7-plan 矩阵示例：

```json
{
  "proposals": [{
    "id": "PROP-01",
    "path": "05-proposal-01.md",
    "sr_path": "SR-01.md",
    "ac_ids": ["AC-01"],
    "complexity": "standard",
    "effort_pm": 7,
    "owner": "张工",
    "dependencies": []
  }]
}
```

Proposal ID、文件路径和 SR 路径均保持一一对应；dependencies 引用本矩阵内其他 proposal ID。
工作量上限采用 workflow 现行复杂度规则：`simple≤5 / standard≤8 / complex≤15` 人月。
部分旧 handoff 模板仍写统一 ≤5，本控制器使用分级规则。
IR 必须列出全部 proposal ID 和路径，AC 完整覆盖 Feature；Ready 对应 IR Baseline，Conditional Ready 对应 Conditional。
Proposal 的候选状态为 GA-Approved，但控制器仍等待实际 GA 证据，不凭 frontmatter 放行。
GA 通过后 SR 从批准的 proposal 提取；每个 SR 包含分析责任人、SE、TSE、测试责任人及本 proposal 的 AC。
不得引入本 proposal 未批准的 AC 编号。

## 人工决策对象

`ohos_requirement_decide` 的 `source_ref` 必须是保存实际用户回复或会议纪要的绝对文件路径。
控制器保存来源文件哈希；它不会验证文件内容确实由某个人撰写，父 agent 必须据实传入。

| 等待阶段 | `decision` 必需字段 |
|---|---|
| R1、R2、R4 | `{"confirmed":true}` |
| R2-input | `{"no_extra_materials":true}` 或 `{"no_extra_materials":false,"material_refs":["绝对文件路径"]}` |
| R3-options | `selection`（候选之一）、`rationale`、`decider`、`open_issues`（无则 `[]`） |
| R6-input | `decision: Accepted / Rejected / PendingRe-review`；重新上会另需 `target_phase` 和 `reason` |
| R7-plan | `approvals`：每个 proposal 一条 `proposal_id/decision:GA-Approved/reviewer/evidence_ref` |

`open_issues` 每项含 `description/owner/action/close_at`；ADR、handoff 和 AR 都需保留这些信息。
`evidence_ref/material_refs` 同样必须是可读取的绝对文件路径（远端证据先由宿主按授权保存到本地）。
PendingRe-review 的目标只能是 R1、R2、R3-options、R4，并与原生决策 JSON 的最低修改文档及 target_step 一致。
Rejected 在 R6 纪要记录后关闭，不派发 IR，也不会启动 AR 开发流程。

决策调用示例：

```json
{
  "run_id": "req-example",
  "task_id": "req-example:R4:1",
  "expected_revision": 1,
  "snapshot_digest": "取自 next.snapshot_digest",
  "source_ref": "D:/requirements/feature-001/human/split-confirmation.md",
  "decision": {"confirmed": true},
  "idempotency_key": "req-example-split-confirm-1"
}
```

## 恢复、返工和使用边界

SQLite 保存任务、产物哈希和决策，校验与状态更新在同一数据库事务中执行。
sync、领取新任务、validate 和 decide 都检查前置产物；发现变化后取消相关阶段及下游的旧记录，
增加 revision 并重新派发。历史记录保留，旧确认不能用于新快照。原始输入变更需显式 reset R1 接纳。

有活动写入者时，reset/sync 返回 needs_reconcile 并请求取消；父 agent 先停止子任务，释放租约，
核实进程停止后再 reset。需求任务租约过期会进入 needs_reconcile，不能自动拉起第二个写入者。
租约和 MCP 权限不等于 OS 沙箱：共享文件系统、宿主上下文身份及人工来源仍需真实宿主验证，
不得把本地协议测试宣称为强隔离证明。中途需要补充信息但候选尚未完成时，worker 返回问题及部分产物并 release，
父 agent 保存用户答复，在停止旧写入者后 reset 当前阶段，将答复路径随新任务传入。

`completed` 表示结构化需求产物链及指定人工确认已经接纳；自然语言事实、量化口径、拆分语义和业务范围的质量
仍由原 skill、独立审阅及用户把关。控制器不宣称对所有自然语言质量要求完成自动证明。
R8/R9 校验来源引用、代码行引用、选型、遗留项、条件与观测项传播，R9 校验 FR/NFR/AC 编号及八节模板。

完成时返回 `ar_path` 与 `handoff.requires_explicit_start=true`。父 agent 只在上层已要求开发时显式调用
`ohos_delivery_start`，并补充 repo_root/environment/build 等开发参数；需求工作流自身不修改 P0–P8 状态。
迁移旧的 R1 bootstrap run 没有自动批准入口：保留旧记录，将文档复制到新的 docs_root，从 R1 校验和确认开始。

DSH 上游 profile 启动和四宿主真实会话仍需单独验收；本模块的测试不消耗宿主模型套餐，也不提供实际提效百分比。
