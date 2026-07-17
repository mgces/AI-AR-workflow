# resource_schedule_executor：Foundation 运行时说明

> 本文件由 `generate-foundation-process-docs.sh` 生成；运行时事实来自 init 配置、SA profile 和生产可执行目标。

[返回进程节点](README.md) | [返回进程清单](../../foundation-processes.md)

## 运行定位

`resource_schedule_executor` 归入 `resourceschedule` 子系统的进程层。当前源码识别到 1 条 init 服务配置、1 个 System Ability 和 2 个参与部件。

## 运行身份与启动

| 服务名 | 可执行路径 | 启动模式 | uid | gid | SELinux | 配置 |
| --- | --- | --- | --- | --- | --- | --- |
| `resource_schedule_executor` | `/system/bin/sa_main /system/profile/resource_schedule_executor.json` | - | root | root,system,battery_extra_host | u:r:resource_schedule_executor:s0 | [foundation/resourceschedule/resource_schedule_service/ressched_executor/etc/init/resource_schedule_executor.cfg](../../../../../../foundation/resourceschedule/resource_schedule_service/ressched_executor/etc/init/resource_schedule_executor.cfg) |

## 承载的 System Ability

| SA ID | 实现库 | run-on-create | auto-restart | 提供部件 | Profile |
| ---: | --- | --- | --- | --- | --- |
| 1918 | `libresschedexesvc.z.so` | true | - | [resourceschedule:resource_schedule_service](../../../resourceschedule/components/resource_schedule_service/functional-overview.md) | [foundation/resourceschedule/resource_schedule_service/ressched_executor/sa_profile/1918.json](../../../../../../foundation/resourceschedule/resource_schedule_service/ressched_executor/sa_profile/1918.json) |

## 功能职责

- 装载 `libresschedexesvc.z.so`，承载 resschedexesvc 相关系统能力。
- [resourceschedule:resource_schedule_service](../../../resourceschedule/components/resource_schedule_service/functional-overview.md)：resource schedule service（sa-provider, init-owner）。
- [systemabilitymgr:safwk](../../../systemabilitymgr/components/safwk/functional-overview.md)：system ability framework（executable-owner）。

## 部件与进程关系

| 子系统 | 部件 | 角色 |
| --- | --- | --- |
| `resourceschedule` | [resource_schedule_service](../../../resourceschedule/components/resource_schedule_service/functional-overview.md) | sa-provider, init-owner |
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
