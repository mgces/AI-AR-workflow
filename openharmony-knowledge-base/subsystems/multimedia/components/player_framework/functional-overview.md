# player_framework 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Media standard provides atomic capabilities

源码 README 补充说明：

> 媒体组件为开发者提供一套简单易于理解的接口，能够使得开发者方便接入系统并使用系统的媒体资源。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 10000KB / 10000KB |
| 源码仓 | `foundation/multimedia/player_framework` |

## 核心能力

- **Multimedia Media AVTranscoder**：提供“media avtranscoder”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AVTranscoder`。
- **Multimedia Media AVMetadata Extractor**：提供“media avmetadata extractor”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AVMetadataExtractor`。
- **Multimedia Media AVImage Generator**：提供“media avimage generator”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AVImageGenerator`。
- **Multimedia System Sound Core**：提供“system sound core”能力，系统能力标识为 `SystemCapability.Multimedia.SystemSound.Core`。
- **Multimedia Audio Haptic Core**：提供“audio haptic core”能力，系统能力标识为 `SystemCapability.Multimedia.AudioHaptic.Core`。
- **Multimedia Media Sound Pool**：提供“media sound pool”能力，系统能力标识为 `SystemCapability.Multimedia.Media.SoundPool`。
- **Multimedia Media AVScreen Capture**：提供“media avscreen capture”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AVScreenCapture`。
- **Multimedia Media Audio Player**：提供“media audio player”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AudioPlayer`。
- **Multimedia Media Video Player**：提供“media video player”能力，系统能力标识为 `SystemCapability.Multimedia.Media.VideoPlayer`。
- **Multimedia Media Audio Recorder**：提供“media audio recorder”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AudioRecorder`。
- **Multimedia Media Video Recorder**：提供“media video recorder”能力，系统能力标识为 `SystemCapability.Multimedia.Media.VideoRecorder`。
- **Multimedia Media AVPlayer**：提供“media avplayer”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AVPlayer`。
- **Multimedia Media AVRecorder**：提供“media avrecorder”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AVRecorder`。
- **Multimedia Media Low Power AVSink**：提供“media low 电源协同 avsink”能力，系统能力标识为 `SystemCapability.Multimedia.Media.LowPowerAVSink`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `player_framework_support_player`：player framework 支持 player。
- `player_framework_support_recorder`：player framework 支持 recorder。
- `player_framework_support_player_js_api9`：player framework 支持 player js api9。
- `player_framework_support_recorder_js_api9`：player framework 支持 recorder js api9。
- `player_framework_support_metadata`：player framework 支持 metadata。
- `player_framework_support_histreamer`：player framework 支持 histreamer。
- `player_framework_support_video`：player framework 支持 video。
- `player_framework_support_jsapi`：player framework 支持 jsapi。
- `player_framework_support_capi`：player framework 支持 capi。
- `player_framework_support_test`：player framework 支持 测试。
- `player_framework_support_xcollie`：player framework 支持 xcollie。
- `player_framework_support_jsstack`：player framework 支持 jsstack。
- `player_framework_support_seccomp`：player framework 支持 seccomp。
- `player_framework_support_screen_capture`：player framework 支持 screen capture。
- `player_framework_support_screen_capture_stopbycall`：player framework 支持 screen capture stopbycall。
- `player_framework_support_screen_capture_controller`：player framework 支持 screen capture controller。
- `player_framework_support_jssoundpool`：player framework 支持 jssoundpool。
- `player_framework_support_mediasource`：player framework 支持 media媒体源。
- `player_framework_check_video_is_hdr_vivid`：player framework check video is hdr vivid。
- `player_framework_support_monitor`：player framework 支持 monitor。
- `player_framework_support_avsession_background`：player framework 支持 avsession background。
- `player_framework_support_drm`：player framework 支持 drm。
- `player_framework_support_vibrator`：player framework 支持 vibrator。
- `player_framework_support_power_manager`：player framework 支持 电源协同 manager。
- `player_framework_support_json`：player framework 支持 json。
- `player_framework_feature_pc_select_window`：player framework 功能 pc select window。
- `player_framework_feature_phone_pad_select_window`：player framework 功能 phone pad select window。
- `player_framework_enable_start_stop_on_demand`：player framework 启用 按需启停。
- `player_framework_support_lowpower_av_sink`：player framework 支持 low电源协同 av sink。
- `player_framework_support_media_madvise`：player framework 支持 media madvise。
- `player_framework_support_audio_convert`：player framework 支持 audio convert。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/player_framework/frameworks](../../../../../../foundation/multimedia/player_framework/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 59 | `cj`, `js`, `native`, `taihe` |
| [foundation/multimedia/player_framework/services](../../../../../../foundation/multimedia/player_framework/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 55 | `dfx`, `engine`, `etc`, `include`, `seccomp_policy`, `services`, `utils` |
| [foundation/multimedia/player_framework/interfaces](../../../../../../foundation/multimedia/player_framework/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 20 | `inner_api`, `kits` |
| [foundation/multimedia/player_framework/.opencode](../../../../../../foundation/multimedia/player_framework/.opencode) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `skills` |

## 对外与内部接口

该部件声明 14 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/player_framework/services/utils:media_service_utils` | `//foundation/multimedia/player_framework/services/utils/include` | - |
| `//foundation/multimedia/player_framework/interfaces/inner_api/native:media_client` | `//foundation/multimedia/player_framework/interfaces/inner_api/native` | `player.h`, `recorder.h`, `screen_capture.h`, `media_errors.h`, `lpp_audio_streamer.h`, `lpp_video_streamer.h` |
| `//foundation/multimedia/player_framework/frameworks/native/media_service_helper:media_helper_client` | `//foundation/multimedia/player_framework/interfaces/inner_api/native/media_service_helper` | `media_service_helper.h` |
| `//foundation/multimedia/player_framework/frameworks/native/video_editor:video_editor` | `//foundation/multimedia/player_framework/interfaces/inner_api/native/video_editor/include` | `video_editor.h` |
| `//foundation/multimedia/player_framework/interfaces/kits/js:napi_packages` | `//foundation/multimedia/player_framework/interfaces/kits/js` | `native_module_ohos_media.h` |
| `//foundation/multimedia/player_framework/frameworks/native/system_sound_manager:system_sound_client` | `//foundation/multimedia/player_framework/interfaces/inner_api/native/system_sound_manager/include` | `ringtone_player.h`, `system_sound_manager.h`, `system_tone_plyaer.h` |
| `//foundation/multimedia/player_framework/frameworks/native/audio_haptic:audio_haptic` | `//foundation/multimedia/player_framework/interfaces/inner_api/native/audio_haptic/include` | `audio_haptic_manager.h`, `audio_haptic_player.h` |
| `//foundation/multimedia/player_framework/frameworks/cj/avplayer:cj_avplayer_ffi` | `//foundation/multimedia/player_framework/frameworks/cj/avplayer` | - |
| `//foundation/multimedia/player_framework/frameworks/cj/soundpool:cj_soundpool_ffi` | `//foundation/multimedia/player_framework/frameworks/cj/soundpool/include` | - |
| `//foundation/multimedia/player_framework/frameworks/cj/metadatahelper:cj_metadatahelper_ffi` | `//foundation/multimedia/player_framework/frameworks/cj/metadatahelper/include` | - |
| `//foundation/multimedia/player_framework/frameworks/cj/audio_haptic:cj_audiohaptic_ffi` | `//foundation/multimedia/player_framework/frameworks/cj/audio_haptic/include` | - |
| `//foundation/multimedia/player_framework/frameworks/cj/avscreen_capture:cj_avscreen_capture_ffi` | `//foundation/multimedia/player_framework/frameworks/cj/avscreen_capture/include` | - |
| `//foundation/multimedia/player_framework/frameworks/cj/avtranscoder:cj_avtranscoder_ffi` | `//foundation/multimedia/player_framework/frameworks/cj/avtranscoder/include` | - |
| `//foundation/multimedia/player_framework/frameworks/cj/avrecorder:cj_media_avrecorder_ffi` | `//foundation/multimedia/player_framework/frameworks/cj/avrecorder` | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `multimedia` | [media_service](../../processes/media_service/foundation-runtime.md) | 启动配置, SA 实现 | `3002` | `libmedia_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_shared_library` | `//foundation/multimedia/player_framework/services/dfx:media_service_log_dfx` | [foundation/multimedia/player_framework/services/dfx/BUILD.gn](../../../../../../foundation/multimedia/player_framework/services/dfx/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimedia/player_framework/services/dfx:media_service_dfx` | [foundation/multimedia/player_framework/services/dfx/BUILD.gn](../../../../../../foundation/multimedia/player_framework/services/dfx/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/multimedia/player_framework/services/etc:media_service_profile` | [foundation/multimedia/player_framework/services/etc/BUILD.gn](../../../../../../foundation/multimedia/player_framework/services/etc/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimedia/player_framework/services/services:media_service` | [foundation/multimedia/player_framework/services/services/BUILD.gn](../../../../../../foundation/multimedia/player_framework/services/services/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimedia/player_framework/services/utils:media_service_utils` | [foundation/multimedia/player_framework/services/utils/BUILD.gn](../../../../../../foundation/multimedia/player_framework/services/utils/BUILD.gn) |

生产库形态：`ohos_shared_library` 35 个，`ohos_static_library` 9 个，`taihe_shared_library` 4 个。

## 依赖与协作边界

该部件声明 68 个组件依赖和 1 个三方依赖。

- 系统组件协作：`openssl`, `av_session`, `ets_runtime`, `safwk`, `hilog`, `window_manager`, `napi`, `samgr`, `hitrace`, `audio_framework`, `ipc`, `graphic_2d`, `graphic_surface`, `hisysevent`, `c_utils`, `zlib`, `access_token`, `image_framework`, `hiview`, `eventhandler`, `ffrt`, `init`, `input`, `hicollie`, `media_foundation`, `netmanager_base`, `drivers_interface_display`, `openmax`, `hdf_core`, `ability_base`, `ability_runtime`, `bundle_framework`, `distributed_notification_service`, `relational_store`, `resource_management`, `av_codec`, `miscdevice`, `drm_framework`, `qos_manager`, `config_policy`, `power_manager`, `media_library`, `common_event_service`, `call_manager`, `core_service`, `state_registry`, `resource_schedule_service`, `ffmpeg`, `bounds_checking_function`, `libxml2`, `libuv`, `data_share`, `ringtone_library`, `os_account`, `i18n`, `skia`, `camera_framework`, `drivers_interface_camera`, `image_effect`, `jsoncpp`, `memmgr`, `hiappevent`, `drivers_interface_lpplayer`, `runtime_core`, `json`, `histreamer_ext`, `egl`, `opengles`。
- 三方实现依赖：`bounds_checking_function`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 237 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_unittest` 118 个，`ohos_fuzztest` 114 个，`group` 4 个，`ohos_executable` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/player_framework/bundle.json](../../../../../../foundation/multimedia/player_framework/bundle.json)
- 原始源码 README：[foundation/multimedia/player_framework/README_zh.md](../../../../../../foundation/multimedia/player_framework/README_zh.md)、[foundation/multimedia/player_framework/README.md](../../../../../../foundation/multimedia/player_framework/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
