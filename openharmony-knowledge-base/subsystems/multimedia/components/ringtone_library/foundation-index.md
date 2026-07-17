# ringtone_library：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `multimedia` |
| component | `ringtone_library` |
| Git 子仓 | `foundation/multimedia/ringtone_library` |
| bundle | [foundation/multimedia/ringtone_library/bundle.json](../../../../../../foundation/multimedia/ringtone_library/bundle.json) |
| rk3568 selected | yes |
| adapted systems | small,standard |
| component dependencies | 28 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 2 |
| declared test entries | 1 |

## 依赖

组件依赖：`ability_base`, `ability_runtime`, `access_token`, `app_file_service`, `bundle_framework`, `c_utils`, `common_event_service`, `config_policy`, `data_share`, `hilog`, `hicollie`, `hisysevent`, `hitrace`, `image_framework`, `init`, `ipc`, `kv_store`, `libxml2`, `media_foundation`, `media_library`, `napi`, `player_framework`, `relational_store`, `samgr`, `preferences`, `os_account`, `safwk`, `ets_frontend`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/multimedia/ringtone_library/test/unittest:test`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 12 |
| test | 24 |
| build-support | 3 |
| aggregate-codegen | 2 |
| total | 41 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_hap` | `//foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap:ringtone_extension_hap` | [foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn) | 17 |
| aggregate-codegen | `ohos_js_assets` | `//foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap:RingtoneLibStage_js_assets` | [foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn) | 39 |
| production | `ohos_app_scope` | `//foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap:RingtoneLibStage_app_profile` | [foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn) | 45 |
| aggregate-codegen | `ohos_resources` | `//foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap:RingtoneLibStage_resources` | [foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/frameworks/ringtone_extension_hap/BUILD.gn) | 50 |
| build-support | `config` | `//foundation/multimedia/ringtone_library/services:ringtone_public_config` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/multimedia/ringtone_library/services:ringtone_data_extension` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 49 |
| production | `ohos_shared_library` | `//foundation/multimedia/ringtone_library/services:ringtonerestore` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 148 |
| build-support | `config` | `//foundation/multimedia/ringtone_library/services:ringtone_public_visible_config` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 235 |
| production | `ohos_shared_library` | `//foundation/multimedia/ringtone_library/services:ringtone_utils` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 239 |
| production | `ohos_shared_library` | `//foundation/multimedia/ringtone_library/services:ringtone_setting` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 308 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/ringtone_library/services:ringtone_scanner_param.para` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 370 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/ringtone_library/services:ringtone_setting_notifications.para` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 377 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/ringtone_library/services:ringtone_setting_ringtones.para` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 384 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/ringtone_library/services:ringtone_setting_shots.para` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 391 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/ringtone_library/services:ringtone_param.para.dac` | [foundation/multimedia/ringtone_library/services/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/BUILD.gn) | 398 |
| build-support | `config` | `//foundation/multimedia/ringtone_library/services/ringtone_helper:ringtone_helper_public_config` | [foundation/multimedia/ringtone_library/services/ringtone_helper/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/ringtone_helper/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/multimedia/ringtone_library/services/ringtone_helper:ringtone_data_helper` | [foundation/multimedia/ringtone_library/services/ringtone_helper/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/services/ringtone_helper/BUILD.gn) | 21 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner_test:unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner_test:ringtone_scanner_unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner_test/BUILD.gn) | 23 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_data_extension_test:unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_data_extension_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_data_extension_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_data_extension_test:ringtone_data_extension_unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_data_extension_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_data_extension_test/BUILD.gn) | 23 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_dualfwk_restore_test:unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_dualfwk_restore_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_dualfwk_restore_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_dualfwk_restore_test:ringtone_dualfwk_restore_unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_dualfwk_restore_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_dualfwk_restore_test/BUILD.gn) | 23 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest:test` | [foundation/multimedia/ringtone_library/test/unittest/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/BUILD.gn) | 14 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_test:unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_test:ringtone_unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_test/BUILD.gn) | 23 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_helper_test:unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_helper_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_helper_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_helper_test:ringtone_helper_unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_helper_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_helper_test/BUILD.gn) | 23 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_dfx_test:unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_dfx_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_dfx_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_dfx_test:ringtone_dfx_unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_dfx_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_dfx_test/BUILD.gn) | 23 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_restore_test:unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_restore_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_restore_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_restore_test:ringtone_restore_unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_restore_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_restore_test/BUILD.gn) | 23 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_utils_test:unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_utils_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_utils_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_utils_test:ringtone_utils_unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_utils_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_utils_test/BUILD.gn) | 23 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest/customised_tone_processor_test:unittest` | [foundation/multimedia/ringtone_library/test/unittest/customised_tone_processor_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/customised_tone_processor_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/ringtone_library/test/unittest/customised_tone_processor_test:customised_tone_processor_unittest` | [foundation/multimedia/ringtone_library/test/unittest/customised_tone_processor_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/customised_tone_processor_test/BUILD.gn) | 23 |
| test | `group` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_setting_test:unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_setting_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_setting_test/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_setting_test:ringtone_setting_unittest` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_setting_test/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_setting_test/BUILD.gn) | 23 |
| test | `ohos_executable` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner:ringtone_scanner_test` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner/BUILD.gn) | 17 |
| test | `ohos_executable` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner:ringtone_test` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner/BUILD.gn) | 74 |
| test | `ohos_executable` | `//foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner:ringtone_read_test` | [foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner/BUILD.gn](../../../../../../foundation/multimedia/ringtone_library/test/unittest/ringtone_scanner/BUILD.gn) | 131 |

## 查询命令

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "ringtone_library"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
