# communication：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 18 个部件，其中 11 个进入当前 rk3568 产品。10 个部件包含可识别的服务/可执行程序/SA profile，12 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `bluetooth` | Provides basic Bluetooth and BLE functions for applications | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 2/5 | yes | [查看](components/bluetooth/functional-overview.md) |
| `bluetooth_service` | Provides basic Bluetooth and BLE functions for applications | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 | 0/9 | yes | [查看](components/bluetooth_service/functional-overview.md) |
| `communication_cangjie_wrapper` | The Distributed Softbus Cangjie API is a Cangjie API encapsulated on OpenHarmony based on the capabilities of the Distributed Softbus Subsystem. | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/communication_cangjie_wrapper/functional-overview.md) |
| `connected_nfc_tag` | 近距离无线通信技术(Near Field Communication，NFC) ，是一种非接触式识别和互联技术，可以在移动设备、消费类电子产品、PC和智能设备间进行近距离无线通信。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/1 | no | [查看](components/connected_nfc_tag/functional-overview.md) |
| `connectivity_cangjie_wrapper` | Provides basic Bluetooth, BLE, WIFI Cangjie API for applications | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/connectivity_cangjie_wrapper/functional-overview.md) |
| `dhcp` | The DHCP module provides DHCP client and DHCP service, used to obtain, assign and manage IP address. | 服务/运行实体 + 框架或基础库 | 0/0 | yes | [查看](components/dhcp/functional-overview.md) |
| `dsoftbus` | 分布式软总线实现近场设备间统一的分布式通信管理能力，提供不区分链路的设备间发现连接、组网和传输能力，主要功能如下： | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/53 | yes | [查看](components/dsoftbus/functional-overview.md) |
| `fusion_connectivity` | Provide fusional service for connectivity | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/3 | yes | [查看](components/fusion_connectivity/functional-overview.md) |
| `ipc` | IPC（Inter-Process Communication）与RPC（Remote Procedure Call）机制用于实现跨进程通信，不同的是前者使用Binder驱动，用于设备内的跨进程通信，而后者使用软总线驱动，用于跨设备跨进程通信。 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/6 | yes | [查看](components/ipc/functional-overview.md) |
| `netmanager_base` | 网络管理主要分为网络管理、策略管理、流量管理、网络共享、VPN管理以及以太网连接等模块，其中网络管理、策略管理、流量管理为基础服务，归档在netmanager_base仓，以太网连接、网络共享、VPN管理三个模块为可裁剪扩展模块，归档在netmanager_ext仓，netmanager_ext编译构建依赖netmanager_base库内容。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/16 | yes | [查看](components/netmanager_base/functional-overview.md) |
| `netmanager_cangjie_wrapper` | The netmanager_cangjie_wrapper is a Cangjie API encapsulated on OpenHarmony based on the capabilities of the net management Subsystem. | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/netmanager_cangjie_wrapper/functional-overview.md) |
| `netmanager_ext` | ​ 网络管理主要分为连接管理、策略管理、流量管理、网络共享、VPN管理以及以太网连接等模块，其中连接管理、策略管理、流量管理为基础服务，归档在netmanager_base仓，以太网连接、网络共享、VPN管理三个模块为可裁剪扩展模块，归档在netmanager_ext仓，netmanager_ext编译构建依赖netmanager_base库内容。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 6/17 | yes | [查看](components/netmanager_ext/functional-overview.md) |
| `netstack` | 网络协议栈模块作为电话子系统可裁剪部件，主要分为HTTP和socket模块；如图1：Http接口架构图；如图2：socket接口架构图； \| 类型 \| 接口 \| 功能说明 \| \| ---- \| ---- \| ---- \| \| ohos. | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/3 | yes | [查看](components/netstack/functional-overview.md) |
| `nfc` | NFC服务提供NFC开关控制、NFC标签发现和分发、NFC标签读写、NFC卡模拟等业务功能。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 3/5 | no | [查看](components/nfc/functional-overview.md) |
| `t2stack` | t2stack是面向智能终端场景的极简网络协议栈及其配套中间件的统称，主要提供文件、音视频流以及设备发现三大核心能力，且适配多种操作系统平台；同时，也属于软总线下面的关键传输、设备发现模块。 | 框架或基础库 + 聚合/代码生成 | 0/3 | yes | [查看](components/t2stack/functional-overview.md) |
| `wifi` | The WLAN module provides basic WLAN functions, peer-to-peer (P2P) connection, and WLAN notification, enabling your application to communicate with other devices through a WLAN. | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 | 5/39 | yes | [查看](components/wifi/functional-overview.md) |
| `wifi_aware` | 如果您想接入其它芯片，那么仅需要适配实现鸿蒙的集成接口即可，将实现放在device下。 | 框架或基础库 | 0/0 | no | [查看](components/wifi_aware/functional-overview.md) |
| `wifi_lite` | WLAN服务组件为设备提供接入与使用WLAN的相关接口，包括开启、关闭WLAN，监听WLAN状态等。 | 聚合/代码生成 | 0/0 | no | [查看](components/wifi_lite/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `communication` | [bluetooth_service](processes/bluetooth_service/foundation-runtime.md) | `bluetooth_service` | 1 | [查看](processes/bluetooth_service/foundation-runtime.md) |
| `communication` | [fusion_ranging](processes/fusion_ranging/foundation-runtime.md) | `fusion_connectivity` | 1 | [查看](processes/fusion_ranging/foundation-runtime.md) |
| `communication` | [mdnsmanager](processes/mdnsmanager/foundation-runtime.md) | `netmanager_ext` | 1 | [查看](processes/mdnsmanager/foundation-runtime.md) |
| `communication` | [netmanager](processes/netmanager/foundation-runtime.md) | `netmanager_base`, `netmanager_ext` | 10 | [查看](processes/netmanager/foundation-runtime.md) |
| `communication` | [netsysnative](processes/netsysnative/foundation-runtime.md) | `netmanager_base` | 1 | [查看](processes/netsysnative/foundation-runtime.md) |
| `communication` | [nfc_service](processes/nfc_service/foundation-runtime.md) | `nfc` | 1 | [查看](processes/nfc_service/foundation-runtime.md) |
| `communication` | [nfc_tag_service](processes/nfc_tag_service/foundation-runtime.md) | `connected_nfc_tag` | 1 | [查看](processes/nfc_tag_service/foundation-runtime.md) |
| `communication` | [partner_device_agent](processes/partner_device_agent/foundation-runtime.md) | `fusion_connectivity` | 1 | [查看](processes/partner_device_agent/foundation-runtime.md) |
| `communication` | [softbus_server](processes/softbus_server/foundation-runtime.md) | `dsoftbus` | 1 | [查看](processes/softbus_server/foundation-runtime.md) |
| `communication` | [wifi_hal_service](processes/wifi_hal_service/foundation-runtime.md) | `wifi` | 0 | [查看](processes/wifi_hal_service/foundation-runtime.md) |
| `communication` | [wifi_manager_service](processes/wifi_manager_service/foundation-runtime.md) | `dhcp`, `wifi` | 6 | [查看](processes/wifi_manager_service/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
