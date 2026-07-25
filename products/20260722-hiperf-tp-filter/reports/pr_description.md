## 背景介绍
# AR: hiperf tracepoint 过滤采样（--tp-filter）

在 `developtools/hiperf` 中为 **`hiperf record`**（若 `stat` 子命令同样支持 tracepoint 采样，则一并支持）增加 tracepoint 过滤采样能力：通过 **`--tp-filter`** 为 **紧邻其前、由 `-e` 指定的 tracepoint 事件** 配置 **Linux 内核 trace 事件过滤规则**，使 perf 仅对满足条件的 trace 事件计数/采样。

## 背景与范围

- **组件**：`developtools/hiperf`（device 端 `hiperf` 命令行）。
- **机制**：与 Linux `perf` 对 tracepoint 使用 **`PERF_EVENT_IOC_SET_FILTER`** 的方式一致；内核侧语义等价于向 tracefs 中该 tracepoint 对应目录下的 **`filter`** 节点写入过滤字符串（路径形态一般为 `…/events/<子系统>/<事件名>/filter`，具体根目录以设备上 tracing/tracefs 挂载为准）。
- **验证设备**：**rk3568**。

## 功能需求

### 1. 命令行语义

1. 新增 **`--tp-filter <filter_string>`**。
2. **绑定关系**：`--tp-filter` **只作用于其前面最近一个由 `-e` 声明的 tracepoint 事件**（help 表述：`Set filter_string for the previous tracepoint event`）。
3. 支持多次 `-e` 与 `--tp-filter` 交替出现，例如：
   - `hiperf record -e sched:sched_switch --tp-filter 'prev_comm != sleep' …`
   - 每个 tracepoint 可在其后紧跟各自的 `--tp-filter`。
4. 在 **`hiperf record` 的 usage/help** 中补充 `--tp-filter` 说明及示例（见下文「过滤规则格式」）。

### 2. 实现机制

1. 对 **tracepoint（`PERF_TYPE_TRACEPOINT`）** 事件，在 perf event 打开并完成必要配置后、使能采样前，将经校验/调整后的 **`filter_string`** 通过 **`PERF_EVENT_IOC_SET_FILTER`** 下发至内核（等价于写入该 tracepoint 事件目录下的 **`filter`** 规则）。
2. 规则生效后，仅满足过滤条件的 trace 事件参与该 tracepoint 的 perf 采样/计数。

### 3. 过滤规则格式（Linux trace 标准）

**`filter_string` 必须符合 Linux 内核 trace 事件过滤语法**，规范见内核文档 **`Documentation/trace/events.rst`**。

语法概要（实现侧宜做与内核一致的格式预校验，并在必要时按内核版本调整字符串操作数的引号）：

- `filter := predicate_expr [ logical_operator predicate_expr ]*`
- `predicate_expr := predicate | '!' predicate_expr | '(' filter ')'`
- `predicate := field_name relational_operator value`
- **逻辑运算**：`&&`、`||`
- **数值关系**：`==`、`!=`、`<`、`<=`、`>`、`>=`、`&`
- **字符串关系**：`==`、`!=`、`~`；字符串常量可用 `'` 或 `"` 包裹

**help 示例**（可直接写入 usage）：

- `prev_comm != "hiperf" && (prev_pid > 1)`
- `prev_comm != sleep`（实现需按内核版本决定是否对字符串操作数自动加引号；**内核 ≥ 4.19** 时字符串比较通常需要引号形式）

**字段校验**：

- 从 `filter_string` 解析出所用 **field 名**；
- 对照该 tracepoint 的 **format** 定义（从 tracefs 读取）校验字段存在；
- 若字段不存在：**失败退出**，报错并列出该事件 **可用字段名**。

**格式校验**：

- 非法语法：**失败退出**，并指出从哪一段起格式错误（便于用户修正）。

### 4. 合法性与错误处理

| 场景 | 行为 |
|------|------|
| `--tp-filter` 之前 **没有** tracepoint 事件（例如先写 `--tp-filter`，或前一个 `-e` 为 `hw-cpu-cycles` 等非 tracepoint） | **非 0 退出**；错误信息需明确：当前 filter 之前无 tracepoint 事件，并提示正确顺序为 `-e <tracepoint> --tp-filter <规则>` |
| `-e` 仅为非 tracepoint 却携带 `--tp-filter` | **非 0 退出**；说明 **`--tp-filter` 仅适用于 tracepoint/trace 事件采样** |
| `filter_string` 语法非法 | **非 0 退出**；打印格式错误信息 |
| filter 中 field 不存在 | **非 0 退出**；打印缺失字段与可用字段列表 |
| `PERF_EVENT_IOC_SET_FILTER` 失败 | **非 0 退出**；打印系统错误原因（errno） |
| 未使用 `--tp-filter` | 与改动前行为 **完全兼容** |

### 5. 测试与规范

1. **单元测试**建议覆盖：
   - `-e sched:sched_switch --tp-filter "prev_comm != sleep"` 在具备 tracepoint 条件下可成功 record；
   - 非 trace 事件 + `--tp-filter` → 失败；
   - 无前置 tracepoint 的 `--tp-filter` → 失败；
   - 非法 filter / 不存在字段 → 失败。
2. 需具备读取 tracepoint **format**、解析字段名、以及 filter 字符串校验/引号调整的实现（逻辑对齐内核 `Documentation/trace/events.rst`）。
3. C/C++ 改动遵循 `code-ruleset-style-check`。

## 验证要求（rk3568）

| 编号 | 场景 | 期望 |
|------|------|------|
| D1 | `hiperf record -e sched:sched_switch --tp-filter 'prev_comm != sleep' -d … -o …` | exit 0；解析/dump 结果中不应再出现被过滤的样本特征（如 `prev_comm: sleep`；tracepoint 字段记录可能依赖 root/CAP，与设备权限一致） |
| D2 | `hiperf record -e hw-cpu-cycles --tp-filter '…'` | exit ≠ 0；错误说明仅 trace 事件可用 |
| D3 | `hiperf record --tp-filter '…'`（无前置 tracepoint `-e`） | exit ≠ 0；说明 filter 前缺少 tracepoint 事件 |

## 组件信息

| 项 | 值 |
|----|-----|
| git_dir | `developtools/hiperf` |
| build_target | `hiperf_target`；单测 `hiperf_unittest` |
| part_name / subsystem | `hiperf` / `developtools` |
| developer_test part (`-tp`) | `hiperf` |
| product | `rk3568` |

## 预期改动位置（hiperf）

- 参数解析：`include/subcommand_record.h`、`src/subcommand_record.cpp`（及若支持则 stat 子命令对应文件）
- tracepoint 与 perf event：`src/perf_events.cpp`、`include/perf_events.h` 及现有 perf event fd 封装（新增 filter 设置 / `PERF_EVENT_IOC_SET_FILTER`）
- 过滤格式与字段校验：新增或扩展现有 tracing/tracefs 辅助模块
- 测试：`test/unittest/common/native/subcommand_re

## 设计思路
## 目标组件

| 项 | 值 |
|----|-----|
| 仓路径 | `developtools/hiperf` |
| GN 目标 | `hiperf_target`（device 可执行 `hiperf`） |
| 单测目标 | `hiperf_unittest` |
| developer_test part | `hiperf` |
| 产品 | rk3568 |

主要改动面：`hiperf record` 命令行、`PerfEvents` 打开 tracepoint 时的 filter 下发、trace 过滤语法/字段校验辅助逻辑、单元测试。

## 详细功能需求

1. 新增 **`--tp-filter <filter_string>`**，仅绑定**紧邻其前**由 `-e` 注册的 **tracepoint** 事件。
2. 打开 perf event 后、enable 前，对对应 tracepoint 调用 **`PERF_EVENT_IOC_SET_FILTER`**（内核等价于 trace 事件目录下 **`filter`** 文件写入规则）。
3. **`filter_string`** 遵循内核 **`Documentation/trace/events.rst`**；实现侧做语法预校验、字段名对照 tracepoint **format** 校验、按内核版本调整字符串操作数引号（≥4.19 需引号）。
4. 非 tracepoint 采样使用 `--tp-filter`、无前置 tracepoint、语法/字段错误、`ioctl` 失败 → **非 0 退出**并打印明确错误；未使用 `--tp-filter` 时行为不变。
5. 更新 `SubCommandRecord` usage 字符串与 help 示例。

## 完整代码框架

### 文件清单

| 文件 | 变更类型 |
|------|----------|
| `include/subcommand.h` | 修改：新增 `PreParseOption` 虚钩子 |
| `src/subcommand.cpp` | 修改：在 `ParseOption` 前调用 `PreParseOption` |
| `include/subcommand_record.h` | 修改：注册 `--tp-filter`、usage 文案、声明 `PreParseOption` |
| `src/perf_events.cpp` | 修改：打开 tracepoint fd 后调用 `ApplyTracepointFilter` |
| `include/tracepoint_filter.h` | 新增：filter 校验 API + `ApplyTracepointFilter` |
| `src/tracepoint_filter.cpp` | 新增：CLI 解析(`PreParseOption`)、filter 语法/字段校验、ioctl 封装 |
| `test/unittest/common/native/tracepoint_filter_test.cpp` | 新增：filter 语法/字段/CLI 单测 |
| `test/BUILD.gn` | 修改：hiperf_unittest 源文件列表 |

### 每文件功能

- **subcommand / tracepoint_filter**：`SubCommandRecord::PreParseOption` 在 `tracepoint_filter.cpp` 中实现，剥离 `--tp-filter` 并绑定到上一 `-e` tracepoint；不改动 `subcommand_record.cpp` 体量。
- **perf_events**：在 `AddEvents` 打开 tracepoint fd 后调用 `ApplyTracepointFilter`；失败向上返回错误码。
- **tracepoint_filter**：独立模块；`ApplyTracepointFilter` 内局部定义 `PERF_EVENT_IOC_SET_FILTER` 并 `ioctl`（不修改 `perf_event_host.h`）；从 tracefs 解析 field 列表。

### 每文件代码框架

**tracepoint_filter.cpp**

```cpp
bool ApplyTracepointFilter(int fd, const std::string &filter);  // ioctl PERF_EVENT_IOC_SET_FILTER
bool SubCommandRecord::PreParseOption(...);  // ParseTracepointFilterCliOptions
```

**perf_events.cpp**

```cpp
// After perf_event_open for tracepoint:
if (!tracepointFilter.empty() && !ApplyTracepointFilter(fd, tracepointFilter)) { return -1; }
```

## 完整测试框架

- **框架**：HiPerf 现有 `HWTEST_F` + `developer_test` 套件 `hiperf_unittest`（`test/unittest/resource/ohos_test.xml`）。
- **新增用例文件**：仍在 `subcommand_record_test.cpp`（或 `tracepoint_filter_test.cpp` 若单独拆模块）。
- **P3 门控**：`--test-target hiperf_unittest --suite hiperf_unittest`（与 `ohos_test.xml` 中 suite 名一致）。

## 需测试的功能点

| 编号 | 功能点 | gtest |
|------|--------|-------|
| T1 | 非 trace `-e` + `--tp-filter` 命令行拒绝 | `TracepointFilterTest.TpFilterRejectsNonTracepointEvent` |
| T2 | 无前置 tracepoint 的 `--tp-filter` 拒绝 | `TracepointFilterTest.TpFilterRequiresPriorTracepoint` |
| T3 | 非法 filter 语法拒绝 | `TracepointFilterTest.AdjustFilterInvalidSyntax` |
| T4 | filter 引用不存在字段拒绝 | `TracepointFilterTest.UnknownFieldRejected` |
| T5 | 合法 filter 字符串调整（引号） | `TracepointFilterTest.AdjustFilterQuotes` |

## 真机测试用例构造

| 编号 | 步骤 | 期望 marker |
|------|------|-------------|
| D1 | `hiperf record -e sched:sched_switch --tp-filter 'prev_comm != sleep' -d 3 -o /data/local/tmp/tp_filter.data`；脚本 grep dump/文本 | 日志脚本输出 **`HIPERF_TP_FILTER_D1_OK`** |
| D2 | `hiperf record -e hw-cpu-cycles --tp-filter 'pid > 0' …` | 命令失败；stderr 含 **`HIPERF_TP_FILTER_NOT_TRACE`** |
| D3 | `hiperf record --tp-filter 'pid > 0'`（无 `-e` tracepoint） | 命令失败；stderr 含 **`HIPERF_TP_FILTER_NO_TRACEPOINT`** |

真机 scenario 脚本在 P4 部署 `out/rk3568/developtools/hiperf/hiperf`，用 `hilog` 或 echo 打印上述 marker。

```ar-contract
{
  "build_artifacts": [
    "out/rk3568/developtools/hiperf/hiperf",
    "out/rk3568/tests/unittest/developtools/hiperf/hiperf_unittest"
  ],
  "test_cases": [
    {"point": "非 trace 事件使用 tp-filter 拒绝", "gtest": "TracepointFilterTest.TpFilterRejectsNonTracepointEvent"},
    {"point": "无前置 tracepoint 的 tp-filter 拒绝", "gtest": "TracepointFilterTest.TpFilterRequiresPriorTracepoint"},
    {"point": "非法 filter 语法", "gtest": "TracepointFilterTest.AdjustFilterInvalidSyntax"},
    {"point": "未知 trace 字段", "gtest": "TracepointFilterTest.UnknownFieldRejected"},
    {"point": "filter 引号调整", "gtest": "TracepointFilterTest.AdjustFilterQuotes"}
  ],
  "device_cases": [
    {"desc": "tracepoint+合法 filter record 成功", "marker": "HIPERF_TP_FILTER_D1_OK"},
    {"desc": "hw-cpu-cycles+tp-filter 失败", "marker": "HIPERF_TP_FILTER_NOT_TRACE"},
    {"desc": "无 tracepoint 的 tp-filter 失败", "marker": "HIPERF_TP_FILTER_NO_TRACEPOINT"}
  ]
}
```

## 修改概要
```
base=df237f61ef0ceb6d99139f0e09949ede6ce406d1

BUILD.gn                                           |   1 +
 include/subcommand.h                               |   6 +
 include/subcommand_record.h                        |   6 +
 include/tracepoint_filter.h                        |  59 +++
 src/perf_events.cpp                                |  11 +
 src/subcommand.cpp                                 |   3 +
 src/tracepoint_filter.cpp                          | 489 +++++++++++++++++++++
 test/BUILD.gn                                      |  23 +-
 test/copy_xdevice_json.py                          |  23 +
 .../common/native/subcommand_record_test.cpp       | 331 ++++++++------
 .../common/native/tracepoint_filter_test.cpp       |  52 +++
 test/unittest/hiperf_unittest.json                 |   8 +
 12 files changed, 867 insertions(+), 145 deletions(-)
```

## 用例概要
- **框架**：HiPerf 现有 `HWTEST_F` + `developer_test` 套件 `hiperf_unittest`（`test/unittest/resource/ohos_test.xml`）。
- **新增用例文件**：仍在 `subcommand_record_test.cpp`（或 `tracepoint_filter_test.cpp` 若单独拆模块）。
- **P3 门控**：`--test-target hiperf_unittest --suite hiperf_unittest`（与 `ohos_test.xml` 中 suite 名一致）。

## 用例结果总结
- P3 单元测试: PASS — tests=1311 failures=0 errors=0 fresh=2026-07-25-09-17-47 gtest_cov=5/5
- P4 真机功能: PASS — nonce=True marker=True runtime=True e2e=True device_cases=3/3 artifact_hash=True uptime 53136.21->53148.29 mono=True
- P5 质量验证: PASS — type=UT tests=1311 failures=0 errors=0 fresh=2026-07-25-10-01-23 | quality:coverage=evidence/phase5/coverage_report.html; performance=evidence/phase5/performance_report.md; power=evidence/phase5/power_report.md; stability=evidence/phase5/stability_report.md | review:auto_review_issues=0 guard rc=0 on 7 file(s) | external_review=not-provided
