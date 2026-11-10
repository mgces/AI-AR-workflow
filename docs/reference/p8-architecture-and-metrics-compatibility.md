# P8 架构问题、指标兼容与演进边界

> 状态：架构分析与兼容性讨论记录。本文不改变当前 Gate 行为，也不构成阶段 PASS 证据。
>
> 本文如实记录本地分析材料：
> - `development-assistant/core-architecture/p8-architecture-problems.md`
> - `development-assistant/core-architecture/p8-published-metrics-field-compatibility.md`
>
> 本地分析材料不进入 Git；源码和实际 Gate 行为仍是唯一真源。

## 1. 结论摘要

P8 当前是一个**局部最优、全局高耦合**的设计：

```text
dry-run 的签名 FAIL
  = 人工停点
  = consent 锚点
  = 导航状态
  = 失败统计的一部分
```

它用最小的新增状态换来了短期的稳定性：

- 不新增阶段；
- 不新增授权文件；
- 不改最终 PASS/FAIL；
- 旧 run 全部可用。

但代价是 consent、truth、navigation、observability 和外部契约被压缩到同一条签名 FAIL 中，导致：

- consent 语义错误；
- 失败统计被人工等待污染；
- 任何修正都会同时影响多个层；
- 外部 bridge/UI 与内部状态强耦合；
- 继续局部修补的收益递减、风险递增。

在已发布指标层面，结论是另一条更强的兼容约束：

> **已发布字段的名称、类型、基础含义和既有值应冻结，不能通过原地修改 `fail_attempts` / `failures` 来“修正”P8 统计语义。**

## 2. P8 架构问题

### 2.1 Truth、Control、Navigation 未分层

| 层 | 应负责 | 当前实际 |
|---|---|---|
| Truth layer | 签名 verdict | manifest PASS/FAIL |
| Authorization layer | 人授权上传内容 | dry-run FAIL + consent |
| Control layer | 当前停点、下一步 | phase_summary / substate / repair |
| Projection layer | UI / metrics / bridge | 直接读 manifest / phase_summary |

结果：

- consent 被写成 FAIL；
- 失败统计包含人工等待；
- 导航状态和真相状态容易不一致；
- 外部消费者直接依赖内部条目结构。

### 2.2 P8 没有单一显式状态机

P8 状态由多个文件共同推导：

```text
manifest 最后一条 verdict
+ consent_tokens["8"]
+ upload_checkpoint.json
+ repairs/current.json
+ phase_summary.json
+ upload_review/substate.json
+ evidence_floor
+ pipeline.json phases[8].status
```

没有一份“合法状态 + 合法迁移 + 恢复动作”的单一模型。  
因此只能靠局部 guard 维持一致性，修一个路径容易漏另一个路径。

### 2.3 consent 与 gate verdict 混在一起

dry-run 产生：

```text
gate = gate_upload_ci.py:consent-precheck
verdict = FAIL
failure_class = dry_run_no_pass
```

这条记录同时表示：

- 上传前检查完成；
- 等待人工确认；
- 可以绑定 consent；
- 不能被当作最终 PASS；
- 不应要求 scoped_fix。

语义上它既不是失败，也不是 PASS，却被塞进了 FAIL。

### 2.4 一个脚本承担过多职责

`gate_upload_ci.py` 同时负责：

- dry-run / prepare；
- publish；
- verify；
- local review；
- PR review；
- PR 创建/发现；
- CI 查询；
- SHA 绑定；
- consent 校验；
- human wait；
- repair packet；
- metrics / navigation；
- 外部 bridge 的数据来源。

职责过多，导致每个修改都跨层。

### 2.5 多套校验器并存

当前至少涉及：

- `validate_closing_entry`（最终 PASS）；
- `validate_upload_consent_entry`（precheck/consent）；
- target matcher；
- checkpoint validator；
- repair state validator；
- 实验方案中曾出现的授权包 / content fingerprint 校验（已回退，不在当前基线）。

不同入口使用不同校验器时，会出现：

```text
next 说可以 consent
consent 说工作区已变化
publish 说目标不匹配
```

### 2.6 失败与恢复没有成对设计

当前有大量 fail-closed，但缺少轻量恢复路径：

- final PASS artifact 缺失 → 通常只能 reset/repair 或人工恢复；
- active repair → 某些路径无法继续；
- legacy target 变化 → 可能只能删证据；
- manifest 截断 → P8 多次重跑；
- publish 失败后 checkpoint 不存在 → 可能重复执行不可逆动作。

没有 recovery model 的 fail-closed，会把局部错误放大成流程停摆。

### 2.7 外部契约与内部状态强耦合

`delivery_bridge`、UI、metrics 读取：

- `manifest.jsonl` 的 gate/verdict；
- `phase_summary.json`；
- `attempt_history` / `fail_attempts`；
- `substate` / `next_action`。

因此：

- 新增授权机制会破坏旧 bridge；
- 改变 consent 表示会改变统计/UI；
- 外部格式冻结与内部架构演进直接冲突。

### 2.8 安全绑定存在结构性缺口

P8 是唯一不可逆阶段，但部分绑定仍依赖字符串和约定：

- diff 渲染失败时可能授权空 diff；
- `head_owner` 可能是空字符串，实际推送目标由 remote 解析；
- reviewed diff 在 publish 时可能被重新渲染并覆盖；
- artifact 清理可能使已 PASS 的 P8 无法闭合。

### 2.9 可观测性语义不纯

`fail_attempts`、`first_gate_failures_total`、`expected_review_hold`、`mode` 等字段混合了：

- 真实门禁失败；
- 人工等待；
- dry-run / prepare；
- checkpoint 复用；
- verify；
- 外部平台不稳定。

历史数据一旦发布，就难以修正。

### 2.10 测试架构偏功能点

当前测试主要验证：

- 正常流程；
- 若干负向输入；
- mock 的 PR/CI 行为。

缺少：

- mode × authorization × repair × manifest × legacy 的状态迁移矩阵；
- 失败后恢复路径测试；
- 外部 bridge/UI 契约测试；
- 真实 GitCode/Gerrit 演练。

## 3. 架构问题的影响

### 3.1 对流程

- dry-run / consent 容易被误认为失败；
- target 变化、checkpoint、repair 状态容易形成重试循环；
- 弱模型依赖 `advance.py next` 时可能被导向必然失败的命令；
- 失败恢复常需要回退 P1/P2。

### 3.2 对统计和决策

- dry-run hold 进入 `fail_attempts`；
- P8 失败率被人工等待污染；
- 周报和门禁趋势需要额外解释；
- 已发布口径不能轻易修改。

### 3.3 对兼容性

- 新授权机制会让旧 bridge 失效；
- legacy consent 需要长期保留；
- 旧 packet 缺少新字段时需要 fallback；
- UI / metrics 格式不能跟随内部状态演进。

### 3.4 对安全与审计

- reviewed diff 可能被 publish 重渲染覆盖；
- 授权目标没有绑定实际 fork；
- 空 diff 在 git 失败时可能被授权；
- 最终 PASS artifact 被清理后难以证明当时证据。

### 3.5 对维护

- 每次修一个 guard 都可能引入另一个问题；
- 同一状态被多套代码判断；
- 状态空间持续增长；
- 测试无法证明“至少不比以前差”。

## 4. 已发布 Metrics 的兼容结论

### 4.1 字段冻结

建议冻结已发布字段的名称、类型、基础含义和既有值：

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

不允许在同一 schema version 下静默改变这些字段的含义。

### 4.2 不原地修改 `fail_attempts`

`expected_review_hold` 确实会进入 `fail_attempts`，但已发布页面和公开数据已经把它定义为“门禁 FAIL 尝试（含确认停点）”。原地扣除 hold 会造成：

- 同字段跨时间异义；
- 历史趋势不可比；
- 旧 reader 静默给出错误含义；
- 发布 merge / 浏览器备份 / 缓存混合两种口径；
- 计数与明细的一致性校验失败；
- 数字下降被误读为质量改善。

因此原地修改的边际收益有限，兼容风险无法低成本消除。

### 4.3 推荐：Raw Contract + Derived View

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

回答：“为了运维和决策，应如何解释这些原始记录？”

派生公式示例：

```text
review_hold_attempts
  = count(attempt_history where verdict=FAIL
          and failure_kind=expected_review_hold)

operational_fail_attempts
  = fail_attempts - review_hold_attempts
```

但只有在 `attempt_history` 足以对应所有失败时，派生值才可标记为 complete；历史明细不足时应为 `null` 或 `derivation_quality=incomplete`，不能把未知失败自动当作操作失败或审核停点。

### 4.4 版本化与迁移

满足任一条件必须升 schema：

- 改变现有字段含义、单位、类型、null 语义或计算公式；
- 修改 `failures == sum(phases.fail_attempts)` 等一致性约束；
- 将 review hold 从旧 failures 中扣除；
- 给外部消费者提供新的正式统计口径；
- 需要迁移/回填历史派生值；
- 删除或重命名任何公开字段。

推荐路线：

- 原始 metrics 与公开 snapshot 分别版本化；
- 读旧写新；
- 双算校验；
- 历史重放；
- v1/v2 页面兼容；
- 灰度发布；
- 可回滚；
- 不回写历史原始指标。

## 5. 当前约束下的实际选择

如果页面、已发布字段和 metrics 格式都不能修改：

```text
旧字段冻结 + 页面不能改
= 页面继续显示包含 review hold 的失败尝试数
```

此时只能在页面之外解决：

- 周报 / 分析脚本过滤 `expected_review_hold`；
- 导出或报告同时给出 raw 与 derived 口径；
- 文档说明原始 FAIL 包含确认停点；
- 不把页面数字直接当成代码失败率。

如果允许 UI 或 schema 演进，可选：

- 只改标签与帮助文字；
- 页面运行时派生 hold / operational failure；
- 正式发布 snapshot v2，保留 v1 raw 字段并新增派生字段；
- 双读、双算、历史重放和灰度发布。

如果要把页面数字直接改“准确”，必须明确接受统计口径变化或正式重构，不能在旧字段下静默换义。

## 6. 与 P8 Gate 演进的边界

页面兼容策略不能反向要求 P8 truth layer 为了页面数字而改变 verdict。

优先级应为：

1. 页面文案和只读派生视图（若 UI 允许）；
2. 字段词典、契约测试和历史重放；
3. 正式公开派生 schema；
4. 只有在独立 P8 协议重构成立时，才讨论源指标的新事件类型；
5. 永不回写旧 manifest 或旧 workflow metrics 来统一外观。

当前 `consent-precheck` 使用签名 FAIL，是为了在不可逆 push 前提供 HMAC 链锚点，同时确保它不能闭合 P8。即使长期认为 authorization 不应使用 FAIL，也应先建立新的授权协议版本，并让页面同时解释旧协议和新协议；不能先改 gate，再用页面兼容补救。

## 7. 架构演进路线

### 路线 A：接受现状，停止架构修改

适合：

- P8 数据不用于关键决策；
- 当前稳定性优先；
- 不愿承担迁移和真实环境验证成本。

措施：

- 在分析/周报层过滤 `expected_review_hold`；
- 不改变 UI、metrics 格式或 manifest；
- 记录已知问题，不继续增量补 guard。

### 路线 B：只做不改变状态的局部加固

适合先降低安全风险、暂不动状态机：

- diff 渲染 git 失败时 fail-closed；
- 绑定实际 `head_owner`；
- 禁止 publish 覆盖 reviewed artifact；
- 增加输入校验。

不触碰 consent 表示、substate 模型、repair 语义、UI/metrics 格式。

### 路线 C：正式重构 P8

适合 P8 数据用于复盘/门禁决策，且能接受项目级投入：

```text
Truth layer: manifest 只记录真实 verdict
Authorization layer: 独立授权包 + consent，不进入 verdict
State machine: 显式状态、合法迁移、每状态恢复动作
Executor: 只有 publish 执行不可逆动作
Projection: UI/metrics/bridge 只读投影，不反向约束状态
Compatibility: legacy 只读适配层，外部格式不变
```

必须先完成：

1. P8 状态迁移矩阵；
2. 失败恢复矩阵；
3. legacy / 新授权兼容表；
4. 外部 bridge/UI 契约测试；
5. 真实 GitCode/Gerrit 演练；
6. 回滚方案。

## 8. 最终判断

P8 当前的主要问题不是单个 bug，而是：

- truth / control / navigation 未分层；
- 状态机未形式化；
- 失败与恢复未成对设计；
- 外部契约与内部状态强耦合；
- 已发布指标被人工等待污染，且不能原地换义。

继续在现有架构上做增量 guard，收益递减、风险递增。

现实选择只有：

1. **接受旧架构的语义/统计缺陷，在页面之外派生正确口径；**
2. **正式重构 P8，先建状态机、恢复模型和兼容层。**

不要把页面数字作为唯一驱动去修改不可逆门禁的协议；也不要在已发布字段下静默改变统计定义。
