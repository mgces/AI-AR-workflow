# udmf 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Provide unified data management service for 3rd party app

源码 README 补充说明：

> 从数据管理角度出发，随着OpenHarmony中数据跨应用、跨设备流转场景和需求的不断增加，流转过程中会存在数据协同通道繁杂、数据协同标准不一致、数据协同安全策略不一致、应用适配复杂度高、开发工作量增多等诸多痛点问题。统一数据管理框架（Unified Data Management Framework, UDMF）旨在定义数据跨应用、跨设备以及跨平台过程中的各项标准，提供统一的OpenHarmony数据语言和标准化的数据接入与读取通路。 **统一的OpenHarmony数据语言：** 构建OpenHarmony数据跨应用、跨设备交互的标准定义，降低应用/业务数据交互成本，促进数据生态建设。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributeddatamgr` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 1000KB / 636KB |
| 源码仓 | `foundation/distributeddatamgr/udmf` |

## 核心能力

- **Distributed Data Manager UDMF Core**：提供“udmf core”能力，系统能力标识为 `SystemCapability.DistributedDataManager.UDMF.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `udmf_feature_upgrade_skia`：udmf 功能 upgrade skia。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributeddatamgr/udmf/framework](../../../../../../foundation/distributeddatamgr/udmf/framework) | 客户端框架、公共运行库以及面向上层的能力封装。 | 78 | `common`, `innerkitsimpl`, `jskitsimpl`, `ndkimpl` |
| [foundation/distributeddatamgr/udmf/interfaces](../../../../../../foundation/distributeddatamgr/udmf/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 33 | `cj`, `components`, `innerkits`, `jskits`, `ndk`, `taihe` |
| [foundation/distributeddatamgr/udmf/adapter](../../../../../../foundation/distributeddatamgr/udmf/adapter) | 平台、硬件、协议或不同系统形态之间的适配层。 | 9 | `framework` |
| [foundation/distributeddatamgr/udmf/conf](../../../../../../foundation/distributeddatamgr/udmf/conf) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | - |

## 对外与内部接口

该部件声明 20 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributeddatamgr/udmf/interfaces/ndk:libudmf` | `//foundation/distributeddatamgr/udmf/interfaces/ndk/data` | `udmf_meta.h`, `uds.h`, `utd.h`, `udmf.h`, `udmf_err_code.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:udmf_core` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/client` | `getter_system.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:udmf_core` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/common` | `async_task_params.h`, `error_code.h`, `unified_key.h`, `unified_meta.h`, `unified_types.h`, `uri_permission_util.h`, `visibility.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:udmf_core` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/data` | `application_defined_record.h`, `audio.h`, `file.h`, `folder.h`, `html.h`, `image.h`, `link.h`, `plain_text.h` 等 18 个 |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:udmf_core` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/convert` | `udmf_conversion.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:udmf_client` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/client` | `udmf_async_client.h`, `udmf_client.h`, `utd_client.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:udmf_client` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/common` | `async_task_params.h`, `error_code.h`, `progress_queue.h`, `unified_key.h`, `unified_meta.h`, `unified_types.h`, `visibility.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:udmf_client` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/data` | `application_defined_record.h`, `audio.h`, `file.h`, `folder.h`, `html.h`, `image.h`, `link.h`, `plain_text.h` 等 17 个 |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:udmf_client` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/convert` | `ndk_data_conversion.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/jskits:udmf_data_napi` | `//foundation/distributeddatamgr/udmf/interfaces/jskits/data` | `unified_data_napi.h`, `summary_napi.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/jskits:udmf_data_napi` | `//foundation/distributeddatamgr/udmf/interfaces/jskits/common` | `napi_queue.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:utd_client` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/client` | `utd_client.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:utd_client` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/data` | `type_descriptor.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/jskits:intelligence_napi` | `//foundation/distributeddatamgr/udmf/interfaces/jskits/intelligence` | - |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits/aipcore:aip_core_mgr_static` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/aipcore` | `i_aip_core_manager.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/cj:cj_unified_data_channel_ffi` | `//foundation/distributeddatamgr/udmf/interfaces/cj/include` | - |
| `//foundation/distributeddatamgr/udmf/interfaces/cj:cj_uniform_type_descriptor_ffi` | `//foundation/distributeddatamgr/udmf/interfaces/cj/include` | - |
| `//foundation/distributeddatamgr/udmf/interfaces/taihe:udmf_taihe_native` | - | - |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:pixelmap_wrapper` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/dynamic` | `pixelmap_wrapper.h` |
| `//foundation/distributeddatamgr/udmf/interfaces/innerkits:xml_wrapper` | `//foundation/distributeddatamgr/udmf/interfaces/innerkits/dynamic` | `xml_wrapper.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 13 个，`ohos_source_set` 5 个，`ohos_static_library` 2 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 28 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `bundle_framework`, `cJSON`, `c_utils`, `dfs_service`, `ets_frontend`, `hilog`, `hisysevent`, `hitrace`, `image_framework`, `init`, `ipc`, `json`, `kv_store`, `napi`, `node`, `samgr`, `app_file_service`, `os_account`, `selinux_adapter`, `libuv`, `libxml2`, `runtime_core`, `bounds_checking_function`, `api_metrics`, `taihe_ffi_gen`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 77 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_unittest` 51 个，`group` 16 个，`ohos_fuzztest` 5 个，`ohos_js_stage_unittest` 1 个，`ohos_app_scope` 1 个，`ohos_js_assets` 1 个，`ohos_resources` 1 个，`ohos_js_unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributeddatamgr/udmf/bundle.json](../../../../../../foundation/distributeddatamgr/udmf/bundle.json)
- 原始源码 README：[foundation/distributeddatamgr/udmf/README_zh.md](../../../../../../foundation/distributeddatamgr/udmf/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
