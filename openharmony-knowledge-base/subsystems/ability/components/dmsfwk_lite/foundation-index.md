# dmsfwk_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `ability` |
| component | `dmsfwk_lite` |
| Git 子仓 | `foundation/ability/dmsfwk_lite` |
| bundle | [foundation/ability/dmsfwk_lite/bundle.json](../../../../../../foundation/ability/dmsfwk_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | small |
| component dependencies | 6 |
| third-party dependencies | 2 |
| declared sub_component | 2 |
| inner kits | 1 |
| declared test entries | 0 |

## 依赖

组件依赖：`utils_lite`, `hilog_lite`, `samgr_lite`, `bundle_framework_lite`, `ability_lite`, `huks`

三方依赖：`bounds_checking_function`, `cJSON`

## 声明构建入口

- `//foundation/ability/dmsfwk_lite:dtbschedmgr`
- `//foundation/ability/dmsfwk_lite/moduletest/dtbschedmgr_lite:distributed_schedule_test_dms_door`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 2 |
| test | 2 |
| build-support | 0 |
| aggregate-codegen | 1 |
| total | 5 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `lite_library` | `//foundation/ability/dmsfwk_lite:dmslite` | [foundation/ability/dmsfwk_lite/BUILD.gn](../../../../../../foundation/ability/dmsfwk_lite/BUILD.gn) | 18 |
| production | `lite_component` | `//foundation/ability/dmsfwk_lite:dtbschedmgr` | [foundation/ability/dmsfwk_lite/BUILD.gn](../../../../../../foundation/ability/dmsfwk_lite/BUILD.gn) | 71 |
| aggregate-codegen | `generate_notice_file` | `//foundation/ability/dmsfwk_lite:dtbschedmgr_notice_file` | [foundation/ability/dmsfwk_lite/BUILD.gn](../../../../../../foundation/ability/dmsfwk_lite/BUILD.gn) | 75 |
| test | `unittest` | `//foundation/ability/dmsfwk_lite/moduletest/dtbschedmgr_lite:distributed_schedule_test_dms_door` | [foundation/ability/dmsfwk_lite/moduletest/dtbschedmgr_lite/BUILD.gn](../../../../../../foundation/ability/dmsfwk_lite/moduletest/dtbschedmgr_lite/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/dmsfwk_lite/moduletest/dtbschedmgr_lite:unittest` | [foundation/ability/dmsfwk_lite/moduletest/dtbschedmgr_lite/BUILD.gn](../../../../../../foundation/ability/dmsfwk_lite/moduletest/dtbschedmgr_lite/BUILD.gn) | 62 |

## 查询命令

```bash
awk -F '\t' '$1 == "ability" && $2 == "dmsfwk_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
