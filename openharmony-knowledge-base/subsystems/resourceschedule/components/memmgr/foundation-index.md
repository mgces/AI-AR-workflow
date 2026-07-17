# memmgr：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `resourceschedule` |
| component | `memmgr` |
| Git 子仓 | `foundation/resourceschedule/memmgr` |
| bundle | [foundation/resourceschedule/memmgr/bundle.json](../../../../../../foundation/resourceschedule/memmgr/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 17 |
| third-party dependencies | 0 |
| declared sub_component | 6 |
| inner kits | 1 |
| declared test entries | 3 |

## 依赖

组件依赖：`ipc`, `ability_base`, `bundle_framework`, `safwk`, `background_task_mgr`, `ability_runtime`, `os_account`, `common_event_service`, `eventhandler`, `hilog`, `c_utils`, `samgr`, `resource_management`, `access_token`, `init`, `libxml2`, `json`

三方依赖：无声明

## 声明构建入口

- `//foundation/resourceschedule/memmgr/sa_profile:memmgr_sa_profile`
- `//foundation/resourceschedule/memmgr/services/memmgrservice:memmgrservice`
- `//foundation/resourceschedule/memmgr/services/memmgrservice:memmgrservice_init`
- `//foundation/resourceschedule/memmgr/profile:memmgr_config`
- `//foundation/resourceschedule/memmgr/profile:memmgr.para`
- `//foundation/resourceschedule/memmgr/profile:memmgr.para.dac`

## 声明测试入口

- `//foundation/resourceschedule/memmgr/test:memmgr_unittest`
- `//foundation/resourceschedule/memmgr/test/fuzztest:memmgr_fuzztest`
- `//foundation/resourceschedule/memmgr/test/fuzztest/mem_fuzzer:fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 7 |
| test | 23 |
| build-support | 2 |
| aggregate-codegen | 0 |
| total | 32 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/resourceschedule/memmgr/interface/innerkits:memmgr_client_config` | [foundation/resourceschedule/memmgr/interface/innerkits/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/interface/innerkits/BUILD.gn) | 18 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/memmgr/interface/innerkits:memmgrclient` | [foundation/resourceschedule/memmgr/interface/innerkits/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/interface/innerkits/BUILD.gn) | 32 |
| production | `ohos_sa_profile` | `//foundation/resourceschedule/memmgr/sa_profile:memmgr_sa_profile` | [foundation/resourceschedule/memmgr/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/sa_profile/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/memmgr/services/memmgrservice:memmgrservice_init` | [foundation/resourceschedule/memmgr/services/memmgrservice/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/services/memmgrservice/BUILD.gn) | 20 |
| build-support | `config` | `//foundation/resourceschedule/memmgr/services/memmgrservice:memory_memmgr_config` | [foundation/resourceschedule/memmgr/services/memmgrservice/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/services/memmgrservice/BUILD.gn) | 31 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/memmgr/services/memmgrservice:memmgrservice` | [foundation/resourceschedule/memmgr/services/memmgrservice/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/services/memmgrservice/BUILD.gn) | 62 |
| test | `group` | `//foundation/resourceschedule/memmgr/test/fuzztest:memmgr_fuzztest` | [foundation/resourceschedule/memmgr/test/fuzztest/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/fuzztest/BUILD.gn) | 15 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/memmgr/test/fuzztest/memmgrstub_fuzzer:MemmgrstubFuzzTest` | [foundation/resourceschedule/memmgr/test/fuzztest/memmgrstub_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/fuzztest/memmgrstub_fuzzer/BUILD.gn) | 18 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/memmgr/test/fuzztest/mem_fuzzer:MemFuzzTest` | [foundation/resourceschedule/memmgr/test/fuzztest/mem_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/fuzztest/mem_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/resourceschedule/memmgr/test/fuzztest/mem_fuzzer:fuzztest` | [foundation/resourceschedule/memmgr/test/fuzztest/mem_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/fuzztest/mem_fuzzer/BUILD.gn) | 56 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:reclaim_priority_manager_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 35 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:kernel_interface_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 50 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:memcg_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 65 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:user_memcg_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 80 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:memcg_mgr_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 95 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:multi_account_manager_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 110 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:nandlife_controller_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 125 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:reclaim_strategy_manager_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 140 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:innerkits_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 155 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:avail_buffer_manager_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 170 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:memmgr_config_manager_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 185 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:default_multi_account_strategy_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 200 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:oom_score_adj_utils_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 215 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:xml_helper_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 230 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:system_memory_level_config_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 245 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:memory_level_manager_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 260 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:low_memory_killer_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 275 |
| test | `ohos_unittest` | `//foundation/resourceschedule/memmgr/test:purgeable_memory_manager_test` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 290 |
| test | `group` | `//foundation/resourceschedule/memmgr/test:memmgr_unittest` | [foundation/resourceschedule/memmgr/test/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/test/BUILD.gn) | 305 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/memmgr/profile:memmgr_config` | [foundation/resourceschedule/memmgr/profile/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/profile/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/memmgr/profile:memmgr.para` | [foundation/resourceschedule/memmgr/profile/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/profile/BUILD.gn) | 24 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/memmgr/profile:memmgr.para.dac` | [foundation/resourceschedule/memmgr/profile/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/profile/BUILD.gn) | 31 |

## 查询命令

```bash
awk -F '\t' '$1 == "resourceschedule" && $2 == "memmgr"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
