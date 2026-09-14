# DSH 融合改造实施状态

更新：2026-09-07。方案依据：[GitCode 主干融合、自修复与自迭代方案](/reference/dsh-fusion-self-repair-evolution-v1)。

**尚未完成完整自修复、自迭代闭环。** 当前可用增量是固定策略、模块路由、协作式租约隔离恢复，以及
基于签名 P4 失败的只读修复规划。运行模式限定为 observe；不提供尚未实现的执行/发布工具。

## 已落地的改动

| 部分 | 具体行为 | 验证依据 |
|---|---|---|
| GitCode 基线 | 在 `codex/dsh-fusion-self-repair` 引入固定提交 `415c57b`，保留一套 R1–R9 / P0–P8 权威状态机 | 原有 56 项测试继续通过；原 MCP 名称、权限、输入 schema 保持 |
| 本地策略融合 | 迁入 29 个 Skill 的 registry 和失败策略，新增循环/缺依赖/路径逃逸/版本漂移检查 | SA/NAPI 自动携带 C++ 依赖；必需依赖不被预算裁剪 |
| 每轮固定 policy | policy 内容 hash 包括 Skill 实际 hash 和失败策略；升级旧 run 时一次绑定；后续重启保留 | 上下文与状态查询无 SQLite 写入；阶段能力在配置时校验 |
| 租约与资源 | AR 过期任务隔离，写代码与构建互斥；识别本地路径别名及包含关系 | 原凭证停止后释放、部分产物 sync、新 epoch 拒绝旧提交的测试 |
| 失败诊断 | 签名/同意/范围错误优先；区分暂时环境问题、静态规则、编译问题；P8 预检保持待确认含义 | 分类永远是建议，不授予自动改码权限 |
| 只读修复计划 | `ohos_repair_plan` 检查当前 P4 签名 FAIL、证据 barrier、产物哈希和命令执行记录；绑定当前源码/策略 | 真实 Python 签名夹具验证篡改、过期、源码漂移、幂等；不会改 Python phase 或消耗执行预算 |
| 预算基础组件 | reservation 幂等、跨 SQLite 连接保留、reserved/consumed/released 转移 | 消耗后不能退款；revision 变化不重置计数；尚未接入构建启动器 |
| 宿主指令 | 生成的 worker 指令读取路由，submit/release 前停止子进程；parent 指令说明 observe 与修复诊断 | 四类宿主的静态导出和工具分面测试 |

本地 `dsh-workflow/` 仍作为参考实现保留，其状态和“成功经验”没有导入新 runtime。代码中未用到的
job/evolution 表草案已从本次新建 schema 中移除，后续随真实执行与评测接口迁移，避免将建表视为完成能力。

## 对照方案尚未完成的部分

| 里程碑 | 状态 | 剩余工作与退出条件 |
|---|---|---|
| M0 基线与契约 | 完成当前代码迁入及回归 | 实机 DSH profile 接入仍需独立验收 |
| M1 执行可靠性 | 部分完成 | 独立 supervisor、durable operation intent、启动幂等、进程树身份/退出证明、取消与日志游标、与 legacy CLI 共用锁、预算接入实际副作用 |
| M2 模块融合 | observe 核心已实现 | 实际宿主读取/使用观测与成本度量；当前只报告选择结果，`usage_observation=unknown` |
| M3 构建自修复 | 只读规划已实现 | `repair_schedule`、诊断/补丁子工作项、候选检查与导入、导入前基线复验、Python repair/reset 调度、P2→P3→P4 及后续门禁重新验证、无进展停止 |
| M4 经验与评测 | 未实现 | operation 与签名 entry 的绑定、有效经验投影、近重复去重、固定留出集与配对评测；规划事件不当训练成功样本 |
| M5 受控自迭代 | 未实现 | E1 修改范围准入、可信评测结果、灰度分配、质量回归检测、晋级与回滚；当前一律固定 baseline，不读取候选表自动切策略 |
| M6 后续平台/宿主 | 未开始实机扩展 | 多宿主恢复、真实模型隔离/用量、HarmonyOS/设备/发布场景 |

当前资源排他只覆盖共用 SQLite 的 DSH 任务领取，**尚不是覆盖 Python CLI 与全部控制操作的系统锁**。
同一时间的 start/sync/advance 与新领取之间仍需 M1 的持久操作 fence；不能用于无人看护的并发构建。
过期恢复依赖原 worker 真实停止后的凭证释放；原 worker 丢失且进程状态未知时保持隔离，不能证明已自动回收孤儿进程。

`source_fingerprint` 绑定的是诊断时的源码；旧 gate 尚未签入构建启动时的源码/operation，故返回
`execution_input_binding=unavailable`。未补齐此绑定前，不自动导入补丁，也不把历史 FAIL/PASS 归因到某个修复版本。

## 下一步实施顺序

1. 先做 M1 的执行入口：短事务保存 intent 与资源/预算预占，再启动可追踪的长作业；结果回收重新核验 owner、revision 和基线。
2. 让受管构建、源码导入和既有 CLI 使用同一资源锁。断连、租约过期或进程未知时不得重复执行；取消需确认整个进程树已停。
3. 接入 P4 失败诊断与受限候选补丁，先回 P2 再导入，并执行原 P2/P3/P4 及后续验证。设计边界变化回 P1。
4. 用真实 OHOS 工程验收环境重试和源码修复，然后才开始有效经验、评测及灰度发布。

## 验证记录与真实源码环境

自动化测试命令（需要 Node 24）：

```bash
cd runtime/dsh-ohos
OHOS_DSH_TEST_PYTHON=python3 node --test
```

本次结果：70/70 通过，无跳过；其中保留原 56 项，新增 14 项。测试涵盖真实 Python 签名边界，构建失败由
隔离临时目录的合成夹具生成，并非实际 OHOS 编译。日志保存在 `products/20260907-dsh-fusion/node-tests.log`。

用户提供的真实源码：`/home/mgces/openharmony/code`。只读检查发现：

- 已有 `out/preloader/rk3568/build_config.json`，product 为 rk3568、CPU 为 arm。
- 已有 `out/rk3568/build.ninja` 和 Ninja 可执行文件。
- 2026-09-02 的 `out/rk3568/error.log` 记录 ICU `lunar_calendar.cpp` 的 `uint32_t` 未声明错误。

这些仅是环境与历史故障信息，不证明该错误当前仍可复现。本次未修改此源码、未启动完整构建，
也未完成真实构建自修复验收；最终验收目标应绑定到具体组件与经确认的 AR contract。

## Claude Code 接入与最小闭环实测（2026-09-08）

在 Claude Code 2.1.263（Node v22.22.2、Python 3.12.3）上完成接入验收与一个真实 R1 最小闭环。
本文把这次实测作为「接入层 vs 自动执行层」的分层证据：协议与状态机已验证，业务内容生成仍依赖宿主。

### 1. 接入验收（全部通过）

| 项 | 结果 |
|---|---|
| 配置导出 | `--host claude-code` 生成 `.claude/agents/{ohos-requirement,ohos-delivery}.md` + parent fragment + 2 父协议 + host-bundle.json；6 文件通过 writeHostBundle |
| 技能同步 | `sync-skills.sh --agent claude` 安装 35 技能到 `~/.claude/skills`；需求链路 10 项 + AR 链路 3 项齐全 |
| parent MCP | 合并进 `~/.claude.json`，stdio 启动成功，initialize 协议 2024-11-05，15 工具 |
| worker MCP | stdio 启动成功，7 工具（claim/context/heartbeat/submit/release/host_capabilities/run_status） |
| 工具隔离 | `--strict-mcp-config` 下 worker 仅 7、parent 仅 15；正常派发时 `mcp__ohos_worker__*` / `mcp__ohos_parent__*` 命名空间区分 |
| 子会话实际出现 | `--agent ohos-requirement` / `--agent ohos-delivery` 派发成功，内联 worker 与 parent 工具均可见 |
| 文件可读 | worker 契约/门禁脚本可读（派发需 `--add-dir /home/mgces/code/AI-AR-workflow`，缺失则被权限拦截） |
| 能力注册 | `binding_id=claude-local-20260908`；`mcp_tools/native_subagent/workspace_write=true`，`isolated_context/build_execution/device_access/network_publish=false`（未验证不虚标） |

### 2. 真实 R1 最小闭环（协议层全部走通）

原始需求 `minloop-raw-request.md`（资源可靠性监控，含真实待澄清项）→ `ohos_requirement_start` →
claim → context → submit → validate → 停在澄清确认点（`awaiting_consent` / `needs_input`）。

- 校验器准确提取 R1 候选：`rr_id=未立项`、`feature_id=MINLOOP-001`、`FR-01..04`、`NFR-01..02`。
- 校验器对产物路径强制：R1 的 `clarification-questions.md` 位于 `docs_root` 根（非 `_draft/`），
  放错位置会 `invalidate` 并升 revision——已修正后通过。
- submit 只进入 `validating`，父 validate 后才进入澄清等待点，与契约一致。

### 3. 分层结论（关键）

- **协议/状态机/门禁：实测成立。** start/claim/context/submit/validate/needs_input、reset 恢复、
  过期租约隔离、snapshot_digest 绑定，全部按契约工作。
- **业务内容生成：依赖宿主，且这是当前最弱一环。** 非交互子会话（`claude -p --agent ohos-requirement`）
  在 R1 上 claim 成功后无法在租约内完成重型文档生成——读取全部 skill/契约/模板导致上下文膨胀，
  两次尝试均停滞（无 context 读取、无产物、无输出），耗尽租约。最终由父会话（本交互会话）直接生成
  产物并驱动 controller，才完成闭环。根因是「单次非交互会话承载读材料+生成合规模板文档」的上下文预算不足，
  而非 MCP/权限/工具故障（这些均已验证可用）。

### 4. 对"当前能力边界"的刻画

- 接入就绪：✅（本次实测）。
- 协议闭环：✅（本次实测一个 R1 到澄清点）。
- 自动完成业务内容（读材料→生成合规模板文档→提交）：⚠️ 依赖宿主会话质量，实测非交互子会话撑不住 R1。
- 自动构建自修复 / 经验 / 自迭代：❌（见上 M1/M3/M4/M5，本次未触及，也不以本地协议测试冒充）。

据此，**"运行一段时间能力自动提升"目前不成立**；当前成立的是"流程可管、证据可信、失败可诊断、可断点续跑、
可跨宿主切换"，而"失败后自动改码、自动重验、自动总结并变强"尚未实现（M3/M4/M5 空白）。
