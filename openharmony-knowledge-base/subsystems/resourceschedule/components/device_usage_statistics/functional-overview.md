# device_usage_statistics 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

设备使用信息统计，包括app usage/notification usage/system usage等使用统计。例如应用使用信息统计，用于保存和查询应用使用详情（app usage）、事件日志数据（event log）、应用分组（bundle group）情况。 部件缓存的应用记录（使用历史统计和使用事件记录）会在事件上报后30分钟内刷新到数据库持久化保存。 设备使用信息统计接口，包括app usage/notification usage/system usage等接口，以app usage接口为例，对外提供主要接口如下。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `resourceschedule` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 11264KB / 10240KB |
| 源码仓 | `foundation/resourceschedule/device_usage_statistics` |

## 核心能力

- **Resource Schedule Usage Statistics App Group**：提供“usage statistics app group”能力，系统能力标识为 `SystemCapability.ResourceSchedule.UsageStatistics.AppGroup`。
- **Resource Schedule Usage Statistics App**：提供“usage statistics app”能力，系统能力标识为 `SystemCapability.ResourceSchedule.UsageStatistics.App`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `device_usage_statistics_device_enable`：device usage statistics device 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/resourceschedule/device_usage_statistics/interfaces](../../../../../../foundation/resourceschedule/device_usage_statistics/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 8 | `innerkits`, `kits` |
| [foundation/resourceschedule/device_usage_statistics/sa_profile](../../../../../../foundation/resourceschedule/device_usage_statistics/sa_profile) | System Ability 注册信息及进程装载配置。 | 2 | - |
| [foundation/resourceschedule/device_usage_statistics/tools](../../../../../../foundation/resourceschedule/device_usage_statistics/tools) | 开发、诊断、命令行或构建辅助工具。 | 1 | `ohos-usageStatsQuery` |
| [foundation/resourceschedule/device_usage_statistics/frameworks](../../../../../../foundation/resourceschedule/device_usage_statistics/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 0 | `src` |
| [foundation/resourceschedule/device_usage_statistics/init](../../../../../../foundation/resourceschedule/device_usage_statistics/init) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/resourceschedule/device_usage_statistics/services](../../../../../../foundation/resourceschedule/device_usage_statistics/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 0 | `common`, `packagegroup`, `packageusage` |
| [foundation/resourceschedule/device_usage_statistics/utils](../../../../../../foundation/resourceschedule/device_usage_statistics/utils) | 跨模块复用的基础工具和通用数据结构。 | 0 | `include`, `src` |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/resourceschedule/device_usage_statistics:usagestatsinner` | `//foundation/resourceschedule/device_usage_statistics/interfaces/innerkits/include` | `bundle_active_client.h`, `bundle_active_event.h`, `bundle_active_event_stats.h`, `bundle_active_form_record.h`, `bundle_active_group_map.h`, `bundle_active_module_record.h`, `bundle_active_package_stats.h`, `bundle_active_high_frequency_period.h` |
| `//foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics:usageStatistics_taihe` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `resourceschedule` | [device_usage_stats_service](../../processes/device_usage_stats_service/foundation-runtime.md) | 启动配置 | - | - |
| `resourceschedule` | [resource_schedule_service](../../processes/resource_schedule_service/foundation-runtime.md) | SA 实现 | `1907` | `libusagestatservice.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/resourceschedule/device_usage_statistics:device_usage_statistics_sa_profile` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/resourceschedule/device_usage_statistics/sa_profile:usagestat_sa_profile` | [foundation/resourceschedule/device_usage_statistics/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/sa_profile/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/resourceschedule/device_usage_statistics/tools/ohos-usageStatsQuery:ohos-usageStatsQuery` | [foundation/resourceschedule/device_usage_statistics/tools/ohos-usageStatsQuery/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/tools/ohos-usageStatsQuery/BUILD.gn) |

生产库形态：`ohos_shared_library` 5 个，`ohos_static_library` 2 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 24 个组件依赖和 0 个三方依赖。

- 系统组件协作：`relational_store`, `runtime_core`, `safwk`, `config_policy`, `os_account`, `ipc`, `access_token`, `ability_runtime`, `hicollie`, `hilog`, `samgr`, `c_utils`, `cJSON`, `napi`, `background_task_mgr`, `power_manager`, `selinux_adapter`, `time_service`, `init`, `ffrt`, `hisysevent`, `hitrace`, `window_manager`, `ets_frontend`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 31 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`group` 13 个，`ohos_fuzztest` 10 个，`ohos_unittest` 7 个，`ohos_js_unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/resourceschedule/device_usage_statistics/bundle.json](../../../../../../foundation/resourceschedule/device_usage_statistics/bundle.json)
- 原始源码 README：[foundation/resourceschedule/device_usage_statistics/README_zh.md](../../../../../../foundation/resourceschedule/device_usage_statistics/README_zh.md)、[foundation/resourceschedule/device_usage_statistics/README.md](../../../../../../foundation/resourceschedule/device_usage_statistics/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
