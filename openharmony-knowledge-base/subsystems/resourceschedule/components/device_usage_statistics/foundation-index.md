# device_usage_statistics：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `resourceschedule` |
| component | `device_usage_statistics` |
| Git 子仓 | `foundation/resourceschedule/device_usage_statistics` |
| bundle | [foundation/resourceschedule/device_usage_statistics/bundle.json](../../../../../../foundation/resourceschedule/device_usage_statistics/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 24 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 2 |
| declared test entries | 2 |

## 依赖

组件依赖：`relational_store`, `runtime_core`, `safwk`, `config_policy`, `os_account`, `ipc`, `access_token`, `ability_runtime`, `hicollie`, `hilog`, `samgr`, `c_utils`, `cJSON`, `napi`, `background_task_mgr`, `power_manager`, `selinux_adapter`, `time_service`, `init`, `ffrt`, `hisysevent`, `hitrace`, `window_manager`, `ets_frontend`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/resourceschedule/device_usage_statistics:test_all`
- `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundle_fuzzer:BundleActiveEventFuzzTest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 17 |
| test | 31 |
| build-support | 11 |
| aggregate-codegen | 5 |
| total | 64 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `idl_gen_interface` | `//foundation/resourceschedule/device_usage_statistics:bundle_active_interface` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 18 |
| production | `idl_gen_interface` | `//foundation/resourceschedule/device_usage_statistics:app_group_callback_interface` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 24 |
| production | `ohos_sa_profile` | `//foundation/resourceschedule/device_usage_statistics:device_usage_statistics_sa_profile` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 30 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics:usagestats_public_config` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 35 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics:usagestatsutils_config` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 46 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_usage_statistics:usagestatsinner` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 50 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/device_usage_statistics:device_usage_statistics_service_init` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 97 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_usage_statistics:bundlestate` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 104 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_usage_statistics:usagestatistics` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 150 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_usage_statistics:usagestatservice` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 198 |
| production | `ohos_static_library` | `//foundation/resourceschedule/device_usage_statistics:usagestatservice_static` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 293 |
| production | `ohos_static_library` | `//foundation/resourceschedule/device_usage_statistics:usagestatsinner_static` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 382 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_usage_statistics:usagestatsutils` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 425 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/device_usage_statistics:bfwk_group_all` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 454 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/device_usage_statistics:service_group_all` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 464 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics:test_all` | [foundation/resourceschedule/device_usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/BUILD.gn) | 475 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/device_usage_statistics/sa_profile:device_usage_statistics_service_init` | [foundation/resourceschedule/device_usage_statistics/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/sa_profile/BUILD.gn) | 17 |
| production | `ohos_sa_profile` | `//foundation/resourceschedule/device_usage_statistics/sa_profile:usagestat_sa_profile` | [foundation/resourceschedule/device_usage_statistics/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/sa_profile/BUILD.gn) | 24 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics:copy_usage_statistics_taihe` | [foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn) | 22 |
| production | `ohos_taihe` | `//foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics:run_taihe` | [foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn) | 26 |
| production | `taihe_shared_library` | `//foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics:usageStatistics_taihe_native` | [foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn) | 35 |
| aggregate-codegen | `generate_static_abc` | `//foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics:usage_statistics_abc` | [foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn) | 66 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics:usageStatistics_etc` | [foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn) | 76 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics:usageStatistics_taihe` | [foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/interfaces/kits/bundlestats/taihe/usage_statistics/BUILD.gn) | 84 |
| test | `ohos_js_unittest` | `//foundation/resourceschedule/device_usage_statistics/interfaces/test/unittest/device_usage_statistics_jsunittest:DeviceUsageStatisticsJsTest` | [foundation/resourceschedule/device_usage_statistics/interfaces/test/unittest/device_usage_statistics_jsunittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/interfaces/test/unittest/device_usage_statistics_jsunittest/BUILD.gn) | 18 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/interfaces/test/unittest/device_usage_statistics_jsunittest:js_unittest` | [foundation/resourceschedule/device_usage_statistics/interfaces/test/unittest/device_usage_statistics_jsunittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/interfaces/test/unittest/device_usage_statistics_jsunittest/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveonremoterequest_fuzzer:module_private_config` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveonremoterequest_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveonremoterequest_fuzzer/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveonremoterequest_fuzzer:BundleActiveOnRemoteRequestFuzzTest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveonremoterequest_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveonremoterequest_fuzzer/BUILD.gn) | 34 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveonremoterequest_fuzzer:fuzztest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveonremoterequest_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveonremoterequest_fuzzer/BUILD.gn) | 91 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/appgroupcallbackstub_fuzzer:module_private_config` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/appgroupcallbackstub_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/appgroupcallbackstub_fuzzer/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/appgroupcallbackstub_fuzzer:AppgroupcallbackstubFuzzTest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/appgroupcallbackstub_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/appgroupcallbackstub_fuzzer/BUILD.gn) | 34 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/appgroupcallbackstub_fuzzer:fuzztest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/appgroupcallbackstub_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/appgroupcallbackstub_fuzzer/BUILD.gn) | 92 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundle_fuzzer:BundleActiveEventFuzzTest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundle_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundle_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest:fuzztest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveparallelization_fuzzer:module_private_config` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveparallelization_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveparallelization_fuzzer/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveparallelization_fuzzer:BundleActiveParallelizationFuzzTest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveparallelization_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveparallelization_fuzzer/BUILD.gn) | 34 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveparallelization_fuzzer:fuzztest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveparallelization_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveparallelization_fuzzer/BUILD.gn) | 91 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivemodulerecord_fuzzer:module_private_config` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivemodulerecord_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivemodulerecord_fuzzer/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivemodulerecord_fuzzer:BundleActiveModuleRecordFuzzTest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivemodulerecord_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivemodulerecord_fuzzer/BUILD.gn) | 34 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivemodulerecord_fuzzer:fuzztest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivemodulerecord_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivemodulerecord_fuzzer/BUILD.gn) | 95 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepowerstatecallbackproxy_fuzzer:module_private_config` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepowerstatecallbackproxy_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepowerstatecallbackproxy_fuzzer/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepowerstatecallbackproxy_fuzzer:BundleActivePowerstateCallbackproxyFuzzTest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepowerstatecallbackproxy_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepowerstatecallbackproxy_fuzzer/BUILD.gn) | 34 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepowerstatecallbackproxy_fuzzer:fuzztest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepowerstatecallbackproxy_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepowerstatecallbackproxy_fuzzer/BUILD.gn) | 95 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepackagestats_fuzzer:BundleActivePackageStatsFuzzTest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepackagestats_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepackagestats_fuzzer/BUILD.gn) | 22 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepackagestats_fuzzer:fuzztest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepackagestats_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivepackagestats_fuzzer/BUILD.gn) | 59 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveclient_fuzzer:module_private_config` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveclient_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveclient_fuzzer/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveclient_fuzzer:BundleActiveClientFuzzTest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveclient_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveclient_fuzzer/BUILD.gn) | 34 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveclient_fuzzer:fuzztest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveclient_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveclient_fuzzer/BUILD.gn) | 95 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivecommon_fuzzer:module_private_config` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivecommon_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivecommon_fuzzer/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivecommon_fuzzer:BundleActiveCommonFuzzTest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivecommon_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivecommon_fuzzer/BUILD.gn) | 34 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivecommon_fuzzer:fuzztest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivecommon_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactivecommon_fuzzer/BUILD.gn) | 96 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveobserver_fuzzer:module_private_config` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveobserver_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveobserver_fuzzer/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveobserver_fuzzer:BundleActiveObserverFuzzTest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveobserver_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveobserver_fuzzer/BUILD.gn) | 34 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveobserver_fuzzer:fuzztest` | [foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveobserver_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/fuzztest/bundleactiveobserver_fuzzer/BUILD.gn) | 97 |
| build-support | `config` | `//foundation/resourceschedule/device_usage_statistics/test/unittest:module_private_config` | [foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_usage_statistics/test/unittest:BundleActiveTotalTest` | [foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn) | 31 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_usage_statistics/test/unittest:DeviceUsageStatsTest` | [foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn) | 88 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_usage_statistics/test/unittest:DeviceUsageStatsMultiTest` | [foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn) | 144 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_usage_statistics/test/unittest:DeviceUsageStatsServiceTest` | [foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn) | 200 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_usage_statistics/test/unittest:DeviceUsageStatsMockTest` | [foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn) | 259 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_usage_statistics/test/unittest:DeviceUsagePackageUsageTest` | [foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn) | 321 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_usage_statistics/test/unittest:BundleActiveEventReporterTest` | [foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn) | 373 |
| test | `group` | `//foundation/resourceschedule/device_usage_statistics/test/unittest:unittest` | [foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/test/unittest/BUILD.gn) | 425 |
| production | `ohos_cli_executable` | `//foundation/resourceschedule/device_usage_statistics/tools/ohos-usageStatsQuery:ohos-usageStatsQuery` | [foundation/resourceschedule/device_usage_statistics/tools/ohos-usageStatsQuery/BUILD.gn](../../../../../../foundation/resourceschedule/device_usage_statistics/tools/ohos-usageStatsQuery/BUILD.gn) | 17 |

## 查询命令

```bash
awk -F '\t' '$1 == "resourceschedule" && $2 == "device_usage_statistics"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
