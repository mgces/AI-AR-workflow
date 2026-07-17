# graphic_utils_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `graphic` |
| component | `graphic_utils_lite` |
| Git 子仓 | `foundation/graphic/graphic_utils_lite` |
| bundle | [foundation/graphic/graphic_utils_lite/bundle.json](../../../../../../foundation/graphic/graphic_utils_lite/bundle.json) |
| rk3568 selected | yes |
| adapted systems | mini,small |
| component dependencies | 3 |
| third-party dependencies | 0 |
| declared sub_component | 2 |
| inner kits | 1 |
| declared test entries | 0 |

## 依赖

组件依赖：`hilog_lite`, `drivers_peripheral_display`, `bounds_checking_function`

三方依赖：无声明

## 声明构建入口

- `//foundation/graphic/graphic_utils_lite:utils_lite`
- `//foundation/graphic/graphic_utils_lite/test:graphic_utils_lite_test`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 7 |
| test | 3 |
| build-support | 4 |
| aggregate-codegen | 0 |
| total | 14 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `lite_component` | `//foundation/graphic/graphic_utils_lite:utils_lite` | [foundation/graphic/graphic_utils_lite/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/BUILD.gn) | 27 |
| production | `ndk_lib` | `//foundation/graphic/graphic_utils_lite:graphic_utils_lite_ndk` | [foundation/graphic/graphic_utils_lite/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/BUILD.gn) | 32 |
| production | `lite_library` | `//foundation/graphic/graphic_utils_lite:graphic_utils_lite` | [foundation/graphic/graphic_utils_lite/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/BUILD.gn) | 38 |
| build-support | `config` | `//foundation/graphic/graphic_utils_lite:graphic_utils_public_config` | [foundation/graphic/graphic_utils_lite/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/BUILD.gn) | 104 |
| production | `lite_component` | `//foundation/graphic/graphic_utils_lite:lite_graphic_hals` | [foundation/graphic/graphic_utils_lite/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/BUILD.gn) | 129 |
| production | `ndk_lib` | `//foundation/graphic/graphic_utils_lite:lite_graphic_hals_ndk` | [foundation/graphic/graphic_utils_lite/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/BUILD.gn) | 134 |
| production | `shared_library` | `//foundation/graphic/graphic_utils_lite:graphic_hals` | [foundation/graphic/graphic_utils_lite/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/BUILD.gn) | 140 |
| build-support | `config` | `//foundation/graphic/graphic_utils_lite:graphic_hals_public_config` | [foundation/graphic/graphic_utils_lite/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/BUILD.gn) | 160 |
| build-support | `config` | `//foundation/graphic/graphic_utils_lite:graphic_utils_config` | [foundation/graphic/graphic_utils_lite/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/BUILD.gn) | 172 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_utils_lite:utils_lite` | [foundation/graphic/graphic_utils_lite/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/BUILD.gn) | 177 |
| test | `group` | `//foundation/graphic/graphic_utils_lite/test:graphic_utils_lite_test` | [foundation/graphic/graphic_utils_lite/test/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/test/BUILD.gn) | 15 |
| build-support | `config` | `//foundation/graphic/graphic_utils_lite/test:graphic_utils_lite_test_config` | [foundation/graphic/graphic_utils_lite/test/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/test/BUILD.gn) | 21 |
| test | `unittest` | `//foundation/graphic/graphic_utils_lite/test:graphic_test_utils_door` | [foundation/graphic/graphic_utils_lite/test/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/test/BUILD.gn) | 30 |
| test | `group` | `//foundation/graphic/graphic_utils_lite/test:graphic_utils_lite_test` | [foundation/graphic/graphic_utils_lite/test/BUILD.gn](../../../../../../foundation/graphic/graphic_utils_lite/test/BUILD.gn) | 47 |

## 查询命令

```bash
awk -F '\t' '$1 == "graphic" && $2 == "graphic_utils_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
