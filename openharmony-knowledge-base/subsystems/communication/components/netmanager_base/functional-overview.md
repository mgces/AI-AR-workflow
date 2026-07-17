# netmanager_base 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

网络管理主要分为网络管理、策略管理、流量管理、网络共享、VPN管理以及以太网连接等模块，其中网络管理、策略管理、流量管理为基础服务，归档在netmanager_base仓，以太网连接、网络共享、VPN管理三个模块为可裁剪扩展模块，归档在netmanager_ext仓，netmanager_ext编译构建依赖netmanager_base库内容。如图1：网络管理架构图； javascript import statistics from '@ohos.net.statistics'

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 4.5MB / 10MB |
| 源码仓 | `foundation/communication/netmanager_base` |

## 核心能力

- **Communication Net Manager Core**：提供“net manager core”能力，系统能力标识为 `SystemCapability.Communication.NetManager.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `netmanager_base_enable_netsys_access_policy_diag_listen`：netmanager base 启用 netsys access policy diag listen。
- `netmanager_base_enable_feature_net_firewall`：netmanager base 启用 功能 net firewall。
- `netmanager_base_enable_feature_wearable_distributed_net`：netmanager base 启用 功能 wearable distributed net。
- `netmanager_base_enable_feature_sysvpn`：netmanager base 启用 功能 sysvpn。
- `netmanager_base_enable_feature_hosts`：netmanager base 启用 功能 hosts。
- `netmanager_base_feature_support_powermanager`：netmanager base 功能 支持 电源协同manager。
- `netmanager_base_enable_public_dns_server`：netmanager base 启用 public dns server。
- `netmanager_base_support_ebpf_memory_miniaturization`：netmanager base 支持 ebpf memory miniaturization。
- `netmanager_base_enable_traffic_statistic`：netmanager base 启用 traffic statistic。
- `netmanager_base_extended_features`：netmanager base extended 功能s。
- `netmanager_base_enable_pac_proxy`：netmanager base 启用 pac proxy。
- `netmanager_base_share_traffic_limit_enable`：netmanager base share traffic limit 启用。
- `netmanager_base_enable_set_app_frozened`：netmanager base 启用 set app frozened。
- `netmanager_base_feature_enterprise_route_custom`：netmanager base 功能 enterprise route custom。
- `netmanager_base_fpga_mode_enable`：netmanager base fpga mode 启用。
- `netmanager_base_update_netcap`：netmanager base update netcap。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/netmanager_base/services](../../../../../../foundation/communication/netmanager_base/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 71 | `common`, `etc`, `netconnmanager`, `netmanagernative`, `netpolicymanager`, `netstatslimitntf`, `netstatsmanager`, `netsyscontroller` |
| [foundation/communication/netmanager_base/frameworks](../../../../../../foundation/communication/netmanager_base/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 25 | `cj`, `ets`, `js`, `native` |
| [foundation/communication/netmanager_base/interfaces](../../../../../../foundation/communication/netmanager_base/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 23 | `innerkits`, `kits` |
| [foundation/communication/netmanager_base/utils](../../../../../../foundation/communication/netmanager_base/utils) | 跨模块复用的基础工具和通用数据结构。 | 9 | `bundle_utils`, `common_utils`, `data_share`, `errorcode_utils`, `napi_utils` |
| [foundation/communication/netmanager_base/common](../../../../../../foundation/communication/netmanager_base/common) | 组件内部共享的公共定义、工具和基础实现。 | 7 | `ani_rs`, `ani_rs_macros`, `ani_sys`, `ani_test`, `docs` |
| [foundation/communication/netmanager_base/resource](../../../../../../foundation/communication/netmanager_base/resource) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | - |
| [foundation/communication/netmanager_base/sa_profile](../../../../../../foundation/communication/netmanager_base/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/communication/netmanager_base/bpf](../../../../../../foundation/communication/netmanager_base/bpf) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `bpf_loader`, `bpf_progs`, `bpf_reader`, `bpf_syscall_wrapper` |

## 对外与内部接口

该部件声明 19 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/netmanager_base/interfaces/innerkits/netconnclient:net_conn_manager_if` | `//foundation/communication/netmanager_base/interfaces/innerkits/netconnclient/include` | `net_conn_client.h`, `net_link_info.h`, `net_supplier_info.h`, `net_specifier.h`, `route.h` |
| `//foundation/communication/netmanager_base/interfaces/innerkits/netconnclient:net_security_config_if` | `//foundation/communication/netmanager_base/interfaces/innerkits/netconnclient/include` | `network_security_config.h` |
| `//foundation/communication/netmanager_base/interfaces/innerkits/netconnclient:socket_permission` | `//foundation/communication/netmanager_base/interfaces/innerkits/netconnclient/include` | `socket_permission.h` |
| `//foundation/communication/netmanager_base/interfaces/innerkits/netpolicyclient:net_policy_manager_if` | `//foundation/communication/netmanager_base/interfaces/innerkits/netpolicyclient/include` | `net_policy_client.h` |
| `//foundation/communication/netmanager_base/interfaces/innerkits/netstatsclient:net_stats_manager_if` | `//foundation/communication/netmanager_base/interfaces/innerkits/netstatsclient/include` | `net_stats_info.h`, `net_stats_client.h` |
| `//foundation/communication/netmanager_base/interfaces/innerkits/netmanagernative:net_native_manager_if` | `//foundation/communication/netmanager_base/interfaces/innerkits/netmanagernative/include` | `netsys_native_service_proxy.h` |
| `//foundation/communication/netmanager_base/utils/napi_utils:napi_utils` | `//foundation/communication/netmanager_base/utils/napi_utils/include` | `napi_utils.h` |
| `//foundation/communication/netmanager_base/utils:net_manager_common` | `//foundation/communication/netmanager_base/utils/common_utils/include` | `base64_utils.h`, `netmanager_base_common_utils.h`, `netmanager_base_permission.h` |
| `//foundation/communication/netmanager_base/utils:net_data_share` | `//foundation/communication/netmanager_base/utils/data_share/include` | - |
| `//foundation/communication/netmanager_base/utils:net_bundle_utils` | `//foundation/communication/netmanager_base/utils/bundle_utils/include` | - |
| `//foundation/communication/netmanager_base/interfaces/innerkits/netconnclient:net_conn_parcel` | `//foundation/communication/netmanager_base/interfaces/innerkits/netconnclient/include` | `http_proxy.h`, `net_all_capabilities.h`, `net_interface_config.h`, `net_link_info.h`, `net_specifier.h`, `net_supplier_info.h`, `route.h` |
| `//foundation/communication/netmanager_base/services/common:net_service_common` | `//foundation/communication/netmanager_base/services/common/include` | `broadcast_manager.h`, `net_manager_center.h`, `net_settings.h`, `route_utils.h` |
| `//foundation/communication/netmanager_base/services/netsyscontroller:netsys_controller` | `//foundation/communication/netmanager_base/services/netsyscontroller/include` | `netsys_controller.h`, `netsys_controller_service_impl.h`, `netsys_native_client.h` |
| `//foundation/communication/netmanager_base/services/netmanagernative/fwmarkclient:fwmark_client` | `//foundation/communication/netmanager_base/services/netmanagernative/fwmarkclient/include` | `fwmark_client.h` |
| `//foundation/communication/netmanager_base/services/netmanagernative:netsys_client` | `//foundation/communication/netmanager_base/services/netmanagernative/include/netsys` | `netsys_client.h` |
| `//foundation/communication/netmanager_base/frameworks/js/napi/connection:connection_if` | `//foundation/communication/netmanager_base/frameworks/js/napi/connection` | - |
| `//foundation/communication/netmanager_base/frameworks/cj/connection:cj_net_connection_ffi` | `//foundation/communication/netmanager_base/frameworks/cj/connection/include` | - |
| `//foundation/communication/netmanager_base/frameworks/cj/statistics:cj_net_statistics_ffi` | `//foundation/communication/netmanager_base/frameworks/cj/statistics/include` | - |
| `//foundation/communication/netmanager_base/common/ani_rs:ani_rs` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `communication` | [netmanager](../../processes/netmanager/foundation-runtime.md) | 启动配置, SA 实现 | `1151`, `1152`, `1153`, `1154`, `1155`, `1156`, `1157` | `libnet_conn_manager.z.so`, `libnet_policy_manager.z.so`, `libnet_stats_manager.z.so`, `libnet_tether_manager.z.so`, `libnet_vpn_manager.z.so`, `libdns_resolver_manager.z.so`, `libethernet_manager.z.so` |
| `communication` | [netsysnative](../../processes/netsysnative/foundation-runtime.md) | 启动配置, SA 实现 | `1158` | `libnetsys_native_manager.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/communication/netmanager_base/sa_profile:net_manager_profile` | [foundation/communication/netmanager_base/sa_profile/BUILD.gn](../../../../../../foundation/communication/netmanager_base/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/netmanager_base/services/common:net_service_common` | [foundation/communication/netmanager_base/services/common/BUILD.gn](../../../../../../foundation/communication/netmanager_base/services/common/BUILD.gn) |

生产库形态：`ohos_shared_library` 29 个，`ohos_static_library` 16 个，`ohos_rust_shared_library` 3 个，`ohos_rust_static_library` 2 个。

## 依赖与协作边界

该部件声明 51 个组件依赖和 0 个三方依赖。

- 系统组件协作：`bounds_checking_function`, `ipc`, `safwk`, `hilog`, `dhcp`, `hicollie`, `eventhandler`, `ability_base`, `access_token`, `hitrace`, `hisysevent`, `cJSON`, `c_utils`, `samgr`, `libuv`, `curl`, `jerryscript`, `init`, `ffrt`, `common_event_service`, `ability_runtime`, `data_share`, `napi`, `bundle_framework`, `relational_store`, `openssl`, `selinux`, `sqlite`, `os_account`, `libbpf`, `elfio`, `iptables`, `power_manager`, `cellular_data`, `core_service`, `distributed_notification_service`, `i18n`, `netmanager_ext`, `jsoncpp`, `qos_manager`, `runtime_core`, `time_service`, `faultloggerd`, `hiappevent`, `config_policy`, `ace_engine`, `ylong_runtime`, `rust_bindgen`, `rust_cxx`, `icu`, `state_registry`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 83 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_unittest` 54 个，`group` 19 个，`ohos_fuzztest` 8 个，`ohos_rust_shared_library` 1 个，`ohos_executable` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/netmanager_base/bundle.json](../../../../../../foundation/communication/netmanager_base/bundle.json)
- 原始源码 README：[foundation/communication/netmanager_base/README_zh.md](../../../../../../foundation/communication/netmanager_base/README_zh.md)、[foundation/communication/netmanager_base/README.md](../../../../../../foundation/communication/netmanager_base/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
