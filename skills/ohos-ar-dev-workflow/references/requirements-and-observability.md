# 需求、变更与 workflow 维测

## 新人输入与代码事实

用户只需提供：发生场景、可观察的期望结果、不可接受结果、正常/异常示例、业务约束及不确定项。
Agent 负责从当前源码查明：仓和组件、调用链、接口/头文件、SA ID 与生命周期、GN 依赖、权限、
测试框架、构建产物和部署路径。代码事实未知时查源码或做探针；产品语义未知时用普通语言询问用户。

P1 先形成 Given/When/Then 验收矩阵，再做依赖可行性调查。人工确认的是行为、失败方式和验收示例，
不是要求新人判断技术文件清单是否正确。

## ar-contract v3

新 run 使用 `contract_version: "3.0"`，在 v2 字段上增加：

- `acceptance_cases[]`：`id/given/when/then/forbidden/for_requirements`；
- `dependencies[]`：提供仓、接口、头文件、构建 target、生命周期、失败行为、是否关键、验证状态及源码/探针证据；
- `change_scope.allowed_paths`：P1 冻结允许修改的所有权范围；
- `change_scope.public_api_change/behavior_change`：明确公开接口与行为影响。

关键依赖必须为 `verified` 且带 `evidence.type/source`，否则 P1 阻塞。`changed_files` 在 v3 中是计划导航，
不再要求每个计划文件最终都被修改；P2 检查实际文件全部位于 `allowed_paths` 后冻结真实清单。

## 验证结果与预期不一致

- 实现缺陷或不改变契约的私有重构：`repair` 回 P2，重跑开发及下游证据；
- 接口、依赖或技术设计假设改变：更新 v3 契约，`reset` 回 P1，只让人复核变化后的行为/风险；
- 用户期望或验收标准改变：更新需求与 acceptance cases，`reset` 回 P1；
- gate/证据误判：修 gate 并重新取证，不为迁就门禁修改产品设计。

历史签名证据不覆盖；新一轮通过 evidence epoch 与 `phases[].runs` 单独计时。

## 统一维测文件

每个 run 只使用 `$PDIR/workflow_metrics.json`。开头固定为：

```json
{
  "execution_context": {
    "agent": "codex",
    "model": "gpt-...",
    "skills": ["ohos-ar-dev-workflow"]
  }
}
```

其余内容自动维护：每阶段 `skills_used`、每轮打开/关闭时间、累计秒数、PASS/FAIL/gate 尝试次数，
以及人工介入和等待区间。墙钟时间保留真实交付周期；`effective_elapsed_seconds` 扣除人工等待，作为评价
workflow/模型的统一口径。人工一直不回复时，墙钟和排除时间同步增长，有效耗时不增长。

人工介入分类：

- `required_workflow`：P1/P6/P7/P8 设计内 consent，脚本自动记录；
- `blocked_unplanned`：非设计内停点，workflow/工具/环境不处理就走不下去；
- `user_correction`：用户主动纠正目标、输入、输出或实现方向。

每阶段实际使用 skill 时必须立即执行 `use-skill --name <skill>`；推荐但未调用的 skill 不记录。
后两类如果需要等待，必须使用 `human-wait start/end` 记录区间；当场完成、没有等待才使用 `intervene`：

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" human-wait start \
  --category blocked_unplanned --phase 4 --actor agent --reason "完整构建被无关工具链阻断"

python3 $S/advance.py --pipeline-dir "$PDIR" human-wait end \
  --category blocked_unplanned --phase 4 --actor <人> --reason "人工给出处理结论"
```

agent/model/skills 缺失或换 Agent 时，用 `context` 增补，禁止直接编辑统计文件：

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" context \
  --agent codex --model <模型> --skill <本次实际使用的 skill>
```

面向使用者的完整操作口径见 `docs/workflow/observability-usage.md`。
