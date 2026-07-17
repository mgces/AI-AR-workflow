# bundle_framework 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

提供OpenHarmony应用和服务安装包的安装、更新、卸载以及信息查询等能力，包含包管理接口和包管理服务

源码 README 补充说明：

> 包管理子系统负责应用安装包的管理，提供安装包的信息查询、安装、更新、卸载和包信息存储等能力。具体功能如下： \| 子模块名称 \| 职责 \| \| ---------------- \| ------------------------------------------------------------ \| \| 包管理接口模块 \| 1.对外提供的安装更新卸载及通知接口； 2.对外提供的包/组件信息/权限信息查询接口； 3.对外提供的应用权限查询接口； 4.对外提供的清除数据的接口； \| \| 扫描模块 \| 1.预置应用的扫描； 2.已安装三方应用的扫描； 3.包配置文件的解析； \| \| 安全管理模块 \| 1.安装过程中的签名校验； 2.安装过程中应用所申请权限的授予； 3.应用运行中权限的校验； \| \| 安装管理模块 \| 1.安装、更新、卸载逻辑处理及结果通知； \| \| 包信息管理模块 \| 1.包信息、组件信息的存储及同步； \| \| 设备状态监听模块 \| 1.监听设备的上下线； \| \| Installd模块 \| 特权进程： 1）用于创建、删除等目录操作； 2）用于创建、删除等文件操作； 3）用于设备目录的沙箱uid/gid等操作 \| \| DFX \| 1.包管理维测工具 \|

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `bundlemanager` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | ~8000KB / ~14106KB |
| 源码仓 | `foundation/bundlemanager/bundle_framework` |

## 核心能力

- **Bundle Manager Bundle Framework**：提供“bundle manager bundle framework”能力，系统能力标识为 `SystemCapability.BundleManager.BundleFramework`。
- **Bundle Manager Zlib**：提供“bundle manager zlib”能力，系统能力标识为 `SystemCapability.BundleManager.Zlib`。
- **Bundle Manager Bundle Framework App Control**：提供“bundle framework app control”能力，系统能力标识为 `SystemCapability.BundleManager.BundleFramework.AppControl`。
- **Bundle Manager Bundle Framework Core**：提供“bundle framework core”能力，系统能力标识为 `SystemCapability.BundleManager.BundleFramework.Core`。
- **Bundle Manager Bundle Framework Free Install**：提供“bundle framework free install”能力，系统能力标识为 `SystemCapability.BundleManager.BundleFramework.FreeInstall`。
- **Bundle Manager Bundle Framework Launcher**：提供“bundle framework launcher”能力，系统能力标识为 `SystemCapability.BundleManager.BundleFramework.Launcher`。
- **Bundle Manager Bundle Framework Default App**：提供“bundle framework default app”能力，系统能力标识为 `SystemCapability.BundleManager.BundleFramework.DefaultApp`。
- **Bundle Manager Bundle Framework Resource**：提供“bundle framework re媒体源”能力，系统能力标识为 `SystemCapability.BundleManager.BundleFramework.Resource`。
- **Bundle Manager Bundle Framework Overlay**：提供“bundle framework overlay”能力，系统能力标识为 `SystemCapability.BundleManager.BundleFramework.Overlay`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `bundle_framework_graphics`：bundle framework 图形协同。
- `bundle_framework_free_install`：bundle framework free install。
- `bundle_framework_default_app`：bundle framework default app。
- `bundle_framework_launcher`：bundle framework launcher。
- `bundle_framework_sandbox_app`：bundle framework sandbox app。
- `bundle_framework_quick_fix`：bundle framework quick fix。
- `bundle_framework_form_dimension_2_3`：bundle framework form dimension 2 3。
- `bundle_framework_form_dimension_3_3`：bundle framework form dimension 3 3。
- `bundle_framework_bss_enable`：bundle framework bss 启用。
- `bundle_framework_npapi_enable`：bundle framework npapi 启用。
- `bundle_framework_app_fwk_update_enable`：bundle framework app fwk update 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/bundlemanager/bundle_framework/services](../../../../../../foundation/bundlemanager/bundle_framework/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 339 | `bundlemgr` |
| [foundation/bundlemanager/bundle_framework/interfaces](../../../../../../foundation/bundlemanager/bundle_framework/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 168 | `inner_api`, `kits` |
| [foundation/bundlemanager/bundle_framework/common](../../../../../../foundation/bundlemanager/bundle_framework/common) | 组件内部共享的公共定义、工具和基础实现。 | 9 | `log`, `utils` |
| [foundation/bundlemanager/bundle_framework/etc](../../../../../../foundation/bundlemanager/bundle_framework/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 3 | - |
| [foundation/bundlemanager/bundle_framework/sa_profile](../../../../../../foundation/bundlemanager/bundle_framework/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/bundlemanager/bundle_framework/.specs](../../../../../../foundation/bundlemanager/bundle_framework/.specs) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `features` |
| [foundation/bundlemanager/bundle_framework/skills](../../../../../../foundation/bundlemanager/bundle_framework/skills) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `bms-add-ipc`, `bms-install-flow`, `bms-logging`, `bms-navigation`, `bms-security-verify`, `bms-testing-patterns`, `bms-user-model` |

## 对外与内部接口

该部件声明 12 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/bundlemanager/bundle_framework/interfaces/inner_api/appexecfwk_base:appexecfwk_base` | `//foundation/bundlemanager/bundle_framework/interfaces/inner_api/appexecfwk_base/include` | `ability_info.h`, `appexecfwk_errors.h`, `application_info.h`, `bundle_info.h` |
| `//foundation/bundlemanager/bundle_framework/interfaces/inner_api/appexecfwk_core:appexecfwk_core` | `//foundation/bundlemanager/bundle_framework/interfaces/inner_api/appexecfwk_core/include` | `bundlemgr/bundle_installer_interface.h`, `bundlemgr/bundle_mgr_interface.h`, `bundlemgr/bundle_status_callback_interface.h`, `bundlemgr/clean_cache_callback_interface.h`, `bundlemgr/process_cache_callback_interface.h`, `bundlemgr/status_receiver_interface.h`, `bundlemgr/bundle_installer_proxy.h`, `bundlemgr/bundle_mgr_proxy.h` 等 15 个 |
| `//foundation/bundlemanager/bundle_framework/interfaces/inner_api/appexecfwk_core:bundlemgr_mini` | `//foundation/bundlemanager/bundle_framework/interfaces/inner_api/appexecfwk_core/include` | `bundlemgr/bundle_mgr_mini_proxy.h` |
| `//foundation/bundlemanager/bundle_framework/interfaces/inner_api/appexecfwk_core:appexecfwk_core_headers` | `//foundation/bundlemanager/bundle_framework/interfaces/inner_api/appexecfwk_core/include` | - |
| `//foundation/bundlemanager/bundle_framework/interfaces/inner_api/bundlemgr_extension:bundlemgr_extension` | `//foundation/bundlemanager/bundle_framework/interfaces/inner_api/bundlemgr_extension/include` | `bms_extension_data_mgr.h`, `bms_extension_profile.h`, `bms_extension.h`, `bundle_mgr_ext_register.h`, `bundle_mgr_ext.h` |
| `//foundation/bundlemanager/bundle_framework/common:libappexecfwk_common` | `//foundation/bundlemanager/bundle_framework/common/log/include` | `app_log_wrapper.h` |
| `//foundation/bundlemanager/bundle_framework/interfaces/kits/cj:cj_bundle_manager_ffi` | `//foundation/bundlemanager/bundle_framework/interfaces/kits/cj/src` | `bundle_manager_convert.h`, `bundle_manager_utils.h` |
| `//foundation/bundlemanager/bundle_framework/interfaces/kits/js/common:bundle_napi_common` | `//foundation/bundlemanager/bundle_framework/interfaces/kits/js/common` | `base_cb_info.h`, `bundle_errors.h`, `business_error.h`, `common_func.h`, `error_data.h`, `napi_arg.h`, `napi_constants.h` |
| `//foundation/bundlemanager/bundle_framework/interfaces/kits/ani/common:bms_ani_common` | `//foundation/bundlemanager/bundle_framework/interfaces/kits/ani/common/` | `common_fun_ani.h`, `enum_util.h` |
| `//foundation/bundlemanager/bundle_framework/interfaces/kits/ani/bundle_manager:copy_bundleManager_ets` | - | - |
| `//foundation/bundlemanager/bundle_framework/services/bundlemgr:bundle_tool_libs` | - | - |
| `//foundation/bundlemanager/bundle_framework/services/bundlemgr/spm_module_parser:spm_module_parser` | `//foundation/bundlemanager/bundle_framework/services/bundlemgr/spm_module_parser/include` | `spm_module_parser.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `bundlemanager` | [installs](../../processes/installs/foundation-runtime.md) | 启动配置, SA 实现 | `511` | `libinstalls.z.so` |
| `systemabilitymgr` | [foundation](../../../systemabilitymgr/processes/foundation/foundation-runtime.md) | SA 实现 | `401` | `libbms.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/bundlemanager/bundle_framework/sa_profile:appexecfwk_sa_profile` | [foundation/bundlemanager/bundle_framework/sa_profile/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 50 个，`ohos_source_set` 7 个。

## 依赖与协作边界

该部件声明 63 个组件依赖和 1 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `api_metrics`, `app_domain_verify`, `app_file_service`, `appverify`, `battery_manager`, `common_event_service`, `config_policy`, `c_utils`, `device_info_manager`, `device_manager`, `device_usage_statistics`, `dfs_service`, `display_manager`, `ecological_rule_manager`, `eventhandler`, `faultloggerd`, `ffrt`, `hicollie`, `hisysevent`, `hitrace`, `hilog`, `i18n`, `init`, `ipc`, `image_framework`, `memmgr`, `kv_store`, `libpng`, `libxml2`, `libuv`, `napi`, `node`, `openssl`, `os_account`, `power_manager`, `safwk`, `resource_management`, `samgr`, `sandbox_manager`, `selinux`, `selinux_adapter`, `syscap_codec`, `storage_service`, `window_manager`, `distributed_bundle_framework`, `relational_store`, `runtime_core`, `dlp_permission_service`, `code_signature`, `udmf`, `ace_engine`, `ets_runtime`, `json`, `zlib`, `appspawn`, `bounds_checking_function`, `webview`, `user_auth_framework`, `thermal_manager`, `icu`。
- 三方实现依赖：`jsoncpp`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 1334 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_fuzztest` 295 个，`ohos_app` 244 个，`group` 215 个，`ohos_unittest` 194 个，`ohos_shared_library` 81 个，`ohos_hap` 62 个，`ohos_app_scope` 62 个，`ohos_js_assets` 62 个，`ohos_resources` 62 个，`ohos_systemtest` 27 个，`ohos_benchmarktest` 20 个，`ohos_copy` 6 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/bundlemanager/bundle_framework/bundle.json](../../../../../../foundation/bundlemanager/bundle_framework/bundle.json)
- 原始源码 README：[foundation/bundlemanager/bundle_framework/README_zh.md](../../../../../../foundation/bundlemanager/bundle_framework/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
