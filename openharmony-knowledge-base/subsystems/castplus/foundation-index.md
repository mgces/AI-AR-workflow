# castplus：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 2 |
| rk3568 选入部件 | 2 |
| GN 目标 | 189 |
| 生产目标 | 58 |
| 测试目标 | 93 |
| 构建支持目标 | 34 |
| 聚合/代码生成目标 | 4 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| cast_engine | yes | foundation/CastEngine/castengine_cast_framework | 27 | 14 | 0 | [查看](components/cast_engine/foundation-index.md) |
| sharing_framework | yes | foundation/CastEngine/castengine_wifi_display | 150 | 38 | 93 | [查看](components/sharing_framework/foundation-index.md) |

## 未归属部件的仓库模块

以下目标位于 Foundation Git 子仓中，但所在仓没有可用于归属的 `bundle.json`。它们保留在源码域索引，不虚构部件节点。

| Git 子仓 | 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | --- | ---: |
| foundation/CastEngine/castengine_cast_plus_stream | build-support | `config` | `//foundation/CastEngine/castengine_cast_plus_stream:cast_session_config` | [foundation/CastEngine/castengine_cast_plus_stream/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/BUILD.gn) | 16 |
| foundation/CastEngine/castengine_cast_plus_stream | production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_plus_stream:cast_session` | [foundation/CastEngine/castengine_cast_plus_stream/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/BUILD.gn) | 22 |
| foundation/CastEngine/castengine_cast_plus_stream | build-support | `config` | `//foundation/CastEngine/castengine_cast_plus_stream/src/channel:cast_session_channel_config` | [foundation/CastEngine/castengine_cast_plus_stream/src/channel/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/src/channel/BUILD.gn) | 15 |
| foundation/CastEngine/castengine_cast_plus_stream | production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_plus_stream/src/channel:cast_session_channel` | [foundation/CastEngine/castengine_cast_plus_stream/src/channel/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/src/channel/BUILD.gn) | 19 |
| foundation/CastEngine/castengine_cast_plus_stream | build-support | `config` | `//foundation/CastEngine/castengine_cast_plus_stream/src/mirror:cast_session_mirror_config` | [foundation/CastEngine/castengine_cast_plus_stream/src/mirror/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/src/mirror/BUILD.gn) | 15 |
| foundation/CastEngine/castengine_cast_plus_stream | production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_plus_stream/src/mirror:cast_session_mirror` | [foundation/CastEngine/castengine_cast_plus_stream/src/mirror/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/src/mirror/BUILD.gn) | 23 |
| foundation/CastEngine/castengine_cast_plus_stream | build-support | `config` | `//foundation/CastEngine/castengine_cast_plus_stream/src/rtsp:cast_session_rtsp_config` | [foundation/CastEngine/castengine_cast_plus_stream/src/rtsp/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/src/rtsp/BUILD.gn) | 15 |
| foundation/CastEngine/castengine_cast_plus_stream | production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_plus_stream/src/rtsp:cast_session_rtsp` | [foundation/CastEngine/castengine_cast_plus_stream/src/rtsp/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/src/rtsp/BUILD.gn) | 19 |
| foundation/CastEngine/castengine_cast_plus_stream | build-support | `config` | `//foundation/CastEngine/castengine_cast_plus_stream/src/stream:cast_session_stream_config` | [foundation/CastEngine/castengine_cast_plus_stream/src/stream/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/src/stream/BUILD.gn) | 16 |
| foundation/CastEngine/castengine_cast_plus_stream | production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_plus_stream/src/stream:cast_session_stream` | [foundation/CastEngine/castengine_cast_plus_stream/src/stream/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/src/stream/BUILD.gn) | 29 |
| foundation/CastEngine/castengine_cast_plus_stream | build-support | `config` | `//foundation/CastEngine/castengine_cast_plus_stream/src/utils:cast_session_utils_config` | [foundation/CastEngine/castengine_cast_plus_stream/src/utils/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/src/utils/BUILD.gn) | 16 |
| foundation/CastEngine/castengine_cast_plus_stream | production | `ohos_static_library` | `//foundation/CastEngine/castengine_cast_plus_stream/src/utils:cast_session_utils` | [foundation/CastEngine/castengine_cast_plus_stream/src/utils/BUILD.gn](../../../../foundation/CastEngine/castengine_cast_plus_stream/src/utils/BUILD.gn) | 24 |

## 全量查询

```bash
awk -F '\t' '$1 == "castplus"' specs/knowledge-base/generated/foundation/modules.tsv
```
