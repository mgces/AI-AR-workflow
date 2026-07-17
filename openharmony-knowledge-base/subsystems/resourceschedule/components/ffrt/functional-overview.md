# ffrt 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Concurrent Programming Framework

源码 README 补充说明：

> 并发编程框架 FFRT - 简介 - 目录 - 编译构建 - Testing - Benchmarks - Release - Contributing Code FFRT: Function Flow Runtime，一种并发编程框架，提供以数据依赖的方式构建异步并发任务的能力，包括数据依赖管理、任务执行器、系统事件处理等。并采用基于协程的任务执行方式，可以提高任务并行度、提升线程利用率、降低系统线程总数；充分利用多核平台的计算资源，保证系统对所有资源的集约化管理。最终解决系统线程资源滥用问题，打造极致用户体验。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `resourceschedule` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/resourceschedule/ffrt` |

## 核心能力

- **Resourceschedule Ffrt Core**：提供“ffrt core”能力，系统能力标识为 `SystemCapability.Resourceschedule.Ffrt.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `ffrt_support_enable`：ffrt 支持 启用。
- `ffrt_allocator_mmap_size`：ffrt allocator mmap size。
- `ffrt_stack_size`：ffrt stack size。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/resourceschedule/ffrt/benchmarks](../../../../../../foundation/resourceschedule/ffrt/benchmarks) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `base`, `face_story`, `fib`, `fork_join`, `serial_sched_time`, `speedup` |
| [foundation/resourceschedule/ffrt/include](../../../../../../foundation/resourceschedule/ffrt/include) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `core`, `dfx`, `dm`, `eu`, `internal_inc`, `sched`, `sync`, `tm` |
| [foundation/resourceschedule/ffrt/interfaces](../../../../../../foundation/resourceschedule/ffrt/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_api`, `kits` |
| [foundation/resourceschedule/ffrt/scripts](../../../../../../foundation/resourceschedule/ffrt/scripts) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/resourceschedule/ffrt/src](../../../../../../foundation/resourceschedule/ffrt/src) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `core`, `dfx`, `dm`, `eu`, `internal_inc`, `ipc`, `queue`, `sched` |
| [foundation/resourceschedule/ffrt/tools](../../../../../../foundation/resourceschedule/ffrt/tools) | 开发、诊断、命令行或构建辅助工具。 | 0 | `ffrt_trace_process` |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/resourceschedule/ffrt:libffrt` | `//foundation/resourceschedule/ffrt/interfaces/` | `kits/ffrt.h`, `kits/c/condition_variable.h`, `kits/c/loop.h`, `kits/c/mutex.h`, `kits/c/shared_mutex.h`, `kits/c/sleep.h`, `kits/c/task.h`, `kits/c/timer.h` 等 31 个 |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 1 个。

## 依赖与协作边界

该部件声明 6 个组件依赖和 0 个三方依赖。

- 系统组件协作：`bounds_checking_function`, `c_utils`, `hilog`, `hisysevent`, `faultloggerd`, `napi`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 31 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_unittest` 30 个，`group` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/resourceschedule/ffrt/bundle.json](../../../../../../foundation/resourceschedule/ffrt/bundle.json)
- 原始源码 README：[foundation/resourceschedule/ffrt/README.md](../../../../../../foundation/resourceschedule/ffrt/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
