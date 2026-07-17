# frame_aware_sched 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

智能感知调度部件位于全局资源调度管控子系统中，通过帧感知调度机制，更新进程调度分组。通过获取应用的生命周期状态、应用绘帧等信息，调节内核调度参数，从而控制内核调度行为，保障系统进程调度供给。 智能感知调度部件根据执行时所属线程进行划分，可包含两大组件，即运行在App进程的绘帧信息收集组件和运行在系统服务进程的帧感知调度机制组件，每个组件分为若干模块。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `resourceschedule` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2048KB / 10240KB |
| 源码仓 | `foundation/resourceschedule/frame_aware_sched` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/resourceschedule/frame_aware_sched/interfaces](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 10 | `innerkits` |
| [foundation/resourceschedule/frame_aware_sched/profiles](../../../../../../foundation/resourceschedule/frame_aware_sched/profiles) | 组件注册、系统能力或产品装配配置。 | 1 | - |
| [foundation/resourceschedule/frame_aware_sched/common](../../../../../../foundation/resourceschedule/frame_aware_sched/common) | 组件内部共享的公共定义、工具和基础实现。 | 0 | `include` |
| [foundation/resourceschedule/frame_aware_sched/frameworks](../../../../../../foundation/resourceschedule/frame_aware_sched/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 0 | `core` |
| [foundation/resourceschedule/frame_aware_sched/qos_manager](../../../../../../foundation/resourceschedule/frame_aware_sched/qos_manager) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `include`, `src` |

## 对外与内部接口

该部件声明 4 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_ui_intf` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf` | `frame_ui_intf.h` |
| `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_msg_intf` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf` | `frame_msg_intf.h` |
| `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_trace_intf` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf` | `frame_trace.h` |
| `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:rtg_interface` | `//foundation/resourceschedule/frame_aware_sched/common/include` | `rtg_interface.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 4 个。

## 依赖与协作边界

该部件声明 9 个组件依赖和 0 个三方依赖。

- 系统组件协作：`bounds_checking_function`, `c_utils`, `eventhandler`, `ffrt`, `hitrace`, `hilog`, `libxml2`, `samgr`, `safwk`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 5 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_unittest` 4 个，`group` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/resourceschedule/frame_aware_sched/bundle.json](../../../../../../foundation/resourceschedule/frame_aware_sched/bundle.json)
- 原始源码 README：[foundation/resourceschedule/frame_aware_sched/README_zh.md](../../../../../../foundation/resourceschedule/frame_aware_sched/README_zh.md)、[foundation/resourceschedule/frame_aware_sched/README.md](../../../../../../foundation/resourceschedule/frame_aware_sched/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
