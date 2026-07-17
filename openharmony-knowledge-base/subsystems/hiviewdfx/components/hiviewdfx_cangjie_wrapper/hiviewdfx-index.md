# hiviewdfx_cangjie_wrapper 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。

[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `hiviewdfx` |
| component | `hiviewdfx_cangjie_wrapper` |
| repository | `base/hiviewdfx/hiviewdfx_cangjie_wrapper` |
| bundle | [base/hiviewdfx/hiviewdfx_cangjie_wrapper/bundle.json](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/bundle.json) |
| rk3568 | 未选入 |

## 声明构建和测试入口

- 生产入口：`//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hilog:ohos.hilog`、`//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hiviewdfx:ohos.hiviewdfx`、`//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hiviewdfx/hi_app_event:ohos.hiviewdfx.hi_app_event`、`//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hi_trace_meter:ohos.hi_trace_meter`、`//base/hiviewdfx/hiviewdfx_cangjie_wrapper/kit/PerformanceAnalysisKit:kit.PerformanceAnalysisKit`
- 测试入口：无声明

## 目标分类统计

| 分类 | 数量 |
| --- | ---: |
| production | 5 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 1 |
| total | 6 |

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `copy_ohos_cangjie_sdk_api_lib` | `//base/hiviewdfx/hiviewdfx_cangjie_wrapper:copy_sdk_hiviewdfx_cangjie_libs` | [base/hiviewdfx/hiviewdfx_cangjie_wrapper/BUILD.gn](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/BUILD.gn) | 26 |
| production | `ohos_cangjie_shared_library` | `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/kit/PerformanceAnalysisKit:kit.PerformanceAnalysisKit` | [base/hiviewdfx/hiviewdfx_cangjie_wrapper/kit/PerformanceAnalysisKit/BUILD.gn](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/kit/PerformanceAnalysisKit/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hi_trace_meter:ohos.hi_trace_meter` | [base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hi_trace_meter/BUILD.gn](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hi_trace_meter/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hilog:ohos.hilog` | [base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hilog/BUILD.gn](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hilog/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hiviewdfx:ohos.hiviewdfx` | [base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hiviewdfx/BUILD.gn](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hiviewdfx/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hiviewdfx/hi_app_event:ohos.hiviewdfx.hi_app_event` | [base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hiviewdfx/hi_app_event/BUILD.gn](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hiviewdfx/hi_app_event/BUILD.gn) | 19 |

## 扫描限制

- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。
- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。
- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。
