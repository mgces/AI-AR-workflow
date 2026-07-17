# soc_perf 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

SOC统一调频部件是资源调度子系统中的部件之一，资源调度子系统提供系统事件的感知以及分发，例如应用启动、退出、亮灭屏等。详情可参考资源调度服务。 SOC统一调频服务作为资源调度子系统的子模块，主要功能是从SOC统一调频插件中接收调频事件，进行相关的调频仲裁，最终使用内核接口设置CPU频率策略。其架构图示如下：

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `resourceschedule` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2048KB / 10240KB |
| 源码仓 | `foundation/resourceschedule/soc_perf` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `soc_perf_device_enable`：soc perf device 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/resourceschedule/soc_perf/interfaces](../../../../../../foundation/resourceschedule/soc_perf/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 4 | `inner_api` |
| [foundation/resourceschedule/soc_perf/profile](../../../../../../foundation/resourceschedule/soc_perf/profile) | 组件注册、系统能力或产品装配配置。 | 3 | - |
| [foundation/resourceschedule/soc_perf/services](../../../../../../foundation/resourceschedule/soc_perf/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 3 | `core`, `dfx`, `server` |
| [foundation/resourceschedule/soc_perf/sa_profile](../../../../../../foundation/resourceschedule/soc_perf/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/resourceschedule/soc_perf/common](../../../../../../foundation/resourceschedule/soc_perf/common) | 组件内部共享的公共定义、工具和基础实现。 | 0 | `include` |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client:socperf_client` | `//foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client/include` | `socperf_action_type.h`, `socperf_client.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `resourceschedule` | [resource_schedule_service](../../processes/resource_schedule_service/foundation-runtime.md) | SA 实现 | `1906` | `libsocperf_server.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/resourceschedule/soc_perf/sa_profile:socperf_sa_profile` | [foundation/resourceschedule/soc_perf/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/resourceschedule/soc_perf/services:socperf_server` | [foundation/resourceschedule/soc_perf/services/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/services/BUILD.gn) |
| `ohos_static_library` | `//foundation/resourceschedule/soc_perf/services:socperf_server_static` | [foundation/resourceschedule/soc_perf/services/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/services/BUILD.gn) |

生产库形态：`ohos_shared_library` 2 个，`ohos_source_set` 1 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 17 个组件依赖和 0 个三方依赖。

- 系统组件协作：`access_token`, `cJSON`, `c_utils`, `config_policy`, `eventhandler`, `ffrt`, `hitrace`, `hilog`, `ipc`, `init`, `safwk`, `samgr`, `selinux_adapter`, `hisysevent`, `libxml2`, `resource_schedule_service`, `json`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 37 个测试目标，bundle 声明 3 个测试入口。

主要测试形态：`group` 17 个，`ohos_fuzztest` 14 个，`ohos_unittest` 5 个，`ohos_executable` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/resourceschedule/soc_perf/bundle.json](../../../../../../foundation/resourceschedule/soc_perf/bundle.json)
- 原始源码 README：[foundation/resourceschedule/soc_perf/README_ZH.md](../../../../../../foundation/resourceschedule/soc_perf/README_ZH.md)、[foundation/resourceschedule/soc_perf/README.md](../../../../../../foundation/resourceschedule/soc_perf/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
