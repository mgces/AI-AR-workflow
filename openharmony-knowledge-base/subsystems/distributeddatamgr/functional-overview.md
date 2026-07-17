# distributeddatamgr：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 9 个部件，其中 8 个进入当前 rk3568 产品。2 个部件包含可识别的服务/可执行程序/SA profile，9 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `data_object` | The distributed data object management framework is an object-oriented in-memory data management framework | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/1 | yes | [查看](components/data_object/functional-overview.md) |
| `data_share` | allows an application to manage its own data and share data with other applications | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 3/0 | yes | [查看](components/data_share/functional-overview.md) |
| `datamgr_service` | Distributed data manager that provides the capability to store data in the databases of different devices | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/8 | yes | [查看](components/datamgr_service/functional-overview.md) |
| `distributeddatamgr_cangjie_wrapper` | The distributeddatamgr_cangjie_wrapper is a Cangjie API encapsulated on OpenHarmony based on the capabilities of the DistributedDataManager subsystem. | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/distributeddatamgr_cangjie_wrapper/functional-overview.md) |
| `kv_store` | Supports distributed key-value and document-based data management, and supports the use of schemas to describe data formats | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 2/2 | yes | [查看](components/kv_store/functional-overview.md) |
| `pasteboard` | 剪贴板服务作为杂散子系统的功能组件，提供管理系统剪贴板的能力，为系统复制、粘贴功能提供支持。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/6 | yes | [查看](components/pasteboard/functional-overview.md) |
| `preferences` | **首选项（Preferences）** 主要提供轻量级Key-Value操作，支持本地应用存储少量数据，数据存储在本地文件中，同时也加载在内存中，所以访问速度更快，效率更高。 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 2/0 | yes | [查看](components/preferences/functional-overview.md) |
| `relational_store` | OpenHarmony关系型数据库基于SQLite组件提供了一套完整的对本地数据库进行管理的机制。 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 5/2 | yes | [查看](components/relational_store/functional-overview.md) |
| `udmf` | Provide unified data management service for 3rd party app | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/1 | yes | [查看](components/udmf/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `distributeddatamgr` | [distributeddata](processes/distributeddata/foundation-runtime.md) | `datamgr_service` | 1 | [查看](processes/distributeddata/foundation-runtime.md) |
| `distributeddatamgr` | [pasteboard_service](processes/pasteboard_service/foundation-runtime.md) | `pasteboard` | 1 | [查看](processes/pasteboard_service/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
