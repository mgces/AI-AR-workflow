# hilog_lite 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。

[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `hiviewdfx` |
| component | `hilog_lite` |
| repository | `base/hiviewdfx/hilog_lite` |
| bundle | [base/hiviewdfx/hilog_lite/bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| rk3568 | 未选入 |

## 声明构建和测试入口

- 生产入口：`//base/hiviewdfx/hilog_lite/frameworks/mini:hilog_lite`、`//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_static`、`//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_shared`、`//base/hiviewdfx/hilog_lite/services/apphilogcat:apphilogcat`、`//base/hiviewdfx/hilog_lite/frameworks/js:ace_hilog_kits`、`//base/hiviewdfx/hilog_lite/test:hilog_lite_test`
- 测试入口：无声明

## 目标分类统计

| 分类 | 数量 |
| --- | ---: |
| production | 13 |
| test | 2 |
| build-support | 4 |
| aggregate-codegen | 5 |
| total | 24 |

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//base/hiviewdfx/hilog_lite/command:hilog_command_config` | [base/hiviewdfx/hilog_lite/command/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/command/BUILD.gn) | 16 |
| production | `lite_library` | `//base/hiviewdfx/hilog_lite/command:hilog_command_static` | [base/hiviewdfx/hilog_lite/command/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/command/BUILD.gn) | 20 |
| production | `lite_library` | `//base/hiviewdfx/hilog_lite/command:hilog_command_shared` | [base/hiviewdfx/hilog_lite/command/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/command/BUILD.gn) | 33 |
| build-support | `config` | `//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_config` | [base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn) | 21 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_static` | [base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn) | 41 |
| production | `lite_library` | `//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_static` | [base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn) | 44 |
| production | `lite_library` | `//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_shared` | [base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn) | 56 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_shared` | [base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn) | 66 |
| production | `ndk_lib` | `//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_ndk` | [base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/featured/BUILD.gn) | 70 |
| production | `lite_component` | `//base/hiviewdfx/hilog_lite/frameworks/js:ace_hilog_kits` | [base/hiviewdfx/hilog_lite/frameworks/js/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/js/BUILD.gn) | 22 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hilog_lite/frameworks/js:ace_hilog_kits` | [base/hiviewdfx/hilog_lite/frameworks/js/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/js/BUILD.gn) | 26 |
| production | `shared_library` | `//base/hiviewdfx/hilog_lite/frameworks/js/builtin:ace_kit_hilog` | [base/hiviewdfx/hilog_lite/frameworks/js/builtin/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/js/builtin/BUILD.gn) | 18 |
| build-support | `config` | `//base/hiviewdfx/hilog_lite/frameworks/mini:hilog_lite_config` | [base/hiviewdfx/hilog_lite/frameworks/mini/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/mini/BUILD.gn) | 28 |
| production | `static_library` | `//base/hiviewdfx/hilog_lite/frameworks/mini:hilog_lite_static` | [base/hiviewdfx/hilog_lite/frameworks/mini/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/mini/BUILD.gn) | 37 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hilog_lite/frameworks/mini:hilog_lite` | [base/hiviewdfx/hilog_lite/frameworks/mini/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/mini/BUILD.gn) | 78 |
| production | `ndk_lib` | `//base/hiviewdfx/hilog_lite/frameworks/mini:hilog_lite_ndk` | [base/hiviewdfx/hilog_lite/frameworks/mini/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/frameworks/mini/BUILD.gn) | 91 |
| build-support | `config` | `//base/hiviewdfx/hilog_lite/services/apphilogcat:apphilogcat_config` | [base/hiviewdfx/hilog_lite/services/apphilogcat/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/services/apphilogcat/BUILD.gn) | 27 |
| production | `static_library` | `//base/hiviewdfx/hilog_lite/services/apphilogcat:apphilogcat_static` | [base/hiviewdfx/hilog_lite/services/apphilogcat/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/services/apphilogcat/BUILD.gn) | 52 |
| production | `lite_component` | `//base/hiviewdfx/hilog_lite/services/apphilogcat:apphilogcat` | [base/hiviewdfx/hilog_lite/services/apphilogcat/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/services/apphilogcat/BUILD.gn) | 67 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hilog_lite/services/apphilogcat:apphilogcat` | [base/hiviewdfx/hilog_lite/services/apphilogcat/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/services/apphilogcat/BUILD.gn) | 73 |
| production | `static_library` | `//base/hiviewdfx/hilog_lite/services/hilogcat:hilogcat_static` | [base/hiviewdfx/hilog_lite/services/hilogcat/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/services/hilogcat/BUILD.gn) | 16 |
| production | `lite_component` | `//base/hiviewdfx/hilog_lite/services/hilogcat:hilogcat` | [base/hiviewdfx/hilog_lite/services/hilogcat/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/services/hilogcat/BUILD.gn) | 26 |
| test | `group` | `//base/hiviewdfx/hilog_lite/test:hilog_lite_test` | [base/hiviewdfx/hilog_lite/test/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/test/BUILD.gn) | 21 |
| test | `unittest` | `//base/hiviewdfx/hilog_lite/test:lite_hilog_unittest` | [base/hiviewdfx/hilog_lite/test/BUILD.gn](../../../../../../base/hiviewdfx/hilog_lite/test/BUILD.gn) | 30 |

## 扫描限制

- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。
- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。
- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。
