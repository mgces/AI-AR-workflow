# storage_service 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Storage service provides basic storage inquiry and management for the system and apps.

源码 README 补充说明：

> 存储管理服务提供外置存储卡挂载管理、文件加解密、磁盘和卷的查询与管理、用户目录管理和空间统计等功能，为系统和应用提供基础的存储查询、管理能力。 \| **部件名称** \| **简介** \| \| ------------- \| ---------------------------------------- \| \| storage_api \| 为应用提供一套查询、管理存储和用户的接口API。 \| \| storage_manager \| 提供卷、磁盘的相关查询能力和管理能力，多用户数据目录管理接口及以应用或用户为维度的存储空间统计查询能力。 \| \| storage_daemon \| 提供分区挂载能力，与内核层的交互能力、设备上下线监听能力及目录加解密能力。\|

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `filemanagement` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 4096KB / 10240KB |
| 源码仓 | `foundation/filemanagement/storage_service` |

## 核心能力

- **File Management Storage Service Spatial Statistics**：提供“storage service spatial statistics”能力，系统能力标识为 `SystemCapability.FileManagement.StorageService.SpatialStatistics`。
- **File Management Storage Service Encryption**：提供“storage service encryption”能力，系统能力标识为 `SystemCapability.FileManagement.StorageService.Encryption`。
- **File Management Storage Service Volume**：提供“storage service volume”能力，系统能力标识为 `SystemCapability.FileManagement.StorageService.Volume`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `storage_service_fstools`：storage service fstools。
- `storage_service_graphic`：storage service graphic。
- `storage_service_user_file_sharing`：storage service user file sharing。
- `storage_service_user_crypto_manager`：storage service user crypto manager。
- `storage_service_external_storage_manager`：storage service external storage manager。
- `storage_service_storage_statistics_manager`：storage service storage statistics manager。
- `storage_service_crypto_test`：storage service crypto 测试。
- `storage_service_external_storage_qos_trans`：storage service external storage 服务质量 trans。
- `storage_service_media_fuse`：storage service media fuse。
- `storage_service_cloud_fuse`：storage service cloud fuse。
- `storage_service_enable_fscrypt_data_reliability_option`：storage service 启用 fscrypt data reliability option。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/filemanagement/storage_service/services](../../../../../../foundation/filemanagement/storage_service/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 201 | `common`, `storage_daemon`, `storage_manager`, `storage_space_manager` |
| [foundation/filemanagement/storage_service/interfaces](../../../../../../foundation/filemanagement/storage_service/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 25 | `innerkits`, `kits` |
| [foundation/filemanagement/storage_service/tools](../../../../../../foundation/filemanagement/storage_service/tools) | 开发、诊断、命令行或构建辅助工具。 | 1 | `ohos-storage-manager` |

## 对外与内部接口

该部件声明 4 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/filemanagement/storage_service/interfaces/innerkits/storage_manager/native:storage_manager_sa_proxy` | `//foundation/filemanagement/storage_service/interfaces/innerkits/storage_manager/native` | `ext_bundle_stats.h`, `bundle_stats.h`, `storage_stats.h`, `storage_service_errno.h`, `storage_service_constants.h` |
| `//foundation/filemanagement/storage_service/interfaces/innerkits/acl/native:storage_manager_acl` | `//foundation/filemanagement/storage_service/interfaces/innerkits/acl/native` | `storage_acl.h` |
| `//foundation/filemanagement/storage_service/services/storage_daemon/libfscrypt:libfscryptutils_static` | `//foundation/filemanagement/storage_service/services/storage_daemon/include/libfscrypt` | `fscrypt_control.h`, `fscrypt_log.h`, `fscrypt_sysparam.h`, `fscrypt_uapi.h`, `fscrypt_utils.h`, `key_control.h` |
| `//foundation/filemanagement/storage_service/interfaces/kits/cj/storage_manager:cj_storage_manager_ffi` | `//foundation/filemanagement/storage_service/interfaces/kits/cj/storage_manager/include` | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `filemanagement` | [storage_daemon](../../processes/storage_daemon/foundation-runtime.md) | 启动配置 | - | - |
| `filemanagement` | [storage_manager](../../processes/storage_manager/foundation-runtime.md) | 启动配置, SA 实现 | `5003` | `libstorage_manager.z.so` |
| `filemanagement` | [StorageSpaceMgr](../../processes/storagespacemgr/foundation-runtime.md) | 启动配置, SA 实现 | `8650` | `libstorage_space_manager.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_executable` | `//foundation/filemanagement/storage_service/services/storage_daemon:storage_daemon` | [foundation/filemanagement/storage_service/services/storage_daemon/BUILD.gn](../../../../../../foundation/filemanagement/storage_service/services/storage_daemon/BUILD.gn) |
| `ohos_executable` | `//foundation/filemanagement/storage_service/services/storage_daemon:sdc` | [foundation/filemanagement/storage_service/services/storage_daemon/BUILD.gn](../../../../../../foundation/filemanagement/storage_service/services/storage_daemon/BUILD.gn) |
| `ohos_executable` | `//foundation/filemanagement/storage_service/services/storage_daemon/gphotofs:gphotofs` | [foundation/filemanagement/storage_service/services/storage_daemon/gphotofs/BUILD.gn](../../../../../../foundation/filemanagement/storage_service/services/storage_daemon/gphotofs/BUILD.gn) |
| `ohos_executable` | `//foundation/filemanagement/storage_service/services/storage_daemon/mtpfs:mtpfs` | [foundation/filemanagement/storage_service/services/storage_daemon/mtpfs/BUILD.gn](../../../../../../foundation/filemanagement/storage_service/services/storage_daemon/mtpfs/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/filemanagement/storage_service/services/storage_manager/sa_profile:storage_manager_sa_profile` | [foundation/filemanagement/storage_service/services/storage_manager/sa_profile/BUILD.gn](../../../../../../foundation/filemanagement/storage_service/services/storage_manager/sa_profile/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/filemanagement/storage_service/services/storage_space_manager/sa_profile:storage_space_manager_sa_profile` | [foundation/filemanagement/storage_service/services/storage_space_manager/sa_profile/BUILD.gn](../../../../../../foundation/filemanagement/storage_service/services/storage_space_manager/sa_profile/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/filemanagement/storage_service/tools/ohos-storage-manager:ohos-storageManager` | [foundation/filemanagement/storage_service/tools/ohos-storage-manager/BUILD.gn](../../../../../../foundation/filemanagement/storage_service/tools/ohos-storage-manager/BUILD.gn) |

生产库形态：`ohos_shared_library` 9 个，`ohos_source_set` 6 个，`ohos_static_library` 3 个，`taihe_shared_library` 2 个。

## 依赖与协作边界

该部件声明 55 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `app_file_service`, `appspawn`, `bounds_checking_function`, `bundle_framework`, `cJSON`, `c_utils`, `config_policy`, `common_event_service`, `crypto_framework`, `data_share`, `dfs_service`, `drivers_interface_huks`, `e2fsprogs`, `eventhandler`, `exfatprogs`, `FreeBSD`, `f2fs-tools`, `file_api`, `gptfdisk`, `hicollie`, `hilog`, `hisysevent`, `hitrace`, `huks`, `init`, `ipc`, `libfuse`, `libgphoto2`, `libmtp`, `libusb`, `libuv`, `media_library`, `napi`, `node`, `ntfs-3g`, `relational_store`, `safwk`, `samgr`, `screenlock_mgr`, `selinux_adapter`, `security_guard`, `tee_client`, `os_account`, `openssl`, `user_auth_framework`, `zlib`, `qos_manager`, `usb_manager`, `runtime_core`, `json`, `resource_schedule_service`, `disk_manager`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 612 个测试目标，bundle 声明 5 个测试入口。

主要测试形态：`group` 265 个，`ohos_fuzztest` 208 个，`ohos_unittest` 92 个，`ohos_static_library` 41 个，`ohos_moduletest` 3 个，`source_set` 3 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/filemanagement/storage_service/bundle.json](../../../../../../foundation/filemanagement/storage_service/bundle.json)
- 原始源码 README：[foundation/filemanagement/storage_service/README_zh.md](../../../../../../foundation/filemanagement/storage_service/README_zh.md)、[foundation/filemanagement/storage_service/README.md](../../../../../../foundation/filemanagement/storage_service/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
