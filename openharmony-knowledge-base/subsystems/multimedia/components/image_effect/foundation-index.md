# image_effect：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `multimedia` |
| component | `image_effect` |
| Git 子仓 | `foundation/multimedia/image_effect` |
| bundle | [foundation/multimedia/image_effect/bundle.json](../../../../../../foundation/multimedia/image_effect/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 16 |
| third-party dependencies | 2 |
| declared sub_component | 1 |
| inner kits | 2 |
| declared test entries | 1 |

## 依赖

组件依赖：`hitrace`, `hilog`, `napi`, `image_framework`, `graphic_2d`, `graphic_surface`, `c_utils`, `ability_base`, `bounds_checking_function`, `cJSON`, `drivers_interface_display`, `hisysevent`, `libexif`, `qos_manager`, `video_processing_engine`, `skia`

三方依赖：`egl`, `opengles`

## 声明构建入口

- `//foundation/multimedia/image_effect:image_effect`

## 声明测试入口

- `//foundation/multimedia/image_effect/test:image_effect_test`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 4 |
| test | 2 |
| build-support | 2 |
| aggregate-codegen | 1 |
| total | 9 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/multimedia/image_effect:image_effect` | [foundation/multimedia/image_effect/BUILD.gn](../../../../../../foundation/multimedia/image_effect/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/multimedia/image_effect/frameworks/native:image_effect_impl_public_config` | [foundation/multimedia/image_effect/frameworks/native/BUILD.gn](../../../../../../foundation/multimedia/image_effect/frameworks/native/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/multimedia/image_effect/frameworks/native:image_effect_impl` | [foundation/multimedia/image_effect/frameworks/native/BUILD.gn](../../../../../../foundation/multimedia/image_effect/frameworks/native/BUILD.gn) | 49 |
| build-support | `config` | `//foundation/multimedia/image_effect/frameworks/native:image_effect_ndk_public_config` | [foundation/multimedia/image_effect/frameworks/native/BUILD.gn](../../../../../../foundation/multimedia/image_effect/frameworks/native/BUILD.gn) | 167 |
| production | `ohos_shared_library` | `//foundation/multimedia/image_effect/frameworks/native:image_effect` | [foundation/multimedia/image_effect/frameworks/native/BUILD.gn](../../../../../../foundation/multimedia/image_effect/frameworks/native/BUILD.gn) | 171 |
| production | `ohos_ndk_library` | `//foundation/multimedia/image_effect/interfaces/kits/native:libimage_effect` | [foundation/multimedia/image_effect/interfaces/kits/native/BUILD.gn](../../../../../../foundation/multimedia/image_effect/interfaces/kits/native/BUILD.gn) | 17 |
| production | `ohos_ndk_headers` | `//foundation/multimedia/image_effect/interfaces/kits/native:libimage_effect_header` | [foundation/multimedia/image_effect/interfaces/kits/native/BUILD.gn](../../../../../../foundation/multimedia/image_effect/interfaces/kits/native/BUILD.gn) | 30 |
| test | `group` | `//foundation/multimedia/image_effect/test:image_effect_test` | [foundation/multimedia/image_effect/test/BUILD.gn](../../../../../../foundation/multimedia/image_effect/test/BUILD.gn) | 14 |
| test | `ohos_unittest` | `//foundation/multimedia/image_effect/test/unittest:image_effect_unittest` | [foundation/multimedia/image_effect/test/unittest/BUILD.gn](../../../../../../foundation/multimedia/image_effect/test/unittest/BUILD.gn) | 56 |

## 查询命令

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "image_effect"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
