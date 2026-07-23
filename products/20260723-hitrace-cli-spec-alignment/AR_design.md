# HiTrace Rust CLI 规格对齐重构设计

## 目标组件

目标组件为 `base/hiviewdfx/hitrace` 的命令行程序，基线提交为
`7141a84986afce2fba78af51584025afcbc19884`。本次把生产 `hitrace` 入口和命令规格重构为 Rust，
继续使用现有 C++ tracing、配置、参数、HiSysEvent 与 boot-trace 能力作为原生执行后端。GN 目标名、
最终产物路径、安装名、`bytrace` 符号链接、组件名和 part 名保持不变；真机验证只把产物部署为
`/data/local/tmp/hitrace-rust`，不覆盖 `/system/bin/hitrace`。

行为基准以本次干净源码基线及其 `HitraceCMDTest` 为准。设备上预装的其他版本只用于环境观察，
不得反向引入基线中不存在的命令或语义。

## 详细功能需求

1. 建立唯一 Rust 命令规格表。规格表同时描述长短选项、是否需要参数、对应运行状态、帮助文本、
   boot-trace 可见性和次序约束；`getopt_long` 所需表、帮助输出和解析分派均从该表派生，避免三份映射漂移。
2. 完整保留基线 CLI 契约：`hitrace`/`bytrace` 的 `argv[0]` 展示、短选项和长选项、非选项 category、
   默认短时文本采集、互斥状态、`--record` 次序、`--increment` 次序、数值边界、输出路径限制、错误文本、
   时间戳日志、成功/失败退出码及未知选项的 libc 诊断行为。
3. 保留初始化与遥测顺序。除 `boot-trace` init 子命令外，仍按 developer mode、参数数量、collector、
   tracefs、解析与路径检查的顺序执行；成功解析后再建立 HITRACE_USAGE 参数，命令结束后写 HiSysEvent。
4. 保留 boot-trace 的两条入口：用户侧 `--boot_trace` 配置入口和 init 专用 `boot-trace` 捕获入口。
   root、父进程、debuggable image、active flag、配置 JSON、repeat、increment、off、结果码及清理语义不变。
5. Rust 只负责规格、解析、校验编排和生命周期控制；依赖 TraceCollector、TraceJsonParser、参数服务、
   tracefs、cJSON、HiSysEvent 的能力通过窄 C ABI 调用 C++ 后端。ABI 只使用定宽整数、C 字符串和显式长度，
   不跨边界传递 C++/Rust 容器、异常或所有权。
6. 生产目标必须是 `ohos_rust_executable("hitrace")`，产物仍为
   `out/rk3568/hiviewdfx/hitrace/hitrace`，保留 `pac_ret`、安装、part/subsystem 和 `bytrace` 链接配置。
7. `HitraceCMDTest` 必须通过 Rust 导出的测试入口调用同一 parser/spec/orchestrator；原有 56 个用例继续运行，
   并补充 Rust 规格单源、解析次序、数值边界和 boot 子命令门控用例。
8. 真机生命周期门禁使用环境变量 `HITRACE_GATE_NONCE` 把 `$GATE_NONCE` 交给程序。仅当该变量存在时，
   Rust 改动路径才经原生 hilog 桥输出 runtime marker；`--get_level` 真正成功后再输出 E2E marker 和 nonce。
   正常用户调用不产生这些门禁日志，不改变 CLI stdout/stderr。
9. 不新增或删除用户命令，不改变 trace 数据格式、文件策略、SELinux/DAC、公共 native/JS/ETS/CJ/Rust API，
   不引入第三方 Rust crate，也不修改系统预装二进制。

## 完整代码框架

### 文件清单

- 修改 `cmd/BUILD.gn`：定义 Rust 生产目标、Rust core/测试 FFI 目标、生产/测试原生后端目标及原有打包属性。
- 重写 `cmd/hitrace_cmd.cpp`：仅保留 `HitraceCMDTest` 到 Rust 测试入口及原生 test hook 的兼容适配。
- 新增 `cmd/include/hitrace_native.h`：稳定 C ABI、请求结构、状态值和测试 hook 声明。
- 新增 `cmd/native/hitrace_native_internal.h`：C++ 后端内部上下文、公共 helper 和模块接口。
- 新增 `cmd/native/hitrace_native.cpp`：环境预检、category 桥、日志、门禁 marker、遥测和导出 ABI。
- 新增 `cmd/native/hitrace_executor.cpp`：短时/长时/record/snapshot/trace-level 的原生执行实现。
- 新增 `cmd/native/hitrace_boot_trace.cpp`：boot 配置、JSON 读写、init 捕获、active flag 与结果持久化。
- 新增 `cmd/rust/src/main.rs`：最薄生产入口。
- 新增 `cmd/rust/src/lib.rs`：Rust CLI core 模块装配及 C ABI 测试入口。
- 新增 `cmd/rust/src/spec.rs`：唯一命令规格、状态、常量及帮助渲染。
- 新增 `cmd/rust/src/parser.rs`：基于规格构造 `getopt_long` 表并完成确定性解析/校验。
- 新增 `cmd/rust/src/native.rs`：Rust 侧 C ABI 类型、生命周期安全封装及 `NativePlatform`。
- 新增 `cmd/rust/src/orchestrator.rs`：boot 子命令分流、预检、解析、执行、遥测与退出编排。
- 修改 `test/unittest/BUILD.gn`：让 `HitraceCMDTest` 链接 Rust test FFI 和 test native backend。
- 在 P3 修改 `test/unittest/hitrace_cmd/hitrace_cmd_test.cpp`：增加 contract 声明的 4 个 GTest。

### 每文件功能

`spec.rs` 是命令语义的唯一数据源，`parser.rs` 不再维护平行 option map；`orchestrator.rs` 只消费
`ParsedCommand` 并控制调用顺序。`native.rs` 隔离 unsafe，确保每个指针在调用期间有效、空值和长度显式。
三个 C++ 文件按 runtime、普通执行、boot-trace 拆分，内部共享 `NativeContext`，但只有
`hitrace_native.h` 暴露给 Rust。`hitrace_cmd.cpp` 不含第二套解析器，只转调 Rust 导出的
`hitrace_cli_test_main`，所以原有和新增 GTest 均验证生产 Rust core。

生产与测试分别编译 native backend：生产版本读取真实 euid/ppid/product；测试版本带
`HITRACE_UNITTEST`，沿用现有三个 boot gate hook。Rust core 本身不分叉业务逻辑，测试入口只负责从
`argc/argv` 建立借用视图并在每次调用前重置 libc getopt 状态。

### 每文件代码框架

`spec.rs` 定义 `RunningState`、`ArgRequirement`、`OptionAction`、`OptionSpec`、数值范围常量和
`OPTION_SPECS`；提供 `long_options()`、`find_long_option()`、`render_help(argv0, show_boot)`。
每个帮助行直接属于对应 option spec，root/debuggable 条件只控制 boot 项是否渲染。

`parser.rs` 定义 `ParsedCommand` 和 `ParseError`。解析器用 `OPTION_SPECS` 构造以空项结尾的 libc
`option` 数组，保持基线 short option 字符串和 `getopt_long` 的缩写、排列、错误输出语义；action handler
实现状态互斥、record/increment 次序、整数完整消费、4 KB 对齐、路径长度/目录检查、category/group
校验和 `off` 特例。所有错误通过 `NativePlatform::console_log` 输出基线文本。

`native.rs` 以 `#[repr(C)]` 定义 `NativeRequest`，布尔量用 `i32`，字符串和 tag 数组携带显式长度；
unsafe extern 调用只存在于本文件。`NativePlatform` 提供 initialize、root/init/debug 查询、tag 分类、
可写路径判断、execute、boot control、help/list telemetry 和 gate log。

`orchestrator.rs` 的 `run` 先识别精确的第二参数 `boot-trace`，执行三重门控后调用 native boot control；
普通路径先 native initialize，再 parser，补默认状态与 entry 日志，随后执行 help、list 或 native request，
最后记录 HiSysEvent。若存在 `HITRACE_GATE_NONCE`，启动 Rust core 后输出
`HITRACE_RUST_CLI_RUNTIME`；且仅在 `GET_TRACE_LEVEL` 返回成功后输出
`HITRACE_RUST_CLI_GET_LEVEL_OK`，两条日志均带同一 nonce。

`hitrace_native.cpp` 维护每次调用可重置的 `NativeContext`，实现 TraceCollector 创建、tracefs 检查、
TraceJsonParser 分类、ConsoleLog、HiSysEvent 字段填充与 `HILOG_INFO` marker 桥；不解析 argv。
`hitrace_executor.cpp` 从只读 `NativeRequest` 填充内部参数并分派现有采集 handler；
`hitrace_boot_trace.cpp` 独立拥有配置结构与 boot 捕获流程，调用 runtime 提供的参数/日志 helper。
所有头文件使用 include guard，不使用 `#pragma once`、头文件 `using namespace` 或跨 ABI 容器。

`cmd/BUILD.gn` 用 `ohos_rust_static_library` 生成共享 core，用 `ohos_rust_executable` 生成生产 `hitrace`，
用 `ohos_rust_static_ffi` 暴露 GTest 入口；两个 `ohos_static_library` 分别编译生产和测试 native backend。
生产目标继续设置 `install_enable`、`symlink_target_name`、subsystem/part、`pac_ret` 和 gc-sections。

## 完整测试框架

P1 完成生产实现并确保 `--build-target hitrace` 可构建；P3 只新增/修改测试路径。测试主入口仍是
developer_test 的 `HitraceCMDTest`，但其 adapter 调用 Rust static FFI，因此所有原有 56 个测试会对新的
Rust 规格/解析/编排和拆分后的 native backend 做回归。新增四个 Level1 GTest：

- `HitraceCMDTest.HitraceCMDRustSpec001`：用 `hitrace` 与 `bytrace` argv0 验证 usage、公共 option 和
  root/debuggable 条件下 boot option 的唯一规格渲染。
- `HitraceCMDTest.HitraceCMDRustParser002`：验证互斥状态，以及 `--trace_begin --record` 成功、反序失败、
  `--boot_trace --increment` 成功而反序失败的次序语义。
- `HitraceCMDTest.HitraceCMDRustValidation003`：验证 buffer/time/file/total/repeat 的合法边界与完整整数解析。
- `HitraceCMDTest.HitraceCMDRustBootGate004`：验证 `boot-trace` 的 euid、init parent、debuggable 三重门控与诊断。

测试继续复用 stdout 捕获、临时 boot 配置清理和三个现有 hook；每个入口调用前后重置 Rust getopt 状态、
native context 和环境变量，避免用例间污染。P3 门禁运行 part `hitrace`、suite `HitraceCMDTest`，要求全套
结果 XML 无 failure/error，并逐项命中下方 contract 中的 GTest 名称。

## 需测试的功能点

必须验证：产物确为 Rust 入口且保持原路径；全部 option 的参数需求和帮助顺序；短长选项等价；未知/缺参
诊断；category 与 group；默认状态；互斥状态；record/increment 的位置敏感性；整数溢出、尾随字符、最小/
最大值和 buffer 对齐；output/total-size 限制；help/list/level/short/long/snapshot 分派；`argv[0]` 的
`hitrace`/`bytrace` 差异；boot 配置/off/capture/active/result/increment；developer mode、root、init、
debuggable 和 tracefs 门控；HiSysEvent 写入时机；失败返回 255 与成功返回 0；原有 56 个回归用例无退化。

构建验证产物为 `out/rk3568/hiviewdfx/hitrace/hitrace`。测试 contract 只列新增的关键用例，但 P3
仍必须运行并通过整个 `HitraceCMDTest`。

## 真机测试用例构造

P4 在 HDC server `<REDACTED-HOST:PORT>`、serial `<REDACTED-SERIAL>` 上执行。deploy 脚本
使用 `dev_send` 把本次构建产物发送到 `/data/local/tmp/hitrace-rust` 并设为 0755；门禁比较主机产物和
设备文件 sha256。scenario 脚本只把 `$GATE_NONCE` 赋给 `HITRACE_GATE_NONCE` 并从隔离路径真实执行
`--get_level`，不包含任何 success marker 字面量，也不写系统分区。

Rust core 启动时仅在 gate nonce 存在的情况下，经 native hilog 桥输出 `HITRACE_RUST_CLI_RUNTIME` 和
nonce；规格解析、原生参数查询及遥测路径全部成功后输出 `HITRACE_RUST_CLI_GET_LEVEL_OK` 和同一 nonce。
因此 runtime marker 证明改动代码运行，E2E/contract marker 只在真实命令成功后出现。P4 还要求 uptime
递增、hilog START/END nonce 锚点、两个 marker 和产物哈希全部成立，再由用户人工复核。

```ar-contract
{
  "build_artifacts": [
    "out/rk3568/hiviewdfx/hitrace/hitrace"
  ],
  "test_cases": [
    {
      "point": "Rust 单一规格生成 hitrace/bytrace 帮助并遵守 boot 可见性",
      "gtest": "HitraceCMDTest.HitraceCMDRustSpec001"
    },
    {
      "point": "Rust parser 保持命令互斥与 record/increment 次序语义",
      "gtest": "HitraceCMDTest.HitraceCMDRustParser002"
    },
    {
      "point": "Rust parser 保持数值完整解析及所有范围边界",
      "gtest": "HitraceCMDTest.HitraceCMDRustValidation003"
    },
    {
      "point": "Rust orchestrator 保持 boot-trace 三重权限门控",
      "gtest": "HitraceCMDTest.HitraceCMDRustBootGate004"
    }
  ],
  "device_cases": [
    {
      "desc": "隔离运行本次 Rust 产物的 --get_level，验证 Rust 解析、原生执行、遥测和成功日志",
      "marker": "HITRACE_RUST_CLI_GET_LEVEL_OK"
    }
  ]
}
```
