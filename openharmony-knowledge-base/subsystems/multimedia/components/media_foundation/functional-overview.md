# media_foundation 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

HiStreamer是一个轻量级的媒体引擎组件，提供播放、录制等场景的媒体数据流水线处理。 播放场景分为如下几个节点：数据源读取、解封装、解码、输出； 录制场景分为如下几个节点：数据源读取、编码、封装、输出。 这些节点的具体功能，主要在插件中实现。可以插件的形式扩展支持新的数据源、封装格式、编解码格式、输出方式。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | mini,small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 622KB / - |
| 源码仓 | `foundation/multimedia/media_foundation` |

## 核心能力

- **Multimedia Video Processing Engine**：提供“multimedia video processing engine”能力，系统能力标识为 `SystemCapability.Multimedia.VideoProcessingEngine`。
- **Multimedia Media Core**：提供“media core”能力，系统能力标识为 `SystemCapability.Multimedia.Media.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `media_foundation_enable_plugin_ffmpeg_adapter`：media foundation 启用 plugin ffmpeg adapter。
- `media_foundation_enable_plugin_hdi_adapter`：media foundation 启用 plugin hdi adapter。
- `media_foundation_enable_plugin_file_source`：media foundation 启用 plugin file 媒体源。
- `media_foundation_enable_plugin_file_fd_source`：media foundation 启用 plugin file fd 媒体源。
- `media_foundation_enable_plugin_http_source`：media foundation 启用 plugin http 媒体源。
- `media_foundation_enable_plugin_stream_source`：media foundation 启用 plugin stream 媒体源。
- `media_foundation_enable_plugin_http_lite_source`：media foundation 启用 plugin http lite 媒体源。
- `media_foundation_enable_plugin_minimp3_adapter`：media foundation 启用 plugin minimp3 adapter。
- `media_foundation_enable_plugin_minimp4_demuxer`：media foundation 启用 plugin minimp4 解封装。
- `media_foundation_enable_plugin_aac_demuxer`：media foundation 启用 plugin aac 解封装。
- `media_foundation_enable_plugin_std_audio_capture`：media foundation 启用 plugin std audio capture。
- `media_foundation_enable_plugin_audio_server_sink`：media foundation 启用 plugin audio server sink。
- `media_foundation_enable_plugin_lite_aac_decoder`：media foundation 启用 plugin lite aac decoder。
- `media_foundation_enable_plugin_std_video_surface_sink`：media foundation 启用 plugin std video surface sink。
- `media_foundation_enable_plugin_std_video_capture`：media foundation 启用 plugin std video capture。
- `media_foundation_enable_plugin_wav_demuxer`：media foundation 启用 plugin wav 解封装。
- `media_foundation_enable_plugin_avs3_audio_decoder`：media foundation 启用 plugin avs3 音频解码。
- `media_foundation_enable_recorder`：media foundation 启用 recorder。
- `media_foundation_enable_video`：media foundation 启用 video。
- `media_foundation_enable_avs3da`：media foundation 启用 avs3da。
- `media_foundation_enable_plugin_codec_adapter`：media foundation 启用 plugin 编解码 adapter。
- `media_foundation_enable_rm_demuxer`：media foundation 启用 rm 解封装。
- `media_foundation_enable_cook_audio_decoder`：media foundation 启用 cook 音频解码。
- `media_foundation_enable_lrc_demuxer`：media foundation 启用 lrc 解封装。
- `media_foundation_enable_sami_demuxer`：media foundation 启用 sami 解封装。
- `media_foundation_enable_ass_demuxer`：media foundation 启用 ass 解封装。
- `media_foundation_enable_eac3_demuxer`：media foundation 启用 eac3 解封装。
- `media_foundation_enable_eac3_audio_decoder`：media foundation 启用 eac3 音频解码。
- `media_foundation_enable_dtshd_demuxer`：media foundation 启用 dtshd 解封装。
- `media_foundation_enable_truehd_demuxer`：media foundation 启用 truehd 解封装。
- `media_foundation_enable_truehd_audio_decoder`：media foundation 启用 truehd 音频解码。
- `media_foundation_enable_dts_audio_decoder`：media foundation 启用 dts 音频解码。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/media_foundation/engine](../../../../../../foundation/multimedia/media_foundation/engine) | 核心引擎、状态机或主要算法实现。 | 123 | `foundation`, `include`, `pipeline`, `plugin`, `scene` |
| [foundation/multimedia/media_foundation/services](../../../../../../foundation/multimedia/media_foundation/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 29 | `media_monitor` |
| [foundation/multimedia/media_foundation/src](../../../../../../foundation/multimedia/media_foundation/src) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 13 | `buffer`, `capi`, `common`, `filter`, `meta`, `osal`, `pipeline`, `plugin` |
| [foundation/multimedia/media_foundation/interface](../../../../../../foundation/multimedia/media_foundation/interface) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 3 | `histreamer`, `inner_api`, `kits` |
| [foundation/multimedia/media_foundation/images](../../../../../../foundation/multimedia/media_foundation/images) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 9 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/media_foundation/engine/pipeline:histreamer_base` | `//foundation/multimedia/media_foundation/engine/include` | - |
| `//foundation/multimedia/media_foundation/engine/pipeline:histreamer_codec_filters` | `//foundation/multimedia/media_foundation/engine/include` | - |
| `//foundation/multimedia/media_foundation/engine/plugin:histreamer_ffmpeg_convert` | `//foundation/multimedia/media_foundation/engine/include` | - |
| `//foundation/multimedia/media_foundation/engine/plugin:histreamer_plugin_base` | `//foundation/multimedia/media_foundation/engine/include` | - |
| `//foundation/multimedia/media_foundation/src:media_foundation` | `//foundation/multimedia/media_foundation/interface/inner_api` | `buffer/avsharedmemory.h`, `buffer/avsharedmemorybase.h`, `buffer/avallocator.h`, `buffer/avbuffer.h`, `buffer/avbuffer_common.h`, `buffer/avbuffer_queue.h`, `buffer/avbuffer_queue_define.h`, `buffer/avbuffer_queue_consumer.h` 等 49 个 |
| `//foundation/multimedia/media_foundation/src/capi:native_media_core` | `//foundation/multimedia/media_foundation/interface/kits/c` | `native_avbuffer_info.h`, `native_avbuffer.h`, `native_averrors.h`, `native_avformat.h`, `native_avmemory.h`, `native_audio_vivid.h` |
| `//foundation/multimedia/media_foundation/services/media_monitor:media_monitor_client` | `//foundation/multimedia/media_foundation/services/media_monitor/client/include` | `media_monitor_manager.h` |
| `//foundation/multimedia/media_foundation/services/media_monitor:media_monitor_common` | `//foundation/multimedia/media_foundation/services/media_monitor/common/include` | `event_bean.h`, `media_monitor_info.h` |
| `//foundation/multimedia/media_foundation/services/media_monitor:media_monitor_buffer` | `//foundation/multimedia/media_foundation/services/media_monitor/buffer/include` | `dump_buffer_define.h`, `dump_buffer_manager.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `multimedia` | [media_monitor](../../processes/media_monitor/foundation-runtime.md) | 启动配置, SA 实现 | `3013` | `libmedia_monitor.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/multimedia/media_foundation/services/media_monitor/sa_profile:media_monitor_sa_profile` | [foundation/multimedia/media_foundation/services/media_monitor/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/media_foundation/services/media_monitor/sa_profile/BUILD.gn) |

生产库形态：`ohos_source_set` 36 个，`ohos_shared_library` 32 个，`lite_library` 16 个，`static_library` 5 个，`source_set` 4 个，`shared_library` 2 个，`ohos_ndk_library` 1 个。

## 依赖与协作边界

该部件声明 30 个组件依赖和 1 个三方依赖。

- 系统组件协作：`ability_base`, `hilog`, `hilog_lite`, `hitrace`, `audio_framework`, `openmax`, `drivers_interface_display`, `drivers_interface_codec`, `graphic_2d`, `graphic_surface`, `hdf_core`, `c_utils`, `init`, `player_framework`, `ipc`, `ffrt`, `ffmpeg`, `bounds_checking_function`, `pulseaudio`, `hisysevent`, `window_manager`, `curl`, `safwk`, `samgr`, `skia`, `bundle_framework`, `image_framework`, `qos_manager`, `resource_schedule_service`, `memory_utils`。
- 三方实现依赖：`curl`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 46 个测试目标，bundle 声明 3 个测试入口。

主要测试形态：`ohos_unittest` 27 个，`group` 17 个，`ohos_static_library` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/media_foundation/bundle.json](../../../../../../foundation/multimedia/media_foundation/bundle.json)
- 原始源码 README：[foundation/multimedia/media_foundation/README_zh.md](../../../../../../foundation/multimedia/media_foundation/README_zh.md)、[foundation/multimedia/media_foundation/README.md](../../../../../../foundation/multimedia/media_foundation/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
