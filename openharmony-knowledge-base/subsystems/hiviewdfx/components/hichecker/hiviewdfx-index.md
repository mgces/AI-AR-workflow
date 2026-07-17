# hichecker 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。

[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `hiviewdfx` |
| component | `hichecker` |
| repository | `base/hiviewdfx/hichecker` |
| bundle | [base/hiviewdfx/hichecker/bundle.json](../../../../../../base/hiviewdfx/hichecker/bundle.json) |
| rk3568 | 已选入 |

## 声明构建和测试入口

- 生产入口：`//base/hiviewdfx/hichecker/interfaces/native/innerkits:libhichecker`、`//base/hiviewdfx/hichecker/interfaces/js/kits/napi:hichecker`、`//base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher:jsleakwatcher`、`//base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher:jsleakwatchernative`、`//base/hiviewdfx/hichecker/frameworks/native:libhichecker_source`、`//base/hiviewdfx/hichecker/interfaces/ets/ani:ani_hichecker_package`
- 测试入口：`//base/hiviewdfx/hichecker/test:unittest`、`//base/hiviewdfx/hichecker/test:hichecker_fuzztest`

## 目标分类统计

| 分类 | 数量 |
| --- | ---: |
| production | 10 |
| test | 6 |
| build-support | 4 |
| aggregate-codegen | 5 |
| total | 25 |

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |
| production | `ohos_source_set` | `//base/hiviewdfx/hichecker/frameworks/native:libhichecker_source` | [base/hiviewdfx/hichecker/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/frameworks/native/BUILD.gn) | 16 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hichecker/interfaces/ets/ani:ani_hichecker_package` | [base/hiviewdfx/hichecker/interfaces/ets/ani/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/ets/ani/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hichecker/interfaces/ets/ani/hichecker:hichecker_ani` | [base/hiviewdfx/hichecker/interfaces/ets/ani/hichecker/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/ets/ani/hichecker/BUILD.gn) | 17 |
| aggregate-codegen | `generate_static_abc` | `//base/hiviewdfx/hichecker/interfaces/ets/ani/hichecker:hichecker` | [base/hiviewdfx/hichecker/interfaces/ets/ani/hichecker/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/ets/ani/hichecker/BUILD.gn) | 35 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hichecker/interfaces/ets/ani/hichecker:hichecker_etc` | [base/hiviewdfx/hichecker/interfaces/ets/ani/hichecker/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/ets/ani/hichecker/BUILD.gn) | 42 |
| build-support | `config` | `//base/hiviewdfx/hichecker/interfaces/js/kits/napi:hichecker_js_source_config` | [base/hiviewdfx/hichecker/interfaces/js/kits/napi/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/js/kits/napi/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hichecker/interfaces/js/kits/napi:hichecker` | [base/hiviewdfx/hichecker/interfaces/js/kits/napi/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/js/kits/napi/BUILD.gn) | 23 |
| production | `es2abc_gen_abc` | `//base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher:gen_js_leak_watcher_abc` | [base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher/BUILD.gn) | 22 |
| aggregate-codegen | `gen_js_obj` | `//base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher:js_leak_watcher_js` | [base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher/BUILD.gn) | 30 |
| aggregate-codegen | `gen_js_obj` | `//base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher:js_leak_watcher_abc` | [base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher/BUILD.gn) | 35 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher:jsleakwatcher` | [base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher/BUILD.gn) | 43 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher:jsleakwatchernative` | [base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher/BUILD.gn) | 63 |
| build-support | `config` | `//base/hiviewdfx/hichecker/interfaces/native/innerkits:hichecker_native_config` | [base/hiviewdfx/hichecker/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/native/innerkits/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hichecker/interfaces/native/innerkits:hichecker.para` | [base/hiviewdfx/hichecker/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/native/innerkits/BUILD.gn) | 23 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hichecker/interfaces/native/innerkits:hichecker.para.dac` | [base/hiviewdfx/hichecker/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/native/innerkits/BUILD.gn) | 34 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hichecker/interfaces/native/innerkits:hichecker_etc` | [base/hiviewdfx/hichecker/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/native/innerkits/BUILD.gn) | 45 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hichecker/interfaces/native/innerkits:libhichecker` | [base/hiviewdfx/hichecker/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/interfaces/native/innerkits/BUILD.gn) | 52 |
| build-support | `config` | `//base/hiviewdfx/hichecker/test:hichecker_config_test` | [base/hiviewdfx/hichecker/test/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/test/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//base/hiviewdfx/hichecker/test:HiCheckerNativeTest` | [base/hiviewdfx/hichecker/test/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/test/BUILD.gn) | 27 |
| build-support | `config` | `//base/hiviewdfx/hichecker/test:js_leak_watcher_config_test` | [base/hiviewdfx/hichecker/test/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/test/BUILD.gn) | 37 |
| test | `ohos_unittest` | `//base/hiviewdfx/hichecker/test:JsLeakWatcherNapiTest` | [base/hiviewdfx/hichecker/test/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/test/BUILD.gn) | 49 |
| test | `ohos_unittest` | `//base/hiviewdfx/hichecker/test:JsLeakWatcherTsTest` | [base/hiviewdfx/hichecker/test/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/test/BUILD.gn) | 78 |
| test | `group` | `//base/hiviewdfx/hichecker/test:unittest` | [base/hiviewdfx/hichecker/test/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/test/BUILD.gn) | 106 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hichecker/test:HicheckerFuzzTest` | [base/hiviewdfx/hichecker/test/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/test/BUILD.gn) | 119 |
| test | `group` | `//base/hiviewdfx/hichecker/test:hichecker_fuzztest` | [base/hiviewdfx/hichecker/test/BUILD.gn](../../../../../../base/hiviewdfx/hichecker/test/BUILD.gn) | 130 |

## 扫描限制

- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。
- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。
- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。
