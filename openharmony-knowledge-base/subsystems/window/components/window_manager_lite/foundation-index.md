# window_manager_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `window` |
| component | `window_manager_lite` |
| Git 子仓 | `foundation/window/window_manager_lite` |
| bundle | [foundation/window/window_manager_lite/bundle.json](../../../../../../foundation/window/window_manager_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | small |
| component dependencies | 7 |
| third-party dependencies | 1 |
| declared sub_component | 2 |
| inner kits | 0 |
| declared test entries | 0 |

## 依赖

组件依赖：`samgr_lite`, `surface_lite`, `drivers_peripheral_input`, `ipc`, `graphic_utils_lite`, `hdf_core`, `permission_lite`

三方依赖：`bounds_checking_function`

## 声明构建入口

- `//foundation/window/window_manager_lite:window_manager_lite`
- `//foundation/window/window_manager_lite/test:window_manager_lite_test`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 4 |
| test | 4 |
| build-support | 1 |
| aggregate-codegen | 0 |
| total | 9 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `lite_component` | `//foundation/window/window_manager_lite:window_manager_lite` | [foundation/window/window_manager_lite/BUILD.gn](../../../../../../foundation/window/window_manager_lite/BUILD.gn) | 15 |
| production | `ndk_lib` | `//foundation/window/window_manager_lite:window_manager_lite_ndk` | [foundation/window/window_manager_lite/BUILD.gn](../../../../../../foundation/window/window_manager_lite/BUILD.gn) | 23 |
| production | `shared_library` | `//foundation/window/window_manager_lite:wms_client` | [foundation/window/window_manager_lite/BUILD.gn](../../../../../../foundation/window/window_manager_lite/BUILD.gn) | 38 |
| build-support | `config` | `//foundation/window/window_manager_lite:wms_public_config` | [foundation/window/window_manager_lite/BUILD.gn](../../../../../../foundation/window/window_manager_lite/BUILD.gn) | 57 |
| production | `executable` | `//foundation/window/window_manager_lite:wms_server` | [foundation/window/window_manager_lite/BUILD.gn](../../../../../../foundation/window/window_manager_lite/BUILD.gn) | 71 |
| test | `group` | `//foundation/window/window_manager_lite/test:window_manager_lite_test` | [foundation/window/window_manager_lite/test/BUILD.gn](../../../../../../foundation/window/window_manager_lite/test/BUILD.gn) | 15 |
| test | `executable` | `//foundation/window/window_manager_lite/test:sample_ui` | [foundation/window/window_manager_lite/test/BUILD.gn](../../../../../../foundation/window/window_manager_lite/test/BUILD.gn) | 26 |
| test | `executable` | `//foundation/window/window_manager_lite/test:sample_auto_ui` | [foundation/window/window_manager_lite/test/BUILD.gn](../../../../../../foundation/window/window_manager_lite/test/BUILD.gn) | 47 |
| test | `executable` | `//foundation/window/window_manager_lite/test:sample_window` | [foundation/window/window_manager_lite/test/BUILD.gn](../../../../../../foundation/window/window_manager_lite/test/BUILD.gn) | 68 |

## 查询命令

```bash
awk -F '\t' '$1 == "window" && $2 == "window_manager_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
