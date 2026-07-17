# datamgr_service 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Distributed data manager that provides the capability to store data in the databases of different devices

源码 README 补充说明：

> 分布式数据服务（Distributed Data Service，DDS） 提供不同设备间数据库数据分布式的能力。通过结合帐号、应用和数据库三元组，分布式数据服务对数据进行隔离。在通过可信认证的设备间，分布式数据服务支持数据相互同步，为用户提供在多种终端设备上一致的数据访问体验。 分布式数据服务提供专门的数据库创建、数据访问、数据订阅等接口给内部其他部件调用，接口支持KV数据模型，支持常用的数据类型，同时确保接口的兼容性、易用性和可发布性。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributeddatamgr` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 5120KB / 8192KB |
| 源码仓 | `foundation/distributeddatamgr/datamgr_service` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `datamgr_service_config`：datamgr service config。
- `datamgr_service_udmf`：datamgr service udmf。
- `datamgr_service_cloud`：datamgr service cloud。
- `datamgr_service_rdb`：datamgr service rdb。
- `datamgr_service_kvdb`：datamgr service kvdb。
- `datamgr_service_object`：datamgr service object。
- `datamgr_service_data_share`：datamgr service data share。
- `datamgr_service_distributed`：datamgr service distributed。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributeddatamgr/datamgr_service/services](../../../../../../foundation/distributeddatamgr/datamgr_service/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 336 | `distributeddataservice` |
| [foundation/distributeddatamgr/datamgr_service/conf](../../../../../../foundation/distributeddatamgr/datamgr_service/conf) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | - |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributeddatamgr/datamgr_service/services/distributeddataservice/framework:distributeddatasvcfwk` | `//foundation/distributeddatamgr/datamgr_service/services/distributeddataservice/framework/include` | `account/account_delegate.h`, `backuprule/backup_rule_manager.h`, `checker/checker_manager.h`, `cloud/asset_loader.h`, `cloud/change_event.h`, `cloud/cloud_db.h`, `cloud/cloud_event.h`, `cloud/cloud_info.h` 等 52 个 |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `distributeddatamgr` | [distributeddata](../../processes/distributeddata/foundation-runtime.md) | 启动配置, SA 实现 | `1301` | `libdistributeddataservice.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/distributeddatamgr/datamgr_service/services/distributeddataservice/app:distributeddata_profile` | [foundation/distributeddatamgr/datamgr_service/services/distributeddataservice/app/BUILD.gn](../../../../../../foundation/distributeddatamgr/datamgr_service/services/distributeddataservice/app/BUILD.gn) |

生产库形态：`ohos_source_set` 28 个，`ohos_shared_library` 7 个。

## 依赖与协作边界

该部件声明 40 个组件依赖和 3 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `bundle_framework`, `common_event_service`, `c_utils`, `dataclassification`, `data_share`, `device_auth`, `device_manager`, `dfs_service`, `dlp_permission_service`, `dsoftbus`, `hicollie`, `hilog`, `hisysevent`, `hitrace`, `huks`, `kv_store`, `image_framework`, `ipc`, `memmgr`, `napi`, `netmanager_base`, `os_account`, `qos_manager`, `relational_store`, `resource_management`, `safwk`, `samgr`, `screenlock_mgr`, `time_service`, `udmf`, `app_file_service`, `file_api`, `openssl`, `json`, `dmsfwk`, `data_object`, `icu`。
- 三方实现依赖：`libuv`, `sqlite`, `zlib`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 263 个测试目标，bundle 声明 3 个测试入口。

主要测试形态：`ohos_unittest` 113 个，`group` 91 个，`ohos_fuzztest` 54 个，`ohos_static_library` 4 个，`ohos_rust_unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributeddatamgr/datamgr_service/bundle.json](../../../../../../foundation/distributeddatamgr/datamgr_service/bundle.json)
- 原始源码 README：[foundation/distributeddatamgr/datamgr_service/README_zh.md](../../../../../../foundation/distributeddatamgr/datamgr_service/README_zh.md)、[foundation/distributeddatamgr/datamgr_service/README.md](../../../../../../foundation/distributeddatamgr/datamgr_service/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
