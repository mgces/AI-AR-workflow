# qos_manager：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `resourceschedule` |
| component | `qos_manager` |
| Git 子仓 | `foundation/resourceschedule/qos_manager` |
| bundle | [foundation/resourceschedule/qos_manager/bundle.json](../../../../../../foundation/resourceschedule/qos_manager/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 13 |
| third-party dependencies | 0 |
| declared sub_component | 9 |
| inner kits | 3 |
| declared test entries | 2 |

## 依赖

组件依赖：`ability_base`, `ability_runtime`, `access_token`, `config_policy`, `c_utils`, `frame_aware_sched`, `hilog`, `hitrace`, `init`, `ipc`, `libxml2`, `safwk`, `samgr`

三方依赖：无声明

## 声明构建入口

- `//foundation/resourceschedule/qos_manager/etc/init:concurrent_task_service.cfg`
- `//foundation/resourceschedule/qos_manager/etc/param:ffrt.para`
- `//foundation/resourceschedule/qos_manager/etc/param:ffrt.para.dac`
- `//foundation/resourceschedule/qos_manager/sa_profile:concurrent_task_sa_profile`
- `//foundation/resourceschedule/qos_manager/services:concurrentsvc`
- `//foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client:concurrent_task_client`
- `//foundation/resourceschedule/qos_manager/qos:qos`
- `//foundation/resourceschedule/qos_manager/frameworks/native:qos_ndk`
- `//foundation/resourceschedule/qos_manager/qos:pi_mutex`

## 声明测试入口

- `//foundation/resourceschedule/qos_manager/test:concurrent_unittest`
- `//foundation/resourceschedule/qos_manager/test/fuzztest:fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 13 |
| test | 22 |
| build-support | 5 |
| aggregate-codegen | 1 |
| total | 41 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/resourceschedule/qos_manager/qos:qos_config` | [foundation/resourceschedule/qos_manager/qos/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/qos/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/qos_manager/qos:qos` | [foundation/resourceschedule/qos_manager/qos/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/qos/BUILD.gn) | 26 |
| production | `ohos_shared_headers` | `//foundation/resourceschedule/qos_manager/qos:pi_mutex` | [foundation/resourceschedule/qos_manager/qos/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/qos/BUILD.gn) | 60 |
| production | `ohos_sa_profile` | `//foundation/resourceschedule/qos_manager/sa_profile:concurrent_task_sa_profile` | [foundation/resourceschedule/qos_manager/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/sa_profile/BUILD.gn) | 16 |
| production | `idl_gen_interface` | `//foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client:qos_manager_interface` | [foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client:client_private_config` | [foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client:client_public_config` | [foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client/BUILD.gn) | 31 |
| production | `ohos_source_set` | `//foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client:concurrent_task_idl` | [foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client/BUILD.gn) | 41 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client:concurrent_task_client` | [foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/frameworks/concurrent_task_client/BUILD.gn) | 72 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/qos_manager/frameworks/native:qos_ndk` | [foundation/resourceschedule/qos_manager/frameworks/native/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/frameworks/native/BUILD.gn) | 17 |
| production | `ohos_ndk_headers` | `//foundation/resourceschedule/qos_manager/interfaces/kits:qos_header` | [foundation/resourceschedule/qos_manager/interfaces/kits/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/interfaces/kits/BUILD.gn) | 17 |
| production | `ohos_ndk_library` | `//foundation/resourceschedule/qos_manager/interfaces/kits:libqos_ndk` | [foundation/resourceschedule/qos_manager/interfaces/kits/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/interfaces/kits/BUILD.gn) | 22 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/qos_manager/etc/init:etc` | [foundation/resourceschedule/qos_manager/etc/init/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/etc/init/BUILD.gn) | 18 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/qos_manager/etc/init:concurrent_task_service.cfg` | [foundation/resourceschedule/qos_manager/etc/init/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/etc/init/BUILD.gn) | 22 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/qos_manager/etc/param:ffrt.para` | [foundation/resourceschedule/qos_manager/etc/param/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/etc/param/BUILD.gn) | 16 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/qos_manager/etc/param:ffrt.para.dac` | [foundation/resourceschedule/qos_manager/etc/param/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/etc/param/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/resourceschedule/qos_manager/services:concurrent_task_config` | [foundation/resourceschedule/qos_manager/services/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/services/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/qos_manager/services:concurrentsvc` | [foundation/resourceschedule/qos_manager/services/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/services/BUILD.gn) | 32 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/qos_manager/test/fuzztest/qos_policy_fuzzer:QosPolicyFuzzTest` | [foundation/resourceschedule/qos_manager/test/fuzztest/qos_policy_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/qos_policy_fuzzer/BUILD.gn) | 17 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/qos_manager/test/fuzztest/qos_low_level_fuzzer:QosLowLevelFuzzTest` | [foundation/resourceschedule/qos_manager/test/fuzztest/qos_low_level_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/qos_low_level_fuzzer/BUILD.gn) | 17 |
| test | `group` | `//foundation/resourceschedule/qos_manager/test/fuzztest/qos_low_level_fuzzer:fuzztest` | [foundation/resourceschedule/qos_manager/test/fuzztest/qos_low_level_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/qos_low_level_fuzzer/BUILD.gn) | 52 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/qos_manager/test/fuzztest/template_fuzzer:TemplateFuzzTest` | [foundation/resourceschedule/qos_manager/test/fuzztest/template_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/template_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/resourceschedule/qos_manager/test/fuzztest/template_fuzzer:fuzztest` | [foundation/resourceschedule/qos_manager/test/fuzztest/template_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/template_fuzzer/BUILD.gn) | 57 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/qos_manager/test/fuzztest/utils_fuzzer:UtilsFuzzTest` | [foundation/resourceschedule/qos_manager/test/fuzztest/utils_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/utils_fuzzer/BUILD.gn) | 17 |
| test | `group` | `//foundation/resourceschedule/qos_manager/test/fuzztest:fuzztest` | [foundation/resourceschedule/qos_manager/test/fuzztest/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/qos_manager/test/fuzztest/comprehensive_ipc_fuzzer:ComprehensiveIpcFuzzTest` | [foundation/resourceschedule/qos_manager/test/fuzztest/comprehensive_ipc_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/comprehensive_ipc_fuzzer/BUILD.gn) | 17 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/qos_manager/test/fuzztest/rtg_operations_fuzzer:RtgOperationsFuzzTest` | [foundation/resourceschedule/qos_manager/test/fuzztest/rtg_operations_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/rtg_operations_fuzzer/BUILD.gn) | 17 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/qos_manager/test/fuzztest/concurrent_fuzzer:ConcurrentFuzzTest` | [foundation/resourceschedule/qos_manager/test/fuzztest/concurrent_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/concurrent_fuzzer/BUILD.gn) | 17 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/qos_manager/test/fuzztest/qos_fuzzer:QosFuzzTest` | [foundation/resourceschedule/qos_manager/test/fuzztest/qos_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/fuzztest/qos_fuzzer/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/resourceschedule/qos_manager/test:test_config` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//foundation/resourceschedule/qos_manager/test:concurrent_svc_intf_test` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 40 |
| test | `ohos_unittest` | `//foundation/resourceschedule/qos_manager/test:concurrent_task_client_test` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 64 |
| test | `ohos_unittest` | `//foundation/resourceschedule/qos_manager/test:func_loader_test` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 86 |
| test | `ohos_unittest` | `//foundation/resourceschedule/qos_manager/test:concurrent_task_controller_interface_test` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 115 |
| test | `ohos_unittest` | `//foundation/resourceschedule/qos_manager/test:concurrent_task_service_ability_test` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 144 |
| test | `ohos_unittest` | `//foundation/resourceschedule/qos_manager/test:qos_interface_test` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 171 |
| test | `ohos_unittest` | `//foundation/resourceschedule/qos_manager/test:qos_policy_test` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 198 |
| test | `ohos_unittest` | `//foundation/resourceschedule/qos_manager/test:concurrent_task_service_test` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 223 |
| test | `ohos_unittest` | `//foundation/resourceschedule/qos_manager/test:qos_test` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 251 |
| test | `ohos_unittest` | `//foundation/resourceschedule/qos_manager/test:qos_ndk_test` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 273 |
| test | `group` | `//foundation/resourceschedule/qos_manager/test:concurrent_unittest` | [foundation/resourceschedule/qos_manager/test/BUILD.gn](../../../../../../foundation/resourceschedule/qos_manager/test/BUILD.gn) | 298 |

## 查询命令

```bash
awk -F '\t' '$1 == "resourceschedule" && $2 == "qos_manager"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
