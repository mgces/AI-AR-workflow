# resource_schedule_service 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

资源调度服务 - 简介 - 目录 - 如何编写一个插件 - 接口说明 - 使用说明 - 插件事件处理约束 - 分组策略 - 基础分组策略 - 策略配置 - 配置约束 - 统一调频 - 调频接口说明 - 调频配置说明 - 调频使用举例 - 相关仓 在资源调度子系统中，提供系统事件的感知以及分发，例如应用启动、退出、亮灭屏等。如果需要获取系统事件，并且进行相关资源调度，那么可以选择以插件形式加入资源调度服务中。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `resourceschedule` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2048KB / 10240KB |
| 源码仓 | `foundation/resourceschedule/resource_schedule_service` |

## 核心能力

- **Resourceschedule Background Process Manager**：提供“re媒体源schedule background process manager”能力，系统能力标识为 `SystemCapability.Resourceschedule.BackgroundProcessManager`。
- **Resource Schedule System Load**：提供“re媒体源 schedule system load”能力，系统能力标识为 `SystemCapability.ResourceSchedule.SystemLoad`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `resource_schedule_service_with_ffrt_enable`：re媒体源 schedule service with ffrt 启用。
- `resource_schedule_service_with_ext_res_enable`：re媒体源 schedule service with ext res 启用。
- `resource_schedule_service_crown_power_key_enable`：re媒体源 schedule service crown 电源协同 key 启用。
- `resource_schedule_service_socperf_executor_enable`：re媒体源 schedule service socperf executor 启用。
- `resource_schedule_service_with_app_nap_enable`：re媒体源 schedule service with app nap 启用。
- `resource_schedule_service_cust_soc_perf_enable`：re媒体源 schedule service cust soc perf 启用。
- `resource_schedule_service_file_copy_soc_perf_enable`：re媒体源 schedule service file copy soc perf 启用。
- `resource_schedule_service_subscribe_click_recognize_enable`：re媒体源 schedule service subscribe click recognize 启用。
- `resource_schedule_service_system_load_level_debug_feature_enable_for_2d`：re媒体源 schedule service system load level debug 功能 启用 for 2d。
- `resource_schedule_service_has_sys_nice_enable`：re媒体源 schedule service has sys nice 启用。
- `resource_schedule_service_depend_wm_enable`：re媒体源 schedule service depend wm 启用。
- `resource_schedule_service_forkall_plugin_enable`：re媒体源 schedule service forkall plugin 启用。
- `resource_schedule_service_distributed_continuation_enable`：re媒体源 schedule service distributed continuation 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/resourceschedule/resource_schedule_service/ressched](../../../../../../foundation/resourceschedule/resource_schedule_service/ressched) | 任务、资源或服务调度策略实现。 | 110 | `common`, `etc`, `interfaces`, `plugins`, `profile`, `sa_profile`, `scene_recognize`, `sched_controller` |
| [foundation/resourceschedule/resource_schedule_service/ressched_executor](../../../../../../foundation/resourceschedule/resource_schedule_service/ressched_executor) | 任务、资源或服务调度策略实现。 | 20 | `common`, `etc`, `interfaces`, `plugins`, `sa_profile`, `services` |

## 对外与内部接口

该部件声明 10 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/resourceschedule/resource_schedule_service/ressched/interfaces/innerkits/ressched_client:ressched_client` | `//foundation/resourceschedule/resource_schedule_service/ressched/interfaces/innerkits/ressched_client/include` | `res_sa_init.h`, `res_sched_client.h`, `res_sched_errors.h`, `res_type.h`, `res_sched_ipc_interface_code.h`, `res_sched_kill_reason.h`, `res_sched_systemload_notifier_client.h` |
| `//foundation/resourceschedule/resource_schedule_service/ressched/services:resschedsvc` | `//foundation/resourceschedule/resource_schedule_service/ressched/services/resschedmgr/pluginbase/include` | `config_info.h`, `plugin.h`, `res_data.h` |
| `//foundation/resourceschedule/resource_schedule_service/ressched/services:resschedsvc_static` | `//foundation/resourceschedule/resource_schedule_service/ressched/services/resschedmgr/pluginbase/include` | `config_info.h`, `plugin.h`, `res_data.h` |
| `//foundation/resourceschedule/resource_schedule_service/ressched_executor/interfaces/innerkits/ressched_executor_client:resschedexe_client` | `//foundation/resourceschedule/resource_schedule_service/ressched_executor/interfaces/innerkits/ressched_executor_client/include` | `res_sched_exe_client.h`, `res_sched_exe_constants.h`, `res_exe_type.h` |
| `//foundation/resourceschedule/resource_schedule_service/ressched_executor/services:resschedexesvc` | `//foundation/resourceschedule/resource_schedule_service/ressched/services/resschedmgr/pluginbase/include` | `config_info.h`, `plugin.h`, `res_data.h` |
| `//foundation/resourceschedule/resource_schedule_service/ressched_executor/services:resschedexesvc_static` | `//foundation/resourceschedule/resource_schedule_service/ressched/services/resschedmgr/pluginbase/include` | `config_info.h`, `plugin.h`, `res_data.h` |
| `//foundation/resourceschedule/resource_schedule_service/ressched/plugins/cgroup_sched_plugin/framework:cgroup_sched` | `//foundation/resourceschedule/resource_schedule_service/ressched/plugins/cgroup_sched_plugin/framework/sched_controller/include` | `cgroup_adjuster.h`, `cgroup_event_handler.h`, `sched_controller.h`, `supervisor.h` |
| `//foundation/resourceschedule/resource_schedule_service/ressched/plugins/cgroup_sched_plugin/framework/process_group:libprocess_group` | `//foundation/resourceschedule/resource_schedule_service/ressched/plugins/cgroup_sched_plugin/framework/process_group/include` | `sched_policy.h` |
| `//foundation/resourceschedule/resource_schedule_service/ressched/common:ressched_common_utils` | `//foundation/resourceschedule/resource_schedule_service/ressched/common/include` | `ioobe_task.h`, `oobe_datashare_utils.h`, `oobe_manager.h` |
| `//foundation/resourceschedule/resource_schedule_service/ressched/interfaces/kits/ets/taihe/systemload:systemload_taihe` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `resourceschedule` | [pin_auth_host](../../processes/pin_auth_host/foundation-runtime.md) | 启动配置 | - | - |
| `resourceschedule` | [resource_schedule_executor](../../processes/resource_schedule_executor/foundation-runtime.md) | 启动配置, SA 实现 | `1918` | `libresschedexesvc.z.so` |
| `resourceschedule` | [resource_schedule_service](../../processes/resource_schedule_service/foundation-runtime.md) | 启动配置, SA 实现 | `1901` | `libresschedsvc.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/resourceschedule/resource_schedule_service/ressched_executor/sa_profile:resschedexe_sa_profile` | [foundation/resourceschedule/resource_schedule_service/ressched_executor/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/resource_schedule_service/ressched_executor/sa_profile/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/resourceschedule/resource_schedule_service/ressched/sa_profile:ressched_sa_profile` | [foundation/resourceschedule/resource_schedule_service/ressched/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/resource_schedule_service/ressched/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 14 个，`ohos_static_library` 6 个，`ohos_source_set` 4 个，`taihe_shared_library` 2 个。

## 依赖与协作边界

该部件声明 41 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `audio_framework`, `av_session`, `background_task_mgr`, `bluetooth`, `bundle_framework`, `c_utils`, `cJSON`, `common_event_service`, `config_policy`, `core_service`, `data_share`, `device_standby`, `eventhandler`, `ffrt`, `frame_aware_sched`, `hilog`, `hisysevent`, `hitrace`, `init`, `idl_tool`, `ipc`, `napi`, `netmanager_base`, `input`, `os_account`, `request`, `samgr`, `safwk`, `selinux_adapter`, `soc_perf`, `state_registry`, `window_manager`, `power_manager`, `json`, `libxml2`, `jsoncpp`, `runtime_core`, `ets_frontend`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 55 个测试目标，bundle 声明 15 个测试入口。

主要测试形态：`ohos_unittest` 23 个，`group` 22 个，`ohos_fuzztest` 8 个，`ohos_js_unittest` 1 个，`ohos_executable` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/resourceschedule/resource_schedule_service/bundle.json](../../../../../../foundation/resourceschedule/resource_schedule_service/bundle.json)
- 原始源码 README：[foundation/resourceschedule/resource_schedule_service/README_ZH.md](../../../../../../foundation/resourceschedule/resource_schedule_service/README_ZH.md)、[foundation/resourceschedule/resource_schedule_service/README.md](../../../../../../foundation/resourceschedule/resource_schedule_service/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
