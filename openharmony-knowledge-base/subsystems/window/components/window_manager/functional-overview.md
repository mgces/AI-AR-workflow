# window_manager 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

简介 架构说明 分离架构与合一架构详解 各子模块架构详解 开发方式 目录 约束 接口说明 相关仓 窗口管理子系统为 OpenHarmony 系统提供窗口管理和显示管理的核心能力，是UI显示的基础子系统，负责协调和管理系统中所有窗口的创建、销毁、布局、显示和交互。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `window` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 8000KB / 8000KB |
| 源码仓 | `foundation/window/window_manager` |

## 核心能力

- **Window Manager Window Manager Core**：提供“window manager core”能力，系统能力标识为 `SystemCapability.WindowManager.WindowManager.Core`。
- **Window Session Manager = false**：提供“window session manager = false”能力，系统能力标识为 `SystemCapability.Window.SessionManager = false`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `window_manager_use_sceneboard`：window manager use sceneboard。
- `window_manager_feature_coverage`：window manager 功能 覆盖率。
- `window_manager_dayu210_resource_config`：window manager dayu210 re媒体源 config。
- `window_manager_feature_subscribe_motion`：window manager 功能 subscribe motion。
- `window_manager_feature_tp_enable`：window manager 功能 tp 启用。
- `window_manager_fold_ability`：window manager fold ability。
- `window_manager_feature_screen_active_mode`：window manager 功能 screen active mode。
- `window_manager_feature_screen_color_gamut`：window manager 功能 screen color gamut。
- `window_manager_feature_screen_hdr_format`：window manager 功能 screen hdr format。
- `window_manager_feature_screen_color_space`：window manager 功能 screen color space。
- `window_manager_feature_multi_screen`：window manager 功能 multi screen。
- `window_manager_feature_multi_screen_frame_ctl`：window manager 功能 multi screen frame ctl。
- `window_manager_feature_cam_mode`：window manager 功能 cam mode。
- `window_manager_feature_multi_usr`：window manager 功能 multi usr。
- `window_manager_feature_screenless`：window manager 功能 screenless。
- `window_manager_feature_asbng_path`：window manager 功能 asbng path。
- `window_manager_feature_support_dsoftbus`：window manager 功能 支持 dsoftbus。
- `window_manager_feature_support_dmsfwk`：window manager 功能 支持 dmsfwk。
- `window_manager_feature_support_api_metrics`：window manager 功能 支持 api metrics。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/window/window_manager/window_scene](../../../../../../foundation/window/window_manager/window_scene) | 窗口生命周期、布局、层级和交互管理能力。 | 267 | `common`, `intention_event`, `interfaces`, `screen_session_manager`, `screen_session_manager_client`, `session`, `session_manager`, `session_manager_service` |
| [foundation/window/window_manager/interfaces](../../../../../../foundation/window/window_manager/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 143 | `innerkits`, `kits` |
| [foundation/window/window_manager/wm](../../../../../../foundation/window/window_manager/wm) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 106 | `include`, `src` |
| [foundation/window/window_manager/wmserver](../../../../../../foundation/window/window_manager/wmserver) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 46 | `include`, `src` |
| [foundation/window/window_manager/utils](../../../../../../foundation/window/window_manager/utils) | 跨模块复用的基础工具和通用数据结构。 | 38 | `include`, `src` |
| [foundation/window/window_manager/dm](../../../../../../foundation/window/window_manager/dm) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 25 | `include`, `src` |
| [foundation/window/window_manager/dmserver](../../../../../../foundation/window/window_manager/dmserver) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 23 | `include`, `src` |
| [foundation/window/window_manager/extension](../../../../../../foundation/window/window_manager/extension) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 18 | `extension_connection`, `modal_system_ui_extension`, `window_extension` |
| [foundation/window/window_manager/dm_lite](../../../../../../foundation/window/window_manager/dm_lite) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 16 | `include`, `src` |
| [foundation/window/window_manager/resources](../../../../../../foundation/window/window_manager/resources) | 运行资源、界面资源或组件随包资源。 | 14 | `abc`, `config`, `media` |
| [foundation/window/window_manager/product](../../../../../../foundation/window/window_manager/product) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 12 | `pc`, `phone`, `tablet` |
| [foundation/window/window_manager/previewer](../../../../../../foundation/window/window_manager/previewer) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 11 | `include`, `mock`, `src`, `window_stage_modules` |
| [foundation/window/window_manager/snapshot](../../../../../../foundation/window/window_manager/snapshot) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 10 | `include`, `src` |
| [foundation/window/window_manager/etc](../../../../../../foundation/window/window_manager/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 4 | - |
| [foundation/window/window_manager/setresolution](../../../../../../foundation/window/window_manager/setresolution) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 3 | `include`, `src` |
| [foundation/window/window_manager/edidparse](../../../../../../foundation/window/window_manager/edidparse) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | - |

## 对外与内部接口

该部件声明 39 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/window/window_manager/wm:libwm` | `//foundation/window/window_manager/interfaces/innerkits/wm` | `window.h`, `window_accessibility_controller.h`, `window_manager.h`, `window_option.h`, `window_scene.h`, `wm_common.h`, `occupied_area_change_info.h`, `window_input_intercept_client.h` 等 9 个 |
| `//foundation/window/window_manager/wm:libwm_lite` | `//foundation/window/window_manager/interfaces/innerkits/wm` | `window_accessibility_controller.h`, `window_manager.h`, `window_manager_lite.h`, `window_option.h`, `wm_common.h`, `occupied_area_change_info.h` |
| `//foundation/window/window_manager/utils:libwmutil` | `//foundation/window/window_manager/utils/include` | `singleton_container.h` |
| `//foundation/window/window_manager/utils:libwmutil_base` | `//foundation/window/window_manager/utils/include` | - |
| `//foundation/window/window_manager/utils:libwmutil_static` | `//foundation/window/window_manager/utils/include` | - |
| `//foundation/window/window_manager/dm:libdm` | `//foundation/window/window_manager/interfaces/innerkits/dm` | `display.h`, `display_manager.h`, `display_property.h`, `dm_common.h`, `screen.h`, `screen_group.h`, `screen_manager.h` |
| `//foundation/window/window_manager/dm:libdm_ndk` | `//foundation/window/window_manager/interfaces/kits/dmndk/dm` | - |
| `//foundation/window/window_manager/edidparse:libedid_parse` | `//foundation/window/window_manager/interfaces/innerkits/edidparse` | - |
| `//foundation/window/window_manager/dm_lite:libdm_lite` | `//foundation/window/window_manager/interfaces/innerkits/dm_lite` | `display_lite.h`, `display_manager_lite.h`, `../dm/display_property.h`, `../dm/dm_common.h` |
| `//foundation/window/window_manager/extension/extension_connection:libwindow_extension_client` | `//foundation/window/window_manager/interfaces/innerkits/extension` | `window_extension_connection.h` |
| `//foundation/window/window_manager/extension/modal_system_ui_extension:libmodal_system_ui_extension_client` | `//foundation/window/window_manager/interfaces/innerkits/extension` | `modal_system_ui_extension.h` |
| `//foundation/window/window_manager/window_scene/interfaces/innerkits:libwsutils` | `//foundation/window/window_manager/window_scene/interfaces/innerkits/include` | `scene_board_judgement.h` |
| `//foundation/window/window_manager/window_scene/session:scene_session` | `//foundation/window/window_manager/window_scene` | - |
| `//foundation/window/window_manager/window_scene/session:screen_session` | `//foundation/window/window_manager/window_scene` | - |
| `//foundation/window/window_manager/window_scene/session_manager:scene_session_manager` | `//foundation/window/window_manager/window_scene` | - |
| `//foundation/window/window_manager/window_scene/screen_session_manager:screen_session_manager` | `//foundation/window/window_manager/window_scene` | - |
| `//foundation/window/window_manager/window_scene/screen_session_manager_client:screen_session_manager_client` | `//foundation/window/window_manager/window_scene` | - |
| `//foundation/window/window_manager/window_scene/session_manager:session_manager` | `//foundation/window/window_manager/window_scene` | - |
| `//foundation/window/window_manager/window_scene/session_manager:session_manager_lite` | `//foundation/window/window_manager/window_scene` | - |
| `//foundation/window/window_manager/wmserver:sms` | `//foundation/window/window_manager/wmserver/include` | - |
| `//foundation/window/window_manager/previewer:previewer_window` | `//foundation/window/window_manager/previewer/include` | - |
| `//foundation/window/window_manager/wmserver:libwms` | `//foundation/window/window_manager/wmserver/include` | - |
| `//foundation/window/window_manager/dmserver:libdms` | `//foundation/window/window_manager/dmserver/include` | - |
| `//foundation/window/window_manager/previewer:previewer_window_napi` | `//foundation/window/window_manager/previewer/include` | - |
| `//foundation/window/window_manager/interfaces/kits/napi/embeddable_window_stage:embeddablewindowstage_kit` | `//foundation/window/window_manager/interfaces/kits/napi/embeddable_window_stage` | `js_embeddable_window_stage.h` |
| `//foundation/window/window_manager/interfaces/kits/ani/embeddable_window_stage:embeddablewindowstageani_kit` | `//foundation/window/window_manager/interfaces/kits/ani/embeddable_window_stage/embeddable_window_stage_ani` | - |
| `//foundation/window/window_manager/interfaces/kits/ani/window_runtime:windowstageani_kit` | `//foundation/window/window_manager/interfaces/kits/ani/window_runtime/window_stage_ani` | - |
| `//foundation/window/window_manager/window_scene/interfaces/kits/ani/scene_session_manager:scenesessionmanagerani_kit` | `//foundation/window/window_manager/window_scene/interfaces/kits/ani/scene_session_manager/scene_session_manager_ani` | - |
| `//foundation/window/window_manager/interfaces/kits/napi/extension_window:extensionwindow_napi` | `//foundation/window/window_manager/interfaces/kits/napi/extension_window` | `js_extension_window.h` |
| `//foundation/window/window_manager/interfaces/kits/napi/window_runtime:window_native_kit` | `//foundation/window/window_manager/interfaces/kits/napi/window_runtime` | - |
| `//foundation/window/window_manager/interfaces/kits/napi/window_runtime:windowstage_kit` | `//foundation/window/window_manager/interfaces/kits/napi/window_runtime` | - |
| `//foundation/window/window_manager/interfaces/kits/cj/display_runtime:cj_display_ffi` | `//foundation/window/window_manager/interfaces/kits/cj/display_runtime` | `cj_display_impl.h`, `cj_display_listener.h`, `cj_display_manager.h`, `display_ffi.h`, `display_utils.h` |
| `//foundation/window/window_manager/interfaces/kits/cj/screenshot:cj_screenshot_ffi` | `//foundation/window/window_manager/interfaces/kits/cj/screenshot` | `cj_screenshot_module.h`, `screenshot_ffi.h`, `screenshot_utils.h` |
| `//foundation/window/window_manager/interfaces/kits/cj/window_runtime:cj_window_ffi` | `//foundation/window/window_manager/interfaces/kits/cj/window_runtime` | `window_impl.h`, `window_stage_impl.h` |
| `//foundation/window/window_manager/wm:libpip_web` | `//foundation/window/window_manager/interfaces/innerkits/wm` | `web_picture_in_picture_controller_interface.h` |
| `//foundation/window/window_manager/wm:libpip_ndk` | `//foundation/window/window_manager/interfaces/kits/ndk/wm` | `oh_window_pip.h` |
| `//foundation/window/window_manager/interfaces/kits/napi/window_animation:window_animation_utils` | `//foundation/window/window_manager/interfaces/innerkits/wm` | `wm_animation_common.h` |
| `//foundation/window/window_manager/interfaces/kits/ani/window_animation:ani_window_animation_utils` | `//foundation/window/window_manager/interfaces/innerkits/wm` | `wm_animation_common.h` |
| `//foundation/window/window_manager/interfaces/kits/ani/environmental:copy_window_env_static_ets` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `systemabilitymgr` | [foundation](../../../systemabilitymgr/processes/foundation/foundation-runtime.md) | SA 实现 | `4606`, `4607` | `libwms.z.so`, `libscreen_session_manager.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/window/window_manager/sa_profile:wms_sa_profile` | [foundation/window/window_manager/sa_profile/BUILD.gn](../../../../../../foundation/window/window_manager/sa_profile/BUILD.gn) |
| `ohos_executable` | `//foundation/window/window_manager/setresolution:setresolution_screen` | [foundation/window/window_manager/setresolution/BUILD.gn](../../../../../../foundation/window/window_manager/setresolution/BUILD.gn) |
| `ohos_executable` | `//foundation/window/window_manager/snapshot:snapshot_display` | [foundation/window/window_manager/snapshot/BUILD.gn](../../../../../../foundation/window/window_manager/snapshot/BUILD.gn) |

生产库形态：`ohos_shared_library` 85 个，`ohos_static_library` 10 个，`ohos_source_set` 5 个，`ohos_ndk_library` 2 个。

## 依赖与协作边界

该部件声明 54 个组件依赖和 0 个三方依赖。

- 系统组件协作：`sensor`, `ability_base`, `graphic_2d`, `graphic_surface`, `hisysevent`, `ability_runtime`, `napi`, `common_event_service`, `hilog`, `access_token`, `init`, `bundle_framework`, `ipc`, `power_manager`, `hitrace`, `samgr`, `input`, `safwk`, `display_manager`, `config_policy`, `ace_engine`, `image_framework`, `preferences`, `hiview`, `ffrt`, `dsoftbus`, `hicollie`, `eventhandler`, `icu`, `c_utils`, `soc_perf`, `relational_store`, `resource_management`, `resource_schedule_service`, `imf`, `frame_aware_sched`, `memmgr`, `data_share`, `accessibility`, `security_component_manager`, `libjpeg-turbo`, `libxml2`, `selinux_adapter`, `cJSON`, `bounds_checking_function`, `device_status`, `runtime_core`, `zlib`, `screenlock_mgr`, `os_account`, `api_metrics`, `json`, `egl`, `opengles`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 687 个测试目标，bundle 声明 10 个测试入口。

主要测试形态：`ohos_unittest` 397 个，`group` 134 个，`ohos_fuzztest` 87 个，`ohos_systemtest` 47 个，`ohos_static_library` 13 个，`ohos_executable` 9 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/window/window_manager/bundle.json](../../../../../../foundation/window/window_manager/bundle.json)
- 原始源码 README：[foundation/window/window_manager/README_zh.md](../../../../../../foundation/window/window_manager/README_zh.md)、[foundation/window/window_manager/README.md](../../../../../../foundation/window/window_manager/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
