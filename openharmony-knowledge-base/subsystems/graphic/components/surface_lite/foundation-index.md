# surface_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `graphic` |
| component | `surface_lite` |
| Git 子仓 | `foundation/graphic/surface_lite` |
| bundle | [foundation/graphic/surface_lite/bundle.json](../../../../../../foundation/graphic/surface_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | small |
| component dependencies | 3 |
| third-party dependencies | 1 |
| declared sub_component | 2 |
| inner kits | 0 |
| declared test entries | 0 |

## 依赖

组件依赖：`drivers_peripheral_display`, `graphic_utils_lite`, `ipc`

三方依赖：`bounds_checking_function`

## 声明构建入口

- `//foundation/graphic/surface_lite:surface_lite`
- `//foundation/graphic/surface_lite/test:surface_lite_test`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 3 |
| test | 2 |
| build-support | 1 |
| aggregate-codegen | 0 |
| total | 6 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `lite_component` | `//foundation/graphic/surface_lite:surface_lite` | [foundation/graphic/surface_lite/BUILD.gn](../../../../../../foundation/graphic/surface_lite/BUILD.gn) | 15 |
| production | `ndk_lib` | `//foundation/graphic/surface_lite:surface_lite_ndk` | [foundation/graphic/surface_lite/BUILD.gn](../../../../../../foundation/graphic/surface_lite/BUILD.gn) | 20 |
| production | `shared_library` | `//foundation/graphic/surface_lite:surface` | [foundation/graphic/surface_lite/BUILD.gn](../../../../../../foundation/graphic/surface_lite/BUILD.gn) | 26 |
| build-support | `config` | `//foundation/graphic/surface_lite:surface_public_config` | [foundation/graphic/surface_lite/BUILD.gn](../../../../../../foundation/graphic/surface_lite/BUILD.gn) | 59 |
| test | `group` | `//foundation/graphic/surface_lite/test:surface_lite_test` | [foundation/graphic/surface_lite/test/BUILD.gn](../../../../../../foundation/graphic/surface_lite/test/BUILD.gn) | 14 |
| test | `unittest` | `//foundation/graphic/surface_lite/test:surface_lite_unittest_door` | [foundation/graphic/surface_lite/test/BUILD.gn](../../../../../../foundation/graphic/surface_lite/test/BUILD.gn) | 21 |

## 查询命令

```bash
awk -F '\t' '$1 == "graphic" && $2 == "surface_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
