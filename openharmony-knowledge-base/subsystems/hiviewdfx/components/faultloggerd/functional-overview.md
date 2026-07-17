# faultloggerd 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

统一处理 native 崩溃、主动 dump、远程进程栈获取和故障日志落盘，并提供可靠的栈回溯基础库。

信号处理器、DumpCatcher、Hiview 故障插件及调试工具通过客户端协议请求 faultloggerd/processdump。

能力边界：该部件适配 `small,standard` 系统类型，当前 rk3568 产品已选入。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 崩溃信号接管与进程转储 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/faultloggerd:faultloggerd_targets` | `interfaces` |
| 跨进程堆栈抓取与符号化 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `services` |
| unwinder/backtrace/stack formatter 基础能力 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `frameworks` |
| 故障日志生成、校验和查询 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `common` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/backtrace:libbacktrace_local` | 系统部件/框架调用者 | 库接口与控制/数据交换 | backtrace_local.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/backtrace:backtrace_local` | 系统部件/框架调用者 | 库接口与控制/数据交换 | backtrace_local.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/dump_catcher:libdfx_dumpcatcher` | 系统部件/框架调用者 | 库接口与控制/数据交换 | dfx_dump_catcher.h, lite_perf.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/faultloggerd_client:libfaultloggerd` | 系统部件/框架调用者 | 库接口与控制/数据交换 | faultloggerd_client.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/formatter:libjson_stack_formatter` | 系统部件/框架调用者 | 库接口与控制/数据交换 | dfx_json_formatter.h |
| `//base/hiviewdfx/faultloggerd/interfaces/rust/panic_handler:panic_handler` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/faultloggerd/bundle.json |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/procinfo:libdfx_procinfo` | 系统部件/框架调用者 | 库接口与控制/数据交换 | procinfo.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/signal_handler:dfx_signalhandler` | 系统部件/框架调用者 | 库接口与控制/数据交换 | dfx_signal_handler.h, dfx_unique_crash_obj.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/stack_printer:libstack_printer` | 系统部件/框架调用者 | 库接口与控制/数据交换 | stack_printer.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/unwinder:libunwinder` | 系统部件/框架调用者 | 库接口与控制/数据交换 | unwinder.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/unwinder:libunwinder_static` | 系统部件/框架调用者 | 库接口与控制/数据交换 | unwinder.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/unwinder:unwinder_host` | 系统部件/框架调用者 | 库接口与控制/数据交换 | dfx_map.h, dfx_maps.h, dfx_elf.h, dfx_symbol.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/async_stack:libasync_stack` | 系统部件/框架调用者 | 库接口与控制/数据交换 | async_stack.h, unique_stack_table.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/crash_exception:crash_exception` | 系统部件/框架调用者 | 库接口与控制/数据交换 | crash_exception.h |
| `//base/hiviewdfx/faultloggerd/interfaces/innerkits/sigdump_handler:dfx_sigdump_handler` | 系统部件/框架调用者 | 库接口与控制/数据交换 | dfx_sigdump_handler.h |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| `faultloggerd` (daemon) | init cfg | 统一处理 native 崩溃、主动 dump、远程进程栈获取和故障日志落盘，并提供可靠的栈回溯基础库。 | base/hiviewdfx/faultloggerd/services/config/faultloggerd.cfg；uid=faultloggerd；u:r:faultloggerd:s0 |
| `processdump` (helper-executable) | production executable used by crash/dump flow | 统一处理 native 崩溃、主动 dump、远程进程栈获取和故障日志落盘，并提供可靠的栈回溯基础库。 | base/hiviewdfx/faultloggerd/tools/process_dump/BUILD.gn |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/faultloggerd/interfaces](../../../../../../base/hiviewdfx/faultloggerd/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/faultloggerd/services](../../../../../../base/hiviewdfx/faultloggerd/services) | 服务、进程与启动实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/faultloggerd/frameworks](../../../../../../base/hiviewdfx/faultloggerd/frameworks) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/faultloggerd/common](../../../../../../base/hiviewdfx/faultloggerd/common) | 公共工具、数据类型和辅助算法 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/faultloggerd/tools](../../../../../../base/hiviewdfx/faultloggerd/tools) | 公共工具、数据类型和辅助算法 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
crashing process or DumpCatcher -> faultloggerd socket -> processdump/unwinder -> fault log -> Hiview
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| `faultloggerd_feature_coverage` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/faultloggerd/bundle.json) |
| `faultloggerd_enable_build_targets` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/faultloggerd/bundle.json) |

## 依赖与协作边界

- 上游：信号处理器、DumpCatcher、Hiview 故障插件及调试工具通过客户端协议请求 faultloggerd/processdump。
- 系统部件依赖：`ability_base`、`bounds_checking_function`、`bundle_framework`、`cJSON`、`c_utils`、`ets_frontend`、`ffrt`、`hilog`、`hisysevent`、`hitrace`、`init`、`ipc`、`jsoncpp`、`libuv`、`lzma`、`samgr`、`selinux`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | `//base/hiviewdfx/faultloggerd:faultloggerd_tests` | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 132 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | `faultloggerd`、`processdump` | 本次为静态分析，未执行真机测试 |

## 风险

- 故障现场的异步信号安全、ptrace/权限边界、恶意 PID/fd 输入、超时和大栈内存消耗。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/faultloggerd/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/faultloggerd/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
