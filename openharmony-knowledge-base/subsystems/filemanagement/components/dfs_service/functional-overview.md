# dfs_service 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The dfs_service module belongs to the filemanagement subsystem of OpenHarmony. It provides the ability of accessing distributed files.

源码 README 补充说明：

> 分布式文件服务提供跨设备的、符合POSIX规范的文件访问能力。其在分布式软总线动态组网的基础上，为网络上各个设备结点提供一个统一的、逻辑的、树形的文件系统层次结构。 distributed_file_daemon：分布式文件管理常驻用户态服务，负责接入设备组网、数据传输能力，并负责挂载hmdfs。 distributed_file_service：分布式文件访问能力服务，对应用提供分布式扩展能力。 hmdfs(Harmony Distributed File System)：分布式文件系统核心模块，是一种面向移动分布式场景的、高性能的、基于内核实现的、堆叠式文件系统。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `filemanagement` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2048KB / 4096KB |
| 源码仓 | `foundation/filemanagement/dfs_service` |

## 核心能力

- **File Management Distributed File Service Cloud Sync Core**：提供“cloud sync core”能力，系统能力标识为 `SystemCapability.FileManagement.DistributedFileService.CloudSync.Core`。
- **File Management Distributed File Service Cloud Sync Manager**：提供“distributed file service cloud sync manager”能力，系统能力标识为 `SystemCapability.FileManagement.DistributedFileService.CloudSyncManager`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `dfs_service_feature_enable_cloud_adapter`：dfs service 功能 启用 cloud adapter。
- `dfs_service_feature_enable_cloud_disk`：dfs service 功能 启用 cloud disk。
- `dfs_service_feature_enable_dist_file_daemon`：dfs service 功能 启用 dist file daemon。
- `dfs_service_feature_enable_distributed_ability`：dfs service 功能 启用 distributed ability。
- `dfs_service_feature_enable_watch_lite_device`：dfs service 功能 启用 watch lite device。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/filemanagement/dfs_service/services](../../../../../../foundation/filemanagement/dfs_service/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 80 | `clouddisk_database`, `clouddiskservice`, `cloudfiledaemon`, `cloudsyncservice`, `distributedfiledaemon` |
| [foundation/filemanagement/dfs_service/interfaces](../../../../../../foundation/filemanagement/dfs_service/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 46 | `inner_api`, `kits` |
| [foundation/filemanagement/dfs_service/utils](../../../../../../foundation/filemanagement/dfs_service/utils) | 跨模块复用的基础工具和通用数据结构。 | 13 | `cloud_disk`, `clouddiskservice`, `decompress`, `dentry`, `dfx`, `ffrt`, `inner_api`, `ioctl` |
| [foundation/filemanagement/dfs_service/adapter](../../../../../../foundation/filemanagement/dfs_service/adapter) | 平台、硬件、协议或不同系统形态之间的适配层。 | 4 | `cloud_adapter_example` |
| [foundation/filemanagement/dfs_service/dfs_utils](../../../../../../foundation/filemanagement/dfs_service/dfs_utils) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 3 | `include`, `src` |
| [foundation/filemanagement/dfs_service/frameworks](../../../../../../foundation/filemanagement/dfs_service/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 0 | `native` |

## 对外与内部接口

该部件声明 13 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/cloudsync_kit_inner:cloudsync_kit_inner` | `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/cloudsync_kit_inner` | `cloud_sync_callback.h`, `cloud_sync_manager.h`, `i_cloud_sync_callback.h`, `svc_death_recipient.h`, `cloud_sync_constants.h`, `cloud_sync_common.h`, `cloud_upload_callback.h`, `i_cloud_upload_callback.h` |
| `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/clouddiskservice_kit_inner:clouddiskservice_kit_inner` | `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/clouddiskservice_kit_inner` | `cloud_disk_common.h`, `cloud_disk_service_callback.h`, `cloud_disk_service_manager.h`, `i_cloud_disk_service_callback.h`, `svc_death_recipient.h` |
| `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/cloudsync_kit_inner:cloudsync_asset_kit_inner` | `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/cloudsync_kit_inner` | `cloud_sync_asset_manager.h` |
| `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/cloud_daemon_kit_inner:cloud_daemon_kit_inner` | `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/cloud_daemon_kit_inner` | `cloud_daemon_manager.h`, `i_cloud_daemon.h`, `svc_death_recipient.h` |
| `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/cloud_file_kit_inner:cloudfile_kit` | `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/cloud_file_kit_inner` | - |
| `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/cloud_file_kit_inner:cloudfile_kit_core` | `//foundation/filemanagement/dfs_service/interfaces/inner_api/native/cloud_file_kit_inner` | - |
| `//foundation/filemanagement/dfs_service/interfaces/kits/ndk/clouddiskmanager/src:ohclouddiskmanager` | `//foundation/filemanagement/dfs_service/interfaces/kits/ndk/clouddiskmanager/include` | `oh_cloud_disk_manager.h` |
| `//foundation/filemanagement/dfs_service/services/clouddisk_database:clouddisk_database` | `//foundation/filemanagement/dfs_service/services/clouddisk_database/include` | - |
| `//foundation/filemanagement/dfs_service/utils:libdistributedfiledentry` | `//foundation/filemanagement/dfs_service/utils/inner_api` | - |
| `//foundation/filemanagement/dfs_service/utils:libdistributedfileutils` | `//foundation/filemanagement/dfs_service/utils/inner_api` | - |
| `//foundation/filemanagement/dfs_service/utils:libdistributedfileutils_lite` | `//foundation/filemanagement/dfs_service/utils/inner_api` | - |
| `//foundation/filemanagement/dfs_service/services/distributedfiledaemon:distributed_file_daemon_kit_inner` | `//foundation/filemanagement/dfs_service/services/distributedfiledaemon/include/ipc` | `distributed_file_daemon_manager.h`, `i_daemon.h` |
| `//foundation/filemanagement/dfs_service/utils:libdecompress` | `//foundation/filemanagement/dfs_service/utils/decompress/include` | `decompress.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `filemanagement` | [clouddiskservice](../../processes/clouddiskservice/foundation-runtime.md) | 启动配置, SA 实现 | `5207` | `libclouddiskservice_sa.z.so` |
| `filemanagement` | [cloudfiledaemon](../../processes/cloudfiledaemon/foundation-runtime.md) | 启动配置, SA 实现 | `5205` | `libcloudfiledaemon.z.so` |
| `filemanagement` | [cloudfileservice](../../processes/cloudfileservice/foundation-runtime.md) | 启动配置, SA 实现 | `5204` | `libcloudsync_sa.z.so` |
| `filemanagement` | [distributedfiledaemon](../../processes/distributedfiledaemon/foundation-runtime.md) | 启动配置, SA 实现 | `5201` | `libdistributedfiledaemon.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/filemanagement/dfs_service/services:distributedfile_sa_profile` | [foundation/filemanagement/dfs_service/services/BUILD.gn](../../../../../../foundation/filemanagement/dfs_service/services/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/filemanagement/dfs_service/services:clouddiskservice_sa_profile` | [foundation/filemanagement/dfs_service/services/BUILD.gn](../../../../../../foundation/filemanagement/dfs_service/services/BUILD.gn) |
| `ohos_shared_library` | `//foundation/filemanagement/dfs_service/services/distributedfiledaemon:distributed_file_daemon_kit_inner` | [foundation/filemanagement/dfs_service/services/distributedfiledaemon/BUILD.gn](../../../../../../foundation/filemanagement/dfs_service/services/distributedfiledaemon/BUILD.gn) |

生产库形态：`ohos_shared_library` 24 个，`ohos_static_library` 11 个，`ohos_source_set` 2 个，`ohos_ndk_library` 1 个。

## 依赖与协作边界

该部件声明 46 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `app_file_service`, `api_metrics`, `battery_manager`, `bundle_framework`, `c_utils`, `cJSON`, `common_event_service`, `dataclassification`, `data_share`, `device_auth`, `device_info_manager`, `device_manager`, `distributed_notification_service`, `dsoftbus`, `e2fsprogs`, `eventhandler`, `ffrt`, `file_api`, `hicollie`, `hilog`, `hisysevent`, `hitrace`, `i18n`, `init`, `ipc`, `json`, `libuv`, `napi`, `preferences`, `memmgr`, `netmanager_base`, `relational_store`, `runtime_core`, `safwk`, `storage_service`, `samgr`, `selinux_adapter`, `thermal_manager`, `os_account`, `power_manager`, `libfuse`, `zlib`, `user_file_service`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 316 个测试目标，bundle 声明 4 个测试入口。

主要测试形态：`ohos_unittest` 197 个，`group` 78 个，`ohos_fuzztest` 40 个，`ohos_moduletest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/filemanagement/dfs_service/bundle.json](../../../../../../foundation/filemanagement/dfs_service/bundle.json)
- 原始源码 README：[foundation/filemanagement/dfs_service/README_zh.md](../../../../../../foundation/filemanagement/dfs_service/README_zh.md)、[foundation/filemanagement/dfs_service/README.md](../../../../../../foundation/filemanagement/dfs_service/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
