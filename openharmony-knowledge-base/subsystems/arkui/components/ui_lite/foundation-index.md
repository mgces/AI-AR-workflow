# ui_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `arkui` |
| component | `ui_lite` |
| Git 子仓 | `foundation/arkui/ui_lite` |
| bundle | [foundation/arkui/ui_lite/bundle.json](../../../../../../foundation/arkui/ui_lite/bundle.json) |
| rk3568 selected | yes |
| adapted systems | mini,small,standard |
| component dependencies | 11 |
| third-party dependencies | 0 |
| declared sub_component | 3 |
| inner kits | 3 |
| declared test entries | 0 |

## 依赖

组件依赖：`graphic_utils_lite`, `surface_lite`, `window_manager_lite`, `media_lite`, `libjpeg-turbo`, `icu`, `cJSON`, `freetype`, `bounds_checking_function`, `libpng`, `harfbuzz`

三方依赖：无声明

## 声明构建入口

- `//foundation/arkui/ui_lite/test/unittest:arkui_ui_lite_test`
- `//foundation/arkui/ui_lite/ext/updater:libupdater_layout`
- `//foundation/arkui/ui_lite/ext/home_host:libhome_host_layout`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 6 |
| test | 7 |
| build-support | 9 |
| aggregate-codegen | 6 |
| total | 28 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `lite_component` | `//foundation/arkui/ui_lite:ui_lite` | [foundation/arkui/ui_lite/BUILD.gn](../../../../../../foundation/arkui/ui_lite/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/arkui/ui_lite:graphic_define_config` | [foundation/arkui/ui_lite/BUILD.gn](../../../../../../foundation/arkui/ui_lite/BUILD.gn) | 23 |
| aggregate-codegen | `copy` | `//foundation/arkui/ui_lite:utils_config` | [foundation/arkui/ui_lite/BUILD.gn](../../../../../../foundation/arkui/ui_lite/BUILD.gn) | 93 |
| production | `lite_library` | `//foundation/arkui/ui_lite:ui` | [foundation/arkui/ui_lite/BUILD.gn](../../../../../../foundation/arkui/ui_lite/BUILD.gn) | 102 |
| aggregate-codegen | `group` | `//foundation/arkui/ui_lite:ui_lite` | [foundation/arkui/ui_lite/BUILD.gn](../../../../../../foundation/arkui/ui_lite/BUILD.gn) | 298 |
| build-support | `config` | `//foundation/arkui/ui_lite/ext/home_host:libhome_host_layout_header_files` | [foundation/arkui/ui_lite/ext/home_host/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/home_host/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/ui_lite/ext/home_host:libhome_host_layout` | [foundation/arkui/ui_lite/ext/home_host/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/home_host/BUILD.gn) | 22 |
| aggregate-codegen | `group` | `//foundation/arkui/ui_lite/ext/home_host:libhome_host_layout` | [foundation/arkui/ui_lite/ext/home_host/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/home_host/BUILD.gn) | 56 |
| build-support | `config` | `//foundation/arkui/ui_lite/ext/ide:graphic_public_config_ide` | [foundation/arkui/ui_lite/ext/ide/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/ide/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/arkui/ui_lite/ext/ide:graphic_config_ide` | [foundation/arkui/ui_lite/ext/ide/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/ide/BUILD.gn) | 46 |
| production | `ohos_static_library` | `//foundation/arkui/ui_lite/ext/ide:ui_ide` | [foundation/arkui/ui_lite/ext/ide/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/ide/BUILD.gn) | 57 |
| build-support | `config` | `//foundation/arkui/ui_lite/ext/ide:graphic_utils_public_config_ide` | [foundation/arkui/ui_lite/ext/ide/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/ide/BUILD.gn) | 76 |
| production | `ohos_static_library` | `//foundation/arkui/ui_lite/ext/ide:graphic_utils_static_ide` | [foundation/arkui/ui_lite/ext/ide/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/ide/BUILD.gn) | 80 |
| aggregate-codegen | `group` | `//foundation/arkui/ui_lite/ext/ide:ui_ide` | [foundation/arkui/ui_lite/ext/ide/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/ide/BUILD.gn) | 90 |
| aggregate-codegen | `ohos_copy` | `//foundation/arkui/ui_lite/ext/ide:copy_previewer_fonts_lite_full` | [foundation/arkui/ui_lite/ext/ide/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/ide/BUILD.gn) | 95 |
| build-support | `config` | `//foundation/arkui/ui_lite/ext/updater:libupdater_layout_header_files` | [foundation/arkui/ui_lite/ext/updater/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/updater/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/arkui/ui_lite/ext/updater:updater_layout_link_config` | [foundation/arkui/ui_lite/ext/updater/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/updater/BUILD.gn) | 22 |
| production | `ohos_shared_library` | `//foundation/arkui/ui_lite/ext/updater:libupdater_layout` | [foundation/arkui/ui_lite/ext/updater/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/updater/BUILD.gn) | 26 |
| aggregate-codegen | `group` | `//foundation/arkui/ui_lite/ext/updater:libupdater_layout` | [foundation/arkui/ui_lite/ext/updater/BUILD.gn](../../../../../../foundation/arkui/ui_lite/ext/updater/BUILD.gn) | 94 |
| build-support | `config` | `//foundation/arkui/ui_lite/test/framework:graphic_test_config` | [foundation/arkui/ui_lite/test/framework/BUILD.gn](../../../../../../foundation/arkui/ui_lite/test/framework/BUILD.gn) | 15 |
| test | `static_library` | `//foundation/arkui/ui_lite/test/framework:framework` | [foundation/arkui/ui_lite/test/framework/BUILD.gn](../../../../../../foundation/arkui/ui_lite/test/framework/BUILD.gn) | 85 |
| test | `static_library` | `//foundation/arkui/ui_lite/test/framework:auto_framework` | [foundation/arkui/ui_lite/test/framework/BUILD.gn](../../../../../../foundation/arkui/ui_lite/test/framework/BUILD.gn) | 109 |
| test | `group` | `//foundation/arkui/ui_lite/test/framework:lite_graphic_test_framework` | [foundation/arkui/ui_lite/test/framework/BUILD.gn](../../../../../../foundation/arkui/ui_lite/test/framework/BUILD.gn) | 137 |
| test | `group` | `//foundation/arkui/ui_lite/test/unittest:arkui_ui_lite_test` | [foundation/arkui/ui_lite/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ui_lite/test/unittest/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/arkui/ui_lite/test/unittest:graphic_test_config` | [foundation/arkui/ui_lite/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ui_lite/test/unittest/BUILD.gn) | 23 |
| test | `unittest` | `//foundation/arkui/ui_lite/test/unittest:graphic_test_ui_door` | [foundation/arkui/ui_lite/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ui_lite/test/unittest/BUILD.gn) | 43 |
| test | `group` | `//foundation/arkui/ui_lite/test/unittest:arkui_ui_lite_test` | [foundation/arkui/ui_lite/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ui_lite/test/unittest/BUILD.gn) | 123 |
| test | `group` | `//foundation/arkui/ui_lite/test/unittest:arkui_ui_lite_test` | [foundation/arkui/ui_lite/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ui_lite/test/unittest/BUILD.gn) | 127 |

## 查询命令

```bash
awk -F '\t' '$1 == "arkui" && $2 == "ui_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
