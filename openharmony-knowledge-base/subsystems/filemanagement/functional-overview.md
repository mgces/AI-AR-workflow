# filemanagement：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 7 个部件，其中 6 个进入当前 rk3568 产品。5 个部件包含可识别的服务/可执行程序/SA profile，7 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `app_file_service` | App file service provides sharing and file management for apps | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 3/0 | yes | [查看](components/app_file_service/functional-overview.md) |
| `dfs_service` | It provides the ability of accessing distributed files. | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 2/5 | yes | [查看](components/dfs_service/functional-overview.md) |
| `disk_manager` | Disk manager system ability: volume and disk management, callbacks from storage_daemon, and related inner APIs. | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | yes | [查看](components/disk_manager/functional-overview.md) |
| `file_api` | provides the application with JS interfaces for IO | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 4/2 | yes | [查看](components/file_api/functional-overview.md) |
| `filemanagement_cangjie_wrapper` | The filemanagement_cangjie_wrapper is a Cangjie API encapsulated on OpenHarmony based on the capabilities of the file management Subsystem. | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/filemanagement_cangjie_wrapper/functional-overview.md) |
| `storage_service` | Storage service provides basic storage inquiry and management for the system and apps. | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 3/11 | yes | [查看](components/storage_service/functional-overview.md) |
| `user_file_service` | filemanagement is the module of OpenHarmony that provides storage and file management. | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 3/1 | yes | [查看](components/user_file_service/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `filemanagement` | [backup_sa](processes/backup_sa/foundation-runtime.md) | `app_file_service` | 1 | [查看](processes/backup_sa/foundation-runtime.md) |
| `filemanagement` | [clouddiskservice](processes/clouddiskservice/foundation-runtime.md) | `dfs_service` | 1 | [查看](processes/clouddiskservice/foundation-runtime.md) |
| `filemanagement` | [cloudfiledaemon](processes/cloudfiledaemon/foundation-runtime.md) | `dfs_service` | 1 | [查看](processes/cloudfiledaemon/foundation-runtime.md) |
| `filemanagement` | [cloudfileservice](processes/cloudfileservice/foundation-runtime.md) | `dfs_service` | 1 | [查看](processes/cloudfileservice/foundation-runtime.md) |
| `filemanagement` | [disk_manager](processes/disk_manager/foundation-runtime.md) | `disk_manager` | 1 | [查看](processes/disk_manager/foundation-runtime.md) |
| `filemanagement` | [distributedfiledaemon](processes/distributedfiledaemon/foundation-runtime.md) | `dfs_service` | 1 | [查看](processes/distributedfiledaemon/foundation-runtime.md) |
| `filemanagement` | [file_access_service](processes/file_access_service/foundation-runtime.md) | `user_file_service` | 1 | [查看](processes/file_access_service/foundation-runtime.md) |
| `filemanagement` | [storage_daemon](processes/storage_daemon/foundation-runtime.md) | `storage_service` | 0 | [查看](processes/storage_daemon/foundation-runtime.md) |
| `filemanagement` | [storage_manager](processes/storage_manager/foundation-runtime.md) | `storage_service` | 1 | [查看](processes/storage_manager/foundation-runtime.md) |
| `filemanagement` | [StorageSpaceMgr](processes/storagespacemgr/foundation-runtime.md) | `storage_service` | 1 | [查看](processes/storagespacemgr/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
