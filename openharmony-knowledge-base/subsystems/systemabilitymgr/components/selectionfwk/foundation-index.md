# selectionfwk：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `systemabilitymgr` |
| component | `selectionfwk` |
| Git 子仓 | `foundation/systemabilitymgr/selectionfwk` |
| bundle | [foundation/systemabilitymgr/selectionfwk/bundle.json](../../../../../../foundation/systemabilitymgr/selectionfwk/bundle.json) |
| rk3568 selected | yes |
| adapted systems | mini,small,standard |
| component dependencies | 32 |
| third-party dependencies | 0 |
| declared sub_component | 16 |
| inner kits | 1 |
| declared test entries | 2 |

## 依赖

组件依赖：`c_utils`, `eventhandler`, `ipc`, `safwk`, `hilog`, `hitrace`, `samgr`, `icu`, `init`, `input`, `napi`, `ability_base`, `ability_runtime`, `access_token`, `window_manager`, `pasteboard`, `relational_store`, `resource_management`, `graphic_2d`, `bundle_framework`, `ffrt`, `config_policy`, `os_account`, `cJSON`, `common_event_service`, `hicollie`, `hisysevent`, `memmgr`, `resource_schedule_service`, `hiappevent`, `udmf`, `runtime_core`

三方依赖：无声明

## 声明构建入口

- `//foundation/systemabilitymgr/selectionfwk/common:selection_common`
- `//foundation/systemabilitymgr/selectionfwk/etc/init:selection_service_cfg`
- `//foundation/systemabilitymgr/selectionfwk/etc/para:selection_para`
- `//foundation/systemabilitymgr/selectionfwk/etc/para:selection_para_dac`
- `//foundation/systemabilitymgr/selectionfwk/service:selection_service`
- `//foundation/systemabilitymgr/selectionfwk/service/plugins:selection_plugins_impl`
- `//foundation/systemabilitymgr/selectionfwk/sa_profile:selection_service_sa_profile`
- `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_panel:selectionpanel_napi`
- `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability:selectionextensionability_napi`
- `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context:selectionextensioncontext_napi`
- `//foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_extension:selection_extension_ability_native`
- `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_ability:selectionmanager_napi`
- `//foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_ability:selection_ability`
- `//foundation/systemabilitymgr/selectionfwk/interfaces/inner_kits/selection_client:selection_client`
- `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe:selection_taihe_group`
- `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/ets:selection_extension_ability_etc`

## 声明测试入口

- `//foundation/systemabilitymgr/selectionfwk/test/unittest:selection_manager_ut`
- `//foundation/systemabilitymgr/selectionfwk/test/fuzztest:selection_service_fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 31 |
| test | 9 |
| build-support | 8 |
| aggregate-codegen | 13 |
| total | 61 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/systemabilitymgr/selectionfwk/common:selection_js_common_public_config` | [foundation/systemabilitymgr/selectionfwk/common/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/common/BUILD.gn) | 17 |
| production | `ohos_static_library` | `//foundation/systemabilitymgr/selectionfwk/common:selection_common` | [foundation/systemabilitymgr/selectionfwk/common/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/common/BUILD.gn) | 24 |
| production | `ohos_sa_profile` | `//foundation/systemabilitymgr/selectionfwk/sa_profile:selection_service_sa_profile` | [foundation/systemabilitymgr/selectionfwk/sa_profile/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/sa_profile/BUILD.gn) | 17 |
| aggregate-codegen | `generate_static_abc` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/ets:selection_extension_ability_ani` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/ets/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/ets/BUILD.gn) | 18 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/ets:selection_extension_ability_prebuilt` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/ets/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/ets/BUILD.gn) | 29 |
| aggregate-codegen | `group` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/ets:selection_extension_ability_etc` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/ets/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/ets/BUILD.gn) | 37 |
| aggregate-codegen | `group` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe:selection_taihe_group` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/BUILD.gn) | 15 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel:copy_selectionPanel` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel/BUILD.gn) | 17 |
| production | `ohos_taihe` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel:run_taihe` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel/BUILD.gn) | 24 |
| aggregate-codegen | `generate_static_abc` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel:SelectionPanel` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel/BUILD.gn) | 33 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel:selectionPanel_etc` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel/BUILD.gn) | 41 |
| aggregate-codegen | `group` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel:selectionPanel_taihe` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionPanel/BUILD.gn) | 49 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager:copy_selectionManager` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn) | 18 |
| production | `ohos_taihe` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager:run_taihe` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn) | 25 |
| production | `taihe_shared_library` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager:selectionManager_taihe_native` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn) | 34 |
| aggregate-codegen | `generate_static_abc` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager:selectionManager` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn) | 96 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager:selectionManager_etc` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn) | 104 |
| aggregate-codegen | `group` | `//foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager:selectionManager_taihe` | [foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/ets/taihe/SelectionManager/BUILD.gn) | 112 |
| build-support | `config` | `//foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_ability:selection_listener_config` | [foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_ability/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_ability:selection_ability` | [foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_ability/BUILD.gn) | 28 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_extension:selection_extension_ability_native` | [foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_extension/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/native/selection_extension/BUILD.gn) | 17 |
| production | `es2abc_gen_abc` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context:gen_selection_extension_context_abc` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context/BUILD.gn) | 18 |
| aggregate-codegen | `gen_js_obj` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context:selection_extension_context_js` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context/BUILD.gn) | 26 |
| aggregate-codegen | `gen_js_obj` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context:selection_extension_context_abc` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context/BUILD.gn) | 31 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context:selectionextensioncontext_napi` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_context/BUILD.gn) | 39 |
| build-support | `config` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_panel:selection_panel_config` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_panel/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_panel/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_panel:selectionpanel_napi` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_panel/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_panel/BUILD.gn) | 27 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_ability:selectionmanager_napi` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_ability/BUILD.gn) | 17 |
| production | `es2abc_gen_abc` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability:gen_selection_extension_ability_abc` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability/BUILD.gn) | 17 |
| aggregate-codegen | `gen_js_obj` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability:selection_extension_ability_js` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability/BUILD.gn) | 25 |
| aggregate-codegen | `gen_js_obj` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability:selection_extension_ability_abc` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability/BUILD.gn) | 30 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability:selectionextensionability_napi` | [foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/frameworks/js/napi/selection_extension_ability/BUILD.gn) | 37 |
| production | `idl_gen_interface` | `//foundation/systemabilitymgr/selectionfwk/interfaces/idl:selection_listener_interface` | [foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn) | 18 |
| production | `idl_gen_interface` | `//foundation/systemabilitymgr/selectionfwk/interfaces/idl:selection_service_interface` | [foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/systemabilitymgr/selectionfwk/interfaces/idl:selection_listener_config` | [foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn) | 26 |
| build-support | `config` | `//foundation/systemabilitymgr/selectionfwk/interfaces/idl:selection_service_config` | [foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn) | 34 |
| production | `ohos_source_set` | `//foundation/systemabilitymgr/selectionfwk/interfaces/idl:selection_listener_proxy` | [foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn) | 42 |
| production | `ohos_source_set` | `//foundation/systemabilitymgr/selectionfwk/interfaces/idl:selection_listener_stub` | [foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn) | 75 |
| production | `ohos_source_set` | `//foundation/systemabilitymgr/selectionfwk/interfaces/idl:selection_service_proxy` | [foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn) | 108 |
| production | `ohos_source_set` | `//foundation/systemabilitymgr/selectionfwk/interfaces/idl:selection_service_stub` | [foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces/idl/BUILD.gn) | 141 |
| build-support | `config` | `//foundation/systemabilitymgr/selectionfwk/interfaces/inner_kits/selection_client:selection_client_native_public_config` | [foundation/systemabilitymgr/selectionfwk/interfaces/inner_kits/selection_client/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces/inner_kits/selection_client/BUILD.gn) | 18 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/selectionfwk/interfaces/inner_kits/selection_client:selection_client` | [foundation/systemabilitymgr/selectionfwk/interfaces/inner_kits/selection_client/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/interfaces/inner_kits/selection_client/BUILD.gn) | 28 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/selectionfwk/etc/para:selection_para` | [foundation/systemabilitymgr/selectionfwk/etc/para/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/etc/para/BUILD.gn) | 16 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/selectionfwk/etc/para:selection_para_dac` | [foundation/systemabilitymgr/selectionfwk/etc/para/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/etc/para/BUILD.gn) | 23 |
| production | `ohos_prebuilt_etc` | `//foundation/systemabilitymgr/selectionfwk/etc/init:selection_service_cfg` | [foundation/systemabilitymgr/selectionfwk/etc/init/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/etc/init/BUILD.gn) | 15 |
| build-support | `config` | `//foundation/systemabilitymgr/selectionfwk/service:selection_sa_config` | [foundation/systemabilitymgr/selectionfwk/service/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/service/BUILD.gn) | 17 |
| production | `ohos_source_set` | `//foundation/systemabilitymgr/selectionfwk/service:selection_service_src` | [foundation/systemabilitymgr/selectionfwk/service/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/service/BUILD.gn) | 25 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/selectionfwk/service:selection_service` | [foundation/systemabilitymgr/selectionfwk/service/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/service/BUILD.gn) | 95 |
| build-support | `config` | `//foundation/systemabilitymgr/selectionfwk/service/plugins:selection_plugins_config` | [foundation/systemabilitymgr/selectionfwk/service/plugins/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/service/plugins/BUILD.gn) | 17 |
| production | `ohos_static_library` | `//foundation/systemabilitymgr/selectionfwk/service/plugins:selection_config_static` | [foundation/systemabilitymgr/selectionfwk/service/plugins/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/service/plugins/BUILD.gn) | 28 |
| production | `ohos_source_set` | `//foundation/systemabilitymgr/selectionfwk/service/plugins:selection_plugins_impl_src` | [foundation/systemabilitymgr/selectionfwk/service/plugins/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/service/plugins/BUILD.gn) | 54 |
| production | `ohos_shared_library` | `//foundation/systemabilitymgr/selectionfwk/service/plugins:selection_plugins_impl` | [foundation/systemabilitymgr/selectionfwk/service/plugins/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/service/plugins/BUILD.gn) | 98 |
| test | `ohos_fuzztest` | `//foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputlistener_fuzzer:SelectionInputListenerFuzzTest` | [foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputlistener_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputlistener_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputlistener_fuzzer:listenerfuzztest` | [foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputlistener_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputlistener_fuzzer/BUILD.gn) | 66 |
| test | `ohos_fuzztest` | `//foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputability_fuzzer:SelectionInputAbilityFuzzTest` | [foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputability_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputability_fuzzer/BUILD.gn) | 22 |
| test | `group` | `//foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputability_fuzzer:fuzztest` | [foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputability_fuzzer/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/test/fuzztest/selectioninputability_fuzzer/BUILD.gn) | 64 |
| test | `group` | `//foundation/systemabilitymgr/selectionfwk/test/fuzztest:selection_service_fuzztest` | [foundation/systemabilitymgr/selectionfwk/test/fuzztest/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/test/fuzztest/BUILD.gn) | 16 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/selectionfwk/test/unittest:selection_service_unit_test` | [foundation/systemabilitymgr/selectionfwk/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/test/unittest/BUILD.gn) | 18 |
| test | `group` | `//foundation/systemabilitymgr/selectionfwk/test/unittest:selection_manager_ut` | [foundation/systemabilitymgr/selectionfwk/test/unittest/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/test/unittest/BUILD.gn) | 101 |
| test | `ohos_unittest` | `//foundation/systemabilitymgr/selectionfwk/test/unittest/mock:selection_service_unit_mock_test` | [foundation/systemabilitymgr/selectionfwk/test/unittest/mock/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/test/unittest/mock/BUILD.gn) | 18 |
| test | `ohos_app` | `//foundation/systemabilitymgr/selectionfwk/test/unittest/PerformanceTest:performanceTest` | [foundation/systemabilitymgr/selectionfwk/test/unittest/PerformanceTest/BUILD.gn](../../../../../../foundation/systemabilitymgr/selectionfwk/test/unittest/PerformanceTest/BUILD.gn) | 16 |

## 查询命令

```bash
awk -F '\t' '$1 == "systemabilitymgr" && $2 == "selectionfwk"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
