# ace_engine 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

ArkUI Cross-Platform Engine for UI layout measure and paint

源码 README 补充说明：

> ArkUI框架是OpenHarmony UI开发框架，提供开发者进行应用UI开发时所必需的能力，包括UI组件、动画、绘制、交互事件、JS API扩展机制等。ArkUI框架提供了两种开发范式，分别是基于ArkTS的声明式开发范式（简称“声明式开发范式”）和兼容JS的类Web开发范式（简称“类Web开发范式”）。 从上图可以看出，类Web开发范式与声明式开发范式的UI后端引擎和语言运行时是共用的，其中，UI后端引擎实现了ArkUI框架的六种基本能力。声明式开发范式无需JS Framework进行页面DOM管理，渲染更新链路更为精简，占用内存更少，因此更推荐开发者选用声明式开发范式来搭建应用UI界面。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `arkui` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 25600KB / 102400KB |
| 源码仓 | `foundation/arkui/ace_engine` |

## 核心能力

- **Ark UI Ark UI Full**：提供“ark ui full”能力，系统能力标识为 `SystemCapability.ArkUI.ArkUI.Full`。
- **Ark UI Ark UI Lite**：提供“ark ui lite”能力，系统能力标识为 `SystemCapability.ArkUI.ArkUI.Lite`。
- **Ark UI Ark UI Circle**：提供“ark ui circle”能力，系统能力标识为 `SystemCapability.ArkUI.ArkUI.Circle`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `ace_engine_feature_enable_accessibility`：ace engine 功能 启用 accessibility。
- `ace_engine_feature_enable_aps`：ace engine 功能 启用 aps。
- `ace_engine_feature_enable_web`：ace engine 功能 启用 web。
- `ace_engine_feature_enable_pgo`：ace engine 功能 启用 pgo。
- `ace_engine_feature_enable_codemerge`：ace engine 功能 启用 codemerge。
- `ace_engine_feature_enable_inst_prefetch`：ace engine 功能 启用 inst prefetch。
- `ace_engine_feature_pgo_path`：ace engine 功能 pgo path。
- `ace_engine_feature_enable_atomic`：ace engine 功能 启用 atomic。
- `ace_engine_feature_enable_coverage`：ace engine 功能 启用 覆盖率。
- `ace_engine_feature_enable_point_light`：ace engine 功能 启用 point light。
- `ace_engine_feature_enable_split_mode`：ace engine 功能 启用 split mode。
- `ace_engine_feature_enable_nav_split_mode`：ace engine 功能 启用 nav split mode。
- `ace_engine_feature_asbng_path`：ace engine 功能 asbng path。
- `ace_engine_feature_sched_model`：ace engine 功能 sched model。
- `ace_engine_feature_wearable`：ace engine 功能 wearable。
- `ace_engine_feature_enable_gpu`：ace engine 功能 启用 gpu。
- `ace_engine_feature_enable_form_size_change_animation`：ace engine 功能 启用 form size change animation。
- `ace_engine_feature_form_menu_enable`：ace engine 功能 form menu 启用。
- `ace_engine_feature_enable_event_extra_handling`：ace engine 功能 启用 event extra handling。
- `ace_engine_enable_circle_feature`：ace engine 启用 circle 功能。
- `ace_engine_feature_enable_long_press_gesture_extra_handling`：ace engine 功能 启用 long press gesture extra handling。
- `ace_engine_feature_enable_upgrade_skia`：ace engine 功能 启用 upgrade skia。
- `ace_engine_feature_enable_preload_dynamic_module`：ace engine 功能 启用 preload dynamic module。
- `ace_engine_feature_enable_default_click_sound`：ace engine 功能 启用 default click sound。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/arkui/ace_engine/frameworks](../../../../../../foundation/arkui/ace_engine/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 406 | `base`, `bridge`, `compatible`, `component_test`, `core` |
| [foundation/arkui/ace_engine/advanced_ui_component](../../../../../../foundation/arkui/ace_engine/advanced_ui_component) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 187 | `arcbutton`, `arcslider`, `chip`, `chipgroup`, `chipgroupv2`, `chipv2`, `composelistitem`, `composelistitemv2` |
| [foundation/arkui/ace_engine/interfaces](../../../../../../foundation/arkui/ace_engine/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 156 | `ets`, `inner_api`, `napi`, `native` |
| [foundation/arkui/ace_engine/adapter](../../../../../../foundation/arkui/ace_engine/adapter) | 平台、硬件、协议或不同系统形态之间的适配层。 | 51 | `ohos`, `preview` |
| [foundation/arkui/ace_engine/component_ext](../../../../../../foundation/arkui/ace_engine/component_ext) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 20 | `arc_alphabet_indexer`, `arc_list`, `arc_scroll_bar`, `arc_swiper`, `ext_common`, `movingphoto`, `movingphoto_ani` |
| [foundation/arkui/ace_engine/advanced_ui_component_static](../../../../../../foundation/arkui/ace_engine/advanced_ui_component_static) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 18 | `assembled_advanced_ui_component`, `downloadfilebutton`, `formmenu`, `fullscreenlaunchcomponent` |
| [foundation/arkui/ace_engine/.claude](../../../../../../foundation/arkui/ace_engine/.claude) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `agents`, `skills` |
| [foundation/arkui/ace_engine/.codespec](../../../../../../foundation/arkui/ace_engine/.codespec) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `changes` |
| [foundation/arkui/ace_engine/.gitcode](../../../../../../foundation/arkui/ace_engine/.gitcode) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/arkui/ace_engine/generative_ui](../../../../../../foundation/arkui/ace_engine/generative_ui) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `AppScope`, `a2ui_library`, `docs`, `entry`, `hvigor` |

## 对外与内部接口

该部件声明 13 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/arkui/ace_engine/interfaces/inner_api/ace:ace_uicontent` | `//foundation/arkui/ace_engine/interfaces/inner_api/ace/` | `navigation_controller.h`, `ui_content.h`, `ui_event.h`, `ui_event_observer.h`, `viewport_config.h`, `serialized_gesture.h`, `serializeable_object.h`, `modal_ui_extension_config.h` 等 9 个 |
| `//foundation/arkui/ace_engine/interfaces/inner_api/ace:ace_forward_compatibility` | `//foundation/arkui/ace_engine/interfaces/inner_api/ace/` | `ace_forward_compatibility.h`, `ai/data_detector_interface.h`, `ai/data_url_analyzer.h`, `share/text_share_interface.h`, `ai/image_analyzer.h`, `ai/image_analyzer_interface.h` |
| `//foundation/arkui/ace_engine/interfaces/inner_api/form_render:ace_form_render` | `//foundation/arkui/ace_engine/interfaces/inner_api/form_render/include` | `form_renderer_group.h` |
| `//foundation/arkui/ace_engine/interfaces/inner_api/drawable_descriptor:drawable_descriptor` | `//foundation/arkui/ace_engine/interfaces/inner_api/drawable_descriptor` | `drawable_descriptor.h` |
| `//foundation/arkui/ace_engine/interfaces/inner_api/xcomponent_controller:ace_xcomponent_controller` | `//foundation/arkui/ace_engine/interfaces/inner_api/xcomponent_controller/` | `xcomponent_controller.h` |
| `//foundation/arkui/ace_engine/build:libace` | `//foundation/arkui/ace_engine/` | `adapter/preview/entrance/ace_ability.h`, `adapter/preview/entrance/ace_run_args.h` |
| `//foundation/arkui/ace_engine/interfaces/native:ace_ndk` | `//foundation/arkui/ace_engine/interfaces/native` | `node/native_drawable_descriptor.h`, `native_interface_xcomponent.h`, `native_node.h`, `native_interface.h`, `native_type.h`, `native_node_ani.h`, `native_node_napi.h` |
| `//foundation/arkui/ace_engine/build:libace_compatible` | `//foundation/arkui/ace_engine/` | `adapter/preview/entrance/ace_ability.h`, `adapter/preview/entrance/ace_run_args.h` |
| `//foundation/arkui/ace_engine/frameworks/core:ace_container_scope` | `//foundation/arkui/ace_engine/frameworks/core/common/` | `container_scope.h` |
| `//foundation/arkui/ace_engine/interfaces/inner_api/ui_session:ui_session` | `//foundation/arkui/ace_engine/interfaces/inner_api/ui_session/` | `ui_content_service_interface.h`, `ui_content_proxy.h`, `param_config.h`, `ui_content_proxy_error_code.h` |
| `//foundation/arkui/ace_engine/frameworks/bridge/cj_frontend:cj_frontend_ohos` | `//foundation/arkui/ace_engine/frameworks/bridge/cj_frontend` | `runtime/cj_runtime_delegate.h` |
| `//foundation/arkui/ace_engine/frameworks/bridge/arkts_frontend/koala_projects/inner_api:copy_arkui_ets` | - | - |
| `//foundation/arkui/ace_engine/interfaces/inner_api/drawable:drawable_inner_ani` | `//foundation/arkui/ace_engine/interfaces/inner_api/drawable` | `drawable_descriptor_ani.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `arkui` | [ui_sa](../../processes/ui_sa/foundation-runtime.md) | 启动配置, SA 实现 | `16666` | `libui_sa.z.so` |
| `arkui` | [ui_service](../../processes/ui_service/foundation-runtime.md) | 启动配置, SA 实现 | `7001` | `libuiservice.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/arkui/ace_engine/adapter/ohos/sa_profile:ace_sa_profile` | [foundation/arkui/ace_engine/adapter/ohos/sa_profile/BUILD.gn](../../../../../../foundation/arkui/ace_engine/adapter/ohos/sa_profile/BUILD.gn) |
| `ohos_executable` | `//foundation/arkui/ace_engine/adapter/ohos/tools/raw_input_injector:rawinput` | [foundation/arkui/ace_engine/adapter/ohos/tools/raw_input_injector/BUILD.gn](../../../../../../foundation/arkui/ace_engine/adapter/ohos/tools/raw_input_injector/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/arkui/ace_engine/interfaces/inner_api/ui_session/ui_session_sample:ui_sa_profile` | [foundation/arkui/ace_engine/interfaces/inner_api/ui_session/ui_session_sample/BUILD.gn](../../../../../../foundation/arkui/ace_engine/interfaces/inner_api/ui_session/ui_session_sample/BUILD.gn) |

生产库形态：`ohos_shared_library` 95 个，`ohos_source_set` 14 个，`source_set` 3 个，`ace_capability_ohos_source_set` 1 个，`ace_ohos_standard_source_set` 1 个，`ace_osal_ohos_source_set` 1 个，`ohos_static_library` 1 个，`ohos_ndk_library` 1 个。

## 依赖与协作边界

该部件声明 75 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `hilog`, `hitrace`, `accessibility`, `frame_aware_sched`, `ability_runtime`, `api_metrics`, `ipc`, `samgr`, `preferences`, `relational_store`, `hisysevent`, `napi`, `hiview`, `hichecker`, `window_manager`, `c_utils`, `eventhandler`, `bundle_framework`, `ets_runtime`, `form_fwk`, `pasteboard`, `kv_store`, `udmf`, `os_account`, `graphic_2d`, `graphic_3d`, `graphic_surface`, `safwk`, `common_event_service`, `data_share`, `resource_management`, `runtime_core`, `i18n`, `hicollie`, `netmanager_base`, `netstack`, `init`, `image_framework`, `player_framework`, `audio_framework`, `access_token`, `input`, `webview`, `imf`, `device_status`, `soc_perf`, `security_component_manager`, `camera_framework`, `media_library`, `app_file_service`, `ets_utils`, `bounds_checking_function`, `libxml2`, `ffrt`, `icu`, `miscdevice`, `cJSON`, `curl`, `css-what`, `jsframework`, `opencl-headers`, `opengles`, `opencv`, `zlib`, `skia`, `libuv`, `resource_schedule_service`, `background_task_mgr`, `request`, `qrcodegen`, `sdk`, `screenlock_mgr`, `video_processing_engine`, `egl`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 496 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ace_unittest` 309 个，`ohos_unittest` 88 个，`group` 47 个，`ohos_source_set` 22 个，`ohos_static_library` 16 个，`ohos_shared_library` 3 个，`ohos_benchmarktest` 2 个，`copy` 2 个，`ohos_executable` 1 个，`ohos_app` 1 个，`ohos_js_assets` 1 个，`generate_static_abc` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/arkui/ace_engine/bundle.json](../../../../../../foundation/arkui/ace_engine/bundle.json)
- 原始源码 README：[foundation/arkui/ace_engine/README_zh.md](../../../../../../foundation/arkui/ace_engine/README_zh.md)、[foundation/arkui/ace_engine/README.md](../../../../../../foundation/arkui/ace_engine/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
