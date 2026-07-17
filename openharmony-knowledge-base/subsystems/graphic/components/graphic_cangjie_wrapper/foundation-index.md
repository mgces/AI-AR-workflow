# graphic_cangjie_wrapper：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `graphic` |
| component | `graphic_cangjie_wrapper` |
| Git 子仓 | `foundation/graphic/graphic_cangjie_wrapper` |
| bundle | [foundation/graphic/graphic_cangjie_wrapper/bundle.json](../../../../../../foundation/graphic/graphic_cangjie_wrapper/bundle.json) |
| rk3568 selected | no |
| adapted systems | standard |
| component dependencies | 3 |
| third-party dependencies | 0 |
| declared sub_component | 3 |
| inner kits | 3 |
| declared test entries | 0 |

## 依赖

组件依赖：`cangjie_ark_interop`, `graphic_2d`, `hiviewdfx_cangjie_wrapper`

三方依赖：无声明

## 声明构建入口

- `//foundation/graphic/graphic_cangjie_wrapper/kit/ArkGraphics2D:kit.ArkGraphics2D`
- `//foundation/graphic/graphic_cangjie_wrapper/ohos/graphics:ohos.graphics`
- `//foundation/graphic/graphic_cangjie_wrapper/ohos/graphics/color_space_manager:ohos.graphics.color_space_manager`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 3 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 1 |
| total | 4 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_cangjie_shared_library` | `//foundation/graphic/graphic_cangjie_wrapper/ohos/graphics:ohos.graphics` | [foundation/graphic/graphic_cangjie_wrapper/ohos/graphics/BUILD.gn](../../../../../../foundation/graphic/graphic_cangjie_wrapper/ohos/graphics/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/graphic/graphic_cangjie_wrapper/ohos/graphics/color_space_manager:ohos.graphics.color_space_manager` | [foundation/graphic/graphic_cangjie_wrapper/ohos/graphics/color_space_manager/BUILD.gn](../../../../../../foundation/graphic/graphic_cangjie_wrapper/ohos/graphics/color_space_manager/BUILD.gn) | 18 |
| aggregate-codegen | `copy_ohos_cangjie_sdk_api_lib` | `//foundation/graphic/graphic_cangjie_wrapper:copy_sdk_graphic_cangjie_libs` | [foundation/graphic/graphic_cangjie_wrapper/BUILD.gn](../../../../../../foundation/graphic/graphic_cangjie_wrapper/BUILD.gn) | 24 |
| production | `ohos_cangjie_shared_library` | `//foundation/graphic/graphic_cangjie_wrapper/kit/ArkGraphics2D:kit.ArkGraphics2D` | [foundation/graphic/graphic_cangjie_wrapper/kit/ArkGraphics2D/BUILD.gn](../../../../../../foundation/graphic/graphic_cangjie_wrapper/kit/ArkGraphics2D/BUILD.gn) | 19 |

## 查询命令

```bash
awk -F '\t' '$1 == "graphic" && $2 == "graphic_cangjie_wrapper"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
