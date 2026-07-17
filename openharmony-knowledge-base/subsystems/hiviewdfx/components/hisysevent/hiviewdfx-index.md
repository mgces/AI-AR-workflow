# hisysevent 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。

[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `hiviewdfx` |
| component | `hisysevent` |
| repository | `base/hiviewdfx/hisysevent` |
| bundle | [base/hiviewdfx/hisysevent/bundle.json](../../../../../../base/hiviewdfx/hisysevent/bundle.json) |
| rk3568 | 已选入 |

## 声明构建和测试入口

- 生产入口：`//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent:libhisysevent`、`//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager:libhisyseventmanager`、`//base/hiviewdfx/hisysevent/interfaces/js/kits:hisysevent_napi_ref`、`//base/hiviewdfx/hisysevent/interfaces/rust/innerkits:hisysevent_rust`、`//base/hiviewdfx/hisysevent/frameworks/native:hisysevent`、`//base/hiviewdfx/hisysevent/interfaces/ets/ani:ani_hisysevent_package`
- 测试入口：`//base/hiviewdfx/hisysevent/test:moduletest`、`//base/hiviewdfx/hisysevent/test:unittest`、`//base/hiviewdfx/hisysevent/test:fuzztest`

## 目标分类统计

| 分类 | 数量 |
| --- | ---: |
| production | 14 |
| test | 22 |
| build-support | 7 |
| aggregate-codegen | 4 |
| total | 47 |

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//base/hiviewdfx/hisysevent/adapter/native/idl:sys_event_impl_config` | [base/hiviewdfx/hisysevent/adapter/native/idl/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/adapter/native/idl/BUILD.gn) | 16 |
| production | `idl_gen_interface` | `//base/hiviewdfx/hisysevent/adapter/native/idl:sys_event_interface` | [base/hiviewdfx/hisysevent/adapter/native/idl/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/adapter/native/idl/BUILD.gn) | 27 |
| production | `ohos_source_set` | `//base/hiviewdfx/hisysevent/adapter/native/idl:sys_event_impl_client` | [base/hiviewdfx/hisysevent/adapter/native/idl/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/adapter/native/idl/BUILD.gn) | 42 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hisysevent/frameworks/native:hisyseventcat_package` | [base/hiviewdfx/hisysevent/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/BUILD.gn) | 20 |
| production | `ohos_executable` | `//base/hiviewdfx/hisysevent/frameworks/native:hisysevent` | [base/hiviewdfx/hisysevent/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/BUILD.gn) | 25 |
| test | `group` | `//base/hiviewdfx/hisysevent/frameworks/native:unittest` | [base/hiviewdfx/hisysevent/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/BUILD.gn) | 69 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hisysevent/frameworks/native/c_wrapper:hisysevent_c_wrapper` | [base/hiviewdfx/hisysevent/frameworks/native/c_wrapper/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/c_wrapper/BUILD.gn) | 16 |
| test | `group` | `//base/hiviewdfx/hisysevent/frameworks/native/test:unittest` | [base/hiviewdfx/hisysevent/frameworks/native/test/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/test/BUILD.gn) | 14 |
| test | `group` | `//base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common:unittest` | [base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common/BUILD.gn) | 18 |
| build-support | `config` | `//base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common:unittest_config` | [base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common/BUILD.gn) | 26 |
| test | `ohos_unittest` | `//base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common:HiSysEventToolUnitTest` | [base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common/BUILD.gn) | 35 |
| test | `ohos_unittest` | `//base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common:HiSysEventCWrapperTest` | [base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/test/unittest/common/BUILD.gn) | 65 |
| build-support | `config` | `//base/hiviewdfx/hisysevent/frameworks/native/util:hisysevent_util_config` | [base/hiviewdfx/hisysevent/frameworks/native/util/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/util/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hisysevent/frameworks/native/util:hisysevent_util` | [base/hiviewdfx/hisysevent/frameworks/native/util/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/frameworks/native/util/BUILD.gn) | 21 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hisysevent/interfaces/ets/ani:ani_hisysevent_package` | [base/hiviewdfx/hisysevent/interfaces/ets/ani/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/ets/ani/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hisysevent/interfaces/ets/ani/hisysevent:hisysevent_ani` | [base/hiviewdfx/hisysevent/interfaces/ets/ani/hisysevent/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/ets/ani/hisysevent/BUILD.gn) | 17 |
| aggregate-codegen | `generate_static_abc` | `//base/hiviewdfx/hisysevent/interfaces/ets/ani/hisysevent:hisysevent` | [base/hiviewdfx/hisysevent/interfaces/ets/ani/hisysevent/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/ets/ani/hisysevent/BUILD.gn) | 47 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hisysevent/interfaces/ets/ani/hisysevent:hisysevent_etc` | [base/hiviewdfx/hisysevent/interfaces/ets/ani/hisysevent/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/ets/ani/hisysevent/BUILD.gn) | 54 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hisysevent/interfaces/js/kits:hisysevent_napi_ref` | [base/hiviewdfx/hisysevent/interfaces/js/kits/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/js/kits/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hisysevent/interfaces/js/kits/napi:hisysevent_napi` | [base/hiviewdfx/hisysevent/interfaces/js/kits/napi/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/js/kits/napi/BUILD.gn) | 16 |
| build-support | `config` | `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent:hisysevent_config` | [base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent:libhisysevent` | [base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent/BUILD.gn) | 30 |
| production | `ohos_static_library` | `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent:hisysevent_static_lib_for_tdd` | [base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent/BUILD.gn) | 83 |
| build-support | `config` | `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_easy:hisysevent_easy_config` | [base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_easy/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_easy/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_easy:libhisysevent_easy` | [base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_easy/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_easy/BUILD.gn) | 22 |
| build-support | `config` | `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager:hisyseventmanager_config` | [base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager:libhisyseventmanager` | [base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager/BUILD.gn) | 27 |
| production | `ohos_static_library` | `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager:hisyseventmanager_static_lib_for_tdd` | [base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager/BUILD.gn) | 74 |
| production | `ohos_rust_shared_library` | `//base/hiviewdfx/hisysevent/interfaces/rust/innerkits:hisysevent_rust` | [base/hiviewdfx/hisysevent/interfaces/rust/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/interfaces/rust/innerkits/BUILD.gn) | 16 |
| test | `group` | `//base/hiviewdfx/hisysevent/test:moduletest` | [base/hiviewdfx/hisysevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/BUILD.gn) | 15 |
| test | `group` | `//base/hiviewdfx/hisysevent/test:unittest` | [base/hiviewdfx/hisysevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/BUILD.gn) | 22 |
| test | `group` | `//base/hiviewdfx/hisysevent/test:fuzztest` | [base/hiviewdfx/hisysevent/test/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/BUILD.gn) | 37 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hisysevent/test/fuzztest/common/hisysevent_fuzzer:HiSysEventFuzzTest` | [base/hiviewdfx/hisysevent/test/fuzztest/common/hisysevent_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/fuzztest/common/hisysevent_fuzzer/BUILD.gn) | 16 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hisysevent/test/fuzztest/common/hisyseventmanager_fuzzer:HiSysEventManagerFuzzTest` | [base/hiviewdfx/hisysevent/test/fuzztest/common/hisyseventmanager_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/fuzztest/common/hisyseventmanager_fuzzer/BUILD.gn) | 16 |
| build-support | `config` | `//base/hiviewdfx/hisysevent/test/moduletest/common:hisysevent_native_test_config` | [base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn) | 18 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hisysevent/test/moduletest/common:HiSysEventAdapterNativeTest` | [base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn) | 32 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hisysevent/test/moduletest/common:HiSysEventNativeTest` | [base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn) | 64 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hisysevent/test/moduletest/common:HiSysEventCTest` | [base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn) | 91 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hisysevent/test/moduletest/common:HiSysEventManagerCTest` | [base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn) | 109 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hisysevent/test/moduletest/common:HiSysEventDelayTest` | [base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn) | 133 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hisysevent/test/moduletest/common:HiSysEventWroteResultCheckTest` | [base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn) | 160 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hisysevent/test/moduletest/common:HiSysEventEncodedTest` | [base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn) | 191 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hisysevent/test/moduletest/common:HiSysEventEasyTest` | [base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn) | 215 |
| test | `group` | `//base/hiviewdfx/hisysevent/test/moduletest/common:moduletest` | [base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/moduletest/common/BUILD.gn) | 235 |
| test | `ohos_js_unittest` | `//base/hiviewdfx/hisysevent/test/unittest/common/napi:HiSysEventJsTest` | [base/hiviewdfx/hisysevent/test/unittest/common/napi/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/unittest/common/napi/BUILD.gn) | 18 |
| test | `ohos_js_unittest` | `//base/hiviewdfx/hisysevent/test/unittest/common/permission:HiSysEventPermissionJsTest` | [base/hiviewdfx/hisysevent/test/unittest/common/permission/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/unittest/common/permission/BUILD.gn) | 18 |
| test | `ohos_rust_unittest` | `//base/hiviewdfx/hisysevent/test/unittest/rust:rust_hisysevent_test` | [base/hiviewdfx/hisysevent/test/unittest/rust/BUILD.gn](../../../../../../base/hiviewdfx/hisysevent/test/unittest/rust/BUILD.gn) | 18 |

## 扫描限制

- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。
- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。
- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。
