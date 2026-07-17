# kv_store 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Supports distributed key-value and document-based data management, and supports the use of schemas to describe data formats

源码 README 补充说明：

> **KV数据库（KV store）** 依托当前公共基础库提供的KV存储能力开发，为设备应用提供键值对数据管理能力。在有进程的平台上，KV存储提供的参数管理，供单进程访问不能被其他进程使用。在此类平台上，KV存储作为基础库加载在应用进程，以保障不被其他进程访问。 依赖平台具有正常的文件创建、读写删除修改、锁等能力，针对不同平台（如LiteOS-M内核、LiteOS-A内核等）尽可能表现接口语义功能的不变；

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributeddatamgr` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 14336KB / 15360KB |
| 源码仓 | `foundation/distributeddatamgr/kv_store` |

## 核心能力

- **Distributed Data Manager KVStore Core**：提供“kvstore core”能力，系统能力标识为 `SystemCapability.DistributedDataManager.KVStore.Core`。
- **Distributed Data Manager KVStore Distributed KVStore**：提供“kvstore distributed kvstore”能力，系统能力标识为 `SystemCapability.DistributedDataManager.KVStore.DistributedKVStore`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `kv_store_cloud`：kv store cloud。
- `kv_store_device`：kv store device。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributeddatamgr/kv_store/frameworks](../../../../../../foundation/distributeddatamgr/kv_store/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 354 | `cj`, `common`, `ets`, `innerkitsimpl`, `jskitsimpl`, `libs`, `native` |
| [foundation/distributeddatamgr/kv_store/kvstoremock](../../../../../../foundation/distributeddatamgr/kv_store/kvstoremock) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 74 | `distributeddb`, `external_inner_kit`, `frameworks`, `interfaces` |
| [foundation/distributeddatamgr/kv_store/interfaces](../../../../../../foundation/distributeddatamgr/kv_store/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 37 | `cj`, `inner_api`, `innerkits`, `jskits` |
| [foundation/distributeddatamgr/kv_store/databaseutils](../../../../../../foundation/distributeddatamgr/kv_store/databaseutils) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 7 | `include`, `src` |

## 对外与内部接口

该部件声明 19 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributeddatamgr/kv_store/interfaces/innerkits/distributeddata:distributeddata_inner` | `//foundation/distributeddatamgr/kv_store/interfaces/innerkits/distributeddata/include` | `blob.h`, `change_notification.h`, `distributed_kv_data_manager.h`, `kvstore.h`, `kvstore_death_recipient.h`, `kvstore_observer.h`, `kvstore_result_set.h`, `kvstore_sync_callback.h` 等 18 个 |
| `//foundation/distributeddatamgr/kv_store/frameworks/common:datamgr_common` | `//foundation/distributeddatamgr/kv_store/interfaces/innerkits/distributeddata/include` | `executor.h`, `executor_pool.h`, `pool.h`, `priority_queue.h`, `types.h` |
| `//foundation/distributeddatamgr/kv_store/frameworks/common:datamgr_common` | `//foundation/distributeddatamgr/kv_store/frameworks/common` | `concurrent_map.h`, `block_data.h`, `itypes_util.h` |
| `//foundation/distributeddatamgr/kv_store/interfaces/innerkits/distributeddata:kvdb_inner_lite` | `//foundation/distributeddatamgr/kv_store/frameworks/innerkitsimpl/distributeddatafwk/include` | `ikvdb_notifier.h`, `ikvstore_observer.h` |
| `//foundation/distributeddatamgr/kv_store/interfaces/innerkits/distributeddata:kvdb_inner_lite` | `//foundation/distributeddatamgr/kv_store/frameworks/innerkitsimpl/kvdb/include` | `distributeddata_kvdb_ipc_interface_code.h`, `kv_types_util.h`, `kvdb_service.h` |
| `//foundation/distributeddatamgr/kv_store/interfaces/innerkits/distributeddata:kvdb_inner_lite` | `//foundation/distributeddatamgr/kv_store/interfaces/innerkits/distributeddata/include` | `kvstore_sync_callback.h`, `store_errno.h` |
| `//foundation/distributeddatamgr/kv_store/interfaces/innerkits/distributeddatamgr:distributeddata_mgr` | `//foundation/distributeddatamgr/kv_store/interfaces/innerkits/distributeddatamgr/include` | `distributed_data_mgr.h` |
| `//foundation/distributeddatamgr/kv_store/interfaces/innerkits/distributeddatamgr:distributeddata_mgr` | `//foundation/distributeddatamgr/kv_store/frameworks/innerkitsimpl/distributeddatasvc/include` | `ikvstore_data_service.h` |
| `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb:distributeddb` | `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb/interfaces/include` | `get_query_info.h`, `intercepted_data.h`, `iprocess_communicator.h`, `iprocess_system_api_adapter.h`, `ithread_pool.h`, `kv_store_changed_data.h`, `kv_store_delegate.h`, `kv_store_delegate_manager.h` 等 18 个 |
| `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb:distributeddb` | `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb/interfaces/include/cloud` | `cloud_store_types.h`, `iAssetLoader.h`, `icloud_data_translate.h`, `icloud_db.h` |
| `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb:distributeddb` | `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb/interfaces/include/relational` | `relational_store_client.h`, `relational_store_delegate.h`, `relational_store_manager.h`, `relational_store_sqlite_ext.h` |
| `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb:distributeddb` | `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb/include` | `auto_launch_export.h`, `query.h`, `query_expression.h`, `types_export.h` |
| `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb:distributeddb` | `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb/include/distributeddb` | `result_set.h` |
| `//foundation/distributeddatamgr/kv_store/databaseutils:database_utils` | `//foundation/distributeddatamgr/kv_store/databaseutils/include` | `acl.h` |
| `//foundation/distributeddatamgr/kv_store/interfaces/cj:cj_distributed_kv_store_ffi` | `//foundation/distributeddatamgr/kv_store/frameworks/cj/include` | - |
| `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb:distributeddb_client` | `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb/interfaces/include/relational` | `relational_store_client.h`, `relational_store_sqlite_ext.h`, `relational_store_manager.h` |
| `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb:distributeddb_client` | `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb/interfaces/include` | `store_observer.h` |
| `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb:distributeddb_client` | `//foundation/distributeddatamgr/kv_store/frameworks/libs/distributeddb/include` | `query.h` |
| `//foundation/distributeddatamgr/kv_store/frameworks/ets/taihe/kv_store:distributedkvstore_ani_pack` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_source_set` 45 个，`ohos_shared_library` 19 个，`ohos_static_library` 7 个，`static_library` 2 个，`shared_library` 2 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 29 个组件依赖和 4 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `bounds_checking_function`, `bundle_framework`, `cJSON`, `c_utils`, `common_event_service`, `data_share`, `device_manager`, `dmsfwk`, `ets_frontend`, `eventhandler`, `file_api`, `hilog`, `hisysevent`, `hitrace`, `huks`, `ipc`, `json`, `jsoncpp`, `napi`, `openssl`, `runtime_core`, `safwk`, `samgr`, `sqlite`, `zlib`, `taihe_ffi_gen`。
- 三方实现依赖：`bounds_checking_function`, `libuv`, `openssl`, `sqlite`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 402 个测试目标，bundle 声明 9 个测试入口。

主要测试形态：`distributeddb_unittest` 154 个，`group` 100 个，`ohos_fuzztest` 85 个，`ohos_unittest` 37 个，`ohos_source_set` 14 个，`gaussdb_rd_unittest` 8 个，`ohos_distributedtest` 2 个，`ohos_js_unittest` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributeddatamgr/kv_store/bundle.json](../../../../../../foundation/distributeddatamgr/kv_store/bundle.json)
- 原始源码 README：[foundation/distributeddatamgr/kv_store/README_zh.md](../../../../../../foundation/distributeddatamgr/kv_store/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
