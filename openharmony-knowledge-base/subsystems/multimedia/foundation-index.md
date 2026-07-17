# multimedia：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 18 |
| rk3568 选入部件 | 13 |
| GN 目标 | 4285 |
| 生产目标 | 628 |
| 测试目标 | 3073 |
| 构建支持目标 | 412 |
| 聚合/代码生成目标 | 172 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| audio_framework | yes | foundation/multimedia/audio_framework | 972 | 79 | 798 | [查看](components/audio_framework/foundation-index.md) |
| audio_lite | no | foundation/multimedia/audio_lite | 7 | 3 | 2 | [查看](components/audio_lite/foundation-index.md) |
| av_codec | yes | foundation/multimedia/av_codec | 1199 | 69 | 1003 | [查看](components/av_codec/foundation-index.md) |
| av_session | yes | foundation/multimedia/av_session | 221 | 37 | 145 | [查看](components/av_session/foundation-index.md) |
| camera_framework | yes | foundation/multimedia/camera_framework | 310 | 44 | 234 | [查看](components/camera_framework/foundation-index.md) |
| camera_lite | no | foundation/multimedia/camera_lite | 6 | 2 | 2 | [查看](components/camera_lite/foundation-index.md) |
| drm_framework | yes | foundation/multimedia/drm_framework | 40 | 15 | 8 | [查看](components/drm_framework/foundation-index.md) |
| image_effect | yes | foundation/multimedia/image_effect | 9 | 4 | 2 | [查看](components/image_effect/foundation-index.md) |
| image_framework | yes | foundation/multimedia/image_framework | 298 | 71 | 175 | [查看](components/image_framework/foundation-index.md) |
| media_foundation | yes | foundation/multimedia/media_foundation | 217 | 103 | 46 | [查看](components/media_foundation/foundation-index.md) |
| media_library | yes | foundation/multimedia/media_library | 446 | 61 | 343 | [查看](components/media_library/foundation-index.md) |
| media_lite | no | foundation/multimedia/media_lite | 22 | 13 | 4 | [查看](components/media_lite/foundation-index.md) |
| media_utils_lite | no | foundation/multimedia/media_utils_lite | 2 | 1 | 0 | [查看](components/media_utils_lite/foundation-index.md) |
| midi_framework | yes | foundation/multimedia/midi_framework | 31 | 9 | 20 | [查看](components/midi_framework/foundation-index.md) |
| multimedia_cangjie_wrapper | no | foundation/multimedia/multimedia_cangjie_wrapper | 10 | 9 | 0 | [查看](components/multimedia_cangjie_wrapper/foundation-index.md) |
| player_framework | yes | foundation/multimedia/player_framework | 387 | 75 | 237 | [查看](components/player_framework/foundation-index.md) |
| ringtone_library | yes | foundation/multimedia/ringtone_library | 41 | 12 | 24 | [查看](components/ringtone_library/foundation-index.md) |
| video_processing_engine | yes | foundation/multimedia/video_processing_engine | 67 | 21 | 30 | [查看](components/video_processing_engine/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "multimedia"' specs/knowledge-base/generated/foundation/modules.tsv
```
