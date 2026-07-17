# audio_framework 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Audio standard provides managers and provides the audio resources to application for play/record audio

源码 README 补充说明：

> 目录 使用说明 - 音频播放 - 音频录制 - 音频管理 - 音量控制 - 设备控制 - 音频场景 - 音频流管理 - JavaScript 用法 - 铃声管理 - 蓝牙SCO呼叫 支持设备 相关仓 采样是指将连续时域上的模拟信号按照一定的时间间隔采样，获取到离散时域上离散信号的过程。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 4500KB / 11000KB |
| 源码仓 | `foundation/multimedia/audio_framework` |

## 核心能力

- **Multimedia Audio Core**：提供“audio core”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.Core`。
- **Multimedia Audio Renderer**：提供“audio renderer”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.Renderer`。
- **Multimedia Audio Capturer**：提供“audio capturer”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.Capturer`。
- **Multimedia Audio Device**：提供“audio device”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.Device`。
- **Multimedia Audio Device Enhance = false**：提供“audio device enhance = false”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.DeviceEnhance = false`。
- **Multimedia Audio Volume**：提供“audio volume”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.Volume`。
- **Multimedia Audio Communication**：提供“audio communication”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.Communication`。
- **Multimedia Audio Tone**：提供“audio tone”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.Tone`。
- **Multimedia Audio Interrupt**：提供“audio interrupt”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.Interrupt`。
- **Multimedia Audio Playback Capture**：提供“audio playback capture”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.PlaybackCapture`。
- **Multimedia Audio Spatialization**：提供“audio spatialization”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.Spatialization`。
- **Multimedia Audio Suite Engine = false**：提供“audio suite engine = false”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.SuiteEngine = false`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `audio_framework_feature_wired_audio`：audio framework 功能 wired audio。
- `audio_framework_feature_usb_audio`：audio framework 功能 usb audio。
- `audio_framework_feature_hdmi_detect_audio`：audio framework 功能 hdmi detect audio。
- `audio_framework_feature_double_pnp_detect`：audio framework 功能 double pnp detect。
- `audio_framework_feature_dtmf_tone`：audio framework 功能 dtmf tone。
- `audio_framework_feature_detect_soundbox`：audio framework 功能 detect soundbox。
- `audio_framework_feature_wireless_default_exclude`：audio framework 功能 wireless default exclude。
- `audio_framework_feature_exclude_indirect_usb_input_device`：audio framework 功能 exclude indirect usb input device。
- `audio_framework_feature_opensl_es`：audio framework 功能 opensl es。
- `audio_framework_suport_svsession_manager`：audio framework suport svsession manager。
- `audio_framework_feature_support_os_account`：audio framework 功能 支持 os account。
- `audio_framework_feature_hitrace_enable`：audio framework 功能 hi调用链追踪 启用。
- `audio_framework_feature_offline_effect`：audio framework 功能 offline effect。
- `audio_framework_feature_distributed_audio`：audio framework 功能 distributed audio。
- `audio_framework_feature_file_io`：audio framework 功能 file io。
- `audio_framework_feature_inner_capturer`：audio framework 功能 inner capturer。
- `audio_framework_feature_low_latency`：audio framework 功能 low latency。
- `audio_framework_feature_device_manager`：audio framework 功能 device manager。
- `audio_framework_feature_mutesink_enable`：audio framework 功能 mutesink 启用。
- `audio_framework_feature_audiosuite_support`：audio framework 功能 audiosuite 支持。
- `audio_framework_feature_audiosuite_format_convert_support`：audio framework 功能 audiosuite format convert 支持。
- `audio_framework_feature_multi_alarm_level`：audio framework 功能 multi alarm level。
- `audio_framework_feature_multi_bus`：audio framework 功能 multi bus。
- `audio_framework_feature_source_period_size`：audio framework 功能 媒体源 period size。
- `audio_framework_feature_input_independent_routing_rule`：audio framework 功能 input independent routing rule。
- `audio_framework_feature_multi_zone_volume`：audio framework 功能 multi zone volume。
- `audio_framework_feature_multi_user_zone`：audio framework 功能 multi user zone。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/audio_framework/services](../../../../../../foundation/multimedia/audio_framework/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 355 | `audio_engine`, `audio_policy`, `audio_service`, `audio_suite` |
| [foundation/multimedia/audio_framework/frameworks](../../../../../../foundation/multimedia/audio_framework/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 258 | `cj`, `js`, `native`, `taihe` |
| [foundation/multimedia/audio_framework/sa_profile](../../../../../../foundation/multimedia/audio_framework/sa_profile) | System Ability 注册信息及进程装载配置。 | 2 | - |
| [foundation/multimedia/audio_framework/tools](../../../../../../foundation/multimedia/audio_framework/tools) | 开发、诊断、命令行或构建辅助工具。 | 1 | `ohos-audioManager` |
| [foundation/multimedia/audio_framework/interfaces](../../../../../../foundation/multimedia/audio_framework/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_api`, `kits` |
| [foundation/multimedia/audio_framework/plugins](../../../../../../foundation/multimedia/audio_framework/plugins) | 可插拔能力实现，由框架或服务在运行时选择和装载。 | 0 | `cross` |

## 对外与内部接口

该部件声明 23 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/audio_framework/frameworks/taihe:copy_taihe` | - | - |
| `//foundation/multimedia/audio_framework/services/audio_service:audio_sasdk` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audiosasdk/include` | `audio_sasdk.h` |
| `//foundation/multimedia/audio_framework/services/audio_policy:audio_foundation` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audiocommon/include` | `./audiocommon/include/audio_device_info.h`, `./audiocommon/include/audio_device_descriptor.h` |
| `//foundation/multimedia/audio_framework/services/audio_service:audio_common` | `//foundation/multimedia/audio_framework/services/audio_service/common/include` | `va_shared_buffer.h`, `va_shared_buffer_operator.h` |
| `//foundation/multimedia/audio_framework/services/audio_policy:audio_manager_client` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audiomanager/include` | `audio_general_manager.h`, `./audiomanager/include/audio_anahs_manager.h`, `./audiocommon/include/audio_device_capability.h` |
| `//foundation/multimedia/audio_framework/services/audio_policy:audio_policy_common` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audiomanager/include` | `./audiomanager/include/resource_manager_adapter.h` |
| `//foundation/multimedia/audio_framework/services/audio_service:audio_client` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audiomanager/include` | `audio_system_manager.h`, `audio_stream_manager.h`, `audio_group_manager.h`, `./audiocommon/include/audio_info.h`, `./audiocommon/include/audio_stream_change_info.h` |
| `//foundation/multimedia/audio_framework/frameworks/native/audiocapturer:audio_capturer` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native` | `./audiocapturer/include/audio_capturer.h`, `./audiocommon/include/audio_info.h`, `./audiocommon/include/audio_stream_change_info.h` |
| `//foundation/multimedia/audio_framework/services/audio_service:audio_policy_manager` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audiomanager/include` | `audio_stream_manager.h`, `./audiocommon/include/audio_stream_types.h`, `./audiocommon/include/audio_zone_types.h`, `./audiocommon/include/audio_interrupt_types.h`, `./audiocommon/include/audio_spatialization_types.h`, `audio_group_manager.h`, `audio_volume_client_manager.h`, `audio_devices_client_manager.h` 等 15 个 |
| `//foundation/multimedia/audio_framework/services/audio_service:audio_engine_manager` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audiomanager/include` | `audio_engine_client_manager.h`, `audio_system_client_engine_manager.h`, `audio_asr_client_manager.h`, `audio_stream_client_manager.h`, `audio_workgroup_client_manager.h`, `audio_wakeup_client_manager.h`, `./audiocommon/include/audio_info.h`, `./audiocommon/include/audio_stream_types.h` 等 9 个 |
| `//foundation/multimedia/audio_framework/frameworks/native/audiorenderer:audio_renderer` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audiorenderer/include` | `audio_renderer.h` |
| `//foundation/multimedia/audio_framework/frameworks/native/audioloopback:audio_loopback` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audioloopback/include` | `audio_loopback.h` |
| `//foundation/multimedia/audio_framework/frameworks/native/toneplayer:audio_toneplayer` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/toneplayer/include` | `tone_player.h`, `audio_renderer.h` |
| `//foundation/multimedia/audio_framework/frameworks/native/audioeffect:audio_effect_integration` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native` | `./audiocommon/include/audio_effect.h` |
| `//foundation/multimedia/audio_framework/frameworks/native/audioutils:audio_utils` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native` | `./audiocommon/include/audio_common_utils.h` |
| `//foundation/multimedia/audio_framework/frameworks/native/offlineaudioeffect:offline_audio_effect` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native` | `./offlineaudioeffect/include/offline_audio_effect_manager.h` |
| `//foundation/multimedia/audio_framework/frameworks/cj:cj_multimedia_audio_ffi` | `//foundation/multimedia/audio_framework/frameworks/cj/include` | `multimedia_audio_ffi.h` |
| `//foundation/multimedia/audio_framework/services/audio_policy:audio_policy_client` | `//foundation/multimedia/audio_framework/frameworks/native/audiopolicy/include` | `audio_zone_manager.h` |
| `//foundation/multimedia/audio_framework/services/audio_suite:audio_suite` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audiosuite/include` | `audio_suite_manager.h`, `audio_format_converter.h`, `audio_suite_download_manager.h` |
| `//foundation/multimedia/audio_framework/services/audio_suite:audio_pcm_process` | `//foundation/multimedia/audio_framework/interfaces/inner_api/native/audio_pcm_process/include/` | `audio_pcm_process.h` |
| `//foundation/multimedia/audio_framework/services/audio_engine:audio_engine_plugins` | `//foundation/multimedia/audio_framework/services/audio_engine/plugin/resample/include` | `audio_proresampler_process.h` |
| `//foundation/multimedia/audio_framework/services/audio_suite/idl:audio_suite_sa_client_idl_interface` | `//foundation/multimedia/audio_framework/services/audio_suite/idl` | `iaudio_suite_sa_service.h`, `iupdate_engine_callback.h`, `audio_suite_sa_types.h`, `idownload_callback.h`, `icloud_rom_download_callback.h` |
| `//foundation/multimedia/audio_framework/services/audio_suite/idl:audio_suite_sa_server_idl_interface` | `//foundation/multimedia/audio_framework/services/audio_suite/idl` | `iaudio_suite_sa_service.h`, `iupdate_engine_callback.h`, `audio_suite_sa_types.h`, `idownload_callback.h`, `icloud_rom_download_callback.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `multimedia` | [audio_server](../../processes/audio_server/foundation-runtime.md) | 启动配置, SA 实现 | `3009`, `3001` | `libaudio_policy_service.z.so`, `libaudio_service.z.so` |
| `multimedia` | [audio_suite_server](../../processes/audio_suite_server/foundation-runtime.md) | 启动配置, SA 实现 | `3015` | `libaudio_suite_sa_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/multimedia/audio_framework/sa_profile:audio_service_sa_profile` | [foundation/multimedia/audio_framework/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/audio_framework/sa_profile/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/multimedia/audio_framework/sa_profile:audio_suite_sa_profile` | [foundation/multimedia/audio_framework/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/audio_framework/sa_profile/BUILD.gn) |
| `audio_ohos_library` | `//foundation/multimedia/audio_framework/services/audio_policy:audio_policy_service` | [foundation/multimedia/audio_framework/services/audio_policy/BUILD.gn](../../../../../../foundation/multimedia/audio_framework/services/audio_policy/BUILD.gn) |
| `audio_ohos_library` | `//foundation/multimedia/audio_framework/services/audio_service:audio_process_service` | [foundation/multimedia/audio_framework/services/audio_service/BUILD.gn](../../../../../../foundation/multimedia/audio_framework/services/audio_service/BUILD.gn) |
| `audio_ohos_library` | `//foundation/multimedia/audio_framework/services/audio_service:audio_service` | [foundation/multimedia/audio_framework/services/audio_service/BUILD.gn](../../../../../../foundation/multimedia/audio_framework/services/audio_service/BUILD.gn) |
| `ohos_executable` | `//foundation/multimedia/audio_framework/services/audio_service:audio_extra_param_tool` | [foundation/multimedia/audio_framework/services/audio_service/BUILD.gn](../../../../../../foundation/multimedia/audio_framework/services/audio_service/BUILD.gn) |
| `audio_ohos_library` | `//foundation/multimedia/audio_framework/services/audio_suite:audio_suite_sa_service` | [foundation/multimedia/audio_framework/services/audio_suite/BUILD.gn](../../../../../../foundation/multimedia/audio_framework/services/audio_suite/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimedia/audio_framework/services/audio_suite/idl:audio_suite_sa_server_idl_interface` | [foundation/multimedia/audio_framework/services/audio_suite/idl/BUILD.gn](../../../../../../foundation/multimedia/audio_framework/services/audio_suite/idl/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/multimedia/audio_framework/tools/ohos-audioManager:ohos-audioManager` | [foundation/multimedia/audio_framework/tools/ohos-audioManager/BUILD.gn](../../../../../../foundation/multimedia/audio_framework/tools/ohos-audioManager/BUILD.gn) |

生产库形态：`ohos_shared_library` 41 个，`audio_ohos_library` 11 个，`ohos_static_library` 1 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 60 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `accessibility`, `bluetooth`, `bundle_framework`, `background_task_mgr`, `c_utils`, `cJSON`, `cellular_data`, `common_event_service`, `config_policy`, `core_service`, `data_share`, `device_manager`, `distributed_notification_service`, `drivers_interface_audio`, `drivers_interface_distributed_audio`, `drivers_interface_bluetooth`, `eventhandler`, `ffrt`, `hdf_core`, `hicollie`, `hisysevent`, `hitrace`, `hiview`, `hilog`, `i18n`, `image_framework`, `init`, `input`, `ipc`, `kv_store`, `libxml2`, `napi`, `os_account`, `power_manager`, `resource_management`, `resource_schedule_service`, `safwk`, `samgr`, `sensor`, `bounds_checking_function`, `sonic`, `pulseaudio`, `libuv`, `libxml2`, `cJSON`, `opensles`, `qos_manager`, `media_foundation`, `runtime_core`, `usb_manager`, `ringtone_library`, `frame_aware_sched`, `window_manager`, `call_manager`, `icu`, `json`, `ets_frontend`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 798 个测试目标，bundle 声明 11 个测试入口。

主要测试形态：`ohos_unittest` 349 个，`group` 240 个，`ohos_fuzztest` 165 个，`ohos_executable` 27 个，`ohos_js_unittest` 11 个，`ohos_benchmarktest` 3 个，`ohos_moduletest` 3 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/audio_framework/bundle.json](../../../../../../foundation/multimedia/audio_framework/bundle.json)
- 原始源码 README：[foundation/multimedia/audio_framework/README_zh.md](../../../../../../foundation/multimedia/audio_framework/README_zh.md)、[foundation/multimedia/audio_framework/README.md](../../../../../../foundation/multimedia/audio_framework/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
