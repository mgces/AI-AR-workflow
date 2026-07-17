# fusion_connectivity 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Provide fusional service for connectivity

源码 README 补充说明：

> 融合短距通信服务（以下简称融合短距）是 OpenHarmony 系统中统一管理短距离通信技术的服务，当前其内部实现了PartnerAgent服务模块，未来融合短距服务会扩展其他功能。 伙伴设备：生态设备厂商实现的蓝牙设备（例如手表、手环、耳机、码表等）。 伙伴设备应用：生态设备厂商实现控制伙伴设备的应用。 伙伴设备Extension： * 生态设备厂商实现的**PartnerAgentExtensionAbility**能力。 * 伙伴设备Extension会和伙伴设备之间建立蓝牙连接，并进行私有业务数据传输。 * 伙伴设备Extension收到伙伴设备的请求命令后，可以进行媒体控制（上一首、下一首、播放和暂停）和通话控制（通话挂断和接听）。 PartnerAgent服务： * PartnerAgent服务提供了接口供伙伴设备应用注册伙伴设备。 * PartnerAgent服务感知伙伴设备被注册后，触发蓝牙BLE扫描功能，并且监听伙伴设备的连接状态。 * PartnerAgent服务通过BLE扫描到伙伴设备，或监听到伙伴设备已连接后，会拉起伙伴设备Extension。 * PartnerAgent服务监听到伙伴设备断开连接后，会延迟3分钟销毁伙伴设备Extension。 媒体服务：OpenHarmony 基础系统服务，给伙伴设备Extension提供媒体控制能力。 通话服务：OpenHarmony 基础系统服务，给伙伴设备Extension提供通话控制能力。 蓝牙服务：OpenHarmony 基础系统服务，给伙伴设备Extension和PartnerAgent服务提供蓝牙扫描、蓝牙连接和蓝牙数据传输的能力。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/communication/fusion_connectivity` |

## 核心能力

- **Communication Fusion Connectivity Core**：提供“fusion connectivity core”能力，系统能力标识为 `SystemCapability.Communication.FusionConnectivity.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `fusion_connectivity_partner_agent_feature`：fusion connectivity partner agent 功能。
- `fusion_connectivity_settings_bundle_name`：fusion connectivity settings bundle name。
- `fusion_connectivity_settings_main_ability`：fusion connectivity settings main ability。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/fusion_connectivity/partner_agent](../../../../../../foundation/communication/fusion_connectivity/partner_agent) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 45 | `frameworks`, `idl`, `interfaces`, `sa_profile`, `services` |
| [foundation/communication/fusion_connectivity/fusion_ranging](../../../../../../foundation/communication/fusion_connectivity/fusion_ranging) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 26 | `frameworks`, `idl`, `interfaces`, `sa_profile`, `services` |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/fusion_connectivity/fusion_ranging/services/ranging_adapter:fusion_ranging_adapter` | `//foundation/communication/fusion_connectivity/fusion_ranging/services/ranging_adapter/include` | `base_ranging_adapter.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `communication` | [fusion_ranging](../../processes/fusion_ranging/foundation-runtime.md) | 启动配置, SA 实现 | `8631` | `/system/lib64/libfusion_ranging_server.z.so` |
| `communication` | [partner_device_agent](../../processes/partner_device_agent/foundation-runtime.md) | 启动配置, SA 实现 | `8630` | `/system/lib64/libpartner_device_agent_server.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/communication/fusion_connectivity/fusion_ranging/sa_profile:fusion_ranging_sa_profile` | [foundation/communication/fusion_connectivity/fusion_ranging/sa_profile/BUILD.gn](../../../../../../foundation/communication/fusion_connectivity/fusion_ranging/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/fusion_connectivity/fusion_ranging/services/server:fusion_ranging_server` | [foundation/communication/fusion_connectivity/fusion_ranging/services/server/BUILD.gn](../../../../../../foundation/communication/fusion_connectivity/fusion_ranging/services/server/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/communication/fusion_connectivity/partner_agent/sa_profile:partner_device_agent_sa_profile` | [foundation/communication/fusion_connectivity/partner_agent/sa_profile/BUILD.gn](../../../../../../foundation/communication/fusion_connectivity/partner_agent/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/fusion_connectivity/partner_agent/services/server:partner_device_agent_server` | [foundation/communication/fusion_connectivity/partner_agent/services/server/BUILD.gn](../../../../../../foundation/communication/fusion_connectivity/partner_agent/services/server/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/fusion_connectivity/partner_agent/services/server:libpartner_agent_extension_service` | [foundation/communication/fusion_connectivity/partner_agent/services/server/BUILD.gn](../../../../../../foundation/communication/fusion_connectivity/partner_agent/services/server/BUILD.gn) |
| `ohos_static_library` | `//foundation/communication/fusion_connectivity/partner_agent/services/server:partner_device_agent_server_static` | [foundation/communication/fusion_connectivity/partner_agent/services/server/BUILD.gn](../../../../../../foundation/communication/fusion_connectivity/partner_agent/services/server/BUILD.gn) |

生产库形态：`ohos_shared_library` 13 个，`ohos_source_set` 3 个，`ohos_static_library` 2 个。

## 依赖与协作边界

该部件声明 22 个组件依赖和 0 个三方依赖。

- 系统组件协作：`hilog`, `ipc`, `samgr`, `c_utils`, `ffrt`, `bluetooth`, `safwk`, `libuv`, `ets_frontend`, `napi`, `access_token`, `ability_base`, `ability_runtime`, `bundle_framework`, `eventhandler`, `init`, `common_event_service`, `cJSON`, `preferences`, `os_account`, `distributed_notification_service`, `hiappevent`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 19 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`group` 10 个，`ohos_unittest` 7 个，`ohos_fuzztest` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/fusion_connectivity/bundle.json](../../../../../../foundation/communication/fusion_connectivity/bundle.json)
- 原始源码 README：[foundation/communication/fusion_connectivity/README.md](../../../../../../foundation/communication/fusion_connectivity/README.md)、[foundation/communication/fusion_connectivity/README.OpenSource](../../../../../../foundation/communication/fusion_connectivity/README.OpenSource)、[foundation/communication/fusion_connectivity/README.en.md](../../../../../../foundation/communication/fusion_connectivity/README.en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
