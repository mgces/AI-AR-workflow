# app_domain_verify 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

应用域名校验部件是包管理子系统中的一个部件，其与包管理基础框架，元能力管理服务，互相协作共同完成`Applinking`$^1$功能。该部件主要功能为： 在应用的安装阶段，与应用关联的域名服务器进行通信，校验应用与域名的双向关联关系，并保存该关联关系。 在打开链接时，根据保存的关联关系，过滤出域名关联的应用的ability。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `bundlemanager` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 300KB / 1024KB |
| 源码仓 | `foundation/bundlemanager/app_domain_verify` |

## 核心能力

- **Bundle Manager App Domain Verify**：提供“bundle manager app domain verify”能力，系统能力标识为 `SystemCapability.BundleManager.AppDomainVerify`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `app_domain_verify_feature_target_from_cloud`：app domain verify 功能 target from cloud。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/bundlemanager/app_domain_verify/interfaces](../../../../../../foundation/bundlemanager/app_domain_verify/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 15 | `inner_api`, `kits` |
| [foundation/bundlemanager/app_domain_verify/frameworks](../../../../../../foundation/bundlemanager/app_domain_verify/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 9 | `app_details_rdb`, `common`, `extension`, `verifier` |
| [foundation/bundlemanager/app_domain_verify/services](../../../../../../foundation/bundlemanager/app_domain_verify/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 4 | `include`, `src` |
| [foundation/bundlemanager/app_domain_verify/etc](../../../../../../foundation/bundlemanager/app_domain_verify/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 2 | `init` |
| [foundation/bundlemanager/app_domain_verify/profile](../../../../../../foundation/bundlemanager/app_domain_verify/profile) | 组件注册、系统能力或产品装配配置。 | 1 | - |

## 对外与内部接口

该部件声明 7 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/bundlemanager/app_domain_verify/interfaces/inner_api/client:app_domain_verify_mgr_client` | `//foundation/bundlemanager/app_domain_verify/interfaces/inner_api/client/include` | `app_domain_verify_mgr_client.h` |
| `//foundation/bundlemanager/app_domain_verify/interfaces/inner_api/client:app_domain_verify_agent_client` | `//foundation/bundlemanager/app_domain_verify/interfaces/inner_api/client/include` | `app_domain_verify_agent_client.h` |
| `//foundation/bundlemanager/app_domain_verify/frameworks/extension:app_domain_verify_extension_framework` | `//foundation/bundlemanager/app_domain_verify/frameworks/extension/include` | `app_domain_verify_ext_base.h`, `app_domain_verify_extension_mgr.h`, `app_domain_verify_extension_register.h`, `app_domain_verify_agent_ext.h` |
| `//foundation/bundlemanager/app_domain_verify/interfaces/inner_api/common:app_domain_verify_common` | `//foundation/bundlemanager/app_domain_verify/interfaces/inner_api/common/include` | `app_verify_base_info.h`, `bundle_verify_status_info.h`, `domain_verify_status.h`, `inner_verify_status.h`, `skill_uri.h`, `zidl/i_convert_callback.h`, `zidl/convert_callback_proxy.h`, `zidl/convert_callback_stub.h` 等 9 个 |
| `//foundation/bundlemanager/app_domain_verify/frameworks/common:app_domain_verify_frameworks_common` | `//foundation/bundlemanager/app_domain_verify/frameworks/common/include` | `app_domain_verify_error.h`, `app_domain_verify_hilog.h`, `app_domain_verify_parcel_util.h`, `httpsession/i_http_task.h`, `httpsession/app_domain_verify_task_mgr.h`, `utils/domain_url_util.h` |
| `//foundation/bundlemanager/app_domain_verify/frameworks/verifier:app_domain_verify_agent_verifier` | `//foundation/bundlemanager/app_domain_verify/frameworks/verifier/include` | `i_verify_task.h`, `verify_task.h`, `verify_http_task.h`, `domain_verifier.h`, `domain_json_util.h`, `constant/agent_constants.h`, `asset_json_obj.h` |
| `//foundation/bundlemanager/app_domain_verify/frameworks/app_details_rdb:app_domain_verify_app_details_rdb` | `//foundation/bundlemanager/app_domain_verify/frameworks/app_details_rdb/include` | `app_details_rdb_data_define.h`, `app_details_rdb_data_manager.h`, `app_details_rdb_open_callback.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `bundlemanager` | [app_domain_verify_agent](../../processes/app_domain_verify_agent/foundation-runtime.md) | 启动配置, SA 实现 | `6201` | `libapp_domain_verify_agent_service.z.so` |
| `systemabilitymgr` | [foundation](../../../systemabilitymgr/processes/foundation/foundation-runtime.md) | SA 实现 | `6200` | `libapp_domain_verify_mgr_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/bundlemanager/app_domain_verify/profile:bundlemanager_app_domain_verify_sa_profiles` | [foundation/bundlemanager/app_domain_verify/profile/BUILD.gn](../../../../../../foundation/bundlemanager/app_domain_verify/profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/bundlemanager/app_domain_verify/services:app_domain_verify_mgr_service` | [foundation/bundlemanager/app_domain_verify/services/BUILD.gn](../../../../../../foundation/bundlemanager/app_domain_verify/services/BUILD.gn) |
| `ohos_shared_library` | `//foundation/bundlemanager/app_domain_verify/services:app_domain_verify_agent_service` | [foundation/bundlemanager/app_domain_verify/services/BUILD.gn](../../../../../../foundation/bundlemanager/app_domain_verify/services/BUILD.gn) |

生产库形态：`ohos_shared_library` 10 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 26 个组件依赖和 1 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `bundle_framework`, `c_utils`, `hilog`, `hisysevent`, `ipc`, `relational_store`, `napi`, `safwk`, `samgr`, `netstack`, `os_account`, `ffrt`, `cJSON`, `curl`, `preferences`, `access_token`, `eventhandler`, `hiappevent`, `hicollie`, `netmanager_base`, `memmgr`, `runtime_core`, `common_event_service`, `selinux_adapter`。
- 三方实现依赖：`openssl`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 27 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_unittest` 22 个，`ohos_fuzztest` 2 个，`group` 2 个，`generate_static_abc` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/bundlemanager/app_domain_verify/bundle.json](../../../../../../foundation/bundlemanager/app_domain_verify/bundle.json)
- 原始源码 README：[foundation/bundlemanager/app_domain_verify/README.md](../../../../../../foundation/bundlemanager/app_domain_verify/README.md)、[foundation/bundlemanager/app_domain_verify/README.en.md](../../../../../../foundation/bundlemanager/app_domain_verify/README.en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
