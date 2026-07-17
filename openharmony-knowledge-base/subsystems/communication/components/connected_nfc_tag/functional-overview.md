# connected_nfc_tag 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

近距离无线通信技术\(Near Field Communication，NFC\) ，是一种非接触式识别和互联技术，可以在移动设备、消费类电子产品、PC和智能设备间进行近距离无线通信。 参考开发指南: docs/zh-cn/application-dev/reference/apis/js-apis-connectedTag.md。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/communication/connected_nfc_tag` |

## 核心能力

- **Communication Connected Tag**：提供“communication connected tag”能力，系统能力标识为 `SystemCapability.Communication.ConnectedTag`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `connected_nfc_tag_only_system_app_access_api`：connected nfc tag only system app access api。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/connected_nfc_tag/services](../../../../../../foundation/communication/connected_nfc_tag/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 6 | `etc`, `include`, `src` |
| [foundation/communication/connected_nfc_tag/interfaces](../../../../../../foundation/communication/connected_nfc_tag/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 4 | `inner_api` |
| [foundation/communication/connected_nfc_tag/utils](../../../../../../foundation/communication/connected_nfc_tag/utils) | 跨模块复用的基础工具和通用数据结构。 | 2 | `sa_listener` |
| [foundation/communication/connected_nfc_tag/frameworks](../../../../../../foundation/communication/connected_nfc_tag/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 1 | `js` |
| [foundation/communication/connected_nfc_tag/sa_profile](../../../../../../foundation/communication/connected_nfc_tag/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/connected_nfc_tag/interfaces/inner_api:nfc_tag_inner_kits` | `//foundation/communication/connected_nfc_tag/interfaces/inner_api/include` | `nfc_tag_client.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `communication` | [nfc_tag_service](../../processes/nfc_tag_service/foundation-runtime.md) | 启动配置, SA 实现 | `1148` | `libnfc_tag_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/communication/connected_nfc_tag/sa_profile:nfc_tag_profile` | [foundation/communication/connected_nfc_tag/sa_profile/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/communication/connected_nfc_tag/services:nfc_tag_service` | [foundation/communication/connected_nfc_tag/services/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/services/BUILD.gn) |

生产库形态：`ohos_shared_library` 3 个，`ohos_static_library` 2 个。

## 依赖与协作边界

该部件声明 10 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ipc`, `c_utils`, `hilog`, `napi`, `access_token`, `hisysevent`, `safwk`, `samgr`, `hdf_core`, `drivers_interface_connected_nfc_tag`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 23 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_unittest` 8 个，`group` 7 个，`ohos_static_library` 6 个，`ohos_fuzztest` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/connected_nfc_tag/bundle.json](../../../../../../foundation/communication/connected_nfc_tag/bundle.json)
- 原始源码 README：[foundation/communication/connected_nfc_tag/README_zh.md](../../../../../../foundation/communication/connected_nfc_tag/README_zh.md)、[foundation/communication/connected_nfc_tag/README.md](../../../../../../foundation/communication/connected_nfc_tag/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
