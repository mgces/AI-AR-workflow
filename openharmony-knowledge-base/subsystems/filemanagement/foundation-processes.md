# filemanagement：Foundation 运行进程

> 本页由 `generate-foundation-process-docs.sh` 根据 init 配置和 SA profile 生成。

[返回子系统](README.md) | [功能全景](functional-overview.md)

## 进程清单

| 进程 | init 服务 | SA | 参与部件 | 启动模式 | uid | SELinux | 说明 |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| `backup_sa` | 1 | 1 | 2 | ondemand | backup | u:r:backup_sa:s0 | [查看](processes/backup_sa/foundation-runtime.md) |
| `clouddiskservice` | 1 | 1 | 2 | ondemand | 6161 | u:r:clouddiskservice:s0 | [查看](processes/clouddiskservice/foundation-runtime.md) |
| `cloudfiledaemon` | 1 | 1 | 2 | - | 1009 | u:r:cloudfiledaemon:s0 | [查看](processes/cloudfiledaemon/foundation-runtime.md) |
| `cloudfileservice` | 1 | 1 | 2 | ondemand | dfs | u:r:cloudfiledaemon:s0 | [查看](processes/cloudfileservice/foundation-runtime.md) |
| `disk_manager` | 1 | 1 | 2 | ondemand | disk_manager | u:r:disk_manager:s0 | [查看](processes/disk_manager/foundation-runtime.md) |
| `distributedfiledaemon` | 1 | 1 | 2 | ondemand | 1009 | u:r:distributedfiledaemon:s0 | [查看](processes/distributedfiledaemon/foundation-runtime.md) |
| `file_access_service` | 1 | 1 | 2 | ondemand | ufs | u:r:file_access_service:s0 | [查看](processes/file_access_service/foundation-runtime.md) |
| `storage_daemon` | 1 | 0 | 1 | boot | root | u:r:storage_daemon:s0 | [查看](processes/storage_daemon/foundation-runtime.md) |
| `storage_manager` | 1 | 1 | 2 | boot | storage_manager | u:r:storage_manager:s0 | [查看](processes/storage_manager/foundation-runtime.md) |
| `StorageSpaceMgr` | 1 | 1 | 2 | ondemand | storage_space_manager | u:r:storage_space_manager:s0 | [查看](processes/storagespacemgr/foundation-runtime.md) |

## 说明

- 进程归属优先使用 init 配置所在部件；没有 init 证据时使用可执行目标或 SA provider。
- 一个进程可以承载多个部件甚至多个子系统提供的 SA。
- 测试、示例和 CLI 工具不进入本清单。
