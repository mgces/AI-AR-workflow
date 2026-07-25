# AR 设计：hiperf `--tp-filter` tracepoint 过滤采样

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
