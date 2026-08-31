# 需求分析与设计工作流（Requirement workflow）维测

需求分析与设计工作流（Requirement workflow）使用独立的 `workflow_metrics.json` 收集运行数据，和需求开发工作流的
`$PDIR/workflow_metrics.json` 分开保存。默认路径是 `{docs_dir}/workflow_metrics.json`；该文件是
**advisory**，不参与 Gate、AR 生成或任何需求决策，也不能替代正式产物。

## 记录器与统一口径

记录器位于：

```text
{SKILLS_DIR}/ohos-req-intake-orchestration/scripts/requirement_metrics.py
```

作业线的两个入口使用 schema version 2 的同一组核心字段：

- `elapsed_seconds`：阶段从打开到关闭的墙钟时间；
- `human_wait_excluded_seconds`：等待人工回复的时间，重叠区间只扣除一次；
- `effective_elapsed_seconds`：墙钟时间减去人工等待；
- `skills_used`：本阶段实际调用的 skill，自动去重；
- `human_interventions` / `human_wait_intervals`：人工介入和等待区间；
- `summary`：阶段和全流程的墙钟、排除等待、有效耗时及介入分类汇总。

需求分析与设计工作流的稳定阶段 ID 如下：

| ID | 范围 |
|---|---|
| R1 | requirement intake（含 0.1.5 澄清） |
| R2 | feasibility（含 0.1.8/0.1.9/0.2.5） |
| R3 | architecture decision（含 0.3.2 决策收集） |
| R4 | feature baseline（含 0.4.1 拆分确认） |
| R5 | Review Ready Gate、AC 校验和可选 PPT |
| R6 | 评审决策纪要回流（0.6） |
| R7 | IR、Proposal 和 SR |
| R8 | handoff.md 完整性校验 |
| R9 | AR.md 生成与出口 |

## 编排器操作

在 `docs_dir` 确定后初始化一次：

```bash
METRICS="{docs_dir}/workflow_metrics.json"
M="{SKILLS_DIR}/ohos-req-intake-orchestration/scripts/requirement_metrics.py"

python3 "$M" --metrics "$METRICS" init \
  --run-id "{change-id}" --agent codex --model "{model}" \
  --skill ohos-req-intake-orchestration
```

每个阶段按“打开 → 实际调用 skill → 关闭”记录。重复打开会复用当前轮，阶段被重新处理时会追加
一个 `runs[]`：

```bash
python3 "$M" --metrics "$METRICS" stage-open --phase R1
python3 "$M" --metrics "$METRICS" use-skill --phase R1 \
  --name ohos-req-requirement-intake
# 需求产物定稿后
python3 "$M" --metrics "$METRICS" stage-close --phase R1 --result completed
```

实际调用的每个 skill 都要记录，推荐但未调用的 skill 不记录。需要记录一次非权威尝试时可用：

```bash
python3 "$M" --metrics "$METRICS" attempt --phase R5 \
  --action review-ready-gate --result conditional-ready
```

## 人工等待与介入

以下交互是需求分析与设计工作流设计内的正常停点：R1 澄清、R2 可行性澄清、R3 方案决策、R4
拆分确认、R6 评审决策。进入提问前开始等待，收到回复后结束等待；`required_workflow` 介入在结束
等待时计数，避免把尚未回复的人误计为已完成介入：

```bash
python3 "$M" --metrics "$METRICS" human-wait start \
  --phase R3 --category required_workflow \
  --reason "等待用户确认架构候选方案"

python3 "$M" --metrics "$METRICS" human-wait end \
  --phase R3 --category required_workflow --actor reviewer \
  --reason "用户确认方案 B，并补充兼容性约束"
```

意外阻塞或用户主动纠偏同样排除等待时间，但分类必须准确：

```bash
python3 "$M" --metrics "$METRICS" human-wait start \
  --phase R2 --category blocked_unplanned --actor agent \
  --reason "缺少用户指定的接口文档，无法完成可行性判断"
python3 "$M" --metrics "$METRICS" human-wait end \
  --phase R2 --category blocked_unplanned --actor reviewer \
  --reason "补充接口文档路径后继续"
```

没有等待、当场完成的介入使用 `intervene`：

```bash
python3 "$M" --metrics "$METRICS" intervene --phase R4 \
  --category user_correction --reason "用户将拆分边界从按仓调整为按功能点"
```

阶段完成后可标记全流程结果：

```bash
python3 "$M" --metrics "$METRICS" complete --result accepted
python3 "$M" --metrics "$METRICS" status
python3 "$M" --metrics "$METRICS" status --json
```

如果维测文件写入失败，先保留命令输出和原因并继续处理需求产物；维测失败不等于需求 Gate
通过或失败。提交前检查 JSON 合法性、`human_wait_open_count` 和是否误写入账号、令牌、密码或
其他敏感信息。
