# device_standby 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

为提高设备续航，降低设备功耗，在设备进入待机空闲状态时，系统会限制后台应用使用资源。开发者可以根据自身情况，为自己的应用申请纳入待机资源管控，或者暂时不被待机资源管控。 \|子模块名称 \|功能职责描述 \| \|------------\|---------------\| \|interface \|1.对外提供inner级别dump维测、豁免、通知接口。 \| \| \|2.提供约束接口。 \| \|sa_profile \|在服务管理中配置standby服务。\| \|services \|1.内部核心服务功能实现。 \| \| \|2.通知、查询功能。 \| \|plugins \|1.状态监控。 \| \| \|2.决策是否限制设备应用资源。\| \| \|3.转换设备状态。 \| \| \|4.执行策略。\| \|utils \|1.通用工具、日志实现。\| \| \|2.相关配置读写。 \| \|frameworks \|配置对外接口框架能力。\|

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `resourceschedule` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2048KB / 10240KB |
| 源码仓 | `foundation/resourceschedule/device_standby` |

## 核心能力

- **Resource Schedule Device Standby**：提供“re媒体源 schedule device standby”能力，系统能力标识为 `SystemCapability.ResourceSchedule.DeviceStandby`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `device_standby_plugin_enable`：device standby plugin 启用。
- `device_standby_realtime_timer_enable`：device standby realtime timer 启用。
- `device_standby_firewall_timer_no_wakeup`：device standby firewall timer no wakeup。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/resourceschedule/device_standby/interfaces](../../../../../../foundation/resourceschedule/device_standby/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 16 | `innerkits`, `kits` |
| [foundation/resourceschedule/device_standby/services](../../../../../../foundation/resourceschedule/device_standby/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 12 | `common`, `core`, `notification` |
| [foundation/resourceschedule/device_standby/plugins](../../../../../../foundation/resourceschedule/device_standby/plugins) | 可插拔能力实现，由框架或服务在运行时选择和装载。 | 11 | `ext`, `extend_constraints`, `message_listener`, `standby_state`, `strategy` |
| [foundation/resourceschedule/device_standby/utils](../../../../../../foundation/resourceschedule/device_standby/utils) | 跨模块复用的基础工具和通用数据结构。 | 11 | `common`, `policy` |
| [foundation/resourceschedule/device_standby/frameworks](../../../../../../foundation/resourceschedule/device_standby/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 2 | `include`, `src` |
| [foundation/resourceschedule/device_standby/sa_profile](../../../../../../foundation/resourceschedule/device_standby/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |

## 对外与内部接口

该部件声明 5 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/resourceschedule/device_standby/interfaces/innerkits:standby_innerkits` | `//foundation/resourceschedule/device_standby/interfaces/innerkits/include` | `allow_info.h`, `allow_type.h`, `resource_request.h`, `standby_service_client.h`, `standby_service_subscriber_stub.h`, `standby_state.h` |
| `//foundation/resourceschedule/device_standby/services:standby_service` | `//foundation/resourceschedule/device_standby/services` | `common/include/background_task_helper.h`, `common/include/device_standby_switch.h`, `common/include/time_provider.h`, `common/include/timed_task.h`, `core/include/ability_manager_helper.h`, `core/include/allow_record.h`, `core/include/app_mgr_helper.h`, `core/include/app_state_observer.h` 等 13 个 |
| `//foundation/resourceschedule/device_standby/utils/common:standby_utils_common` | `//foundation/resourceschedule/device_standby/utils/common/include` | `common_constant.h`, `ipc_util.h`, `standby_service_errors.h`, `standby_service_log.h` |
| `//foundation/resourceschedule/device_standby/utils/policy:standby_utils_policy` | `//foundation/resourceschedule/device_standby/utils/policy/include` | `json_utils.h`, `standby_config_manager.h` |
| `//foundation/resourceschedule/device_standby/plugins:standby_plugin` | `//foundation/resourceschedule/device_standby/plugins` | `ext/include/base_state.h`, `ext/include/ibase_strategy.h`, `ext/include/iconstraint_manager_adapter.h`, `ext/include/iconstraint_monitor.h`, `ext/include/ilistener_manager_adapter.h`, `ext/include/imessage_listener.h`, `ext/include/istate_manager_adapter.h`, `ext/include/istrategy_manager_adapter.h` 等 22 个 |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `resourceschedule` | [resource_schedule_service](../../processes/resource_schedule_service/foundation-runtime.md) | SA 实现 | `1914` | `libstandby_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/resourceschedule/device_standby/sa_profile:device_standby_sa_profile` | [foundation/resourceschedule/device_standby/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/resourceschedule/device_standby/services:standby_service` | [foundation/resourceschedule/device_standby/services/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/BUILD.gn) |
| `ohos_static_library` | `//foundation/resourceschedule/device_standby/services:standby_service_static` | [foundation/resourceschedule/device_standby/services/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/BUILD.gn) |

生产库形态：`ohos_shared_library` 7 个，`ohos_static_library` 3 个，`ohos_source_set` 1 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 29 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `background_task_mgr`, `battery_manager`, `bundle_framework`, `call_manager`, `common_event_service`, `config_policy`, `c_utils`, `eventhandler`, `hicollie`, `hilog`, `hitrace`, `idl_tool`, `init`, `ipc`, `input`, `napi`, `netmanager_base`, `power_manager`, `runtime_core`, `safwk`, `samgr`, `sensor`, `time_service`, `work_scheduler`, `json`, `resource_schedule_service`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 22 个测试目标，bundle 声明 6 个测试入口。

主要测试形态：`ohos_unittest` 10 个，`group` 9 个，`ohos_fuzztest` 3 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/resourceschedule/device_standby/bundle.json](../../../../../../foundation/resourceschedule/device_standby/bundle.json)
- 原始源码 README：[foundation/resourceschedule/device_standby/README_ZH.md](../../../../../../foundation/resourceschedule/device_standby/README_ZH.md)、[foundation/resourceschedule/device_standby/README.md](../../../../../../foundation/resourceschedule/device_standby/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
