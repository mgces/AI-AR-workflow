# nfc 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

近距离无线通信技术\(Near Field Communication，NFC\) ，是一种非接触式识别和互联技术，可以在移动设备、消费类电子产品、PC和智能设备间进行近距离无线通信。 NFC服务提供NFC开关控制、NFC标签发现和分发、NFC标签读写、NFC卡模拟等业务功能。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/communication/nfc` |

## 核心能力

- **Communication NFC Core**：提供“nfc core”能力，系统能力标识为 `SystemCapability.Communication.NFC.Core`。
- **Communication NFC Tag**：提供“nfc tag”能力，系统能力标识为 `SystemCapability.Communication.NFC.Tag`。
- **Communication NFC Card Emulation**：提供“nfc card emulation”能力，系统能力标识为 `SystemCapability.Communication.NFC.CardEmulation`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `nfc_use_vendor_nci_native`：nfc use vendor nci native。
- `nfc_service_feature_vendor_applications_enabled`：nfc service 功能 vendor applications 启用。
- `nfc_sim_feature`：nfc sim 功能。
- `nfc_vibrator_disabled`：nfc vibrator disabled。
- `nfc_handle_screen_lock`：nfc handle screen lock。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/nfc/frameworks](../../../../../../foundation/communication/nfc/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 27 | `cj`, `ets`, `js` |
| [foundation/communication/nfc/interfaces](../../../../../../foundation/communication/nfc/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 15 | `inner_api` |
| [foundation/communication/nfc/services](../../../../../../foundation/communication/nfc/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 10 | `etc`, `include`, `resources`, `src` |
| [foundation/communication/nfc/sa_profile](../../../../../../foundation/communication/nfc/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/communication/nfc/tools](../../../../../../foundation/communication/nfc/tools) | 开发、诊断、命令行或构建辅助工具。 | 1 | `ohos-nfcManager` |

## 对外与内部接口

该部件声明 7 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/nfc/interfaces/inner_api/cardEmulation:nfc_inner_kits_card_emulation` | `//foundation/communication/nfc/interfaces/inner_api/cardEmulation` | - |
| `//foundation/communication/nfc/interfaces/inner_api/common:nfc_inner_kits_common` | `//foundation/communication/nfc/interfaces/inner_api/common` | - |
| `//foundation/communication/nfc/interfaces/inner_api/controller:nfc_inner_kits_controller` | `//foundation/communication/nfc/interfaces/inner_api/controller` | `nfc_controller.h` |
| `//foundation/communication/nfc/interfaces/inner_api/tags:nfc_inner_kits_tags` | `//foundation/communication/nfc/interfaces/inner_api/tags` | - |
| `//foundation/communication/nfc/frameworks/cj/cardEmulation:cj_nfc_cardemulation_ffi` | `//foundation/communication/nfc/frameworks/cj/cardEmulation` | - |
| `//foundation/communication/nfc/frameworks/cj/controller:cj_nfc_controller_ffi` | `//foundation/communication/nfc/frameworks/cj/controller` | - |
| `//foundation/communication/nfc/interfaces/inner_api/tags:libnfc_tag_interface_proxy` | `//foundation/communication/nfc/interfaces/inner_api/tags` | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `communication` | [nfc_service](../../processes/nfc_service/foundation-runtime.md) | 启动配置, SA 实现 | `1140` | `libnfc_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/communication/nfc/sa_profile:nfc_profile` | [foundation/communication/nfc/sa_profile/BUILD.gn](../../../../../../foundation/communication/nfc/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/nfc/services:nfc_service` | [foundation/communication/nfc/services/BUILD.gn](../../../../../../foundation/communication/nfc/services/BUILD.gn) |
| `ohos_static_library` | `//foundation/communication/nfc/services:nfc_service_static` | [foundation/communication/nfc/services/BUILD.gn](../../../../../../foundation/communication/nfc/services/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/communication/nfc/tools/ohos-nfcManager:ohos-nfcManager` | [foundation/communication/nfc/tools/ohos-nfcManager/BUILD.gn](../../../../../../foundation/communication/nfc/tools/ohos-nfcManager/BUILD.gn) |

生产库形态：`ohos_shared_library` 12 个，`taihe_shared_library` 3 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 30 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ipc`, `hilog`, `bounds_checking_function`, `bundle_framework`, `cJSON`, `c_utils`, `napi`, `ability_base`, `samgr`, `ability_runtime`, `access_token`, `common_event_service`, `eventhandler`, `hiappevent`, `miscdevice`, `preferences`, `safwk`, `init`, `hisysevent`, `data_share`, `ffrt`, `screenlock_mgr`, `power_manager`, `distributed_notification_service`, `wifi`, `i18n`, `bluetooth`, `image_framework`, `runtime_core`, `taihe_ffi_gen`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 215 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`group` 120 个，`ohos_fuzztest` 77 个，`ohos_unittest` 17 个，`ohos_static_library` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/nfc/bundle.json](../../../../../../foundation/communication/nfc/bundle.json)
- 原始源码 README：[foundation/communication/nfc/README_zh.md](../../../../../../foundation/communication/nfc/README_zh.md)、[foundation/communication/nfc/README.md](../../../../../../foundation/communication/nfc/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
