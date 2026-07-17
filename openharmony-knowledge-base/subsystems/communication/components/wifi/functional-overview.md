# wifi 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The WLAN module provides basic WLAN functions, peer-to-peer (P2P) connection, and WLAN notification, enabling your application to communicate with other devices through a WLAN.

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/communication/wifi` |

## 核心能力

- **Communication Wi Fi STA**：提供“wi fi sta”能力，系统能力标识为 `SystemCapability.Communication.WiFi.STA`。
- **Communication Wi Fi AP Core**：提供“ap core”能力，系统能力标识为 `SystemCapability.Communication.WiFi.AP.Core`。
- **Communication Wi Fi P2 P**：提供“wi fi p2 p”能力，系统能力标识为 `SystemCapability.Communication.WiFi.P2P`。
- **Communication Wi Fi Core**：提供“wi fi core”能力，系统能力标识为 `SystemCapability.Communication.WiFi.Core`。
- **Communication Wi Fi AP Extension = false**：提供“ap extension = false”能力，系统能力标识为 `SystemCapability.Communication.WiFi.AP.Extension = false`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `wifi_feature_dynamic_unload_sa`：wifi 功能 dynamic unload sa。
- `wifi_feature_with_p2p`：wifi 功能 with p2p。
- `wifi_feature_with_ap_intf`：wifi 功能 with ap intf。
- `wifi_feature_with_ap_num`：wifi 功能 with ap num。
- `wifi_feature_with_sta_num`：wifi 功能 with sta num。
- `wifi_feature_with_auth_disable`：wifi 功能 with auth disable。
- `wifi_feature_with_dhcp_disable`：wifi 功能 with dhcp disable。
- `wifi_feature_with_encryption`：wifi 功能 with encryption。
- `wifi_feature_with_ap_extension`：wifi 功能 with ap extension。
- `wifi_feature_with_app_frozen`：wifi 功能 with app frozen。
- `wifi_feature_non_seperate_p2p`：wifi 功能 non seperate p2p。
- `wifi_feature_p2p_random_mac_addr`：wifi 功能 p2p random mac addr。
- `wifi_feature_non_hdf_driver`：wifi 功能 non hdf driver。
- `wifi_feature_with_local_random_mac`：wifi 功能 with local random mac。
- `wifi_feature_with_data_report`：wifi 功能 with data report。
- `wifi_feature_sta_ap_exclusion`：wifi 功能 sta ap exclusion。
- `wifi_feature_with_random_mac_addr`：wifi 功能 with random mac addr。
- `wifi_feature_with_scan_control`：wifi 功能 with scan control。
- `wifi_feature_with_hdi_wpa_supported`：wifi 功能 with hdi wpa 支持ed。
- `wifi_feature_network_selection`：wifi 功能 network selection。
- `wifi_feature_with_hdi_chip_supported`：wifi 功能 with hdi chip 支持ed。
- `wifi_feature_with_vap_manager`：wifi 功能 with vap manager。
- `wifi_feature_with_sta_asset`：wifi 功能 with sta asset。
- `wifi_feature_wifi_pro_ctrl`：wifi 功能 wifi pro ctrl。
- `wifi_feature_with_wifi_oeminfo_mac`：wifi 功能 with wifi oeminfo mac。
- `wifi_feature_voicewifi_enable`：wifi 功能 voicewifi 启用。
- `wifi_feature_mdm_restricted_enable`：wifi 功能 mdm restricted 启用。
- `wifi_feature_with_extensible_authentication`：wifi 功能 with extensible authentication。
- `wifi_feature_with_scan_control_action_listen`：wifi 功能 with scan control action listen。
- `wifi_feature_with_portal_login`：wifi 功能 with portal login。
- `wifi_feature_with_security_detect`：wifi 功能 with security detect。
- `wifi_feature_with_local_security_detect`：wifi 功能 with local security detect。
- `wifi_feature_auto_enable_support`：wifi 功能 auto 启用 支持。
- `wifi_feature_with_ipv6_selfcure`：wifi 功能 with ipv6 selfcure。
- `wifi_feature_with_dynamic_adjust_wifi_power_save`：wifi 功能 with dynamic adjust wifi 电源协同 save。
- `wifi_feature_pluggable_supported`：wifi 功能 pluggable 支持ed。
- `wifi_feature_with_p2p_untrust_invitation`：wifi 功能 with p2p untrust invitation。
- `wifi_feature_with_bt_proxy_speed_limit`：wifi 功能 with bt proxy speed limit。
- `wifi_feature_car_cockpit_supported`：wifi 功能 car cockpit 支持ed。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/wifi/wifi/services](../../../../../../foundation/communication/wifi/wifi/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 44 | `wifi_standard` |
| [foundation/communication/wifi/wifi/frameworks](../../../../../../foundation/communication/wifi/wifi/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 32 | `cj`, `ets`, `js`, `native`, `wifi_ndk` |
| [foundation/communication/wifi/wifi/base](../../../../../../foundation/communication/wifi/wifi/base) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 9 | `cRPC`, `inner_api`, `security_utils`, `shared_util`, `state_machine`, `utils` |
| [foundation/communication/wifi/wifi/relation_services](../../../../../../foundation/communication/wifi/wifi/relation_services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 9 | `common`, `dhcp_service`, `etc` |
| [foundation/communication/wifi/wifi/application](../../../../../../foundation/communication/wifi/wifi/application) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `portal_login`, `wifi_direct_demo` |
| [foundation/communication/wifi/wifi/utils](../../../../../../foundation/communication/wifi/wifi/utils) | 跨模块复用的基础工具和通用数据结构。 | 3 | `extern_library`, `inc`, `src` |
| [foundation/communication/wifi/wifi/interfaces](../../../../../../foundation/communication/wifi/wifi/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `c_api`, `inner_api`, `kits` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `communication` | [wifi_hal_service](../../processes/wifi_hal_service/foundation-runtime.md) | 启动配置 | - | - |
| `communication` | [wifi_manager_service](../../processes/wifi_manager_service/foundation-runtime.md) | 启动配置, SA 实现 | `1120`, `1121`, `1123`, `1124` | `libwifi_device_ability.z.so`, `libwifi_hotspot_ability.z.so`, `libwifi_p2p_ability.z.so`, `libwifi_scan_ability.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_app` | `//foundation/communication/wifi/wifi/application/portal_login:portal_login_hap` | [foundation/communication/wifi/wifi/application/portal_login/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/application/portal_login/BUILD.gn) |
| `ohos_app_scope` | `//foundation/communication/wifi/wifi/application/portal_login:portal_login_app_profile` | [foundation/communication/wifi/wifi/application/portal_login/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/application/portal_login/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/communication/wifi/wifi/frameworks/native/tools/ohos-wifiManager:ohos-wifiManager` | [foundation/communication/wifi/wifi/frameworks/native/tools/ohos-wifiManager/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/frameworks/native/tools/ohos-wifiManager/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/communication/wifi/wifi/services/wifi_standard/sa_profile:wifi_standard_sa_profile` | [foundation/communication/wifi/wifi/services/wifi_standard/sa_profile/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/sa_profile/BUILD.gn) |
| `shared_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage:wifi_service_base` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/BUILD.gn) |
| `executable` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage:wifi_manager_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/BUILD.gn) |
| `ohos_static_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage:wifi_manager_service_static` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage:wifi_manager_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_ap:wifi_ap_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_ap/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_ap/BUILD.gn) |
| `shared_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_common:wifi_common_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_common/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_common/BUILD.gn) |
| `ohos_static_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_common:wifi_common_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_common/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_common/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_p2p:wifi_p2p_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_p2p/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_p2p/BUILD.gn) |
| `shared_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_scan:wifi_scan_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_scan/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_scan/BUILD.gn) |
| `ohos_static_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_scan:wifi_scan_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_scan/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_scan/BUILD.gn) |
| `ohos_static_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_sta_ext:wifi_sta_ext_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_sta_ext/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_sta_ext/BUILD.gn) |
| `shared_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_sta:wifi_sta_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_sta/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_sta/BUILD.gn) |
| `ohos_static_library` | `//foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_sta:wifi_sta_service` | [foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_sta/BUILD.gn](../../../../../../foundation/communication/wifi/wifi/services/wifi_standard/wifi_framework/wifi_manage/wifi_sta/BUILD.gn) |

生产库形态：`ohos_shared_library` 18 个，`ohos_static_library` 13 个，`ohos_source_set` 11 个，`shared_library` 10 个，`static_library` 2 个，`taihe_shared_library` 1 个，`ohos_ndk_library` 1 个。

## 依赖与协作边界

该部件声明 46 个组件依赖和 2 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `battery_manager`, `bundle_framework`, `c_utils`, `cellular_data`, `certificate_manager`, `cJSON`, `common_event_service`, `core_service`, `data_share`, `dhcp`, `distributed_notification_service`, `drivers_interface_wlan`, `eventhandler`, `ffrt`, `hdf_core`, `hiappevent`, `hicollie`, `hilog`, `hisysevent`, `huks`, `i18n`, `image_framework`, `init`, `ipc`, `napi`, `netmanager_base`, `netmanager_ext`, `netstack`, `os_account`, `openssl`, `relational_store`, `safwk`, `samgr`, `power_manager`, `time_service`, `bounds_checking_function`, `libxml2`, `asset`, `runtime_core`, `icu`, `window_manager`, `security_guard`, `state_registry`。
- 三方实现依赖：`googletest`, `wpa_supplicant`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 58 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_fuzztest` 32 个，`ohos_unittest` 21 个，`group` 2 个，`test_group` 1 个，`executable` 1 个，`ohos_executable` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/wifi/wifi/bundle.json](../../../../../../foundation/communication/wifi/wifi/bundle.json)
- 原始源码 README：未找到
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
