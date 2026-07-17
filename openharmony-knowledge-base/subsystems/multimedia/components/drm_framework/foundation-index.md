# drm_framework：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `multimedia` |
| component | `drm_framework` |
| Git 子仓 | `foundation/multimedia/drm_framework` |
| bundle | [foundation/multimedia/drm_framework/bundle.json](../../../../../../foundation/multimedia/drm_framework/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 26 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 5 |
| declared test entries | 3 |

## 依赖

组件依赖：`ability_base`, `ability_runtime`, `access_token`, `curl`, `safwk`, `napi`, `samgr`, `hitrace`, `ipc`, `hisysevent`, `c_utils`, `hilog`, `hidumper`, `hicollie`, `hdf_core`, `eventhandler`, `bundle_framework`, `drivers_interface_drm`, `memmgr`, `hiappevent`, `json`, `init`, `data_share`, `os_account`, `runtime_core`, `netmanager_base`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/multimedia/drm_framework/frameworks/native/test:drmframeworktest`
- `//foundation/multimedia/drm_framework/frameworks/native/test/unittest:drm_framework_capi_unittest_v1_0`
- `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest:drm_framework_capi_fuzztest_v1_0`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 15 |
| test | 8 |
| build-support | 12 |
| aggregate-codegen | 5 |
| total | 40 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/multimedia/drm_framework:multimedia_drm_framework` | [foundation/multimedia/drm_framework/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/BUILD.gn) | 16 |
| production | `ohos_sa_profile` | `//foundation/multimedia/drm_framework/sa_profile:drm_service_sa_profile` | [foundation/multimedia/drm_framework/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/sa_profile/BUILD.gn) | 17 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/multimedia/drm_framework/frameworks/taihe:copy_drm_taihe` | [foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn) | 24 |
| production | `ohos_taihe` | `//foundation/multimedia/drm_framework/frameworks/taihe:run_drm_taihe` | [foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn) | 30 |
| build-support | `config` | `//foundation/multimedia/drm_framework/frameworks/taihe:drm_taihe_config` | [foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn) | 39 |
| production | `taihe_shared_library` | `//foundation/multimedia/drm_framework/frameworks/taihe:drm_taihe` | [foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn) | 44 |
| aggregate-codegen | `generate_static_abc` | `//foundation/multimedia/drm_framework/frameworks/taihe:drm_framework_taihe_abc` | [foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn) | 97 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/drm_framework/frameworks/taihe:drm_framework_etc` | [foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn) | 105 |
| aggregate-codegen | `group` | `//foundation/multimedia/drm_framework/frameworks/taihe:drm_framework_taihe` | [foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/taihe/BUILD.gn) | 115 |
| build-support | `config` | `//foundation/multimedia/drm_framework/frameworks/native:drm_framework_public_config` | [foundation/multimedia/drm_framework/frameworks/native/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/BUILD.gn) | 19 |
| build-support | `config` | `//foundation/multimedia/drm_framework/frameworks/native:drm_framework_local_config` | [foundation/multimedia/drm_framework/frameworks/native/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/BUILD.gn) | 26 |
| production | `ohos_shared_library` | `//foundation/multimedia/drm_framework/frameworks/native:drm_framework` | [foundation/multimedia/drm_framework/frameworks/native/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/BUILD.gn) | 36 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/drm_framework/frameworks/native:drm_api_operation` | [foundation/multimedia/drm_framework/frameworks/native/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/BUILD.gn) | 100 |
| build-support | `config` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndk_fuzzer:drm_framework_capi_fuzztest_system_config` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndk_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndk_fuzzer/BUILD.gn) | 18 |
| test | `ohos_fuzztest` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndk_fuzzer:mediakeysystemndkFuzzTest` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndk_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndk_fuzzer/BUILD.gn) | 41 |
| build-support | `config` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/drmservice_fuzzer:drm_framework_capi_fuzztest_systenfactory_config` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/drmservice_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/drmservice_fuzzer/BUILD.gn) | 19 |
| test | `ohos_fuzztest` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/drmservice_fuzzer:drmserviceFuzzTest` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/drmservice_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/drmservice_fuzzer/BUILD.gn) | 39 |
| test | `group` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest:drm_framework_capi_fuzztest_v1_0` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndkfactory_fuzzer:drm_framework_capi_fuzztest_systenfactory_config` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndkfactory_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndkfactory_fuzzer/BUILD.gn) | 19 |
| test | `ohos_fuzztest` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndkfactory_fuzzer:mediakeysystemndkfactoryFuzzTest` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndkfactory_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysystemndkfactory_fuzzer/BUILD.gn) | 41 |
| build-support | `config` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeydecryptndk_fuzzer:drm_framework_capi_fuzztest_decrypt_config` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeydecryptndk_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeydecryptndk_fuzzer/BUILD.gn) | 18 |
| test | `ohos_fuzztest` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeydecryptndk_fuzzer:mediakeydecryptndkFuzzTest` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeydecryptndk_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeydecryptndk_fuzzer/BUILD.gn) | 41 |
| build-support | `config` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysessionndk_fuzzer:drm_framework_capi_fuzztest_session_config` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysessionndk_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysessionndk_fuzzer/BUILD.gn) | 18 |
| test | `ohos_fuzztest` | `//foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysessionndk_fuzzer:mediakeysessionndkFuzzTest` | [foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysessionndk_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/fuzztest/mediakeysessionndk_fuzzer/BUILD.gn) | 42 |
| test | `group` | `//foundation/multimedia/drm_framework/frameworks/native/test:drmframeworktest` | [foundation/multimedia/drm_framework/frameworks/native/test/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/multimedia/drm_framework/frameworks/native/test/unittest:drm_framework_capi_unittest_v1_0_config` | [foundation/multimedia/drm_framework/frameworks/native/test/unittest/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/multimedia/drm_framework/frameworks/native/test/unittest:drm_framework_capi_unittest_v1_0` | [foundation/multimedia/drm_framework/frameworks/native/test/unittest/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/frameworks/native/test/unittest/BUILD.gn) | 45 |
| build-support | `config` | `//foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi:drm_capi_common_config` | [foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi/BUILD.gn) | 15 |
| build-support | `config` | `//foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi:drm_capi_common_public_config` | [foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi/BUILD.gn) | 46 |
| production | `ohos_shared_library` | `//foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi:native_drm` | [foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi/BUILD.gn) | 55 |
| production | `js_declaration` | `//foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi:drm_js` | [foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi/BUILD.gn) | 17 |
| aggregate-codegen | `ohos_copy` | `//foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi:drm_declaration` | [foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi/BUILD.gn) | 22 |
| production | `ohos_shared_library` | `//foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi:drm_napi` | [foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi/BUILD.gn) | 31 |
| production | `ohos_shared_library` | `//foundation/multimedia/drm_framework/services/drm_service:drm_service` | [foundation/multimedia/drm_framework/services/drm_service/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/services/drm_service/BUILD.gn) | 15 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/drm_framework/services/drm_service:drm_plugin_lazyloding` | [foundation/multimedia/drm_framework/services/drm_service/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/services/drm_service/BUILD.gn) | 113 |
| production | `idl_gen_interface` | `//foundation/multimedia/drm_framework/services/drm_service/idls:drm_service_idl_interface` | [foundation/multimedia/drm_framework/services/drm_service/idls/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/services/drm_service/idls/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/multimedia/drm_framework/services/drm_service/idls:drm_sa_idl_config` | [foundation/multimedia/drm_framework/services/drm_service/idls/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/services/drm_service/idls/BUILD.gn) | 41 |
| production | `ohos_source_set` | `//foundation/multimedia/drm_framework/services/drm_service/idls:idl_sa_proxy` | [foundation/multimedia/drm_framework/services/drm_service/idls/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/services/drm_service/idls/BUILD.gn) | 48 |
| production | `ohos_source_set` | `//foundation/multimedia/drm_framework/services/drm_service/idls:idl_sa_stub` | [foundation/multimedia/drm_framework/services/drm_service/idls/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/services/drm_service/idls/BUILD.gn) | 96 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/drm_framework/services/etc:drm_service.rc` | [foundation/multimedia/drm_framework/services/etc/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/services/etc/BUILD.gn) | 17 |

## 查询命令

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "drm_framework"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
