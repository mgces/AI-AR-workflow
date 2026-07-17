# dsoftbus 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

分布式软总线组件 - 简介 - 系统架构 - 目录 - 约束 - 说明 - 使用说明 - 相关仓 现实中多设备间通信方式多种多样\(WIFI、蓝牙等\)，不同的通信方式使用差异大，导致通信问题多；同时还面临设备间通信链路的融合共享和冲突无法处理等挑战。分布式软总线实现近场设备间统一的分布式通信管理能力，提供不区分链路的设备间发现连接、组网和传输能力，主要功能如下：

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | mini,small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 3000KB / 40MB |
| 源码仓 | `foundation/communication/dsoftbus` |

## 核心能力

- **Communication Soft Bus Core**：提供“soft bus core”能力，系统能力标识为 `SystemCapability.Communication.SoftBus.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `dsoftbus_feature_conn_ble`：dsoftbus 功能 conn ble。
- `dsoftbus_get_devicename`：dsoftbus get devicename。
- `dsoftbus_feature_lnn_wifiservice_dependence`：dsoftbus 功能 lnn wifiservice dependence。
- `dsoftbus_feature_disc_ble`：dsoftbus 功能 disc ble。
- `dsoftbus_feature_disc_coap`：dsoftbus 功能 disc coap。
- `dsoftbus_feature_disc_lnn_coap`：dsoftbus 功能 disc lnn coap。
- `dsoftbus_feature_disc_share_coap`：dsoftbus 功能 disc share coap。
- `dsoftbus_feature_conn_tcp_proxy`：dsoftbus 功能 conn tcp proxy。
- `dsoftbus_feature_conn_tcp_comm`：dsoftbus 功能 conn tcp comm。
- `dsoftbus_feature_conn_pv1`：dsoftbus 功能 conn pv1。
- `dsoftbus_feature_conn_br`：dsoftbus 功能 conn br。
- `dsoftbus_feature_conn_coc`：dsoftbus 功能 conn coc。
- `dsoftbus_feature_conn_ble_direct`：dsoftbus 功能 conn ble direct。
- `dsoftbus_feature_conn_pv2`：dsoftbus 功能 conn pv2。
- `dsoftbus_feature_conn_hv1`：dsoftbus 功能 conn hv1。
- `dsoftbus_feature_conn_hv2`：dsoftbus 功能 conn hv2。
- `dsoftbus_feature_conn_hv2c`：dsoftbus 功能 conn hv2c。
- `dsoftbus_feature_conn_action`：dsoftbus 功能 conn action。
- `dsoftbus_feature_conn_general`：dsoftbus 功能 conn general。
- `dsoftbus_feature_conn_legacy_im`：dsoftbus 功能 conn legacy im。
- `dsoftbus_feature_conn_legacy_data`：dsoftbus 功能 conn legacy data。
- `dsoftbus_feature_trans_udp_file`：dsoftbus 功能 trans udp file。
- `dsoftbus_feature_trans_udp_stream`：dsoftbus 功能 trans udp stream。
- `dsoftbus_feature_trans_udp`：dsoftbus 功能 trans udp。
- `dsoftbus_feature_trans_proxy_file`：dsoftbus 功能 trans proxy file。
- `dsoftbus_feature_trans_qos`：dsoftbus 功能 trans 服务质量。
- `dsoftbus_feature_trans_htp`：dsoftbus 功能 trans htp。
- `dsoftbus_feature_trans_br_proxy`：dsoftbus 功能 trans br proxy。
- `dsoftbus_feature_compile_guard`：dsoftbus 功能 compile guard。
- `dsoftbus_feature_trans_legacy`：dsoftbus 功能 trans legacy。
- `dsoftbus_feature_lnn_ble`：dsoftbus 功能 lnn ble。
- `dsoftbus_feature_lnn_wifi`：dsoftbus 功能 lnn wifi。
- `dsoftbus_feature_lnn_ccmp`：dsoftbus 功能 lnn ccmp。
- `dsoftbus_feature_lnn_time_sync`：dsoftbus 功能 lnn time sync。
- `dsoftbus_feature_lnn_sh`：dsoftbus 功能 lnn sh。
- `dsoftbus_feature_lnn_cloud_sync`：dsoftbus 功能 lnn cloud sync。
- `dsoftbus_feature_lnn_channel_rating`：dsoftbus 功能 lnn channel rating。
- `dsoftbus_feature_lnn_lane_mgr`：dsoftbus 功能 lnn lane mgr。
- `dsoftbus_feature_lnn_power_ctrl`：dsoftbus 功能 lnn 电源协同 ctrl。
- `dsoftbus_feature_lnn_lane_qos`：dsoftbus 功能 lnn lane 服务质量。
- `dsoftbus_feature_lnn_frame`：dsoftbus 功能 lnn frame。
- `dsoftbus_feature_vtp`：dsoftbus 功能 vtp。
- `dsoftbus_feature_dfile`：dsoftbus 功能 dfile。
- `dsoftbus_feature_dmsg`：dsoftbus 功能 dmsg。
- `dsoftbus_feature_dnet`：dsoftbus 功能 dnet。
- `dsoftbus_feature_linkfinder`：dsoftbus 功能 linkfinder。
- `dsoftbus_feature_coap`：dsoftbus 功能 coap。
- `dsoftbus_feature_lnn_usb_ncm`：dsoftbus 功能 lnn usb ncm。
- `dsoftbus_feature_trans_mintp`：dsoftbus 功能 trans mintp。
- `dsoftbus_feature_lnn_d2d_auth`：dsoftbus 功能 lnn d2d auth。
- `dsoftbus_feature_trans_io_uring`：dsoftbus 功能 trans io uring。
- `dsoftbus_feature_lnn_push`：dsoftbus 功能 lnn push。
- `dsoftbus_feature_multi_foreground_user`：dsoftbus 功能 multi foreground user。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/dsoftbus/components](../../../../../../foundation/communication/dsoftbus/components) | 可组合的功能单元或上层组件实现。 | 25 | `mbedtls`, `nstackx` |
| [foundation/communication/dsoftbus/core](../../../../../../foundation/communication/dsoftbus/core) | 组件核心模型和关键执行逻辑。 | 23 | `adapter`, `authentication`, `broadcast`, `bus_center`, `common`, `connection`, `discovery`, `frame` |
| [foundation/communication/dsoftbus/br_proxy](../../../../../../foundation/communication/dsoftbus/br_proxy) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 11 | `common`, `group`, `taihe` |
| [foundation/communication/dsoftbus/sdk](../../../../../../foundation/communication/dsoftbus/sdk) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 10 | `bus_center`, `connection`, `frame`, `napi`, `taihe`, `transmission` |
| [foundation/communication/dsoftbus/dfx](../../../../../../foundation/communication/dsoftbus/dfx) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 6 | `anonymize`, `dumper`, `event`, `interface`, `log`, `statistics`, `trace`, `watchdog` |
| [foundation/communication/dsoftbus/adapter](../../../../../../foundation/communication/dsoftbus/adapter) | 平台、硬件、协议或不同系统形态之间的适配层。 | 5 | `common`, `default_config`, `feature_config`, `manager` |
| [foundation/communication/dsoftbus/interfaces](../../../../../../foundation/communication/dsoftbus/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_kits`, `kits` |
| [foundation/communication/dsoftbus/tools](../../../../../../foundation/communication/dsoftbus/tools) | 开发、诊断、命令行或构建辅助工具。 | 0 | `device_info` |

## 对外与内部接口

该部件声明 9 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/dsoftbus/sdk:softbus_client` | `//foundation/communication/dsoftbus/interfaces/kits` | `bus_center/softbus_bus_center.h`, `common/softbus_common.h`, `common/softbus_error_code.h`, `transport/session.h` |
| `//foundation/communication/dsoftbus/core/common:softbus_utils` | `//foundation/communication/dsoftbus/interfaces/kits` | `adapter/enhance/softbus_adapter_ble_conflict_struct.h`, `adapter/auth_session_message_struct.h`, `adapter/softbus_adapter_ble_gatt_client_struct.h`, `adapter/softbus_adapter_ble_gatt_server_struct.h`, `adapter/softbus_adapter_bt_common_struct.h`, `adapter/softbus_adapter_wlan_extend_struct.h`, `adapter/softbus_ble_gatt_public.h`, `adapter/softbus_broadcast_adapter_interface_struct.h` 等 130 个 |
| `//foundation/communication/dsoftbus/adapter:softbus_adapter` | `//foundation/communication/dsoftbus/interfaces/kits` | `../../adapter/common/net/bluetooth/broadcast/interface/softbus_broadcast_manager.h` |
| `//foundation/communication/dsoftbus/dfx:softbus_dfx` | `//foundation/communication/dsoftbus/dfx` | `event/src/softbus_event.h`, `interface/include/form/lnn_event_form.h`, `interface/include/legacy/softbus_hisysevt_bus_center.h` |
| `//foundation/communication/dsoftbus/components/nstackx/nstackx_util:nstackx_util.open` | `//foundation/communication/dsoftbus/components/nstackx` | `nstackx_util/interface/nstackx_error.h` |
| `//foundation/communication/dsoftbus/core/connection/wifi_direct_cpp:wifi_direct` | `//foundation/communication/dsoftbus/core/connection/wifi_direct_cpp` | - |
| `//foundation/communication/dsoftbus/components/nstackx/nstackx_ctrl:nstackx_ctrl` | `//foundation/communication/dsoftbus/components/nstackx` | `nstackx_ctrl/interface/nstackx.h` |
| `//foundation/communication/dsoftbus/dfx/dumper/legacy:softbus_dfx_dump` | `//foundation/communication/dsoftbus/dfx/interface/include` | - |
| `//foundation/communication/dsoftbus/br_proxy/taihe:proxychannelmanager_taihe_idl` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `communication` | [softbus_server](../../processes/softbus_server/foundation-runtime.md) | 启动配置, SA 实现 | `4700` | `libsoftbus_server.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `executable` | `//foundation/communication/dsoftbus/core/frame:softbus_server` | [foundation/communication/dsoftbus/core/frame/BUILD.gn](../../../../../../foundation/communication/dsoftbus/core/frame/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/communication/dsoftbus/core/frame/standard/sa_profile:softbus_sa_profile` | [foundation/communication/dsoftbus/core/frame/standard/sa_profile/BUILD.gn](../../../../../../foundation/communication/dsoftbus/core/frame/standard/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 19 个，`shared_library` 7 个，`static_library` 5 个，`taihe_shared_library` 2 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 43 个组件依赖和 8 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `bluetooth`, `bounds_checking_function`, `bundle_framework`, `common_event_service`, `data_share`, `kv_store`, `device_auth`, `device_info_manager`, `json`, `hicollie`, `hisysevent`, `hitrace`, `hilog`, `huks`, `init`, `ipc`, `openssl`, `os_account`, `relational_store`, `c_utils`, `safwk`, `samgr`, `sqlite`, `wifi`, `netmanager_base`, `cJSON`, `mbedtls`, `libcoap`, `zlib`, `libnl`, `power_manager`, `ffrt`, `usb_manager`, `selinux_adapter`, `time_service`, `napi`, `resource_schedule_service`, `device_standby`, `runtime_core`, `liburing`。
- 三方实现依赖：`cJSON`, `json`, `mbedtls`, `openssl`, `bounds_checking_function`, `sqlite`, `zlib`, `libnl`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 889 个测试目标，bundle 声明 4 个测试入口。

主要测试形态：`ohos_unittest` 400 个，`group` 234 个，`ohos_fuzztest` 227 个，`unittest` 8 个，`static_library` 5 个，`ohos_benchmarktest` 3 个，`ohos_executable` 3 个，`executable` 3 个，`lite_component` 2 个，`ohos_distributedtest` 2 个，`ohos_static_library` 1 个，`ohos_moduletest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/dsoftbus/bundle.json](../../../../../../foundation/communication/dsoftbus/bundle.json)
- 原始源码 README：[foundation/communication/dsoftbus/README_zh.md](../../../../../../foundation/communication/dsoftbus/README_zh.md)、[foundation/communication/dsoftbus/README.md](../../../../../../foundation/communication/dsoftbus/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
