# media_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `multimedia` |
| component | `media_lite` |
| Git 子仓 | `foundation/multimedia/media_lite` |
| bundle | [foundation/multimedia/media_lite/bundle.json](../../../../../../foundation/multimedia/media_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | mini,small |
| component dependencies | 5 |
| third-party dependencies | 1 |
| declared sub_component | 7 |
| inner kits | 0 |
| declared test entries | 0 |

## 依赖

组件依赖：`hilog_lite`, `audio_lite`, `camera_lite`, `permission_lite`, `init`

三方依赖：`bounds_checking_function`

## 声明构建入口

- `//foundation/multimedia/media_lite/frameworks/recorder_lite:recorder_lite`
- `//foundation/multimedia/media_lite/frameworks/player_lite:player_lite`
- `//foundation/multimedia/media_lite/services:media_lite`
- `//foundation/multimedia/camera_lite/test:lite_camera_test`
- `//foundation/multimedia/media_lite/test/unittest:lite_medialite_test`
- `//foundation/multimedia/audio_lite/test:lite_audio_test`
- `//foundation/multimedia/media_lite/interfaces/kits/player_lite/js/builtin:audio_lite_api`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 13 |
| test | 4 |
| build-support | 5 |
| aggregate-codegen | 0 |
| total | 22 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `shared_library` | `//foundation/multimedia/media_lite/frameworks/player_lite:player_lite` | [foundation/multimedia/media_lite/frameworks/player_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/frameworks/player_lite/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/multimedia/media_lite/frameworks/player_lite:player_external_library_config` | [foundation/multimedia/media_lite/frameworks/player_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/frameworks/player_lite/BUILD.gn) | 83 |
| production | `lite_component` | `//foundation/multimedia/media_lite/frameworks/player_lite:media_lite` | [foundation/multimedia/media_lite/frameworks/player_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/frameworks/player_lite/BUILD.gn) | 92 |
| production | `static_library` | `//foundation/multimedia/media_lite/frameworks/player_lite:player_lite` | [foundation/multimedia/media_lite/frameworks/player_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/frameworks/player_lite/BUILD.gn) | 99 |
| build-support | `config` | `//foundation/multimedia/media_lite/frameworks/player_lite:player_direct_external_library_config` | [foundation/multimedia/media_lite/frameworks/player_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/frameworks/player_lite/BUILD.gn) | 110 |
| production | `shared_library` | `//foundation/multimedia/media_lite/frameworks/recorder_lite:recorder_lite` | [foundation/multimedia/media_lite/frameworks/recorder_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/frameworks/recorder_lite/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/multimedia/media_lite/frameworks/recorder_lite:recorder_external_library_config` | [foundation/multimedia/media_lite/frameworks/recorder_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/frameworks/recorder_lite/BUILD.gn) | 60 |
| production | `lite_library` | `//foundation/multimedia/media_lite/interfaces/kits/player_lite/js/builtin:audio_lite_api` | [foundation/multimedia/media_lite/interfaces/kits/player_lite/js/builtin/BUILD.gn](../../../../../../foundation/multimedia/media_lite/interfaces/kits/player_lite/js/builtin/BUILD.gn) | 25 |
| production | `static_library` | `//foundation/multimedia/media_lite/interfaces/kits/player_lite/js/builtin:audio_lite_api` | [foundation/multimedia/media_lite/interfaces/kits/player_lite/js/builtin/BUILD.gn](../../../../../../foundation/multimedia/media_lite/interfaces/kits/player_lite/js/builtin/BUILD.gn) | 56 |
| production | `shared_library` | `//foundation/multimedia/media_lite/services/player_lite:player_impl` | [foundation/multimedia/media_lite/services/player_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/services/player_lite/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/multimedia/media_lite/services/player_lite:player_impl_external_library_config` | [foundation/multimedia/media_lite/services/player_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/services/player_lite/BUILD.gn) | 66 |
| production | `shared_library` | `//foundation/multimedia/media_lite/services/player_lite:player_server` | [foundation/multimedia/media_lite/services/player_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/services/player_lite/BUILD.gn) | 83 |
| build-support | `config` | `//foundation/multimedia/media_lite/services/player_lite:player_server_external_library_config` | [foundation/multimedia/media_lite/services/player_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/services/player_lite/BUILD.gn) | 134 |
| production | `static_library` | `//foundation/multimedia/media_lite/services/recorder_lite:recorder_server` | [foundation/multimedia/media_lite/services/recorder_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/services/recorder_lite/BUILD.gn) | 16 |
| production | `shared_library` | `//foundation/multimedia/media_lite/services/recorder_lite:recorder_impl` | [foundation/multimedia/media_lite/services/recorder_lite/BUILD.gn](../../../../../../foundation/multimedia/media_lite/services/recorder_lite/BUILD.gn) | 57 |
| production | `executable` | `//foundation/multimedia/media_lite/services:media_server` | [foundation/multimedia/media_lite/services/BUILD.gn](../../../../../../foundation/multimedia/media_lite/services/BUILD.gn) | 18 |
| production | `lite_component` | `//foundation/multimedia/media_lite/services:media_lite` | [foundation/multimedia/media_lite/services/BUILD.gn](../../../../../../foundation/multimedia/media_lite/services/BUILD.gn) | 90 |
| production | `ndk_lib` | `//foundation/multimedia/media_lite/services:media_ndk` | [foundation/multimedia/media_lite/services/BUILD.gn](../../../../../../foundation/multimedia/media_lite/services/BUILD.gn) | 102 |
| test | `executable` | `//foundation/multimedia/media_lite/test:test_play_file_h265` | [foundation/multimedia/media_lite/test/BUILD.gn](../../../../../../foundation/multimedia/media_lite/test/BUILD.gn) | 16 |
| test | `group` | `//foundation/multimedia/media_lite/test/unittest:lite_medialite_test` | [foundation/multimedia/media_lite/test/unittest/BUILD.gn](../../../../../../foundation/multimedia/media_lite/test/unittest/BUILD.gn) | 15 |
| test | `unittest` | `//foundation/multimedia/media_lite/test/unittest:lite_player_unittest` | [foundation/multimedia/media_lite/test/unittest/BUILD.gn](../../../../../../foundation/multimedia/media_lite/test/unittest/BUILD.gn) | 25 |
| test | `unittest` | `//foundation/multimedia/media_lite/test/unittest:lite_recorder_unittest` | [foundation/multimedia/media_lite/test/unittest/BUILD.gn](../../../../../../foundation/multimedia/media_lite/test/unittest/BUILD.gn) | 52 |

## 查询命令

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "media_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
