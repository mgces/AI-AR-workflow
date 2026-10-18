# 门禁失败的下一步优化总结：维护说明

页面入口：运行统计首页导航 → “门禁失败的下一步优化总结”。

本页记录 workflow 自身的改进计划。历史会话中的产品修复、单次 PASS、后续 CI 结果不能直接作为 workflow 优化完成的证据。

2026-10-09：15 项已实现，待真实运行验收。`dist/optimization-plan.mjs.offlineAssessment` 保存本轮 16 个 A/B 样例结果；8 类历史误判/配置/取证样例从 8 类未达到预期降为 0 类，不能换算成真实 37 次 FAIL 的降幅。完整实现和真实运行方式见 `docs/workflow/workflow-optimization.md`。网页仍显示效果已验证为 0。

## 维护改进项

2026-10-18：依据当前公开快照的 11 次运行补充 WF-16–WF-23，均为待优化。快照共有 192 次门禁 FAIL / 535 次尝试；4 次运行记录了 41 次预检失败，其他 7 次运行的预检计数未知。59 次门禁 FAIL 缺少具体原因，其中新纳入的 unwinder、hdc、data-clean 合计 54 次；已有阶段级线索不能分摊成逐次根因。本次仅更新复盘页面与计划，不表示这些 workflow 机制已经实现或效果得到验证。

“最新运行失败复盘”每次打开或点击“刷新总结”时读取当前 `data.json`，合并本浏览器导入。正式门禁、预检、缺失原因、阶段线索和预期审核停点分别展示，原始失败计数与共享数据不改写。已有修复及复验按原记录呈现；重跑 PASS 不等于修改已解决。

`failure-review.mjs` 的 `reviewedRunUpdates` 记录本次人工复盘所依据的精确快照版本。新运行或同一 run-id 的更新版本会自动出现，但标记为待人工复盘。维护者核对新证据、更新 `plans[].sourceCases` 后才更新对应版本；不自动生成或声称已完成人工根因分析。

唯一数据源是 `dist/optimization-plan.mjs` 的 `plans`。每项包含稳定编号、阶段、归因、优先级、历史案例、workflow 措施、验收标准和进度。

- `planned`：待优化；默认状态。
- `in_progress`：优化中。
- `implemented`：已实现，待验收；填写 `changeRef` 和 `regressionEvidence`。
- `verified`：效果已验证；还必须填写 `effectEvidence`，列出后续运行及比较口径。
- `deferred`：暂缓；说明原因及复查条件。

`owner`、`updatedAt` 用于维护负责人和更新时间。页面没有浏览器临时改状态功能，进度更新随仓库提交保存。

每批新运行后复盘重复原因；建议每周选择高优先级条目实施。先用历史失败样例回归，再观察后续运行的同类失败复发次数、首次真实门禁通过率及返工耗时。预检发现的问题也要留记录。

## 证据口径

`sourceCases[].scope` 必须保留：

- `snapshot`：快照阶段证据，仍可能无法逐次对应。
- `context`：手动排查或阶段上下文，未证实计入门禁 FAIL。
- `later`：后续会话；不能倒推旧快照失败原因。
- `unknown`：逐次原因未知。

三次旧快照合计 90 次尝试、37 次 FAIL。改进项数量及案例条数都不是 FAIL 次数。resmon 的旧 P2/P3/P7/P8 原因缺失；hiperf 的手动链接及后续 MinGW 问题不能直接纳入旧 16 次 FAIL。

点击案例可从当前 `data.json` 查看对应运行和阶段；快照读取失败不会删除页面中已整理的历史线索。通过 HTTP 预览，可使用现有的本地 4173 服务。

## 导出与验证

在仓库根目录运行现有导出命令：

```bash
python3 workflow-metrics-site/export_metrics.py --public-dir docs/public/workflow-metrics
```

该入口在指标导出后同步优化页资产及导航。同步仅复制六个页面文件（含最新复盘统计模块），不读取或复制原始 session、ZIP 或 `products/.run`。仅修改优化内容时也可单独同步：

```bash
python3 workflow-metrics-site/sync_optimization_assets.py --public-dir docs/public/workflow-metrics
node --test workflow-metrics-site/tests/optimization.test.mjs
python3 -m unittest discover -s workflow-metrics-site/tests -p 'test_sync_optimization_assets.py'
```

页面源码与公开镜像分别位于 `workflow-metrics-site/dist/` 和 `docs/public/workflow-metrics/`。发布前检查两份优化文件一致，页面筛选、重置、案例证据与原统计页钻取均可用。
