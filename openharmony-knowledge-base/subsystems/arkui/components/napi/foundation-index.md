# napi：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `arkui` |
| component | `napi` |
| Git 子仓 | `foundation/arkui/napi` |
| bundle | [foundation/arkui/napi/bundle.json](../../../../../../foundation/arkui/napi/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 17 |
| third-party dependencies | 1 |
| declared sub_component | 0 |
| inner kits | 8 |
| declared test entries | 5 |

## 依赖

组件依赖：`c_utils`, `ets_runtime`, `eventhandler`, `faultloggerd`, `hilog`, `hitrace`, `hiview`, `icu`, `libuv`, `node`, `ffrt`, `bounds_checking_function`, `init`, `runtime_core`, `ace_engine`, `resource_schedule_service`, `samgr`

三方依赖：`jerryscript`

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/arkui/napi:napi_packages_test`
- `//foundation/arkui/napi/module_manager/test/unittest/module_manager_test:unittest`
- `//foundation/arkui/napi/sample/native_module_systemtest:systemtest`
- `//foundation/arkui/napi/test/unittest:unittest`
- `//foundation/arkui/napi/test/fuzztest:fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 92 |
| test | 34 |
| build-support | 9 |
| aggregate-codegen | 4 |
| total | 139 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/arkui/napi:ace_napi_config` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/arkui/napi:data_protector_config` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 100 |
| build-support | `config` | `//foundation/arkui/napi:module_manager_config` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 105 |
| production | `ohos_source_set` | `//foundation/arkui/napi:pac_data_protector_feature` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 109 |
| production | `ohos_source_set` | `//foundation/arkui/napi:ace_napi_static` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 120 |
| production | `ohos_static_library` | `//foundation/arkui/napi:ace_napi` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 238 |
| production | `ohos_shared_library` | `//foundation/arkui/napi:ace_napi` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 245 |
| test | `ohos_static_library` | `//foundation/arkui/napi:ace_napi_test` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 300 |
| test | `ohos_shared_library` | `//foundation/arkui/napi:ace_napi_test` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 307 |
| build-support | `config` | `//foundation/arkui/napi:ffi_bind_native_config` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 360 |
| production | `ohos_shared_library` | `//foundation/arkui/napi:cj_bind_native` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 365 |
| production | `ohos_source_set` | `//foundation/arkui/napi:cj_bind_ffi_source` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 392 |
| build-support | `config` | `//foundation/arkui/napi:ffi_bind_ffi_public_config` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 412 |
| aggregate-codegen | `group` | `//foundation/arkui/napi:cj_ffi_libraries` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 421 |
| production | `ohos_shared_library` | `//foundation/arkui/napi:cj_bind_ffi` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 425 |
| aggregate-codegen | `group` | `//foundation/arkui/napi:napi_packages` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 449 |
| test | `group` | `//foundation/arkui/napi:napi_packages_test` | [foundation/arkui/napi/BUILD.gn](../../../../../../foundation/arkui/napi/BUILD.gn) | 462 |
| test | `ohos_unittest` | `//foundation/arkui/napi/module_manager/test/unittest/module_manager_test:module_manager_test` | [foundation/arkui/napi/module_manager/test/unittest/module_manager_test/BUILD.gn](../../../../../../foundation/arkui/napi/module_manager/test/unittest/module_manager_test/BUILD.gn) | 17 |
| test | `group` | `//foundation/arkui/napi/module_manager/test/unittest/module_manager_test:unittest` | [foundation/arkui/napi/module_manager/test/unittest/module_manager_test/BUILD.gn](../../../../../../foundation/arkui/napi/module_manager/test/unittest/module_manager_test/BUILD.gn) | 45 |
| build-support | `config` | `//foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop:ark_interop_config` | [foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop/BUILD.gn](../../../../../../foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop/BUILD.gn) | 26 |
| production | `ohos_source_set` | `//foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop:cj_envsetup` | [foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop/BUILD.gn](../../../../../../foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop/BUILD.gn) | 52 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop:ark_interop` | [foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop/BUILD.gn](../../../../../../foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop/BUILD.gn) | 60 |
| build-support | `config` | `//foundation/arkui/napi/interfaces/inner_api/cjffi/cj_backtrace:cj_backtrace_public_config` | [foundation/arkui/napi/interfaces/inner_api/cjffi/cj_backtrace/BUILD.gn](../../../../../../foundation/arkui/napi/interfaces/inner_api/cjffi/cj_backtrace/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/interfaces/inner_api/cjffi/cj_backtrace:cj_backtrace` | [foundation/arkui/napi/interfaces/inner_api/cjffi/cj_backtrace/BUILD.gn](../../../../../../foundation/arkui/napi/interfaces/inner_api/cjffi/cj_backtrace/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/arkui/napi/test/fuzztest/loadarkmodule_fuzzer:LoadArkModuleFuzzTest` | [foundation/arkui/napi/test/fuzztest/loadarkmodule_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/loadarkmodule_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/arkui/napi/test/fuzztest/loadarkmodule_fuzzer:fuzztest` | [foundation/arkui/napi/test/fuzztest/loadarkmodule_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/loadarkmodule_fuzzer/BUILD.gn) | 39 |
| test | `ohos_fuzztest` | `//foundation/arkui/napi/test/fuzztest/runscriptbuffer_fuzzer:RunScriptBufferFuzzTest` | [foundation/arkui/napi/test/fuzztest/runscriptbuffer_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/runscriptbuffer_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/arkui/napi/test/fuzztest/runscriptbuffer_fuzzer:fuzztest` | [foundation/arkui/napi/test/fuzztest/runscriptbuffer_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/runscriptbuffer_fuzzer/BUILD.gn) | 39 |
| test | `group` | `//foundation/arkui/napi/test/fuzztest:fuzztest` | [foundation/arkui/napi/test/fuzztest/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/arkui/napi/test/fuzztest/runactor_fuzzer:RunActorFuzzTest` | [foundation/arkui/napi/test/fuzztest/runactor_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/runactor_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/arkui/napi/test/fuzztest/runactor_fuzzer:fuzztest` | [foundation/arkui/napi/test/fuzztest/runactor_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/runactor_fuzzer/BUILD.gn) | 39 |
| test | `ohos_fuzztest` | `//foundation/arkui/napi/test/fuzztest/runscriptpath_fuzzer:RunScriptPathFuzzTest` | [foundation/arkui/napi/test/fuzztest/runscriptpath_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/runscriptpath_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/arkui/napi/test/fuzztest/runscriptpath_fuzzer:fuzztest` | [foundation/arkui/napi/test/fuzztest/runscriptpath_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/runscriptpath_fuzzer/BUILD.gn) | 39 |
| test | `ohos_fuzztest` | `//foundation/arkui/napi/test/fuzztest/runbufferscript_fuzzer:RunBufferScriptFuzzTest` | [foundation/arkui/napi/test/fuzztest/runbufferscript_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/runbufferscript_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/arkui/napi/test/fuzztest/runbufferscript_fuzzer:fuzztest` | [foundation/arkui/napi/test/fuzztest/runbufferscript_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/runbufferscript_fuzzer/BUILD.gn) | 39 |
| test | `ohos_fuzztest` | `//foundation/arkui/napi/test/fuzztest/executejsbin_fuzzer:ExecuteJsBinFuzzTest` | [foundation/arkui/napi/test/fuzztest/executejsbin_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/executejsbin_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/arkui/napi/test/fuzztest/executejsbin_fuzzer:fuzztest` | [foundation/arkui/napi/test/fuzztest/executejsbin_fuzzer/BUILD.gn](../../../../../../foundation/arkui/napi/test/fuzztest/executejsbin_fuzzer/BUILD.gn) | 39 |
| test | `ohos_unittest` | `//foundation/arkui/napi/test/unittest/cj_native:test_ark_interop` | [foundation/arkui/napi/test/unittest/cj_native/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/cj_native/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//foundation/arkui/napi/test/unittest/cj_native:test_ffi_data` | [foundation/arkui/napi/test/unittest/cj_native/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/cj_native/BUILD.gn) | 54 |
| test | `ohos_unittest` | `//foundation/arkui/napi/test/unittest/cj_native:test_cj_backtrace` | [foundation/arkui/napi/test/unittest/cj_native/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/cj_native/BUILD.gn) | 84 |
| test | `group` | `//foundation/arkui/napi/test/unittest/cj_native:cj_native_unittest` | [foundation/arkui/napi/test/unittest/cj_native/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/cj_native/BUILD.gn) | 100 |
| build-support | `config` | `//foundation/arkui/napi/test/unittest:ace_napi_unittest_config` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 20 |
| build-support | `template` | `//foundation/arkui/napi/test/unittest:test_ark_unittest` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 29 |
| test | `ohos_unittest` | `//foundation/arkui/napi/test/unittest:test_ark_unittest_${target_name}` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 33 |
| test | `test_ark_unittest` | `//foundation/arkui/napi/test/unittest:base` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 53 |
| test | `test_ark_unittest` | `//foundation/arkui/napi/test/unittest:hybrid` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 62 |
| test | `test_ark_unittest` | `//foundation/arkui/napi/test/unittest:idle_monitor` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 66 |
| test | `test_ark_unittest` | `//foundation/arkui/napi/test/unittest:threadsafe` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 70 |
| test | `ohos_unittest` | `//foundation/arkui/napi/test/unittest:test_unittest_sendevent` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 74 |
| test | `ohos_unittest` | `//foundation/arkui/napi/test/unittest:test_worker_manager` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 96 |
| test | `test_ark_unittest` | `//foundation/arkui/napi/test/unittest:errorcode` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 114 |
| test | `test_ark_unittest` | `//foundation/arkui/napi/test/unittest:critical` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 121 |
| test | `group` | `//foundation/arkui/napi/test/unittest:unittest` | [foundation/arkui/napi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/napi/test/unittest/BUILD.gn) | 125 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_array_ops:array_ops` | [foundation/arkui/napi/sample/native_module_array_ops/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_array_ops/BUILD.gn) | 16 |
| production | `target` | `//foundation/arkui/napi/sample/native_module_data:native_module_data` | [foundation/arkui/napi/sample/native_module_data/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_data/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_crypto_suite:crypto_suite` | [foundation/arkui/napi/sample/native_module_crypto_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_crypto_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_kvstore:kvstore` | [foundation/arkui/napi/sample/native_module_kvstore/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_kvstore/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_strong_ref_suite:strong_ref_suite` | [foundation/arkui/napi/sample/native_module_strong_ref_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_strong_ref_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_string_utils:stringutils` | [foundation/arkui/napi/sample/native_module_string_utils/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_string_utils/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_console:console` | [foundation/arkui/napi/sample/native_module_console/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_console/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_object_ops_suite:object_ops_suite` | [foundation/arkui/napi/sample/native_module_object_ops_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_object_ops_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_clamp_suite:clamp_suite` | [foundation/arkui/napi/sample/native_module_clamp_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_clamp_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_string_ops_suite:string_ops_suite` | [foundation/arkui/napi/sample/native_module_string_ops_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_string_ops_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_callback_suite:callback_suite` | [foundation/arkui/napi/sample/native_module_callback_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_callback_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_global_suite:global_suite` | [foundation/arkui/napi/sample/native_module_global_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_global_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_reference_suite:reference_suite` | [foundation/arkui/napi/sample/native_module_reference_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_reference_suite/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_systemtest:systemtestnapi` | [foundation/arkui/napi/sample/native_module_systemtest/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_systemtest/BUILD.gn) | 14 |
| test | `group` | `//foundation/arkui/napi/sample/native_module_systemtest:systemtest` | [foundation/arkui/napi/sample/native_module_systemtest/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_systemtest/BUILD.gn) | 55 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_type_tag_suite:type_tag_suite` | [foundation/arkui/napi/sample/native_module_type_tag_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_type_tag_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_string_ops:string_ops` | [foundation/arkui/napi/sample/native_module_string_ops/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_string_ops/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_bigint:bigint` | [foundation/arkui/napi/sample/native_module_bigint/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_bigint/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_file:napi_file` | [foundation/arkui/napi/sample/native_module_file/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_file/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_queue:queue` | [foundation/arkui/napi/sample/native_module_queue/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_queue/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_number:napi_number` | [foundation/arkui/napi/sample/native_module_number/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_number/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_buffer:buffer` | [foundation/arkui/napi/sample/native_module_buffer/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_buffer/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_convert_suite:convert_suite` | [foundation/arkui/napi/sample/native_module_convert_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_convert_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_crypto_ops:encoding` | [foundation/arkui/napi/sample/native_module_crypto_ops/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_crypto_ops/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_timer:timer` | [foundation/arkui/napi/sample/native_module_timer/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_timer/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_timer:timer_utils` | [foundation/arkui/napi/sample/native_module_timer/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_timer/BUILD.gn) | 36 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_wrap_suite:wrap_suite` | [foundation/arkui/napi/sample/native_module_wrap_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_wrap_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_promise_suite:promise_suite` | [foundation/arkui/napi/sample/native_module_promise_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_promise_suite/BUILD.gn) | 16 |
| production | `target` | `//foundation/arkui/napi/sample/native_module_compression:native_module_compression` | [foundation/arkui/napi/sample/native_module_compression/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_compression/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_json:json` | [foundation/arkui/napi/sample/native_module_json/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_json/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_property_suite:property_suite` | [foundation/arkui/napi/sample/native_module_property_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_property_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_string_encode_suite:string_encode_suite` | [foundation/arkui/napi/sample/native_module_string_encode_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_string_encode_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_boolean_suite:boolean_suite` | [foundation/arkui/napi/sample/native_module_boolean_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_boolean_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_date:napi_date` | [foundation/arkui/napi/sample/native_module_date/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_date/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_demo:demo` | [foundation/arkui/napi/sample/native_module_demo/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_demo/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_obj_props_suite:obj_props_suite` | [foundation/arkui/napi/sample/native_module_obj_props_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_obj_props_suite/BUILD.gn) | 16 |
| production | `napi_module` | `//foundation/arkui/napi/sample/native_module_calculator:calculator` | [foundation/arkui/napi/sample/native_module_calculator/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_calculator/BUILD.gn) | 16 |
| production | `napi_module` | `//foundation/arkui/napi/sample/native_module_advanced_examples/threadsafe_async:threadsafe_async` | [foundation/arkui/napi/sample/native_module_advanced_examples/threadsafe_async/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_advanced_examples/threadsafe_async/BUILD.gn) | 16 |
| production | `napi_module` | `//foundation/arkui/napi/sample/native_module_advanced_examples/event_notification:event_notification` | [foundation/arkui/napi/sample/native_module_advanced_examples/event_notification/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_advanced_examples/event_notification/BUILD.gn) | 16 |
| production | `napi_module` | `//foundation/arkui/napi/sample/native_module_advanced_examples/memory_management:memory_management` | [foundation/arkui/napi/sample/native_module_advanced_examples/memory_management/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_advanced_examples/memory_management/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_crypto_utils:crypto_utils` | [foundation/arkui/napi/sample/native_module_crypto_utils/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_crypto_utils/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_error:error` | [foundation/arkui/napi/sample/native_module_error/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_error/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_math:math` | [foundation/arkui/napi/sample/native_module_math/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_math/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_exception_suite:exception_suite` | [foundation/arkui/napi/sample/native_module_exception_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_exception_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_function:function` | [foundation/arkui/napi/sample/native_module_function/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_function/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_array_suite:array_suite` | [foundation/arkui/napi/sample/native_module_array_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_array_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_callback:callback` | [foundation/arkui/napi/sample/native_module_callback/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_callback/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_value_check_suite:value_check_suite` | [foundation/arkui/napi/sample/native_module_value_check_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_value_check_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_crypto:crypto` | [foundation/arkui/napi/sample/native_module_crypto/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_crypto/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_storage:storage` | [foundation/arkui/napi/sample/native_module_storage/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_storage/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_regex:regex` | [foundation/arkui/napi/sample/native_module_regex/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_regex/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_file_operations:file_operations` | [foundation/arkui/napi/sample/native_module_file_operations/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_file_operations/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_object_suite:object_suite` | [foundation/arkui/napi/sample/native_module_object_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_object_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_reference:reference` | [foundation/arkui/napi/sample/native_module_reference/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_reference/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_string_suite:string_suite` | [foundation/arkui/napi/sample/native_module_string_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_string_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_error_suite:error_suite` | [foundation/arkui/napi/sample/native_module_error_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_error_suite/BUILD.gn) | 16 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/napi/sample/native_module_complex:complex_js` | [foundation/arkui/napi/sample/native_module_complex/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_complex/BUILD.gn) | 19 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_complex:complex` | [foundation/arkui/napi/sample/native_module_complex/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_complex/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_date_utils:date_utils` | [foundation/arkui/napi/sample/native_module_date_utils/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_date_utils/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_network_client:network_client` | [foundation/arkui/napi/sample/native_module_network_client/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_network_client/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_buffer_suite:buffer_suite` | [foundation/arkui/napi/sample/native_module_buffer_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_buffer_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_json_suite:json_suite` | [foundation/arkui/napi/sample/native_module_json_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_json_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_math_suite:math_suite` | [foundation/arkui/napi/sample/native_module_math_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_math_suite/BUILD.gn) | 16 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/napi/sample/native_module_calc:calc_js` | [foundation/arkui/napi/sample/native_module_calc/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_calc/BUILD.gn) | 19 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_calc:calc` | [foundation/arkui/napi/sample/native_module_calc/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_calc/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_calc:number` | [foundation/arkui/napi/sample/native_module_calc/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_calc/BUILD.gn) | 38 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_number_suite:number_suite` | [foundation/arkui/napi/sample/native_module_number_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_number_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_queue_suite:queue_suite` | [foundation/arkui/napi/sample/native_module_queue_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_queue_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_equality_suite:equality_suite` | [foundation/arkui/napi/sample/native_module_equality_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_equality_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_math_ops:math_ops` | [foundation/arkui/napi/sample/native_module_math_ops/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_math_ops/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_array:array` | [foundation/arkui/napi/sample/native_module_array/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_array/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_lifecycle_suite:lifecycle_suite` | [foundation/arkui/napi/sample/native_module_lifecycle_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_lifecycle_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_netserver:netserver` | [foundation/arkui/napi/sample/native_module_netserver/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_netserver/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_define_suite:define_suite` | [foundation/arkui/napi/sample/native_module_define_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_define_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_typedarray_suite:typedarray_suite` | [foundation/arkui/napi/sample/native_module_typedarray_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_typedarray_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_element_suite:element_suite` | [foundation/arkui/napi/sample/native_module_element_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_element_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_string:string` | [foundation/arkui/napi/sample/native_module_string/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_string/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_protect_property:protect_property` | [foundation/arkui/napi/sample/native_module_protect_property/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_protect_property/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_color:color` | [foundation/arkui/napi/sample/native_module_color/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_color/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_image_processor:image_processor` | [foundation/arkui/napi/sample/native_module_image_processor/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_image_processor/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_collection_suite:collection_suite` | [foundation/arkui/napi/sample/native_module_collection_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_collection_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_async_suite:async_suite` | [foundation/arkui/napi/sample/native_module_async_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_async_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_textdecoder:textdecoder` | [foundation/arkui/napi/sample/native_module_textdecoder/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_textdecoder/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_date_suite:date_suite` | [foundation/arkui/napi/sample/native_module_date_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_date_suite/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_map:map` | [foundation/arkui/napi/sample/native_module_map/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_map/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/napi/sample/native_module_scope_suite:scope_suite` | [foundation/arkui/napi/sample/native_module_scope_suite/BUILD.gn](../../../../../../foundation/arkui/napi/sample/native_module_scope_suite/BUILD.gn) | 16 |

## 查询命令

```bash
awk -F '\t' '$1 == "arkui" && $2 == "napi"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
