# soc_perf：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `resourceschedule` |
| component | `soc_perf` |
| Git 子仓 | `foundation/resourceschedule/soc_perf` |
| bundle | [foundation/resourceschedule/soc_perf/bundle.json](../../../../../../foundation/resourceschedule/soc_perf/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 17 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 1 |
| declared test entries | 3 |

## 依赖

组件依赖：`access_token`, `cJSON`, `c_utils`, `config_policy`, `eventhandler`, `ffrt`, `hitrace`, `hilog`, `ipc`, `init`, `safwk`, `samgr`, `selinux_adapter`, `hisysevent`, `libxml2`, `resource_schedule_service`, `json`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/resourceschedule/soc_perf:test_soc_perf_all`
- `//foundation/resourceschedule/soc_perf/test/fuzztest:fuzztest`
- `//foundation/resourceschedule/soc_perf/test/fuzztest/lxjRUC_fuzzer:fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 8 |
| test | 37 |
| build-support | 4 |
| aggregate-codegen | 4 |
| total | 53 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/resourceschedule/soc_perf:base_group_soc_perf_all` | [foundation/resourceschedule/soc_perf/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/soc_perf:fwk_group_socperf_client_all` | [foundation/resourceschedule/soc_perf/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/BUILD.gn) | 23 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/soc_perf:service_group_soc_perf_all` | [foundation/resourceschedule/soc_perf/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/BUILD.gn) | 29 |
| test | `group` | `//foundation/resourceschedule/soc_perf:test_soc_perf_all` | [foundation/resourceschedule/soc_perf/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/BUILD.gn) | 38 |
| production | `ohos_sa_profile` | `//foundation/resourceschedule/soc_perf/sa_profile:socperf_sa_profile` | [foundation/resourceschedule/soc_perf/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/sa_profile/BUILD.gn) | 16 |
| production | `idl_gen_interface` | `//foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client:socperf_client_interface` | [foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client:socperf_client_public_config` | [foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client:socperf_client` | [foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client/BUILD.gn) | 32 |
| production | `ohos_source_set` | `//foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client:socperf_stub` | [foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/interfaces/inner_api/socperf_client/BUILD.gn) | 69 |
| build-support | `config` | `//foundation/resourceschedule/soc_perf/services:socperf_server_config` | [foundation/resourceschedule/soc_perf/services/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/services/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/soc_perf/services:socperf_server` | [foundation/resourceschedule/soc_perf/services/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/services/BUILD.gn) | 27 |
| production | `ohos_static_library` | `//foundation/resourceschedule/soc_perf/services:socperf_server_static` | [foundation/resourceschedule/soc_perf/services/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/services/BUILD.gn) | 86 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/powerlimitboost_fuzzer:PowerLimitBoostFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/powerlimitboost_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/powerlimitboost_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/powerlimitboost_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/powerlimitboost_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/powerlimitboost_fuzzer/BUILD.gn) | 54 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/setthermallevel_fuzzer:SetThermalLevelFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/setthermallevel_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/setthermallevel_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/setthermallevel_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/setthermallevel_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/setthermallevel_fuzzer/BUILD.gn) | 54 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/socperfclient_fuzzer:SocperfClientFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/socperfclient_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/socperfclient_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/socperfclient_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/socperfclient_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/socperfclient_fuzzer/BUILD.gn) | 71 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/socperf_fuzzer:SocPerfFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/socperf_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/socperf_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/socperf_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/socperf_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/socperf_fuzzer/BUILD.gn) | 54 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/perfrequestex_fuzzer:PerfRequestExFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/perfrequestex_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/perfrequestex_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/perfrequestex_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/perfrequestex_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/perfrequestex_fuzzer/BUILD.gn) | 54 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/requestdevicemode_fuzzer:RequestDeviceModeFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/requestdevicemode_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/requestdevicemode_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/requestdevicemode_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/requestdevicemode_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/requestdevicemode_fuzzer/BUILD.gn) | 54 |
| build-support | `config` | `//foundation/resourceschedule/soc_perf/test/fuzztest/loadconfigxmlfile_fuzzer:module_private_config` | [foundation/resourceschedule/soc_perf/test/fuzztest/loadconfigxmlfile_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/loadconfigxmlfile_fuzzer/BUILD.gn) | 20 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/loadconfigxmlfile_fuzzer:LoadConfigXmlFileFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/loadconfigxmlfile_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/loadconfigxmlfile_fuzzer/BUILD.gn) | 29 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/loadconfigxmlfile_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/loadconfigxmlfile_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/loadconfigxmlfile_fuzzer/BUILD.gn) | 53 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/requestcmdidcount_fuzzer:RequestCmdIdCountFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/requestcmdidcount_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/requestcmdidcount_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/requestcmdidcount_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/requestcmdidcount_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/requestcmdidcount_fuzzer/BUILD.gn) | 54 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/soc_fuzzer:SocFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/soc_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/soc_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/soc_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/soc_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/soc_fuzzer/BUILD.gn) | 71 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/lxjRUC_fuzzer:LxjRUCFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/lxjRUC_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/lxjRUC_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/lxjRUC_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/lxjRUC_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/lxjRUC_fuzzer/BUILD.gn) | 42 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/perfrequest_fuzzer:PerfRequestFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/perfrequest_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/perfrequest_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/perfrequest_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/perfrequest_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/perfrequest_fuzzer/BUILD.gn) | 54 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/limitrequest_fuzzer:LimitRequestFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/limitrequest_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/limitrequest_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/limitrequest_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/limitrequest_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/limitrequest_fuzzer/BUILD.gn) | 54 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/thermallimitboost_fuzzer:ThermalLimitBoostFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/thermallimitboost_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/thermallimitboost_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/thermallimitboost_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/thermallimitboost_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/thermallimitboost_fuzzer/BUILD.gn) | 54 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/soc_perf/test/fuzztest/setstatus_fuzzer:SetStatusFuzzTest` | [foundation/resourceschedule/soc_perf/test/fuzztest/setstatus_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/setstatus_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/fuzztest/setstatus_fuzzer:fuzztest` | [foundation/resourceschedule/soc_perf/test/fuzztest/setstatus_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/fuzztest/setstatus_fuzzer/BUILD.gn) | 54 |
| build-support | `config` | `//foundation/resourceschedule/soc_perf/test/unittest:module_private_config` | [foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/resourceschedule/soc_perf/test/unittest:SocPerfHitraceChainTest` | [foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn) | 32 |
| test | `ohos_unittest` | `//foundation/resourceschedule/soc_perf/test/unittest:SocPerfServerTest` | [foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn) | 54 |
| test | `ohos_unittest` | `//foundation/resourceschedule/soc_perf/test/unittest:SocPerfSubTest` | [foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn) | 91 |
| test | `ohos_unittest` | `//foundation/resourceschedule/soc_perf/test/unittest:SocPerfSubMockTest` | [foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn) | 111 |
| test | `ohos_unittest` | `//foundation/resourceschedule/soc_perf/test/unittest:LRUCache_test` | [foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn) | 134 |
| test | `group` | `//foundation/resourceschedule/soc_perf/test/unittest:unittest` | [foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/unittest/BUILD.gn) | 156 |
| test | `ohos_executable` | `//foundation/resourceschedule/soc_perf/test/testutil:socperf_test` | [foundation/resourceschedule/soc_perf/test/testutil/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/test/testutil/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/soc_perf/profile:socperf_resource_config` | [foundation/resourceschedule/soc_perf/profile/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/profile/BUILD.gn) | 16 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/soc_perf/profile:socperf_boost_config` | [foundation/resourceschedule/soc_perf/profile/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/profile/BUILD.gn) | 23 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/soc_perf/profile:socperf_config` | [foundation/resourceschedule/soc_perf/profile/BUILD.gn](../../../../../../foundation/resourceschedule/soc_perf/profile/BUILD.gn) | 31 |

## 查询命令

```bash
awk -F '\t' '$1 == "resourceschedule" && $2 == "soc_perf"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
