# media_utils_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `multimedia` |
| component | `media_utils_lite` |
| Git 子仓 | `foundation/multimedia/media_utils_lite` |
| bundle | [foundation/multimedia/media_utils_lite/bundle.json](../../../../../../foundation/multimedia/media_utils_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | mini,small |
| component dependencies | 0 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 1 |
| declared test entries | 0 |

## 依赖

组件依赖：无声明

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 1 |
| test | 0 |
| build-support | 1 |
| aggregate-codegen | 0 |
| total | 2 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `lite_library` | `//foundation/multimedia/media_utils_lite:media_common` | [foundation/multimedia/media_utils_lite/BUILD.gn](../../../../../../foundation/multimedia/media_utils_lite/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/multimedia/media_utils_lite:media_common_public_config` | [foundation/multimedia/media_utils_lite/BUILD.gn](../../../../../../foundation/multimedia/media_utils_lite/BUILD.gn) | 51 |

## 查询命令

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "media_utils_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
