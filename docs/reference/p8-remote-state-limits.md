# P8 线上状态真值与传播延迟：修改边界讨论

> 状态：讨论记录与设计边界。本文不改变当前 Gate 行为，也不构成阶段 PASS 证据。
> 本轮针对 GitCode PR head 传播延迟的代码修改已回退，仓库保留 HEAD 的 fail-closed 行为。

## 1. 讨论范围

本文只讨论 P8 `gate_upload_ci.py` 的 GitCode 上传状态判定：

- 本地分支 SHA、远端分支 SHA、PR head、CI 结果之间的关系；
- `pr_head_sha_mismatch` 等失败分类与恢复路径；
- 跨调用等待、持久账本、人工复验是否值得引入。

本文不讨论 P0–P7、Gerrit（仅作对照）、构建/测试/真机问题。P8 的失败必须按阶段归因：上库状态问题不能和编译失败、真机失败混在一起。

## 2. 线上“真值”不是单一状态

P8 的判定至少依赖五个异步来源：

| 来源 | 获取方式 | 特点 |
|---|---|---|
| 本地分支 SHA | `git rev-parse <branch>` | 本地立即可得，但不代表远端已接收 |
| 远端分支 SHA | `git ls-remote origin refs/heads/<branch>` | 接近实时，只能证明分支 ref 已更新 |
| PR head SHA | `oh-gc pr view --json` | 平台元数据，可能滞后于远端 ref |
| PR 目标/状态 | `oh-gc pr view --json` | 可能陈旧、已关闭或目标仓/分支不匹配 |
| CI 结果 | `openharmony_ci.py --pr N --json` | 事件驱动，可能 pending/stale/工具不可用 |

关键事实：同一个 commit 在不同来源上可能同时呈现不同状态，平台没有提供“本地 SHA + 远端 ref + PR head + CI 结果”的原子快照。所谓“真值”是**带时间的观测**，不是一个可以缓存的常量。

因此，单次查询看到的 `PR head SHA does not match local upload SHA`，可能只是元数据传播延迟，也可能是真实冲突；仅凭一次 view 无法区分。

## 3. 观察到的失败形态

这些失败在日志里都可能表现为“P8 失败”，但恢复动作完全不同：

| 形态 | 典型分类 | 合理动作 |
|---|---|---|
| 远端分支已到 pushed SHA，PR head 仍旧 | 传播延迟 | 等待后重跑，不应改代码 |
| 远端分支 SHA 与 pushed SHA 不同 | 真实冲突 | 人工确认目标/分支，必要时重置 |
| PR 号、源/目标仓或分支不匹配、PR 已关闭 | 目标不匹配 | fail-closed，不进入代码修复 |
| view 查询传输失败/超时、工具启动失败 | 外部/工具错误 | 重试或人工复验，不进入代码修复 |
| JSON/head 结构不可解析 | 元数据不可用 | 人工复验，保留证据 |
| CI pending/running/queued | CI 未完成 | WAIT/INFO，继续轮询 |
| CI 红灯、SHA 不一致、旧绿事件 | 真实失败 | fail-closed，保留真实红灯 |

问题不在于“有没有失败”，而在于**分类错了会把流程导向错误的恢复路径**：传播延迟被当成代码缺陷，会触发不必要的 repair/reset；真实冲突被当成延迟，会掩盖真正的上传问题。

## 4. 尝试过的修改与暴露的问题

本轮尝试为 P8 增加跨调用传播等待：保存 `pr_head_sync.json` 账本，记录 attempts、时间窗、`final_attempted`，在远端 ref 等于 pushed SHA 而 PR head 仍旧时返回 `pr_head_pending` WAIT；查询/工具错误进入 `pr_head_manual` 人工复验。

实现过程中暴露了以下问题：

### 4.1 新增持久状态就是第二个真值源

账本需要自己的完整性模型：损坏、截断、手改、字段类型异常、legacy 缺字段。任何一条都可能让 gate 在“fail-closed”和“可恢复”之间冲突：

- 账本损坏时，继续 fail-closed 会形成死循环；放宽解析又可能重置预算或掩盖错误；
- 损坏账本若生成 active repair packet，会把元数据问题导向 P1/P2 代码修复；
- 人工 `--pr-head-sync-recheck` 仍需先通过账本校验，无法绕过损坏文件。

门控契约的原则是“签名 manifest 才是真值”。再引入一个未签名、可变的等待账本，本身与这一原则相冲突。

### 4.2 跨 PR 隔离不是加一个布尔值就能完成

P8 支持用 `--pr N` 复验已有 PR。存在当前上传 checkpoint 时，另一个 PR 的复验会触及同一组控制文件：

- 可能覆盖 `evidence/phase8/pr_head_sync.json`、`pr.json`、`upload_review/substate.json`；
- 只隔离 WAIT 写入不够：后续 PR review/CI/PASS 路径仍可能为另一个 PR 发出签名 PASS，而当前上传 checkpoint 仍指向原 PR；
- 失败路径仍会写共享 `failure_report.json`、active repair packet、memory card，并累加 `workflow_metrics` 的 `fail_attempts`；
- 真正做到隔离，需要独立证据目录或在上游直接拒绝“`--pr` 与 checkpoint 不一致”，改动量超出单点修复。

### 4.3 等待状态是组合爆炸

需要同时覆盖：

- 本次 push / checkpoint 恢复 / 裸 `--pr` / 跨 PR；
- 首次查询 / pending 间隔内重跑 / attempts 耗尽 / deadline 耗尽 / 最终查询；
- `matched` 后再次出现陈旧 view；
- legacy checkpoint（历史版本可能在裸 `--pr` 时写入 `pushed_at=null`）；
- 查询错误、工具错误、结构错误、目标错误、真实 mismatch；
- 人工 recheck、预算重置、进程中断后的 `final_attempted`。

每个组合都需要状态、导航、测试和文档。任何一个边界漏掉，就会产生新的假失败、假 PASS 或死循环。

### 4.4 无界等待和有界等待都各自有问题

- 无界 WAIT：PR 元数据若长期不更新，P8 永远不失败，流程停在等待；
- 有界 WAIT：需要跨调用的 attempts/时间窗，于是回到 4.1 的持久状态问题；
- 本地进程内 sleep/重试：会阻塞流程，之前的同步重试方案已因此被否决；
- 单次 ls-remote + WAIT 的最小方案：仍然要改 head 判定、checkpoint 和 manual 导航，风险低于账本，但没有消除“超窗后仍然假失败”和“matched 后再陈旧”的边界。

### 4.5 指标与证据会被污染

- WAIT 以 INFO 写入 wait history 是合法的；FAIL 会增加 `fail_attempts`，进入周度评审数据；
- 跨 PR 复验的失败会累加当前上传的 P8 失败指标；
- 逐次不可变快照会随 CI 轮询增长，长时间等待会累积大量文件；
- 这些都不是“格式”问题，而是**归属**问题：另一个 PR 或一次外部抖动，被记成了当前上传的失败。

### 4.6 测试很难证明线上语义

- 本地 bare remote 和 mock 无法复现 GitCode 的元数据传播；
- mock 若固定返回某个 PR 号，`--pr 999` 实际走的是 target mismatch，真正的跨 PR 路径没有被覆盖；
- `SystemExit` 被测试捕获后，必须额外断言 failure_report/repair/metrics，否则“没有查询”可能被误认为“fail-closed”；
- 传播等待的价值只在真实平台时序中体现，单测只能证明分支逻辑，不能证明线上收益。

### 4.7 文档和 Skill 的同步成本

P8 的同一行为同时出现在 `phase8-upload-review.md`、两份 `SKILL.md`、两份 `gate-contract.md` 和 `advance.py` 导航说明中。每次调整等待语义都要同步 4–5 处，遗漏一处就会让弱模型按旧规则操作。状态机越复杂，漂移风险越高。

## 5. 为什么没有好的代码修改思路

1. **根因在平台侧**：GitCode 的 PR 元数据与分支 ref 最终一致，但没有原子读接口。本地 gate 只能观察和重试，不能命令平台立即一致。
2. **等待状态必然引入第二真值源**：任何跨调用预算都需要持久状态；一旦持久化，就要处理损坏、legacy、并发、跨 PR 和指标归属。这与“签名 manifest 是唯一真值”的契约冲突。
3. **状态空间与恢复路径不成比例**：原始问题是一次间歇性的假失败；完整方案却要覆盖 push/恢复/跨 PR/legacy/查询错误/预算耗尽等组合，维护成本远高于收益。
4. **fail-closed 的默认行为是安全的**：`pr_head_sha_mismatch` 不会改代码、不会破坏已上传内容，稍后重跑通常即可通过。把外部最终一致性建模进 P8，反而在唯一不可逆阶段引入了新的假 PASS 和 repair 风险。
5. **收益是体验型的**：减少一次假 FAIL 和一次假人工升级，不改变最终正确性；风险却是流程型的，一旦状态机出错会影响所有上传。

## 6. 结论与建议

**结论：线上真实状态复杂且异步；在当前 P8 契约下，没有低风险、可维护的代码修改思路。建议保持 HEAD 的 fail-closed 行为，不在 P8 内新增传播等待账本。**

运行建议：

- 遇到 `pr_head_sha_mismatch` 先短暂等待后重跑同一门控；多数情况下元数据会自行追上。
- 不要仅因该失败就修改功能代码或 `reset`；先用 `git ls-remote` 和 PR view 确认远端 ref 与目标。
- 在报告/指标中记录该类失败的实际次数和是否自愈，作为后续判断依据。

如果未来数据表明该问题确实造成实际损害（例如触发 `reset`、代码修改或大量无效重跑），再考虑**只做导航层**的最小改动：

- 查询/工具/元数据错误不生成 active repair packet，只给出人工重跑提示；
- 存在 checkpoint 时，显式 `--pr` 与 checkpoint 不一致直接拒绝；
- 不新增 ledger、attempts、逐次快照，不改变 checkpoint 持久化语义。

重新评估的触发条件：该类失败反复出现、实际引发代码修复或重置、或 GitCode 提供原子化的“PR head + CI”读取接口。

## 7. 本轮记录

- 观察：`result` 数据中多次出现 `pr_head_sha_mismatch`（本轮分析记录为 11 次），多数符合传播延迟特征。
- 尝试：跨调用账本、pending WAIT、final query、manual recheck、跨 PR 隔离；评审发现新增状态带来的 PASS/恢复/指标问题。
- 处理：相关代码、测试和文档修改已回退，仓库保留 HEAD 行为。
- 结论：如第 6 节；当前不继续在 P8 内实现传播等待。
