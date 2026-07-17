# wifi_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `communication` |
| component | `wifi_lite` |
| Git 子仓 | `foundation/communication/wifi_lite` |
| bundle | [foundation/communication/wifi_lite/bundle.json](../../../../../../foundation/communication/wifi_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | mini |
| component dependencies | 0 |
| third-party dependencies | 0 |
| declared sub_component | 1 |
| inner kits | 0 |
| declared test entries | 0 |

## 依赖

组件依赖：无声明

三方依赖：无声明

## 声明构建入口

- `//foundation/communication/wifi_lite:wifi`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 0 |
| test | 0 |
| build-support | 1 |
| aggregate-codegen | 1 |
| total | 2 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/communication/wifi_lite:include` | [foundation/communication/wifi_lite/BUILD.gn](../../../../../../foundation/communication/wifi_lite/BUILD.gn) | 14 |
| aggregate-codegen | `group` | `//foundation/communication/wifi_lite:wifi` | [foundation/communication/wifi_lite/BUILD.gn](../../../../../../foundation/communication/wifi_lite/BUILD.gn) | 18 |

## 查询命令

```bash
awk -F '\t' '$1 == "communication" && $2 == "wifi_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
