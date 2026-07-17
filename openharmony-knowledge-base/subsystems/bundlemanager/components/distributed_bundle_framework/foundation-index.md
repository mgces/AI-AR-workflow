# distributed_bundle_framework：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `bundlemanager` |
| component | `distributed_bundle_framework` |
| Git 子仓 | `foundation/bundlemanager/distributed_bundle_framework` |
| bundle | [foundation/bundlemanager/distributed_bundle_framework/bundle.json](../../../../../../foundation/bundlemanager/distributed_bundle_framework/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 23 |
| third-party dependencies | 0 |
| declared sub_component | 4 |
| inner kits | 1 |
| declared test entries | 1 |

## 依赖

组件依赖：`ability_base`, `access_token`, `bundle_framework`, `cJSON`, `c_utils`, `dsoftbus`, `hisysevent`, `hilog`, `i18n`, `ipc`, `image_framework`, `napi`, `os_account`, `resource_management`, `runtime_core`, `safwk`, `samgr`, `selinux_adapter`, `common_event_service`, `device_manager`, `hicollie`, `init`, `kv_store`

三方依赖：无声明

## 声明构建入口

- `//foundation/bundlemanager/distributed_bundle_framework:ani_dbms_packages`
- `//foundation/bundlemanager/distributed_bundle_framework:inner_api_target`
- `//foundation/bundlemanager/distributed_bundle_framework:jsapi_target`
- `//foundation/bundlemanager/distributed_bundle_framework:dbms_target`

## 声明测试入口

- `//foundation/bundlemanager/distributed_bundle_framework:test_target`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 10 |
| test | 13 |
| build-support | 2 |
| aggregate-codegen | 11 |
| total | 36 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/bundlemanager/distributed_bundle_framework:ani_dbms_packages` | [foundation/bundlemanager/distributed_bundle_framework/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/BUILD.gn) | 16 |
| aggregate-codegen | `group` | `//foundation/bundlemanager/distributed_bundle_framework:inner_api_target` | [foundation/bundlemanager/distributed_bundle_framework/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/BUILD.gn) | 20 |
| aggregate-codegen | `group` | `//foundation/bundlemanager/distributed_bundle_framework:jsapi_target` | [foundation/bundlemanager/distributed_bundle_framework/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/BUILD.gn) | 24 |
| aggregate-codegen | `group` | `//foundation/bundlemanager/distributed_bundle_framework:dbms_target` | [foundation/bundlemanager/distributed_bundle_framework/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/BUILD.gn) | 31 |
| test | `group` | `//foundation/bundlemanager/distributed_bundle_framework:test_target` | [foundation/bundlemanager/distributed_bundle_framework/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/BUILD.gn) | 38 |
| production | `ohos_shared_library` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager:ani_distributed_bundle_manager` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn) | 18 |
| aggregate-codegen | `generate_static_abc` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager:distributed_bundle_manager` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn) | 78 |
| production | `ohos_prebuilt_etc` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager:distributed_bundle_manager_etc` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn) | 85 |
| aggregate-codegen | `generate_static_abc` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager:remote_ability_info` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn) | 93 |
| production | `ohos_prebuilt_etc` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager:remote_ability_info_etc` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn) | 103 |
| aggregate-codegen | `group` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager:ani_dbms_packages` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/ani/distributed_bundle_manager/BUILD.gn) | 111 |
| production | `ohos_shared_library` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributedBundle:distributed_bundle_common` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributedBundle/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributedBundle/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributedBundle:distributedbundlemanager` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributedBundle/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributedBundle/BUILD.gn) | 65 |
| aggregate-codegen | `group` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributedBundle:jsapi_target` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributedBundle/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributedBundle/BUILD.gn) | 120 |
| production | `ohos_shared_library` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributebundlemgr:distributedbundle` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributebundlemgr/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributebundlemgr/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributebundlemgr:jsapi_target` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributebundlemgr/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/kits/js/distributebundlemgr/BUILD.gn) | 67 |
| build-support | `config` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/inner_api:dbms_fwk_config` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/inner_api/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/inner_api/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/bundlemanager/distributed_bundle_framework/interfaces/inner_api:dbms_fwk` | [foundation/bundlemanager/distributed_bundle_framework/interfaces/inner_api/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/interfaces/inner_api/BUILD.gn) | 21 |
| aggregate-codegen | `group` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms:dbms_target` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms:distributed_bms_config` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/BUILD.gn) | 23 |
| production | `ohos_shared_library` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms:libdbms` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/BUILD.gn) | 27 |
| aggregate-codegen | `group` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile:distributedbms` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile/BUILD.gn) | 17 |
| production | `ohos_sa_profile` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile:distributedbms_sa_profile` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile/BUILD.gn) | 24 |
| production | `ohos_prebuilt_etc` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile:distributedbms.cfg` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/sa_profile/BUILD.gn) | 30 |
| test | `group` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/test:unittest` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/BUILD.gn) | 14 |
| test | `ohos_unittest` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/dbms_services_kit_test:DbmsServicesKitTest` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/dbms_services_kit_test/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/dbms_services_kit_test/BUILD.gn) | 18 |
| test | `group` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/dbms_services_kit_test:unittest` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/dbms_services_kit_test/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/dbms_services_kit_test/BUILD.gn) | 96 |
| test | `ohos_unittest` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/distributed_bms_host_test:DistributedBmsHostTest` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/distributed_bms_host_test/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/distributed_bms_host_test/BUILD.gn) | 18 |
| test | `group` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/distributed_bms_host_test:unittest` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/distributed_bms_host_test/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/unittest/distributed_bms_host_test/BUILD.gn) | 77 |
| test | `group` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject:test_hap` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/BUILD.gn) | 14 |
| test | `group` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/unittest:unittest_hap` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/unittest/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/unittest/BUILD.gn) | 14 |
| test | `ohos_copy` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/unittest/ohos_test:copy_ohos_test` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/unittest/ohos_test/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/unittest/ohos_test/BUILD.gn) | 17 |
| test | `ohos_app` | `//foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/unittest/system_module:distributed_system_module` | [foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/unittest/system_module/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/services/dbms/test/sceneProject/unittest/system_module/BUILD.gn) | 17 |
| test | `group` | `//foundation/bundlemanager/distributed_bundle_framework/test/fuzztest:fuzztest` | [foundation/bundlemanager/distributed_bundle_framework/test/fuzztest/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/test/fuzztest/BUILD.gn) | 16 |
| test | `ohos_fuzztest` | `//foundation/bundlemanager/distributed_bundle_framework/test/fuzztest/distributeddatastorage_fuzzer:DistributedDataStorageFuzzTest` | [foundation/bundlemanager/distributed_bundle_framework/test/fuzztest/distributeddatastorage_fuzzer/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/test/fuzztest/distributeddatastorage_fuzzer/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/bundlemanager/distributed_bundle_framework/test/fuzztest/distributedbmshost_fuzzer:DistributedBmsHostFuzzTest` | [foundation/bundlemanager/distributed_bundle_framework/test/fuzztest/distributedbmshost_fuzzer/BUILD.gn](../../../../../../foundation/bundlemanager/distributed_bundle_framework/test/fuzztest/distributedbmshost_fuzzer/BUILD.gn) | 22 |

## 查询命令

```bash
awk -F '\t' '$1 == "bundlemanager" && $2 == "distributed_bundle_framework"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
