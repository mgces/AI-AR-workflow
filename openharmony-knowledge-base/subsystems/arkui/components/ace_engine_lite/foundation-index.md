# ace_engine_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `arkui` |
| component | `ace_engine_lite` |
| Git 子仓 | `foundation/arkui/ace_engine_lite` |
| bundle | [foundation/arkui/ace_engine_lite/bundle.json](../../../../../../foundation/arkui/ace_engine_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | mini,small |
| component dependencies | 17 |
| third-party dependencies | 2 |
| declared sub_component | 2 |
| inner kits | 1 |
| declared test entries | 0 |

## 依赖

组件依赖：`bundle_framework_lite`, `huks`, `ui_lite`, `surface_lite`, `i18n_lite`, `resource_management_lite`, `kv_store`, `utils_lite`, `ability_lite`, `init`, `camera_lite`, `media_lite`, `battery_lite`, `netstack`, `device_attest_lite`, `bounds_checking_function`, `jerryscript`

三方依赖：`cJSON`, `freetype`

## 声明构建入口

- `//foundation/arkui/ace_engine_lite/test:unittest`
- `//foundation/arkui/ace_engine_lite/frameworks:jsfwk`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 9 |
| test | 62 |
| build-support | 5 |
| aggregate-codegen | 3 |
| total | 79 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `lite_component` | `//foundation/arkui/ace_engine_lite/frameworks/native_engine:ace_native_engine_lite` | [foundation/arkui/ace_engine_lite/frameworks/native_engine/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/native_engine/BUILD.gn) | 23 |
| production | `lite_library` | `//foundation/arkui/ace_engine_lite/frameworks/native_engine:ace_native_engine` | [foundation/arkui/ace_engine_lite/frameworks/native_engine/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/native_engine/BUILD.gn) | 27 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/native_engine/async/test/unittest:js_frameworks_test_js_async_work` | [foundation/arkui/ace_engine_lite/frameworks/native_engine/async/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/native_engine/async/test/unittest/BUILD.gn) | 17 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/native_engine/async/test/unittest:js_frameworks_test_message_queue_utils` | [foundation/arkui/ace_engine_lite/frameworks/native_engine/async/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/native_engine/async/test/unittest/BUILD.gn) | 25 |
| test | `group` | `//foundation/arkui/ace_engine_lite/frameworks/native_engine/async/test/unittest:async_unittest` | [foundation/arkui/ace_engine_lite/frameworks/native_engine/async/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/native_engine/async/test/unittest/BUILD.gn) | 33 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/native_engine/jsi/test/unittest:js_frameworks_test_jsiinterface` | [foundation/arkui/ace_engine_lite/frameworks/native_engine/jsi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/native_engine/jsi/test/unittest/BUILD.gn) | 17 |
| test | `group` | `//foundation/arkui/ace_engine_lite/frameworks/native_engine/jsi/test/unittest:jsi_unittest` | [foundation/arkui/ace_engine_lite/frameworks/native_engine/jsi/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/native_engine/jsi/test/unittest/BUILD.gn) | 25 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest:js_frameworks_test_stylemgr` | [foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn) | 17 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest:js_frameworks_test_condition_arbitrator` | [foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn) | 29 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest:js_frameworks_test_stylemgr_media_query` | [foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn) | 37 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest:js_frameworks_test_link_queue` | [foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn) | 45 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest:js_frameworks_test_link_stack` | [foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn) | 53 |
| test | `group` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest:stylemgr_unittest` | [foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/stylemgr/test/unittest/BUILD.gn) | 61 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/router/test/unittest:js_frameworks_test_router_module` | [foundation/arkui/ace_engine_lite/frameworks/src/core/router/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/router/test/unittest/BUILD.gn) | 17 |
| test | `group` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/router/test/unittest:router_module_unittest` | [foundation/arkui/ace_engine_lite/frameworks/src/core/router/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/router/test/unittest/BUILD.gn) | 26 |
| test | `group` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest:components_unittest` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/BUILD.gn) | 14 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_arc` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 17 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_directive` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 29 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_data_binding` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 40 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_div` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 51 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_event_bubble` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 63 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_horizonprogress` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 73 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_image_animator` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 84 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_image_path_support` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 95 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_input` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 103 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_jsbundle` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 115 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_list` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 123 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_marquee` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 134 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_marquee_event` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 146 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_opacity` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 157 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_percent` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 169 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_pickerview` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 177 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_radio_switch_width` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 188 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_slider` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 200 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_swiper` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 212 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_switch` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 224 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_text` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 236 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_input_event` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 248 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_stack` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 259 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_qrcode` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 270 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_chart` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 281 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common:js_frameworks_test_canvas` | [foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/components/test/unittest/common/BUILD.gn) | 292 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/base/test/unittest:js_frameworks_test_system_info` | [foundation/arkui/ace_engine_lite/frameworks/src/core/base/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/base/test/unittest/BUILD.gn) | 17 |
| test | `group` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/base/test/unittest:base_utils_unittest` | [foundation/arkui/ace_engine_lite/frameworks/src/core/base/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/base/test/unittest/BUILD.gn) | 25 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/context/test/unittest:js_frameworks_test_jsfwk` | [foundation/arkui/ace_engine_lite/frameworks/src/core/context/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/context/test/unittest/BUILD.gn) | 17 |
| test | `group` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/context/test/unittest:js_frameworks_unittest` | [foundation/arkui/ace_engine_lite/frameworks/src/core/context/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/context/test/unittest/BUILD.gn) | 25 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest:js_frameworks_test_app` | [foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest/BUILD.gn) | 20 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest:js_frameworks_test_dfx` | [foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest/BUILD.gn) | 32 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest:js_frameworks_test_dialog` | [foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest/BUILD.gn) | 43 |
| test | `group` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest:modules_unittest` | [foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/modules/test/unittest/BUILD.gn) | 54 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest:js_frameworks_test_date_time` | [foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn) | 17 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest:js_frameworks_test_number_format` | [foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn) | 25 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest:js_frameworks_test_timer` | [foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn) | 33 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest:js_frameworks_test_console` | [foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn) | 45 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest:js_frameworks_test_localization` | [foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn) | 54 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest:js_frameworks_test_getapp_module` | [foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/src/core/modules/presets/test/unittest/BUILD.gn) | 65 |
| production | `lite_component` | `//foundation/arkui/ace_engine_lite/frameworks:jsfwk` | [foundation/arkui/ace_engine_lite/frameworks/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/arkui/ace_engine_lite/frameworks:ace_lite_config` | [foundation/arkui/ace_engine_lite/frameworks/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/BUILD.gn) | 28 |
| production | `lite_library` | `//foundation/arkui/ace_engine_lite/frameworks:ace_lite` | [foundation/arkui/ace_engine_lite/frameworks/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/BUILD.gn) | 50 |
| aggregate-codegen | `action` | `//foundation/arkui/ace_engine_lite/frameworks:gen_syscap_module_native_mini` | [foundation/arkui/ace_engine_lite/frameworks/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/BUILD.gn) | 160 |
| production | `lite_component` | `//foundation/arkui/ace_engine_lite/frameworks/module_manager:ace_module_manager_lite` | [foundation/arkui/ace_engine_lite/frameworks/module_manager/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/module_manager/BUILD.gn) | 22 |
| production | `lite_library` | `//foundation/arkui/ace_engine_lite/frameworks/module_manager:ace_module_manager` | [foundation/arkui/ace_engine_lite/frameworks/module_manager/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/module_manager/BUILD.gn) | 26 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/module_manager/test/unittest:js_frameworks_test_require_module` | [foundation/arkui/ace_engine_lite/frameworks/module_manager/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/module_manager/test/unittest/BUILD.gn) | 17 |
| test | `group` | `//foundation/arkui/ace_engine_lite/frameworks/module_manager/test/unittest:module_manager_unittest` | [foundation/arkui/ace_engine_lite/frameworks/module_manager/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/module_manager/test/unittest/BUILD.gn) | 25 |
| production | `lite_component` | `//foundation/arkui/ace_engine_lite/frameworks/common:ace_common_lite` | [foundation/arkui/ace_engine_lite/frameworks/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/common/BUILD.gn) | 21 |
| production | `lite_library` | `//foundation/arkui/ace_engine_lite/frameworks/common:ace_common` | [foundation/arkui/ace_engine_lite/frameworks/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/common/BUILD.gn) | 25 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/frameworks/common/memory/cache/test/unittest:js_frameworks_test_cache_manager` | [foundation/arkui/ace_engine_lite/frameworks/common/memory/cache/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/common/memory/cache/test/unittest/BUILD.gn) | 17 |
| test | `group` | `//foundation/arkui/ace_engine_lite/frameworks/common/memory/cache/test/unittest:cache_manager_unittest` | [foundation/arkui/ace_engine_lite/frameworks/common/memory/cache/test/unittest/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/common/memory/cache/test/unittest/BUILD.gn) | 25 |
| build-support | `config` | `//foundation/arkui/ace_engine_lite/frameworks/targets:ace_lite_target_config` | [foundation/arkui/ace_engine_lite/frameworks/targets/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/targets/BUILD.gn) | 21 |
| aggregate-codegen | `group` | `//foundation/arkui/ace_engine_lite/frameworks/targets:targets` | [foundation/arkui/ace_engine_lite/frameworks/targets/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/targets/BUILD.gn) | 35 |
| build-support | `config` | `//foundation/arkui/ace_engine_lite/frameworks/targets/simulator:ace_lite_config` | [foundation/arkui/ace_engine_lite/frameworks/targets/simulator/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/targets/simulator/BUILD.gn) | 19 |
| production | `ohos_static_library` | `//foundation/arkui/ace_engine_lite/frameworks/targets/simulator:ace_lite` | [foundation/arkui/ace_engine_lite/frameworks/targets/simulator/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/targets/simulator/BUILD.gn) | 26 |
| aggregate-codegen | `group` | `//foundation/arkui/ace_engine_lite/frameworks/targets/simulator:ace_lite` | [foundation/arkui/ace_engine_lite/frameworks/targets/simulator/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/frameworks/targets/simulator/BUILD.gn) | 75 |
| build-support | `config` | `//foundation/arkui/ace_engine_lite/test:test_common_config` | [foundation/arkui/ace_engine_lite/test/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/test/BUILD.gn) | 36 |
| build-support | `config` | `//foundation/arkui/ace_engine_lite/test:test_whole_archive_config` | [foundation/arkui/ace_engine_lite/test/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/test/BUILD.gn) | 43 |
| test | `group` | `//foundation/arkui/ace_engine_lite/test:unittest` | [foundation/arkui/ace_engine_lite/test/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/test/BUILD.gn) | 49 |
| test | `group` | `//foundation/arkui/ace_engine_lite/test:unittest` | [foundation/arkui/ace_engine_lite/test/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/test/BUILD.gn) | 65 |
| test | `unittest` | `//foundation/arkui/ace_engine_lite/test/moduletest/common:js_frameworks_tdd_door` | [foundation/arkui/ace_engine_lite/test/moduletest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/test/moduletest/common/BUILD.gn) | 18 |
| test | `group` | `//foundation/arkui/ace_engine_lite/test/moduletest/common:door_unittest` | [foundation/arkui/ace_engine_lite/test/moduletest/common/BUILD.gn](../../../../../../foundation/arkui/ace_engine_lite/test/moduletest/common/BUILD.gn) | 57 |

## 查询命令

```bash
awk -F '\t' '$1 == "arkui" && $2 == "ace_engine_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
