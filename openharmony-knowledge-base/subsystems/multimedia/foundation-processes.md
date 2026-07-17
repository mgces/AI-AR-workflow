# multimedia：Foundation 运行进程

> 本页由 `generate-foundation-process-docs.sh` 根据 init 配置和 SA profile 生成。

[返回子系统](README.md) | [功能全景](functional-overview.md)

## 进程清单

| 进程 | init 服务 | SA | 参与部件 | 启动模式 | uid | SELinux | 说明 |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| `audio_server` | 1 | 2 | 2 | condition | audio | u:r:audio_server:s0 | [查看](processes/audio_server/foundation-runtime.md) |
| `audio_suite_server` | 1 | 1 | 2 | ondemand | audio_suite_server | u:r:audio_suite_server:s0 | [查看](processes/audio_suite_server/foundation-runtime.md) |
| `av_codec_service` | 2 | 2 | 2 | ondemand | media | u:r:av_codec_service:s0 | [查看](processes/av_codec_service/foundation-runtime.md) |
| `av_session` | 2 | 2 | 2 | ondemand | av_session | u:r:av_session:s0 | [查看](processes/av_session/foundation-runtime.md) |
| `camera_service` | 1 | 1 | 2 | - | cameraserver | u:r:camera_service:s0 | [查看](processes/camera_service/foundation-runtime.md) |
| `drm_service` | 2 | 2 | 2 | ondemand | drmserver | u:r:drm_service:s0 | [查看](processes/drm_service/foundation-runtime.md) |
| `media_monitor` | 1 | 1 | 2 | - | media_monitor | u:r:media_monitor:s0 | [查看](processes/media_monitor/foundation-runtime.md) |
| `media_service` | 2 | 2 | 2 | ondemand | media | u:r:media_service:s0 | [查看](processes/media_service/foundation-runtime.md) |
| `midi_server` | 1 | 1 | 2 | ondemand | midi_server | u:r:midi_server:s0 | [查看](processes/midi_server/foundation-runtime.md) |
| `video_processing_service` | 1 | 1 | 2 | ondemand | media | u:r:video_processing_service:s0 | [查看](processes/video_processing_service/foundation-runtime.md) |

## 说明

- 进程归属优先使用 init 配置所在部件；没有 init 证据时使用可执行目标或 SA provider。
- 一个进程可以承载多个部件甚至多个子系统提供的 SA。
- 测试、示例和 CLI 工具不进入本清单。
