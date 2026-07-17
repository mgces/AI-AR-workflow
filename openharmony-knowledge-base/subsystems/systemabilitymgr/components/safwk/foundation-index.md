# safwk：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `systemabilitymgr` |
| component | `safwk` |
| Git 子仓 | `foundation/systemabilitymgr/safwk` |
| bundle | [foundation/systemabilitymgr/safwk/bundle.json](../../../../../../foundation/systemabilitymgr/safwk/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 12 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 4 |
| declared test entries | 2 |

## 依赖

组件依赖：`ffrt`, `hilog`, `hitrace`, `ipc`, `init`, `json`, `samgr`, `c_utils`, `access_token`, `rust_cxx`, `ylong_runtime`, `hisysevent`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/systemabilitymgr/safwk/test:unittest`
- `//foundation/systemabilitymgr/safwk/test/fuzztest/systemabilityfwk_fuzzer:fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 13 |
| test | 26 |
| build-support | 20 |
| aggregate-codegen | 2 |
| total | 61 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/svc:config_svc` | [foundation/systemabilitymgr/safwk/svc/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/svc/BUILD.gn) | 16 |
| production | `ohos_executable` | `//foundation/systemabilitymgr/safwk/svc:svc` | [foundation/systemabilitymgr/safwk/svc/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/svc/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk:system_ability_config` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn) | 21 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk:system_ability_all_deps_config` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn) | 30 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk:api_cache_manager_config` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn) | 35 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk:system_ability_fwk` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn) | 43 |
| production | `ohos_static_library` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk:system_ability_ondemand_reason` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn) | 100 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk:api_cache_manager` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/BUILD.gn) | 124 |
| production | `rust_cxx` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust:system_ability_fwk_rust_gen` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust:system_ability_fwk_rust_cxx` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/BUILD.gn) | 20 |
| production | `ohos_rust_shared_library` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust:system_ability_fwk_rust` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/BUILD.gn) | 52 |
| production | `ohos_rust_shared_library` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/examples:audio_rust_sa` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/examples/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/examples/BUILD.gn) | 16 |
| production | `ohos_rust_shared_library` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/examples:listen_rust_sa` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/examples/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/examples/BUILD.gn) | 34 |
| test | `ohos_rust_unittest` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/tests:rust_safwk_ut_test` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/tests/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/tests/BUILD.gn) | 16 |
| test | `group` | `//foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/tests:unittest` | [foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/tests/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/interfaces/innerkits/safwk/rust/tests/BUILD.gn) | 33 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/safwk/etc/profile:foundation_trust` | [foundation/systemabilitymgr/safwk/etc/profile/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/etc/profile/BUILD.gn) | 16 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/safwk/etc/profile:foundation_cfg` | [foundation/systemabilitymgr/safwk/etc/profile/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/etc/profile/BUILD.gn) | 24 |
| aggregate-codegen | `group` | `//foundation/systemabilitymgr/safwk/etc/profile:foundation_cfg` | [foundation/systemabilitymgr/safwk/etc/profile/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/etc/profile/BUILD.gn) | 31 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/services/safwk:config_safwk` | [foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/services/safwk:libsafwk_c_private_config` | [foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn) | 26 |
| production | `ohos_executable` | `//foundation/systemabilitymgr/safwk/services/safwk:sa_main` | [foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn) | 30 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/services/safwk:sa_start` | [foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn) | 82 |
| aggregate-codegen | `group` | `//foundation/systemabilitymgr/safwk/services/safwk:sa_start_group` | [foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn) | 133 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/fuzztest/systemabilityfwk_fuzzer:safwk_fuzz_test_config` | [foundation/systemabilitymgr/safwk/test/fuzztest/systemabilityfwk_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/fuzztest/systemabilityfwk_fuzzer/BUILD.gn) | 23 |
| test | `ohos_fuzztest` | `//foundation/systemabilitymgr/safwk/test/fuzztest/systemabilityfwk_fuzzer:SystemAbilityFwkFuzzTest` | [foundation/systemabilitymgr/safwk/test/fuzztest/systemabilityfwk_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/fuzztest/systemabilityfwk_fuzzer/BUILD.gn) | 31 |
| test | `group` | `//foundation/systemabilitymgr/safwk/test/fuzztest/systemabilityfwk_fuzzer:fuzztest` | [foundation/systemabilitymgr/safwk/test/fuzztest/systemabilityfwk_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/fuzztest/systemabilityfwk_fuzzer/BUILD.gn) | 73 |
| test | `group` | `//foundation/systemabilitymgr/safwk/test:unittest` | [foundation/systemabilitymgr/safwk/test/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/mock/common/audio_ability:test_audio_ability_config` | [foundation/systemabilitymgr/safwk/test/mock/common/audio_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/audio_ability/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/test/mock/common/audio_ability:test_audio_ability` | [foundation/systemabilitymgr/safwk/test/mock/common/audio_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/audio_ability/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/mock/common/connect_ability:test_connect_ability_config` | [foundation/systemabilitymgr/safwk/test/mock/common/connect_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/connect_ability/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/test/mock/common/connect_ability:test_connect_ability` | [foundation/systemabilitymgr/safwk/test/mock/common/connect_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/connect_ability/BUILD.gn) | 21 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/mock/common/demo_sa:demo_sa_config` | [foundation/systemabilitymgr/safwk/test/mock/common/demo_sa/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/demo_sa/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/test/mock/common/demo_sa:test_demo_sa` | [foundation/systemabilitymgr/safwk/test/mock/common/demo_sa/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/demo_sa/BUILD.gn) | 25 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/mock/common/tt_ability:test_tt_ability_config` | [foundation/systemabilitymgr/safwk/test/mock/common/tt_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/tt_ability/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/test/mock/common/tt_ability:test_tt_ability` | [foundation/systemabilitymgr/safwk/test/mock/common/tt_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/tt_ability/BUILD.gn) | 21 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/mock/common/incomplete_ability:test_incomplete_ability_config` | [foundation/systemabilitymgr/safwk/test/mock/common/incomplete_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/incomplete_ability/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/test/mock/common/incomplete_ability:test_incomplete_ability` | [foundation/systemabilitymgr/safwk/test/mock/common/incomplete_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/incomplete_ability/BUILD.gn) | 21 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/mock/common/ondemand_ability:ondemand_ability_config` | [foundation/systemabilitymgr/safwk/test/mock/common/ondemand_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/ondemand_ability/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/test/mock/common/ondemand_ability:test_ondemand_ability` | [foundation/systemabilitymgr/safwk/test/mock/common/ondemand_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/mock/common/ondemand_ability/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/svc/unittest:svc_test_config` | [foundation/systemabilitymgr/safwk/test/svc/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/svc/unittest/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/safwk/test/svc/unittest:SvcTest` | [foundation/systemabilitymgr/safwk/test/svc/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/svc/unittest/BUILD.gn) | 26 |
| test | `ohos_executable` | `//foundation/systemabilitymgr/safwk/test/svc/unittest:svc_test` | [foundation/systemabilitymgr/safwk/test/svc/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/svc/unittest/BUILD.gn) | 54 |
| test | `group` | `//foundation/systemabilitymgr/safwk/test/svc/unittest:unittest` | [foundation/systemabilitymgr/safwk/test/svc/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/svc/unittest/BUILD.gn) | 85 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_svc_ability:test_svc_ability_config` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_svc_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_svc_ability/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_svc_ability:svc_test` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_svc_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_svc_ability/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_sa_proxy_cache_ability:test_sa_proxy_cache_config` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_sa_proxy_cache_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_sa_proxy_cache_ability/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_sa_proxy_cache_ability:test_sa_proxy_cache` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_sa_proxy_cache_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/test_sa_proxy_cache_ability/BUILD.gn) | 21 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:system_ability_config` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 19 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:system_ability_all_deps_config` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 27 |
| test | `ohos_static_library` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:system_ability_fwk_tdd` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 32 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:LocalAbilityManagerTest` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 76 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:MockLocalAbilityManagerTest` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 136 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:SystemAbilityTest` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 179 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:CacheManagerTest` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 232 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:ExpireLruCacheTest` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 279 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:SaProxyCacheTest` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 312 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:SystemAbilityStartTest` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 349 |
| test | `group` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest:unittest` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/BUILD.gn) | 406 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest/listen_ability:listen_ability_config` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/listen_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/listen_ability/BUILD.gn) | 16 |
| test | `ohos_shared_library` | `//foundation/systemabilitymgr/safwk/test/services/safwk/unittest/listen_ability:listen_test` | [foundation/systemabilitymgr/safwk/test/services/safwk/unittest/listen_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/services/safwk/unittest/listen_ability/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/systemabilitymgr/safwk/test/resource:coverage_flags` | [foundation/systemabilitymgr/safwk/test/resource/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/test/resource/BUILD.gn) | 18 |

## 查询命令

```bash
awk -F '\t' '$1 == "systemabilitymgr" && $2 == "safwk"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
