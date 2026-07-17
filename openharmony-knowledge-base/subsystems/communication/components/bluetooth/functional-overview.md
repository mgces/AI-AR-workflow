# bluetooth 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Provides basic Bluetooth and BLE functions for applications

源码 README 补充说明：

> 简介 目录 约束 说明 - 标准系统使用说明 - 轻量或小型系统使用说明 - C接口使用说明 蓝牙服务组件为设备提供接入与使用Bluetooth的相关接口，包括BLE设备gatt相关的操作，以及BLE广播、扫描等功能。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/communication/bluetooth` |

## 核心能力

- **Communication Bluetooth Core**：提供“bluetooth core”能力，系统能力标识为 `SystemCapability.Communication.Bluetooth.Core`。
- **Communication Bluetooth Lite**：提供“bluetooth lite”能力，系统能力标识为 `SystemCapability.Communication.Bluetooth.Lite`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `bluetooth_kia_enable`：bluetooth kia 启用。
- `bluetooth_pluggable_supported`：bluetooth pluggable 支持ed。
- `bluetooth_bas_feature`：bluetooth bas 功能。
- `bluetooth_pan_feature`：bluetooth pan 功能。
- `bluetooth_hap_opp_switch_feature`：bluetooth hap opp switch 功能。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/bluetooth/frameworks](../../../../../../foundation/communication/bluetooth/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 88 | `c_api`, `cj`, `ets`, `inner`, `js` |
| [foundation/communication/bluetooth/bluetooth_ui](../../../../../../foundation/communication/bluetooth/bluetooth_ui) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 5 | `AppScope`, `entry`, `signature` |
| [foundation/communication/bluetooth/tools](../../../../../../foundation/communication/bluetooth/tools) | 开发、诊断、命令行或构建辅助工具。 | 1 | `ohos-bluetoothTool` |
| [foundation/communication/bluetooth/interfaces](../../../../../../foundation/communication/bluetooth/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `c_api`, `inner_api` |

## 对外与内部接口

该部件声明 11 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/bluetooth/frameworks/inner:btframework` | `//foundation/communication/bluetooth/interfaces/inner_api/include` | `bluetooth_a2dp_src.h`, `bluetooth_ble_central_manager.h`, `bluetooth_def.h`, `bluetooth_device_class.h`, `bluetooth_gatt_characteristic.h`, `bluetooth_gatt_client.h`, `bluetooth_gatt_descriptor.h`, `bluetooth_gatt_manager.h` 等 25 个 |
| `//foundation/communication/bluetooth/frameworks/inner:btcommon` | `//foundation/communication/bluetooth/frameworks/inner/ipc` | `common/avrcp_media.h`, `common/ble_service_data.h`, `common/bluetooth_errorcode.h`, `common/bt_def.h`, `common/bt_uuid.h`, `common/gatt_data.h`, `common/hands_free_unit_calls.h`, `common/raw_address.h` 等 76 个 |
| `//foundation/communication/bluetooth/frameworks/cj/a2dp:cj_bluetooth_a2dp_ffi` | `//foundation/communication/bluetooth/frameworks/cj/a2dp/include` | - |
| `//foundation/communication/bluetooth/frameworks/cj/access:cj_bluetooth_access_ffi` | `//foundation/communication/bluetooth/frameworks/cj/access/include` | - |
| `//foundation/communication/bluetooth/frameworks/cj/ble:cj_bluetooth_ble_ffi` | `//foundation/communication/bluetooth/frameworks/cj/ble/include` | - |
| `//foundation/communication/bluetooth/frameworks/cj/connection:cj_bluetooth_connection_ffi` | `//foundation/communication/bluetooth/frameworks/cj/connection/include` | - |
| `//foundation/communication/bluetooth/frameworks/cj/hfp:cj_bluetooth_hfp_ffi` | `//foundation/communication/bluetooth/frameworks/cj/hfp/include` | - |
| `//foundation/communication/bluetooth/frameworks/cj/hid:cj_bluetooth_hid_ffi` | `//foundation/communication/bluetooth/frameworks/cj/hid/include` | - |
| `//foundation/communication/bluetooth/frameworks/cj/socket:cj_bluetooth_socket_ffi` | `//foundation/communication/bluetooth/frameworks/cj/socket/include` | - |
| `//foundation/communication/bluetooth/frameworks/js/napi/src/common:bt_napi_common` | `//foundation/communication/bluetooth/frameworks/js/napi` | `include/napi_event_subscribe_module.h`, `include/napi_bluetooth_utils.h`, `include/napi_bluetooth_event.h`, `include/napi_bluetooth_error.h`, `include/napi_native_object.h`, `src/parser/napi_parser_utils.h` |
| `//foundation/communication/bluetooth/frameworks/js/napi/src/common:common` | `//foundation/communication/bluetooth/frameworks/js/napi` | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_hap` | `//foundation/communication/bluetooth/bluetooth_ui:bluetooth_hap` | [foundation/communication/bluetooth/bluetooth_ui/BUILD.gn](../../../../../../foundation/communication/bluetooth/bluetooth_ui/BUILD.gn) |
| `ohos_app_scope` | `//foundation/communication/bluetooth/bluetooth_ui:bluetooth_app_profile` | [foundation/communication/bluetooth/bluetooth_ui/BUILD.gn](../../../../../../foundation/communication/bluetooth/bluetooth_ui/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/communication/bluetooth/tools/ohos-bluetoothTool:ohos-bluetoothTool` | [foundation/communication/bluetooth/tools/ohos-bluetoothTool/BUILD.gn](../../../../../../foundation/communication/bluetooth/tools/ohos-bluetoothTool/BUILD.gn) |

生产库形态：`ohos_shared_library` 29 个，`taihe_shared_library` 8 个，`ohos_ndk_library` 1 个。

## 依赖与协作边界

该部件声明 23 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `bundle_framework`, `c_utils`, `cJSON`, `common_event_service`, `eventhandler`, `ets_frontend`, `ffrt`, `hicollie`, `hilog`, `hisysevent`, `hiappevent`, `hitrace`, `init`, `ipc`, `libuv`, `napi`, `samgr`, `security_guard`, `runtime_core`, `bounds_checking_function`, `taihe_ffi_gen`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 9 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`group` 5 个，`ohos_unittest` 4 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/bluetooth/bundle.json](../../../../../../foundation/communication/bluetooth/bundle.json)
- 原始源码 README：[foundation/communication/bluetooth/README_zh.md](../../../../../../foundation/communication/bluetooth/README_zh.md)、[foundation/communication/bluetooth/README.md](../../../../../../foundation/communication/bluetooth/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
