# pasteboard 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

剪贴板服务作为杂散子系统的功能组件，提供管理系统剪贴板的能力，为系统复制、粘贴功能提供支持。系统剪切板支持包文本、超本文、URIs等内容操作。 剪贴板服务，提供支撑应用开发者方便、高效的使用剪贴板相关业务的功能。其主要组件包括剪贴板管理客户端和剪贴板服务。剪贴板管理客户端负责剪贴板接口管理，提供剪贴板北向JS API给应用；在应用框架侧创建剪贴板数据、请求剪贴板SA执行剪贴板的新建、删除、查询、转换文本、配置等。剪贴板服务负责剪贴板事件管理，管理剪贴板SA的生命周期（启动、销毁、多用户等）；执行应用请求，通知剪贴板数据管理，并将结果返回给剪贴板管理客户端。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributeddatamgr` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 300KB / 1024KB |
| 源码仓 | `foundation/distributeddatamgr/pasteboard` |

## 核心能力

- **Misc Services Pasteboard**：提供“misc services pasteboard”能力，系统能力标识为 `SystemCapability.MiscServices.Pasteboard`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `pasteboard_dlp_part_enabled`：pasteboard dlp part 启用。
- `pasteboard_device_info_manager_part_enabled`：pasteboard device info manager part 启用。
- `pasteboard_device_manager_part_enabled`：pasteboard device manager part 启用。
- `pasteboard_screenlock_mgr_part_enabled`：pasteboard screenlock mgr part 启用。
- `pasteboard_dataclassification_enabled`：pasteboard dataclassification 启用。
- `pasteboard_cockpit_platform_enabled`：pasteboard cockpit platform 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributeddatamgr/pasteboard/services](../../../../../../foundation/distributeddatamgr/pasteboard/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 42 | `account`, `core`, `dfx`, `dialog`, `load`, `switch`, `zidl` |
| [foundation/distributeddatamgr/pasteboard/framework](../../../../../../foundation/distributeddatamgr/pasteboard/framework) | 客户端框架、公共运行库以及面向上层的能力封装。 | 25 | `framework`, `innerkits`, `tlv` |
| [foundation/distributeddatamgr/pasteboard/interfaces](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 22 | `ani`, `cj`, `kits`, `ndk`, `taihe` |
| [foundation/distributeddatamgr/pasteboard/adapter](../../../../../../foundation/distributeddatamgr/pasteboard/adapter) | 平台、硬件、协议或不同系统形态之间的适配层。 | 4 | `data_share`, `include`, `pasteboard_progress`, `security_level`, `src` |
| [foundation/distributeddatamgr/pasteboard/tools](../../../../../../foundation/distributeddatamgr/pasteboard/tools) | 开发、诊断、命令行或构建辅助工具。 | 3 | `ohos-pasteboard` |
| [foundation/distributeddatamgr/pasteboard/utils](../../../../../../foundation/distributeddatamgr/pasteboard/utils) | 跨模块复用的基础工具和通用数据结构。 | 3 | `native` |
| [foundation/distributeddatamgr/pasteboard/etc](../../../../../../foundation/distributeddatamgr/pasteboard/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 1 | `init` |
| [foundation/distributeddatamgr/pasteboard/profile](../../../../../../foundation/distributeddatamgr/pasteboard/profile) | 组件注册、系统能力或产品装配配置。 | 1 | - |

## 对外与内部接口

该部件声明 6 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributeddatamgr/pasteboard/framework/innerkits:pasteboard_client` | `//foundation/distributeddatamgr/pasteboard/framework/innerkits/include` | `pasteboard_client.h`, `paste_data.h`, `paste_data_record.h` |
| `//foundation/distributeddatamgr/pasteboard/framework/innerkits:pasteboard_data` | `//foundation/distributeddatamgr/pasteboard/framework/innerkits/include` | `paste_data.h`, `paste_data_record.h` |
| `//foundation/distributeddatamgr/pasteboard/framework/framework:pasteboard_framework` | `//foundation/distributeddatamgr/pasteboard/framework/framework/include` | `clip/clip_plugin.h`, `device/dm_adapter.h`, `common/block_object.h` |
| `//foundation/distributeddatamgr/pasteboard/interfaces/ndk:libpasteboard` | `//foundation/distributeddatamgr/pasteboard/interfaces/ndk/include` | `oh_pasteboard.h`, `oh_pasteboard_err_code.h` |
| `//foundation/distributeddatamgr/pasteboard/interfaces/cj:cj_pasteboard_ffi` | `//foundation/distributeddatamgr/pasteboard/interfaces/cj/include` | - |
| `//foundation/distributeddatamgr/pasteboard/interfaces/taihe:copy_pasteboard` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `distributeddatamgr` | [pasteboard_service](../../processes/pasteboard_service/foundation-runtime.md) | 启动配置, SA 实现 | `3701` | `libpasteboard_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/distributeddatamgr/pasteboard/profile:distributeddatamgr_pasteboard_sa_profiles` | [foundation/distributeddatamgr/pasteboard/profile/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/distributeddatamgr/pasteboard/services:pasteboard_service` | [foundation/distributeddatamgr/pasteboard/services/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/BUILD.gn) |
| `ohos_hap` | `//foundation/distributeddatamgr/pasteboard/services/dialog:pasteboard_dialog_hap` | [foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn) |
| `ohos_app_scope` | `//foundation/distributeddatamgr/pasteboard/services/dialog:pasteboard_dialog_app_profile` | [foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard:ohos-pasteboard` | [foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard/BUILD.gn) |

生产库形态：`ohos_shared_library` 9 个，`ohos_source_set` 3 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 41 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `app_file_service`, `bundle_framework`, `cJSON`, `c_utils`, `common_event_service`, `device_info_manager`, `device_manager`, `data_share`, `dataclassification`, `dfs_service`, `dlp_permission_service`, `ets_frontend`, `eventhandler`, `file_api`, `hiappevent`, `hisysevent`, `hitrace`, `hilog`, `init`, `input`, `imf`, `ipc`, `image_framework`, `json`, `libuv`, `libxml2`, `memmgr`, `napi`, `os_account`, `resource_schedule_service`, `safwk`, `samgr`, `screenlock_mgr`, `time_service`, `udmf`, `window_manager`, `ffrt`, `runtime_core`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 70 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_unittest` 50 个，`group` 14 个，`ohos_fuzztest` 4 个，`ohos_js_unittest` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributeddatamgr/pasteboard/bundle.json](../../../../../../foundation/distributeddatamgr/pasteboard/bundle.json)
- 原始源码 README：[foundation/distributeddatamgr/pasteboard/README_ZH.md](../../../../../../foundation/distributeddatamgr/pasteboard/README_ZH.md)、[foundation/distributeddatamgr/pasteboard/README.md](../../../../../../foundation/distributeddatamgr/pasteboard/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
