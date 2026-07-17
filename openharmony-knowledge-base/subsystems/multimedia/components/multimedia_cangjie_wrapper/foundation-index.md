# multimedia_cangjie_wrapper：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `multimedia` |
| component | `multimedia_cangjie_wrapper` |
| Git 子仓 | `foundation/multimedia/multimedia_cangjie_wrapper` |
| bundle | [foundation/multimedia/multimedia_cangjie_wrapper/bundle.json](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/bundle.json) |
| rk3568 selected | no |
| adapted systems | standard |
| component dependencies | 11 |
| third-party dependencies | 0 |
| declared sub_component | 9 |
| inner kits | 3 |
| declared test entries | 0 |

## 依赖

组件依赖：`ability_cangjie_wrapper`, `bundlemanager_cangjie_wrapper`, `cangjie_ark_interop`, `distributeddatamgr_cangjie_wrapper`, `global_cangjie_wrapper`, `graphic_cangjie_wrapper`, `hiviewdfx_cangjie_wrapper`, `media_library`, `camera_framework`, `image_framework`, `player_framework`

三方依赖：无声明

## 声明构建入口

- `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia:ohos.multimedia`
- `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/image:ohos.multimedia.image`
- `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/media:ohos.multimedia.media`
- `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/camera:ohos.multimedia.camera`
- `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/file/photo_access_helper:ohos.file.photo_access_helper`
- `//foundation/multimedia/multimedia_cangjie_wrapper/kit/MediaLibraryKit:kit.MediaLibraryKit`
- `//foundation/multimedia/multimedia_cangjie_wrapper/kit/ImageKit:kit.ImageKit`
- `//foundation/multimedia/multimedia_cangjie_wrapper/kit/MediaKit:kit.MediaKit`
- `//foundation/multimedia/multimedia_cangjie_wrapper/kit/CameraKit:kit.CameraKit`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 9 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 1 |
| total | 10 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_cangjie_shared_library` | `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/camera:ohos.multimedia.camera` | [foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/camera/BUILD.gn](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/camera/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia:ohos.multimedia` | [foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/BUILD.gn](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/media:ohos.multimedia.media` | [foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/media/BUILD.gn](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/media/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/image:ohos.multimedia.image` | [foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/image/BUILD.gn](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/image/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/file/photo_access_helper:ohos.file.photo_access_helper` | [foundation/multimedia/multimedia_cangjie_wrapper/ohos/file/photo_access_helper/BUILD.gn](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/ohos/file/photo_access_helper/BUILD.gn) | 18 |
| aggregate-codegen | `copy_ohos_cangjie_sdk_api_lib` | `//foundation/multimedia/multimedia_cangjie_wrapper:copy_sdk_multimedia_cangjie_libs` | [foundation/multimedia/multimedia_cangjie_wrapper/BUILD.gn](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/BUILD.gn) | 29 |
| production | `ohos_cangjie_shared_library` | `//foundation/multimedia/multimedia_cangjie_wrapper/kit/CameraKit:kit.CameraKit` | [foundation/multimedia/multimedia_cangjie_wrapper/kit/CameraKit/BUILD.gn](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/kit/CameraKit/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/multimedia/multimedia_cangjie_wrapper/kit/ImageKit:kit.ImageKit` | [foundation/multimedia/multimedia_cangjie_wrapper/kit/ImageKit/BUILD.gn](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/kit/ImageKit/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/multimedia/multimedia_cangjie_wrapper/kit/MediaKit:kit.MediaKit` | [foundation/multimedia/multimedia_cangjie_wrapper/kit/MediaKit/BUILD.gn](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/kit/MediaKit/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/multimedia/multimedia_cangjie_wrapper/kit/MediaLibraryKit:kit.MediaLibraryKit` | [foundation/multimedia/multimedia_cangjie_wrapper/kit/MediaLibraryKit/BUILD.gn](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/kit/MediaLibraryKit/BUILD.gn) | 18 |

## 查询命令

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "multimedia_cangjie_wrapper"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
