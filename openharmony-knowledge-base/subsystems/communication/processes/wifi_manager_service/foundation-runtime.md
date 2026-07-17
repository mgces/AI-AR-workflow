# wifi_manager_service：Foundation 运行时说明

> 本文件由 `generate-foundation-process-docs.sh` 生成；运行时事实来自 init 配置、SA profile 和生产可执行目标。

[返回进程节点](README.md) | [返回进程清单](../../foundation-processes.md)

## 运行定位

`wifi_manager_service` 归入 `communication` 子系统的进程层。当前源码识别到 1 条 init 服务配置、6 个 System Ability 和 3 个参与部件。

## 运行身份与启动

| 服务名 | 可执行路径 | 启动模式 | uid | gid | SELinux | 配置 |
| --- | --- | --- | --- | --- | --- | --- |
| `wifi_manager_service` | `/system/bin/sa_main /system/profile/wifi_manager_service.json` | ondemand | wifi | wifi,shell,dhcp,netsys_socket | u:r:wifi_manager_service:s0 | [foundation/communication/wifi/wifi/services/wifi_standard/etc/init/wifi_standard.cfg](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/etc/init/wifi_standard.cfg) |

## 承载的 System Ability

| SA ID | 实现库 | run-on-create | auto-restart | 提供部件 | Profile |
| ---: | --- | --- | --- | --- | --- |
| 1120 | `libwifi_device_ability.z.so` | false | true | [communication:wifi](../../../communication/components/wifi/functional-overview.md) | [foundation/communication/wifi/wifi/services/wifi_standard/sa_profile/1120.json](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/sa_profile/1120.json) |
| 1121 | `libwifi_hotspot_ability.z.so` | false | true | [communication:wifi](../../../communication/components/wifi/functional-overview.md) | [foundation/communication/wifi/wifi/services/wifi_standard/sa_profile/1121.json](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/sa_profile/1121.json) |
| 1123 | `libwifi_p2p_ability.z.so` | false | true | [communication:wifi](../../../communication/components/wifi/functional-overview.md) | [foundation/communication/wifi/wifi/services/wifi_standard/sa_profile/1123.json](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/sa_profile/1123.json) |
| 1124 | `libwifi_scan_ability.z.so` | false | true | [communication:wifi](../../../communication/components/wifi/functional-overview.md) | [foundation/communication/wifi/wifi/services/wifi_standard/sa_profile/1124.json](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/sa_profile/1124.json) |
| 1126 | `libdhcp_client.z.so` | false | true | [communication:dhcp](../../../communication/components/dhcp/functional-overview.md) | [foundation/communication/dhcp/services/sa_profile/1126.json](../../../../../../foundation/communication/dhcp/services/sa_profile/1126.json) |
| 1127 | `libdhcp_server.z.so` | false | true | [communication:dhcp](../../../communication/components/dhcp/functional-overview.md) | [foundation/communication/dhcp/services/sa_profile/1127.json](../../../../../../foundation/communication/dhcp/services/sa_profile/1127.json) |

## 功能职责

- 装载 `libwifi_device_ability.z.so`，承载 wifi device ability 相关系统能力。
- 装载 `libwifi_hotspot_ability.z.so`，承载 wifi hotspot ability 相关系统能力。
- 装载 `libwifi_p2p_ability.z.so`，承载 wifi p2p ability 相关系统能力。
- 装载 `libwifi_scan_ability.z.so`，承载 wifi scan ability 相关系统能力。
- 装载 `libdhcp_client.z.so`，承载 dhcp client 相关系统能力。
- 装载 `libdhcp_server.z.so`，承载 dhcp server 相关系统能力。
- [communication:dhcp](../../../communication/components/dhcp/functional-overview.md)：The DHCP module provides DHCP client and DHCP service, used to obtain, assign and manage IP address.（sa-provider）。
- [systemabilitymgr:safwk](../../../systemabilitymgr/components/safwk/functional-overview.md)：system ability framework（executable-owner）。
- [communication:wifi](../../../communication/components/wifi/functional-overview.md)：The WLAN module provides basic WLAN functions, peer-to-peer (P2P) connection, and WLAN notification, enabling your application to communicate with other devices through a WLAN.（sa-provider, init-owner, executable-owner）。

## 部件与进程关系

| 子系统 | 部件 | 角色 |
| --- | --- | --- |
| `communication` | [dhcp](../../../communication/components/dhcp/functional-overview.md) | sa-provider |
| `communication` | [wifi](../../../communication/components/wifi/functional-overview.md) | sa-provider, init-owner, executable-owner |
| `systemabilitymgr` | [safwk](../../../systemabilitymgr/components/safwk/functional-overview.md) | executable-owner |

角色含义：`init-owner` 提供启动配置，`executable-owner` 提供可执行目标，`sa-provider` 提供装载到进程中的 SA 实现。

## 可执行构建目标

- `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage:wifi_manager_service`：[foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/BUILD.gn)
- `//foundation/systemabilitymgr/safwk/services/safwk:sa_main`：[foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn)

## 生命周期判断

- init 配置包含按需启动，首次访问相关能力时可能触发进程创建。
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
