# resource_schedule_service：Foundation 运行时说明

> 本文件由 `generate-foundation-process-docs.sh` 生成；运行时事实来自 init 配置、SA profile 和生产可执行目标。

[返回进程节点](README.md) | [返回进程清单](../../foundation-processes.md)

## 运行定位

`resource_schedule_service` 归入 `resourceschedule` 子系统的进程层。当前源码识别到 2 条 init 服务配置、6 个 System Ability 和 7 个参与部件。

## 运行身份与启动

| 服务名 | 可执行路径 | 启动模式 | uid | gid | SELinux | 配置 |
| --- | --- | --- | --- | --- | --- | --- |
| `resource_schedule_service` | `/system/bin/sa_main /system/profile/resource_schedule_service.json` | - | ressched | ressched,system,battery_extra_host | u:r:resource_schedule_service:s0 | [foundation/resourceschedule/resource_schedule_service/ressched/etc/init/resource_schedule_service_has_nice.cfg](../../../../../../foundation/resourceschedule/resource_schedule_service/ressched/etc/init/resource_schedule_service_has_nice.cfg) |
| `resource_schedule_service` | `/system/bin/sa_main /system/profile/resource_schedule_service.json` | - | ressched | ressched,system,battery_extra_host | u:r:resource_schedule_service:s0 | [foundation/resourceschedule/resource_schedule_service/ressched/etc/init/resource_schedule_service.cfg](../../../../../../foundation/resourceschedule/resource_schedule_service/ressched/etc/init/resource_schedule_service.cfg) |

## 承载的 System Ability

| SA ID | 实现库 | run-on-create | auto-restart | 提供部件 | Profile |
| ---: | --- | --- | --- | --- | --- |
| 1901 | `libresschedsvc.z.so` | true | - | [resourceschedule:resource_schedule_service](../../../resourceschedule/components/resource_schedule_service/functional-overview.md) | [foundation/resourceschedule/resource_schedule_service/ressched/sa_profile/1901.json](../../../../../../foundation/resourceschedule/resource_schedule_service/ressched/sa_profile/1901.json) |
| 1903 | `libbgtaskmgr_service.z.so` | true | - | [resourceschedule:background_task_mgr](../../../resourceschedule/components/background_task_mgr/functional-overview.md) | [foundation/resourceschedule/background_task_mgr/sa_profile/1903.json](../../../../../../foundation/resourceschedule/background_task_mgr/sa_profile/1903.json) |
| 1904 | `libworkschedservice.z.so` | true | - | [resourceschedule:work_scheduler](../../../resourceschedule/components/work_scheduler/functional-overview.md) | [foundation/resourceschedule/work_scheduler/sa_profile/1904.json](../../../../../../foundation/resourceschedule/work_scheduler/sa_profile/1904.json) |
| 1906 | `libsocperf_server.z.so` | true | - | [resourceschedule:soc_perf](../../../resourceschedule/components/soc_perf/functional-overview.md) | [foundation/resourceschedule/soc_perf/sa_profile/1906.json](../../../../../../foundation/resourceschedule/soc_perf/sa_profile/1906.json) |
| 1907 | `libusagestatservice.z.so` | true | - | [resourceschedule:device_usage_statistics](../../../resourceschedule/components/device_usage_statistics/functional-overview.md) | [foundation/resourceschedule/device_usage_statistics/sa_profile/1907.json](../../../../../../foundation/resourceschedule/device_usage_statistics/sa_profile/1907.json) |
| 1914 | `libstandby_service.z.so` | true | - | [resourceschedule:device_standby](../../../resourceschedule/components/device_standby/functional-overview.md) | [foundation/resourceschedule/device_standby/sa_profile/1914.json](../../../../../../foundation/resourceschedule/device_standby/sa_profile/1914.json) |

## 功能职责

- 装载 `libresschedsvc.z.so`，承载 resschedsvc 相关系统能力。
- 装载 `libbgtaskmgr_service.z.so`，承载 bgtaskmgr service 相关系统能力。
- 装载 `libworkschedservice.z.so`，承载 workschedservice 相关系统能力。
- 装载 `libsocperf_server.z.so`，承载 socperf server 相关系统能力。
- 装载 `libusagestatservice.z.so`，承载 usagestatservice 相关系统能力。
- 装载 `libstandby_service.z.so`，承载 standby service 相关系统能力。
- [resourceschedule:background_task_mgr](../../../resourceschedule/components/background_task_mgr/functional-overview.md)：background task manager service（sa-provider）。
- [resourceschedule:device_standby](../../../resourceschedule/components/device_standby/functional-overview.md)：device_standby（sa-provider）。
- [resourceschedule:device_usage_statistics](../../../resourceschedule/components/device_usage_statistics/functional-overview.md)：device usage statistics（sa-provider）。
- [resourceschedule:resource_schedule_service](../../../resourceschedule/components/resource_schedule_service/functional-overview.md)：resource schedule service（sa-provider, init-owner）。
- [systemabilitymgr:safwk](../../../systemabilitymgr/components/safwk/functional-overview.md)：system ability framework（executable-owner）。
- [resourceschedule:soc_perf](../../../resourceschedule/components/soc_perf/functional-overview.md)：resource schedule service（sa-provider）。
- [resourceschedule:work_scheduler](../../../resourceschedule/components/work_scheduler/functional-overview.md)：work scheduler service（sa-provider）。

## 部件与进程关系

| 子系统 | 部件 | 角色 |
| --- | --- | --- |
| `resourceschedule` | [background_task_mgr](../../../resourceschedule/components/background_task_mgr/functional-overview.md) | sa-provider |
| `resourceschedule` | [device_standby](../../../resourceschedule/components/device_standby/functional-overview.md) | sa-provider |
| `resourceschedule` | [device_usage_statistics](../../../resourceschedule/components/device_usage_statistics/functional-overview.md) | sa-provider |
| `resourceschedule` | [resource_schedule_service](../../../resourceschedule/components/resource_schedule_service/functional-overview.md) | sa-provider, init-owner |
| `resourceschedule` | [soc_perf](../../../resourceschedule/components/soc_perf/functional-overview.md) | sa-provider |
| `resourceschedule` | [work_scheduler](../../../resourceschedule/components/work_scheduler/functional-overview.md) | sa-provider |
| `systemabilitymgr` | [safwk](../../../systemabilitymgr/components/safwk/functional-overview.md) | executable-owner |

角色含义：`init-owner` 提供启动配置，`executable-owner` 提供可执行目标，`sa-provider` 提供装载到进程中的 SA 实现。

## 可执行构建目标

- `//foundation/systemabilitymgr/safwk/services/safwk:sa_main`：[foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn)

## 生命周期判断

- 部分 SA 设置 `run-on-create=true`，进程建立后会立即创建这些能力。

## 安全与验证重点

- 核对 init 中的 uid、gid、SELinux domain、permission 与实际访问资源一致。
- 核对 SA ID、实现库和宿主进程配置一致，避免 profile 安装但进程无法装载。
- 对按需启动进程验证首次调用、并发加载、失败回调、死亡重启和资源回收。
- 对跨部件宿主进程评估单个 SA 异常对同进程其他能力的影响。
- 真机验证应结合 `ps`、`hidumper -ls`、SA 查询、hilog 和进程 SELinux 上下文。

## 扫描边界

- 本页只纳入生产路径中的有效 JSON init 配置和 SA profile。
- 测试、示例、benchmark、CLI 工具不会建立生产进程节点。
- 条件编译可能选择不同 init/profile 变体，因此同一进程可能出现多条配置证据。
