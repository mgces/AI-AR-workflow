# hiappevent 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。

[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `hiviewdfx` |
| component | `hiappevent` |
| repository | `base/hiviewdfx/hiappevent` |
| bundle | [base/hiviewdfx/hiappevent/bundle.json](../../../../../../base/hiviewdfx/hiappevent/bundle.json) |
| rk3568 | 已选入 |

## 声明构建和测试入口

- 生产入口：`//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent:libhiappevent_base`、`//base/hiviewdfx/hiappevent/frameworks/native/ndk:hiappevent_ndk`、`//base/hiviewdfx/hiappevent/frameworks/js/napi:hiappevent`、`//base/hiviewdfx/hiappevent/frameworks/js/napi:hiappevent_v9`、`//base/hiviewdfx/hiappevent/frameworks/cj/ffi:cj_hiappevent_ffi`、`//base/hiviewdfx/hiappevent/interfaces/native/inner_api:hiappevent_innerapi`、`//base/hiviewdfx/hiappevent/frameworks/ets/ani:ani_hiappevent_package`
- 测试入口：`//base/hiviewdfx/hiappevent/test:unittest`

## 目标分类统计

| 分类 | 数量 |
| --- | ---: |
| production | 14 |
| test | 16 |
| build-support | 10 |
| aggregate-codegen | 2 |
| total | 42 |

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |
| production | `ohos_shared_library` | `//base/hiviewdfx/hiappevent/frameworks/cj/ffi:cj_hiappevent_ffi` | [base/hiviewdfx/hiappevent/frameworks/cj/ffi/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/cj/ffi/BUILD.gn) | 16 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hiappevent/frameworks/ets/ani:ani_hiappevent_package` | [base/hiviewdfx/hiappevent/frameworks/ets/ani/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/ets/ani/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hiappevent/frameworks/ets/ani/hiappevent:hiappevent_ani` | [base/hiviewdfx/hiappevent/frameworks/ets/ani/hiappevent/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/ets/ani/hiappevent/BUILD.gn) | 17 |
| aggregate-codegen | `generate_static_abc` | `//base/hiviewdfx/hiappevent/frameworks/ets/ani/hiappevent:hiappevent` | [base/hiviewdfx/hiappevent/frameworks/ets/ani/hiappevent/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/ets/ani/hiappevent/BUILD.gn) | 48 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hiappevent/frameworks/ets/ani/hiappevent:hiappevent_etc` | [base/hiviewdfx/hiappevent/frameworks/ets/ani/hiappevent/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/ets/ani/hiappevent/BUILD.gn) | 55 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hiappevent/frameworks/js/napi:hiappevent` | [base/hiviewdfx/hiappevent/frameworks/js/napi/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/js/napi/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hiappevent/frameworks/js/napi:hiappevent_v9` | [base/hiviewdfx/hiappevent/frameworks/js/napi/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/js/napi/BUILD.gn) | 44 |
| build-support | `config` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent:libhiappevent_source_config` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent:libhiappevent_base` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/BUILD.gn) | 27 |
| build-support | `config` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cache:hiappevent_cache_config` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cache/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cache/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cache:hiappevent_cache` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cache/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cache/BUILD.gn) | 24 |
| build-support | `config` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cleaner:hiappevent_cleaner_config` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cleaner/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cleaner/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cleaner:hiappevent_cleaner` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cleaner/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/cleaner/BUILD.gn) | 21 |
| build-support | `config` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/observer:hiappevent_watcher_config` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/observer/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/observer/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/observer:hiappevent_observer` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/observer/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/observer/BUILD.gn) | 26 |
| build-support | `config` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/policy:hiappevent_policy_config` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/policy/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/policy/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/policy:hiappevent_policy` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/policy/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/policy/BUILD.gn) | 21 |
| build-support | `config` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/stat:hiappevent_stat_config` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/stat/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/stat/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/stat:hiappevent_stat` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/stat/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/stat/BUILD.gn) | 25 |
| build-support | `config` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/utility:hiappevent_utility_config` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/utility/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/utility/BUILD.gn) | 17 |
| production | `ohos_source_set` | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/utility:hiappevent_utility` | [base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/utility/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/libhiappevent/utility/BUILD.gn) | 27 |
| build-support | `config` | `//base/hiviewdfx/hiappevent/frameworks/native/ndk:hiappevent_ndk_config` | [base/hiviewdfx/hiappevent/frameworks/native/ndk/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/ndk/BUILD.gn) | 18 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hiappevent/frameworks/native/ndk:hiappevent_ndk` | [base/hiviewdfx/hiappevent/frameworks/native/ndk/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/frameworks/native/ndk/BUILD.gn) | 23 |
| build-support | `config` | `//base/hiviewdfx/hiappevent/interfaces/native/inner_api:hiappevent_innerapi_config` | [base/hiviewdfx/hiappevent/interfaces/native/inner_api/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/interfaces/native/inner_api/BUILD.gn) | 15 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hiappevent/interfaces/native/inner_api:hiappevent_innerapi` | [base/hiviewdfx/hiappevent/interfaces/native/inner_api/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/interfaces/native/inner_api/BUILD.gn) | 20 |
| build-support | `config` | `//base/hiviewdfx/hiappevent/test:hiappevent_config_test` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventApiMetricTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 37 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventAppEventTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 99 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventCacheTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 119 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventInnerApiTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 170 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventNativeTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 195 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventObserverTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 222 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventPolicyTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 285 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventUserInfoTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 324 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventUtilityTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 336 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventVerifyTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 355 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventWatcherTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 367 |
| test | `ohos_unittest` | `//base/hiviewdfx/hiappevent/test:HiAppEventBaseVariantTest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 381 |
| test | `group` | `//base/hiviewdfx/hiappevent/test:unittest` | [base/hiviewdfx/hiappevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/BUILD.gn) | 391 |
| test | `ohos_shared_library` | `//base/hiviewdfx/hiappevent/test/processor:test_processor` | [base/hiviewdfx/hiappevent/test/processor/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/processor/BUILD.gn) | 15 |
| test | `ohos_js_unittest` | `//base/hiviewdfx/hiappevent/test/unittest/common/napi:HiAppEventJsTest` | [base/hiviewdfx/hiappevent/test/unittest/common/napi/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/unittest/common/napi/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hiappevent/test/unittest/common/napi:unittest` | [base/hiviewdfx/hiappevent/test/unittest/common/napi/BUILD.gn](../../../../../../base/hiviewdfx/hiappevent/test/unittest/common/napi/BUILD.gn) | 25 |

## 扫描限制

- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。
- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。
- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。
