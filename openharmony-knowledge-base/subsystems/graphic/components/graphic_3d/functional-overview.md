# graphic_3d 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

AGP（Ark Graphics Platform）引擎是一款跨平台、高性能实时渲染的3D引擎，具有易用性、高画质、可扩展等特性。引擎使用先进的ECS（Entity-Component-System）架构设计，进行模块化封装（如材质定义、后处理特效等），为开发者提供了灵活易用的开发套件。AGP引擎支持Opengl ES/Vulkan后端，降低开发者对硬件资源依赖。 \| 模块 \| 能力描述 \| \|------------------------\|--------------------------------------------------------------------------------------------\| \| 模型解析 \| 提供解析GLTF模型的能力。 \| \| 材质定义 \| 提供了PBR（基于物理的渲染）等材质的定义。 \| \| 动画 \| 提供动画引擎的相关能力，如刚体、骨骼等。 \| \| 光照&阴影&反射 \| 提供定向光、点光源、聚光源等光源；提供PCF（基于硬阴影的抗锯齿算法）等算法。 \| \| 后处理特效 \| 主要完成ToneMapping（色调映射）、Bloom（高亮溢出）、HDR（高动态范围成像）、FXAA（快速近似抗锯齿）、Blur（模糊）等后处理特效功能。 \| \| 插件系统 \| 提供了加载各种插件的能力，利用插件开发新功能。 \| \| 资源管理 \| 此模块提供了资源管理能力，主要包含内存管理、线程管理、GPU资源管理等。 \| \| 系统抽象 \| 主要包含了文件系统、窗口系统、调试系统等。 \|

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `graphic` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 8000KB / 8000KB |
| 源码仓 | `foundation/graphic/graphic_3d` |

## 核心能力

- **Ark Ui Graphics3 D**：提供“ark ui 图形协同3 d”能力，系统能力标识为 `SystemCapability.ArkUi.Graphics3D`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/graphic/graphic_3d/lume](../../../../../../foundation/graphic/graphic_3d/lume) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 170 | `LumeBase`, `LumeBinaryCompile`, `LumeBoidsSwarm`, `LumeDotfield`, `LumeEngine`, `LumeJpg`, `LumeMRT`, `LumeMeta` |
| [foundation/graphic/graphic_3d/kits](../../../../../../foundation/graphic/graphic_3d/kits) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 29 | `ets`, `js` |
| [foundation/graphic/graphic_3d/3d_scene_adapter](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter) | 平台、硬件、协议或不同系统形态之间的适配层。 | 13 | `include`, `src` |
| [foundation/graphic/graphic_3d/3d_widget_adapter](../../../../../../foundation/graphic/graphic_3d/3d_widget_adapter) | 平台、硬件、协议或不同系统形态之间的适配层。 | 7 | `core`, `include`, `src` |
| [foundation/graphic/graphic_3d/camera_preview_plugin](../../../../../../foundation/graphic/graphic_3d/camera_preview_plugin) | 可插拔能力实现，由框架或服务在运行时选择和装载。 | 7 | `api`, `assets`, `src` |
| [foundation/graphic/graphic_3d/metadata](../../../../../../foundation/graphic/graphic_3d/metadata) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `lume` |

## 对外与内部接口

该部件声明 9 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/graphic/graphic_3d/3d_widget_adapter:lib3dWidgetAdapter` | `//foundation/graphic/graphic_3d/3d_widget_adapter/include` | `graphics_manager_common.h`, `graphics_task.h`, `i_engine.h`, `offscreen_context_helper.h`, `widget_adapter.h`, `texture_info.h`, `custom/custom_render_descriptor.h`, `custom/shader_input_buffer.h` 等 20 个 |
| `//foundation/graphic/graphic_3d/lume/LumeEngine:AGPEcshelperApi` | `//foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper` | `ComponentTools/base_manager.h`, `ComponentTools/component_query.h` |
| `//foundation/graphic/graphic_3d/lume/LumeEngine:AGPBaseApi` | `//foundation/graphic/graphic_3d/lume/LumeBase/api` | `base/util/uid_util.h`, `base/util/uid.h`, `base/util/base64_encode.h`, `base/util/log.h`, `base/util/formats.h`, `base/util/utf8_decode.h`, `base/util/errors.h`, `base/util/hash.h` 等 42 个 |
| `//foundation/graphic/graphic_3d/lume/LumeEngine:AGPEngineApi` | `//foundation/graphic/graphic_3d/lume/LumeEngine/api` | `platform/common/core/os/extensions_create_info.h`, `platform/common/core/os/intf_platform.h`, `platform/common/core/os/platform_trace_info.h`, `platform/common/core/os/platform_create_info.h`, `platform/ohos/core/os/intf_platform.h`, `platform/ohos/core/os/platform_create_info.h`, `core/threading/intf_thread_pool.h`, `core/engine_info.h` 等 55 个 |
| `//foundation/graphic/graphic_3d/lume/Lume_3D:AGP3DApi` | `//foundation/graphic/graphic_3d/lume/Lume_3D/api` | `3d/intf_plugin.h`, `3d/util/intf_picking.h`, `3d/util/intf_mesh_builder.h`, `3d/util/intf_render_util.h`, `3d/util/intf_scene_util.h`, `3d/util/intf_mesh_util.h`, `3d/intf_graphics_context.h`, `3d/render/render_data_defines_3d.h` 等 83 个 |
| `//foundation/graphic/graphic_3d/lume/LumeRender:AGPRenderApi` | `//foundation/graphic/graphic_3d/lume/LumeRender/api` | `render/vulkan/intf_device_vk.h`, `render/intf_plugin.h`, `render/util/intf_render_util.h`, `render/util/intf_render_frame_util.h`, `render/render_data_structures.h`, `render/resource_handle.h`, `render/shaders/common/render_blur_common.h`, `render/shaders/common/render_post_process_blocks.h` 等 55 个 |
| `//foundation/graphic/graphic_3d/lume/LumeMeta:AGPMetaApi` | `//foundation/graphic/graphic_3d/lume/LumeMeta/include` | - |
| `//foundation/graphic/graphic_3d/lume/LumeScene:AGPSceneApi` | `//foundation/graphic/graphic_3d/lume/LumeScene/include` | - |
| `//foundation/graphic/graphic_3d/kits/js:libKitHelper` | `//foundation/graphic/graphic_3d/kits/js/include` | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_source_set` 26 个，`ohos_shared_library` 19 个，`ohos_static_library` 11 个，`source_set` 6 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 31 个组件依赖和 0 个三方依赖。

- 系统组件协作：`c_utils`, `hilog`, `graphic_2d`, `graphic_surface`, `hitrace`, `icu`, `init`, `input`, `ipc`, `bounds_checking_function`, `resource_management`, `resource_schedule_service`, `napi`, `ability_runtime`, `bundle_framework`, `qos_manager`, `libpng`, `libjpeg-turbo`, `vulkan-loader`, `vulkan-headers`, `skia`, `freetype`, `zlib`, `runtime_core`, `meshoptimizer`, `api_metrics`, `egl`, `opengles`, `window_manager`, `form_fwk`, `ability_base`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 77 个测试目标，bundle 声明 17 个测试入口。

主要测试形态：`group` 24 个，`ohos_unittest` 20 个，`ohos_source_set` 9 个，`ohos_fuzztest` 8 个，`ohos_shared_library` 6 个，`ohos_static_library` 5 个，`action` 3 个，`source_set` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/graphic/graphic_3d/bundle.json](../../../../../../foundation/graphic/graphic_3d/bundle.json)
- 原始源码 README：[foundation/graphic/graphic_3d/README.md](../../../../../../foundation/graphic/graphic_3d/README.md)、[foundation/graphic/graphic_3d/README_en.md](../../../../../../foundation/graphic/graphic_3d/README_en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
