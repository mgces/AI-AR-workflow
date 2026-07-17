# data_object 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The distributed data object management framework is an object-oriented in-memory data management framework

源码 README 补充说明：

> 分布式数据对象管理框架是一款面向对象的内存数据管理框架，向应用开发者提供内存对象的创建、查询、删除、修改、订阅等基本数据对象的管理能力，同时具备分布式能力，满足超级终端场景下，相同应用多设备间的数据对象协同需求。 分布式数据对象提供JS接口，让开发者能以使用本地对象的方式使用分布式对象。分布式数据对象支持的数据类型包括数字型、字符型、布尔型等基本类型，同时也支持数组、基本类型嵌套等复杂类型。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributeddatamgr` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 1024KB / 1024KB |
| 源码仓 | `foundation/distributeddatamgr/data_object` |

## 核心能力

- **Distributed Data Manager Data Object Distributed Object**：提供“data object distributed object”能力，系统能力标识为 `SystemCapability.DistributedDataManager.DataObject.DistributedObject`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `data_object_feature_L1`：data object 功能 l1。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributeddatamgr/data_object/frameworks](../../../../../../foundation/distributeddatamgr/data_object/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 55 | `ets`, `innerkitsimpl`, `jskitsimpl` |
| [foundation/distributeddatamgr/data_object/interfaces](../../../../../../foundation/distributeddatamgr/data_object/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 19 | `innerkits`, `jskits` |
| [foundation/distributeddatamgr/data_object/pictures](../../../../../../foundation/distributeddatamgr/data_object/pictures) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/distributeddatamgr/data_object/samples](../../../../../../foundation/distributeddatamgr/data_object/samples) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `distributedNotepad` |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributeddatamgr/data_object/interfaces/innerkits:distributeddataobject_impl` | `//foundation/distributeddatamgr/data_object/interfaces/innerkits` | `distributed_object.h`, `distributed_objectstore.h`, `objectstore_errors.h`, `object_types.h` |
| `//foundation/distributeddatamgr/data_object/interfaces/innerkits:data_object_inner` | `//foundation/distributeddatamgr/data_object/interfaces/innerkits`<br>`//foundation/distributeddatamgr/data_object/frameworks/innerkitsimpl/include`<br>`//foundation/distributeddatamgr/data_object/frameworks/innerkitsimpl/include/common` | `object_types.h`, `iobject_service.h`, `object_callback.h`, `object_radar_reporter.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 5 个，`ohos_static_library` 4 个，`taihe_shared_library` 2 个。

## 依赖与协作边界

该部件声明 23 个组件依赖和 2 个三方依赖。

- 系统组件协作：`ability_runtime`, `bundle_framework`, `hitrace`, `dsoftbus`, `bounds_checking_function`, `napi`, `samgr`, `ipc`, `hilog`, `access_token`, `c_utils`, `device_manager`, `kv_store`, `libuv`, `common_event_service`, `dmsfwk`, `hisysevent`, `runtime_core`, `eventhandler`, `relational_store`, `ets_frontend`, `api_metrics`, `taihe_ffi_gen`。
- 三方实现依赖：`ffmpeg`, `libexif`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 34 个测试目标，bundle 声明 4 个测试入口。

主要测试形态：`ohos_unittest` 12 个，`group` 11 个，`ohos_fuzztest` 6 个，`ohos_js_stage_unittest` 1 个，`ohos_app_scope` 1 个，`ohos_js_assets` 1 个，`ohos_resources` 1 个，`ohos_js_unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributeddatamgr/data_object/bundle.json](../../../../../../foundation/distributeddatamgr/data_object/bundle.json)
- 原始源码 README：[foundation/distributeddatamgr/data_object/README_zh.md](../../../../../../foundation/distributeddatamgr/data_object/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
