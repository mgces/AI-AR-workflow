# arkui：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 7 个部件，其中 5 个进入当前 rk3568 产品。2 个部件包含可识别的服务/可执行程序/SA profile，6 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `ace_engine` | ArkUI Cross-Platform Engine for UI layout measure and paint | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 3/24 | yes | [查看](components/ace_engine/functional-overview.md) |
| `ace_engine_lite` | 轻量系统**JS-UI框架子系统**，是OpenHarmony为开发者提供的一套开发OpenHarmony应用的JS-UI框架，部署在轻量系统上，为应用提供UI开发能力。 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/1 | no | [查看](components/ace_engine_lite/functional-overview.md) |
| `advanced_ui_component` | advanced_ui 是基于使用场景设计，为应用提供高效的UI组合，接口封闭、风格一致，开箱即用的组件接口；使用ArkTS语言开发，依赖系统的public API advanced_ui框架提供了丰富的、ui设计统一的、高效的UI组合组件、样式定义，组件之间相互独立，随取随用，也可以在需求相同的地方重复使用。 | 框架或基础库 + 聚合/代码生成 | 0/1 | yes | [查看](components/advanced_ui_component/functional-overview.md) |
| `arkui_cangjie_wrapper` | Cangjie Declarative UI Frontend for ArkUI Framework, provide UI components and StateManagement | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/arkui_cangjie_wrapper/functional-overview.md) |
| `napi` | Node-API (formerly N-API) is an API for build native Addons | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/4 | yes | [查看](components/napi/functional-overview.md) |
| `ui_appearance` | Provide ui_appearance management. | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/0 | yes | [查看](components/ui_appearance/functional-overview.md) |
| `ui_lite` | 该组件为应用开发提供UIKit接口，包括了动画、布局、图形转换、事件处理，以及丰富的UI组件。 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/3 | yes | [查看](components/ui_lite/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `arkui` | [ui_sa](processes/ui_sa/foundation-runtime.md) | `ace_engine` | 1 | [查看](processes/ui_sa/foundation-runtime.md) |
| `arkui` | [ui_service](processes/ui_service/foundation-runtime.md) | `ace_engine`, `ui_appearance` | 2 | [查看](processes/ui_service/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
