# graphic_3d：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `graphic` |
| component | `graphic_3d` |
| Git 子仓 | `foundation/graphic/graphic_3d` |
| bundle | [foundation/graphic/graphic_3d/bundle.json](../../../../../../foundation/graphic/graphic_3d/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 31 |
| third-party dependencies | 0 |
| declared sub_component | 22 |
| inner kits | 9 |
| declared test entries | 17 |

## 依赖

组件依赖：`c_utils`, `hilog`, `graphic_2d`, `graphic_surface`, `hitrace`, `icu`, `init`, `input`, `ipc`, `bounds_checking_function`, `resource_management`, `resource_schedule_service`, `napi`, `ability_runtime`, `bundle_framework`, `qos_manager`, `libpng`, `libjpeg-turbo`, `vulkan-loader`, `vulkan-headers`, `skia`, `freetype`, `zlib`, `runtime_core`, `meshoptimizer`, `api_metrics`, `egl`, `opengles`, `window_manager`, `form_fwk`, `ability_base`

三方依赖：无声明

## 声明构建入口

- `//foundation/graphic/graphic_3d/lume/LumeEngine:libAGPEngine`
- `//foundation/graphic/graphic_3d/lume/LumeEngine/DLL:libAGPDLL`
- `//foundation/graphic/graphic_3d/lume/LumeRender:libPluginAGPRender`
- `//foundation/graphic/graphic_3d/lume/Lume_3D/DLL:libPluginAGP3D`
- `//foundation/graphic/graphic_3d/lume/Lume_3D:libAGP3D`
- `//foundation/graphic/graphic_3d/lume/LumePng:libPluginAGPPng`
- `//foundation/graphic/graphic_3d/lume/LumeJpg:libPluginAGPJpg`
- `//foundation/graphic/graphic_3d/3d_scene_adapter:scene_bridge_ani`
- `//foundation/graphic/graphic_3d/3d_widget_adapter:lib3dWidgetAdapter`
- `//foundation/graphic/graphic_3d/lume/LumeBinaryCompile/LumeShaderCompiler:binary_compile_shader`
- `//foundation/graphic/graphic_3d/lume/LumeBinaryCompile/lumeassetcompiler:binary_compile_asset`
- `//foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper:libAGPEcshelper`
- `//foundation/graphic/graphic_3d/lume/LumeMeta:libPluginMetaObject`
- `//foundation/graphic/graphic_3d/lume/LumeScene:libPluginLumeSceneImporter`
- `//foundation/graphic/graphic_3d/lume/LumeScene:libPluginLumeSceneMetadataImporter`
- `//foundation/graphic/graphic_3d/lume/LumeScene:libPluginSceneWidget`
- `//foundation/graphic/graphic_3d/kits/js:libscene`
- `//foundation/graphic/graphic_3d/kits/ets:graphics_3d_taihe`
- `//foundation/graphic/graphic_3d/camera_preview_plugin:libPluginCamPreview`
- `//foundation/graphic/graphic_3d/lume/LumeDotfield:libPluginDotfield`
- `//foundation/graphic/graphic_3d/lume/LumeBoidsSwarm:libPluginBoidsSwarm`
- `//foundation/graphic/graphic_3d/lume/LumeMRT:libPluginMRT`

## 声明测试入口

- `//foundation/graphic/graphic_3d/3d_widget_adapter/test:unittest`
- `//foundation/graphic/graphic_3d/lume/LumeBase/test/unittest:unittest`
- `//foundation/graphic/graphic_3d/lume/LumePng/test/unittest:unittest`
- `//foundation/graphic/graphic_3d/lume/LumeJpg/test/unittest:unittest`
- `//foundation/graphic/graphic_3d/lume/LumeDotfield/test/unittest:unittest`
- `//foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/test/unittest:unittest`
- `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:unittest`
- `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:unittest`
- `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:unittest`
- `//foundation/graphic/graphic_3d/lume/LumeMeta/test/unittest:unittest`
- `//foundation/graphic/graphic_3d/lume/LumeScene/test/unittest:unittest`
- `//foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/gltf2loader_fuzzer:fuzztest`
- `//foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/json_fuzzer:fuzztest`
- `//foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/image_loader_fuzzer:fuzztest`
- `//foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/gltf_load_fuzzer:fuzztest`
- `//foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/json_parse_fuzzer:fuzztest`
- `//foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/property_path_fuzzer:fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 78 |
| test | 77 |
| build-support | 61 |
| aggregate-codegen | 14 |
| total | 230 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/graphic/graphic_3d/3d_scene_adapter:lume3d_config` | [foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/graphic/graphic_3d/3d_scene_adapter:scene_adapter_config` | [foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn) | 85 |
| aggregate-codegen | `group` | `//foundation/graphic/graphic_3d/3d_scene_adapter:sceneAdapterInterface` | [foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn) | 101 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/3d_scene_adapter:scene_adapter_source` | [foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn) | 106 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/3d_scene_adapter:scene_adapter_static` | [foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn) | 187 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/3d_scene_adapter:scene_bridge_ani` | [foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/BUILD.gn) | 201 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/3d_scene_adapter/test:SceneAdapterUnitTest` | [foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn) | 21 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/3d_scene_adapter/test:AGPOffscreenRenderUnitTest` | [foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn) | 104 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/3d_scene_adapter/test:SceneBridgeAniUnitTest` | [foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn) | 197 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/3d_scene_adapter/test:SceneBridgeUnitTest` | [foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn) | 227 |
| build-support | `config` | `//foundation/graphic/graphic_3d/3d_scene_adapter/test:surface_stream_test_config` | [foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn) | 258 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/3d_scene_adapter/test:SurfaceStreamUnitTest` | [foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn) | 308 |
| test | `group` | `//foundation/graphic/graphic_3d/3d_scene_adapter/test:unittest` | [foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_scene_adapter/test/BUILD.gn) | 389 |
| build-support | `config` | `//foundation/graphic/graphic_3d/kits/ets:taihe_config` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/graphic/graphic_3d/kits/ets:lume3d_config` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 46 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/graphic/graphic_3d/kits/ets:copy_scene` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 110 |
| aggregate-codegen | `ohos_copy` | `//foundation/graphic/graphic_3d/kits/ets:copy_record_ets` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 124 |
| production | `ohos_taihe` | `//foundation/graphic/graphic_3d/kits/ets:run_taihe` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 131 |
| production | `taihe_shared_library` | `//foundation/graphic/graphic_3d/kits/ets:scene_ani` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 157 |
| aggregate-codegen | `generate_static_abc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 297 |
| aggregate-codegen | `generate_static_abc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_nodes` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 307 |
| aggregate-codegen | `generate_static_abc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_post_process_settings` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 317 |
| aggregate-codegen | `generate_static_abc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_resources` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 327 |
| aggregate-codegen | `generate_static_abc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_types` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 341 |
| aggregate-codegen | `generate_static_abc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_boids_sim` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 351 |
| production | `ohos_prebuilt_etc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_etc` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 361 |
| production | `ohos_prebuilt_etc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_nodes_etc` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 369 |
| production | `ohos_prebuilt_etc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_post_process_settings_etc` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 377 |
| production | `ohos_prebuilt_etc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_resources_etc` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 385 |
| production | `ohos_prebuilt_etc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_types_etc` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 393 |
| production | `ohos_prebuilt_etc` | `//foundation/graphic/graphic_3d/kits/ets:graphics3d_scene_boids_sim_etc` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 401 |
| aggregate-codegen | `group` | `//foundation/graphic/graphic_3d/kits/ets:graphics_3d_taihe` | [foundation/graphic/graphic_3d/kits/ets/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/BUILD.gn) | 409 |
| test | `group` | `//foundation/graphic/graphic_3d/kits/ets/test:unittest` | [foundation/graphic/graphic_3d/kits/ets/test/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/test/BUILD.gn) | 16 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/kits/ets/test/unittest:SceneETSUnitTest` | [foundation/graphic/graphic_3d/kits/ets/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/test/unittest/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_3d/kits/ets/test/unittest:unittest` | [foundation/graphic/graphic_3d/kits/ets/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/ets/test/unittest/BUILD.gn) | 122 |
| build-support | `config` | `//foundation/graphic/graphic_3d/kits/js:lume3d_config` | [foundation/graphic/graphic_3d/kits/js/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/js/BUILD.gn) | 25 |
| build-support | `config` | `//foundation/graphic/graphic_3d/kits/js:napi_config` | [foundation/graphic/graphic_3d/kits/js/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/js/BUILD.gn) | 85 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/kits/js:napi_source` | [foundation/graphic/graphic_3d/kits/js/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/js/BUILD.gn) | 108 |
| aggregate-codegen | `group` | `//foundation/graphic/graphic_3d/kits/js:napiInterface` | [foundation/graphic/graphic_3d/kits/js/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/js/BUILD.gn) | 218 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/kits/js:libKitHelper` | [foundation/graphic/graphic_3d/kits/js/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/js/BUILD.gn) | 222 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/kits/js:napi_entry` | [foundation/graphic/graphic_3d/kits/js/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/js/BUILD.gn) | 232 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/kits/js:libscene` | [foundation/graphic/graphic_3d/kits/js/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/kits/js/BUILD.gn) | 269 |
| build-support | `config` | `//foundation/graphic/graphic_3d/3d_widget_adapter:lume3d_config` | [foundation/graphic/graphic_3d/3d_widget_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_widget_adapter/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/graphic/graphic_3d/3d_widget_adapter:widget_adapter_config` | [foundation/graphic/graphic_3d/3d_widget_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_widget_adapter/BUILD.gn) | 88 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/3d_widget_adapter:widget_adapter_source` | [foundation/graphic/graphic_3d/3d_widget_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_widget_adapter/BUILD.gn) | 117 |
| aggregate-codegen | `group` | `//foundation/graphic/graphic_3d/3d_widget_adapter:3dWidgetAdapterInterface` | [foundation/graphic/graphic_3d/3d_widget_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_widget_adapter/BUILD.gn) | 252 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/3d_widget_adapter:lib3dWidgetAdapter` | [foundation/graphic/graphic_3d/3d_widget_adapter/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_widget_adapter/BUILD.gn) | 260 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/3d_widget_adapter/test:3d_widget_adpater_test` | [foundation/graphic/graphic_3d/3d_widget_adapter/test/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_widget_adapter/test/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_3d/3d_widget_adapter/test:unittest` | [foundation/graphic/graphic_3d/3d_widget_adapter/test/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/3d_widget_adapter/test/BUILD.gn) | 43 |
| build-support | `config` | `//foundation/graphic/graphic_3d/camera_preview_plugin:campreview_api` | [foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/graphic/graphic_3d/camera_preview_plugin:campreview_config` | [foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn) | 50 |
| production | `lume_compile_shader` | `//foundation/graphic/graphic_3d/camera_preview_plugin:cam_preview_compile_shader` | [foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn) | 72 |
| production | `lume_rofs` | `//foundation/graphic/graphic_3d/camera_preview_plugin:CAM_PREVIEW_ROFS` | [foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn) | 91 |
| production | `source_set` | `//foundation/graphic/graphic_3d/camera_preview_plugin:campreview_rofs_obj` | [foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn) | 131 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/camera_preview_plugin:campreview_src` | [foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn) | 153 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/camera_preview_plugin:libCamPreview` | [foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/camera_preview_plugin/BUILD.gn) | 182 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_3d/test/render/fuzztest/rstransactionipc_fuzzer:RSTransactionIpcFuzzTest` | [foundation/graphic/graphic_3d/test/render/fuzztest/rstransactionipc_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/test/render/fuzztest/rstransactionipc_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/graphic/graphic_3d/test/render/fuzztest/rstransactionipc_fuzzer:fuzztest` | [foundation/graphic/graphic_3d/test/render/fuzztest/rstransactionipc_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/test/render/fuzztest/rstransactionipc_fuzzer/BUILD.gn) | 71 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_3d/test/render/fuzztest/rsstub_fuzzer:RSStubFuzzTest` | [foundation/graphic/graphic_3d/test/render/fuzztest/rsstub_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/test/render/fuzztest/rsstub_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/graphic/graphic_3d/test/render/fuzztest/rsstub_fuzzer:fuzztest` | [foundation/graphic/graphic_3d/test/render/fuzztest/rsstub_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/test/render/fuzztest/rsstub_fuzzer/BUILD.gn) | 70 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeJpg:lume_jpg_api` | [foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn) | 15 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeJpg:lume_jpg_config` | [foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn) | 19 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeJpg:lume_jpg_src` | [foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn) | 30 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeJpg:libJpgStatic` | [foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn) | 52 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeJpg:lume_plugin_jpg_config` | [foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn) | 60 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeJpg:lume_plugin_jpg_src` | [foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeJpg/BUILD.gn) | 64 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumeJpg/test/unittest:lume_jpg_src_test` | [foundation/graphic/graphic_3d/lume/LumeJpg/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeJpg/test/unittest/BUILD.gn) | 20 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeJpg/test/unittest:unittest` | [foundation/graphic/graphic_3d/lume/LumeJpg/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeJpg/test/unittest/BUILD.gn) | 64 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/Lume_3D:lume_3d_api` | [foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/Lume_3D:lume_3d_config` | [foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn) | 29 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/Lume_3D:lume_3d_src` | [foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn) | 72 |
| production | `source_set` | `//foundation/graphic/graphic_3d/lume/Lume_3D:lume_3d_rofs_obj` | [foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn) | 333 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/Lume_3D:AGP3DApi` | [foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn) | 359 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/Lume_3D:libAGP3D` | [foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/BUILD.gn) | 370 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest:fuzztest` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/gltf2loader_fuzzer:lume3d_config` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/gltf2loader_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/gltf2loader_fuzzer/BUILD.gn) | 21 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/gltf2loader_fuzzer:Gltf2LoaderFuzzTest` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/gltf2loader_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/gltf2loader_fuzzer/BUILD.gn) | 80 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/gltf2loader_fuzzer:fuzztest` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/gltf2loader_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/fuzztest/gltf2loader_fuzzer/BUILD.gn) | 137 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:lume_3d_test_config` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 32 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:lume_3d_test_dynamic_lib_config` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 57 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:lume_3d_api_test` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 67 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:lume_3d_static_lib_config` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 198 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:lume_3d_src_test` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 210 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:unittest` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 319 |
| test | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:lume_3d_src_static` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 330 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:libStaticAGP3D` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 348 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:test_plugin_shared_config` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 364 |
| test | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:core3d_test_plugin_shared_src` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 382 |
| test | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:libCore3DTestSharedPlugin` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 401 |
| test | `action` | `//foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest:PushTestResource` | [foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/test/unittest/BUILD.gn) | 410 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/Lume_3D/DLL:lume_3d_plugin_config` | [foundation/graphic/graphic_3d/lume/Lume_3D/DLL/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/DLL/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/Lume_3D/DLL:lume_3d_plugin_src` | [foundation/graphic/graphic_3d/lume/Lume_3D/DLL/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/Lume_3D/DLL/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine:lume_base_api` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 21 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine:lume_engine_api` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 47 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine:lume_default` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 82 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine:lume_engine_config` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 138 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine:lume_engine_src` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 165 |
| production | `source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine:lume_engine_rofs_obj` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 343 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine:libAGPEngine` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 369 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine:lume_component_help_config` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 382 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine:AGPBaseApi` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 392 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine:AGPEngineApi` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 403 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine:AGPEcshelperApi` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 414 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine:lume_component_help_src` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 425 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine:libComponentHelper` | [foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/BUILD.gn) | 449 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/image_loader_fuzzer:ImageLoaderFuzzTest` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/image_loader_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/image_loader_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/image_loader_fuzzer:fuzztest` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/image_loader_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/image_loader_fuzzer/BUILD.gn) | 59 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/json_fuzzer:JsonFuzzTest` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/json_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/json_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/json_fuzzer:fuzztest` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/json_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/fuzztest/json_fuzzer/BUILD.gn) | 59 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:lume_engine_test_config` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 32 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:lume_engine_test_dynamic_lib_config` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 48 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:lume_engine_api_test` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 58 |
| test | `source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:lume_engine_test_rofs_obj` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 171 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:libStaticAGPEngine` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 197 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:libStaticComponentHelper` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 210 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:lume_engine_src_test` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 223 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:unittest` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 312 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:test_plugin_static_config` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 323 |
| test | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:test_plugin_static_src` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 341 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:libCoreTestStaticPlugin` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 356 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:test_plugin_shared_config` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 368 |
| test | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:test_plugin_shared_src` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 386 |
| test | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:libCoreTestSharedPlugin` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 401 |
| test | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:test_plugin2_shared_src` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 413 |
| test | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:libCoreTestSharedPlugin2` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 428 |
| test | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:test_plugin3_shared_src` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 440 |
| test | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:libCoreTestSharedPlugin3` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 455 |
| test | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:test_plugin_circular_a_shared_src` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 464 |
| test | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:libCoreTestSharedPluginCircularA` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 477 |
| test | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:test_plugin_circular_b_shared_src` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 486 |
| test | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:libCoreTestSharedPluginCircularB` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 499 |
| test | `action` | `//foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest:PushTestResource` | [foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/test/unittest/BUILD.gn) | 508 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper:lume_engine_ecshelper_config` | [foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper:lume_engine_ecshelper` | [foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper/BUILD.gn) | 25 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper:libAGPEcshelper` | [foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/ecshelper/BUILD.gn) | 54 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeEngine/DLL:lume_engine_dll` | [foundation/graphic/graphic_3d/lume/LumeEngine/DLL/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/DLL/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeEngine/DLL:lume_engine_dynamic_src` | [foundation/graphic/graphic_3d/lume/LumeEngine/DLL/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeEngine/DLL/BUILD.gn) | 20 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeMRT:lume_mrt_api` | [foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeMRT:lume_mrt_config` | [foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn) | 33 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeMRT:lume_mrt_src` | [foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn) | 70 |
| production | `lume_compile_shader` | `//foundation/graphic/graphic_3d/lume/LumeMRT:lume_mrt_compile_shader` | [foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn) | 104 |
| production | `lume_rofs` | `//foundation/graphic/graphic_3d/lume/LumeMRT:lume_mrt_rofs` | [foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn) | 123 |
| production | `source_set` | `//foundation/graphic/graphic_3d/lume/LumeMRT:lume_mrt_rofs_obj` | [foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn) | 163 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeMRT:libMRT` | [foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn) | 185 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeMRT:lume_mrt_plugin_config` | [foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn) | 198 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeMRT:lume_mrt_src_plugin` | [foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn) | 204 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeMRT:libPluginMRT` | [foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMRT/BUILD.gn) | 222 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeBoidsSwarm:lume_boids_swarm_config` | [foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeBoidsSwarm:lume_boids_swarm_api` | [foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/BUILD.gn) | 45 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeBoidsSwarm:lume_boids_swarm_src` | [foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/BUILD.gn) | 51 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeBoidsSwarm:PluginBoidsSwarmApi` | [foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/BUILD.gn) | 87 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeBoidsSwarm:libPluginBoidsSwarm` | [foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/BUILD.gn) | 98 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/test/unittest:lume_boids_swarm_test_config` | [foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/test/unittest/BUILD.gn) | 33 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/test/unittest:lume_boids_swarm_api_test` | [foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/test/unittest/BUILD.gn) | 61 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/test/unittest:unittest` | [foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBoidsSwarm/test/unittest/BUILD.gn) | 130 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeRender:lume_render_api` | [foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeRender:lume_render_config` | [foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn) | 55 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeRender:lume_render_src` | [foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn) | 137 |
| production | `source_set` | `//foundation/graphic/graphic_3d/lume/LumeRender:lume_render_rofs_obj` | [foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn) | 565 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeRender:lume_render_src_plugin` | [foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn) | 591 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeRender:AGPRenderApi` | [foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/BUILD.gn) | 619 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:lume_render_test_config` | [foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn) | 35 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:lume_render_test_dynamic_lib_config` | [foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn) | 58 |
| test | `source_set` | `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:lume_render_test_rofs_obj` | [foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn) | 151 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:lume_render_api_test` | [foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn) | 178 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:lume_render_static_lib_config` | [foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn) | 280 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:lume_render_src_test` | [foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn) | 292 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:unittest` | [foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn) | 459 |
| test | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:lume_render_src_static` | [foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn) | 470 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:libStaticAGPRender` | [foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn) | 483 |
| test | `action` | `//foundation/graphic/graphic_3d/lume/LumeRender/test/unittest:PushTestResource` | [foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeRender/test/unittest/BUILD.gn) | 496 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeDotfield:lume_dotfield_api` | [foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeDotfield:lume_dotfield_config` | [foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn) | 32 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeDotfield:lume_dotfield_src` | [foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn) | 69 |
| production | `lume_compile_shader` | `//foundation/graphic/graphic_3d/lume/LumeDotfield:lume_dotfield_compile_shader` | [foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn) | 108 |
| production | `lume_rofs` | `//foundation/graphic/graphic_3d/lume/LumeDotfield:lume_dotfield_rofs` | [foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn) | 127 |
| production | `source_set` | `//foundation/graphic/graphic_3d/lume/LumeDotfield:lume_dotfield_rofs_obj` | [foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn) | 167 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeDotfield:libDotfield` | [foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn) | 189 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeDotfield:lume_dotfield_plugin_config` | [foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn) | 202 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeDotfield:lume_dotfield_src_plugin` | [foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn) | 208 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeDotfield:libPluginDotfield` | [foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/BUILD.gn) | 226 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeDotfield/test/unittest:lume_dotfield_test_config` | [foundation/graphic/graphic_3d/lume/LumeDotfield/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/test/unittest/BUILD.gn) | 31 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumeDotfield/test/unittest:lume_dotfield_api_test` | [foundation/graphic/graphic_3d/lume/LumeDotfield/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/test/unittest/BUILD.gn) | 59 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeDotfield/test/unittest:unittest` | [foundation/graphic/graphic_3d/lume/LumeDotfield/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeDotfield/test/unittest/BUILD.gn) | 130 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeBase:lume_base_api_config` | [foundation/graphic/graphic_3d/lume/LumeBase/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBase/BUILD.gn) | 19 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeBase:lume_unit_test_config` | [foundation/graphic/graphic_3d/lume/LumeBase/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBase/BUILD.gn) | 41 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumeBase/test/unittest:lume_base_api_test` | [foundation/graphic/graphic_3d/lume/LumeBase/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBase/test/unittest/BUILD.gn) | 23 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeBase/test/unittest:unittest` | [foundation/graphic/graphic_3d/lume/LumeBase/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBase/test/unittest/BUILD.gn) | 81 |
| production | `lume_binary_complile` | `//foundation/graphic/graphic_3d/lume/LumeBinaryCompile/LumeShaderCompiler:lume_binary_shader_compile` | [foundation/graphic/graphic_3d/lume/LumeBinaryCompile/LumeShaderCompiler/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBinaryCompile/LumeShaderCompiler/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//foundation/graphic/graphic_3d/lume/LumeBinaryCompile/LumeShaderCompiler:binary_compile_shader` | [foundation/graphic/graphic_3d/lume/LumeBinaryCompile/LumeShaderCompiler/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBinaryCompile/LumeShaderCompiler/BUILD.gn) | 22 |
| production | `lume_binary_complile` | `//foundation/graphic/graphic_3d/lume/LumeBinaryCompile/lumeassetcompiler:lume_binary_assets_compile` | [foundation/graphic/graphic_3d/lume/LumeBinaryCompile/lumeassetcompiler/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBinaryCompile/lumeassetcompiler/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//foundation/graphic/graphic_3d/lume/LumeBinaryCompile/lumeassetcompiler:binary_compile_asset` | [foundation/graphic/graphic_3d/lume/LumeBinaryCompile/lumeassetcompiler/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeBinaryCompile/lumeassetcompiler/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeMeta:lume_metaobject_config` | [foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn) | 17 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeMeta:lume_metaobject_src` | [foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn) | 55 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeMeta:lume_meta_api_config` | [foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn) | 212 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeMeta:AGPMetaApi` | [foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn) | 218 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumeMeta:libMetaObject` | [foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn) | 229 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeMeta:libPluginMetaObject` | [foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMeta/BUILD.gn) | 239 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeMeta/test/unittest:lume_meta_test_config` | [foundation/graphic/graphic_3d/lume/LumeMeta/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMeta/test/unittest/BUILD.gn) | 29 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumeMeta/test/unittest:lume_meta_api_test` | [foundation/graphic/graphic_3d/lume/LumeMeta/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMeta/test/unittest/BUILD.gn) | 52 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeMeta/test/unittest:unittest` | [foundation/graphic/graphic_3d/lume/LumeMeta/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeMeta/test/unittest/BUILD.gn) | 174 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeScene:lume_scenewidget_config` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 17 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeScene:lume_scenewidget_src` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 60 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeScene:lume_scene_api_config` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 275 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeScene:AGPSceneApi` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 281 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeScene:libPluginSceneWidget` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 291 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeScene:lume_scene_metadata_importer_config` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 302 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeScene:lume_scene_metadata_importer_src` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 308 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeScene:libPluginLumeSceneMetadataImporter` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 393 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeScene:lume_scene_importer_config` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 402 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumeScene:lume_scene_importer_src` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 408 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_3d/lume/LumeScene:libPluginLumeSceneImporter` | [foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/BUILD.gn) | 538 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/json_parse_fuzzer:JsonParseFuzzTest` | [foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/json_parse_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/json_parse_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/json_parse_fuzzer:fuzztest` | [foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/json_parse_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/json_parse_fuzzer/BUILD.gn) | 45 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest:fuzztest` | [foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/property_path_fuzzer:PropertyPathFuzzTest` | [foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/property_path_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/property_path_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/property_path_fuzzer:fuzztest` | [foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/property_path_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/property_path_fuzzer/BUILD.gn) | 52 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/gltf_load_fuzzer:GltfLoadFuzzTest` | [foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/gltf_load_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/gltf_load_fuzzer/BUILD.gn) | 18 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/gltf_load_fuzzer:fuzztest` | [foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/gltf_load_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/test/fuzztest/gltf_load_fuzzer/BUILD.gn) | 67 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumeScene/test/unittest:lume_scene_test_config` | [foundation/graphic/graphic_3d/lume/LumeScene/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/test/unittest/BUILD.gn) | 32 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumeScene/test/unittest:lume_scene_api_test` | [foundation/graphic/graphic_3d/lume/LumeScene/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/test/unittest/BUILD.gn) | 65 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumeScene/test/unittest:unittest` | [foundation/graphic/graphic_3d/lume/LumeScene/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumeScene/test/unittest/BUILD.gn) | 183 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumePng:lume_png_api` | [foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn) | 15 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumePng:lume_png_config` | [foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn) | 19 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumePng:lume_png_src` | [foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn) | 30 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_3d/lume/LumePng:libPngStatic` | [foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn) | 52 |
| build-support | `config` | `//foundation/graphic/graphic_3d/lume/LumePng:lume_plugin_png_config` | [foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn) | 61 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_3d/lume/LumePng:lume_plugin_png_src` | [foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumePng/BUILD.gn) | 65 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_3d/lume/LumePng/test/unittest:lume_png_src_test` | [foundation/graphic/graphic_3d/lume/LumePng/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumePng/test/unittest/BUILD.gn) | 20 |
| test | `group` | `//foundation/graphic/graphic_3d/lume/LumePng/test/unittest:unittest` | [foundation/graphic/graphic_3d/lume/LumePng/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_3d/lume/LumePng/test/unittest/BUILD.gn) | 64 |

## 查询命令

```bash
awk -F '\t' '$1 == "graphic" && $2 == "graphic_3d"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
