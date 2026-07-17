# relational_store 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

**关系型数据库（Relational Database，RDB）** 是一种基于关系模型来管理数据的数据库。OpenHarmony关系型数据库基于SQLite组件提供了一套完整的对本地数据库进行管理的机制。 OpenHarmony关系型数据库底层使用SQLite作为持久化存储引擎，支持SQLite具有的所有数据库特性，包括但不限于事务、索引、视图、触发器、外键、参数化查询和预编译SQL语句。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributeddatamgr` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 1000 / 350 |
| 源码仓 | `foundation/distributeddatamgr/relational_store` |

## 核心能力

- **Distributed Data Manager Cloud Sync Client**：提供“cloud sync client”能力，系统能力标识为 `SystemCapability.DistributedDataManager.CloudSync.Client`。
- **Distributed Data Manager Cloud Sync Server**：提供“cloud sync server”能力，系统能力标识为 `SystemCapability.DistributedDataManager.CloudSync.Server`。
- **Distributed Data Manager Cloud Sync Config**：提供“cloud sync config”能力，系统能力标识为 `SystemCapability.DistributedDataManager.CloudSync.Config`。
- **Distributed Data Manager Relational Store Core**：提供“relational store core”能力，系统能力标识为 `SystemCapability.DistributedDataManager.RelationalStore.Core`。
- **Distributed Data Manager Common Type**：提供“distributed data manager common type”能力，系统能力标识为 `SystemCapability.DistributedDataManager.CommonType`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `relational_store_rdb_support_icu`：relational store rdb 支持 icu。
- `relational_store_config`：relational store config。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributeddatamgr/relational_store/frameworks](../../../../../../foundation/distributeddatamgr/relational_store/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 47 | `cj`, `common`, `ets`, `js`, `native` |
| [foundation/distributeddatamgr/relational_store/rdbmock](../../../../../../foundation/distributeddatamgr/relational_store/rdbmock) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 44 | `external_inner_kit`, `frameworks` |
| [foundation/distributeddatamgr/relational_store/interfaces](../../../../../../foundation/distributeddatamgr/relational_store/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 41 | `inner_api`, `ndk`, `rdb_ndk_utils` |
| [foundation/distributeddatamgr/relational_store/conf](../../../../../../foundation/distributeddatamgr/relational_store/conf) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 3 | - |

## 对外与内部接口

该部件声明 13 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributeddatamgr/relational_store/interfaces/ndk:native_rdb_ndk` | `//foundation/distributeddatamgr/relational_store/interfaces/ndk/include` | `oh_predicates.h`, `relational_store.h`, `oh_cursor.h`, `relational_store_error_code.h`, `oh_value_object.h`, `oh_values_bucket.h` |
| `//foundation/distributeddatamgr/relational_store/interfaces/rdb_ndk_utils:native_rdb_ndk_utils` | `//foundation/distributeddatamgr/relational_store/interfaces/rdb_ndk_utils/include` | `rdb_ndk_utils.h` |
| `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/rdb:native_rdb` | `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/rdb/include` | `abs_rdb_predicates.h`, `abs_result_set.h`, `abs_shared_result_set.h`, `knowledge_types.h`, `rdb_common.h`, `rdb_errno.h`, `rdb_helper.h`, `rdb_open_callback.h` 等 15 个 |
| `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/appdatafwk:native_appdatafwk` | `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/appdatafwk/include` | `serializable.h`, `shared_block.h` |
| `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/dataability:native_dataability` | `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/dataability/include` | `data_ability_predicates.h`, `predicates_utils.h` |
| `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/rdb_data_share_adapter:rdb_data_share_adapter` | `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/rdb_data_share_adapter/include` | `rdb_utils.h` |
| `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/rdb_data_ability_adapter:rdb_data_ability_adapter` | `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/rdb_data_ability_adapter/include` | `rdb_data_ability_utils.h` |
| `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/cloud_data:cloud_data_inner` | `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/cloud_data/include` | `cloud_manager.h`, `cloud_service.h`, `cloud_types.h` |
| `//foundation/distributeddatamgr/relational_store/frameworks/cj:cj_relational_store_ffi` | `//foundation/distributeddatamgr/relational_store/frameworks/cj/include` | - |
| `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/cloud_data:cloud_data_native` | `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/cloud_data/include` | - |
| `//foundation/distributeddatamgr/relational_store/frameworks/ets/taihe/cloud_data:common_type_taihe_idl` | - | - |
| `//foundation/distributeddatamgr/relational_store/interfaces/inner_api/rdb:native_rdb_type_utils` | `//foundation/distributeddatamgr/relational_store/frameworks/native/rdb/include` | `rdb_types_util.h` |
| `//foundation/distributeddatamgr/relational_store/frameworks/ets/taihe/relational_store:copy_taihe` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_source_set` 33 个，`ohos_shared_library` 25 个，`ohos_static_library` 5 个，`taihe_shared_library` 2 个。

## 依赖与协作边界

该部件声明 27 个组件依赖和 1 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `common_event_service`, `c_utils`, `data_share`, `device_manager`, `eventhandler`, `hilog`, `hitrace`, `huks`, `ipc`, `kv_store`, `napi`, `samgr`, `hisysevent`, `bounds_checking_function`, `icu`, `sqlite`, `file_api`, `json`, `runtime_core`, `ets_frontend`, `api_metrics`, `openssl`, `taihe_ffi_gen`, `node`。
- 三方实现依赖：`sqlite`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 175 个测试目标，bundle 声明 27 个测试入口。

主要测试形态：`group` 80 个，`ohos_fuzztest` 47 个，`ohos_unittest` 19 个，`ohos_js_unittest` 6 个，`ohos_js_stage_unittest` 5 个，`ohos_app_scope` 5 个，`ohos_js_assets` 5 个，`ohos_resources` 5 个，`ohos_distributedtest` 2 个，`generate_static_abc` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributeddatamgr/relational_store/bundle.json](../../../../../../foundation/distributeddatamgr/relational_store/bundle.json)
- 原始源码 README：[foundation/distributeddatamgr/relational_store/README_zh.md](../../../../../../foundation/distributeddatamgr/relational_store/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
