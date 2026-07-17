# graphic_2d 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

• 接口层：提供图形的 Native API能力，包括：WebGL、Native Drawing的绘制能力、OpenGL 指令级的绘制能力支撑等。 • 框架层：分为 Render Service、Drawing、Animation、Effect、显示与内存管理五个模块。 \| 模块 \| 能力描述 \| \|------------------------\|--------------------------------------------------------------------------------------------\| \| Render Servicel （渲染服务） \| 提供UI框架的绘制能力，其核心职责是将ArkUI的控件描述转换成绘制树信息，根据对应的渲染策略，进行最佳路径渲染。同时，负责多窗口流畅和空间态下UI共享的核心底层机制。 \| \| Drawing （绘制） \| 提供图形子系统内部的标准化接口，主要完成2D渲染、3D渲染和渲染引擎的管理等基本功能。 \| \| Animation (动画） \| 提供动画引擎的相关能力。 \| \| Effect （效果） \| 主要完成图片效果、渲染特效等效果处理的能力，包括：多效果的串联、并联处理，在布局时加入渲染特效、控件交互特效等相关能力。 \| \| 显示与内存管理 \| 此模块是图形栈与硬件解耦的主要模块，主要定义了OpenHarmony 显示与内存管理的能力，其定义的南向HDI 接口需要让不同的OEM厂商完成对OpenHarmony图形栈的适配． \|

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `graphic` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 10000KB / 10000KB |
| 源码仓 | `foundation/graphic/graphic_2d` |

## 核心能力

- **Graphic Graphic2 D Color Manager Core**：提供“color manager core”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.ColorManager.Core`。
- **Graphic Graphic2 D EGL**：提供“graphic2 d egl”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.EGL`。
- **Graphic Graphic2 D GLES2**：提供“graphic2 d gles2”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.GLES2`。
- **Graphic Graphic2 D GLES3**：提供“graphic2 d gles3”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.GLES3`。
- **Graphic Graphic2 D GL4 = false**：提供“graphic2 d gl4 = false”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.GL4 = false`。
- **Graphic Graphic2 D Hyper Graphic Manager**：提供“graphic2 d hyper graphic manager”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.HyperGraphicManager`。
- **Graphic Graphic2 D Native Buffer**：提供“graphic2 d native buffer”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.NativeBuffer`。
- **Graphic Graphic2 D Native Drawing**：提供“graphic2 d native drawing”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.NativeDrawing`。
- **Graphic Graphic2 D Native Image**：提供“graphic2 d native image”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.NativeImage`。
- **Graphic Graphic2 D Native Vsync**：提供“graphic2 d native vsync”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.NativeVsync`。
- **Graphic Graphic2 D Native Window**：提供“graphic2 d native window”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.NativeWindow`。
- **Graphic Graphic2 D Web GL**：提供“graphic2 d web gl”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.WebGL`。
- **Graphic Graphic2 D Web GL2**：提供“graphic2 d web gl2”能力，系统能力标识为 `SystemCapability.Graphic.Graphic2D.WebGL2`。
- **Graphic Vulkan**：提供“graphic vulkan”能力，系统能力标识为 `SystemCapability.Graphic.Vulkan`。
- **Graphics Drawing**：提供“图形协同 drawing”能力，系统能力标识为 `SystemCapability.Graphics.Drawing`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `graphic_2d_feature_product`：graphic 2d 功能 product。
- `graphic_2d_feature_enable_pgo`：graphic 2d 功能 启用 pgo。
- `graphic_2d_feature_enable_codemerge`：graphic 2d 功能 启用 codemerge。
- `graphic_2d_feature_enable_func_arg_specialization`：graphic 2d 功能 启用 func arg specialization。
- `graphic_2d_feature_pgo_path`：graphic 2d 功能 pgo path。
- `graphic_2d_feature_bootanimation_enable`：graphic 2d 功能 bootanimation 启用。
- `graphic_2d_feature_ace_enable_gpu`：graphic 2d 功能 ace 启用 gpu。
- `graphic_2d_feature_rs_enable_eglimage`：graphic 2d 功能 rs 启用 eglimage。
- `graphic_2d_feature_color_gamut_enable`：graphic 2d 功能 color gamut 启用。
- `graphic_2d_feature_use_texgine`：graphic 2d 功能 use texgine。
- `graphic_2d_feature_rs_enable_uni_render`：graphic 2d 功能 rs 启用 uni render。
- `graphic_2d_feature_wuji_enable`：graphic 2d 功能 wuji 启用。
- `graphic_2d_feature_enable_afbc`：graphic 2d 功能 启用 afbc。
- `graphic_2d_feature_freemem_enable`：graphic 2d 功能 freemem 启用。
- `graphic_2d_feature_parallel_render_enable`：graphic 2d 功能 parallel render 启用。
- `graphic_2d_feature_tp_switch_enbale`：graphic 2d 功能 tp switch enbale。
- `graphic_2d_feature_rs_enable_profiler`：graphic 2d 功能 rs 启用 profiler。
- `graphic_2d_feature_enable_chipset_vsync`：graphic 2d 功能 启用 chipset vsync。
- `graphic_2d_feature_enable_opengl`：graphic 2d 功能 启用 opengl。
- `graphic_2d_feature_enable_opinc`：graphic 2d 功能 启用 opinc。
- `graphic_2d_feature_enable_rspipeline`：graphic 2d 功能 启用 rspipeline。
- `graphic_2d_feature_enable_stack_culling`：graphic 2d 功能 启用 stack culling。
- `graphic_2d_feature_enable_vulkan`：graphic 2d 功能 启用 vulkan。
- `graphic_2d_feature_use_igraphics_extend_hooks`：graphic 2d 功能 use i图形协同 extend hooks。
- `graphic_2d_feature_bootanimation_ext_enable`：graphic 2d 功能 bootanimation ext 启用。
- `graphic_2d_feature_overlay_display_enable`：graphic 2d 功能 overlay display 启用。
- `graphic_2d_feature_enable_opengl_to_vulkan`：graphic 2d 功能 启用 opengl to vulkan。
- `graphic_2d_feature_screenless_enable`：graphic 2d 功能 screenless 启用。
- `graphic_2d_feature_tv_metadata_enable`：graphic 2d 功能 tv metadata 启用。
- `graphic_2d_feature_rs_modifiers_draw_enable`：graphic 2d 功能 rs modifiers draw 启用。
- `graphic_2d_feature_upgrade_skia`：graphic 2d 功能 upgrade skia。
- `graphic_2d_feature_enable_rdo`：graphic 2d 功能 启用 rdo。
- `graphic_2d_feature_enable_memory_info_manager`：graphic 2d 功能 启用 memory info manager。
- `graphic_2d_feature_enable_drm`：graphic 2d 功能 启用 drm。
- `graphic_2d_feature_enable_mediacommon`：graphic 2d 功能 启用 mediacommon。
- `graphic_2d_feature_enable_image_detail_enhancer`：graphic 2d 功能 启用 image detail enhancer。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/graphic/graphic_2d/rosen](../../../../../../foundation/graphic/graphic_2d/rosen) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1757 | `modules`, `samples` |
| [foundation/graphic/graphic_2d/frameworks](../../../../../../foundation/graphic/graphic_2d/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 176 | `aps_monitor`, `bootanimation`, `gameservice_plugin`, `opengl_wrapper`, `surfaceimage`, `text`, `vulkan_layers` |
| [foundation/graphic/graphic_2d/interfaces](../../../../../../foundation/graphic/graphic_2d/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 79 | `inner_api`, `kits` |
| [foundation/graphic/graphic_2d/utils](../../../../../../foundation/graphic/graphic_2d/utils) | 跨模块复用的基础工具和通用数据结构。 | 55 | `build`, `color_manager`, `log`, `rs_frame_report_ext`, `sandbox`, `scoped_bytrace`, `socketpair`, `test_header` |
| [foundation/graphic/graphic_2d/graphic_test](../../../../../../foundation/graphic/graphic_2d/graphic_test) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 9 | `graphic_test_framework` |
| [foundation/graphic/graphic_2d/etc](../../../../../../foundation/graphic/graphic_2d/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 4 | - |
| [foundation/graphic/graphic_2d/.claude](../../../../../../foundation/graphic/graphic_2d/.claude) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `skills` |
| [foundation/graphic/graphic_2d/.gitcode](../../../../../../foundation/graphic/graphic_2d/.gitcode) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/graphic/graphic_2d/adapter](../../../../../../foundation/graphic/graphic_2d/adapter) | 平台、硬件、协议或不同系统形态之间的适配层。 | 0 | `ohos`, `preview` |

## 对外与内部接口

该部件声明 33 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/graphic/graphic_2d/rosen/modules/effect/effect_common:effect_common` | `//foundation/graphic/graphic_2d/rosen/modules/effect/effect_common/include` | `filter_common.h` |
| `//foundation/graphic/graphic_2d/interfaces/kits/napi/graphic/drawing:drawing_napi_impl` | `//foundation/graphic/graphic_2d/interfaces/kits/napi/graphic/drawing` | `canvas_napi/js_canvas.h` |
| `//foundation/graphic/graphic_2d/frameworks/text/interface/mlb/napi:text_napi_impl` | `//foundation/graphic/graphic_2d/frameworks/text/interface/mlb/napi` | `paragraph_napi/js_paragraph.h` |
| `//foundation/graphic/graphic_2d/frameworks/bootanimation/utils:libbootanimation_utils` | `//foundation/graphic/graphic_2d/interfaces/inner_api/bootanimation` | `boot_animation_utils.h` |
| `//foundation/graphic/graphic_2d/rosen/modules/composer:libcomposer` | `//foundation/graphic/graphic_2d/interfaces/inner_api/composer` | `vsync_receiver.h` |
| `//foundation/graphic/graphic_2d/rosen/modules/glfw_render_context:libglfw_render_context` | `//foundation/graphic/graphic_2d/rosen/modules/glfw_render_context/export` | `glfw_render_context.h` |
| `//foundation/graphic/graphic_2d/frameworks/surfaceimage:libnative_image` | `//foundation/graphic/graphic_2d/interfaces/inner_api/surface` | `native_image.h` |
| `//foundation/graphic/graphic_2d/frameworks/opengl_wrapper:EGL` | - | - |
| `//foundation/graphic/graphic_2d/frameworks/opengl_wrapper:GLESv3` | - | - |
| `//foundation/graphic/graphic_2d/frameworks/opengl_wrapper:GLv4` | - | - |
| `//foundation/graphic/graphic_2d/rosen/modules/frame_analyzer:libframe_analyzer` | `//foundation/graphic/graphic_2d/rosen/modules/frame_analyzer/export` | - |
| `//foundation/graphic/graphic_2d/utils:libgraphic_utils` | `//foundation/graphic/graphic_2d/interfaces/inner_api/common` | `graphic_common.h`, `graphic_common_c.h` |
| `//foundation/graphic/graphic_2d/rosen/modules/animation/window_animation:window_animation` | `//foundation/graphic/graphic_2d/rosen/modules/animation/window_animation/include` | `rs_iwindow_animation_controller.h`, `rs_iwindow_animation_finished_callback.h`, `rs_window_animation_finished_callback_stub.h`, `rs_window_animation_finished_callback.h`, `rs_window_animation_stub.h`, `rs_window_animation_target.h` |
| `//foundation/graphic/graphic_2d/rosen/modules/render_service:librender_service` | - | - |
| `//foundation/graphic/graphic_2d/rosen/modules/render_service_base:librender_service_base` | `//foundation/graphic/graphic_2d/rosen/modules/render_service_base/include` | `animation/rs_animation_timing_protocol.h`, `common/rs_common_def.h`, `common/rs_macros.h`, `common/rs_rect.h`, `common/rs_vector3.h`, `common/rs_vector4.h`, `render/rs_image.h`, `render/rs_light_up_effect_filter.h` 等 20 个 |
| `//foundation/graphic/graphic_2d/rosen/modules/render_service_base/proxy:librender_service_proxy` | `//foundation/graphic/graphic_2d/rosen/modules/render_service_base/include` | `transaction/rs_render_service_client.h` |
| `//foundation/graphic/graphic_2d/rosen/modules/render_service_client:librender_service_client` | `//foundation/graphic/graphic_2d/rosen/modules/render_service_client/core` | `animation/rs_animation.h`, `animation/rs_transition.h`, `animation/rs_animation_timing_curve.h`, `animation/rs_motion_path_option.h`, `feature/window_keyframe/rs_window_keyframe_node.h`, `ui/rs_node.h`, `ui/rs_proxy_node.h`, `ui/rs_base_node.h` 等 20 个 |
| `//foundation/graphic/graphic_2d/rosen/modules/2d_graphics:2d_graphics` | `//foundation/graphic/graphic_2d/rosen/modules/2d_graphics/include` | `draw/canvas.h`, `draw/pen.h`, `image/bitmap.h` |
| `//foundation/graphic/graphic_2d/rosen/modules/2d_graphics/drawing_ndk:native_drawing_ndk` | `//foundation/graphic/graphic_2d/rosen/modules/2d_graphics/drawing_ndk/include` | - |
| `//foundation/graphic/graphic_2d/rosen/modules/effect/effect_ndk:native_effect_ndk` | `//foundation/graphic/graphic_2d/rosen/modules/effect/effect_ndk/include` | - |
| `//foundation/graphic/graphic_2d/rosen/modules/effect/color_picker:color_picker` | `//foundation/graphic/graphic_2d/rosen/modules/effect/color_picker/include` | `color_picker.h`, `effect_errors.h` |
| `//foundation/graphic/graphic_2d/utils/color_manager:color_manager` | `//foundation/graphic/graphic_2d/utils/color_manager` | `export/color.h`, `export/color_space.h`, `export/color_space_convertor.h` |
| `//foundation/graphic/graphic_2d/interfaces/kits/napi/graphic/color_manager:color_space_object_convertor` | `//foundation/graphic/graphic_2d/interfaces/kits/napi/graphic/color_manager/color_space_object_convertor` | `color_space_object_convertor.h`, `js_color_space.h`, `js_color_space_utils.h`, `ndk_color_space.h` |
| `//foundation/graphic/graphic_2d/utils/color_manager/ndk:libnative_color_space_manager` | `//foundation/graphic/graphic_2d/interfaces/inner_api/color_manager` | `native_color_space_manager.h` |
| `//foundation/graphic/graphic_2d/interfaces/kits/napi/graphic/hdr_capability:hdr_capability_utils` | `//foundation/graphic/graphic_2d/interfaces/kits/napi/graphic/hdr_capability/hdr_capability_utils` | `js_hdr_format_utils.h` |
| `//foundation/graphic/graphic_2d/interfaces/kits/cj/color_manager:cj_color_manager_ffi` | `//foundation/graphic/graphic_2d/interfaces/kits/cj/color_manager` | `cj_color_manager.h`, `cj_color_mgr_utils.h` |
| `//foundation/graphic/graphic_2d/interfaces/kits/cj/effect_kit:cj_effect_kit_ffi` | `//foundation/graphic/graphic_2d/interfaces/kits/cj/effect_kit` | - |
| `//foundation/graphic/graphic_2d/rosen/modules/2d_engine/ddgr:libddgr` | `//foundation/graphic/graphic_2d/rosen/modules/2d_engine/ddgr` | - |
| `//foundation/graphic/graphic_2d/frameworks/text:rosen_text` | `//foundation/graphic/graphic_2d/frameworks/text/interface/export` | - |
| `//foundation/graphic/graphic_2d/interfaces/kits/ani/color_manager:ani_color_space_object_convertor` | `//foundation/graphic/graphic_2d/interfaces/kits/ani/color_manager/src/color_space_object_convertor` | `ani_color_space_object_convertor.h` |
| `//foundation/graphic/graphic_2d/interfaces/kits/ani/drawing:drawing_ani` | `//foundation/graphic/graphic_2d/interfaces/kits/ani/drawing` | `canvas_ani/ani_canvas.h` |
| `//foundation/graphic/graphic_2d/rosen/modules/composer/vsync:libvsync` | `//foundation/graphic/graphic_2d/rosen/modules/composer/vsync/include` | - |
| `//foundation/graphic/graphic_2d/frameworks/text/interface/mlb/ani:text_engine_ani` | `//foundation/graphic/graphic_2d/frameworks/text/interface/mlb/ani/include` | `ani_paragraph.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `graphic` | [bootanimation](../../processes/bootanimation/foundation-runtime.md) | 启动配置 | - | - |
| `graphic` | [render_service](../../processes/render_service/foundation-runtime.md) | 启动配置 | - | - |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_executable` | `//foundation/graphic/graphic_2d/frameworks/bootanimation:bootanimation` | [foundation/graphic/graphic_2d/frameworks/bootanimation/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/frameworks/bootanimation/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/modules/render_service:render_service` | [foundation/graphic/graphic_2d/rosen/modules/render_service/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/modules/render_service/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/modules/render_service:render_process` | [foundation/graphic/graphic_2d/rosen/modules/render_service/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/modules/render_service/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/samples/2d_graphics:drawing_engine_sample` | [foundation/graphic/graphic_2d/rosen/samples/2d_graphics/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/samples/2d_graphics/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/samples/2d_graphics:drawing_sample_rs` | [foundation/graphic/graphic_2d/rosen/samples/2d_graphics/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/samples/2d_graphics/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/samples/2d_graphics:drawing_sample_replayer` | [foundation/graphic/graphic_2d/rosen/samples/2d_graphics/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/samples/2d_graphics/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/samples/composer:hello_composer` | [foundation/graphic/graphic_2d/rosen/samples/composer/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/samples/composer/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/samples/hello_native_buffer:hello_native_buffer` | [foundation/graphic/graphic_2d/rosen/samples/hello_native_buffer/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/samples/hello_native_buffer/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/samples/hello_native_image:hello_native_image` | [foundation/graphic/graphic_2d/rosen/samples/hello_native_image/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/samples/hello_native_image/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/samples/hello_native_window:hello_native_window` | [foundation/graphic/graphic_2d/rosen/samples/hello_native_window/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/samples/hello_native_window/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/samples/hello_rosen:hello_rosen` | [foundation/graphic/graphic_2d/rosen/samples/hello_rosen/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/samples/hello_rosen/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/samples/hello_vsync:hello_vsync` | [foundation/graphic/graphic_2d/rosen/samples/hello_vsync/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/samples/hello_vsync/BUILD.gn) |
| `ohos_executable` | `//foundation/graphic/graphic_2d/rosen/samples/text/renderservice:drawing_text_sample` | [foundation/graphic/graphic_2d/rosen/samples/text/renderservice/BUILD.gn](../../../../../../foundation/graphic/graphic_2d/rosen/samples/text/renderservice/BUILD.gn) |

生产库形态：`ohos_shared_library` 62 个，`ohos_source_set` 34 个，`ohos_static_library` 6 个，`taihe_shared_library` 2 个，`render_service_client_source_set` 2 个，`colorspacemanager_napi_source_set` 1 个，`effect_ndk_source_set` 1 个，`color_manager_source_set` 1 个。

## 依赖与协作边界

该部件声明 61 个组件依赖和 1 个三方依赖。

- 系统组件协作：`window_manager`, `resource_management`, `api_metrics`, `napi`, `node`, `samgr`, `hdf_core`, `hilog`, `hisysevent`, `hitrace`, `ability_runtime`, `bundle_framework`, `drivers_interface_display`, `c_utils`, `access_token`, `safwk`, `eventhandler`, `config_policy`, `init`, `input`, `hicollie`, `image_framework`, `ipc`, `graphic_surface`, `graphics_effect`, `player_framework`, `resource_schedule_service`, `soc_perf`, `accessibility`, `frame_aware_sched`, `memmgr`, `sensor`, `qos_manager`, `video_processing_engine`, `bounds_checking_function`, `egl`, `opengles`, `vulkan-headers`, `vulkan-loader`, `cJSON`, `jsoncpp`, `openssl`, `zlib`, `libuv`, `icu`, `libpng`, `ffrt`, `libxml2`, `skia`, `vma`, `lz4`, `faultloggerd`, `freetype`, `rust_cxx`, `media_foundation`, `selinux_adapter`, `runtime_core`, `hiview`, `i18n`, `api_metrics`, `selinux_adapter`。
- 三方实现依赖：`skia`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 1670 个测试目标，bundle 声明 13 个测试入口。

主要测试形态：`group` 649 个，`ohos_unittest` 465 个，`ohos_fuzztest` 422 个，`ohos_executable` 50 个，`ohos_static_library` 25 个，`text_fuzztest` 18 个，`ohos_systemtest` 11 个，`text_unittest` 11 个，`connection_unittest` 6 个，`ohos_shared_library` 4 个，`rs_render_composer_unittest` 4 个，`ohos_source_set` 3 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/graphic/graphic_2d/bundle.json](../../../../../../foundation/graphic/graphic_2d/bundle.json)
- 原始源码 README：[foundation/graphic/graphic_2d/README_zh.md](../../../../../../foundation/graphic/graphic_2d/README_zh.md)、[foundation/graphic/graphic_2d/README.md](../../../../../../foundation/graphic/graphic_2d/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
