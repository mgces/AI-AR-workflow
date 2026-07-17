# video_processing_engine：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `multimedia` |
| component | `video_processing_engine` |
| Git 子仓 | `foundation/multimedia/video_processing_engine` |
| bundle | [foundation/multimedia/video_processing_engine/bundle.json](../../../../../../foundation/multimedia/video_processing_engine/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 24 |
| third-party dependencies | 0 |
| declared sub_component | 4 |
| inner kits | 7 |
| declared test entries | 4 |

## 依赖

组件依赖：`c_utils`, `graphic_2d`, `graphic_surface`, `hilog`, `hitrace`, `drivers_interface_display`, `ffrt`, `init`, `hdf_core`, `image_framework`, `media_foundation`, `napi`, `ipc`, `runtime_core`, `safwk`, `samgr`, `eventhandler`, `libxml2`, `skia`, `egl`, `opengles`, `bounds_checking_function`, `opencl-headers`, `window_manager`

三方依赖：无声明

## 声明构建入口

- `//foundation/multimedia/video_processing_engine/framework:videoprocessingengine`
- `//foundation/multimedia/video_processing_engine/services:video_processing_service_group`
- `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:video_processing_engine_taihe_gen_only`
- `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:video_processing_engine_taihe_group`

## 声明测试入口

- `//foundation/multimedia/video_processing_engine/test:demo_test`
- `//foundation/multimedia/video_processing_engine/test:unit_test`
- `//foundation/multimedia/video_processing_engine/test:module_test`
- `//foundation/multimedia/video_processing_engine/test:fuzz_test`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 21 |
| test | 30 |
| build-support | 7 |
| aggregate-codegen | 9 |
| total | 67 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/multimedia/video_processing_engine/framework:export_config` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/multimedia/video_processing_engine/framework:video_process_config` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 37 |
| production | `ohos_prebuilt_shared_library` | `//foundation/multimedia/video_processing_engine/framework:extream_vision_engine` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 93 |
| production | `ohos_prebuilt_shared_library` | `//foundation/multimedia/video_processing_engine/framework:ai_super_resolution` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 107 |
| production | `ohos_prebuilt_shared_library` | `//foundation/multimedia/video_processing_engine/framework:aihdr_engine` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 121 |
| aggregate-codegen | `group` | `//foundation/multimedia/video_processing_engine/framework:extream_vision_engine` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 135 |
| aggregate-codegen | `group` | `//foundation/multimedia/video_processing_engine/framework:ai_super_resolution` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 138 |
| aggregate-codegen | `group` | `//foundation/multimedia/video_processing_engine/framework:aihdr_engine` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 141 |
| production | `ohos_shared_library` | `//foundation/multimedia/video_processing_engine/framework:videoprocessingengine` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 145 |
| build-support | `config` | `//foundation/multimedia/video_processing_engine/framework:vpe_capi_config` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 251 |
| build-support | `config` | `//foundation/multimedia/video_processing_engine/framework:vpe_capi_public_config` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 272 |
| production | `ohos_shared_library` | `//foundation/multimedia/video_processing_engine/framework:image_processing` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 279 |
| production | `ohos_shared_library` | `//foundation/multimedia/video_processing_engine/framework:video_processing` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 363 |
| production | `ohos_shared_library` | `//foundation/multimedia/video_processing_engine/framework:detailEnhancer` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 444 |
| production | `ohos_shared_library` | `//foundation/multimedia/video_processing_engine/framework:videoprocessingenginenapi` | [foundation/multimedia/video_processing_engine/framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/framework/BUILD.gn) | 490 |
| aggregate-codegen | `group` | `//foundation/multimedia/video_processing_engine:video_processing_engine_packages` | [foundation/multimedia/video_processing_engine/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/BUILD.gn) | 17 |
| production | `ohos_ndk_headers` | `//foundation/multimedia/video_processing_engine/interfaces/kits/c/image_processing:image_processing_ndk_headers` | [foundation/multimedia/video_processing_engine/interfaces/kits/c/image_processing/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/c/image_processing/BUILD.gn) | 17 |
| production | `ohos_ndk_library` | `//foundation/multimedia/video_processing_engine/interfaces/kits/c/image_processing:libimage_processing_ndk` | [foundation/multimedia/video_processing_engine/interfaces/kits/c/image_processing/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/c/image_processing/BUILD.gn) | 25 |
| production | `ohos_ndk_headers` | `//foundation/multimedia/video_processing_engine/interfaces/kits/c/video_processing:video_processing_ndk_headers` | [foundation/multimedia/video_processing_engine/interfaces/kits/c/video_processing/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/c/video_processing/BUILD.gn) | 17 |
| production | `ohos_ndk_library` | `//foundation/multimedia/video_processing_engine/interfaces/kits/c/video_processing:libvideo_processing_ndk` | [foundation/multimedia/video_processing_engine/interfaces/kits/c/video_processing/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/c/video_processing/BUILD.gn) | 25 |
| build-support | `config` | `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:video_processing_engine_taihe_config` | [foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn) | 23 |
| aggregate-codegen | `copy_taihe_idl` | `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:copy_video_processing_engine_taihe` | [foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn) | 28 |
| production | `ohos_taihe` | `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:run_taihe` | [foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn) | 38 |
| aggregate-codegen | `generate_static_abc` | `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:video_processing_engine_taihe_abc` | [foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn) | 47 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:video_processing_engine_etc` | [foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn) | 55 |
| aggregate-codegen | `group` | `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:video_processing_engine_taihe_group` | [foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn) | 63 |
| aggregate-codegen | `group` | `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:video_processing_engine_taihe_gen_only` | [foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn) | 70 |
| production | `taihe_shared_library` | `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:video_processing_engine_taihe` | [foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn) | 74 |
| production | `taihe_shared_library` | `//foundation/multimedia/video_processing_engine/interfaces/kits/taihe:video_processing_engine_taihe_core` | [foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/interfaces/kits/taihe/BUILD.gn) | 133 |
| aggregate-codegen | `group` | `//foundation/multimedia/video_processing_engine/services:video_processing_service_group` | [foundation/multimedia/video_processing_engine/services/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/services/BUILD.gn) | 19 |
| production | `idl_gen_interface` | `//foundation/multimedia/video_processing_engine/services:videoprocessingservice_interface` | [foundation/multimedia/video_processing_engine/services/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/services/BUILD.gn) | 33 |
| build-support | `config` | `//foundation/multimedia/video_processing_engine/services:videoprocessingservice_config` | [foundation/multimedia/video_processing_engine/services/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/services/BUILD.gn) | 40 |
| build-support | `config` | `//foundation/multimedia/video_processing_engine/services:videoprocessingservice_export_config` | [foundation/multimedia/video_processing_engine/services/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/services/BUILD.gn) | 52 |
| production | `ohos_shared_library` | `//foundation/multimedia/video_processing_engine/services:videoprocessingserviceimpl` | [foundation/multimedia/video_processing_engine/services/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/services/BUILD.gn) | 64 |
| production | `ohos_shared_library` | `//foundation/multimedia/video_processing_engine/services:videoprocessingservice` | [foundation/multimedia/video_processing_engine/services/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/services/BUILD.gn) | 113 |
| production | `ohos_sa_profile` | `//foundation/multimedia/video_processing_engine/services/sa_profile:video_processing_service` | [foundation/multimedia/video_processing_engine/services/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/services/sa_profile/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/video_processing_engine/services/sa_profile:video_processing_service_etc` | [foundation/multimedia/video_processing_engine/services/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/services/sa_profile/BUILD.gn) | 22 |
| test | `ohos_fuzztest` | `//foundation/multimedia/video_processing_engine/test/fuzztest/services_fuzzer:ServicesFuzzTest` | [foundation/multimedia/video_processing_engine/test/fuzztest/services_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/fuzztest/services_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/multimedia/video_processing_engine/test:demo_test` | [foundation/multimedia/video_processing_engine/test/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/BUILD.gn) | 60 |
| test | `group` | `//foundation/multimedia/video_processing_engine/test:unit_test` | [foundation/multimedia/video_processing_engine/test/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/BUILD.gn) | 68 |
| test | `group` | `//foundation/multimedia/video_processing_engine/test:module_test` | [foundation/multimedia/video_processing_engine/test/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/BUILD.gn) | 115 |
| test | `group` | `//foundation/multimedia/video_processing_engine/test:fuzz_test` | [foundation/multimedia/video_processing_engine/test/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/BUILD.gn) | 133 |
| test | `group` | `//foundation/multimedia/video_processing_engine/test/ndk:vpe_module_test` | [foundation/multimedia/video_processing_engine/test/ndk/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/ndk/BUILD.gn) | 16 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/ndk/moduletest/video:vpe_video_native_module_test` | [foundation/multimedia/video_processing_engine/test/ndk/moduletest/video/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/ndk/moduletest/video/BUILD.gn) | 45 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/ndk/moduletest/image:vpe_image_native_module_test` | [foundation/multimedia/video_processing_engine/test/ndk/moduletest/image/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/ndk/moduletest/image/BUILD.gn) | 45 |
| test | `ohos_source_set` | `//foundation/multimedia/video_processing_engine/test/utils/DetailEnhancer/sample:detailEnh_test_utils` | [foundation/multimedia/video_processing_engine/test/utils/DetailEnhancer/sample/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/utils/DetailEnhancer/sample/BUILD.gn) | 17 |
| test | `ohos_source_set` | `//foundation/multimedia/video_processing_engine/test/utils/ColorSpaceConverter/sample:csc_test_utils` | [foundation/multimedia/video_processing_engine/test/utils/ColorSpaceConverter/sample/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/utils/ColorSpaceConverter/sample/BUILD.gn) | 17 |
| test | `ohos_executable` | `//foundation/multimedia/video_processing_engine/test/nativedemo/vpe_demo:vpe_demo` | [foundation/multimedia/video_processing_engine/test/nativedemo/vpe_demo/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/nativedemo/vpe_demo/BUILD.gn) | 17 |
| test | `ohos_executable` | `//foundation/multimedia/video_processing_engine/test/nativedemo/vpe_demo:detailEnh_demo` | [foundation/multimedia/video_processing_engine/test/nativedemo/vpe_demo/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/nativedemo/vpe_demo/BUILD.gn) | 52 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/image_processing:image_processing_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/image_processing/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/image_processing/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/contrast_enhancer:contrast_enhancer_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/contrast_enhancer/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/contrast_enhancer/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/vpe_framework:vpe_framework_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/vpe_framework/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/vpe_framework/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/aihdr_enhancer:aihdr_enhancer_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/aihdr_enhancer/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/aihdr_enhancer/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer_video_ndk:detail_enhancer_video_ndk_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer_video_ndk/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer_video_ndk/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/colorSpace_converter_video_ndk:colorSpace_converter_video_ndk_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/colorSpace_converter_video_ndk/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/colorSpace_converter_video_ndk/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer:detail_enhancer_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/metadata_gen_video_ndk:metadata_gen_video_ndk_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/metadata_gen_video_ndk/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/metadata_gen_video_ndk/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/aihdr_enhancer_video:aihdr_enhancer_video_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/aihdr_enhancer_video/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/aihdr_enhancer_video/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/service:services_test` | [foundation/multimedia/video_processing_engine/test/unittest/service/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/service/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/colorspace_converter_video:colorspace_converter_video_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/colorspace_converter_video/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/colorspace_converter_video/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer_video:detail_enhancer_video_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer_video/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer_video/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer_video:detail_enhancer_video_innerapi_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer_video/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/detail_enhancer_video/BUILD.gn) | 61 |
| test | `ohos_unittest` | `//foundation/multimedia/video_processing_engine/test/unittest/video_variable_refreshrate_test:video_variable_refreshrate_unit_test` | [foundation/multimedia/video_processing_engine/test/unittest/video_variable_refreshrate_test/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/unittest/video_variable_refreshrate_test/BUILD.gn) | 17 |
| test | `ohos_moduletest` | `//foundation/multimedia/video_processing_engine/test/moduletest/metadata_generator:metadata_generator_module_test` | [foundation/multimedia/video_processing_engine/test/moduletest/metadata_generator/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/moduletest/metadata_generator/BUILD.gn) | 18 |
| test | `ohos_moduletest` | `//foundation/multimedia/video_processing_engine/test/moduletest/metadata_generator_video:metadata_generator_video_module_test` | [foundation/multimedia/video_processing_engine/test/moduletest/metadata_generator_video/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/moduletest/metadata_generator_video/BUILD.gn) | 18 |
| test | `ohos_moduletest` | `//foundation/multimedia/video_processing_engine/test/moduletest/colorspace_converter_video:colorspace_converter_video_module_test` | [foundation/multimedia/video_processing_engine/test/moduletest/colorspace_converter_video/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/moduletest/colorspace_converter_video/BUILD.gn) | 18 |
| test | `ohos_moduletest` | `//foundation/multimedia/video_processing_engine/test/moduletest/colorspace_converter:colorspace_converter_module_test` | [foundation/multimedia/video_processing_engine/test/moduletest/colorspace_converter/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/test/moduletest/colorspace_converter/BUILD.gn) | 18 |

## 查询命令

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "video_processing_engine"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
