# neural_network_runtime：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `ai` |
| component | `neural_network_runtime` |
| Git 子仓 | `foundation/ai/neural_network_runtime` |
| bundle | [foundation/ai/neural_network_runtime/bundle.json](../../../../../../foundation/ai/neural_network_runtime/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 12 |
| third-party dependencies | 0 |
| declared sub_component | 1 |
| inner kits | 3 |
| declared test entries | 2 |

## 依赖

组件依赖：`c_utils`, `drivers_interface_nnrt`, `hdf_core`, `hilog`, `hitrace`, `ipc`, `mindspore`, `init`, `json`, `jsoncpp`, `eventhandler`, `openssl`

三方依赖：无声明

## 声明构建入口

- `//foundation/ai/neural_network_runtime:nnrt_target`

## 声明测试入口

- `//foundation/ai/neural_network_runtime/test/unittest:unittest`
- `//foundation/ai/neural_network_runtime:nnrt_fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 8 |
| test | 58 |
| build-support | 15 |
| aggregate-codegen | 8 |
| total | 89 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0:nnrt_entry` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/BUILD.gn) | 15 |
| aggregate-codegen | `group` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0:nnrt_entry` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/BUILD.gn) | 19 |
| production | `ohos_prebuilt_shared_library` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service:mindspore_demo` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service:libnnrt_device_service_2.0` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service:libnnrt_driver` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service/BUILD.gn) | 54 |
| aggregate-codegen | `group` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service:hdf_nnrt_service` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v2_0/hdi_cpu_service/BUILD.gn) | 75 |
| aggregate-codegen | `group` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0:nnrt_entry` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/BUILD.gn) | 15 |
| aggregate-codegen | `group` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0:nnrt_entry` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/BUILD.gn) | 19 |
| production | `ohos_prebuilt_shared_library` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service:mindspore_demo` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service:libnnrt_device_service_1.0` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service:libnnrt_driver` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service/BUILD.gn) | 54 |
| aggregate-codegen | `group` | `//foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service:hdf_nnrt_service` | [foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/example/drivers/nnrt/v1_0/hdi_cpu_service/BUILD.gn) | 75 |
| aggregate-codegen | `group` | `//foundation/ai/neural_network_runtime:nnrt_target` | [foundation/ai/neural_network_runtime/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/BUILD.gn) | 16 |
| aggregate-codegen | `group` | `//foundation/ai/neural_network_runtime:nncore_target` | [foundation/ai/neural_network_runtime/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/BUILD.gn) | 23 |
| test | `group` | `//foundation/ai/neural_network_runtime:nnrt_test_target` | [foundation/ai/neural_network_runtime/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/BUILD.gn) | 27 |
| test | `group` | `//foundation/ai/neural_network_runtime:nnrt_fuzztest` | [foundation/ai/neural_network_runtime/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/BUILD.gn) | 31 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/frameworks/native/neural_network_core:nnrt_config` | [foundation/ai/neural_network_runtime/frameworks/native/neural_network_core/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/frameworks/native/neural_network_core/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/frameworks/native/neural_network_core:nnrt_public_config` | [foundation/ai/neural_network_runtime/frameworks/native/neural_network_core/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/frameworks/native/neural_network_core/BUILD.gn) | 21 |
| production | `ohos_shared_library` | `//foundation/ai/neural_network_runtime/frameworks/native/neural_network_core:libneural_network_core` | [foundation/ai/neural_network_runtime/frameworks/native/neural_network_core/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/frameworks/native/neural_network_core/BUILD.gn) | 41 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/frameworks/native/neural_network_runtime:nnrt_config` | [foundation/ai/neural_network_runtime/frameworks/native/neural_network_runtime/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/frameworks/native/neural_network_runtime/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/ai/neural_network_runtime/frameworks/native/neural_network_runtime:libneural_network_runtime` | [foundation/ai/neural_network_runtime/frameworks/native/neural_network_runtime/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/frameworks/native/neural_network_runtime/BUILD.gn) | 170 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/system_test:system_test_config` | [foundation/ai/neural_network_runtime/test/system_test/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/system_test/BUILD.gn) | 18 |
| test | `ohos_systemtest` | `//foundation/ai/neural_network_runtime/test/system_test:DeviceTest` | [foundation/ai/neural_network_runtime/test/system_test/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/system_test/BUILD.gn) | 35 |
| test | `ohos_systemtest` | `//foundation/ai/neural_network_runtime/test/system_test:End2EndTest` | [foundation/ai/neural_network_runtime/test/system_test/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/system_test/BUILD.gn) | 55 |
| test | `group` | `//foundation/ai/neural_network_runtime/test/system_test:system_test` | [foundation/ai/neural_network_runtime/test/system_test/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/system_test/BUILD.gn) | 81 |
| test | `ohos_fuzztest` | `//foundation/ai/neural_network_runtime/test/fuzztest/hdinnrtdevice_fuzzer:HdiNnrtDeviceFuzzTest` | [foundation/ai/neural_network_runtime/test/fuzztest/hdinnrtdevice_fuzzer/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/fuzztest/hdinnrtdevice_fuzzer/BUILD.gn) | 21 |
| test | `ohos_fuzztest` | `//foundation/ai/neural_network_runtime/test/fuzztest/hdinnrtpreparedmodel_fuzzer:HdiNnrtPreparedModelFuzzTest` | [foundation/ai/neural_network_runtime/test/fuzztest/hdinnrtpreparedmodel_fuzzer/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/fuzztest/hdinnrtpreparedmodel_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/ai/neural_network_runtime/test/fuzztest:fuzztest` | [foundation/ai/neural_network_runtime/test/fuzztest/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/fuzztest/BUILD.gn) | 15 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/xtstest/nncore/opstest:ops_config` | [foundation/ai/neural_network_runtime/test/xtstest/nncore/opstest/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/nncore/opstest/BUILD.gn) | 17 |
| test | `ohos_moduletest_suite` | `//foundation/ai/neural_network_runtime/test/xtstest/nncore/opstest:ActsNnrtOpsTest` | [foundation/ai/neural_network_runtime/test/xtstest/nncore/opstest/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/nncore/opstest/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/xtstest/v1_0/interface:nnrt_config` | [foundation/ai/neural_network_runtime/test/xtstest/v1_0/interface/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/v1_0/interface/BUILD.gn) | 16 |
| test | `ohos_moduletest_suite` | `//foundation/ai/neural_network_runtime/test/xtstest/v1_0/interface:ActsAiNnrtFunctionV1_0Test` | [foundation/ai/neural_network_runtime/test/xtstest/v1_0/interface/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/v1_0/interface/BUILD.gn) | 22 |
| test | `group` | `//foundation/ai/neural_network_runtime/test/xtstest/v1_0:neural_network_runtime` | [foundation/ai/neural_network_runtime/test/xtstest/v1_0/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/v1_0/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/xtstest/v1_0/stability:nnrt_config` | [foundation/ai/neural_network_runtime/test/xtstest/v1_0/stability/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/v1_0/stability/BUILD.gn) | 16 |
| test | `ohos_moduletest_suite` | `//foundation/ai/neural_network_runtime/test/xtstest/v1_0/stability:ActsAiNnrtStabilityV1_0Test` | [foundation/ai/neural_network_runtime/test/xtstest/v1_0/stability/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/v1_0/stability/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/unittest/inner_kits:module_private_config` | [foundation/ai/neural_network_runtime/test/unittest/inner_kits/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/inner_kits/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/inner_kits:NeuralNetworkRuntimeInnerTest` | [foundation/ai/neural_network_runtime/test/unittest/inner_kits/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/inner_kits/BUILD.gn) | 31 |
| test | `group` | `//foundation/ai/neural_network_runtime/test/unittest/inner_kits:inner_kits_unittest` | [foundation/ai/neural_network_runtime/test/unittest/inner_kits/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/inner_kits/BUILD.gn) | 50 |
| test | `group` | `//foundation/ai/neural_network_runtime/test/unittest:unittest` | [foundation/ai/neural_network_runtime/test/unittest/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/unittest/components:module_private_config` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:CompilationV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 24 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:ExecutorV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 45 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:DeviceManagerV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 66 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:DeviceRegistrarV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 87 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:HDIDeviceV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 108 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:HDIPreparedModelV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 130 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:MemoryManagerTest` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 152 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NeuralNetworkCoreV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 173 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:QuantParamsTest` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 194 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NNBackendTest` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 214 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NNCompiledCacheTest` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 234 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NNCompilerTest` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 255 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NNExecutorTest` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 275 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NNTensor2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 295 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:TransformV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 315 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:InnerModelV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 335 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NnTensorV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 357 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NnTensorDescV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 378 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NnValidationV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 399 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:OpsRegistryV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 420 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NeuralNetworkRuntimeV1_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 441 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:CompilationV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 465 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:ExecutorV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 486 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:DeviceManagerV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 507 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:DeviceRegistrarV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 528 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:HDIDeviceV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 549 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:HDIPreparedModelV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 571 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:HDIPreparedModelV2_1Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 593 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:TransformV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 615 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:InnerModelV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 635 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NnTensorV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 657 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NnValidationV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 678 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:OpsRegistryV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 699 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/components:NeuralNetworkRuntimeV2_0Test` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 720 |
| test | `group` | `//foundation/ai/neural_network_runtime/test/unittest/components:components_unittest` | [foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/components/BUILD.gn) | 744 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/unittest/ops:module_private_config` | [foundation/ai/neural_network_runtime/test/unittest/ops/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/ops/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//foundation/ai/neural_network_runtime/test/unittest/ops:OpsUnittest` | [foundation/ai/neural_network_runtime/test/unittest/ops/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/ops/BUILD.gn) | 24 |
| test | `group` | `//foundation/ai/neural_network_runtime/test/unittest/ops:ops_unittest` | [foundation/ai/neural_network_runtime/test/unittest/ops/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/unittest/ops/BUILD.gn) | 162 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/config:coverage_flags` | [foundation/ai/neural_network_runtime/config/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/config/BUILD.gn) | 18 |
| test | `group` | `//foundation/ai/neural_network_runtime/test/xtstest/nncore:ActsHdfNncoreTest` | [foundation/ai/neural_network_runtime/test/xtstest/nncore/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/nncore/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/xtstest/nncore/e2etest:nncore_config` | [foundation/ai/neural_network_runtime/test/xtstest/nncore/e2etest/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/nncore/e2etest/BUILD.gn) | 17 |
| test | `ohos_moduletest_suite` | `//foundation/ai/neural_network_runtime/test/xtstest/nncore/e2etest:ActsNnrtE2ETest` | [foundation/ai/neural_network_runtime/test/xtstest/nncore/e2etest/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/nncore/e2etest/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/xtstest/nncore/nncoretest:nncore_config` | [foundation/ai/neural_network_runtime/test/xtstest/nncore/nncoretest/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/nncore/nncoretest/BUILD.gn) | 17 |
| test | `ohos_moduletest_suite` | `//foundation/ai/neural_network_runtime/test/xtstest/nncore/nncoretest:ActsNncoreTest` | [foundation/ai/neural_network_runtime/test/xtstest/nncore/nncoretest/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/nncore/nncoretest/BUILD.gn) | 23 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/xtstest/v2_0/interface:nnrt_config` | [foundation/ai/neural_network_runtime/test/xtstest/v2_0/interface/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/v2_0/interface/BUILD.gn) | 16 |
| test | `ohos_moduletest_suite` | `//foundation/ai/neural_network_runtime/test/xtstest/v2_0/interface:ActsAiNnrtFunctionV2_0Test` | [foundation/ai/neural_network_runtime/test/xtstest/v2_0/interface/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/v2_0/interface/BUILD.gn) | 22 |
| test | `group` | `//foundation/ai/neural_network_runtime/test/xtstest/v2_0:neural_network_runtime` | [foundation/ai/neural_network_runtime/test/xtstest/v2_0/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/v2_0/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/ai/neural_network_runtime/test/xtstest/v2_0/stability:nnrt_config` | [foundation/ai/neural_network_runtime/test/xtstest/v2_0/stability/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/v2_0/stability/BUILD.gn) | 16 |
| test | `ohos_moduletest_suite` | `//foundation/ai/neural_network_runtime/test/xtstest/v2_0/stability:ActsAiNnrtStabilityV2_0Test` | [foundation/ai/neural_network_runtime/test/xtstest/v2_0/stability/BUILD.gn](../../../../../../foundation/ai/neural_network_runtime/test/xtstest/v2_0/stability/BUILD.gn) | 22 |

## 查询命令

```bash
awk -F '\t' '$1 == "ai" && $2 == "neural_network_runtime"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
