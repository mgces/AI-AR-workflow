# connected_nfc_tag：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `communication` |
| component | `connected_nfc_tag` |
| Git 子仓 | `foundation/communication/connected_nfc_tag` |
| bundle | [foundation/communication/connected_nfc_tag/bundle.json](../../../../../../foundation/communication/connected_nfc_tag/bundle.json) |
| rk3568 selected | no |
| adapted systems | standard |
| component dependencies | 10 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 1 |
| declared test entries | 1 |

## 依赖

组件依赖：`ipc`, `c_utils`, `hilog`, `napi`, `access_token`, `hisysevent`, `safwk`, `samgr`, `hdf_core`, `drivers_interface_connected_nfc_tag`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/communication/connected_nfc_tag/test:test_connected_nfc_tag`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 7 |
| test | 23 |
| build-support | 3 |
| aggregate-codegen | 1 |
| total | 34 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_sa_profile` | `//foundation/communication/connected_nfc_tag/sa_profile:nfc_tag_profile` | [foundation/communication/connected_nfc_tag/sa_profile/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/sa_profile/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/communication/connected_nfc_tag/frameworks/js/napi:connectedtag` | [foundation/communication/connected_nfc_tag/frameworks/js/napi/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/frameworks/js/napi/BUILD.gn) | 18 |
| production | `ohos_static_library` | `//foundation/communication/connected_nfc_tag/utils/sa_listener:nfc_tag_sa_listener` | [foundation/communication/connected_nfc_tag/utils/sa_listener/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/utils/sa_listener/BUILD.gn) | 17 |
| test | `ohos_static_library` | `//foundation/communication/connected_nfc_tag/utils/sa_listener:nfc_tag_sa_listener_test` | [foundation/communication/connected_nfc_tag/utils/sa_listener/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/utils/sa_listener/BUILD.gn) | 44 |
| build-support | `config` | `//foundation/communication/connected_nfc_tag/interfaces/inner_api:nfc_tag_config` | [foundation/communication/connected_nfc_tag/interfaces/inner_api/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/interfaces/inner_api/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/communication/connected_nfc_tag/interfaces/inner_api:nfc_tag_public_config` | [foundation/communication/connected_nfc_tag/interfaces/inner_api/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/interfaces/inner_api/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//foundation/communication/connected_nfc_tag/interfaces/inner_api:nfc_tag_inner_kits` | [foundation/communication/connected_nfc_tag/interfaces/inner_api/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/interfaces/inner_api/BUILD.gn) | 28 |
| test | `ohos_static_library` | `//foundation/communication/connected_nfc_tag/interfaces/inner_api:nfc_tag_inner_kits_test` | [foundation/communication/connected_nfc_tag/interfaces/inner_api/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/interfaces/inner_api/BUILD.gn) | 55 |
| production | `ohos_static_library` | `//foundation/communication/connected_nfc_tag/services/src/hdi:nfc_tag_hdi_adapter` | [foundation/communication/connected_nfc_tag/services/src/hdi/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/services/src/hdi/BUILD.gn) | 18 |
| test | `ohos_static_library` | `//foundation/communication/connected_nfc_tag/services/src/hdi:nfc_tag_hdi_adapter_test` | [foundation/communication/connected_nfc_tag/services/src/hdi/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/services/src/hdi/BUILD.gn) | 53 |
| production | `ohos_shared_library` | `//foundation/communication/connected_nfc_tag/services:nfc_tag_service` | [foundation/communication/connected_nfc_tag/services/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/services/BUILD.gn) | 47 |
| test | `ohos_static_library` | `//foundation/communication/connected_nfc_tag/services:nfc_tag_service_test` | [foundation/communication/connected_nfc_tag/services/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/services/BUILD.gn) | 72 |
| aggregate-codegen | `group` | `//foundation/communication/connected_nfc_tag/services/etc/init:etc` | [foundation/communication/connected_nfc_tag/services/etc/init/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/services/etc/init/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/communication/connected_nfc_tag/services/etc/init:nfc_tag_service.rc` | [foundation/communication/connected_nfc_tag/services/etc/init/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/services/etc/init/BUILD.gn) | 21 |
| test | `group` | `//foundation/communication/connected_nfc_tag/test/fuzztest:fuzztest` | [foundation/communication/connected_nfc_tag/test/fuzztest/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/fuzztest/BUILD.gn) | 16 |
| test | `ohos_fuzztest` | `//foundation/communication/connected_nfc_tag/test/fuzztest/service_fuzzer:ServiceFuzzTest` | [foundation/communication/connected_nfc_tag/test/fuzztest/service_fuzzer/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/fuzztest/service_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/communication/connected_nfc_tag/test/fuzztest/service_fuzzer:fuzztest` | [foundation/communication/connected_nfc_tag/test/fuzztest/service_fuzzer/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/fuzztest/service_fuzzer/BUILD.gn) | 51 |
| test | `ohos_fuzztest` | `//foundation/communication/connected_nfc_tag/test/fuzztest/framework_fuzzer:FrameworkFuzzTest` | [foundation/communication/connected_nfc_tag/test/fuzztest/framework_fuzzer/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/fuzztest/framework_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/communication/connected_nfc_tag/test/fuzztest/framework_fuzzer:fuzztest` | [foundation/communication/connected_nfc_tag/test/fuzztest/framework_fuzzer/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/fuzztest/framework_fuzzer/BUILD.gn) | 51 |
| test | `group` | `//foundation/communication/connected_nfc_tag/test:test_connected_nfc_tag` | [foundation/communication/connected_nfc_tag/test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/BUILD.gn) | 16 |
| test | `ohos_static_library` | `//foundation/communication/connected_nfc_tag/test/utils:test_utils_static` | [foundation/communication/connected_nfc_tag/test/utils/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/utils/BUILD.gn) | 20 |
| test | `group` | `//foundation/communication/connected_nfc_tag/test/unittest/framework_test:nfc_tag_framework_unittest` | [foundation/communication/connected_nfc_tag/test/unittest/framework_test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/framework_test/BUILD.gn) | 16 |
| test | `ohos_unittest` | `//foundation/communication/connected_nfc_tag/test/unittest/framework_test/nfc_tag_proxy_test:nfc_tag_proxy_unittest` | [foundation/communication/connected_nfc_tag/test/unittest/framework_test/nfc_tag_proxy_test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/framework_test/nfc_tag_proxy_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/communication/connected_nfc_tag/test/unittest/framework_test/nfc_tag_callback_stub_test:nfc_tag_callback_stub_unittest` | [foundation/communication/connected_nfc_tag/test/unittest/framework_test/nfc_tag_callback_stub_test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/framework_test/nfc_tag_callback_stub_test/BUILD.gn) | 19 |
| build-support | `config` | `//foundation/communication/connected_nfc_tag/test/unittest/common_mock:common_mock_config` | [foundation/communication/connected_nfc_tag/test/unittest/common_mock/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/common_mock/BUILD.gn) | 19 |
| test | `ohos_static_library` | `//foundation/communication/connected_nfc_tag/test/unittest/common_mock:nfc_tag_common_mock` | [foundation/communication/connected_nfc_tag/test/unittest/common_mock/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/common_mock/BUILD.gn) | 23 |
| test | `ohos_unittest` | `//foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_hdi_adapter_test:nfc_tag_hdi_adapter_unittest` | [foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_hdi_adapter_test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_hdi_adapter_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_sys_perm_test:nfc_tag_sys_perm_unittest` | [foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_sys_perm_test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_sys_perm_test/BUILD.gn) | 19 |
| test | `group` | `//foundation/communication/connected_nfc_tag/test/unittest/service_test:nfc_tag_service_unittest` | [foundation/communication/connected_nfc_tag/test/unittest/service_test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/service_test/BUILD.gn) | 16 |
| test | `ohos_unittest` | `//foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_callback_proxy_test:nfc_tag_callback_proxy_unittest` | [foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_callback_proxy_test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_callback_proxy_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_service_test:nfc_tag_service_unittest` | [foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_service_test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_service_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_utils_test:nfc_tag_utils_unittest` | [foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_utils_test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_utils_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_stub_test:nfc_tag_stub_unittest` | [foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_stub_test/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/service_test/nfc_tag_stub_test/BUILD.gn) | 19 |
| test | `group` | `//foundation/communication/connected_nfc_tag/test/unittest:unittest` | [foundation/communication/connected_nfc_tag/test/unittest/BUILD.gn](../../../../../../foundation/communication/connected_nfc_tag/test/unittest/BUILD.gn) | 16 |

## 查询命令

```bash
awk -F '\t' '$1 == "communication" && $2 == "connected_nfc_tag"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
