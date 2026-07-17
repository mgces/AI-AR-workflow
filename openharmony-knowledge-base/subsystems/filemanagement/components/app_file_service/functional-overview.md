# app_file_service 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

App file service provides sharing and file management for apps

源码 README 补充说明：

> 应用文件服务是为应用提供文件分享和管理能力的服务，包含应用间文件分享、跨设备同应用文件分享以及跨设备跨应用文件分享的能力。 当前已具备基于分布式文件系统的跨设备同应用文件分享能力。 备份恢复是为Openharmony设备上三方应用数据、系统应用数据、公共数据提供一套完整的数据备份和数据恢复解决方案。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `filemanagement` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 1024KB / 1024KB |
| 源码仓 | `foundation/filemanagement/app_file_service` |

## 核心能力

- **File Management App File Service**：提供“file management app file service”能力，系统能力标识为 `SystemCapability.FileManagement.AppFileService`。
- **File Management Storage Service Backup**：提供“storage service backup”能力，系统能力标识为 `SystemCapability.FileManagement.StorageService.Backup`。
- **File Management App File Service Folder Authorization**：提供“app file service folder authorization”能力，系统能力标识为 `SystemCapability.FileManagement.AppFileService.FolderAuthorization`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/filemanagement/app_file_service/interfaces](../../../../../../foundation/filemanagement/app_file_service/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 57 | `api`, `common`, `inner_api`, `innerkits`, `kits` |
| [foundation/filemanagement/app_file_service/services](../../../../../../foundation/filemanagement/app_file_service/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 15 | `backup_sa` |
| [foundation/filemanagement/app_file_service/frameworks](../../../../../../foundation/filemanagement/app_file_service/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 6 | `js`, `native` |
| [foundation/filemanagement/app_file_service/utils](../../../../../../foundation/filemanagement/app_file_service/utils) | 跨模块复用的基础工具和通用数据结构。 | 4 | `include`, `src` |
| [foundation/filemanagement/app_file_service/tools](../../../../../../foundation/filemanagement/app_file_service/tools) | 开发、诊断、命令行或构建辅助工具。 | 1 | `backup_tool` |

## 对外与内部接口

该部件声明 10 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/filemanagement/app_file_service/interfaces/kits/ndk/fileshare/src:ohfileshare` | `//foundation/filemanagement/app_file_service/interfaces/kits/ndk/fileshare/include` | `oh_file_share.h` |
| `//foundation/filemanagement/app_file_service/interfaces/innerkits/native:fileshare_native` | `//foundation/filemanagement/app_file_service/interfaces/innerkits/native/file_share/include` | `file_share.h` |
| `//foundation/filemanagement/app_file_service/interfaces/innerkits/native:fileuri_native` | `//foundation/filemanagement/app_file_service/interfaces/innerkits/native/file_uri/include` | `file_uri.h` |
| `//foundation/filemanagement/app_file_service/interfaces/kits/ndk/fileuri/src:ohfileuri` | `//foundation/filemanagement/app_file_service/interfaces/kits/ndk/fileuri/include` | `oh_file_uri.h` |
| `//foundation/filemanagement/app_file_service/interfaces/innerkits/native:remote_file_share_native` | `//foundation/filemanagement/app_file_service/interfaces/innerkits/native/remote_file_share/include` | `remote_file_share.h` |
| `//foundation/filemanagement/app_file_service/interfaces/innerkits/native:sandbox_helper_native` | `//foundation/filemanagement/app_file_service/interfaces/common/include` | `sandbox_helper.h` |
| `//foundation/filemanagement/app_file_service/interfaces/inner_api/native/backup_kit_inner:backup_kit_inner` | `//foundation/filemanagement/app_file_service/interfaces/inner_api/native/backup_kit_inner` | `backup_kit_inner.h`, `impl/b_incremental_backup_session.h`, `impl/b_incremental_data.h`, `impl/b_incremental_restore_session.h`, `impl/backup_file.h`, `impl/b_session_restore.h`, `impl/b_session_restore_async.h`, `impl/b_file_info.h` 等 11 个 |
| `//foundation/filemanagement/app_file_service/interfaces/kits/cj:cj_file_fileuri_ffi` | `//foundation/filemanagement/app_file_service/interfaces//kits/cj/src` | - |
| `//foundation/filemanagement/app_file_service/interfaces/kits/cj:cj_file_grant_permission_ffi` | `//foundation/filemanagement/app_file_service/interfaces/kits/cj/src` | - |
| `//foundation/filemanagement/app_file_service/utils:backup_utils` | `//foundation/filemanagement/app_file_service/utils/include` | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `filemanagement` | [backup_sa](../../processes/backup_sa/foundation-runtime.md) | 启动配置, SA 实现 | `5203` | `libbackup_sa.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/filemanagement/app_file_service/services:backup_sa_profile` | [foundation/filemanagement/app_file_service/services/BUILD.gn](../../../../../../foundation/filemanagement/app_file_service/services/BUILD.gn) |
| `ohos_executable` | `//foundation/filemanagement/app_file_service/tools/backup_tool:backup_tool` | [foundation/filemanagement/app_file_service/tools/backup_tool/BUILD.gn](../../../../../../foundation/filemanagement/app_file_service/tools/backup_tool/BUILD.gn) |

生产库形态：`ohos_shared_library` 19 个，`ohos_source_set` 5 个，`ohos_static_library` 3 个，`taihe_shared_library` 3 个，`ohos_ndk_library` 2 个。

## 依赖与协作边界

该部件声明 31 个组件依赖和 1 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `bundle_framework`, `common_event_service`, `cJSON`, `c_utils`, `data_share`, `device_manager`, `faultloggerd`, `file_api`, `hicollie`, `hitrace`, `hilog`, `hisysevent`, `ipc`, `init`, `json`, `jsoncpp`, `napi`, `relational_store`, `runtime_core`, `os_account`, `openssl`, `power_manager`, `safwk`, `samgr`, `storage_service`, `sandbox_manager`, `selinux_adapter`, `zlib`。
- 三方实现依赖：`bounds_checking_function`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 135 个测试目标，bundle 声明 4 个测试入口。

主要测试形态：`ohos_unittest` 63 个，`ohos_fuzztest` 40 个，`group` 21 个，`ohos_js_unittest` 2 个，`ohos_hap` 2 个，`ohos_app_scope` 2 个，`ohos_js_assets` 2 个，`ohos_resources` 2 个，`ohos_static_library` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/filemanagement/app_file_service/bundle.json](../../../../../../foundation/filemanagement/app_file_service/bundle.json)
- 原始源码 README：[foundation/filemanagement/app_file_service/README_ZH.md](../../../../../../foundation/filemanagement/app_file_service/README_ZH.md)、[foundation/filemanagement/app_file_service/README.md](../../../../../../foundation/filemanagement/app_file_service/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
