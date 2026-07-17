# pasteboard：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `distributeddatamgr` |
| component | `pasteboard` |
| Git 子仓 | `foundation/distributeddatamgr/pasteboard` |
| bundle | [foundation/distributeddatamgr/pasteboard/bundle.json](../../../../../../foundation/distributeddatamgr/pasteboard/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 41 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 6 |
| declared test entries | 2 |

## 依赖

组件依赖：`ability_base`, `ability_runtime`, `access_token`, `app_file_service`, `bundle_framework`, `cJSON`, `c_utils`, `common_event_service`, `device_info_manager`, `device_manager`, `data_share`, `dataclassification`, `dfs_service`, `dlp_permission_service`, `ets_frontend`, `eventhandler`, `file_api`, `hiappevent`, `hisysevent`, `hitrace`, `hilog`, `init`, `input`, `imf`, `ipc`, `image_framework`, `json`, `libuv`, `libxml2`, `memmgr`, `napi`, `os_account`, `resource_schedule_service`, `safwk`, `samgr`, `screenlock_mgr`, `time_service`, `udmf`, `window_manager`, `ffrt`, `runtime_core`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/distributeddatamgr/pasteboard/test:unittest`
- `//foundation/distributeddatamgr/pasteboard/test:fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 22 |
| test | 70 |
| build-support | 10 |
| aggregate-codegen | 10 |
| total | 112 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/distributeddatamgr/pasteboard/framework/framework:build_module` | [foundation/distributeddatamgr/pasteboard/framework/framework/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/framework/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/distributeddatamgr/pasteboard/framework/framework:module_public_config` | [foundation/distributeddatamgr/pasteboard/framework/framework/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/framework/BUILD.gn) | 20 |
| production | `ohos_shared_library` | `//foundation/distributeddatamgr/pasteboard/framework/framework:pasteboard_framework` | [foundation/distributeddatamgr/pasteboard/framework/framework/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/framework/BUILD.gn) | 29 |
| build-support | `config` | `//foundation/distributeddatamgr/pasteboard/framework/test:module_private_config` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:PasteboardFrameworkTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 33 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:PasteboardDevProfileTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 137 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:PasteboardFrameworkMockTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 218 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:PasteboardWebControllerTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 288 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:FfrtUtilsTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 317 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:PasteboardClientProxyMockTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 342 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:MessageParcelWarpTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 432 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:PasteboardClientMockTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 492 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:PasteboardServiceLoaderTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 619 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:PasteboardDisposableClientTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 653 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:PasteboardImgExtractorMockTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 702 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:PasteboardCommonUtilsTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 730 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:TLVReadableTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 747 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:TLVWriteableTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 784 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:TLVBufferTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 821 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/framework/test:TLVUtilsTest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 850 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/framework/test:unittest` | [foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/test/BUILD.gn) | 882 |
| build-support | `config` | `//foundation/distributeddatamgr/pasteboard/framework/innerkits:pasteboard_client_config` | [foundation/distributeddatamgr/pasteboard/framework/innerkits/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/innerkits/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/distributeddatamgr/pasteboard/framework/innerkits:pasteboard_data_config` | [foundation/distributeddatamgr/pasteboard/framework/innerkits/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/innerkits/BUILD.gn) | 35 |
| production | `ohos_shared_library` | `//foundation/distributeddatamgr/pasteboard/framework/innerkits:pasteboard_data` | [foundation/distributeddatamgr/pasteboard/framework/innerkits/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/innerkits/BUILD.gn) | 49 |
| production | `ohos_shared_library` | `//foundation/distributeddatamgr/pasteboard/framework/innerkits:pasteboard_client` | [foundation/distributeddatamgr/pasteboard/framework/innerkits/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/framework/innerkits/BUILD.gn) | 118 |
| aggregate-codegen | `group` | `//foundation/distributeddatamgr/pasteboard:pasteboard_packages` | [foundation/distributeddatamgr/pasteboard/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/distributeddatamgr/pasteboard/utils/test:module_private_config` | [foundation/distributeddatamgr/pasteboard/utils/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/utils/test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/utils/test:PasteboardUtilsNativeTest` | [foundation/distributeddatamgr/pasteboard/utils/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/utils/test/BUILD.gn) | 23 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/utils/test:unittest` | [foundation/distributeddatamgr/pasteboard/utils/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/utils/test/BUILD.gn) | 46 |
| test | `ohos_js_unittest` | `//foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardapi:PasteBoardJSTest` | [foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardapi/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardapi/BUILD.gn) | 18 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardapi:unittest` | [foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardapi/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardapi/BUILD.gn) | 26 |
| test | `ohos_js_unittest` | `//foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardperf:PasteBoardPerfJSTest` | [foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardperf/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardperf/BUILD.gn) | 18 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardperf:unittest` | [foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardperf/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/kits/napi/test/unittest/pasteboardperf/BUILD.gn) | 26 |
| production | `ohos_shared_library` | `//foundation/distributeddatamgr/pasteboard/interfaces/kits:pasteboard_napi` | [foundation/distributeddatamgr/pasteboard/interfaces/kits/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/kits/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/distributeddatamgr/pasteboard/interfaces/taihe:taihe_config` | [foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn) | 19 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/distributeddatamgr/pasteboard/interfaces/taihe:copy_pasteboard` | [foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn) | 33 |
| production | `ohos_taihe` | `//foundation/distributeddatamgr/pasteboard/interfaces/taihe:run_pasteboard_taihe` | [foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn) | 37 |
| production | `taihe_shared_library` | `//foundation/distributeddatamgr/pasteboard/interfaces/taihe:pasteboard_taihe_native` | [foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn) | 46 |
| aggregate-codegen | `generate_static_abc` | `//foundation/distributeddatamgr/pasteboard/interfaces/taihe:pasteboard_taihe_ani` | [foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn) | 85 |
| production | `ohos_prebuilt_etc` | `//foundation/distributeddatamgr/pasteboard/interfaces/taihe:pasteboard_abc_etc` | [foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn) | 93 |
| aggregate-codegen | `group` | `//foundation/distributeddatamgr/pasteboard/interfaces/taihe:pasteboard_taihe` | [foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/taihe/BUILD.gn) | 101 |
| production | `ohos_shared_library` | `//foundation/distributeddatamgr/pasteboard/interfaces/ndk:libpasteboard` | [foundation/distributeddatamgr/pasteboard/interfaces/ndk/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/ndk/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/distributeddatamgr/pasteboard/interfaces/ndk/unittest:module_private_config` | [foundation/distributeddatamgr/pasteboard/interfaces/ndk/unittest/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/ndk/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/interfaces/ndk/unittest:PasteboardNdkTest` | [foundation/distributeddatamgr/pasteboard/interfaces/ndk/unittest/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/ndk/unittest/BUILD.gn) | 50 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/interfaces/ndk/unittest:unittest` | [foundation/distributeddatamgr/pasteboard/interfaces/ndk/unittest/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/ndk/unittest/BUILD.gn) | 63 |
| build-support | `config` | `//foundation/distributeddatamgr/pasteboard/interfaces/ani:ani_config` | [foundation/distributeddatamgr/pasteboard/interfaces/ani/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/ani/BUILD.gn) | 18 |
| aggregate-codegen | `group` | `//foundation/distributeddatamgr/pasteboard/interfaces/ani:pasteboard_ani_package` | [foundation/distributeddatamgr/pasteboard/interfaces/ani/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/ani/BUILD.gn) | 26 |
| production | `ohos_shared_library` | `//foundation/distributeddatamgr/pasteboard/interfaces/ani:pasteboard_ani` | [foundation/distributeddatamgr/pasteboard/interfaces/ani/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/ani/BUILD.gn) | 33 |
| aggregate-codegen | `generate_static_abc` | `//foundation/distributeddatamgr/pasteboard/interfaces/ani:pasteboard_abc` | [foundation/distributeddatamgr/pasteboard/interfaces/ani/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/ani/BUILD.gn) | 79 |
| production | `ohos_prebuilt_etc` | `//foundation/distributeddatamgr/pasteboard/interfaces/ani:pasteboard_abc_etc` | [foundation/distributeddatamgr/pasteboard/interfaces/ani/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/ani/BUILD.gn) | 88 |
| production | `ohos_shared_library` | `//foundation/distributeddatamgr/pasteboard/interfaces/cj:cj_pasteboard_ffi` | [foundation/distributeddatamgr/pasteboard/interfaces/cj/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/interfaces/cj/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/distributeddatamgr/pasteboard/etc/init:pasteboardservice.cfg` | [foundation/distributeddatamgr/pasteboard/etc/init/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/etc/init/BUILD.gn) | 18 |
| production | `idl_gen_interface` | `//foundation/distributeddatamgr/pasteboard/services:pasteboard_service_interface` | [foundation/distributeddatamgr/pasteboard/services/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/distributeddatamgr/pasteboard/services:pasteboard_service_config` | [foundation/distributeddatamgr/pasteboard/services/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/BUILD.gn) | 31 |
| production | `ohos_shared_library` | `//foundation/distributeddatamgr/pasteboard/services:pasteboard_service` | [foundation/distributeddatamgr/pasteboard/services/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/BUILD.gn) | 67 |
| production | `ohos_source_set` | `//foundation/distributeddatamgr/pasteboard/services:pasteboard_stub_proxy` | [foundation/distributeddatamgr/pasteboard/services/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/BUILD.gn) | 216 |
| production | `ohos_source_set` | `//foundation/distributeddatamgr/pasteboard/services:pasteboard_client_idl` | [foundation/distributeddatamgr/pasteboard/services/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/BUILD.gn) | 244 |
| production | `ohos_source_set` | `//foundation/distributeddatamgr/pasteboard/services:pasteboard_service_idl` | [foundation/distributeddatamgr/pasteboard/services/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/BUILD.gn) | 280 |
| aggregate-codegen | `group` | `//foundation/distributeddatamgr/pasteboard/services/dialog:pasteboard_dialog` | [foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn) | 16 |
| production | `ohos_hap` | `//foundation/distributeddatamgr/pasteboard/services/dialog:pasteboard_dialog_hap` | [foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn) | 20 |
| aggregate-codegen | `ohos_js_assets` | `//foundation/distributeddatamgr/pasteboard/services/dialog:pasteboard_dialog_js_assets` | [foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn) | 36 |
| production | `ohos_app_scope` | `//foundation/distributeddatamgr/pasteboard/services/dialog:pasteboard_dialog_app_profile` | [foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn) | 42 |
| aggregate-codegen | `ohos_resources` | `//foundation/distributeddatamgr/pasteboard/services/dialog:pasteboard_dialog_resources` | [foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/dialog/BUILD.gn) | 47 |
| build-support | `config` | `//foundation/distributeddatamgr/pasteboard/services/test:module_private_config` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardServiceTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 36 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServInterfaceTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 87 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServInterfaceMockTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 222 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardAbilityManagerTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 359 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardLinkedListTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 385 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardDialogTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 395 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardDeduplicateMemoryTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 418 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardPatternTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 432 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardDelayStubTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 459 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardDelayProxyTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 491 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardEntryGetterStubTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 521 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardEntryGetterProxyTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 551 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardLoadTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 580 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardDisposableManagerTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 601 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardDelayManagerTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 643 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServGetLocalDataTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 706 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServSubscribeTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 840 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServNotifyTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 974 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServSetDataTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 1108 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServGetDataTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 1242 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServEventTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 1376 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServGetTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 1512 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServCheckTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 1647 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServCleanTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 1782 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteServRemoteTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 1917 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:EntityRecognitionObserverStubTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 2052 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:HiViewAdapterTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 2079 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:SecurityLevelTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 2107 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/services/test:unittest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 2134 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/services/test:PasteboardSubProfileSubscriberTest` | [foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/services/test/BUILD.gn) | 2163 |
| test | `ohos_fuzztest` | `//foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddata_fuzzer:PasteboardDataFuzzTest` | [foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddata_fuzzer/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddata_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddata_fuzzer:fuzztest` | [foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddata_fuzzer/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddata_fuzzer/BUILD.gn) | 65 |
| test | `ohos_fuzztest` | `//foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddisposable_fuzzer:PasteboardDisposableFuzzTest` | [foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddisposable_fuzzer/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddisposable_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddisposable_fuzzer:fuzztest` | [foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddisposable_fuzzer/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboarddisposable_fuzzer/BUILD.gn) | 78 |
| test | `ohos_fuzztest` | `//foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardconcurrent_fuzzer:PasteboardConcurrentFuzzTest` | [foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardconcurrent_fuzzer/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardconcurrent_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardconcurrent_fuzzer:fuzztest` | [foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardconcurrent_fuzzer/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardconcurrent_fuzzer/BUILD.gn) | 180 |
| test | `ohos_fuzztest` | `//foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardservice_fuzzer:PasteboardServiceFuzzTest` | [foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardservice_fuzzer/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardservice_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardservice_fuzzer:fuzztest` | [foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardservice_fuzzer/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/test/fuzztest/pasteboardservice_fuzzer/BUILD.gn) | 70 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/test:fuzztest` | [foundation/distributeddatamgr/pasteboard/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/test/BUILD.gn) | 17 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/test:unittest` | [foundation/distributeddatamgr/pasteboard/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/test/BUILD.gn) | 34 |
| production | `ohos_cli_executable` | `//foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard:ohos-pasteboard` | [foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard/tests:ExecuteCommandTest` | [foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard/tests/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard/tests/BUILD.gn) | 19 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard/tests:unittest` | [foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard/tests/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/tools/ohos-pasteboard/tests/BUILD.gn) | 67 |
| production | `ohos_sa_profile` | `//foundation/distributeddatamgr/pasteboard/profile:distributeddatamgr_pasteboard_sa_profiles` | [foundation/distributeddatamgr/pasteboard/profile/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/profile/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/distributeddatamgr/pasteboard/adapter:pasteboard_adapter` | [foundation/distributeddatamgr/pasteboard/adapter/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/adapter/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/adapter/test:AdapterDeviceProfileClientTest` | [foundation/distributeddatamgr/pasteboard/adapter/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/adapter/test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/distributeddatamgr/pasteboard/adapter/test:AdapterDeviceProfileAdapterTest` | [foundation/distributeddatamgr/pasteboard/adapter/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/adapter/test/BUILD.gn) | 49 |
| test | `group` | `//foundation/distributeddatamgr/pasteboard/adapter/test:unittest` | [foundation/distributeddatamgr/pasteboard/adapter/test/BUILD.gn](../../../../../../foundation/distributeddatamgr/pasteboard/adapter/test/BUILD.gn) | 80 |

## 查询命令

```bash
awk -F '\t' '$1 == "distributeddatamgr" && $2 == "pasteboard"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
