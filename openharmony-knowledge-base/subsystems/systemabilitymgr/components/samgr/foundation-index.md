# samgr：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `systemabilitymgr` |
| component | `samgr` |
| Git 子仓 | `foundation/systemabilitymgr/samgr` |
| bundle | [foundation/systemabilitymgr/samgr/bundle.json](../../../../../../foundation/systemabilitymgr/samgr/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 24 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 4 |
| declared test entries | 3 |

## 依赖

组件依赖：`ability_base`, `access_token`, `c_utils`, `common_event_service`, `device_manager`, `dsoftbus`, `ffrt`, `hicollie`, `hilog`, `hisysevent`, `hitrace`, `init`, `ipc`, `json`, `libxml2`, `mksh`, `preferences`, `safwk`, `selinux_adapter`, `qos_manager`, `toybox`, `config_policy`, `rust_cxx`, `ylong_runtime`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/systemabilitymgr/samgr/services/samgr/native/test:unittest`
- `//foundation/systemabilitymgr/samgr/test/fuzztest:fuzztest`
- `//foundation/systemabilitymgr/samgr/services/common/test:unittest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 11 |
| test | 37 |
| build-support | 18 |
| aggregate-codegen | 2 |
| total | 68 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy:samgr_proxy_config` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy:lsamgr_proxy_config` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy:samgr_proxy_private_config` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy/BUILD.gn) | 27 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy:samgr_proxy` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/samgr_proxy/BUILD.gn) | 39 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/common:all_config_samgr_common` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/common/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/common/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/common:config_samgr_common` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/common/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/common/BUILD.gn) | 22 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/common:samgr_common` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/common/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/common/BUILD.gn) | 32 |
| production | `rust_cxx` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/rust:samgr_cxx_gen` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/rust:samgr_rust_cpp` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/BUILD.gn) | 20 |
| production | `ohos_rust_shared_library` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/rust:samgr_rust` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/BUILD.gn) | 55 |
| production | `ohos_rust_executable` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/examples:samgr_rust_basic` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/examples/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/examples/BUILD.gn) | 16 |
| test | `rust_cxx` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests:samgr_rust_test_gen` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests/BUILD.gn) | 17 |
| test | `ohos_static_library` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests:samgr_rust_test_c` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests/BUILD.gn) | 21 |
| test | `ohos_rust_unittest` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests:rust_samgr_ut_test` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests/BUILD.gn) | 42 |
| test | `ohos_rust_systemtest` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests:rust_samgr_sdv_test` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests/BUILD.gn) | 58 |
| test | `group` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests:unittest` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/rust/tests/BUILD.gn) | 88 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/dynamic_cache:dynamic_cache_config` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/dynamic_cache/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/dynamic_cache/BUILD.gn) | 19 |
| production | `ohos_static_library` | `//foundation/systemabilitymgr/samgr/interfaces/innerkits/dynamic_cache:dynamic_cache` | [foundation/systemabilitymgr/samgr/interfaces/innerkits/dynamic_cache/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/interfaces/innerkits/dynamic_cache/BUILD.gn) | 23 |
| aggregate-codegen | `group` | `//foundation/systemabilitymgr/samgr/etc:samgr_etc` | [foundation/systemabilitymgr/samgr/etc/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/etc/BUILD.gn) | 16 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/samgr/etc:samgr.para.dac` | [foundation/systemabilitymgr/samgr/etc/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/etc/BUILD.gn) | 24 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/samgr/etc:samgr.para` | [foundation/systemabilitymgr/samgr/etc/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/etc/BUILD.gn) | 31 |
| aggregate-codegen | `group` | `//foundation/systemabilitymgr/samgr/etc:etc` | [foundation/systemabilitymgr/samgr/etc/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/etc/BUILD.gn) | 38 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/samgr/etc:samgr_init` | [foundation/systemabilitymgr/samgr/etc/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/etc/BUILD.gn) | 42 |
| test | `group` | `//foundation/systemabilitymgr/samgr/services/common/test:unittest` | [foundation/systemabilitymgr/samgr/services/common/test/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/common/test/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/services/common/test/mock:mock_sa_config` | [foundation/systemabilitymgr/samgr/services/common/test/mock/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/common/test/mock/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/systemabilitymgr/samgr/services/common/test/mock:mock_sa` | [foundation/systemabilitymgr/samgr/services/common/test/mock/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/common/test/mock/BUILD.gn) | 21 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/common/test/unittest:ParseUtilTest` | [foundation/systemabilitymgr/samgr/services/common/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/common/test/unittest/BUILD.gn) | 19 |
| test | `group` | `//foundation/systemabilitymgr/samgr/services/common/test/unittest:unittest` | [foundation/systemabilitymgr/samgr/services/common/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/common/test/unittest/BUILD.gn) | 58 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/services/samgr/native:distributed_store_config` | [foundation/systemabilitymgr/samgr/services/samgr/native/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/BUILD.gn) | 19 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/services/samgr/native:sam_config` | [foundation/systemabilitymgr/samgr/services/samgr/native/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/BUILD.gn) | 25 |
| production | `ohos_executable` | `//foundation/systemabilitymgr/samgr/services/samgr/native:samgr` | [foundation/systemabilitymgr/samgr/services/samgr/native/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/BUILD.gn) | 38 |
| test | `group` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test:unittest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:sam_test_config` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:samgr_proxy_config` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 32 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:samgr_proxy_private_config` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 36 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:SystemAbilityMgrTest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 46 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:SystemAbilityMgrCollectTest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 171 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:BaseSystemAbilityMgrTest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 314 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:SystemAbilityMgrDeviceNetworkingTest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 421 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:SystemAbilityMgrStubTest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 535 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:SystemAbilityMgrProxyTest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 646 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:LocalAbilityManagerProxyTest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 713 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:SystemAbilityStateSchedulerTest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 746 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:SystemAbilityMgrDumperTest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 852 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:MockSystemAbilityManagerTest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 936 |
| test | `ohos_executable` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:manual_ondemand` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 995 |
| test | `ohos_executable` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:ondemand` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 1047 |
| test | `ohos_executable` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:TestTool` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 1099 |
| test | `ohos_static_library` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:samgr_proxy_tdd` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 1213 |
| test | `ohos_rust_unittest` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:rust_samgr_test_client` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 1253 |
| test | `group` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest:unittest` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/BUILD.gn) | 1273 |
| test | `ohos_rust_shared_library` | `//foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/rust/service:test_access_token` | [foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/rust/service/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/test/unittest/rust/service/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/test/resource:coverage_flags` | [foundation/systemabilitymgr/samgr/test/resource/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/resource/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgr_fuzzer:sam_fuzz_test_config` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgr_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgr_fuzzer/BUILD.gn) | 23 |
| test | `group` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgr_fuzzer:fuzztest` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgr_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgr_fuzzer/BUILD.gn) | 222 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgrdumper_fuzzer:sam_fuzz_test_config` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgrdumper_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgrdumper_fuzzer/BUILD.gn) | 23 |
| test | `ohos_fuzztest` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgrdumper_fuzzer:SamgrDumperFuzzTest` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgrdumper_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgrdumper_fuzzer/BUILD.gn) | 32 |
| test | `group` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgrdumper_fuzzer:fuzztest` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgrdumper_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgrdumper_fuzzer/BUILD.gn) | 122 |
| test | `group` | `//foundation/systemabilitymgr/samgr/test/fuzztest:fuzztest` | [foundation/systemabilitymgr/samgr/test/fuzztest/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgrparallelize_fuzzer:sam_fuzz_test_config` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgrparallelize_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgrparallelize_fuzzer/BUILD.gn) | 23 |
| test | `ohos_fuzztest` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgrparallelize_fuzzer:SamgrParallelizeFuzzTest` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgrparallelize_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgrparallelize_fuzzer/BUILD.gn) | 32 |
| test | `group` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgrparallelize_fuzzer:fuzztest` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgrparallelize_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgrparallelize_fuzzer/BUILD.gn) | 124 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgrcoverage_fuzzer:sam_fuzz_test_config` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgrcoverage_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgrcoverage_fuzzer/BUILD.gn) | 24 |
| test | `ohos_fuzztest` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgrcoverage_fuzzer:SamgrCoverageFuzzTest` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgrcoverage_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgrcoverage_fuzzer/BUILD.gn) | 33 |
| test | `group` | `//foundation/systemabilitymgr/samgr/test/fuzztest/samgrcoverage_fuzzer:fuzztest` | [foundation/systemabilitymgr/samgr/test/fuzztest/samgrcoverage_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/samgrcoverage_fuzzer/BUILD.gn) | 125 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr/test/fuzztest/systemabilitymanager_fuzzer:sam_fuzz_test_config` | [foundation/systemabilitymgr/samgr/test/fuzztest/systemabilitymanager_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/systemabilitymanager_fuzzer/BUILD.gn) | 23 |
| test | `ohos_fuzztest` | `//foundation/systemabilitymgr/samgr/test/fuzztest/systemabilitymanager_fuzzer:SystemAbilityManagerFuzzTest` | [foundation/systemabilitymgr/samgr/test/fuzztest/systemabilitymanager_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/systemabilitymanager_fuzzer/BUILD.gn) | 32 |
| test | `group` | `//foundation/systemabilitymgr/samgr/test/fuzztest/systemabilitymanager_fuzzer:fuzztest` | [foundation/systemabilitymgr/samgr/test/fuzztest/systemabilitymanager_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/test/fuzztest/systemabilitymanager_fuzzer/BUILD.gn) | 121 |

## 查询命令

```bash
awk -F '\t' '$1 == "systemabilitymgr" && $2 == "samgr"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
