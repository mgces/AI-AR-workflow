# hitrace 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。

[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `hiviewdfx` |
| component | `hitrace` |
| repository | `base/hiviewdfx/hitrace` |
| bundle | [base/hiviewdfx/hitrace/bundle.json](../../../../../../base/hiviewdfx/hitrace/bundle.json) |
| rk3568 | 已选入 |

## 声明构建和测试入口

- 生产入口：`//base/hiviewdfx/hitrace:hitrace_all_target`
- 测试入口：`//base/hiviewdfx/hitrace/test:hitrace_systemtest`、`//base/hiviewdfx/hitrace/test:hitrace_unittest`、`//base/hiviewdfx/hitrace/test:hitrace_fuzztest`

## 目标分类统计

| 分类 | 数量 |
| --- | ---: |
| production | 30 |
| test | 33 |
| build-support | 9 |
| aggregate-codegen | 9 |
| total | 81 |

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//base/hiviewdfx/hitrace:hitrace_all_target` | [base/hiviewdfx/hitrace/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/BUILD.gn) | 17 |
| production | `ohos_executable` | `//base/hiviewdfx/hitrace/cmd:hitrace` | [base/hiviewdfx/hitrace/cmd/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/cmd/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hitrace/cmd:hitrace_target` | [base/hiviewdfx/hitrace/cmd/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/cmd/BUILD.gn) | 78 |
| build-support | `config` | `//base/hiviewdfx/hitrace/common/build:coverage_flags` | [base/hiviewdfx/hitrace/common/build/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/common/build/BUILD.gn) | 18 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hitrace/config:hitrace_tags` | [base/hiviewdfx/hitrace/config/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/config/BUILD.gn) | 16 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hitrace/config:hitrace.cfg` | [base/hiviewdfx/hitrace/config/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/config/BUILD.gn) | 23 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hitrace/config:hitrace_ext.cfg` | [base/hiviewdfx/hitrace/config/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/config/BUILD.gn) | 30 |
| test | `ohos_executable` | `//base/hiviewdfx/hitrace/example:hitrace_example` | [base/hiviewdfx/hitrace/example/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/example/BUILD.gn) | 17 |
| test | `ohos_rust_executable` | `//base/hiviewdfx/hitrace/example:hitrace_example_rust` | [base/hiviewdfx/hitrace/example/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/example/BUILD.gn) | 31 |
| test | `group` | `//base/hiviewdfx/hitrace/example:hitrace_example_target` | [base/hiviewdfx/hitrace/example/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/example/BUILD.gn) | 42 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/frameworks/hitrace_ndk:hitrace_ndk` | [base/hiviewdfx/hitrace/frameworks/hitrace_ndk/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/frameworks/hitrace_ndk/BUILD.gn) | 17 |
| production | `ohos_source_set` | `//base/hiviewdfx/hitrace/frameworks/native:hitracechain_source` | [base/hiviewdfx/hitrace/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/frameworks/native/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/frameworks/native/c_wrapper:hitracechain_c_wrapper` | [base/hiviewdfx/hitrace/frameworks/native/c_wrapper/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/frameworks/native/c_wrapper/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//base/hiviewdfx/hitrace/frameworks/trace_factory:trace_source_factory` | [base/hiviewdfx/hitrace/frameworks/trace_factory/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/frameworks/trace_factory/BUILD.gn) | 17 |
| production | `ohos_static_library` | `//base/hiviewdfx/hitrace/frameworks/tracedump_executor:tracedump_executor` | [base/hiviewdfx/hitrace/frameworks/tracedump_executor/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/frameworks/tracedump_executor/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hitrace/interfaces/cj/kits:hitrace_ffi` | [base/hiviewdfx/hitrace/interfaces/cj/kits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/cj/kits/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/cj/kits/ffi:cj_hitracechain_ffi` | [base/hiviewdfx/hitrace/interfaces/cj/kits/ffi/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/cj/kits/ffi/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/cj/kits/ffi:cj_hitracemeter_ffi` | [base/hiviewdfx/hitrace/interfaces/cj/kits/ffi/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/cj/kits/ffi/BUILD.gn) | 42 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hitrace/interfaces/ets/ani:ani_hitracemeter_package` | [base/hiviewdfx/hitrace/interfaces/ets/ani/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/ets/ani/BUILD.gn) | 16 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hitrace/interfaces/ets/ani:ani_hitracechain_package` | [base/hiviewdfx/hitrace/interfaces/ets/ani/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/ets/ani/BUILD.gn) | 26 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/ets/ani/hitracechain:hitrace_chain_ani` | [base/hiviewdfx/hitrace/interfaces/ets/ani/hitracechain/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/ets/ani/hitracechain/BUILD.gn) | 18 |
| aggregate-codegen | `generate_static_abc` | `//base/hiviewdfx/hitrace/interfaces/ets/ani/hitracechain:hitrace_chain` | [base/hiviewdfx/hitrace/interfaces/ets/ani/hitracechain/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/ets/ani/hitracechain/BUILD.gn) | 47 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hitrace/interfaces/ets/ani/hitracechain:hitrace_chain_etc` | [base/hiviewdfx/hitrace/interfaces/ets/ani/hitracechain/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/ets/ani/hitracechain/BUILD.gn) | 54 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/ets/ani/hitracemeter:hitrace_meter_ani` | [base/hiviewdfx/hitrace/interfaces/ets/ani/hitracemeter/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/ets/ani/hitracemeter/BUILD.gn) | 18 |
| aggregate-codegen | `generate_static_abc` | `//base/hiviewdfx/hitrace/interfaces/ets/ani/hitracemeter:hitrace_meter` | [base/hiviewdfx/hitrace/interfaces/ets/ani/hitracemeter/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/ets/ani/hitracemeter/BUILD.gn) | 39 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hitrace/interfaces/ets/ani/hitracemeter:hitrace_meter_etc` | [base/hiviewdfx/hitrace/interfaces/ets/ani/hitracemeter/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/ets/ani/hitracemeter/BUILD.gn) | 46 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hitrace/interfaces/js/kits:hitrace_napi` | [base/hiviewdfx/hitrace/interfaces/js/kits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/js/kits/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/js/kits/napi:hitracechain_napi` | [base/hiviewdfx/hitrace/interfaces/js/kits/napi/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/js/kits/napi/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/js/kits/napi:hitracemeter_napi` | [base/hiviewdfx/hitrace/interfaces/js/kits/napi/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/js/kits/napi/BUILD.gn) | 47 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/js/kits/napi/bytrace_napi:bytrace` | [base/hiviewdfx/hitrace/interfaces/js/kits/napi/bytrace_napi/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/js/kits/napi/bytrace_napi/BUILD.gn) | 17 |
| build-support | `config` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:libhitrace_pub_config` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:libhitracechain` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 26 |
| build-support | `config` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:hitrace_meter_config` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 60 |
| production | `ohos_static_library` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:hitrace_inner` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 68 |
| build-support | `config` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:hitrace_dump_config` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 112 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:hitrace_dump` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 120 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:hitrace_meter` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 173 |
| build-support | `config` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:libhitrace_option_config` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 215 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:libhitrace_option` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 225 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:hitrace.para` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 256 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:hitrace.para.dac` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 267 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hitrace/interfaces/native/innerkits:hitrace_etc` | [base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/native/innerkits/BUILD.gn) | 278 |
| production | `ohos_rust_shared_library` | `//base/hiviewdfx/hitrace/interfaces/rust/innerkits/hitrace_meter:hitrace_meter_rust` | [base/hiviewdfx/hitrace/interfaces/rust/innerkits/hitrace_meter/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/rust/innerkits/hitrace_meter/BUILD.gn) | 17 |
| production | `ohos_rust_shared_library` | `//base/hiviewdfx/hitrace/interfaces/rust/innerkits/hitracechain:hitracechain_rust` | [base/hiviewdfx/hitrace/interfaces/rust/innerkits/hitracechain/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/interfaces/rust/innerkits/hitracechain/BUILD.gn) | 17 |
| test | `group` | `//base/hiviewdfx/hitrace/test:hitrace_systemtest` | [base/hiviewdfx/hitrace/test/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hitrace/test:hitrace_unittest` | [base/hiviewdfx/hitrace/test/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/BUILD.gn) | 23 |
| test | `group` | `//base/hiviewdfx/hitrace/test:hitrace_fuzztest` | [base/hiviewdfx/hitrace/test/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/BUILD.gn) | 52 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hitrace/test/fuzztest:HitraceCmdFuzzTest` | [base/hiviewdfx/hitrace/test/fuzztest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/fuzztest/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hitrace/test/fuzztest:HitraceDumpFuzzTest` | [base/hiviewdfx/hitrace/test/fuzztest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/fuzztest/BUILD.gn) | 38 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hitrace/test/fuzztest:HitraceMeterFuzzTest` | [base/hiviewdfx/hitrace/test/fuzztest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/fuzztest/BUILD.gn) | 59 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hitrace/test/fuzztest:HitraceOptionFuzzTest` | [base/hiviewdfx/hitrace/test/fuzztest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/fuzztest/BUILD.gn) | 84 |
| test | `ohos_systemtest` | `//base/hiviewdfx/hitrace/test/systemtest:HitraceSystemTest` | [base/hiviewdfx/hitrace/test/systemtest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/systemtest/BUILD.gn) | 20 |
| build-support | `config` | `//base/hiviewdfx/hitrace/test/unittest:module_private_config` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceCTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 32 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceCppTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 65 |
| build-support | `config` | `//base/hiviewdfx/hitrace/test/unittest:HitraceMeterTest_config` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 98 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceMeterTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 110 |
| build-support | `config` | `//base/hiviewdfx/hitrace/test/unittest:HitraceMeterNDKTest_config` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 147 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceMeterNDKTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 161 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceDumpTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 200 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceAsyncReadTimeoutTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 300 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceAsyncWriteTimeoutTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 322 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceUtilsTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 344 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceEventTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 383 |
| build-support | `config` | `//base/hiviewdfx/hitrace/test/unittest:HitraceMeterFfiTest_config` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 413 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceMeterFfiTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 426 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceOptionTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 465 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceCMDTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 501 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceAgeingTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 558 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceChainNDKTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 592 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceFactoryTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 611 |
| test | `ohos_unittest` | `//base/hiviewdfx/hitrace/test/unittest:HitraceDumpExecutorNewTest` | [base/hiviewdfx/hitrace/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/BUILD.gn) | 644 |
| test | `ohos_js_unittest` | `//base/hiviewdfx/hitrace/test/unittest/common/napi:HiTraceChainJsTest` | [base/hiviewdfx/hitrace/test/unittest/common/napi/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/common/napi/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hitrace/test/unittest/common/napi:unittest` | [base/hiviewdfx/hitrace/test/unittest/common/napi/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/common/napi/BUILD.gn) | 27 |
| test | `ohos_rust_unittest` | `//base/hiviewdfx/hitrace/test/unittest/rust/hitrace_meter:rust_meter_test` | [base/hiviewdfx/hitrace/test/unittest/rust/hitrace_meter/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/rust/hitrace_meter/BUILD.gn) | 19 |
| test | `ohos_static_library` | `//base/hiviewdfx/hitrace/test/unittest/rust/hitrace_meter/c:hitrace_meter_rust_test` | [base/hiviewdfx/hitrace/test/unittest/rust/hitrace_meter/c/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/rust/hitrace_meter/c/BUILD.gn) | 16 |
| test | `ohos_rust_unittest` | `//base/hiviewdfx/hitrace/test/unittest/rust/hitracechain:rust_hitracechain_test` | [base/hiviewdfx/hitrace/test/unittest/rust/hitracechain/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/unittest/rust/hitracechain/BUILD.gn) | 19 |
| test | `ohos_static_library` | `//base/hiviewdfx/hitrace/test/utils:hitrace_test_utils` | [base/hiviewdfx/hitrace/test/utils/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/test/utils/BUILD.gn) | 18 |
| production | `ohos_source_set` | `//base/hiviewdfx/hitrace/utils:hitrace_common_utils` | [base/hiviewdfx/hitrace/utils/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/utils/BUILD.gn) | 17 |
| production | `ohos_source_set` | `//base/hiviewdfx/hitrace/utils:hitrace_file_utils` | [base/hiviewdfx/hitrace/utils/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/utils/BUILD.gn) | 37 |
| production | `ohos_source_set` | `//base/hiviewdfx/hitrace/utils:hitrace_json_parser` | [base/hiviewdfx/hitrace/utils/BUILD.gn](../../../../../../base/hiviewdfx/hitrace/utils/BUILD.gn) | 56 |

## 扫描限制

- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。
- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。
- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。
