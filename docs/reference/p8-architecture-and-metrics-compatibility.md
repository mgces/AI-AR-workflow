# P8 架构问题、指标兼容与演进边界

> 状态：架构与兼容性结论记录。本文不改变当前 Gate 行为，也不构成阶段 PASS 证据。
>
> 主要来源：
> - `development-assistant/core-architecture/p8-architecture-analysis-report.md`
> - `development-assistant/core-architecture/p8-published-metrics-field-compatibility.md`
>
> `p8-architecture-problems.md` 已过时，只保留为历史风险清单，不作为本文结论依据。
>
> 本地分析材料不进入 Git；源码和实际 Gate 行为仍是唯一真源。

## 1. 结论摘要

**当前不建议对 P8 做整体状态机或授权协议重构。** 应保留当前 fail-closed 真相与授权边界，优先做证据充分、行为局部、可独立回滚的安全和观测加固。

理由：

- 现有数据证明 P8 确实承受了线上状态传播延迟、CI pending、review 等待和高频重试；
- 但尚不能证明引入新的持久状态层、改变签名/verdict 语义或替换跨调用状态机能够降低总成本；
- 更不能证明这些改动不会制造假 PASS、授权错绑、重复 push 或旧 run 不兼容。

核心判断：

> **收益明确存在于减少无效失败分类、重试和人工排查；收益尚未证明足以支撑 truth 层或授权层重构。**

针对已发布指标：

> **冻结现有字段的名称、类型、基础含义和既有值；不在旧字段上静默改变统计口径。**

## 2. 当前 P8 的实际架构

### 2.1 四类责任

| 责任 | 当前载体 | 边界 |
|---|---|---|
| 流水线阶段 truth | `evidence/manifest.jsonl` 的 HMAC 链；`validate_closing_entry` 检查最后 PASS 与 artifact 哈希 | 阶段闭合权威；phase summary/control packet 不能替代 |
| P8 上传授权 | `consent-precheck` 签名 FAIL + `upload_consent_request.json` 中的 diff/stat 哈希与目标字段 | 特意不是最终 PASS；授权必须在 push 前生效 |
| P8 子流程控制 | 七个子状态、failure-to-substate 映射、substate、checkpoint、repair packet | 控制/恢复输入，不能单独放行；多个文件需保持一致 |
| 观测指标 | `workflow_metrics.json`：attempt_history、wait_history、失败分类、耗时 | 可用于运维分析，但不授权 |

额外的外部投影：

- DSH / delivery bridge 调用既有 Python 门控；
- 外围控制器不应形成替代签名 manifest 的权威。

### 2.2 当前主路径

```text
DRY：
  生成 tracked/untracked full diff + 统计
  写 upload_consent_request
  写签名 consent-precheck FAIL
  清除 repair/failure 控制
  导航到 consent_await

consent：
  绑定当前签名 precheck

publish：
  A 本地 review 零问题
  commit -s / push
  创建或发现 PR，写签名 checkpoint
  B PR review 零问题
  CI / SHA 验证
  写最终签名 PASS

advance：
  校验最终 PASS + consent
  关闭 P8
```

### 2.3 已有能力

P8 不是“没有状态机”，而是：

- 已有七个显式子状态；
- 已有签名授权预检；
- 已有 push checkpoint；
- 已有 CI 与 SHA 绑定；
- 已有 WAIT/INFO；
- 已有失败升级；
- 已有多个恢复测试。

更准确的描述是：

> **已有局部状态机和多份权威/控制/观测工件，但跨工件状态所有权、版本化迁移和部分异常恢复尚未成为一个完整、可验证的协议。**

## 3. 数据说明了什么

对 `result/**/workflow_metrics*.json` 按 `run_id` 去重后：

- 9 个不同 run；
- 1 个旧 run 在 P8 无尝试；
- 8 个有 P8 gate attempts；
- 4 个最终 PASS 并闭合；
- 2 个最终 FAIL；
- 2 个最后状态 INFO（未闭合）。

唯一运行级样本中：

- 54 条 P8 `attempt_history`；
- 累计 53 次 `fail_attempts`；
- 21 条 `expected_review_hold`；
- 27 条 `gate_failure`；
- 6 条缺失 `failure_kind`；
- `wait_history` 23 条，其中 12 条 `pr_review_missing`、11 条 `ci_wait`。

这些数据能支持：

1. **失败分类和 hold 表达值得改进**  
   21 个预期 hold 仍进入 `fail_attempts`，未区分口径的失败率会偏高。应新增只读分析口径或分栏，不改变签名门禁语义。

2. **远端 WAIT/重试可观测性有现实价值**  
   23 条 wait 记录说明 PR review 和 CI 确实会等待；应能识别等待种类、上次观察时间和推荐复验动作。

3. **post-push SHA 不匹配存在真实个案**  
   `result/7` 中记录过 immediate PR head 旧于 pushed SHA、后续只读观察追上；同一 run 也有真实 CI failed/旧事件/未知状态。因此收益是减少外部状态误分类，不能把所有 FAIL 都算成假失败。

数据不能支持：

- 整体 P8 重构一定更快/更稳；
- 27 次 gate_failure 都是平台抖动；
- 21 次 hold 应从原始失败计数中无痕删除；
- 新增传播延迟 ledger 一定能自愈或不会形成第二真相源。

## 4. 架构问题与风险

### 4.1 权威边界多，但跨文件协议未统一

**事实：** final PASS、precheck consent、substate、checkpoint、repair/control、metrics 各自服务不同目的；签名 manifest 是最终阶段 PASS 真相，consent 在最终 PASS 前引用另一个签名 precheck。

**风险：** 同一 run 的目标身份、SHA、substate、checkpoint 与 metrics 要在多处协调；异常中断、legacy 数据、显式 `--pr` 复验等场景可能触发不一致。现有验证函数提供局部约束，但尚无单一文档化的、覆盖所有入口的迁移/恢复表。

**判断：** 中高结构风险，是架构演进成本；不等同于当前已存在假 PASS。

### 4.2 人工授权被编码成 FAIL verdict

**事实：** dry-run 的有意停点记录为：

```text
gate = gate_upload_ci.py:consent-precheck
verdict = FAIL
failure_class = dry_run_no_pass
```

这是为了提供 HMAC 链锚点供 consent 绑定，同时拒绝它闭合 P8。metrics 会把它分类为 `expected_review_hold`，但该事件仍递增 `fail_attempts`。

**收益机会：** 把“人类授权待办”和“门禁失败”区分呈现，可提升失败率和首次通过率解释性。

**变更风险：** 改 verdict/manifest schema 会影响 consent validator、advance、历史 run、失败修复关联、Metrics UI 和 DSH projection；不能作为局部统计清理悄悄修改。应先在只读分析层或新指标版本中拆分。

### 4.3 状态机存在，但覆盖范围和所有权分散

**事实：** P8 已有七个子状态及 failure-to-substate 映射；DSH 又把 precheck/publish 拆为两个任务。

**风险：** 状态迁移与恢复规则分布在 gate、advance、gatelib 和消费者逻辑；更改 failure class 或 substate 时需要同步导航、恢复、指标和文档。

**判断：**

> “无显式状态机”不成立；“显式子状态机尚未成为全系统统一协议”成立。

### 4.4 线上观察延迟与 fail-closed 的操作成本

**事实：** P8 的线上状态至少有本地 SHA、远端 git ref、PR/Change head、review、CI 事件；GitCode 不提供原子读取。同一时点可能出现“远端 ref 已更新但 PR head 仍旧”或“PR head 匹配但 CI 是旧事件”。

**收益机会：** 区分传播延迟、查询错误、真实 SHA 冲突、CI 红灯，减少把外部不稳定误导向代码修复。

**变更风险：** 把 mismatch 改成跨调用 WAIT 需要持久化预算、超时、进程中断、legacy checkpoint、跨 PR 隔离和重新查询条件；账本不是签名事实，损坏时恢复与 fail-closed 冲突。当前讨论已列出这些组合风险。因此更宜先改诊断/导航与数据采集，而不是引入新状态源。

### 4.5 恢复有覆盖，但不能推导为全路径安全

已有：

- checkpoint 恢复；
- WAIT；
- dry-run 幂等；
- non-fast-forward preflight；
- 409 冲突重查询。

这些主要是本地/模拟测试，不覆盖真实 GitCode/Gerrit 最终一致性、权限和 CI 事件时序。

准确结论：

> 关键恢复机制有较强自动化回归，但外部平台契约与端到端时序尚未被这些测试证明。

### 4.6 安全绑定是高影响审查点

授权意图包含 diff/stat 哈希、目标与 head SHA；`write_full_diff` 还尝试纳入未跟踪文件。这提供了重要安全基础，但仍需独立故障注入：

- git 命令失败；
- 未跟踪/忽略文件；
- diff 与 `git add -A` 集合差异；
- consent 后工作区变化；
- checkpoint/PR 目标错配。

当前源码中 `write_full_diff` 未直接检查 `git diff` 返回码，这是**值得验证的安全假设**，不能仅凭文档断言“已能授权空 diff”；应先确认调用路径是否在前置检查中处理 git 错误，再决定是否修复。

`head_owner` 会由 `fork_qualified_head` 优先从 origin remote 推导，不能简单说目标完全未绑定。

### 4.7 外部投影耦合需要逐消费者验证

公开资料显示：

- metrics UI 展示 `expected_review_hold`；
- DSH runtime 以 Python bridge 调门控；
- 平台/运行时维护独立的阶段与任务契约。

但现有证据不足以支持“delivery_bridge/UI 都直接把 manifest 条目当状态权威”的笼统断言。

结论：

> 消费者兼容风险存在，但必须按实际字段读取和契约测试来证明，不能预设所有外部层直接依赖 manifest 内部结构。

### 4.8 测试覆盖：内部控制强，外部真实语义弱

- P8 recovery/backend 有针对性测试，覆盖 consent、checkpoint、WAIT、SHA、CI、Gerrit 配置与解析；
- DSH 有全流程与 precheck/publish 外层测试，但主要验证调用契约，不等于线上 API 演练；
- `result/` 是实际交付证据，但样本少、受特定任务和平台时序影响，不是随机化或受控实验；
- 仍缺真实 GitCode/Gerrit 沙箱的重复演练：push 成功但客户端超时、PR metadata 延迟、旧 CI event、跨 PR 参数、权限变化、进程中断恢复。

## 5. 已发布 Metrics 的兼容结论

### 5.1 冻结已发布字段

建议冻结名称、类型、基础含义和既有值：

- `phases[*].gate_attempts`
- `phases[*].pass_attempts`
- `phases[*].fail_attempts`
- `phases[*].attempt_history`
- `attempt_history[*].verdict`
- `attempt_history[*].failure_kind`
- `attempt_history[*].failure_category`
- `phases[8].wait_history`
- `summary.first_gate_attempts_total`
- `summary.first_gate_failures_total`
- `summary.first_gate_review_holds_total`
- 公开 snapshot 的 `failures`、`failure_details`、`first_gate_*` 等

不允许在同一 schema version 下静默改变含义。

### 5.2 不原地修改 `fail_attempts`

`expected_review_hold` 确实进入 `fail_attempts`，但页面和公开数据已把它定义为“门禁 FAIL 尝试（含确认停点）”。原地扣除 hold 会造成：

- 同字段跨时间异义；
- 历史趋势不可比；
- 旧 reader 静默给出错误含义；
- 发布 merge、浏览器备份、缓存混合两种口径；
- 计数与明细的一致性校验失败；
- 数字下降被误读为质量改善。

因此原地修改的边际收益有限，兼容风险无法低成本消除。

### 5.3 Raw Contract + Derived View

**Raw Contract（冻结）**

```text
gate_attempts
pass_attempts
fail_attempts
attempt_history
failure_details
wait_history
```

回答：“门禁实际记录了什么？”

**Derived View（可新增、版本化）**

```text
review_hold_attempts
operational_fail_attempts
wait_event_count
classified_fail_attempts
unclassified_fail_attempts
```

回答：“为了运维和决策，应如何解释原始记录？”

派生规则：

```text
review_hold_attempts
  = count(attempt_history where verdict=FAIL
          and failure_kind=expected_review_hold)

operational_fail_attempts
  = fail_attempts - review_hold_attempts
```

只有 `attempt_history` 足以对应所有失败时，派生值才能标记为 complete；历史明细不足时应为 `null` 或 `derivation_quality=incomplete`，不能把未知失败自动当作操作失败或审核停点。

### 5.4 何时必须升 schema

满足任一条件必须新版本：

- 改变字段含义、单位、类型、null 语义或计算公式；
- 修改 `failures == sum(phases.fail_attempts)` 等一致性约束；
- 将 review hold 从旧 failures 中扣除；
- 给外部消费者提供新的正式统计口径；
- 需要迁移/回填历史派生值；
- 删除或重命名公开字段。

推荐：

- 原始 metrics 与公开 snapshot 分别版本化；
- 读旧写新；
- 双算校验；
- 历史重放；
- v1/v2 页面兼容；
- 灰度发布；
- 可回滚；
- 不重写历史原始指标。

## 6. 当前约束下的实际选择

如果页面、已发布字段和 metrics 格式都不能修改：

```text
旧字段冻结 + 页面不能改
= 页面继续显示包含 review hold 的失败尝试数
```

只能在页面之外解决：

- 周报/分析脚本过滤 `expected_review_hold`；
- 导出或报告同时给出 raw 与 derived 口径；
- 文档说明原始 FAIL 包含确认停点；
- 不把页面数字直接当成代码失败率。

如果允许 UI 或 schema 演进：

- 只改标签与帮助文字；
- 页面运行时派生 hold / operational failure；
- 正式发布 snapshot v2，保留 v1 raw 字段并新增派生字段；
- 双读、双算、历史重放和灰度发布。

如果要把页面数字直接改“准确”，必须明确接受统计口径变化或正式重构，不能在旧字段下静默换义。

## 7. 推荐路线与门槛

### 7.1 现在执行：不改权威语义的观测和验证

- 保留 manifest、consent、checkpoint 和 PASS 条件；
- 给 metrics/UI 增加显式分栏：`gate_failures`、`expected_review_holds`、`waits`、`external_observation_conflicts`；保留旧计数和历史字段，派生指标携带版本与计算口径；
- 建立按 run_id、PR/Change（脱敏）、pushed SHA 聚合的 P8 复盘表；
- 审计 full diff 与 `git add -A` 一致性、consent 后工作区变化、显式 `--pr` 与 checkpoint 身份、push 成功但命令超时等边界；先补测试；
- 把 failure class 到恢复动作的矩阵作为代码和文档的共同测试输入。

如果 UI 不能改，则“分栏/派生”只放在外部报告或分析数据中，不改页面。

### 7.2 暂缓：跨调用远端等待状态

只有满足以下条件再做一个独立原型：

- 积累足够的去重样本，量化 mismatch 的发生率、自愈比例/时间、无效重跑/人工修复/reset 比例；
- 证明 WAIT 的持久记录不授予 PASS，并定义账本损坏/截断、budget 耗尽、进程中断、PR 已关闭/换 head、显式 PR 错配、legacy checkpoint 与跨 PR 隔离的唯一处理方式；
- ledger 的权威性、签名/哈希绑定和归档策略不与 manifest 冲突；
- 在 GitCode 沙箱真实演练 propagation delay、重试/恢复和旧 CI 事件；Gerrit 独立保持现状或单独验证；
- 有 feature flag、旧流程回退、无重复 push 的回滚演练。

### 7.3 不启动整体重构的条件

若核心收益只能表述为“代码更整齐/职责更清晰”，但不能量化当前线上损失、不能证明迁移降低端到端风险，或缺乏真实平台回滚演练，则保持现状并继续观测。

对于唯一不可逆阶段，结构优雅不能抵消授权或 SHA 绑定的回归风险。

## 8. 需要修订的旧结论

`p8-architecture-problems.md` 可作为风险清单，但以下表达已过时或过度：

- **“没有显式状态机”**  
  应改为：已有七状态子流程，但状态所有权、跨文件恢复协议仍分散。

- **“consent/hold 被视作失败”**  
  应限定为：签名 manifest 中有意用 FAIL 锚定 consent；metrics 已有 `expected_review_hold` 分类和 hold 汇总，但 hold 仍影响 `fail_attempts`。

- **“bridge/UI 直接依赖 manifest”**  
  应改为待逐消费者验证；现有证据只足以证明 runtime bridge 调 Python 真相层、metrics UI 读取派生 metrics。

- **“空 diff、head owner、reviewed artifact 覆盖、缺 checkpoint 恢复”**  
  应提供复现条件和代码调用链；未验证前标注为风险假设，不写成既成缺陷。`head_owner` 实际由 `fork_qualified_head` 推导，不能简单说完全未绑定。

- **“整体重构是默认路线”**  
  应改为有门槛的长期选项；先采用报告层拆分和局部高收益修复。

- **`result/` 数据**  
  样本少、按 run_id 去重、失败分类不完整、没有手工对照组；只能支持“需要更好区分等待与故障”，不能支持“整体重构一定有收益”。

## 9. 最终判断

**采用“保留权威架构、局部降低可观测性噪声、针对性修复经验证的安全问题、用真实数据决定是否演进”的路线。**

现在整体重构或新增跨调用 ledger 的预期收益不可量化，而对唯一不可逆线上门禁的影响面大、回滚成本高，风险收益比不成立。

`result/` 已足以证明存在真实的 propagation/CI/review 等待成本和人工分类成本，因此不应什么都不做；应先改善只读诊断与统计，把发生次数、自愈时间、无效动作和人工介入成本测准。待收益达到事先定义的阈值、迁移协议通过故障矩阵和真实 GitCode/Gerrit 演练后，再讨论有限灰度的协议重构。
