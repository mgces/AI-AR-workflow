# advanced_ui_component 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

advanced_ui 是基于使用场景设计，为应用提供高效的UI组合，接口封闭、风格一致，开箱即用的组件接口；使用ArkTS语言开发，依赖系统的public API advanced_ui框架提供了丰富的、ui设计统一的、高效的UI组合组件、样式定义，组件之间相互独立，随取随用，也可以在需求相同的地方重复使用。开发者可以高效的使用，节省大量的工作量。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `arkui` |
| 实现形态 | 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 5120KB / 10240KB |
| 源码仓 | `foundation/arkui/advanced_ui_component` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `advanced_ui_component_feature_pc`：advanced ui component 功能 pc。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/arkui/advanced_ui_component/customappbar](../../../../../../foundation/arkui/advanced_ui_component/customappbar) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 6 | `atomicservicemenubar`, `interfaces`, `source` |
| [foundation/arkui/advanced_ui_component/advanced_ui_component_static](../../../../../../foundation/arkui/advanced_ui_component/advanced_ui_component_static) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 5 | `fullscreenlaunchcomponent` |
| [foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent](../../../../../../foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 5 | `interfaces`, `source` |
| [foundation/arkui/advanced_ui_component/atomicservicenavigation](../../../../../../foundation/arkui/advanced_ui_component/atomicservicenavigation) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 4 | `interfaces`, `source` |
| [foundation/arkui/advanced_ui_component/atomicservicesearch](../../../../../../foundation/arkui/advanced_ui_component/atomicservicesearch) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 4 | `interfaces`, `source` |
| [foundation/arkui/advanced_ui_component/atomicservicetabs](../../../../../../foundation/arkui/advanced_ui_component/atomicservicetabs) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 4 | `interfaces`, `source` |
| [foundation/arkui/advanced_ui_component/atomicserviceweb](../../../../../../foundation/arkui/advanced_ui_component/atomicserviceweb) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 4 | `interfaces`, `source` |
| [foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent](../../../../../../foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `interfaces`, `source` |
| [foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent](../../../../../../foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `interfaces`, `source` |
| [foundation/arkui/advanced_ui_component/interstitialdialogaction](../../../../../../foundation/arkui/advanced_ui_component/interstitialdialogaction) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `interfaces`, `source` |
| [foundation/arkui/advanced_ui_component/.opencode](../../../../../../foundation/arkui/advanced_ui_component/.opencode) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `skills` |
| [foundation/arkui/advanced_ui_component/patches](../../../../../../foundation/arkui/advanced_ui_component/patches) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 9 个，`source_set` 1 个。

## 依赖与协作边界

该部件声明 6 个组件依赖和 0 个三方依赖。

- 系统组件协作：`hilog`, `napi`, `ace_engine`, `window_manager`, `c_utils`, `ipc`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/arkui/advanced_ui_component/bundle.json](../../../../../../foundation/arkui/advanced_ui_component/bundle.json)
- 原始源码 README：[foundation/arkui/advanced_ui_component/README_zh.md](../../../../../../foundation/arkui/advanced_ui_component/README_zh.md)、[foundation/arkui/advanced_ui_component/README.md](../../../../../../foundation/arkui/advanced_ui_component/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
