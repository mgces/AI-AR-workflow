# device_standby：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `resourceschedule` |
| component | `device_standby` |
| Git 子仓 | `foundation/resourceschedule/device_standby` |
| bundle | [foundation/resourceschedule/device_standby/bundle.json](../../../../../../foundation/resourceschedule/device_standby/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 29 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 5 |
| declared test entries | 6 |

## 依赖

组件依赖：`ability_base`, `ability_runtime`, `access_token`, `background_task_mgr`, `battery_manager`, `bundle_framework`, `call_manager`, `common_event_service`, `config_policy`, `c_utils`, `eventhandler`, `hicollie`, `hilog`, `hitrace`, `idl_tool`, `init`, `ipc`, `input`, `napi`, `netmanager_base`, `power_manager`, `runtime_core`, `safwk`, `samgr`, `sensor`, `time_service`, `work_scheduler`, `json`, `resource_schedule_service`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/resourceschedule/device_standby/interfaces/innerkits/test/unittest:unittest`
- `//foundation/resourceschedule/device_standby/services/test/unittest:unittest`
- `//foundation/resourceschedule/device_standby/plugins/test/unittest:unittest`
- `//foundation/resourceschedule/device_standby/services/test/fuzztest:fuzztest`
- `//foundation/resourceschedule/device_standby/plugins/test/fuzztest:fuzztest`
- `//foundation/resourceschedule/device_standby/utils/test/fuzztest:fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 18 |
| test | 22 |
| build-support | 7 |
| aggregate-codegen | 6 |
| total | 53 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_sa_profile` | `//foundation/resourceschedule/device_standby/sa_profile:device_standby_sa_profile` | [foundation/resourceschedule/device_standby/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/sa_profile/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/resourceschedule/device_standby/frameworks:standby_fwk_public_config` | [foundation/resourceschedule/device_standby/frameworks/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/frameworks/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_standby/frameworks:standby_fwk` | [foundation/resourceschedule/device_standby/frameworks/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/frameworks/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/resourceschedule/device_standby/utils/policy:standby_utils_policy_config` | [foundation/resourceschedule/device_standby/utils/policy/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/policy/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_standby/utils/policy:standby_utils_policy` | [foundation/resourceschedule/device_standby/utils/policy/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/policy/BUILD.gn) | 31 |
| production | `ohos_static_library` | `//foundation/resourceschedule/device_standby/utils/policy:standby_utils_policy_static` | [foundation/resourceschedule/device_standby/utils/policy/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/policy/BUILD.gn) | 62 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/device_standby/utils/policy:stancby_service_policy_config_device_standby` | [foundation/resourceschedule/device_standby/utils/policy/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/policy/BUILD.gn) | 89 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/device_standby/utils/policy:stancby_service_policy_config_resource_config` | [foundation/resourceschedule/device_standby/utils/policy/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/policy/BUILD.gn) | 97 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/device_standby/utils/policy:standby_service_config` | [foundation/resourceschedule/device_standby/utils/policy/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/policy/BUILD.gn) | 105 |
| build-support | `config` | `//foundation/resourceschedule/device_standby/utils/common:standby_utils_common_config` | [foundation/resourceschedule/device_standby/utils/common/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/common/BUILD.gn) | 15 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_standby/utils/common:standby_utils_common` | [foundation/resourceschedule/device_standby/utils/common/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/common/BUILD.gn) | 19 |
| test | `group` | `//foundation/resourceschedule/device_standby/utils/test/fuzztest:fuzztest` | [foundation/resourceschedule/device_standby/utils/test/fuzztest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/test/fuzztest/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_standby/utils/test/fuzztest/configmanager_fuzzer:ConfigManagerFuzzTest` | [foundation/resourceschedule/device_standby/utils/test/fuzztest/configmanager_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/test/fuzztest/configmanager_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/resourceschedule/device_standby/utils/test/fuzztest/configmanager_fuzzer:fuzztest` | [foundation/resourceschedule/device_standby/utils/test/fuzztest/configmanager_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/utils/test/fuzztest/configmanager_fuzzer/BUILD.gn) | 59 |
| build-support | `config` | `//foundation/resourceschedule/device_standby/interfaces/kits:standby_napi_public_config` | [foundation/resourceschedule/device_standby/interfaces/kits/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/kits/BUILD.gn) | 19 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_standby/interfaces/kits:devicestandby` | [foundation/resourceschedule/device_standby/interfaces/kits/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/kits/BUILD.gn) | 23 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/resourceschedule/device_standby/interfaces/kits/ani:copy_device_standby` | [foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn) | 21 |
| production | `ohos_taihe` | `//foundation/resourceschedule/device_standby/interfaces/kits/ani:run_taihe` | [foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn) | 27 |
| production | `taihe_shared_library` | `//foundation/resourceschedule/device_standby/interfaces/kits/ani:device_standby_ani` | [foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn) | 36 |
| aggregate-codegen | `generate_static_abc` | `//foundation/resourceschedule/device_standby/interfaces/kits/ani:device_standby_abc` | [foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn) | 76 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/device_standby/interfaces/kits/ani:device_standby_etc` | [foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn) | 84 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/device_standby/interfaces/kits/ani:device_standby_taihe` | [foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/kits/ani/BUILD.gn) | 94 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/device_standby/interfaces:standby_interfaces` | [foundation/resourceschedule/device_standby/interfaces/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/BUILD.gn) | 14 |
| production | `idl_gen_interface` | `//foundation/resourceschedule/device_standby/interfaces/innerkits:standby_service_interface` | [foundation/resourceschedule/device_standby/interfaces/innerkits/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/innerkits/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/resourceschedule/device_standby/interfaces/innerkits:standby_innerkits_public_config` | [foundation/resourceschedule/device_standby/interfaces/innerkits/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/innerkits/BUILD.gn) | 30 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_standby/interfaces/innerkits:standby_innerkits` | [foundation/resourceschedule/device_standby/interfaces/innerkits/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/innerkits/BUILD.gn) | 39 |
| production | `ohos_source_set` | `//foundation/resourceschedule/device_standby/interfaces/innerkits:device_standby_stub` | [foundation/resourceschedule/device_standby/interfaces/innerkits/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/innerkits/BUILD.gn) | 87 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_standby/interfaces/innerkits/test/unittest:standby_client_unit_test` | [foundation/resourceschedule/device_standby/interfaces/innerkits/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/innerkits/test/unittest/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_standby/interfaces/innerkits/test/unittest:mock_standby_client_unit_test` | [foundation/resourceschedule/device_standby/interfaces/innerkits/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/innerkits/test/unittest/BUILD.gn) | 55 |
| test | `group` | `//foundation/resourceschedule/device_standby/interfaces/innerkits/test/unittest:unittest` | [foundation/resourceschedule/device_standby/interfaces/innerkits/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/interfaces/innerkits/test/unittest/BUILD.gn) | 91 |
| build-support | `config` | `//foundation/resourceschedule/device_standby/services:standby_service_public_config` | [foundation/resourceschedule/device_standby/services/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_standby/services:standby_service` | [foundation/resourceschedule/device_standby/services/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/BUILD.gn) | 26 |
| production | `ohos_static_library` | `//foundation/resourceschedule/device_standby/services:standby_service_static` | [foundation/resourceschedule/device_standby/services/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/BUILD.gn) | 116 |
| test | `group` | `//foundation/resourceschedule/device_standby/services/test/fuzztest:fuzztest` | [foundation/resourceschedule/device_standby/services/test/fuzztest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/test/fuzztest/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_standby/services/test/fuzztest/devicestandby_fuzzer:DeviceStandbyFuzzTest` | [foundation/resourceschedule/device_standby/services/test/fuzztest/devicestandby_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/test/fuzztest/devicestandby_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/resourceschedule/device_standby/services/test/fuzztest/devicestandby_fuzzer:fuzztest` | [foundation/resourceschedule/device_standby/services/test/fuzztest/devicestandby_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/test/fuzztest/devicestandby_fuzzer/BUILD.gn) | 92 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_standby/services/test/unittest:standby_service_unit_test` | [foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_standby/services/test/unittest:standby_utils_unit_test` | [foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn) | 86 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_standby/services/test/unittest:standby_helper_unit_test` | [foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn) | 147 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_standby/services/test/unittest:mock_standby_helper_unit_test` | [foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn) | 203 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_standby/services/test/unittest:mock_standby_service_unit_test` | [foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn) | 256 |
| test | `group` | `//foundation/resourceschedule/device_standby/services/test/unittest:unittest` | [foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/services/test/unittest/BUILD.gn) | 316 |
| build-support | `config` | `//foundation/resourceschedule/device_standby/plugins:standby_plugin_config` | [foundation/resourceschedule/device_standby/plugins/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/device_standby/plugins:standby_plugin` | [foundation/resourceschedule/device_standby/plugins/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/BUILD.gn) | 126 |
| production | `ohos_static_library` | `//foundation/resourceschedule/device_standby/plugins:standby_plugin_static` | [foundation/resourceschedule/device_standby/plugins/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/BUILD.gn) | 163 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/device_standby/plugins:standby_plugin_group` | [foundation/resourceschedule/device_standby/plugins/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/BUILD.gn) | 190 |
| test | `group` | `//foundation/resourceschedule/device_standby/plugins/test/fuzztest:fuzztest` | [foundation/resourceschedule/device_standby/plugins/test/fuzztest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/test/fuzztest/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/resourceschedule/device_standby/plugins/test/fuzztest/statemanageradapter_fuzzer:StateManagerAdapterFuzzTest` | [foundation/resourceschedule/device_standby/plugins/test/fuzztest/statemanageradapter_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/test/fuzztest/statemanageradapter_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/resourceschedule/device_standby/plugins/test/fuzztest/statemanageradapter_fuzzer:fuzztest` | [foundation/resourceschedule/device_standby/plugins/test/fuzztest/statemanageradapter_fuzzer/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/test/fuzztest/statemanageradapter_fuzzer/BUILD.gn) | 82 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_standby/plugins/test/unittest:standby_plugin_unit_test` | [foundation/resourceschedule/device_standby/plugins/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/test/unittest/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_standby/plugins/test/unittest:standby_plugin_strategy_test` | [foundation/resourceschedule/device_standby/plugins/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/test/unittest/BUILD.gn) | 102 |
| test | `ohos_unittest` | `//foundation/resourceschedule/device_standby/plugins/test/unittest:standby_plugin_constraints_test` | [foundation/resourceschedule/device_standby/plugins/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/test/unittest/BUILD.gn) | 180 |
| test | `group` | `//foundation/resourceschedule/device_standby/plugins/test/unittest:unittest` | [foundation/resourceschedule/device_standby/plugins/test/unittest/BUILD.gn](../../../../../../foundation/resourceschedule/device_standby/plugins/test/unittest/BUILD.gn) | 228 |

## 查询命令

```bash
awk -F '\t' '$1 == "resourceschedule" && $2 == "device_standby"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
