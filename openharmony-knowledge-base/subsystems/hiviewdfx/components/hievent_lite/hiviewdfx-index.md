# hievent_lite 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。

[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `hiviewdfx` |
| component | `hievent_lite` |
| repository | `base/hiviewdfx/hievent_lite` |
| bundle | [base/hiviewdfx/hievent_lite/bundle.json](../../../../../../base/hiviewdfx/hievent_lite/bundle.json) |
| rk3568 | 未选入 |

## 声明构建和测试入口

- 生产入口：`//base/hiviewdfx/hievent_lite:hievent_lite`
- 测试入口：无声明

## 目标分类统计

| 分类 | 数量 |
| --- | ---: |
| production | 2 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 1 |
| total | 3 |

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |
| production | `static_library` | `//base/hiviewdfx/hievent_lite:hievent_lite_static` | [base/hiviewdfx/hievent_lite/BUILD.gn](../../../../../../base/hiviewdfx/hievent_lite/BUILD.gn) | 24 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hievent_lite:hievent_lite` | [base/hiviewdfx/hievent_lite/BUILD.gn](../../../../../../base/hiviewdfx/hievent_lite/BUILD.gn) | 53 |
| production | `static_library` | `//base/hiviewdfx/hievent_lite/command:hievent_lite_command` | [base/hiviewdfx/hievent_lite/command/BUILD.gn](../../../../../../base/hiviewdfx/hievent_lite/command/BUILD.gn) | 14 |

## 扫描限制

- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。
- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。
- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。
