# qos_manager 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

权限管控服务目前服务于并发编程框架FFRT，为特定的线程提供调用底层Qos和RTG接口的能力。服务接收全局资源调度管控子系统中的帧感知调度插件发送的场景信息，为系统服务uid与前台app的uid赋予调用底层对应接口的权限。同时将多级Qos的配置信息下发到内核，为而为并发编程框架FFRT提供支撑。 权限管控服务根据其对接的内核功能模块，主要可以分为两个部分。即RTG权限管控与分组管理、多级QoS权限管控与信息下发。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `resourceschedule` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2048KB / 10240KB |
| 源码仓 | `foundation/resourceschedule/qos_manager` |

## 核心能力

- **Resourceschedule Qo S Core**：提供“qo s core”能力，系统能力标识为 `SystemCapability.Resourceschedule.QoS.Core`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/resourceschedule/qos_manager/frameworks](../../../../../../foundation/resourceschedule/qos_manager/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 6 | `concurrent_task_client`, `native` |
| [foundation/resourceschedule/qos_manager/etc](../../../../../../foundation/resourceschedule/qos_manager/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 4 | `init`, `param` |
| [foundation/resourceschedule/qos_manager/qos](../../../../../../foundation/resourceschedule/qos_manager/qos) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 3 | - |
| [foundation/resourceschedule/qos_manager/interfaces](../../../../../../foundation/resourceschedule/qos_manager/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 2 | `inner_api`, `kits` |
| [foundation/resourceschedule/qos_manager/services](../../../../../../foundation/resourceschedule/qos_manager/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 2 | `include`, `src` |
| [foundation/resourceschedule/qos_manager/sa_profile](../../../../../../foundation/resourceschedule/qos_manager/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/resourceschedule/qos_manager/common](../../../../../../foundation/resourceschedule/qos_manager/common) | 组件内部共享的公共定义、工具和基础实现。 | 0 | `include`, `src` |
| [foundation/resourceschedule/qos_manager/include](../../../../../../foundation/resourceschedule/qos_manager/include) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 3 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client:concurrent_task_client` | `//foundation/resourceschedule/qos_manager/interfaces/inner_api/` | `concurrent_task_client.h` |
| `//foundation/resourceschedule/qos_manager/qos:qos` | `//foundation/resourceschedule/qos_manager/interfaces/inner_api/` | `qos.h` |
| `//foundation/resourceschedule/qos_manager/qos:pi_mutex` | `//foundation/resourceschedule/qos_manager/interfaces/inner_api/` | `pi_mutex.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `resourceschedule` | [concurrent_task_service](../../processes/concurrent_task_service/foundation-runtime.md) | 启动配置, SA 实现 | `1912` | `libconcurrentsvc.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/resourceschedule/qos_manager/sa_profile:concurrent_task_sa_profile` | [foundation/resourceschedule/qos_manager/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 4 个，`ohos_source_set` 1 个，`ohos_ndk_library` 1 个。

## 依赖与协作边界

该部件声明 13 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `config_policy`, `c_utils`, `frame_aware_sched`, `hilog`, `hitrace`, `init`, `ipc`, `libxml2`, `safwk`, `samgr`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 22 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_unittest` 10 个，`ohos_fuzztest` 8 个，`group` 4 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/resourceschedule/qos_manager/bundle.json](../../../../../../foundation/resourceschedule/qos_manager/bundle.json)
- 原始源码 README：[foundation/resourceschedule/qos_manager/README_zh.md](../../../../../../foundation/resourceschedule/qos_manager/README_zh.md)、[foundation/resourceschedule/qos_manager/README.md](../../../../../../foundation/resourceschedule/qos_manager/README.md)、[foundation/resourceschedule/qos_manager/README.en.md](../../../../../../foundation/resourceschedule/qos_manager/README.en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
