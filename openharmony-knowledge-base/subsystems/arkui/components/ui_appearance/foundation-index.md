# ui_appearance：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `arkui` |
| component | `ui_appearance` |
| Git 子仓 | `foundation/arkui/ui_appearance` |
| bundle | [foundation/arkui/ui_appearance/bundle.json](../../../../../../foundation/arkui/ui_appearance/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 17 |
| third-party dependencies | 0 |
| declared sub_component | 2 |
| inner kits | 1 |
| declared test entries | 1 |

## 依赖

组件依赖：`ability_runtime`, `ability_base`, `access_token`, `c_utils`, `config_policy`, `data_share`, `hicollie`, `hilog`, `init`, `ipc`, `napi`, `safwk`, `samgr`, `time_service`, `os_account`, `common_event_service`, `runtime_core`

三方依赖：无声明

## 声明构建入口

- `//foundation/arkui/ui_appearance:ui_appearance_packages`
- `//foundation/arkui/ui_appearance/interfaces/ets/ani:ui_appearance_ani_package`

## 声明测试入口

- `//foundation/arkui/ui_appearance/test/unittest:unittest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 11 |
| test | 10 |
| build-support | 4 |
| aggregate-codegen | 3 |
| total | 28 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/arkui/ui_appearance:ui_appearance_packages` | [foundation/arkui/ui_appearance/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/BUILD.gn) | 16 |
| production | `ohos_sa_profile` | `//foundation/arkui/ui_appearance/sa_profile:arkui_ui_appearance_sa_profiles` | [foundation/arkui/ui_appearance/sa_profile/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/sa_profile/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//foundation/arkui/ui_appearance/interfaces/ets/ani:ui_appearance_ani_package` | [foundation/arkui/ui_appearance/interfaces/ets/ani/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/interfaces/ets/ani/BUILD.gn) | 18 |
| production | `ohos_shared_library` | `//foundation/arkui/ui_appearance/interfaces/ets/ani:ui_appearance_ani` | [foundation/arkui/ui_appearance/interfaces/ets/ani/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/interfaces/ets/ani/BUILD.gn) | 26 |
| aggregate-codegen | `generate_static_abc` | `//foundation/arkui/ui_appearance/interfaces/ets/ani:ui_appearance_abc` | [foundation/arkui/ui_appearance/interfaces/ets/ani/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/interfaces/ets/ani/BUILD.gn) | 48 |
| production | `ohos_prebuilt_etc` | `//foundation/arkui/ui_appearance/interfaces/ets/ani:ui_appearance_etc` | [foundation/arkui/ui_appearance/interfaces/ets/ani/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/interfaces/ets/ani/BUILD.gn) | 55 |
| build-support | `config` | `//foundation/arkui/ui_appearance/interfaces/kits/napi:ui_appearance_interfaces_kits_napi_config` | [foundation/arkui/ui_appearance/interfaces/kits/napi/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/interfaces/kits/napi/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/ui_appearance/interfaces/kits/napi:uiappearance` | [foundation/arkui/ui_appearance/interfaces/kits/napi/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/interfaces/kits/napi/BUILD.gn) | 21 |
| build-support | `config` | `//foundation/arkui/ui_appearance/interfaces/kits/native:ui_appearance_kit_config` | [foundation/arkui/ui_appearance/interfaces/kits/native/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/interfaces/kits/native/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/arkui/ui_appearance/interfaces/kits/native:ui_appearance_kit` | [foundation/arkui/ui_appearance/interfaces/kits/native/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/interfaces/kits/native/BUILD.gn) | 21 |
| production | `ohos_prebuilt_etc` | `//foundation/arkui/ui_appearance/etc/para:ui_appearance.para` | [foundation/arkui/ui_appearance/etc/para/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/etc/para/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/arkui/ui_appearance/etc/para:ui_appearance.para.dac` | [foundation/arkui/ui_appearance/etc/para/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/etc/para/BUILD.gn) | 24 |
| production | `idl_gen_interface` | `//foundation/arkui/ui_appearance/services:ui_appearance_ability_interface` | [foundation/arkui/ui_appearance/services/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/services/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/arkui/ui_appearance/services:ui_appearance_service_config` | [foundation/arkui/ui_appearance/services/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/services/BUILD.gn) | 24 |
| production | `ohos_source_set` | `//foundation/arkui/ui_appearance/services:ui_appearance_ability_stub` | [foundation/arkui/ui_appearance/services/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/services/BUILD.gn) | 34 |
| production | `ohos_shared_library` | `//foundation/arkui/ui_appearance/services:ui_appearance_service` | [foundation/arkui/ui_appearance/services/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/services/BUILD.gn) | 54 |
| production | `ohos_shared_library` | `//foundation/arkui/ui_appearance/services:ui_appearance_client` | [foundation/arkui/ui_appearance/services/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/services/BUILD.gn) | 121 |
| test | `ohos_unittest` | `//foundation/arkui/ui_appearance/test/unittest/setting_data_observer_test:setting_data_observer_test` | [foundation/arkui/ui_appearance/test/unittest/setting_data_observer_test/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/setting_data_observer_test/BUILD.gn) | 19 |
| test | `group` | `//foundation/arkui/ui_appearance/test/unittest/setting_data_observer_test:unittest` | [foundation/arkui/ui_appearance/test/unittest/setting_data_observer_test/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/setting_data_observer_test/BUILD.gn) | 41 |
| test | `ohos_unittest` | `//foundation/arkui/ui_appearance/test/unittest/smart_gesture_manager_test:smart_gesture_manager_test` | [foundation/arkui/ui_appearance/test/unittest/smart_gesture_manager_test/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/smart_gesture_manager_test/BUILD.gn) | 19 |
| test | `group` | `//foundation/arkui/ui_appearance/test/unittest/smart_gesture_manager_test:unittest` | [foundation/arkui/ui_appearance/test/unittest/smart_gesture_manager_test/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/smart_gesture_manager_test/BUILD.gn) | 56 |
| test | `ohos_unittest` | `//foundation/arkui/ui_appearance/test/unittest:ui_appearance_test` | [foundation/arkui/ui_appearance/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/BUILD.gn) | 17 |
| test | `group` | `//foundation/arkui/ui_appearance/test/unittest:unittest` | [foundation/arkui/ui_appearance/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/BUILD.gn) | 79 |
| build-support | `config` | `//foundation/arkui/ui_appearance/test/unittest/setting_data_manager_test:ui_appearance_service_exception_config` | [foundation/arkui/ui_appearance/test/unittest/setting_data_manager_test/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/setting_data_manager_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/arkui/ui_appearance/test/unittest/setting_data_manager_test:setting_data_manager_test` | [foundation/arkui/ui_appearance/test/unittest/setting_data_manager_test/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/setting_data_manager_test/BUILD.gn) | 23 |
| test | `group` | `//foundation/arkui/ui_appearance/test/unittest/setting_data_manager_test:unittest` | [foundation/arkui/ui_appearance/test/unittest/setting_data_manager_test/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/setting_data_manager_test/BUILD.gn) | 54 |
| test | `ohos_unittest` | `//foundation/arkui/ui_appearance/test/unittest/dark_mode_manager_test:dark_mode_manager_test` | [foundation/arkui/ui_appearance/test/unittest/dark_mode_manager_test/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/dark_mode_manager_test/BUILD.gn) | 19 |
| test | `group` | `//foundation/arkui/ui_appearance/test/unittest/dark_mode_manager_test:unittest` | [foundation/arkui/ui_appearance/test/unittest/dark_mode_manager_test/BUILD.gn](../../../../../../foundation/arkui/ui_appearance/test/unittest/dark_mode_manager_test/BUILD.gn) | 56 |

## 查询命令

```bash
awk -F '\t' '$1 == "arkui" && $2 == "ui_appearance"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
