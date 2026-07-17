# data_share 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

allows an application to manage its own data and share data with other applications

源码 README 补充说明：

> **数据共享（Data Share）** 部件提供了向其它应用共享以及管理其数据的方法，支持同个设备上不同应用之间的数据共享。 在许多应用场景中都需要用到数据共享，比如将电话簿、短信、媒体库中的数据共享给其它应用等。当然，不是所有的数据都允许其它应用访问，比如帐号、密码等；有些数据也只允许其它应用查询而不允许其删改，比如短信等。所以对于各种数据共享场景，DataShare这样一个安全、便捷的可以跨应用的数据共享机制是十分必需的。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributeddatamgr` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 3584KB / 10240KB |
| 源码仓 | `foundation/distributeddatamgr/data_share` |

## 核心能力

- **Distributed Data Manager Data Share Core**：提供“data share core”能力，系统能力标识为 `SystemCapability.DistributedDataManager.DataShare.Core`。
- **Distributed Data Manager Data Share Consumer**：提供“data share consumer”能力，系统能力标识为 `SystemCapability.DistributedDataManager.DataShare.Consumer`。
- **Distributed Data Manager Data Share Provider**：提供“data share provider”能力，系统能力标识为 `SystemCapability.DistributedDataManager.DataShare.Provider`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributeddatamgr/data_share/frameworks](../../../../../../foundation/distributeddatamgr/data_share/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 108 | `cj`, `ets`, `js`, `native`, `rust` |
| [foundation/distributeddatamgr/data_share/interfaces](../../../../../../foundation/distributeddatamgr/data_share/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 15 | `inner_api` |
| [foundation/distributeddatamgr/data_share/common](../../../../../../foundation/distributeddatamgr/data_share/common) | 组件内部共享的公共定义、工具和基础实现。 | 6 | `ani_rs`, `ani_rs_macros`, `ani_sys` |

## 对外与内部接口

该部件声明 11 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributeddatamgr/data_share/frameworks/cj/ffi/data_share_predicates:cj_data_share_predicates_ffi` | `//foundation/distributeddatamgr/data_share/frameworks/cj/ffi/data_share_predicates/include` | `data_share_predicates_impl.h`, `data_share_predicates_utils.h` |
| `//foundation/distributeddatamgr/data_share/interfaces/inner_api:datashare_consumer` | `//foundation/distributeddatamgr/data_share/interfaces/inner_api/consumer/include` | `datashare_helper.h`, `dataproxy_handle.h`, `datashare_result_set.h` |
| `//foundation/distributeddatamgr/data_share/interfaces/inner_api:datashare_permission` | `//foundation/distributeddatamgr/data_share/interfaces/inner_api/permission/include` | `data_share_permission.h` |
| `//foundation/distributeddatamgr/data_share/interfaces/inner_api:datashare_provider` | `//foundation/distributeddatamgr/data_share/interfaces/inner_api/provider/include` | `result_set_bridge.h` |
| `//foundation/distributeddatamgr/data_share/interfaces/inner_api/common:datashare_common` | `//foundation/distributeddatamgr/data_share/interfaces/inner_api/common/include` | `basic/result_set.h`, `datashare_errno.h`, `datashare_abs_predicates.h`, `datashare_predicates_def.h`, `datashare_predicates_object.h`, `datashare_predicates.h`, `datashare_value_object.h`, `datashare_values_bucket.h` |
| `//foundation/distributeddatamgr/data_share/interfaces/inner_api/common:datashare_common_lite` | `//foundation/distributeddatamgr/data_share/interfaces/inner_api/common/include` | `datashare_abs_predicates.h`, `datashare_predicates_def.h`, `datashare_predicates_object.h` |
| `//foundation/distributeddatamgr/data_share/interfaces/inner_api/common:datashare_common_lite` | `//foundation/distributeddatamgr/data_share/interfaces/inner_api/provider/include` | `result_set_bridge.h` |
| `//foundation/distributeddatamgr/data_share/interfaces/inner_api/common:datashare_common_lite` | `//foundation/distributeddatamgr/data_share/interfaces/inner_api/consumer/include` | `datashare_result_set.h` |
| `//foundation/distributeddatamgr/data_share/interfaces/inner_api/common:datashare_common_lite` | `//foundation/distributeddatamgr/data_share/frameworks/native/common/include` | `datashare_radar_reporter.h`, `ishared_result_set.h` |
| `//foundation/distributeddatamgr/data_share/frameworks/js/napi/dataShare:datashare_jscommon` | `//foundation/distributeddatamgr/data_share/frameworks/js/napi/common/include` | `datashare_predicates_proxy.h`, `datashare_result_set_proxy.h` |
| `//foundation/distributeddatamgr/data_share/common/ani_rs:ani_rs` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_static_library` 18 个，`ohos_rust_static_library` 15 个，`ohos_shared_library` 14 个。

## 依赖与协作边界

该部件声明 21 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `bundle_framework`, `common_event_service`, `c_utils`, `ets_frontend`, `eventhandler`, `hisysevent`, `hitrace`, `hilog`, `ipc`, `kv_store`, `libuv`, `napi`, `node`, `relational_store`, `runtime_core`, `rust_bindgen`, `rust_cxx`, `samgr`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 119 个测试目标，bundle 声明 5 个测试入口。

主要测试形态：`ohos_unittest` 60 个，`group` 27 个，`ohos_rust_unittest` 13 个，`ohos_app` 8 个，`ohos_js_app_static_suite` 2 个，`ohos_fuzztest` 2 个，`ohos_copy` 2 个，`ohos_js_stage_unittest` 1 个，`ohos_app_scope` 1 个，`ohos_js_assets` 1 个，`ohos_resources` 1 个，`ohos_js_unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributeddatamgr/data_share/bundle.json](../../../../../../foundation/distributeddatamgr/data_share/bundle.json)
- 原始源码 README：[foundation/distributeddatamgr/data_share/README_zh.md](../../../../../../foundation/distributeddatamgr/data_share/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
