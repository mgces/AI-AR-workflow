# ui_appearance 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Provide ui_appearance management.

源码 README 补充说明：

> **内容介绍**：该仓用于管理和配置系统的用户界面外观（例如深色模式），不包括产品化应用定制的外观模式（例如桌面的简易模式）。目前用户界面外观仅支持深色模式服务，提供了系统应用API，用于获取和设置系统的深浅色模式，同时可持久化保存当前配置的深浅色模式参数。 如上图所示，系统应用（setting）调用提供的API配置深浅色模式，用户界面外观（ui appearance）通知元能力服务（Ability Manager Service，AMS）更新配置，遍历所有APP进程。在此期间，AMS会通知资源管理（resoure manager）切换应用的限定词目录，同时通知窗口管理服务（Window Manager Service，WMS）配置更新。之后，WMS会进一步通知ArkUI（ace engine）主动刷新资源，待资源刷新完成后用户界面外观服务会持久化存储当前配置的系统参数（system param）。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `arkui` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 300KB / 1024KB |
| 源码仓 | `foundation/arkui/ui_appearance` |

## 核心能力

- **Ark UI Ui Appearance**：提供“ark ui ui appearance”能力，系统能力标识为 `SystemCapability.ArkUI.UiAppearance`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/arkui/ui_appearance/interfaces](../../../../../../foundation/arkui/ui_appearance/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 8 | `ets`, `kits` |
| [foundation/arkui/ui_appearance/services](../../../../../../foundation/arkui/ui_appearance/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 5 | `include`, `src`, `utils` |
| [foundation/arkui/ui_appearance/etc](../../../../../../foundation/arkui/ui_appearance/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 2 | `para` |
| [foundation/arkui/ui_appearance/sa_profile](../../../../../../foundation/arkui/ui_appearance/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/arkui/ui_appearance/interfaces/kits/native:ui_appearance_kit` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `arkui` | [ui_service](../../processes/ui_service/foundation-runtime.md) | SA 实现 | `7002` | `libui_appearance_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/arkui/ui_appearance/sa_profile:arkui_ui_appearance_sa_profiles` | [foundation/arkui/ui_appearance/sa_profile/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/arkui/ui_appearance/services:ui_appearance_service` | [foundation/arkui/ui_appearance/services/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/services/BUILD.gn) |

生产库形态：`ohos_shared_library` 5 个，`ohos_source_set` 1 个。

## 依赖与协作边界

该部件声明 17 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_runtime`, `ability_base`, `access_token`, `c_utils`, `config_policy`, `data_share`, `hicollie`, `hilog`, `init`, `ipc`, `napi`, `safwk`, `samgr`, `time_service`, `os_account`, `common_event_service`, `runtime_core`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 10 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_unittest` 5 个，`group` 5 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/arkui/ui_appearance/bundle.json](../../../../../../foundation/arkui/ui_appearance/bundle.json)
- 原始源码 README：[foundation/arkui/ui_appearance/README_zh.md](../../../../../../foundation/arkui/ui_appearance/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
