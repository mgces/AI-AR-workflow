# hidumper 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。

[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `hiviewdfx` |
| component | `hidumper` |
| repository | `base/hiviewdfx/hidumper` |
| bundle | [base/hiviewdfx/hidumper/bundle.json](../../../../../../base/hiviewdfx/hidumper/bundle.json) |
| rk3568 | 已选入 |

## 声明构建和测试入口

- 生产入口：`//base/hiviewdfx/hidumper:bin`、`//base/hiviewdfx/hidumper:service`
- 测试入口：`//base/hiviewdfx/hidumper/test:unittest`、`//base/hiviewdfx/hidumper/test:fuzztest`

## 目标分类统计

| 分类 | 数量 |
| --- | ---: |
| production | 24 |
| test | 48 |
| build-support | 13 |
| aggregate-codegen | 2 |
| total | 87 |

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//base/hiviewdfx/hidumper:bin` | [base/hiviewdfx/hidumper/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hidumper:service` | [base/hiviewdfx/hidumper/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/BUILD.gn) | 20 |
| build-support | `config` | `//base/hiviewdfx/hidumper/frameworks/native:hidumper_include` | [base/hiviewdfx/hidumper/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/frameworks/native/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hidumper/frameworks/native:dump_main` | [base/hiviewdfx/hidumper/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/frameworks/native/BUILD.gn) | 28 |
| production | `ohos_source_set` | `//base/hiviewdfx/hidumper/frameworks/native:dump_framework` | [base/hiviewdfx/hidumper/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/frameworks/native/BUILD.gn) | 168 |
| production | `ohos_source_set` | `//base/hiviewdfx/hidumper/frameworks/native:hidumperclient_source` | [base/hiviewdfx/hidumper/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/frameworks/native/BUILD.gn) | 221 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hidumper/frameworks/native:hidumperclient` | [base/hiviewdfx/hidumper/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/frameworks/native/BUILD.gn) | 253 |
| production | `ohos_executable` | `//base/hiviewdfx/hidumper/frameworks/native:hidumper` | [base/hiviewdfx/hidumper/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/frameworks/native/BUILD.gn) | 262 |
| build-support | `config` | `//base/hiviewdfx/hidumper/interfaces/innerkits:dump_usage_config` | [base/hiviewdfx/hidumper/interfaces/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/interfaces/innerkits/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hidumper/interfaces/innerkits:lib_dump_usage` | [base/hiviewdfx/hidumper/interfaces/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/interfaces/innerkits/BUILD.gn) | 28 |
| build-support | `config` | `//base/hiviewdfx/hidumper/plugins:dumper_plugin_config` | [base/hiviewdfx/hidumper/plugins/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/plugins/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hidumper/plugins:hidumper_plugin` | [base/hiviewdfx/hidumper/plugins/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/plugins/BUILD.gn) | 22 |
| production | `ohos_sa_profile` | `//base/hiviewdfx/hidumper/sa_profile:hidumper_service_sa_profile` | [base/hiviewdfx/hidumper/sa_profile/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/sa_profile/BUILD.gn) | 18 |
| build-support | `config` | `//base/hiviewdfx/hidumper/services:interface_include` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 17 |
| build-support | `config` | `//base/hiviewdfx/hidumper/services:service_config` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 25 |
| build-support | `config` | `//base/hiviewdfx/hidumper/services:zidl_config` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 29 |
| build-support | `config` | `//base/hiviewdfx/hidumper/services:zidl_cpu_config` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 33 |
| build-support | `config` | `//base/hiviewdfx/hidumper/services:hidumper_plugin_config` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 40 |
| build-support | `config` | `//base/hiviewdfx/hidumper/services:dump_cpu_config` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 44 |
| build-support | `config` | `//base/hiviewdfx/hidumper/services:hidumpercpuservice_gen_config` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 58 |
| production | `idl_gen_interface` | `//base/hiviewdfx/hidumper/services:hidumpercpuservice_interface` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 62 |
| production | `ohos_source_set` | `//base/hiviewdfx/hidumper/services:zidl_client` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 70 |
| production | `ohos_source_set` | `//base/hiviewdfx/hidumper/services:zidl_service` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 100 |
| production | `ohos_source_set` | `//base/hiviewdfx/hidumper/services:zidl_cpu_service` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 124 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hidumper/services:hidumper_client` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 153 |
| production | `ohos_source_set` | `//base/hiviewdfx/hidumper/services:hidumperservice_source` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 187 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hidumper/services:hidumperservice_cpu_source` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 236 |
| test | `ohos_source_set` | `//base/hiviewdfx/hidumper/services:hidumperservice_cpu_source_test` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 290 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hidumper/services:hidumperservice` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 329 |
| production | `ohos_source_set` | `//base/hiviewdfx/hidumper/services:hidumpermemory_source` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 340 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hidumper/services:hidumpermemory` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 413 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hidumper/services:hidumpercpuservice` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 423 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hidumper/services:hidumper_service.rc` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 436 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hidumper/services:infos_config` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 446 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hidumper/services:task_enable_config` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 456 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hidumper/services:event_reason_config` | [base/hiviewdfx/hidumper/services/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/services/BUILD.gn) | 466 |
| test | `group` | `//base/hiviewdfx/hidumper/test:unittest` | [base/hiviewdfx/hidumper/test/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/BUILD.gn) | 15 |
| test | `group` | `//base/hiviewdfx/hidumper/test:fuzztest` | [base/hiviewdfx/hidumper/test/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/client_fuzzer:ClientFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/client_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/client_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/client_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/client_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/client_fuzzer/BUILD.gn) | 48 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/cpudump_fuzzer:CpuDumpFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/cpudump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/cpudump_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/cpudump_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/cpudump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/cpudump_fuzzer/BUILD.gn) | 31 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/dumpusage_fuzzer:DumpUsageFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/dumpusage_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/dumpusage_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/dumpusage_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/dumpusage_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/dumpusage_fuzzer/BUILD.gn) | 36 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/helpdump_fuzzer:HelpDumpFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/helpdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/helpdump_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/helpdump_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/helpdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/helpdump_fuzzer/BUILD.gn) | 31 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/ipcdump_fuzzer:IpcDumpFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/ipcdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/ipcdump_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/ipcdump_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/ipcdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/ipcdump_fuzzer/BUILD.gn) | 31 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/memdump_fuzzer:MemDumpFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/memdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/memdump_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/memdump_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/memdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/memdump_fuzzer/BUILD.gn) | 31 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/memjsheapdump_fuzzer:MemJsheapDumpFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/memjsheapdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/memjsheapdump_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/memjsheapdump_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/memjsheapdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/memjsheapdump_fuzzer/BUILD.gn) | 31 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/memsmapsdump_fuzzer:MemSmapsDumpFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/memsmapsdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/memsmapsdump_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/memsmapsdump_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/memsmapsdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/memsmapsdump_fuzzer/BUILD.gn) | 31 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/netdump_fuzzer:NetDumpFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/netdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/netdump_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/netdump_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/netdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/netdump_fuzzer/BUILD.gn) | 31 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/processdump_fuzzer:ProcessDumpFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/processdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/processdump_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/processdump_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/processdump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/processdump_fuzzer/BUILD.gn) | 31 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/sadump_fuzzer:SADumpFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/sadump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/sadump_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/sadump_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/sadump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/sadump_fuzzer/BUILD.gn) | 31 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hidumper/test/fuzztest/storagedump_fuzzer:StorageDumpFuzzTest` | [base/hiviewdfx/hidumper/test/fuzztest/storagedump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/storagedump_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//base/hiviewdfx/hidumper/test/fuzztest/storagedump_fuzzer:fuzztest` | [base/hiviewdfx/hidumper/test/fuzztest/storagedump_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/fuzztest/storagedump_fuzzer/BUILD.gn) | 31 |
| build-support | `config` | `//base/hiviewdfx/hidumper/test/innerkits_test:innerkits_test_config` | [base/hiviewdfx/hidumper/test/innerkits_test/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/innerkits_test/BUILD.gn) | 16 |
| test | `ohos_executable` | `//base/hiviewdfx/hidumper/test/innerkits_test:innerkits_test` | [base/hiviewdfx/hidumper/test/innerkits_test/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/innerkits_test/BUILD.gn) | 22 |
| build-support | `config` | `//base/hiviewdfx/hidumper/test/unittest/common:module_private_config` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 22 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperServiceTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 53 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperDataInventoryTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 82 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperDumpersTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 115 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:StorageInfoTaskTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 148 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperOutputTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 170 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperConfigUtilsTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 190 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:MemoryDumperTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 213 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperMemoryTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 239 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:SADumperTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 275 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperPrivacyTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 295 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperInnerkitsTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 310 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:GetHeapInfoTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 346 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperManagerTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 373 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperCpuServiceTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 403 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperClientTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 439 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:HidumperZidlTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 469 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:DumpCommonUtilsTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 490 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:EventDumperTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 513 |
| test | `ohos_unittest` | `//base/hiviewdfx/hidumper/test/unittest/common:ZipFileCleanerTest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 536 |
| test | `group` | `//base/hiviewdfx/hidumper/test/unittest/common:unittest` | [base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/test/unittest/common/BUILD.gn) | 560 |
| build-support | `config` | `//base/hiviewdfx/hidumper/utils:utils_config` | [base/hiviewdfx/hidumper/utils/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/utils/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hidumper/utils:utils` | [base/hiviewdfx/hidumper/utils/BUILD.gn](../../../../../../base/hiviewdfx/hidumper/utils/BUILD.gn) | 20 |

## 扫描限制

- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。
- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。
- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。
