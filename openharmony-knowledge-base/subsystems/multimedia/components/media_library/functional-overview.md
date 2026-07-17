# media_library 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

provides a set of easy-to-use APIs for getting media file metadata information

源码 README 补充说明：

> **medialibrary\_standard** 仓库提供了一系列易用的接口用于获取媒体文件元数据信息。 MediaLibrary接口暂不对外部应用开放, 仅内部使用。 支持能力列举如下： 查询音频、视频和图片文件元数据信息 查询图片和视频相册 媒体文件操作如创建、重命名、拷贝和删除 相册操作如创建、重命名和删除

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 10444KB / 35093KB |
| 源码仓 | `foundation/multimedia/media_library` |

## 核心能力

- **File Management User File Manager Core**：提供“user file manager core”能力，系统能力标识为 `SystemCapability.FileManagement.UserFileManager.Core`。
- **File Management User File Manager Distributed Core**：提供“user file manager distributed core”能力，系统能力标识为 `SystemCapability.FileManagement.UserFileManager.DistributedCore`。
- **File Management Photo Access Helper Core**：提供“photo access helper core”能力，系统能力标识为 `SystemCapability.FileManagement.PhotoAccessHelper.Core`。
- **File Management User File Manager Distributed Core**：提供“user file manager distributed core”能力，系统能力标识为 `SystemCapability.FileManagement.UserFileManager.DistributedCore`。
- **File Management User File Manager Core**：提供“user file manager core”能力，系统能力标识为 `SystemCapability.FileManagement.UserFileManager.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `media_library_link_opt`：media library link opt。
- `media_library_feature_mtp`：media library 功能 mtp。
- `media_library_feature_back_up`：media library 功能 back up。
- `media_library_feature_cloud_enhancement`：media library 功能 cloud enhancement。
- `media_library_feature_cloud_download`：media library 功能 cloud download。
- `media_library_cloud_sync_enable`：media library cloud sync 启用。
- `media_library_facard_enable`：media library facard 启用。
- `media_library_analysis_data_enable`：media library analysis data 启用。
- `media_library_feature_custom_restore`：media library 功能 custom restore。
- `media_library_feature_secure_album`：media library 功能 secure album。
- `media_library_lake_enable`：media library lake 启用。
- `media_library_file_manager_enable`：media library file manager 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/media_library/frameworks](../../../../../../foundation/multimedia/media_library/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 396 | `ani`, `client`, `innerimpl`, `innerkitsimpl`, `js`, `native`, `services`, `utils` |
| [foundation/multimedia/media_library/interfaces](../../../../../../foundation/multimedia/media_library/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 32 | `inner_api`, `kits` |
| [foundation/multimedia/media_library/common](../../../../../../foundation/multimedia/media_library/common) | 组件内部共享的公共定义、工具和基础实现。 | 5 | `media_cloud_sync_data`, `media_ipc_common`, `utils` |
| [foundation/multimedia/media_library/services](../../../../../../foundation/multimedia/media_library/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 5 | `background_task_manager`, `media_albums_manager`, `media_analysis_data_manager`, `media_analysis_extension`, `media_assets_manager`, `media_backup_extension`, `media_camera_character_service`, `media_cloud_enhancement` |
| [foundation/multimedia/media_library/MediaLibraryExt](../../../../../../foundation/multimedia/media_library/MediaLibraryExt) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `AppScope`, `entry`, `signature` |
| [foundation/multimedia/media_library/etc](../../../../../../foundation/multimedia/media_library/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 2 | `param` |
| [foundation/multimedia/media_library/tools](../../../../../../foundation/multimedia/media_library/tools) | 开发、诊断、命令行或构建辅助工具。 | 2 | `medialibrary_scanner`, `medialibrary_tool` |

## 对外与内部接口

该部件声明 13 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/media_library/frameworks/innerkitsimpl/media_library_manager:media_library_manager` | `//foundation/multimedia/media_library/interfaces/inner_api/media_library_helper/include` | `media_library_manager.h`, `medialibrary_db_const.h` |
| `//foundation/multimedia/media_library/frameworks/innerkitsimpl/analysis_data_kits:analysis_data_kits` | `//foundation/multimedia/media_library/interfaces/inner_api/analysis_data_kits/include` | `analysis_data_manager.h`, `active_analysis/active_analysis_callback.h` |
| `//foundation/multimedia/media_library/frameworks/innerkitsimpl/media_library_cloud_sync:media_library_cloud_sync` | `//foundation/multimedia/media_library/interfaces/inner_api/native/cloud_sync` | `cloud_check_data.h`, `cloud_file_data.h`, `cloud_media_data_client.h`, `i_cloud_media_data_client.h`, `cloud_meta_data.h`, `media_operate_result.h`, `mdk_asset.h`, `mdk_database.h` 等 17 个 |
| `//foundation/multimedia/media_library/frameworks/innerkitsimpl/media_library_manager:media_library_extend_manager` | `//foundation/multimedia/media_library/interfaces/inner_api/media_library_helper/include` | `media_library_extend_manager.h` |
| `//foundation/multimedia/media_library/frameworks/innerkitsimpl/media_library_manager:media_library_custom_restore` | `//foundation/multimedia/media_library/interfaces/inner_api/media_library_helper/include` | `media_library_custom_restore.h` |
| `//foundation/multimedia/media_library/frameworks/innerkitsimpl/media_library_helper:media_library` | `//foundation/multimedia/media_library/interfaces/inner_api/media_library_helper/include` | `media_file_uri.h`, `media_volume.h` |
| `//foundation/multimedia/media_library/interfaces/kits/c:native_media_asset_manager` | `//foundation/multimedia/media_library/interfaces/kits/c` | `media_asset_base_capi.h`, `media_access_helper_capi.h`, `media_asset_capi.h`, `media_asset_change_request_capi.h`, `media_asset_manager_capi.h`, `moving_photo_capi.h` |
| `//foundation/multimedia/media_library/frameworks/native/media_library_asset_manager:media_library_asset_manager` | `//foundation/multimedia/media_library/interfaces/inner_api/media_library_helper/include` | `media_asset_manager_impl.h` |
| `//foundation/multimedia/media_library/interfaces/kits/js:medialibrary_nutils` | `//foundation/multimedia/media_library/interfaces/kits/js/include` | `media_library_comm_napi.h`, `photo_proxy_napi.h` |
| `//foundation/multimedia/media_library/interfaces/kits/cj:cj_photoaccesshelper_ffi` | `//foundation/multimedia/media_library/interfaces/kits/cj/include` | `photo_asset_helper.h` |
| `//foundation/multimedia/media_library/frameworks/ani:medialibrary_ani_utils` | `//foundation/multimedia/media_library/frameworks/ani/src/include` | `media_library_comm_ani.h` |
| `//foundation/multimedia/media_library/frameworks/innerkitsimpl/media_permission_helper:media_permission_helper` | `//foundation/multimedia/media_library/interfaces/inner_api/media_permission_helper/include` | `media_permission_helper.h` |
| `//foundation/multimedia/media_library/frameworks/innerkitsimpl/media_library_camera_helper:media_library_camera_helper` | `//foundation/multimedia/media_library/interfaces/inner_api/media_library_camera_helper/include` | `media_library_camera_manager.h`, `media_photo_asset_proxy.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_hap` | `//foundation/multimedia/media_library/MediaLibraryExt:medialibrary_ext_hap` | [foundation/multimedia/media_library/MediaLibraryExt/BUILD.gn](../../../../../../foundation/multimedia/media_library/MediaLibraryExt/BUILD.gn) |
| `ohos_app_scope` | `//foundation/multimedia/media_library/MediaLibraryExt:MediaLibStage_app_profile` | [foundation/multimedia/media_library/MediaLibraryExt/BUILD.gn](../../../../../../foundation/multimedia/media_library/MediaLibraryExt/BUILD.gn) |
| `ohos_executable` | `//foundation/multimedia/media_library/tools/medialibrary_scanner:scanner` | [foundation/multimedia/media_library/tools/medialibrary_scanner/BUILD.gn](../../../../../../foundation/multimedia/media_library/tools/medialibrary_scanner/BUILD.gn) |
| `ohos_executable` | `//foundation/multimedia/media_library/tools/medialibrary_tool:mediatool` | [foundation/multimedia/media_library/tools/medialibrary_tool/BUILD.gn](../../../../../../foundation/multimedia/media_library/tools/medialibrary_tool/BUILD.gn) |

生产库形态：`ohos_shared_library` 30 个，`ohos_static_library` 4 个，`ohos_ndk_library` 1 个。

## 依赖与协作边界

该部件声明 72 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `ace_engine`, `app_file_service`, `battery_manager`, `bundle_framework`, `c_utils`, `cellular_data`, `camera_framework`, `core_service`, `common_event_service`, `data_share`, `device_manager`, `dfs_service`, `drivers_interface_display`, `drivers_interface_usb`, `e2fsprogs`, `eventhandler`, `file_api`, `graphic_2d`, `graphic_surface`, `hicollie`, `hilog`, `hisysevent`, `hitrace`, `huks`, `i18n`, `icu`, `image_effect`, `init`, `ipc`, `kv_store`, `libexif`, `memory_utils`, `memmgr`, `image_framework`, `napi`, `resource_management`, `resource_schedule_service`, `runtime_core`, `os_account`, `player_framework`, `power_manager`, `relational_store`, `safwk`, `samgr`, `security_component_manager`, `storage_service`, `thermal_manager`, `usb_manager`, `window_manager`, `background_task_mgr`, `ffrt`, `preferences`, `wifi`, `libxml2`, `zlib`, `device_standby`, `libfuse`, `netmanager_base`, `openssl`, `jsoncpp`, `image_framework`, `media_foundation`, `qos_manager`, `hiappevent`, `ets_frontend`, `json`, `drivekit_native`, `bounds_checking_function`, `form_fwk`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 343 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_unittest` 132 个，`group` 117 个，`ohos_fuzztest` 94 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/media_library/bundle.json](../../../../../../foundation/multimedia/media_library/bundle.json)
- 原始源码 README：[foundation/multimedia/media_library/README_zh.md](../../../../../../foundation/multimedia/media_library/README_zh.md)、[foundation/multimedia/media_library/README.md](../../../../../../foundation/multimedia/media_library/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
