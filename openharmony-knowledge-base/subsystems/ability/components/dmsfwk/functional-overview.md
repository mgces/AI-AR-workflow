# dmsfwk 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

distributed ability manager service

源码 README 补充说明：

> 分布式组件管理部件模块负责跨设备组件管理，提供访问和控制远程组件的能力，支持分布式场景下的应用协同。主要功能如下： 远程启动元能力：跨设备拉起远端设备上的指定元能力，并支持含界面元能力结束时回传数据。 远程迁移元能力：将元能力跨设备迁移到远端设备。 远程绑定元能力：跨设备绑定远端设备上的指定元能力。 远程Call调用：获取远端指定通用组件的Caller通信接口，进行跨设备调用指定通用组件。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `ability` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/ability/dmsfwk` |

## 核心能力

- **Distributed Sched App Collaboration**：提供“distributed sched app collaboration”能力，系统能力标识为 `SystemCapability.DistributedSched.AppCollaboration`。
- **Ability Distributed Ability Manager**：提供“ability distributed ability manager”能力，系统能力标识为 `SystemCapability.Ability.DistributedAbilityManager`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `dmsfwk_feature_coverage`：dmsfwk 功能 覆盖率。
- `dmsfwk_standard_form_share`：dmsfwk standard form share。
- `dmsfwk_mission_manager`：dmsfwk mission manager。
- `dmsfwk_report_memmgr`：dmsfwk report memmgr。
- `dmsfwk_report_memmgr_plugins`：dmsfwk report memmgr plugins。
- `dmsfwk_softbus_adapter_common`：dmsfwk softbus adapter common。
- `dmsfwk_service_disable`：dmsfwk service disable。
- `dmsfwk_disable_distributedsched_service`：dmsfwk disable distributedsched service。
- `dmsfwk_check_bt`：dmsfwk check bt。
- `dmsfwk_check_wifi`：dmsfwk check wifi。
- `dmsfwk_recv_broadcast`：dmsfwk recv broadcast。
- `dmsfwk_use_screenlock_icon_holdon`：dmsfwk use screenlock icon holdon。
- `dmsfwk_sync_data_on_package_event`：dmsfwk sync data on package event。
- `dmsfwk_all_connect`：dmsfwk all connect。
- `dmsfwk_feature_dams_enable`：dmsfwk 功能 dams 启用。
- `dmsfwk_continuation_recommend_installation`：dmsfwk continuation recommend installation。
- `dmsfwk_enable_enterprise_device_management`：dmsfwk 启用 enterprise device management。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/ability/dmsfwk/services](../../../../../../foundation/ability/dmsfwk/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 106 | `dtbabilitymgr`, `dtbcollabmgr`, `dtbschedmgr` |
| [foundation/ability/dmsfwk/interfaces](../../../../../../foundation/ability/dmsfwk/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 34 | `innerkits`, `kits`, `taihe` |
| [foundation/ability/dmsfwk/frameworks](../../../../../../foundation/ability/dmsfwk/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 26 | `js`, `native` |
| [foundation/ability/dmsfwk/common](../../../../../../foundation/ability/dmsfwk/common) | 组件内部共享的公共定义、工具和基础实现。 | 3 | `include`, `src` |
| [foundation/ability/dmsfwk/etc](../../../../../../foundation/ability/dmsfwk/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 3 | `init`, `profile` |
| [foundation/ability/dmsfwk/sa_profile](../../../../../../foundation/ability/dmsfwk/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/ability/dmsfwk/reference](../../../../../../foundation/ability/dmsfwk/reference) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 6 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/ability/dmsfwk/interfaces/taihe/etsContinueManager:continueManager_target` | `//foundation/ability/dmsfwk/interfaces/taihe/etsContinueManager/include` | `ani_continue_manager_stub.h`, `ani_continue_manager.h` |
| `//foundation/ability/dmsfwk/interfaces/innerkits/continuation_manager:continuation_manager` | `//foundation/ability/dmsfwk/interfaces/innerkits/continuation_manager/include` | `continuation_extra_params.h`, `continuation_mode.h`, `continuation_result.h`, `device_selection_notifier_stub.h`, `idevice_selection_notifier.h` |
| `//foundation/ability/dmsfwk/interfaces/innerkits/common:common_sdk` | `//foundation/ability/dmsfwk/interfaces/innerkits/common/include` | `distributed_ability_manager_client.h`, `dms_constant.h` |
| `//foundation/ability/dmsfwk/services/dtbcollabmgr/src/ability_connection_manager:distributed_ability_connection_manager` | `//foundation/ability/dmsfwk/services/dtbcollabmgr/include/ability_connection_manager` | - |
| `//foundation/ability/dmsfwk/services/dtbcollabmgr/src/channel_manager:dtbcollab_channel_manager` | `//foundation/ability/dmsfwk/services/dtbcollabmgr/include/channel_manager` | `av_trans_data_buffer.h` |
| `//foundation/ability/dmsfwk/interfaces/innerkits/distributed_event:distributed_sdk` | `//foundation/ability/dmsfwk/interfaces/innerkits` | `./common/include/distributed_sched_types.h`, `./distributed_event/include/distributed_event_listener.h`, `./distributed_event/include/distributed_parcel_helper.h`, `./distributed_event/include/dms_client.h`, `./distributed_event/include/dms_handler.h`, `./distributed_event/include/dms_listener_stub.h`, `./distributed_event/include/dms_sa_client.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `ability` | [distributedsched](../../processes/distributedsched/foundation-runtime.md) | 启动配置, SA 实现 | `1401` | `libdistributedschedsvr.z.so` |
| `systemabilitymgr` | [foundation](../../../systemabilitymgr/processes/foundation/foundation-runtime.md) | SA 实现 | `1404` | `libdistributed_ability_manager_svr.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/ability/dmsfwk/sa_profile:dms_sa_profile` | [foundation/ability/dmsfwk/sa_profile/BUILD.gn](../../../../../../foundation/ability/dmsfwk/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 18 个，`ohos_static_library` 2 个，`ohos_source_set` 2 个，`taihe_shared_library` 2 个。

## 依赖与协作边界

该部件声明 56 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `av_codec`, `background_task_mgr`, `bluetooth`, `bundle_framework`, `cJSON`, `c_utils`, `common_event_service`, `config_policy`, `device_auth`, `device_info_manager`, `device_security_level`, `device_manager`, `distributed_bundle_framework`, `dmsfwk`, `dsoftbus`, `data_share`, `ets_frontend`, `eventhandler`, `enterprise_device_management`, `ffrt`, `form_fwk`, `graphic_2d`, `graphic_surface`, `hisysevent`, `hitrace`, `hilog`, `image_framework`, `init`, `input`, `ipc`, `json`, `kv_store`, `libuv`, `memmgr`, `media_foundation`, `napi`, `node`, `openssl`, `os_account`, `resource_management`, `resource_schedule_service`, `runtime_core`, `safwk`, `samgr`, `screenlock_mgr`, `video_processing_engine`, `window_manager`, `wifi`, `storage_service`, `distributed_notification_service`, `i18n`, `hiappevent`, `taihe_ffi_gen`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 156 个测试目标，bundle 声明 9 个测试入口。

主要测试形态：`ohos_unittest` 81 个，`ohos_fuzztest` 40 个，`group` 33 个，`ohos_executable` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/ability/dmsfwk/bundle.json](../../../../../../foundation/ability/dmsfwk/bundle.json)
- 原始源码 README：[foundation/ability/dmsfwk/README_zh.md](../../../../../../foundation/ability/dmsfwk/README_zh.md)、[foundation/ability/dmsfwk/README.md](../../../../../../foundation/ability/dmsfwk/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
