# OpenHarmony 作业线维测使用说明

本说明用于收集可横向比较的作业线运行数据。需求开发入口每个 run 只提交一份
`$PDIR/workflow_metrics.json`；需求分析与设计工作流（Requirement workflow）每个需求目录只提交一份
`{docs_dir}/workflow_metrics.json`。不要手改统计文件：需求开发通过 `advance.py`，需求分析与设计工作流
（Requirement workflow）通过 `requirement_metrics.py` 记录，避免不同使用者采用不同口径。

需求分析与设计工作流（Requirement workflow）的阶段映射和命令详见 [需求分析与设计工作流](/sdd/)，以及仓内
`skills/ohos-req-intake-orchestration/reference/observability.md`。
两个入口的 JSON 都使用 schema version 2；汇总时按 `workflow` 字段区分来源。

## 1. 统一时间口径

- `elapsed_seconds`：阶段墙钟时间，从阶段打开到关闭，保留真实经过时间；
- `human_wait_excluded_seconds`：等待人工回复的时间；
- `effective_elapsed_seconds`：`elapsed_seconds - human_wait_excluded_seconds`，用于评价 workflow 效率；
- 多次 `repair/reset` 产生多个 `runs`，分别保存后累计；
- 同阶段多个等待区间重叠时按时间并集扣除一次，不重复扣减；
- 人工一直没有回复时，等待区间保持 `waiting`，墙钟时间和排除时间同时增长，因此有效耗时不增长。

后续汇总性能时使用 `workflow_effective_elapsed_seconds`，不要用墙钟时间评价模型或 workflow。
墙钟时间只用于观察真实交付周期。

## 需求分析与设计工作流（Requirement workflow）初始化

需求分析与设计工作流不创建 `$PDIR` 或 P0-P8 状态机；在 `docs_dir` 创建一次指标文件，并用 R1-R9
记录需求分析与设计阶段：

```bash
M="$SKILLS_DIR/ohos-req-intake-orchestration/scripts/requirement_metrics.py"
METRICS="$DOCS_DIR/workflow_metrics.json"
python3 "$M" --metrics "$METRICS" init \
  --run-id "$CHANGE_ID" --agent codex --model "$MODEL" \
  --skill ohos-req-intake-orchestration
python3 "$M" --metrics "$METRICS" stage-open --phase R1
```

阶段完成后执行 `stage-close`；实际调用的每个关联 skill 执行 `use-skill`。R1/R2/R3/R4/R6 的
人工交互遵循本页同样的 `human-wait start/end` 和三类介入分类。完整 R1-R9 映射及示例见
`skills/ohos-req-intake-orchestration/reference/observability.md`。

## 2. 初始化 Agent、模型和 P0 skills

```bash
python3 $S/advance.py init \
  --repo "$OHOS_ROOT" --run-id "$RUN" \
  --environment openharmony \
  --agent codex --model gpt-5.x \
  --skill ohos-ar-dev-workflow
```

`execution_context.skills` 是全流程 skills 去重汇总；`phases.<N>.skills_used` 才是阶段实际使用记录。

## 3. 每个阶段记录实际使用的 skills

进入阶段后，每实际调用一个 skill 就记录一次；重复记录会自动去重：

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" use-skill \
  --phase 2 \
  --name code-ruleset-style-check \
  --name ohos-dev-sa-codegen
```

未实际调用的推荐 skill 不得记录。未传 `--phase` 时记录到当前阶段。

## 4. 正常 consent 等待

以下等待由 gate 自动开始、由 `consent` 自动结束，无需手工执行 `human-wait`：

- P1 签名设计审核；
- P6 真机结果审核；
- P7 质量和 review 审核；
- P8 push 前 diff/目标审核。

人工长时间不回复时保持等待即可，不要为了“停止计时”提前 consent。等待时间会自动从有效耗时扣除。

## 5. 非正常解阻或用户主动纠偏的等待

需要停下来问人时立即开始等待：

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" human-wait start \
  --phase 4 --category blocked_unplanned \
  --actor agent \
  --reason "完整构建被无关工具链错误阻断，需要人工判断证据"
```

收到回复时立即结束：

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" human-wait end \
  --phase 4 --category blocked_unplanned \
  --actor reviewer \
  --reason "同意按目标产物证据继续"
```

用户主动纠正需求时，将分类改为 `user_correction`。如果人当场完成操作、没有等待，可继续使用
`intervene` 记录一次瞬时介入：

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" intervene \
  --category user_correction --reason "失败时应返回明确错误，不能返回空结果"
```

三类介入口径：

| category | 含义 | 是否正常设计点 |
|---|---|---|
| `required_workflow` | P1/P6/P7/P8 consent | 是 |
| `blocked_unplanned` | 不由人处理就无法继续 | 否 |
| `user_correction` | 用户主动修正目标、输入、输出或预期 | 否 |

## 6. 逐次失败与修复

每次 P0-P8 门禁签名 PASS/FAIL 都会自动写入该阶段的 `attempt_history`：`id=manifest:<seq>`、
`round`、`first_attempt`、`verdict`、门禁名和真实 `reason`。首次尝试以“同一阶段轮次内的同一门禁”为口径；
`summary.first_gate_attempts_total/first_gate_passes_total/first_gate_failures_total` 给出首轮通过情况，
`first_gate_review_holds_total` 单列 P8 预期的 consent 预检停点。旧文件只有汇总次数而没有逐次记录时，
`first_attempt` 是 `null`，`unrecorded_gate_attempts_total` 显示缺失次数，不反推失败原因。

实际修改完成后、重跑同一门禁前，先查看失败序号并记录修改：

```bash
# 在含有已初始化 PDIR 的源码仓中运行，命令只更新 PDIR/workflow_metrics.json；
# 签名证据仍由 gate_*.py 产生，不由以下命令改动。
S="$SKILLS_DIR/ohos-ar-dev-phases/scripts"
python3 "$S/advance.py" --pipeline-dir "$PDIR" failures
python3 "$S/advance.py" --pipeline-dir "$PDIR" fix \
  --attempt-id manifest:3 --root-cause "目标 BUILD.gn 遗漏依赖" \
  --action "补全 BUILD.gn 中缺失的目标依赖" \
  --change-ref "base/hiviewdfx/hiview/BUILD.gn"
# 再运行当前阶段 gate_*.py；同一门禁下一次签名结果决定复验状态。
python3 "$S/advance.py" --pipeline-dir "$PDIR" failures --json
```

`fix` 保存人工查明的根因与实际修改说明，默认 `pending_verification`；后续同门禁 PASS 才成为 `resolved`，
后续同原因 FAIL 成为 `not_resolved`；若 FAIL 的原因变化，则标为
`gate_still_failed_different_reason`（门禁仍未通过，原根因是否解决待确认），并生成独立的新失败记录。未经记录修改而重跑 PASS 标为
`passed_without_recorded_fix`，不冒称修复生效。不同门禁的 PASS 不会解除这次失败。P8
`gate_upload_ci.py:consent-precheck` 的 FAIL 属于 `expected_review_hold`，应走正常人工确认，
不是“代码修复失败”。不要在 `--action` 或 `--change-ref` 中写入令牌、账号、密钥或设备序列号。

## 7. 提交维测文件前检查

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" status
python3 -m json.tool "$PDIR/workflow_metrics.json" >/dev/null
```

检查以下事项：

- `execution_context.agent/model` 不是 `unknown`；
- 每个实际执行过的阶段都有 `skills_used`；
- `human_wait_open_count` 为 0；若 workflow 仍在等人，可以保留非 0，但提交时说明尚未完成；
- 人工介入 reason 是具体事实，不写“有问题”“人工处理”等模糊描述；
- 不提交 consent token、账号密码、设备密钥等敏感内容。

## 8. 文件关键结构示例

```json
{
  "execution_context": {
    "agent": "codex",
    "model": "gpt-5.x",
    "skills": ["ohos-ar-dev-workflow", "code-ruleset-style-check"]
  },
  "schema_version": 2,
  "phases": {
    "2": {
      "name": "feature-develop",
      "skills_used": ["code-ruleset-style-check"],
      "elapsed_seconds": 1800,
      "human_wait_excluded_seconds": 600,
      "effective_elapsed_seconds": 1200,
      "runs": [
        {
          "opened_at_utc": "2026-08-29T08:00:00Z",
          "closed_at_utc": "2026-08-29T08:30:00Z"
        }
      ],
      "gate_attempts": 2,
      "pass_attempts": 1,
      "fail_attempts": 1,
      "attempt_history": [
        {
          "id": "manifest:3", "gate": "gate_develop.py", "verdict": "FAIL",
          "reason": "缺少目标依赖", "round": 1, "first_attempt": true,
          "fixes": [{"root_cause": "目标 BUILD.gn 遗漏依赖", "action": "补全 BUILD.gn 依赖", "change_ref": "BUILD.gn",
                     "verification_verdict": "PASS", "verification_attempt_id": "manifest:4"}],
          "resolution_status": "resolved", "verified_by": "manifest:4"
        }
      ]
    }
  },
  "human_interventions": [],
  "human_wait_intervals": [],
  "summary": {
    "workflow_wall_elapsed_seconds": 7200,
    "workflow_human_wait_excluded_seconds": 1800,
    "workflow_effective_elapsed_seconds": 5400
  }
}
```

后续根据各团队返回的原始 JSON 和本说明统一生成汇总文档。原始文件应保留，不要只提交人工整理后的表格。
