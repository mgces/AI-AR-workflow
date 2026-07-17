# background_task_mgr 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

简介 目录 短时任务 - 接口说明 - 使用说明 - 短时任务使用约束 长时任务 - 接口说明 - 使用说明 - 长时任务使用约束 能效资源 - 接口说明 - 使用说明 - 能效资源使用约束 在资源调度子系统中后台任务管理负责管理后台任务，并提供后台任务的申请、取消和查询等接口。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `resourceschedule` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2048KB / 10240KB |
| 源码仓 | `foundation/resourceschedule/background_task_mgr` |

## 核心能力

- **Resource Schedule Background Task Manager Continuous Task**：提供“background task manager continuous task”能力，系统能力标识为 `SystemCapability.ResourceSchedule.BackgroundTaskManager.ContinuousTask`。
- **Resource Schedule Background Task Manager Transient Task**：提供“background task manager transient task”能力，系统能力标识为 `SystemCapability.ResourceSchedule.BackgroundTaskManager.TransientTask`。
- **Resource Schedule Background Task Manager Efficiency Resources Apply**：提供“background task manager efficiency re媒体源s apply”能力，系统能力标识为 `SystemCapability.ResourceSchedule.BackgroundTaskManager.EfficiencyResourcesApply`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `background_task_mgr_graphics`：background task mgr 图形协同。
- `background_task_mgr_jsstack`：background task mgr jsstack。
- `background_task_mgr_device_enable`：background task mgr device 启用。
- `background_task_mgr_notification_enable`：background task mgr notification 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/resourceschedule/background_task_mgr/interfaces](../../../../../../foundation/resourceschedule/background_task_mgr/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 31 | `innerkits`, `kits` |
| [foundation/resourceschedule/background_task_mgr/services](../../../../../../foundation/resourceschedule/background_task_mgr/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 11 | `common`, `continuous_task`, `core`, `efficiency_resources`, `plugin`, `transient_task` |
| [foundation/resourceschedule/background_task_mgr/resources](../../../../../../foundation/resourceschedule/background_task_mgr/resources) | 运行资源、界面资源或组件随包资源。 | 5 | `AppScope`, `entry`, `signature` |
| [foundation/resourceschedule/background_task_mgr/frameworks](../../../../../../foundation/resourceschedule/background_task_mgr/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 3 | `common`, `include`, `src` |
| [foundation/resourceschedule/background_task_mgr/sa_profile](../../../../../../foundation/resourceschedule/background_task_mgr/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/resourceschedule/background_task_mgr/interfaces/innerkits:bgtaskmgr_innerkits` | `//foundation/resourceschedule/background_task_mgr/interfaces/innerkits/include` | `background_mode.h`, `background_task_mgr_helper.h`, `background_task_subscriber.h`, `continuous_task_callback_info.h`, `continuous_task_param.h`, `delay_suspend_info.h`, `efficiency_resource_info.h`, `expired_callback.h` 等 11 个 |
| `//foundation/resourceschedule/background_task_mgr/interfaces/kits:cj_background_task_mgr_ffi` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `resourceschedule` | [resource_schedule_service](../../processes/resource_schedule_service/foundation-runtime.md) | SA 实现 | `1903` | `libbgtaskmgr_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_hap` | `//foundation/resourceschedule/background_task_mgr/resources:backgroundtaskresources_hap` | [foundation/resourceschedule/background_task_mgr/resources/BUILD.gn](../../../../../../foundation/resourceschedule/background_task_mgr/resources/BUILD.gn) |
| `ohos_app_scope` | `//foundation/resourceschedule/background_task_mgr/resources:backgroundtask_dialog_app_profile` | [foundation/resourceschedule/background_task_mgr/resources/BUILD.gn](../../../../../../foundation/resourceschedule/background_task_mgr/resources/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/resourceschedule/background_task_mgr/sa_profile:bgtaskmgr_sa_profile` | [foundation/resourceschedule/background_task_mgr/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/background_task_mgr/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/resourceschedule/background_task_mgr/services:bgtaskmgr_service` | [foundation/resourceschedule/background_task_mgr/services/BUILD.gn](../../../../../../foundation/resourceschedule/background_task_mgr/services/BUILD.gn) |
| `ohos_static_library` | `//foundation/resourceschedule/background_task_mgr/services:bgtaskmgr_service_static` | [foundation/resourceschedule/background_task_mgr/services/BUILD.gn](../../../../../../foundation/resourceschedule/background_task_mgr/services/BUILD.gn) |

生产库形态：`ohos_shared_library` 6 个，`ohos_source_set` 6 个，`taihe_shared_library` 1 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 32 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `ace_engine`, `audio_framework`, `bundle_framework`, `common_event_service`, `config_policy`, `eventhandler`, `hitrace`, `hilog`, `ipc`, `init`, `napi`, `os_account`, `resource_management`, `resource_schedule_service`, `safwk`, `samgr`, `c_utils`, `distributed_notification_service`, `hicollie`, `hisysevent`, `hiview`, `i18n`, `relational_store`, `icu`, `runtime_core`, `ets_frontend`, `image_framework`, `json`, `taihe_ffi_gen`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 64 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`group` 29 个，`ohos_fuzztest` 21 个，`ohos_unittest` 10 个，`ohos_js_unittest` 3 个，`ohos_systemtest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/resourceschedule/background_task_mgr/bundle.json](../../../../../../foundation/resourceschedule/background_task_mgr/bundle.json)
- 原始源码 README：[foundation/resourceschedule/background_task_mgr/README_ZH.md](../../../../../../foundation/resourceschedule/background_task_mgr/README_ZH.md)、[foundation/resourceschedule/background_task_mgr/README.md](../../../../../../foundation/resourceschedule/background_task_mgr/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
