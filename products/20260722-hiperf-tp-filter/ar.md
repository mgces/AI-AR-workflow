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
- 测试：`test/unittest/common/native/subcommand_record_test.cpp`、`option_test.cpp` 等

## 验收标准

- [ ] `--tp-filter` 绑定「前一个 tracepoint」、经 ioctl/ filter 节点生效
- [ ] 规则格式符合 `Documentation/trace/events.rst`；字段与语法校验完整
- [ ] 非 trace / 无前置 tracepoint / ioctl 失败时错误信息明确
- [ ] 未启用 `--tp-filter` 无行为回归
- [ ] rk3568 D1–D3；P3 单测 PASS
