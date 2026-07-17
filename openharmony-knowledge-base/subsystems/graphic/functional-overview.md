# graphic：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 7 个部件，其中 5 个进入当前 rk3568 产品。1 个部件包含可识别的服务/可执行程序/SA profile，6 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `graphic_2d` | • 接口层：提供图形的 Native API能力，包括：WebGL、Native Drawing的绘制能力、OpenGL 指令级的绘制能力支撑等。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 15/36 | yes | [查看](components/graphic_2d/functional-overview.md) |
| `graphic_3d` | 引擎使用先进的ECS（Entity-Component-System）架构设计，进行模块化封装（如材质定义、后处理特效等），为开发者提供了灵活易用的开发套件。 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/0 | yes | [查看](components/graphic_3d/functional-overview.md) |
| `graphic_cangjie_wrapper` | The graphic_cangjie_wrapper is a Cangjie API encapsulated on OpenHarmony based on the capabilities of the Graphics Subsystem. | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/graphic_cangjie_wrapper/functional-overview.md) |
| `graphic_surface` | Surface组件用于管理和传递图形和媒体的共享内存。 | 系统内部接口 + 框架或基础库 | 0/1 | yes | [查看](components/graphic_surface/functional-overview.md) |
| `graphic_utils_lite` | HALS组件中实现了对驱动子系统和平台相关功能的适配封装，包括了FrameBuffer/GFX/SIMD等。 | 系统内部接口 + 框架或基础库 | 0/1 | yes | [查看](components/graphic_utils_lite/functional-overview.md) |
| `graphics_effect` | Graphics Effect是OpenHarmony图形子系统的重要部件，为图形子系统提供视觉特效算法能力，包括模糊、扭曲、颜色处理、光照、SDF形状与效果、遮罩、过渡等多种视觉特效。 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/1 | yes | [查看](components/graphics_effect/functional-overview.md) |
| `surface_lite` | Surface组件用于管理和传递图形和媒体的共享内存。 | 框架或基础库 | 0/0 | no | [查看](components/surface_lite/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `graphic` | [bootanimation](processes/bootanimation/foundation-runtime.md) | `graphic_2d` | 0 | [查看](processes/bootanimation/foundation-runtime.md) |
| `graphic` | [render_service](processes/render_service/foundation-runtime.md) | `graphic_2d` | 0 | [查看](processes/render_service/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
