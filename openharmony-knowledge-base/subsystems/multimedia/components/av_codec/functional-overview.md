# av_codec 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Media standard provides atomic capabilities

源码 README 补充说明：

> av_codec部件为OpenHarmony系统提供了统一的音视频编解码、封装、解封装能力，使得应用能够直接调用系统提供的编解码、封装、解封装能力实现音视频的播放、录制、编码等功能。 av_codec部件提供了以下常用功能： 音视频编解码 音视频解封装 音视频封装

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 10000KB / 10000KB |
| 源码仓 | `foundation/multimedia/av_codec` |

## 核心能力

- **Multimedia Media Muxer**：提供“media 封装”能力，系统能力标识为 `SystemCapability.Multimedia.Media.Muxer`。
- **Multimedia Media Spliter**：提供“media spliter”能力，系统能力标识为 `SystemCapability.Multimedia.Media.Spliter`。
- **Multimedia Media Audio Codec**：提供“media 音频编解码”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AudioCodec`。
- **Multimedia Media Audio Decoder**：提供“media 音频解码”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AudioDecoder`。
- **Multimedia Media Audio Encoder**：提供“media 音频编码”能力，系统能力标识为 `SystemCapability.Multimedia.Media.AudioEncoder`。
- **Multimedia Media Video Decoder**：提供“media 视频解码”能力，系统能力标识为 `SystemCapability.Multimedia.Media.VideoDecoder`。
- **Multimedia Media Video Encoder**：提供“media 视频编码”能力，系统能力标识为 `SystemCapability.Multimedia.Media.VideoEncoder`。
- **Multimedia Media Codec Base**：提供“media 编解码 base”能力，系统能力标识为 `SystemCapability.Multimedia.Media.CodecBase`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `av_codec_support_capi`：av 编解码 支持 capi。
- `av_codec_support_codec`：av 编解码 支持 编解码。
- `av_codec_support_codeclist`：av 编解码 支持 编解码list。
- `av_codec_support_hcodec`：av 编解码 支持 h编解码。
- `av_codec_support_demuxer`：av 编解码 支持 解封装。
- `av_codec_support_source`：av 编解码 支持 媒体源。
- `av_codec_support_muxer`：av 编解码 支持 封装。
- `av_codec_support_test`：av 编解码 支持 测试。
- `av_codec_support_xcollie`：av 编解码 支持 xcollie。
- `av_codec_support_bitstream_dump`：av 编解码 支持 bitstream dump。
- `av_codec_enable_special_codec`：av 编解码 启用 special 编解码。
- `av_codec_enable_codec_vivid`：av 编解码 启用 编解码 vivid。
- `av_codec_support_drm`：av 编解码 支持 drm。
- `av_codec_support_video_processing_engine`：av 编解码 支持 video processing engine。
- `av_codec_support_software_codec`：av 编解码 支持 软件实现 编解码。
- `av_codec_enable_start_stop_on_demand`：av 编解码 启用 按需启停。
- `av_codec_hcodec_enable_qos_the_whole_time`：av 编解码 h编解码 启用 服务质量 the whole time。
- `av_codec_enable_codec_rm`：av 编解码 启用 编解码 rm。
- `av_codec_enable_codec_rv`：av 编解码 启用 编解码 rv。
- `av_codec_enable_codec_eac3`：av 编解码 启用 编解码 eac3。
- `av_codec_enable_codec_opus`：av 编解码 启用 编解码 opus。
- `av_codec_enable_codec_amrnb`：av 编解码 启用 编解码 amrnb。
- `av_codec_enable_codec_truehd`：av 编解码 启用 编解码 truehd。
- `av_codec_enable_codec_dts`：av 编解码 启用 编解码 dts。
- `av_codec_enable_demuxer_lrc`：av 编解码 启用 解封装 lrc。
- `av_codec_enable_demuxer_sami`：av 编解码 启用 解封装 sami。
- `av_codec_enable_demuxer_ass`：av 编解码 启用 解封装 ass。
- `av_codec_enable_demuxer_eac3`：av 编解码 启用 解封装 eac3。
- `av_codec_support_vc1_decoder`：av 编解码 支持 vc1 decoder。
- `av_codec_support_vp8_decoder`：av 编解码 支持 vp8 decoder。
- `av_codec_support_vp9_decoder`：av 编解码 支持 vp9 decoder。
- `av_codec_support_av1_decoder`：av 编解码 支持 av1 decoder。
- `av_codec_enable_demuxer_dtshd`：av 编解码 启用 解封装 dtshd。
- `av_codec_enable_demuxer_truehd`：av 编解码 启用 解封装 truehd。
- `av_codec_enable_memc`：av 编解码 启用 memc。
- `av_codec_enable_player_startup_optimization`：av 编解码 启用 player startup optimization。
- `av_codec_enable_audio_convert`：av 编解码 启用 audio convert。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/av_codec/services](../../../../../../foundation/multimedia/av_codec/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 97 | `dfx`, `drm_decryptor`, `engine`, `etc`, `include`, `media_engine`, `services`, `utils` |
| [foundation/multimedia/av_codec/interfaces](../../../../../../foundation/multimedia/av_codec/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 25 | `inner_api`, `kits`, `plugin` |
| [foundation/multimedia/av_codec/frameworks](../../../../../../foundation/multimedia/av_codec/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 5 | `native` |

## 对外与内部接口

该部件声明 21 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/av_codec/interfaces/inner_api/native:av_codec_suspend_client` | `//foundation/multimedia/av_codec/interfaces/inner_api/native` | `avcodec_errors.h`, `avcodec_suspend.h` |
| `//foundation/multimedia/av_codec/interfaces/inner_api/native:av_codec_client` | `//foundation/multimedia/av_codec/interfaces/inner_api/native` | `avcodec_audio_decoder.h`, `avcodec_audio_encoder.h`, `avcodec_video_decoder.h`, `avcodec_video_encoder.h`, `avcodec_audio_codec.h`, `avdemuxer.h`, `avmuxer.h`, `avsource.h` 等 19 个 |
| `//foundation/multimedia/av_codec/services/media_engine/plugins/source/http_source:media_plugin_HttpSource_static` | - | - |
| `//foundation/multimedia/av_codec/interfaces/kits/c:capi_packages` | `//foundation/multimedia/av_codec/interfaces/kits/c` | `native_avcapability.h`, `native_avcodec_audiocodec.h`, `native_avcodec_audiodecoder.h`, `native_avcodec_audioencoder.h`, `native_avcodec_base.h`, `native_avcodec_videodecoder.h`, `native_avcodec_videoencoder.h`, `native_avdemuxer.h` 等 10 个 |
| `//foundation/multimedia/av_codec/interfaces/kits/c:native_media_acodec` | `//foundation/multimedia/av_codec/interfaces/kits/c` | - |
| `//foundation/multimedia/av_codec/interfaces/kits/c:native_media_adec` | `//foundation/multimedia/av_codec/interfaces/kits/c` | - |
| `//foundation/multimedia/av_codec/interfaces/kits/c:native_media_aenc` | `//foundation/multimedia/av_codec/interfaces/kits/c` | - |
| `//foundation/multimedia/av_codec/interfaces/kits/c:native_media_avcencinfo` | `//foundation/multimedia/av_codec/interfaces/kits/c` | - |
| `//foundation/multimedia/av_codec/interfaces/kits/c:native_media_avdemuxer` | `//foundation/multimedia/av_codec/interfaces/kits/c` | - |
| `//foundation/multimedia/av_codec/interfaces/kits/c:native_media_avmuxer` | `//foundation/multimedia/av_codec/interfaces/kits/c` | - |
| `//foundation/multimedia/av_codec/interfaces/kits/c:native_media_avsource` | `//foundation/multimedia/av_codec/interfaces/kits/c` | - |
| `//foundation/multimedia/av_codec/interfaces/kits/c:native_media_codecbase` | `//foundation/multimedia/av_codec/interfaces/kits/c` | - |
| `//foundation/multimedia/av_codec/interfaces/kits/c:native_media_vdec` | `//foundation/multimedia/av_codec/interfaces/kits/c` | - |
| `//foundation/multimedia/av_codec/interfaces/kits/c:native_media_venc` | `//foundation/multimedia/av_codec/interfaces/kits/c` | - |
| `//foundation/multimedia/av_codec/services/services:av_codec_service` | `//foundation/multimedia/av_codec/services/services/codec/server/video/features/smart_fluency_decoding/interfaces` | `nalu_analyzer_c_api.h`, `mv_analyzer_c_api.h`, `smart_fluency_decoding_types.h` |
| `//foundation/multimedia/av_codec/services/media_engine/filters:av_codec_media_engine_filters` | `//foundation/multimedia/av_codec/interfaces/inner_api/native` | `audio_decoder_filter.h`, `audio_sink_filter.h`, `audio_capture_filter.h`, `audio_encoder_filter.h`, `video_capture_filter.h`, `surface_encoder_filter.h`, `muxer_filter.h`, `codec_capability_adapter.h` |
| `//foundation/multimedia/av_codec/services/media_engine/modules:av_codec_media_engine_modules` | `//foundation/multimedia/av_codec/services/media_engine/modules/pts_index_conversion` | `pts_and_index_conversion.h` |
| `//foundation/multimedia/av_codec/services/media_engine/plugins/demuxer:media_plugin_FFmpegDemuxer` | `//foundation/multimedia/av_codec/services/media_engine/plugins/demuxer/common` | `reference_parser.h` |
| `//foundation/multimedia/av_codec/services/media_engine/plugins/demuxer:media_plugin_Mpeg4Demuxer` | `//foundation/multimedia/av_codec/services/media_engine/plugins/demuxer/common` | `reference_parser.h` |
| `//foundation/multimedia/av_codec/services/engine/codec/video/hevcdecoder:hevc_decoder` | `//foundation/multimedia/av_codec/services/engine/codec/video/hevcdecoder` | `HevcDec_Typedef.h` |
| `//foundation/multimedia/av_codec/services/media_engine/plugins/source/http_source/download/network_client:http_curl_client` | `//foundation/multimedia/av_codec/services/media_engine/plugins/source/http_source/download/network_client` | `http_curl_client.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `multimedia` | [av_codec_service](../../processes/av_codec_service/foundation-runtime.md) | 启动配置, SA 实现 | `3011` | `libav_codec_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_shared_library` | `//foundation/multimedia/av_codec/services/dfx:av_codec_service_dfx` | [foundation/multimedia/av_codec/services/dfx/BUILD.gn](../../../../../../foundation/multimedia/av_codec/services/dfx/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/multimedia/av_codec/services/etc:av_codec_service_profile` | [foundation/multimedia/av_codec/services/etc/BUILD.gn](../../../../../../foundation/multimedia/av_codec/services/etc/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimedia/av_codec/services/services:av_codec_service` | [foundation/multimedia/av_codec/services/services/BUILD.gn](../../../../../../foundation/multimedia/av_codec/services/services/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimedia/av_codec/services/utils:av_codec_service_utils` | [foundation/multimedia/av_codec/services/utils/BUILD.gn](../../../../../../foundation/multimedia/av_codec/services/utils/BUILD.gn) |

生产库形态：`ohos_shared_library` 47 个，`ohos_source_set` 12 个，`ohos_static_library` 7 个。

## 依赖与协作边界

该部件声明 47 个组件依赖和 0 个三方依赖。

- 系统组件协作：`opus`, `access_token`, `netmanager_base`, `bounds_checking_function`, `c_utils`, `dav1d`, `drivers_interface_codec`, `drivers_interface_display`, `eventhandler`, `graphic_2d`, `graphic_surface`, `hdf_core`, `hiappevent`, `hicollie`, `hidumper`, `hilog`, `hisysevent`, `hitrace`, `init`, `ipc`, `qos_manager`, `safwk`, `samgr`, `window_manager`, `media_foundation`, `audio_framework`, `drm_framework`, `ffmpeg`, `lame`, `opencore-amr`, `libvpx`, `libxml2`, `video_processing_engine`, `curl`, `openssl`, `hiview`, `cJSON`, `bundle_framework`, `openmax`, `memory_utils`, `config_policy`, `json`, `resource_schedule_service`, `certificate_manager`, `api_metrics`, `egl`, `opengles`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 1003 个测试目标，bundle 声明 5 个测试入口。

主要测试形态：`ohos_unittest` 338 个，`group` 336 个，`ohos_fuzztest` 318 个，`ohos_static_library` 5 个，`ohos_executable` 3 个，`ohos_source_set` 3 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/av_codec/bundle.json](../../../../../../foundation/multimedia/av_codec/bundle.json)
- 原始源码 README：[foundation/multimedia/av_codec/README_zh.md](../../../../../../foundation/multimedia/av_codec/README_zh.md)、[foundation/multimedia/av_codec/README.md](../../../../../../foundation/multimedia/av_codec/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
