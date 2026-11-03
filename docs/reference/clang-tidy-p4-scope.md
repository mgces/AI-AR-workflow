# P4 clang-tidy 范围与 compdb 处理讨论

> 状态：讨论记录与设计边界。本文不改变当前 Gate 行为，也不构成阶段 PASS 证据。

## 1. 讨论范围

本文只讨论 P4 的 **clang-tidy 静态检查**，包括：

- 是否对 changed C/C++ 执行 clang-tidy；
- 如何读取 `compile_commands.json`；
- timeout、失败和证据边界；
- 本地增量检查与线上全量检查的分工。

本文不讨论：

- P4 的 `build.sh`、GN/Ninja、构建缓存和产物；
- P6 真机部署、连接、SELinux 和重启；
- P8 上库、PR、CI、网络和审批。

result 中的失败必须按阶段归因：静态检查问题不能和编译失败、真机失败或上库失败混在一起。

## 2. 当前定位

clang-tidy 是 P4 的**补充性 AST 检查**，不是 workflow 的核心主线。

主线优先级：

```text
编译成功与产物正确
> P6 真机功能
> P8 上库与 CI
> P4 本地 clang-tidy 静态观察
```

当前实现：

- P4 构建成功后生成 `compile_commands.json`；
- `code_ruleset_guard.py --clang-tidy` 对 changed C/C++ 执行 clang-tidy；
- 只有 `gatelib.P4_CRITICAL_AST_RULESET_IDS` 与 `clang-tidy-backend` 阻断 P4；
- 其他 finding 作为 observation 留证；
- 当前是单批执行，clang-tidy 子进程 timeout 为 600s，gate 外层 timeout 为 900s；
- 工具、compdb、报告或诊断不可用时 fail-closed。

## 3. 曾经评估的优化方案

讨论过一个方向：

```text
P4 改为 per-TU 执行
+
guard 从完整 compdb 中提取 changed 文件的子集
+
每个 TU 使用小型 compdb
```

目标是同时解决：

- 一个慢 TU 拖死整批；
- 每个 TU 重复加载 4GB 级 compdb；
- 120s 整批超时。

在真实 `~/opencode2` 环境里观察到：

- compdb 约 4GB；
- 旧单批 clang-tidy 约 4.5–4.8GB RSS；
- 21–41 个 TU 的完整分析可能需要数百秒。

## 4. 为什么没有继续采用手写 compdb 子集

手写子集提取引入了比它解决的问题更高的风险：

1. **合法 compdb 可能被漏读**
   - 只识别特定 `"file"` 序列化形式；
   - 依赖 key 顺序或特定字节布局；
   - 候选对象数量有上限；
   - 可能生成空/不完整 subset。

2. **合法 command 可能导致提取失败**
   - command 字符串中的 `{` 可能被误认为对象起点；
   - 一个解析异常可能中止整批提取。

3. **空库和格式变体处理不完整**
   - 合法 pretty-printed 空库可能被误判；
   - 不同生成器产生的 JSON 变体需要持续维护。

4. **平台和性能问题**
   - 部分实现依赖 POSIX-only API；
   - 常见 basename 冲突可能放大提取成本；
   - 提取本身可能消耗 clang-tidy 的时间预算。

5. **证据仍不足**
   - 没有逐 TU 的 analyzed/skipped 签名记录；
   - 无法从签名证据证明每个 changed TU 都被执行。

核心判断：

> 为了提升一个补充性静态检查的本地覆盖率，引入一套需要长期维护的 compdb 解析器，风险高于收益。

## 5. 讨论结论

### 5.1 不采用

- 不继续扩展现有的手写 compdb 子集解析器；
- 不为本地静态检查引入逐 TU 调度和复杂执行状态；
- 不把静态工具的解析失败、timeout 或 unavailable 当成代码失败；
- 不为了本地静态覆盖率修改 P2/P3 的规则语义。

### 5.2 优先方案

如果后续需要调整，优先选择：

#### 方案 A：只调整 timeout

```text
完整 compdb 交给 clang-tidy
只调整 guard / gate timeout
```

优点：最简单，使用 clang-tidy 自己的 JSON 解析。
代价：4GB compdb 仍有约 4.5–4.8GB RSS，仍是整批执行。

#### 方案 B：按规模分层

```text
小 compdb：
    完整 compdb → clang-tidy

大 compdb：
    本地跳过 clang-tidy
    记录 static unavailable/skipped
    由线上 CI 做全量静态检查
```

优点：不再手写 compdb 解析；不会因为静态工具自身问题打断主线。
代价：本地静态覆盖率下降。

#### 方案 C：由构建系统生成 component compdb

由构建系统直接生成目标级/组件级 compdb，而不是从完整大文件中手写扫描提取。
这是后续可选方向，不是当前优先级。

## 6. 失败语义

建议区分：

| 类型 | 建议 |
|---|---|
| 明确的 P4 critical AST 代码 finding | 可以阻断 P4 |
| clang-tidy/compdb 工具缺失 | 记录 unavailable，不阻断任务 |
| compdb 解析失败 | 记录 unavailable，不阻断任务 |
| 静态扫描 timeout | 记录 unavailable/skipped，不阻断任务 |
| 非 critical finding | observation 留证 |
| 本地未覆盖的文件 | 记录 skipped，由线上 CI 全量检查 |

理由：

> 静态工具自身的失败不应被描述成代码失败，也不应消耗完任务的主线执行预算。

## 7. 当前不解决的失败

本文不改变、也不能解决：

- P4 构建失败：缓存、依赖、生成头、loader、平台头等；
- P6 真机失败：连接、部署、SELinux、重启；
- P8 上库失败：PR、CI、网络、审批。

这些必须分别归因，不能因为本次静态检查讨论而混为一谈。

## 8. 后续动作

- [ ] 如果只需要解决原先的 120s/600s timeout，优先采用方案 A；
- [ ] 如果目标是“静态检查不打断任务”，采用方案 B；
- [ ] 如果确实需要本地大库 AST 检查，再由构建系统生成 component compdb；
- [ ] 任何改变 P4 失败语义的方案，都需要同步更新 gate contract 和证据说明。

## 9. 一句话结论

> **clang-tidy 是补充检查，不是核心门禁；为了本地静态覆盖率手写解析 compdb 的风险高于收益。优先使用完整 compdb + timeout，或大库本地 skip、线上 CI 全量。**
