# user_file_service 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

filemanagement is the module of OpenHarmony that provides storage and file management.

源码 README 补充说明：

> 公共文件访问框架(FileAccessFramework)提供了一套公共文件访问和管理的接口。 公共文件访问框架中FileAccessFramework向下对接底层文件管理服务，如medialibrary、externalFileManager。FileAccessFramework向上对接应用，提供对公共文件操作的基础能力，如图1。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `filemanagement` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 4096KB / 5120KB |
| 源码仓 | `foundation/filemanagement/user_file_service` |

## 核心能力

- **File Management User File Service**：提供“file management user file service”能力，系统能力标识为 `SystemCapability.FileManagement.UserFileService`。
- **File Management User File Service Folder Selection**：提供“user file service folder selection”能力，系统能力标识为 `SystemCapability.FileManagement.UserFileService.FolderSelection`。
- **File Management Cloud Disk Manager**：提供“file management cloud disk manager”能力，系统能力标识为 `SystemCapability.FileManagement.CloudDiskManager`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `user_file_service_cloud_disk_enable`：user file service cloud disk 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/filemanagement/user_file_service/interfaces](../../../../../../foundation/filemanagement/user_file_service/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 31 | `inner_api`, `kits` |
| [foundation/filemanagement/user_file_service/services](../../../../../../foundation/filemanagement/user_file_service/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 14 | `file_extension_hap`, `native`, `rdb_adapter`, `signature` |
| [foundation/filemanagement/user_file_service/frameworks](../../../../../../foundation/filemanagement/user_file_service/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 6 | `js` |
| [foundation/filemanagement/user_file_service/utils](../../../../../../foundation/filemanagement/user_file_service/utils) | 跨模块复用的基础工具和通用数据结构。 | 0 | - |

## 对外与内部接口

该部件声明 4 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/filemanagement/user_file_service/interfaces/inner_api/file_access:file_access_extension_ability_kit` | `//foundation/filemanagement/user_file_service/interfaces/inner_api/file_access/include` | `file_access_ext_ability.h`, `file_access_extension_info.h`, `file_access_ext_stub_impl.h` |
| `//foundation/filemanagement/user_file_service/interfaces/kits/picker:cj_picker_ffi` | `//foundation/filemanagement/user_file_service/interfaces/kits/picker/cj/include` | - |
| `//foundation/filemanagement/user_file_service/interfaces/inner_api/cloud_disk_kit_inner:cloud_disk_manager_kit` | `//foundation/filemanagement/user_file_service/interfaces/inner_api/cloud_disk_kit_inner/include` | `cloud_disk_sync_folder_manager.h` |
| `//foundation/filemanagement/user_file_service/interfaces/kits/taihe/clouddiskmanager:copy_taihe` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `filemanagement` | [file_access_service](../../processes/file_access_service/foundation-runtime.md) | 启动配置, SA 实现 | `5010` | `libfile_access_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/filemanagement/user_file_service/services:file_access_service_profile` | [foundation/filemanagement/user_file_service/services/BUILD.gn](../../../../../../foundation/filemanagement/user_file_service/services/BUILD.gn) |
| `ohos_shared_library` | `//foundation/filemanagement/user_file_service/services:file_access_service` | [foundation/filemanagement/user_file_service/services/BUILD.gn](../../../../../../foundation/filemanagement/user_file_service/services/BUILD.gn) |
| `ohos_app` | `//foundation/filemanagement/user_file_service/services/file_extension_hap:external_file_manager_hap` | [foundation/filemanagement/user_file_service/services/file_extension_hap/BUILD.gn](../../../../../../foundation/filemanagement/user_file_service/services/file_extension_hap/BUILD.gn) |

生产库形态：`ohos_shared_library` 13 个，`ohos_source_set` 4 个，`taihe_shared_library` 2 个。

## 依赖与协作边界

该部件声明 31 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `ace_engine`, `app_file_service`, `bounds_checking_function`, `ets_frontend`, `ipc`, `init`, `samgr`, `safwk`, `napi`, `file_api`, `bundle_framework`, `hilog`, `hitrace`, `access_token`, `os_account`, `c_utils`, `cJSON`, `libuv`, `node`, `image_framework`, `common_event_service`, `udmf`, `selinux_adapter`, `window_manager`, `dfs_service`, `sandbox_manager`, `relational_store`, `runtime_core`, `taihe_ffi_gen`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 95 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_fuzztest` 65 个，`ohos_unittest` 16 个，`group` 14 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/filemanagement/user_file_service/bundle.json](../../../../../../foundation/filemanagement/user_file_service/bundle.json)
- 原始源码 README：[foundation/filemanagement/user_file_service/README_zh.md](../../../../../../foundation/filemanagement/user_file_service/README_zh.md)、[foundation/filemanagement/user_file_service/README.md](../../../../../../foundation/filemanagement/user_file_service/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
