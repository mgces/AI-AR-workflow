# selectionfwk 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Provide word selection capabilities

源码 README 补充说明：

> 该仓主要存放划词服务子系统的源码信息。划词服务子系统具有全局获取用户选中文本及管理划词应用的能力。 开发者可通过调用该子系统提供的接口，在现有应用的基础上，轻松实现划词扩展能力。该扩展能力支持在全局范围内捕获用户选中的文本内容。开发者可基于捕获到的文本内容实现自己的业务逻辑，如文本翻译、内容摘要、智能扩写等。同时，划词服务子系统提供了完善的面板管理能力，支持开发者创建、显示、移动、隐藏、销毁面板。开发者可自定义面板的UI样式与交互逻辑，灵活呈现翻译结果、摘要信息等内容，最终实现“选中文本—>弹出智能面板”的流畅体验。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `systemabilitymgr` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | mini,small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 5831KB / 5831KB |
| 源码仓 | `foundation/systemabilitymgr/selectionfwk` |

## 核心能力

- **Selection Input Selection**：提供“selection input selection”能力，系统能力标识为 `SystemCapability.SelectionInput.Selection`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/systemabilitymgr/selectionfwk/frameworks](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 29 | `ets`, `js`, `native` |
| [foundation/systemabilitymgr/selectionfwk/interfaces](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 10 | `idl`, `inner_kits` |
| [foundation/systemabilitymgr/selectionfwk/service](../../../../../../foundation/systemabilitymgr/selectionfwk/service) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 7 | `focus_monitor`, `include`, `plugins`, `src` |
| [foundation/systemabilitymgr/selectionfwk/etc](../../../../../../foundation/systemabilitymgr/selectionfwk/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 3 | `init`, `para` |
| [foundation/systemabilitymgr/selectionfwk/common](../../../../../../foundation/systemabilitymgr/selectionfwk/common) | 组件内部共享的公共定义、工具和基础实现。 | 2 | - |
| [foundation/systemabilitymgr/selectionfwk/sa_profile](../../../../../../foundation/systemabilitymgr/selectionfwk/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/systemabilitymgr/selectionfwk/hiappevent_agent](../../../../../../foundation/systemabilitymgr/selectionfwk/hiappevent_agent) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/systemabilitymgr/selectionfwk/sysevent](../../../../../../foundation/systemabilitymgr/selectionfwk/sysevent) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/systemabilitymgr/selectionfwk/utils](../../../../../../foundation/systemabilitymgr/selectionfwk/utils) | 跨模块复用的基础工具和通用数据结构。 | 0 | `include`, `src` |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/systemabilitymgr/selectionfwk/interfaces/inner_kits/selection_client:selection_client` | `//foundation/systemabilitymgr/selectionfwk/interfaces/inner_kits/selection_client/include` | `selection_client.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `systemabilitymgr` | [selection_service](../../processes/selection_service/foundation-runtime.md) | 启动配置, SA 实现 | `8500` | `libselection_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/systemabilitymgr/selectionfwk/sa_profile:selection_service_sa_profile` | [foundation/systemabilitymgr/selectionfwk/sa_profile/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/systemabilitymgr/selectionfwk/service:selection_service` | [foundation/systemabilitymgr/selectionfwk/service/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/service/BUILD.gn) |

生产库形态：`ohos_shared_library` 9 个，`ohos_source_set` 6 个，`ohos_static_library` 2 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 32 个组件依赖和 0 个三方依赖。

- 系统组件协作：`c_utils`, `eventhandler`, `ipc`, `safwk`, `hilog`, `hitrace`, `samgr`, `icu`, `init`, `input`, `napi`, `ability_base`, `ability_runtime`, `access_token`, `window_manager`, `pasteboard`, `relational_store`, `resource_management`, `graphic_2d`, `bundle_framework`, `ffrt`, `config_policy`, `os_account`, `cJSON`, `common_event_service`, `hicollie`, `hisysevent`, `memmgr`, `resource_schedule_service`, `hiappevent`, `udmf`, `runtime_core`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 9 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`group` 4 个，`ohos_fuzztest` 2 个，`ohos_unittest` 2 个，`ohos_app` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/systemabilitymgr/selectionfwk/bundle.json](../../../../../../foundation/systemabilitymgr/selectionfwk/bundle.json)
- 原始源码 README：[foundation/systemabilitymgr/selectionfwk/README.md](../../../../../../foundation/systemabilitymgr/selectionfwk/README.md)、[foundation/systemabilitymgr/selectionfwk/README.en.md](../../../../../../foundation/systemabilitymgr/selectionfwk/README.en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
