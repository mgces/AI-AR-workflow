# form_fwk 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

卡片是一种界面展示形式，可以将应用的重要信息或操作前置到卡片，以达到服务直达的目的。 卡片常用于嵌入到其他应用（当前只支持系统应用）中作为其界面的一部分显示，并支持拉起页面，发送消息等基础的交互功能。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `ability` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/ability/form_fwk` |

## 核心能力

- **Ability Form**：提供“ability form”能力，系统能力标识为 `SystemCapability.Ability.Form`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `form_fwk_form_dimension_2_3`：form fwk form dimension 2 3。
- `form_fwk_form_dimension_3_3`：form fwk form dimension 3 3。
- `form_fwk_watch_api_disable`：form fwk watch api disable。
- `form_fwk_dynamic_support`：form fwk dynamic 支持。
- `form_fwk_with_distributed_capability`：form fwk with distributed capability。
- `form_fwk_support_api_metrics`：form fwk 支持 api metrics。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/ability/form_fwk/frameworks](../../../../../../foundation/ability/form_fwk/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 83 | `cj`, `ets`, `js` |
| [foundation/ability/form_fwk/services](../../../../../../foundation/ability/form_fwk/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 10 | `common`, `config`, `form_app_lock_helper`, `form_render_service`, `include`, `src` |
| [foundation/ability/form_fwk/sa_profile](../../../../../../foundation/ability/form_fwk/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/ability/form_fwk/common](../../../../../../foundation/ability/form_fwk/common) | 组件内部共享的公共定义、工具和基础实现。 | 0 | `include`, `src` |
| [foundation/ability/form_fwk/interfaces](../../../../../../foundation/ability/form_fwk/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_api`, `kits` |
| [foundation/ability/form_fwk/ipc_idl_gen](../../../../../../foundation/ability/form_fwk/ipc_idl_gen) | 设备内 Binder IPC、跨设备 RPC 及其对象、Parcel、Proxy/Stub 等核心实现。 | 0 | - |

## 对外与内部接口

该部件声明 10 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/ability/form_fwk:form_manager` | `//foundation/ability/form_fwk/interfaces/inner_api/include` | `form_death_callback.h`, `form_host_interface.h`, `form_host_stub.h`, `form_js_info.h`, `form_mgr_interface.h`, `form_mgr_stub.h`, `form_provider_interface.h`, `form_provider_stub.h` 等 15 个 |
| `//foundation/ability/form_fwk:fmskit_native` | `//foundation/ability/form_fwk/interfaces/kits/native/include` | `form_callback_interface.h`, `form_host_client.h`, `form_mgr.h` |
| `//foundation/ability/form_fwk:fmskit_provider_client` | `//foundation/ability/form_fwk/interfaces/kits/native/include` | `form_provider_client.h` |
| `//foundation/ability/form_fwk/frameworks/cj:cj_formBindingData_ffi` | `//foundation/ability/form_fwk/frameworks/cj/form_binding_data/include` | - |
| `//foundation/ability/form_fwk/frameworks/cj:cj_formProvider_ffi` | `//foundation/ability/form_fwk/frameworks/cj/form_provider/include` | - |
| `//foundation/ability/form_fwk/frameworks/js/napi:formutil_napi` | `//foundation/ability/form_fwk/frameworks/js/napi/formUtil` | - |
| `//foundation/ability/form_fwk:form_utils` | `//foundation/ability/form_fwk/interfaces/inner_api/include/` | - |
| `//foundation/ability/form_fwk:form_common_info` | `//foundation/ability/form_fwk/interfaces/inner_api/include/` | - |
| `//foundation/ability/form_fwk:form_render_info` | `//foundation/ability/form_fwk/interfaces/inner_api/include/` | - |
| `//foundation/ability/form_fwk/services/common:libform_common` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `systemabilitymgr` | [foundation](../../../systemabilitymgr/processes/foundation/foundation-runtime.md) | SA 实现 | `403` | `libfms.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/ability/form_fwk/sa_profile:form_sa_profile` | [foundation/ability/form_fwk/sa_profile/BUILD.gn](../../../../../../foundation/ability/form_fwk/sa_profile/BUILD.gn) |
| `ohos_hap` | `//foundation/ability/form_fwk/services/form_render_service:formrender_service_hap` | [foundation/ability/form_fwk/services/form_render_service/BUILD.gn](../../../../../../foundation/ability/form_fwk/services/form_render_service/BUILD.gn) |
| `ohos_app_scope` | `//foundation/ability/form_fwk/services/form_render_service:FormRender_app_profile` | [foundation/ability/form_fwk/services/form_render_service/BUILD.gn](../../../../../../foundation/ability/form_fwk/services/form_render_service/BUILD.gn) |
| `ohos_shared_library` | `//foundation/ability/form_fwk/services/form_render_service:formrender_service` | [foundation/ability/form_fwk/services/form_render_service/BUILD.gn](../../../../../../foundation/ability/form_fwk/services/form_render_service/BUILD.gn) |

生产库形态：`ohos_shared_library` 44 个，`ohos_source_set` 4 个。

## 依赖与协作边界

该部件声明 49 个组件依赖和 2 个三方依赖。

- 系统组件协作：`ability_runtime`, `api_metrics`, `distributed_notification_service`, `bundle_framework`, `common_event_service`, `cJSON`, `faultloggerd`, `ffrt`, `hilog`, `ipc`, `napi`, `relational_store`, `os_account`, `power_manager`, `safwk`, `samgr`, `c_utils`, `ability_base`, `ets_runtime`, `eventhandler`, `hiappevent`, `hitrace`, `access_token`, `data_share`, `hicollie`, `hisysevent`, `kv_store`, `netmanager_base`, `resource_management`, `time_service`, `device_usage_statistics`, `ace_engine`, `memmgr`, `init`, `resource_schedule_service`, `jsoncpp`, `libxml2`, `config_policy`, `runtime_core`, `device_manager`, `dmsfwk`, `huks`, `selinux_adapter`, `openssl`, `window_manager`, `graphic_2d`, `qos_manager`, `input`, `image_framework`。
- 三方实现依赖：`node`, `json`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 531 个测试目标，bundle 声明 3 个测试入口。

主要测试形态：`group` 264 个，`ohos_unittest` 145 个，`ohos_fuzztest` 116 个，`ohos_copy` 2 个，`ohos_benchmarktest` 1 个，`ohos_hap` 1 个，`ohos_js_assets` 1 个，`ohos_resources` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/ability/form_fwk/bundle.json](../../../../../../foundation/ability/form_fwk/bundle.json)
- 原始源码 README：[foundation/ability/form_fwk/README.md](../../../../../../foundation/ability/form_fwk/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
