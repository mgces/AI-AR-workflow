# netmanager_ext 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

​ 网络管理主要分为连接管理、策略管理、流量管理、网络共享、VPN管理以及以太网连接等模块，其中连接管理、策略管理、流量管理为基础服务，归档在netmanager_base仓，以太网连接、网络共享、VPN管理三个模块为可裁剪扩展模块，归档在netmanager_ext仓，netmanager_ext编译构建依赖netmanager_base库内容。如图1：网络管理架构图；

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2MB / 500KB |
| 源码仓 | `foundation/communication/netmanager_ext` |

## 核心能力

- **Communication Net Manager Ethernet**：提供“net manager ethernet”能力，系统能力标识为 `SystemCapability.Communication.NetManager.Ethernet`。
- **Communication Net Manager Net Sharing**：提供“net manager net sharing”能力，系统能力标识为 `SystemCapability.Communication.NetManager.NetSharing`。
- **Communication Net Manager MDNS**：提供“net manager mdns”能力，系统能力标识为 `SystemCapability.Communication.NetManager.MDNS`。
- **Communication Net Manager Vpn**：提供“net manager vpn”能力，系统能力标识为 `SystemCapability.Communication.NetManager.Vpn`。
- **Communication Net Manager Net Firewall**：提供“net manager net firewall”能力，系统能力标识为 `SystemCapability.Communication.NetManager.NetFirewall`。
- **Communication Net Manager Eap = false**：提供“net manager eap = false”能力，系统能力标识为 `SystemCapability.Communication.NetManager.Eap = false`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `netmanager_ext_feature_coverage`：netmanager ext 功能 覆盖率。
- `netmanager_ext_feature_ethernet`：netmanager ext 功能 ethernet。
- `netmanager_ext_feature_share`：netmanager ext 功能 share。
- `netmanager_ext_feature_mdns`：netmanager ext 功能 mdns。
- `netmanager_ext_feature_sysvpn`：netmanager ext 功能 sysvpn。
- `netmanager_ext_feature_vpn`：netmanager ext 功能 vpn。
- `netmanager_ext_feature_vpnext`：netmanager ext 功能 vpnext。
- `netmanager_ext_feature_net_firewall`：netmanager ext 功能 net firewall。
- `netmanager_ext_feature_wearable_distributed_net`：netmanager ext 功能 wearable distributed net。
- `netmanager_ext_feature_vpn_for_user0`：netmanager ext 功能 vpn for user0。
- `netmanager_ext_share_traffic_limit_enable`：netmanager ext share traffic limit 启用。
- `netmanager_ext_feature_networkslice`：netmanager ext 功能 networkslice。
- `netmanager_ext_feature_iface_supplier_id`：netmanager ext 功能 iface supplier id。
- `netmanager_ext_extensible_authentication`：netmanager ext extensible authentication。
- `netmanager_ext_share_notification_enable`：netmanager ext share notification 启用。
- `netmanager_ext_fpga_mode_enable`：netmanager ext fpga mode 启用。
- `netmanager_ext_feature_read_ccm_json`：netmanager ext 功能 read ccm json。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/netmanager_ext/interfaces](../../../../../../foundation/communication/netmanager_ext/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 39 | `innerkits`, `kits` |
| [foundation/communication/netmanager_ext/frameworks](../../../../../../foundation/communication/netmanager_ext/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 31 | `c`, `ets`, `js`, `native`, `vpn_dialog` |
| [foundation/communication/netmanager_ext/services](../../../../../../foundation/communication/netmanager_ext/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 28 | `etc`, `ethernetmanager`, `mdnsmanager`, `netfirewallmanager`, `networksharemanager`, `networkslicemanager`, `vpnmanager`, `wearabledistributednetmanager` |
| [foundation/communication/netmanager_ext/sa_profile](../../../../../../foundation/communication/netmanager_ext/sa_profile) | System Ability 注册信息及进程装载配置。 | 5 | - |
| [foundation/communication/netmanager_ext/utils](../../../../../../foundation/communication/netmanager_ext/utils) | 跨模块复用的基础工具和通用数据结构。 | 3 | `event_report` |
| [foundation/communication/netmanager_ext/resource](../../../../../../foundation/communication/netmanager_ext/resource) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | - |
| [foundation/communication/netmanager_ext/tools](../../../../../../foundation/communication/netmanager_ext/tools) | 开发、诊断、命令行或构建辅助工具。 | 1 | `ohos-networkShare` |

## 对外与内部接口

该部件声明 9 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/netmanager_ext/interfaces/innerkits/netshareclient:net_tether_manager_if` | `//foundation/communication/netmanager_ext/interfaces/innerkits` | `netshareclient/include/networkshare_client.h`, `netshareclient/include/networkshare_constants.h`, `netshareclient/include/proxy/ipccallback/sharing_event_callback_stub.h` |
| `//foundation/communication/netmanager_ext/interfaces/innerkits/ethernetclient:ethernet_manager_if` | `//foundation/communication/netmanager_ext/interfaces/innerkits` | `ethernetclient/include/ethernet_client.h` |
| `//foundation/communication/netmanager_ext/interfaces/innerkits/mdnsclient:mdns_manager_if` | `//foundation/communication/netmanager_ext/interfaces/innerkits` | `mdnsclient/include/mdns_client.h` |
| `//foundation/communication/netmanager_ext/interfaces/innerkits/vpnextension:vpn_extension_module` | `//foundation/communication/netmanager_ext/interfaces/innerkits` | `vpnextension/include/vpn_extension_module_loader.h` |
| `//foundation/communication/netmanager_ext/interfaces/innerkits/netvpnclient:net_vpn_manager_if` | `//foundation/communication/netmanager_ext/interfaces/innerkits` | `netvpnclient/include/networkvpn_client.h` |
| `//foundation/communication/netmanager_ext/interfaces/innerkits/netfirewallclient:netfirewall_manager_if` | `//foundation/communication/netmanager_ext/interfaces/innerkits` | `netfirewallclient/include/netfirewall_client.h` |
| `//foundation/communication/netmanager_ext/interfaces/innerkits/wearabledistributednetclient:wearable_distributed_net_manager_if` | `//foundation/communication/netmanager_ext/interfaces/innerkits` | `wearabledistributednetclient/include/wearable_distributed_net_client.h` |
| `//foundation/communication/netmanager_ext/interfaces/innerkits/networksliceclient:networkslice_manager_if` | `//foundation/communication/netmanager_ext/interfaces/innerkits` | `networksliceclient/include/networkslice_client.h` |
| `//foundation/communication/netmanager_ext/interfaces/innerkits/netvpnclient:net_vpn_permission_if` | `//foundation/communication/netmanager_ext/interfaces/innerkits` | `netvpnclient/include/networkvpn_permission_client.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `communication` | [mdnsmanager](../../processes/mdnsmanager/foundation-runtime.md) | 启动配置, SA 实现 | `1161` | `libmdns_manager.z.so` |
| `communication` | [netmanager](../../processes/netmanager/foundation-runtime.md) | SA 实现 | `8300`, `8301`, `8400` | `libnetfirewall_manager.z.so`, `libnetworkslice_manager.z.so`, `libwearable_distributed_net_manager.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_hap` | `//foundation/communication/netmanager_ext/frameworks/vpn_dialog/dialog_ui/vpn_dialog:dialog_hap` | [foundation/communication/netmanager_ext/frameworks/vpn_dialog/dialog_ui/vpn_dialog/BUILD.gn](../../../../../../foundation/communication/netmanager_ext/frameworks/vpn_dialog/dialog_ui/vpn_dialog/BUILD.gn) |
| `ohos_app_scope` | `//foundation/communication/netmanager_ext/frameworks/vpn_dialog/dialog_ui/vpn_dialog:vpn_dialog_app_profile` | [foundation/communication/netmanager_ext/frameworks/vpn_dialog/dialog_ui/vpn_dialog/BUILD.gn](../../../../../../foundation/communication/netmanager_ext/frameworks/vpn_dialog/dialog_ui/vpn_dialog/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/communication/netmanager_ext/sa_profile:net_manager_ext_profile` | [foundation/communication/netmanager_ext/sa_profile/BUILD.gn](../../../../../../foundation/communication/netmanager_ext/sa_profile/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/communication/netmanager_ext/sa_profile:mdns_manager_profile` | [foundation/communication/netmanager_ext/sa_profile/BUILD.gn](../../../../../../foundation/communication/netmanager_ext/sa_profile/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/communication/netmanager_ext/sa_profile:netfirewall_manager_profile` | [foundation/communication/netmanager_ext/sa_profile/BUILD.gn](../../../../../../foundation/communication/netmanager_ext/sa_profile/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/communication/netmanager_ext/sa_profile:wearable_distributed_net_manager_profile` | [foundation/communication/netmanager_ext/sa_profile/BUILD.gn](../../../../../../foundation/communication/netmanager_ext/sa_profile/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/communication/netmanager_ext/sa_profile:networkslice_manager_profile` | [foundation/communication/netmanager_ext/sa_profile/BUILD.gn](../../../../../../foundation/communication/netmanager_ext/sa_profile/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/communication/netmanager_ext/tools/ohos-networkShare:ohos-networkShare` | [foundation/communication/netmanager_ext/tools/ohos-networkShare/BUILD.gn](../../../../../../foundation/communication/netmanager_ext/tools/ohos-networkShare/BUILD.gn) |

生产库形态：`ohos_shared_library` 30 个，`ohos_static_library` 16 个，`ohos_ndk_library` 1 个，`ohos_rust_shared_library` 1 个。

## 依赖与协作边界

该部件声明 44 个组件依赖和 0 个三方依赖。

- 系统组件协作：`bounds_checking_function`, `ipc`, `safwk`, `napi`, `dhcp`, `hilog`, `netmanager_base`, `eventhandler`, `bluetooth`, `hisysevent`, `huks`, `c_utils`, `samgr`, `usb_manager`, `drivers_interface_usb`, `wifi`, `bundle_framework`, `ability_runtime`, `access_token`, `cJSON`, `common_event_service`, `hitrace`, `window_manager`, `ability_base`, `os_account`, `relational_store`, `preferences`, `ffrt`, `hicollie`, `init`, `battery_manager`, `openssl`, `time_service`, `data_share`, `core_service`, `cellular_data`, `hdf_core`, `drivers_interface_ethernet`, `libxml2`, `json`, `hiappevent`, `runtime_core`, `rust_cxx`, `config_policy`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 48 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`group` 32 个，`ohos_unittest` 10 个，`ohos_fuzztest` 6 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/netmanager_ext/bundle.json](../../../../../../foundation/communication/netmanager_ext/bundle.json)
- 原始源码 README：[foundation/communication/netmanager_ext/README_zh.md](../../../../../../foundation/communication/netmanager_ext/README_zh.md)、[foundation/communication/netmanager_ext/README.md](../../../../../../foundation/communication/netmanager_ext/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
