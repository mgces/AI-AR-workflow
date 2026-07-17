# accessibility 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The accessibility framework provides a standard mechanism for exchanging information between applications and assistive applications.

源码 README 补充说明：

> **无障碍子系统**提供在应用程序和辅助应用之间交换信息的标准机制，支持开发辅助应用增强无障碍功能体验。典型的应用场景包含两方面： 为残障人士提供使用应用的能力：例如针对视觉障碍人士提供屏幕朗读等功能。 为开发者提供与应用交互的能力：例如支持 UI 自动化测试框架、支持开发基于 UI 响应的辅助应用。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `barrierfree` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2000KB / 10000KB |
| 源码仓 | `foundation/barrierfree/accessibility` |

## 核心能力

- **Barrier Free Accessibility Core**：提供“accessibility core”能力，系统能力标识为 `SystemCapability.BarrierFree.Accessibility.Core`。
- **Barrier Free Accessibility Hearing**：提供“accessibility hearing”能力，系统能力标识为 `SystemCapability.BarrierFree.Accessibility.Hearing`。
- **Barrier Free Accessibility Vision**：提供“accessibility vision”能力，系统能力标识为 `SystemCapability.BarrierFree.Accessibility.Vision`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `accessibility_feature_coverage`：accessibility 功能 覆盖率。
- `accessibility_watch_feature`：accessibility watch 功能。
- `accessibility_dynamic_support`：accessibility dynamic 支持。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/barrierfree/accessibility/interfaces](../../../../../../foundation/barrierfree/accessibility/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 101 | `innerkits`, `kits` |
| [foundation/barrierfree/accessibility/common](../../../../../../foundation/barrierfree/accessibility/common) | 组件内部共享的公共定义、工具和基础实现。 | 42 | `etc`, `interface`, `log` |
| [foundation/barrierfree/accessibility/services](../../../../../../foundation/barrierfree/accessibility/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 39 | `aams`, `aams_ext`, `etc`, `multiuser` |
| [foundation/barrierfree/accessibility/frameworks](../../../../../../foundation/barrierfree/accessibility/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 13 | `aafwk`, `acfwk`, `asacfwk`, `common` |
| [foundation/barrierfree/accessibility/sa_profile](../../../../../../foundation/barrierfree/accessibility/sa_profile) | System Ability 注册信息及进程装载配置。 | 2 | - |
| [foundation/barrierfree/accessibility/resources](../../../../../../foundation/barrierfree/accessibility/resources) | 运行资源、界面资源或组件随包资源。 | 1 | `config` |
| [foundation/barrierfree/accessibility/tools](../../../../../../foundation/barrierfree/accessibility/tools) | 开发、诊断、命令行或构建辅助工具。 | 1 | `ohos-accessibilityManager` |

## 对外与内部接口

该部件声明 6 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/barrierfree/accessibility/common/interface:accessibility_interface` | `//foundation/barrierfree/accessibility/common/interface/include/parcel` | `accessibility_element_info_parcel.h`, `accessibility_event_info_parcel.h`, `accessibility_window_info_parcel.h` |
| `//foundation/barrierfree/accessibility/interfaces/innerkits/aafwk:accessibleability` | `//foundation/barrierfree/accessibility/interfaces/innerkits/aafwk/include` | `accessibility_ui_test_ability.h`, `accessible_ability_client.h`, `accessible_ability_listener.h` |
| `//foundation/barrierfree/accessibility/interfaces/innerkits/acfwk:accessibilityconfig` | `//foundation/barrierfree/accessibility/interfaces/innerkits/acfwk/include` | `accessibility_config.h` |
| `//foundation/barrierfree/accessibility/interfaces/innerkits/asacfwk:accessibilityclient` | `//foundation/barrierfree/accessibility/interfaces/innerkits/asacfwk/include` | `accessibility_state_event.h`, `accessibility_system_ability_client.h` |
| `//foundation/barrierfree/accessibility/interfaces/innerkits/common:accessibility_common` | `//foundation/barrierfree/accessibility/interfaces/innerkits/common/include` | `accessibility_ability_info.h`, `accessibility_constants.h`, `accessibility_def.h`, `accessibility_element_info.h`, `accessibility_event_info.h`, `accessibility_window_info.h` |
| `//foundation/barrierfree/accessibility/interfaces/kits/cj:cj_accessibility_ffi` | `//foundation/barrierfree/accessibility/interfaces/kits/cj/include` | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `barrierfree` | [accessibility](../../processes/accessibility/foundation-runtime.md) | 启动配置, SA 实现 | `801` | `libaccessibleabilityms.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/barrierfree/accessibility/sa_profile:aams_sa_profile` | [foundation/barrierfree/accessibility/sa_profile/BUILD.gn](../../../../../../foundation/barrierfree/accessibility/sa_profile/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/barrierfree/accessibility/tools/ohos-accessibilityManager:ohos-a11yManager` | [foundation/barrierfree/accessibility/tools/ohos-accessibilityManager/BUILD.gn](../../../../../../foundation/barrierfree/accessibility/tools/ohos-accessibilityManager/BUILD.gn) |

生产库形态：`ohos_shared_library` 17 个。

## 依赖与协作边界

该部件声明 40 个组件依赖和 0 个三方依赖。

- 系统组件协作：`graphic_2d`, `samgr`, `napi`, `window_manager`, `eventhandler`, `input`, `c_utils`, `common_event_service`, `ability_base`, `safwk`, `bundle_framework`, `ffrt`, `hicollie`, `hitrace`, `hilog`, `ipc`, `ability_runtime`, `init`, `access_token`, `display_manager`, `hisysevent`, `os_account`, `preferences`, `power_manager`, `data_share`, `resource_management`, `i18n`, `hiappevent`, `e2fsprogs`, `resource_schedule_service`, `cJSON`, `selinux_adapter`, `runtime_core`, `security_component_manager`, `memmgr`, `distributed_notification_service`, `time_service`, `json`, `ets_frontend`, `image_framework`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 131 个测试目标，bundle 声明 11 个测试入口。

主要测试形态：`group` 57 个，`ohos_fuzztest` 39 个，`ohos_unittest` 26 个，`ohos_moduletest` 6 个，`ohos_benchmarktest` 3 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/barrierfree/accessibility/bundle.json](../../../../../../foundation/barrierfree/accessibility/bundle.json)
- 原始源码 README：[foundation/barrierfree/accessibility/README_zh.md](../../../../../../foundation/barrierfree/accessibility/README_zh.md)、[foundation/barrierfree/accessibility/README.md](../../../../../../foundation/barrierfree/accessibility/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
