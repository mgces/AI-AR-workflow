# safwk_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `systemabilitymgr` |
| component | `safwk_lite` |
| Git 子仓 | `foundation/systemabilitymgr/safwk_lite` |
| bundle | [foundation/systemabilitymgr/safwk_lite/bundle.json](../../../../../../foundation/systemabilitymgr/safwk_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | small |
| component dependencies | 6 |
| third-party dependencies | 2 |
| declared sub_component | 1 |
| inner kits | 0 |
| declared test entries | 0 |

## 依赖

组件依赖：`ability_lite`, `bundle_framework_lite`, `dmsfwk_lite`, `hilog_lite`, `permission_lite`, `samgr_lite`

三方依赖：`bounds_checking_function`, `cJSON`

## 声明构建入口

- `//foundation/systemabilitymgr/safwk_lite:foundation`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 2 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 0 |
| total | 2 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `lite_component` | `//foundation/systemabilitymgr/safwk_lite:safwk_lite` | [foundation/systemabilitymgr/safwk_lite/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk_lite/BUILD.gn) | 24 |
| production | `executable` | `//foundation/systemabilitymgr/safwk_lite:foundation` | [foundation/systemabilitymgr/safwk_lite/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk_lite/BUILD.gn) | 29 |

## 查询命令

```bash
awk -F '\t' '$1 == "systemabilitymgr" && $2 == "safwk_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
