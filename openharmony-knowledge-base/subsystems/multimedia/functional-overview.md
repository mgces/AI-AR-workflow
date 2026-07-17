# multimedia：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 18 个部件，其中 13 个进入当前 rk3568 产品。14 个部件包含可识别的服务/可执行程序/SA profile，14 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `audio_framework` | Audio standard provides managers and provides the audio resources to application for play/record audio | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 12/27 | yes | [查看](components/audio_framework/functional-overview.md) |
| `audio_lite` | Audio encoder and decoder for small system. | 服务/运行实体 + 框架或基础库 | 0/0 | no | [查看](components/audio_lite/functional-overview.md) |
| `av_codec` | Media standard provides atomic capabilities | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 8/37 | yes | [查看](components/av_codec/functional-overview.md) |
| `av_session` | Audio and Video Session Management | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 6/3 | yes | [查看](components/av_session/functional-overview.md) |
| `camera_framework` | Camera standard provides managers and provides the camera resources to application to capture photo/preview/videos | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/12 | yes | [查看](components/camera_framework/functional-overview.md) |
| `camera_lite` | Camera service for mini and small system. | 服务/运行实体 + 框架或基础库 | 0/0 | no | [查看](components/camera_lite/functional-overview.md) |
| `drm_framework` | 开发者可以调用系统提供的DRM插件，完成DRM证书管理、DRM许可证管理等功能，支持DRM加密媒体数据的解密，实现DRM节目授权和解密播放。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/1 | yes | [查看](components/drm_framework/functional-overview.md) |
| `image_effect` | Image standard editing abilities | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/0 | yes | [查看](components/image_effect/functional-overview.md) |
| `image_framework` | Image standard provides atomic capabilities | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 5/1 | yes | [查看](components/image_framework/functional-overview.md) |
| `media_foundation` | HiStreamer是一个轻量级的媒体引擎组件，提供播放、录制等场景的媒体数据流水线处理。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 2/32 | yes | [查看](components/media_foundation/functional-overview.md) |
| `media_library` | provides a set of easy-to-use APIs for getting media file metadata information | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 5/12 | yes | [查看](components/media_library/functional-overview.md) |
| `media_lite` | Recorder service and player service. | 服务/运行实体 + 框架或基础库 | 0/0 | no | [查看](components/media_lite/functional-overview.md) |
| `media_utils_lite` | Definition of public information such as media error code, and data types required for recording and playing audio and video. | 系统内部接口 + 框架或基础库 | 0/0 | no | [查看](components/media_utils_lite/functional-overview.md) |
| `midi_framework` | `midi_framework` 是 OpenHarmony 系统中用于管理和控制 MIDI（Musical Instrument Digital Interface）设备的模块。 | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 | 1/0 | yes | [查看](components/midi_framework/functional-overview.md) |
| `multimedia_cangjie_wrapper` | The Cangjie API is a Cangjie API encapsulated on OpenHarmony based on the capabilities of the media subsystem. | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/multimedia_cangjie_wrapper/functional-overview.md) |
| `player_framework` | Media standard provides atomic capabilities | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 14/31 | yes | [查看](components/player_framework/functional-overview.md) |
| `ringtone_library` | provides a set of native APIs for access ringtone db information | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | yes | [查看](components/ringtone_library/functional-overview.md) |
| `video_processing_engine` | VPE（Video Processing Engine）引擎是处理视频和图像数据的媒体引擎，包括细节增强、对比度增强、亮度增强、动态范围增强等基础能力，为转码、分享、显示后处理等提供色彩空间转换、缩放超分、动态元数据集生成等基础算法。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | yes | [查看](components/video_processing_engine/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `multimedia` | [audio_server](processes/audio_server/foundation-runtime.md) | `audio_framework` | 2 | [查看](processes/audio_server/foundation-runtime.md) |
| `multimedia` | [audio_suite_server](processes/audio_suite_server/foundation-runtime.md) | `audio_framework` | 1 | [查看](processes/audio_suite_server/foundation-runtime.md) |
| `multimedia` | [av_codec_service](processes/av_codec_service/foundation-runtime.md) | `av_codec` | 1 | [查看](processes/av_codec_service/foundation-runtime.md) |
| `multimedia` | [av_session](processes/av_session/foundation-runtime.md) | `av_session` | 1 | [查看](processes/av_session/foundation-runtime.md) |
| `multimedia` | [camera_service](processes/camera_service/foundation-runtime.md) | `camera_framework` | 1 | [查看](processes/camera_service/foundation-runtime.md) |
| `multimedia` | [drm_service](processes/drm_service/foundation-runtime.md) | `drm_framework` | 1 | [查看](processes/drm_service/foundation-runtime.md) |
| `multimedia` | [media_monitor](processes/media_monitor/foundation-runtime.md) | `media_foundation` | 1 | [查看](processes/media_monitor/foundation-runtime.md) |
| `multimedia` | [media_service](processes/media_service/foundation-runtime.md) | `player_framework` | 1 | [查看](processes/media_service/foundation-runtime.md) |
| `multimedia` | [midi_server](processes/midi_server/foundation-runtime.md) | `midi_framework` | 1 | [查看](processes/midi_server/foundation-runtime.md) |
| `multimedia` | [video_processing_service](processes/video_processing_service/foundation-runtime.md) | `video_processing_engine` | 1 | [查看](processes/video_processing_service/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
