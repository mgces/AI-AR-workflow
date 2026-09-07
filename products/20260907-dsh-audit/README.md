# DSH 整体检测与一次运行完成置信度

日期：2026-09-07；GitCode 基线 `415c57bfa3a9313a712253a665c82a1738c5e66c`，
检测对象包含 `codex/dsh-fusion-self-repair` 当前未提交的融合改造。
本轮执行检查和隔离复现，没有修复生产代码，也没有修改 OHOS 源码。

## 判断

| 所谓“一次运行完成”的范围 | 当前判断 | 依据与限制 |
|---|---|---|
| 本地已实现的 observe 链路：MCP 启动、串行任务流转、Skill 路由、签名失败诊断 | 约 80–90% 的工程置信度 | 限固定 Node 24、有效输入、同一数据库、按顺序调用、无并发恢复；不包含真实模型输出质量或真实构建 |
| 实际 OHOS P0–P8 首次全程交付 | 尚无可信成功率，不能承诺高置信度 | 缺少真实端到端样本；本机 ICU 编译错误已复现；设备/宿主与发布尚未验收 |
| 原方案完整的构建、自修复、经验评测和自迭代自动闭环 | 当前无法完成，可按 0% 看待 | supervisor、自动补丁调度/导入、执行证据绑定、评测/发布链路尚未实现；不是随机失败问题 |

80–90% 是对上述受限场景的主观工程判断，**不是实测成功率或统计置信区间**。
没有以独立真实任务多次跑完得到的数据，不能用单元测试通过率换算业务完成概率。
既有业务人工确认按预期流程提供，不将正常等待确认为系统失败。

## 检测覆盖与结果

| 检查 | 结果 |
|---|---|
| DSH Node 24 自动化回归 | 70/70 通过，无跳过 |
| Python P0–P8 门禁回归 | 561 次用例执行通过 |
| 工作流报告/归档回归 | 29 次通过 |
| 需求观测回归 | 4 次通过 |
| 静态规则/文件卫生/指标回归 | 50 次通过 |
| 测试质量扫描器回归 | 3 次通过 |
| VitePress 文档构建 | 通过，有 chunk 大小提示 |
| MCP stdio 初始化 | `/usr/bin/node` v22.22.2 与临时 Node v24.20.0 均成功；声明支持/完整回归仍以 Node 24 为准 |
| 路由覆盖探针 | P0–P8、R1–R9、P8-precheck/publish、R7-plan 共 21 个阶段键均可解析 |
| 额外边界探针 | 复现 2 个高优先级恢复问题、1 个幂等问题、1 个配置透传缺口 |
| 真实 OHOS 单文件编译前检查 | 失败：同一历史编译参数下 ICU `lunar_calendar.cpp` 仍有 4 个 `uint32_t` 错误 |
| 完整 OHOS 构建、设备、真实 DSH profile、四宿主实际调用 | 未执行/未验收 |

自动化回归合计 717 次执行通过（Node 70 + Python 647）。Python 部分有继承/导入复用的用例，
不将总执行数当作独立场景数，更不当作 717 次真实交付。

## 需要优先处理的缺陷

### P1：sync 与 claim 的异步窗口没有排他保护

位置：`runtime/dsh-ohos/src/workflows/ar-delivery/workflow.js:192`、`:247`。
sync 在检查 writer 后等待 Python inspect；在此期间新 worker 能领取 P4。
当 inspect 返回 P4 有效证据，sync 会 advance 到 P5，并把刚领取的 attempt 标为 accepted。
这一过程没有等待新 writer 停止，后续可能并发执行或使 worker 的提交失效。

隔离探针实际输出：`claimed_during_sync=leased`、`sync_next_phase=P5`、
`owner_status_after_sync=accepted`。这是实际 JS 控制器配合模拟 Python adapter 的确定性复现，
不是在真实 OHOS 工程中触发。

修复需要持久 operation fence 覆盖整个异步控制操作，与 claim 共用原子检查；
结果落库前重新核验 owner/revision，不能只在 await 前查询一次。

### P1：重新接入活动 run 时先推进 Python，再检查活动 writer

位置：`runtime/dsh-ohos/src/workflows/ar-delivery/workflow.js:108`、`:120`。
startDelivery 先 initialize 和 align，之后才检查 persisted run 并转入 sync。
已有活动 P4 writer 时，探针观察到 Python adapter 已执行一次 advance，最终结果却返回 needs_reconcile。
“返回需要对账”并未阻止前面发生的状态推进。真实 adapter 的 initialize 还可能物化 AR 输入。

应在任何物化/推进前确认 run/pipeline 的所有权并预占操作；与上述 fence 一并修复。

### P2：startDelivery 的幂等摘要没有包含显式 run_id

位置：`runtime/dsh-ohos/src/workflows/ar-delivery/workflow.js:79`、`:100`。
相同 key、其他参数相同，第一次请求 `run_id=first`，第二次改成 `run_id=second`，
接口仍返回 first，而不是 idempotency_conflict。可能把调用方关联到错误 run。
应在幂等查询前验证并纳入显式 run_id，增加变更参数重放测试。

### P2：runtime 工厂没有透传 policySkillsRoot

位置：`runtime/dsh-ohos/src/runtime.js:21`。
OhosController 接受 policySkillsRoot，但 createRuntime 不传递该参数；探针指定不存在的
policy root 后仍悄悄使用仓库默认 skills。当前默认布局不受影响，定制部署可能使用错误的模块根目录。
需要统一公开配置入口，并对无效配置显式报错。

## 真实源码检查

源码：`/home/mgces/openharmony/code`，存在 rk3568 preloader 配置、Ninja 图与 OHOS Clang。
读取历史失败调用参数后，移除输出/依赖文件参数，用同一 Clang 对单个编译单元执行 `-fsyntax-only`：

- 文件：`third_party/icu/icu4c/source/ohos/lunar_calendar.cpp`。
- 错误位置：31、82、192 行，`uint32_t` 未声明/未知类型，共 4 个诊断。
- 返回码：1。未通过 ccache，未生成 `.o`/`.d`，未修改源码。
- 结论只适用于这一编译单元及这些参数，不宣称已执行整个 rk3568 构建。

当前 PATH 未发现 `dsh` 或 `hdc` 命令，不排除其他位置或远端已配置；真实宿主、设备可用性仍是未知项。
ICU 的 git status 在沙箱中因 Git LFS 尝试写缓存而失败，因此未据此判断源码是否干净；
此失败属于检查权限边界，不能当作源码仓损坏或实际构建失败的证据。

## 达到高置信度的顺序

1. 修复上述恢复竞争、重接入顺序和幂等问题，补上对应回归。
2. 完成 supervisor、进程树停止证明、共享 CLI 锁及副作用前预算预占。
3. 完成补丁受控导入、Python repair/reset 与后续门禁重验，建立构建输入与签名证据的绑定。
4. 在确定的 OHOS 组件/目标上完成实际成功、环境重试、源码修复、断连恢复与预算耗尽验收。
5. 再启用经验评测与有限灰度，收集独立真实任务的首轮完成率和失败分布。

## 复现材料

- `probes.mjs` / `probe-results.json`：隔离边界探针及原始结构化输出。
- `ohos-syntax.json`：实际执行参数；`ohos-syntax.log`：编译器诊断。
- `node-runtime.log`、`python-phases.log`、各辅助套件 `.log`、`docs-build.log`：测试日志。
- `additional-suites.json`：辅助回归套件退出状态。

复现核心回归：在 `runtime/dsh-ohos` 使用 Node 24 执行 `OHOS_DSH_TEST_PYTHON=python3 node --test`；
仓库根目录执行 `LIFECYCLE_SECRET_ROOT=<独立临时目录> python3 -m unittest discover -s skills/ohos-ar-dev-phases/tests -p 'test_*.py' -v`。
隔离探针：仓库根目录使用 Node 24 执行 `node products/20260907-dsh-audit/probes.mjs`。
