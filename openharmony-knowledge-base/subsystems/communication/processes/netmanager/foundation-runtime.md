# netmanager：Foundation 运行时说明

> 本文件由 `generate-foundation-process-docs.sh` 生成；运行时事实来自 init 配置、SA profile 和生产可执行目标。

[返回进程节点](README.md) | [返回进程清单](../../foundation-processes.md)

## 运行定位

`netmanager` 归入 `communication` 子系统的进程层。当前源码识别到 1 条 init 服务配置、10 个 System Ability 和 3 个参与部件。

## 运行身份与启动

| 服务名 | 可执行路径 | 启动模式 | uid | gid | SELinux | 配置 |
| --- | --- | --- | --- | --- | --- | --- |
| `netmanager` | `/system/bin/sa_main /system/profile/netmanager.json` | - | net_manager | net_manager,system,shell,dhcp,netsys_socket | u:r:netmanager:s0 | [foundation/communication/netmanager_base/services/etc/init/netmanager_base.cfg](../../../../../../foundation/communication/netmanager_base/services/etc/init/netmanager_base.cfg) |

## 承载的 System Ability

| SA ID | 实现库 | run-on-create | auto-restart | 提供部件 | Profile |
| ---: | --- | --- | --- | --- | --- |
| 1151 | `libnet_conn_manager.z.so` | true | - | [communication:netmanager_base](../../../communication/components/netmanager_base/functional-overview.md) | [foundation/communication/netmanager_base/sa_profile/1151.json](../../../../../../foundation/communication/netmanager_base/sa_profile/1151.json) |
| 1152 | `libnet_policy_manager.z.so` | true | - | [communication:netmanager_base](../../../communication/components/netmanager_base/functional-overview.md) | [foundation/communication/netmanager_base/sa_profile/1152.json](../../../../../../foundation/communication/netmanager_base/sa_profile/1152.json) |
| 1153 | `libnet_stats_manager.z.so` | true | - | [communication:netmanager_base](../../../communication/components/netmanager_base/functional-overview.md) | [foundation/communication/netmanager_base/sa_profile/1153.json](../../../../../../foundation/communication/netmanager_base/sa_profile/1153.json) |
| 1154 | `libnet_tether_manager.z.so` | true | - | [communication:netmanager_base](../../../communication/components/netmanager_base/functional-overview.md) | [foundation/communication/netmanager_base/sa_profile/1154.json](../../../../../../foundation/communication/netmanager_base/sa_profile/1154.json) |
| 1155 | `libnet_vpn_manager.z.so` | false | - | [communication:netmanager_base](../../../communication/components/netmanager_base/functional-overview.md) | [foundation/communication/netmanager_base/sa_profile/1155.json](../../../../../../foundation/communication/netmanager_base/sa_profile/1155.json) |
| 1156 | `libdns_resolver_manager.z.so` | true | - | [communication:netmanager_base](../../../communication/components/netmanager_base/functional-overview.md) | [foundation/communication/netmanager_base/sa_profile/1156.json](../../../../../../foundation/communication/netmanager_base/sa_profile/1156.json) |
| 1157 | `libethernet_manager.z.so` | true | - | [communication:netmanager_base](../../../communication/components/netmanager_base/functional-overview.md) | [foundation/communication/netmanager_base/sa_profile/1157.json](../../../../../../foundation/communication/netmanager_base/sa_profile/1157.json) |
| 8300 | `libnetfirewall_manager.z.so` | false | - | [communication:netmanager_ext](../../../communication/components/netmanager_ext/functional-overview.md) | [foundation/communication/netmanager_ext/sa_profile/8300.json](../../../../../../foundation/communication/netmanager_ext/sa_profile/8300.json) |
| 8301 | `libnetworkslice_manager.z.so` | true | - | [communication:netmanager_ext](../../../communication/components/netmanager_ext/functional-overview.md) | [foundation/communication/netmanager_ext/sa_profile/8301.json](../../../../../../foundation/communication/netmanager_ext/sa_profile/8301.json) |
| 8400 | `libwearable_distributed_net_manager.z.so` | false | - | [communication:netmanager_ext](../../../communication/components/netmanager_ext/functional-overview.md) | [foundation/communication/netmanager_ext/sa_profile/8400.json](../../../../../../foundation/communication/netmanager_ext/sa_profile/8400.json) |

## 功能职责

- 装载 `libnet_conn_manager.z.so`，承载 net conn manager 相关系统能力。
- 装载 `libnet_policy_manager.z.so`，承载 net policy manager 相关系统能力。
- 装载 `libnet_stats_manager.z.so`，承载 net stats manager 相关系统能力。
- 装载 `libnet_tether_manager.z.so`，承载 net tether manager 相关系统能力。
- 装载 `libnet_vpn_manager.z.so`，承载 net vpn manager 相关系统能力。
- 装载 `libdns_resolver_manager.z.so`，承载 dns resolver manager 相关系统能力。
- 装载 `libethernet_manager.z.so`，承载 ethernet manager 相关系统能力。
- 装载 `libnetfirewall_manager.z.so`，承载 netfirewall manager 相关系统能力。
- 装载 `libnetworkslice_manager.z.so`，承载 networkslice manager 相关系统能力。
- 装载 `libwearable_distributed_net_manager.z.so`，承载 wearable distributed net manager 相关系统能力。
- [communication:netmanager_base](../../../communication/components/netmanager_base/functional-overview.md)：net manager service（sa-provider, init-owner）。
- [communication:netmanager_ext](../../../communication/components/netmanager_ext/functional-overview.md)：net manager extensive service（sa-provider）。
- [systemabilitymgr:safwk](../../../systemabilitymgr/components/safwk/functional-overview.md)：system ability framework（executable-owner）。

## 部件与进程关系

| 子系统 | 部件 | 角色 |
| --- | --- | --- |
| `communication` | [netmanager_base](../../../communication/components/netmanager_base/functional-overview.md) | sa-provider, init-owner |
| `communication` | [netmanager_ext](../../../communication/components/netmanager_ext/functional-overview.md) | sa-provider |
| `systemabilitymgr` | [safwk](../../../systemabilitymgr/components/safwk/functional-overview.md) | executable-owner |

角色含义：`init-owner` 提供启动配置，`executable-owner` 提供可执行目标，`sa-provider` 提供装载到进程中的 SA 实现。

## 可执行构建目标

- `//foundation/systemabilitymgr/safwk/services/safwk:sa_main`：[foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn)

## 生命周期判断

- 部分 SA 设置 `run-on-create=true`，进程建立后会立即创建这些能力。
- 部分 SA 设置 `run-on-create=false`，通常由访问或框架调度触发加载。

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
