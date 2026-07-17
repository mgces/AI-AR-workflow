# resourceschedule：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 10 个部件，其中 10 个进入当前 rk3568 产品。8 个部件包含可识别的服务/可执行程序/SA profile，10 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `background_task_mgr` | 简介 目录 短时任务 - 接口说明 - 使用说明 - 短时任务使用约束 长时任务 - 接口说明 - 使用说明 - 长时任务使用约束 能效资源 - 接口说明 - 使用说明 - 能效资源使用约束 在资源调度子系统中后台任务管理负责管理后台任务，并提供后台任务的申请、取消和查询等接口。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 3/4 | yes | [查看](components/background_task_mgr/functional-overview.md) |
| `device_standby` | 对外提供inner级别dump维测、豁免、通知接口。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/3 | yes | [查看](components/device_standby/functional-overview.md) |
| `device_usage_statistics` | 例如应用使用信息统计，用于保存和查询应用使用详情（app usage）、事件日志数据（event log）、应用分组（bundle group）情况。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 2/1 | yes | [查看](components/device_usage_statistics/functional-overview.md) |
| `ffrt` | Concurrent Programming Framework | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/3 | yes | [查看](components/ffrt/functional-overview.md) |
| `frame_aware_sched` | 智能感知调度部件位于全局资源调度管控子系统中，通过帧感知调度机制，更新进程调度分组。 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | yes | [查看](components/frame_aware_sched/functional-overview.md) |
| `memmgr` | 内存管理部件 - 简介 - 目录 - 框架 - 进程回收优先级列表 - 补充 - 回收策略/查杀策略 - 使用说明 - 参数配置说明 - availbufferSize - ZswapdParam - killConfig - nandlife - 相关仓 内存管理部件位于全局资 | 服务/运行实体 + 系统内部接口 + 框架或基础库 | 0/2 | yes | [查看](components/memmgr/functional-overview.md) |
| `qos_manager` | 权限管控服务目前服务于并发编程框架FFRT，为特定的线程提供调用底层Qos和RTG接口的能力。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/0 | yes | [查看](components/qos_manager/functional-overview.md) |
| `resource_schedule_service` | 如果需要获取系统事件，并且进行相关资源调度，那么可以选择以插件形式加入资源调度服务中。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 2/13 | yes | [查看](components/resource_schedule_service/functional-overview.md) |
| `soc_perf` | SOC统一调频部件是资源调度子系统中的部件之一，资源调度子系统提供系统事件的感知以及分发，例如应用启动、退出、亮灭屏等。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/1 | yes | [查看](components/soc_perf/functional-overview.md) |
| `work_scheduler` | 在资源调度子系统中，延迟任务调度部件给应用提供一个可以执行实时性不高的任务的机制。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/1 | yes | [查看](components/work_scheduler/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `resourceschedule` | [concurrent_task_service](processes/concurrent_task_service/foundation-runtime.md) | `qos_manager` | 1 | [查看](processes/concurrent_task_service/foundation-runtime.md) |
| `resourceschedule` | [device_usage_stats_service](processes/device_usage_stats_service/foundation-runtime.md) | `device_usage_statistics` | 0 | [查看](processes/device_usage_stats_service/foundation-runtime.md) |
| `resourceschedule` | [memmgrservice](processes/memmgrservice/foundation-runtime.md) | `memmgr` | 1 | [查看](processes/memmgrservice/foundation-runtime.md) |
| `resourceschedule` | [pin_auth_host](processes/pin_auth_host/foundation-runtime.md) | `resource_schedule_service` | 0 | [查看](processes/pin_auth_host/foundation-runtime.md) |
| `resourceschedule` | [resource_schedule_executor](processes/resource_schedule_executor/foundation-runtime.md) | `resource_schedule_service` | 1 | [查看](processes/resource_schedule_executor/foundation-runtime.md) |
| `resourceschedule` | [resource_schedule_service](processes/resource_schedule_service/foundation-runtime.md) | `background_task_mgr`, `device_standby`, `device_usage_statistics`, `resource_schedule_service`, `soc_perf`, `work_scheduler` | 6 | [查看](processes/resource_schedule_service/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
