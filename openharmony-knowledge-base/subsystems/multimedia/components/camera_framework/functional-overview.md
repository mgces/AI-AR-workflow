# camera_framework 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Camera standard provides managers and provides the camera resources to application to capture photo/preview/videos

源码 README 补充说明：

> Camera组件 - 简介 - 基本概念 - 目录 - 使用说明 - 拍照 - 开始和停止预览 - 视频录像 - 切换多个照相机设备 - 设置闪光灯 - 相关仓 相机组件支持相机业务的开发，开发者可以通过已开放的接口实现相机硬件的访问、操作和新功能开发，最常见的操作如：预览、拍照和录像等。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/multimedia/camera_framework` |

## 核心能力

- **Multimedia Camera Core**：提供“camera core”能力，系统能力标识为 `SystemCapability.Multimedia.Camera.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `camera_framework_feature_camera_rotate_plugin`：camera framework 功能 camera rotate plugin。
- `camera_framework_feature_camera_live_scene_recognition`：camera framework 功能 camera live scene recognition。
- `camera_framework_feature_moving_photo`：camera framework 功能 moving photo。
- `camera_framework_feature_beauty_notification`：camera framework 功能 beauty notification。
- `camera_framework_feature_movie_file`：camera framework 功能 movie file。
- `camera_framework_feature_rotate_param_update`：camera framework 功能 rotate param update。
- `camera_framework_feature_media_stream`：camera framework 功能 media stream。
- `camera_framework_feature_deferred`：camera framework 功能 deferred。
- `camera_framework_feature_xcomponent_toast`：camera framework 功能 xcomponent toast。
- `camera_framework_feature_capture_yuv`：camera framework 功能 capture yuv。
- `camera_framework_feature_camera_service_priority`：camera framework 功能 camera service priority。
- `camera_framework_feature_picker_pre_require_mem`：camera framework 功能 picker pre require mem。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/camera_framework/frameworks](../../../../../../foundation/multimedia/camera_framework/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 40 | `cj`, `js`, `native`, `taihe` |
| [foundation/multimedia/camera_framework/dynamic_libs](../../../../../../foundation/multimedia/camera_framework/dynamic_libs) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 17 | `av_codec`, `camera_notification`, `dfx`, `image_effect`, `image_framework`, `media_library`, `media_manager`, `moving_photo` |
| [foundation/multimedia/camera_framework/interfaces](../../../../../../foundation/multimedia/camera_framework/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 15 | `inner_api`, `kits` |
| [foundation/multimedia/camera_framework/services](../../../../../../foundation/multimedia/camera_framework/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 12 | `camera_service`, `deferred_processing_service`, `etc` |
| [foundation/multimedia/camera_framework/common](../../../../../../foundation/multimedia/camera_framework/common) | 组件内部共享的公共定义、工具和基础实现。 | 5 | `include`, `src`, `utils` |
| [foundation/multimedia/camera_framework/mediastream](../../../../../../foundation/multimedia/camera_framework/mediastream) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 5 | `include`, `src` |
| [foundation/multimedia/camera_framework/moviefile](../../../../../../foundation/multimedia/camera_framework/moviefile) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | `include`, `src` |
| [foundation/multimedia/camera_framework/sa_profile](../../../../../../foundation/multimedia/camera_framework/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |

## 对外与内部接口

该部件声明 10 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/camera_framework/frameworks/native/camera/base:camera_framework` | `//foundation/multimedia/camera_framework/interfaces/inner_api/native/camera/include` | `input/camera_input.h`, `input/camera_manager.h`, `input/capture_input.h`, `output/capture_output.h`, `output/metadata_output.h`, `output/photo_output.h`, `output/preview_output.h`, `output/video_output.h` 等 12 个 |
| `//foundation/multimedia/camera_framework/frameworks/native/camera/base:camera_framework_static` | `//foundation/multimedia/camera_framework/interfaces/inner_api/native/camera/include` | `input/camera_input.h`, `input/camera_manager.h`, `input/capture_input.h`, `output/capture_output.h`, `output/metadata_output.h`, `output/photo_output.h`, `output/preview_output.h`, `output/video_output.h` 等 12 个 |
| `//foundation/multimedia/camera_framework/frameworks/native/camera/extension:camera_framework_ex` | `//foundation/multimedia/camera_framework/frameworks/native/camera/extension/include` | `input/camera_manager_for_sys.h`, `output/depth_data_output.h`, `session/capture_session_for_sys.h` |
| `//foundation/multimedia/camera_framework/frameworks/cj:cj_camera_ffi` | `//foundation/multimedia/camera_framework/frameworks/cj/camera/include` | - |
| `//foundation/multimedia/camera_framework/frameworks/cj:cj_camera_picker_ffi` | `//foundation/multimedia/camera_framework/frameworks/cj/camera_picker/include` | - |
| `//foundation/multimedia/camera_framework/common:camera_utils` | `//foundation/multimedia/camera_framework/common` | `utils/camera_extend/include/camera_extend_interface.h` |
| `//foundation/multimedia/camera_framework/interfaces/kits/js/camera_napi:camera_napi` | `//foundation/multimedia/camera_framework/interfaces/kits/js/camera_napi/include` | `native_module_ohos_camera.h` |
| `//foundation/multimedia/camera_framework/interfaces/kits/js/camera_napi:camera_napi_base` | `//foundation/multimedia/camera_framework/interfaces/kits/js/camera_napi/include` | - |
| `//foundation/multimedia/camera_framework/interfaces/kits/js/camera_napi:camerapicker_napi` | `//foundation/multimedia/camera_framework/interfaces/kits/js/camera_napi/include`<br>`//foundation/multimedia/camera_framework/interfaces/kits/js/camera_napi/include/picker` | `camera_picker_napi.h` |
| `//foundation/multimedia/camera_framework/frameworks/taihe:copy_camera_taihe` | - | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `multimedia` | [camera_service](../../processes/camera_service/foundation-runtime.md) | 启动配置, SA 实现 | `3008` | `libcamera_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_hap` | `//foundation/multimedia/camera_framework/frameworks/js/camera_napi/demo:camera_sample_hap` | [foundation/multimedia/camera_framework/frameworks/js/camera_napi/demo/BUILD.gn](../../../../../../foundation/multimedia/camera_framework/frameworks/js/camera_napi/demo/BUILD.gn) |
| `ohos_app_scope` | `//foundation/multimedia/camera_framework/frameworks/js/camera_napi/demo:camera_sample_app_profile` | [foundation/multimedia/camera_framework/frameworks/js/camera_napi/demo/BUILD.gn](../../../../../../foundation/multimedia/camera_framework/frameworks/js/camera_napi/demo/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/multimedia/camera_framework/sa_profile:camera_service_sa_profile` | [foundation/multimedia/camera_framework/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/camera_framework/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimedia/camera_framework/services/camera_service:camera_service` | [foundation/multimedia/camera_framework/services/camera_service/BUILD.gn](../../../../../../foundation/multimedia/camera_framework/services/camera_service/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimedia/camera_framework/services/deferred_processing_service:deferred_processing_service` | [foundation/multimedia/camera_framework/services/deferred_processing_service/BUILD.gn](../../../../../../foundation/multimedia/camera_framework/services/deferred_processing_service/BUILD.gn) |

生产库形态：`ohos_shared_library` 24 个，`ohos_source_set` 4 个，`ohos_static_library` 2 个，`taihe_shared_library` 2 个。

## 依赖与协作边界

该部件声明 51 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `ace_engine`, `audio_framework`, `av_codec`, `bounds_checking_function`, `bundle_framework`, `c_utils`, `common_event_service`, `config_policy`, `data_share`, `device_manager`, `distributed_notification_service`, `drivers_interface_camera`, `drivers_interface_display`, `eventhandler`, `graphic_2d`, `graphic_surface`, `hdf_core`, `hicollie`, `hilog`, `hisysevent`, `hitrace`, `i18n`, `init`, `ipc`, `image_effect`, `image_framework`, `libexif`, `media_foundation`, `media_library`, `runtime_core`, `napi`, `os_account`, `qos_manager`, `resource_management`, `resource_schedule_service`, `safwk`, `samgr`, `sensor`, `thermal_manager`, `battery_manager`, `power_manager`, `window_manager`, `memmgr`, `e2fsprogs`, `libxml2`, `openssl`, `icu`, `storage_service`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 234 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`group` 108 个，`ohos_fuzztest` 105 个，`ohos_unittest` 8 个，`ohos_moduletest` 8 个，`ohos_executable` 4 个，`ohos_static_library` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/camera_framework/bundle.json](../../../../../../foundation/multimedia/camera_framework/bundle.json)
- 原始源码 README：[foundation/multimedia/camera_framework/README_zh.md](../../../../../../foundation/multimedia/camera_framework/README_zh.md)、[foundation/multimedia/camera_framework/README.md](../../../../../../foundation/multimedia/camera_framework/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
