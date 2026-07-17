# ui_lite 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

该组件为应用开发提供UIKit接口，包括了动画、布局、图形转换、事件处理，以及丰富的UI组件。 组件内部直接调用HAL接口，或者使用WMS\(Window Manager Service\)提供的客户端与硬件交互，以完成事件响应、图像绘制等操作。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `arkui` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | mini,small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 900KB / ~90KB |
| 源码仓 | `foundation/arkui/ui_lite` |

## 核心能力

- **Applications Settings Core Lite**：提供“core lite”能力，系统能力标识为 `SystemCapability.Applications.Settings.Core.Lite`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `ui_lite_enable_video_component_config`：ui lite 启用 video component config。
- `ui_lite_enable_graphic_font_config`：ui lite 启用 graphic font config。
- `ui_lite_enable_smarthomehost_config`：ui lite 启用 smarthomehost config。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/arkui/ui_lite/ext](../../../../../../foundation/arkui/ui_lite/ext) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 14 | `home_host`, `ide`, `updater` |
| [foundation/arkui/ui_lite/frameworks](../../../../../../foundation/arkui/ui_lite/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 0 | `animator`, `common`, `components`, `core`, `default_resource`, `dfx`, `dock`, `draw` |
| [foundation/arkui/ui_lite/interfaces](../../../../../../foundation/arkui/ui_lite/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `innerkits`, `kits` |
| [foundation/arkui/ui_lite/tools](../../../../../../foundation/arkui/ui_lite/tools) | 开发、诊断、命令行或构建辅助工具。 | 0 | `qt`, `server` |

## 对外与内部接口

该部件声明 3 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/arkui/ui_lite/ext/updater:libupdater_layout` | `//foundation/arkui/ui_lite/frameworks`<br>`//foundation/arkui/ui_lite/interfaces/kits`<br>`//foundation/arkui/ui_lite/interfaces/innerkits` | - |
| `//foundation/arkui/ui_lite/ext/ide:ui_ide` | - | - |
| `//foundation/arkui/ui_lite/ext/home_host:libhome_host_layout` | `//foundation/arkui/ui_lite/frameworks`<br>`//foundation/arkui/ui_lite/interfaces/kits`<br>`//foundation/arkui/ui_lite/interfaces/innerkits` | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 2 个，`ohos_static_library` 2 个，`lite_library` 1 个。

## 依赖与协作边界

该部件声明 11 个组件依赖和 0 个三方依赖。

- 系统组件协作：`graphic_utils_lite`, `surface_lite`, `window_manager_lite`, `media_lite`, `libjpeg-turbo`, `icu`, `cJSON`, `freetype`, `bounds_checking_function`, `libpng`, `harfbuzz`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 7 个测试目标，bundle 声明 0 个测试入口。

主要测试形态：`group` 4 个，`static_library` 2 个，`unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/arkui/ui_lite/bundle.json](../../../../../../foundation/arkui/ui_lite/bundle.json)
- 原始源码 README：[foundation/arkui/ui_lite/README_zh.md](../../../../../../foundation/arkui/ui_lite/README_zh.md)、[foundation/arkui/ui_lite/README.md](../../../../../../foundation/arkui/ui_lite/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
