# intelligent_voice_framework：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `ai` |
| component | `intelligent_voice_framework` |
| Git 子仓 | `foundation/ai/intelligent_voice_framework` |
| bundle | [foundation/ai/intelligent_voice_framework/bundle.json](../../../../../../foundation/ai/intelligent_voice_framework/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 27 |
| third-party dependencies | 0 |
| declared sub_component | 12 |
| inner kits | 2 |
| declared test entries | 1 |

## 依赖

组件依赖：`ability_base`, `ability_runtime`, `access_token`, `c_utils`, `common_event_service`, `data_share`, `drivers_interface_intelligent_voice`, `hdf_core`, `hilog`, `image_framework`, `ipc`, `kv_store`, `audio_framework`, `napi`, `relational_store`, `safwk`, `samgr`, `state_registry`, `core_service`, `call_manager`, `huks`, `jsoncpp`, `power_manager`, `window_manager`, `ffrt`, `runtime_core`, `eventhandler`

三方依赖：无声明

## 声明构建入口

- `//foundation/ai/intelligent_voice_framework/services/intell_voice_service:intell_voice_server`
- `//foundation/ai/intelligent_voice_framework/services/intell_voice_trigger:intelligentvoice_trigger`
- `//foundation/ai/intelligent_voice_framework/services/intell_voice_engine:intelligentvoice_engine`
- `//foundation/ai/intelligent_voice_framework/services:intell_voice_proxy`
- `//foundation/ai/intelligent_voice_framework/services/etc:intell_voice_service.rc`
- `//foundation/ai/intelligent_voice_framework/frameworks/js:intelligentvoice`
- `//foundation/ai/intelligent_voice_framework/frameworks/js:intelligentvoice_js`
- `//foundation/ai/intelligent_voice_framework/frameworks/native:intellvoice_native`
- `//foundation/ai/intelligent_voice_framework/sa_profile:intell_voice_service_sa_profile`
- `//foundation/ai/intelligent_voice_framework/utils:intell_voice_utils`
- `//foundation/ai/intelligent_voice_framework/frameworks/taihe:intelligent_voice_framework_taihe`
- `//foundation/ai/intelligent_voice_framework/frameworks/taihe:intelligent_voice_framework_taihe_gen_only`

## 声明测试入口

- `//foundation/ai/intelligent_voice_framework/tests:intell_voice_fuzz_test`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 16 |
| test | 15 |
| build-support | 1 |
| aggregate-codegen | 5 |
| total | 37 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_sa_profile` | `//foundation/ai/intelligent_voice_framework/sa_profile:intell_voice_service_sa_profile` | [foundation/ai/intelligent_voice_framework/sa_profile/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/sa_profile/BUILD.gn) | 16 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/ai/intelligent_voice_framework/frameworks/taihe:copy_intellVoice_taihe` | [foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn) | 22 |
| production | `ohos_taihe` | `//foundation/ai/intelligent_voice_framework/frameworks/taihe:run_taihe` | [foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn) | 29 |
| production | `taihe_shared_library` | `//foundation/ai/intelligent_voice_framework/frameworks/taihe:intellVoice_taihe` | [foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn) | 38 |
| aggregate-codegen | `generate_static_abc` | `//foundation/ai/intelligent_voice_framework/frameworks/taihe:intelligent_voice_framework_taihe_abc` | [foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn) | 93 |
| production | `ohos_prebuilt_etc` | `//foundation/ai/intelligent_voice_framework/frameworks/taihe:intelligent_voice_framework_etc` | [foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn) | 101 |
| aggregate-codegen | `group` | `//foundation/ai/intelligent_voice_framework/frameworks/taihe:intelligent_voice_framework_taihe` | [foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn) | 111 |
| aggregate-codegen | `group` | `//foundation/ai/intelligent_voice_framework/frameworks/taihe:intelligent_voice_framework_taihe_gen_only` | [foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/taihe/BUILD.gn) | 118 |
| build-support | `config` | `//foundation/ai/intelligent_voice_framework/frameworks/native:intellvoice_native_config` | [foundation/ai/intelligent_voice_framework/frameworks/native/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/native/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/frameworks/native:intellvoice_native` | [foundation/ai/intelligent_voice_framework/frameworks/native/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/native/BUILD.gn) | 25 |
| production | `js_declaration` | `//foundation/ai/intelligent_voice_framework/frameworks/js:intelligentvoice_js` | [foundation/ai/intelligent_voice_framework/frameworks/js/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/js/BUILD.gn) | 17 |
| aggregate-codegen | `ohos_copy` | `//foundation/ai/intelligent_voice_framework/frameworks/js:intelligentvoice_declaration` | [foundation/ai/intelligent_voice_framework/frameworks/js/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/js/BUILD.gn) | 22 |
| production | `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/frameworks/js:intelligentvoice` | [foundation/ai/intelligent_voice_framework/frameworks/js/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/frameworks/js/BUILD.gn) | 29 |
| production | `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/utils:intell_voice_utils` | [foundation/ai/intelligent_voice_framework/utils/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/utils/BUILD.gn) | 17 |
| production | `ohos_source_set` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_service:server_source` | [foundation/ai/intelligent_voice_framework/services/intell_voice_service/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_service/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_service:intell_voice_server` | [foundation/ai/intelligent_voice_framework/services/intell_voice_service/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_service/BUILD.gn) | 103 |
| test | `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_service:intell_voice_server_test` | [foundation/ai/intelligent_voice_framework/services/intell_voice_service/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_service/BUILD.gn) | 123 |
| production | `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/services:intell_voice_proxy` | [foundation/ai/intelligent_voice_framework/services/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/ai/intelligent_voice_framework/services/etc:intell_voice_service.rc` | [foundation/ai/intelligent_voice_framework/services/etc/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/etc/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_engine:engine_source` | [foundation/ai/intelligent_voice_framework/services/intell_voice_engine/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_engine/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_engine:intelligentvoice_engine` | [foundation/ai/intelligent_voice_framework/services/intell_voice_engine/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_engine/BUILD.gn) | 193 |
| test | `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_engine:intelligentvoice_engine_test` | [foundation/ai/intelligent_voice_framework/services/intell_voice_engine/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_engine/BUILD.gn) | 214 |
| test | `ohos_unittest` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_engine/test/unittest:intell_voice_manager_test` | [foundation/ai/intelligent_voice_framework/services/intell_voice_engine/test/unittest/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_engine/test/unittest/BUILD.gn) | 20 |
| production | `ohos_source_set` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_trigger:trigger_source` | [foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_trigger:intelligentvoice_trigger` | [foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/BUILD.gn) | 119 |
| test | `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_trigger:intelligentvoice_trigger_test` | [foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/BUILD.gn) | 141 |
| test | `ohos_unittest` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/test/unittest:intelligent_voice_trigger_unit_test` | [foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/test/unittest/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/test/unittest/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/test/unittest:trigger_manager_test` | [foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/test/unittest/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_trigger/test/unittest/BUILD.gn) | 72 |
| test | `ohos_fuzztest` | `//foundation/ai/intelligent_voice_framework/tests/fuzztest/intellvoicemanager_fuzzer:IntellVoiceManagerFuzzTest` | [foundation/ai/intelligent_voice_framework/tests/fuzztest/intellvoicemanager_fuzzer/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/tests/fuzztest/intellvoicemanager_fuzzer/BUILD.gn) | 19 |
| test | `ohos_fuzztest` | `//foundation/ai/intelligent_voice_framework/tests/fuzztest/servicemanager_fuzzer:ServiceManagerFuzzTest` | [foundation/ai/intelligent_voice_framework/tests/fuzztest/servicemanager_fuzzer/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/tests/fuzztest/servicemanager_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/ai/intelligent_voice_framework/tests/fuzztest/intellvoice_fuzzer:IntellvoiceFuzzTest` | [foundation/ai/intelligent_voice_framework/tests/fuzztest/intellvoice_fuzzer/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/tests/fuzztest/intellvoice_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ai/intelligent_voice_framework/tests:intell_voice_unit_test` | [foundation/ai/intelligent_voice_framework/tests/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/tests/BUILD.gn) | 14 |
| test | `group` | `//foundation/ai/intelligent_voice_framework/tests:intell_voice_fuzz_test` | [foundation/ai/intelligent_voice_framework/tests/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/tests/BUILD.gn) | 23 |
| test | `ohos_unittest` | `//foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test:client_unit_test` | [foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test:trigger_unit_test` | [foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test/BUILD.gn) | 64 |
| test | `ohos_unittest` | `//foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test:trigger_manager_test` | [foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test/BUILD.gn) | 109 |
| test | `ohos_unittest` | `//foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test:update_engine_test` | [foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/tests/unittest/intell_voice_test/BUILD.gn) | 156 |

## 查询命令

```bash
awk -F '\t' '$1 == "ai" && $2 == "intelligent_voice_framework"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
