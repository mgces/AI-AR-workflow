# GitCode 与本地 DSH 实现对比及融合建议

评估日期：2026-09-07。结论状态：供选型讨论，尚未实施融合。

后续选型已确定以 GitCode 为主干；融合、自修复与自迭代设计见[方案 v1](/reference/dsh-fusion-self-repair-evolution-v1)。本文保留当时的比较与验证记录。

**建议以 GitCode 的 `runtime/dsh-ohos` 为主干，分步吸收本地的模块路由、失败分类和经验提案。** 远端更适合承载正式的需求与开发流程；本地更适合验证按需加载和修复策略。若只能保留一套，优先选远端。

这个判断依据实际代码和验证结果。两套都没有完成真实多宿主、DSH profile 和 OHOS 构建／真机／发布全链路验收，也没有足够数据证明节省了多少模型用量或时间。

## 1. 比较范围与版本

| 项目 | GitCode 方案 A | 本地方案 B |
|---|---|---|
| 版本 | `415c57bfa3a9313a712253a665c82a1738c5e66c` | 基于 `5996e35` 的未提交工作区 |
| 提交 | 2026-09-06，`feat: add cross-host DSH requirement and AR subagents` | `dsh-workflow/`、自适应控制器设计文档及文档导航改动 |
| 实现目录 | `runtime/dsh-ohos/`，v0.3.0 | `dsh-workflow/`，v0.1.0 |
| 核心定位 | 跨宿主领域任务服务：领取、提交、校验、确认、恢复 | 轻量控制器：下一步、选模块、执行 gate、给修复建议 |
| 默认执行方式 | 宿主原生 agent 执行任务，控制器管理任务生命周期 | 宿主调用 MCP／CLI／DSH 工具驱动循环 |
| 运行时要求 | Node.js ≥24，使用内置 SQLite；核心没有 npm 外部依赖 | Node.js ≥22.19，依赖 MCP SDK、Zod 和 DSH 工具包 |
| `src/` 规模 | 34 个 JS／Python 文件，3,912 行 | 11 个 JS 文件，1,321 行 |
| 自带测试 | 10 个文件，56 项用例 | 7 个文件，9 项用例 |

行数仅统计 `src/`，不含文档、配置、测试和依赖；不能直接等同于质量或维护成本。远端这次提交新增 63 个文件、8,369 行，其中包含大量设计、使用说明和测试。

本次通过 `git ls-remote` 核实远端 main，并克隆到临时目录审阅。远端比本地 HEAD 多一个提交，原有 `skills/` 没有变化。两种实现都复用同一套 Python 门禁基础，因此既有签名、指纹和 consent 的收益不应归到任一 DSH 改造名下。

远端代码固定到[此次审阅的提交](https://gitcode.com/mgce1/AI-AR-workflow/commit/415c57bfa3a9313a712253a665c82a1738c5e66c)。本地原有实现保持不变；本次新增对比文档和验证记录。

## 2. 优劣对照

| 维度 | 方案 A：GitCode | 方案 B：本地 | 判断 |
|---|---|---|---|
| 流程完整性 | R1–R9 和 P0–P8 均有任务、提交与校验路径；P8 分预检／发布 | 开发流包装现有命令；需求流是简化状态投影 | A 更完整 |
| 开发门禁 | worker 提交只是 `produced`；父级通过 Python 验证后接纳／推进 | `advance` 仍受 Python 约束，但 gate 调用成功与业务 PASS 在经验记录中混用 | A 的结果语义更清晰 |
| 需求质量约束 | 文档哈希、独立 R5 上下文标识、12 项评审检查一致性、FR–AC 追溯、逐 proposal GA、SR 与 AR 范围检查 | 主要检查文件存在、少量 status、调用者填写的确认和结论 | A 明显更强 |
| 恢复与一致性 | SQLite 事务、revision、幂等键、租约、凭证、sync/reset 对账 | JSON 原子替换，revision 可选；缺少任务租约、事务和文档变更失效机制 | A 适合长期运行与多个连接 |
| 并发约束 | 开发流有构建／设备／发布资源互斥；仍有旧进程未停就重新派发的缺口 | 没有跨调用／跨进程资源调度 | A 更强，但仍需补强 |
| 宿主接入 | 生成 Codex、Claude Code、Cursor、Trae 的入口与父子协议 | 通用 MCP 配置和 CLI，接入步骤较少；没有相当的宿主角色导出器 | 正式接入选 A；快速试用 B 更轻 |
| 工具权限 | 单一工具目录生成 parent／worker 分面；默认 `all` 仅适合开发 | MCP 对连接公开同一组控制工具，含 advance 和 consent | A 更适合职责分离；均不等于 OS 隔离 |
| 按需选 Skill | 需求阶段有固定 Skill 路径；开发任务以阶段说明为主 | 29 个模块，按阶段／标签／能力／失败类别选择并展开依赖 | B 更适合做动态路由试点 |
| 失败修复 | 验证失败后提高 revision，重新派发；缺少细分类别、差异化策略和持久重试预算 | 有失败分类、repair packet 和轮次配置；预算尚未由控制器强制执行 | 适合将 B 的策略接入 A 的生命周期 |
| 经验复用 | 有事件审计，尚无对应的路由演进聚合 | 有失败率与模块频率聚合，只生成 staging 提案；数据语义需要修正 | 保留 B 的方向，重做数据来源 |
| 协议维护 | 自写 MCP 子集，协议兼容责任由项目承担；工具 schema 集中维护 | 使用标准 MCP SDK，但 MCP 注册和 DSH catalog 分别维护，存在漂移风险 | 可沿用 A 的目录，评估以 SDK 替换传输边界 |
| 实施／维护成本 | 结构较多，需理解任务状态与 Python 状态对账 | 更容易阅读、试用和撤回；补齐正式调度能力会重建大量 A 已有代码 | 不建议将 B 扩成第二套完整引擎 |

“按需选择”目前返回模块信息和 Skill 路径，实际读取仍由宿主完成。本地 `contextCost` 只是等级标签，尚无 token 预算求解或最优集合算法，不能宣称已经得到最小上下文或节省比例。

## 3. 影响选型的具体发现

### 3.1 本地需求投影不宜作为正式放行依据

以下均使用临时文件和合成输入验证，没有运行真实业务需求：

| 场景 | 实际结果 | 影响 |
|---|---|---|
| R1 工具调用只填 `humanActor`，省略 `humanApproved` | 工具目录默认补为 `true`，推进到 R2 | 缺失确认被当作确认 |
| R5 证据文件写着 `Not Ready`，调用参数填 `Ready` | 推进到 R6 | 没有读取、核对独立评审结论 |
| R6 填 `reviewDecision=accepted`，同时 `humanApproval.approved=false` | 推进到 R7 | 仅要求 actor，显式否认也未阻止推进 |
| R7 提供 Draft proposal 和一个无对应关系的空 SR 文件 | 推进到 R8 | 没有执行 GA 前置约束或逐 proposal 追溯 |
| R8／R9 提供空 handoff、空 AR；完成后修改上游需求文件 | 仍显示 `completed` | 完成态不能证明产物有效或基线未变 |

代码位置：`dsh-workflow/src/tools/catalog.js:105`、`src/mcp/server.js` 的同名提交工具，以及 `src/core/requirement-controller.js:175`、`:194`、`:203`、`:211`、`:230`。

这些问题不会直接绕过开发流的 Python `advance.py`，但会使需求流投影错误地显示已通过或完成。README 已将其定位为试验版，因此合理的处理是保留试验价值，不将这套投影作为融合后的正式状态机。

远端在上述方向上已有实质实现：校验评审 JSON 的 12 项检查和计数、FR–AC 覆盖、逐 proposal GA 确认、产物非空与哈希快照，并检查 R5 的上下文标识与作者不同。相关测试也覆盖伪造计数、错误追溯、缺少 GA 和产物变更。见远端[需求产物校验](https://gitcode.com/mgce1/AI-AR-workflow/blob/415c57bfa3a9313a712253a665c82a1738c5e66c/runtime/dsh-ohos/src/workflows/requirement/artifacts.js)和[需求控制器](https://gitcode.com/mgce1/AI-AR-workflow/blob/415c57bfa3a9313a712253a665c82a1738c5e66c/runtime/dsh-ohos/src/workflows/requirement/workflow.js)。这些是结构与一致性检查；文档语义质量、真实上下文隔离和确认来源真实性仍需实际宿主验收。

### 3.2 本地经验库尚不能用于判断策略效果

`developmentGate()` 在 Python 命令正常退出后直接记录 `result: 'pass'`，在统一异常分支记录 `fail`。存在两类数据污染：

1. **命令成功不等于业务 PASS。** 现有 `gate_upload_ci.py:1051` 的预检分支会生成用于确认的证据，然后正常返回；明确没有发出 PASS。本地却会记为成功。已用模拟该返回语义的 Python 子进程验证，不涉及真实上库。
2. **gate 尚未执行也会记作 gate 失败。** 指定不存在的 pipeline 时，前置状态读取失败；经验库仍保存 `source: authoritative-gate-execution` 的失败事件。该情形已直接复现。

此外，记录的模块是“路由选出／建议使用”的模块，不能证明宿主实际使用过它们；失败记录甚至写入的是失败后建议的修复模块。现有聚合也缺少 run／attempt、证据 entry ID、策略版本和修复前后关联。因此只能当作建议原型，不能据此证明某个模块提高了通过率。

代码位置：`dsh-workflow/src/core/controller.js:112`、`src/core/experience-store.js:12`、`:34`。

融合时应将执行状态、gate verdict 和等待人工确认分别保存，并以父级核验过的证据为准。路由推荐、宿主报告使用、证据确认结果也应分别记录。

### 3.3 本地路由与 repair 可复用，但需补齐边界

- `ModuleRegistry` 的依赖遍历没有循环检测；注入 A→B→A 后复现 `Maximum call stack size exceeded`。当前自带 29 个模块的 Skill 路径均存在，此问题是扩展注册表时的缺口。
- 未被模块覆盖的必需能力不会自动阻塞；需要明确区分“可选建议”与“必须满足的能力”。
- 失败分类主要匹配输出文本；现有 Python 流程已有部分结构化 failure／repair 信息，融合后应优先消费结构化结果，文本规则仅作后备。
- `maxAttempts` 目前作为建议返回，没有按 run／阶段／失败指纹持久计数和强制停止。DSH 示例还统一使用 `attempts < 2`，未按每类策略读取上限。
- proposal 已提出功能改动需要 repair/reset，但本地实际策略尚不能完整处理 P3–P8 的回退路径。修复必须服从原有代码冻结和阶段规则。

代码位置：`dsh-workflow/src/core/module-registry.js:38`、`src/core/failure-normalizer.js`、`config/repair-strategies.json`、`examples/dsh-repair-workflow.js:43`。

### 3.4 远端需要补强开发任务的租约恢复

远端开发任务的租约过期后，通用控制器默认将任务放回 `awaiting_host`；下一次领取可以得到新 attempt。构建／设备／发布互斥只统计尚未过期的活动租约。

本次模拟 P4：第一个 attempt 领取后不释放，时钟超过租约期限，第二次领取成功得到 attempt 2。该验证没有启动实际 worker，只证明重新派发不要求“旧进程已停”的证据。若旧宿主仍在执行构建、写文件或发布，就可能出现物理资源上的重复执行。

旧 attempt 的提交会被凭证／租约规则拒绝，**但拒绝晚到的提交不能阻止旧进程继续产生外部副作用**。远端需求流已经采用过期后进入 `needs_reconcile` 的更保守路径，可以将这个思路用于开发流中有写入和外部副作用的任务。

代码位置：远端[`core/task-controller.js:542`](https://gitcode.com/mgce1/AI-AR-workflow/blob/415c57bfa3a9313a712253a665c82a1738c5e66c/runtime/dsh-ohos/src/core/task-controller.js)、[`ar-delivery/workflow.js:21`](https://gitcode.com/mgce1/AI-AR-workflow/blob/415c57bfa3a9313a712253a665c82a1738c5e66c/runtime/dsh-ohos/src/workflows/ar-delivery/workflow.js)。资源互斥也仅覆盖声明的构建／设备／发布能力，不能理解成所有源码写入、legacy CLI 和外部进程都已统一加锁。

### 3.5 两套都有尚未闭环的部分

- 远端验证失败可重复增加 revision 并重新派发，尚无统一修复预算；本地的轮次配置也未硬性执行。
- 远端 parent／worker 工具分面是协议层能力。默认 `all`、同一 OS 用户及共享文件权限均不能证明强隔离；本地也没有独立权限边界。
- 两套默认模式均可由宿主驱动，不依赖额外 DSH 模型执行主管循环。真正的 DSH profile 启停、工具兼容性及其额外收益仍需单独验证。
- 本地覆盖的 9 项测试较浅，需求测试只跑到 R2；远端 56 项覆盖更广，但大量业务流程仍使用模拟 Python adapter／合成文档。数量和全绿均不能代替实际交付验收。

## 4. 三种选型的取舍

| 选择 | 优点 | 代价与适用范围 |
|---|---|---|
| 只选远端 | 正式流程、恢复、任务协议和宿主接入最完整；重复建设较少 | 暂时缺少动态模块路由和分类修复；适合先把流程跑稳 |
| 只选本地 | 轻量、容易试验，模块路由和 repair 概念集中 | 正式需求约束、并发与恢复需要大量补建；适合单宿主、有人看护的只读／建议型试验 |
| **远端主干 + 本地策略模块** | 保留较成熟的调度与校验，补齐上下文选择和失败指导 | 需要明确状态归属、数据契约和接入顺序；推荐作为后续演进路线 |

推荐顺序：**融合方案 > 只选远端 > 将本地直接扩展为正式完整流程。** 这个排序面向“两条 workflow 的可靠运行与后续跨宿主使用”；若短期只验证 Skill 路由，本地轻量实现仍然有价值。

## 5. 推荐融合结构

```text
宿主父 agent／领域 worker
          │ MCP：沿用远端工具目录、领取与提交协议
          ▼
runtime/dsh-ohos
  ├─ core：SQLite、revision、幂等、租约、凭证、事件
  ├─ requirement：产物校验、确认、追溯、失效与回退
  ├─ ar-delivery：任务调度、预检／发布、Python 状态对账
  └─ policy：吸收并完善本地能力
       ├─ module-registry：阶段／标签／能力／依赖
       ├─ failure-normalizer：结构化失败优先
       ├─ repair-policy：失败分类、预算、回退建议
       └─ experience-proposals：读取已核验事件，生成候选
          │
          ▼
原有 Python gate／advance／签名证据／consent
```

上图中的 `policy/` 是建议新增的目录，当前远端并不存在。

| 本地资产 | 融合方式 |
|---|---|
| `config/modules.json`、`module-registry.js` | 接入远端 `ohos_task_context`；保留阶段必需模块，动态补充领域与修复模块；增加环检测、必需能力覆盖和配置版本 |
| `failure-normalizer.js`、`repair-strategies.json` | 接入父级验证失败路径；由同一个任务控制器建立修复 attempt 和执行预算 |
| repair packet 的字段与不变量 | 纳入远端任务上下文；绑定 run、task、revision、证据和策略版本；不能拥有独立推进权 |
| `experience-store.js` 的聚合思路 | 改为读取远端已核验事件；原有 JSON 事件不直接作为有效训练／策略晋级样本 |
| 标准 MCP SDK 的使用方式 | 作为后续传输层替换候选；从远端同一 catalog 生成工具，保留原名、schema 与 parent／worker 分面 |
| 本地 `RequirementController`、整套 `AdaptiveWorkflowController` | 保留为试验参考，不并入正式状态机，不同时驱动同一个 run |
| CLI 和 DSH workflow 示例 | 需要时改成调用统一服务；示例中的模型自报 `passed` 不作为业务判定依据 |

原有的 29 个模块条目也应逐条确认阶段适配，不能直接用静态标签列表替代已经批准的需求／AR 能力契约。

## 6. 分阶段落地与验收

| 阶段 | 具体工作 | 完成标准 |
|---|---|---|
| 第一阶段：建立远端基线 | 保存本地试验快照；以 A 为唯一调度内核；先补开发流租约过期后的对账／停止确认；增加持久修复预算 | 原有 56 项继续通过；旧 worker 未明确停止时不能启动冲突任务；重复故障可停止并给出原因 |
| 第二阶段：只接入模块建议 | 将 B 的 registry 挂到 `ohos_task_context`；先试 P1／P2 的 SA、NAPI、C++／安全模块 | 注册表循环、缺失能力可诊断；必需模块不遗漏；仅改变上下文选择，不改变业务门禁 |
| 第三阶段：接入分类修复 | 优先解析 Python 结构化失败；生成绑定证据的 repair packet；按阶段处理 repair/reset | P8 预检准确进入等待确认；签名异常不自动修复；功能改动遵守原有回退规则；轮次不能因重启或换宿主清零 |
| 第四阶段：经验与效果对照 | 从统一事件采样，做历史回放和对照；策略候选经审阅后启用 | 能追溯推荐、实际使用与结果；可回滚；有真实成本／质量改善后再扩大范围 |

首轮对照建议使用同一宿主、模型、输入、代码基线、缓存和设备条件，分为“远端原版”“远端 + 路由”“远端 + 路由与修复”三组。记录合格完成率、首次 gate 通过率、修复次数、人工介入次数、实际可测的模型用量和耗时。尚无可靠计量的数据标为未测，不用模块数量推算 token 节省。

DSH 本体的额外价值应另做“相同业务内核，经普通 MCP 运行”与“经 DSH profile 运行”的对照，避免将业务门控补强的收益全部归因于框架。

## 7. 本次验证记录与限制

统一复测环境：Linux／WSL，Node.js **v24.20.0**，Python **3.12.3**。Node 24 来自官方发行包并校验 SHA256，未替换系统 Node。

| 验证项 | 结果 |
|---|---|
| 本地 `scripts/check.js` | 通过 |
| 本地 `node --test --test-reporter=spec` | **9／9 通过**，0 跳过 |
| 远端 `OHOS_DSH_TEST_PYTHON=python3 node --test --test-reporter=spec` | **56／56 通过**，0 跳过 |
| 远端真实 Python 边界 | 初始化、读取 pipeline、拒绝无有效 gate 证据的验证请求通过 |
| 远端父／子 stdio | 两个进程共享状态，R1 领取／提交／校验／人工等待通过 |
| 额外针对性验证 | 第 3 节所列需求投影、经验语义、循环依赖和过期重派发现均可复现 |
| 原有 Python 门禁代码 | 远端相对本地基线没有修改 `skills/`；本次未执行既有 Python 全量回归 |
| 真实 OHOS 构建、设备、远端发布、多宿主、DSH profile | 本次未执行；不能据上述结果宣称已验收 |

最初在沙箱内，两套 stdio 测试均出现连接／输出异常；同版本代码在沙箱外通过。因此没有把该环境现象列为任一方案的代码缺陷。随后用两者均支持的 Node 24 再次统一复测。

验证日志、合成复现脚本和源码快照摘要保存于仓库 `products/20260907-dsh-comparison/`。复现脚本检验的是当前实现的不足；脚本退出成功表示观察到了表中的行为，不表示这些行为符合正式业务要求。

本报告提出选型与实施边界，未切换分支、合并远端、提交或推送代码。后续若采用融合路线，第一步应建立单一远端基线，再逐项迁入策略模块。
