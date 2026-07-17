# graphic_surface：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `graphic` |
| component | `graphic_surface` |
| Git 子仓 | `foundation/graphic/graphic_surface` |
| bundle | [foundation/graphic/graphic_surface/bundle.json](../../../../../../foundation/graphic/graphic_surface/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 15 |
| third-party dependencies | 0 |
| declared sub_component | 7 |
| inner kits | 7 |
| declared test entries | 6 |

## 依赖

组件依赖：`access_token`, `bounds_checking_function`, `cJSON`, `c_utils`, `config_policy`, `drivers_interface_display`, `eventhandler`, `hicollie`, `hilog`, `hitrace`, `hisysevent`, `init`, `ipc`, `samgr`, `selinux_adapter`

三方依赖：无声明

## 声明构建入口

- `//foundation/graphic/graphic_surface/surface:surface`
- `//foundation/graphic/graphic_surface/sync_fence:sync_fence`
- `//foundation/graphic/graphic_surface/buffer_handle:buffer_handle`
- `//foundation/graphic/graphic_surface/utils/frame_report:frame_report`
- `//foundation/graphic/graphic_surface/utils/hebc_white_list:hebc_white_list`
- `//foundation/graphic/graphic_surface/surface:surface_static`
- `//foundation/graphic/graphic_surface/sync_fence:sync_fence_static`

## 声明测试入口

- `//foundation/graphic/graphic_surface/surface/test:test`
- `//foundation/graphic/graphic_surface/buffer_handle/test:test`
- `//foundation/graphic/graphic_surface/sync_fence/test:test`
- `//foundation/graphic/graphic_surface/utils/frame_report/test:test`
- `//foundation/graphic/graphic_surface/utils/hebc_white_list/test:test`
- `//foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test:test`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 11 |
| test | 83 |
| build-support | 20 |
| aggregate-codegen | 0 |
| total | 114 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/graphic/graphic_surface/sync_fence:sync_fence_config` | [foundation/graphic/graphic_surface/sync_fence/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/graphic/graphic_surface/sync_fence:sync_fence_public_config` | [foundation/graphic/graphic_surface/sync_fence/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/BUILD.gn) | 34 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_surface/sync_fence:sync_fence` | [foundation/graphic/graphic_surface/sync_fence/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/BUILD.gn) | 41 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_surface/sync_fence:sync_fence_static` | [foundation/graphic/graphic_surface/sync_fence/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/BUILD.gn) | 72 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/sync_fence/test/fuzztest/nativefence_fuzzer:NativeFenceFuzzTest` | [foundation/graphic/graphic_surface/sync_fence/test/fuzztest/nativefence_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/test/fuzztest/nativefence_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/sync_fence/test/fuzztest/nativefence_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/sync_fence/test/fuzztest/nativefence_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/test/fuzztest/nativefence_fuzzer/BUILD.gn) | 45 |
| test | `group` | `//foundation/graphic/graphic_surface/sync_fence/test/fuzztest:fuzztest` | [foundation/graphic/graphic_surface/sync_fence/test/fuzztest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/test/fuzztest/BUILD.gn) | 14 |
| test | `group` | `//foundation/graphic/graphic_surface/sync_fence/test:test` | [foundation/graphic/graphic_surface/sync_fence/test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/test/BUILD.gn) | 14 |
| test | `group` | `//foundation/graphic/graphic_surface/sync_fence/test/unittest:unittest` | [foundation/graphic/graphic_surface/sync_fence/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/test/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/sync_fence/test/unittest:sync_fence_test` | [foundation/graphic/graphic_surface/sync_fence/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/test/unittest/BUILD.gn) | 29 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/sync_fence/test/unittest:native_fence_test` | [foundation/graphic/graphic_surface/sync_fence/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/test/unittest/BUILD.gn) | 54 |
| build-support | `config` | `//foundation/graphic/graphic_surface/sync_fence/test/unittest:sync_fence_common_public_config` | [foundation/graphic/graphic_surface/sync_fence/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/test/unittest/BUILD.gn) | 75 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_surface/sync_fence/test/unittest:sync_fence_common` | [foundation/graphic/graphic_surface/sync_fence/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sync_fence/test/unittest/BUILD.gn) | 85 |
| build-support | `config` | `//foundation/graphic/graphic_surface/sandbox:sandbox_utils_config` | [foundation/graphic/graphic_surface/sandbox/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sandbox/BUILD.gn) | 16 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_surface/sandbox:sandbox_utils` | [foundation/graphic/graphic_surface/sandbox/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/sandbox/BUILD.gn) | 20 |
| build-support | `config` | `//foundation/graphic/graphic_surface/surface:surface_config` | [foundation/graphic/graphic_surface/surface/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/graphic/graphic_surface/surface:surface_public_config` | [foundation/graphic/graphic_surface/surface/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/BUILD.gn) | 30 |
| build-support | `config` | `//foundation/graphic/graphic_surface/surface:surface_headers_config` | [foundation/graphic/graphic_surface/surface/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/BUILD.gn) | 46 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_surface/surface:surface_headers` | [foundation/graphic/graphic_surface/surface/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/BUILD.gn) | 50 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_surface/surface:surface` | [foundation/graphic/graphic_surface/surface/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/BUILD.gn) | 56 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_surface/surface:surface_static` | [foundation/graphic/graphic_surface/surface/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/BUILD.gn) | 99 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceutils_fuzzer:SurfaceUtilsFuzzTest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceutils_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceutils_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceutils_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceutils_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceutils_fuzzer/BUILD.gn) | 45 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/fuzztest:fuzztest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/surfacebuffer_fuzzer:SurfaceBufferFuzzTest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/surfacebuffer_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/surfacebuffer_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/surfacebuffer_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/surfacebuffer_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/surfacebuffer_fuzzer/BUILD.gn) | 45 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueue_fuzzer:BufferQueueFuzzTest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueue_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueue_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueue_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueue_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueue_fuzzer/BUILD.gn) | 50 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceconcurrent_fuzzer:SurfaceConcurrentFuzzTest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceconcurrent_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceconcurrent_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceconcurrent_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceconcurrent_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/surfaceconcurrent_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/bufferutils_fuzzer:BufferUtilsFuzzTest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/bufferutils_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/bufferutils_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/bufferutils_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/bufferutils_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/bufferutils_fuzzer/BUILD.gn) | 46 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/nativewindow_fuzzer:NativeWindowFuzzTest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/nativewindow_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/nativewindow_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/nativewindow_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/nativewindow_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/nativewindow_fuzzer/BUILD.gn) | 47 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/nativebuffer_fuzzer:NativeBufferFuzzTest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/nativebuffer_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/nativebuffer_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/nativebuffer_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/nativebuffer_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/nativebuffer_fuzzer/BUILD.gn) | 47 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/surface_fuzzer:SurfaceFuzzTest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/surface_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/surface_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/surface_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/surface_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/surface_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueueproducer_fuzzer:BufferQueueProducerFuzzTest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueueproducer_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueueproducer_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueueproducer_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueueproducer_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/fuzztest/bufferqueueproducer_fuzzer/BUILD.gn) | 51 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test:test` | [foundation/graphic/graphic_surface/surface/test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/BUILD.gn) | 14 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/systemtest/attach_and_detach_buffer_test:systemtest` | [foundation/graphic/graphic_surface/surface/test/systemtest/attach_and_detach_buffer_test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/attach_and_detach_buffer_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/systemtest/attach_and_detach_buffer_test:attach_and_detach_buffer_with_default_usage_test` | [foundation/graphic/graphic_surface/surface/test/systemtest/attach_and_detach_buffer_test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/attach_and_detach_buffer_test/BUILD.gn) | 26 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/systemtest:unittest` | [foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/systemtest:native_window_buffer_test_st` | [foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn) | 35 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/systemtest:native_window_test_st` | [foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn) | 58 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/systemtest:surface_ipc_test_st` | [foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn) | 79 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/systemtest:native_window_clean_cache_test_st` | [foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn) | 101 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/systemtest:surface_ipc_with_connect_strictly_test_st` | [foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn) | 120 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/systemtest:surface_batch_opt_with_connect_strictly_test_st` | [foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn) | 142 |
| build-support | `config` | `//foundation/graphic/graphic_surface/surface/test/systemtest:surface_system_test_common_public_config` | [foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn) | 162 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_surface/surface/test/systemtest:surface_system_test_common` | [foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/BUILD.gn) | 174 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test:systemtest` | [foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test:surface_ipc_with_pts_test_st` | [foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test/BUILD.gn) | 30 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test:surface_ipc_with_invaild_pts_test_st` | [foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test/BUILD.gn) | 65 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test:surface_ipc_with_dropframe_test_st` | [foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/systemtest/buffer_with_present_timestamp_test/BUILD.gn) | 100 |
| test | `group` | `//foundation/graphic/graphic_surface/surface/test/unittest:unittest` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:producer_surface_delegator_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 45 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:consumer_surface_delegator_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 66 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:buffer_client_producer_remote_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 87 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:buffer_queue_consumer_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 111 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:buffer_queue_producer_remote_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 131 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:buffer_queue_producer_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 153 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:buffer_queue_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 172 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:consumer_surface_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 191 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:delegator_adapter_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 213 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:producer_surface_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 234 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:surface_buffer_impl_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 255 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:surface_utils_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 277 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:native_window_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 297 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:metadata_helper_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 318 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:native_buffer_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 342 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:buffer_utils_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 364 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:surface_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 382 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/surface/test/unittest:surface_type_test` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 402 |
| build-support | `config` | `//foundation/graphic/graphic_surface/surface/test/unittest:surface_test_common_public_config` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 421 |
| test | `ohos_source_set` | `//foundation/graphic/graphic_surface/surface/test/unittest:mock_dlfcn` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 433 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_surface/surface/test/unittest:surface_test_common` | [foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/surface/test/unittest/BUILD.gn) | 461 |
| build-support | `config` | `//foundation/graphic/graphic_surface/test_header:test_header_config` | [foundation/graphic/graphic_surface/test_header/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/test_header/BUILD.gn) | 16 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_surface/test_header:test_header` | [foundation/graphic/graphic_surface/test_header/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/test_header/BUILD.gn) | 20 |
| production | `ohos_source_set` | `//foundation/graphic/graphic_surface/utils/rs_frame_report_ext:rs_frame_report_ext_surface` | [foundation/graphic/graphic_surface/utils/rs_frame_report_ext/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/rs_frame_report_ext/BUILD.gn) | 16 |
| test | `group` | `//foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test:test` | [foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/BUILD.gn) | 13 |
| test | `group` | `//foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest:unittest` | [foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest:rs_frame_report_ext_test` | [foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest:rs_frame_report_ext_test_config` | [foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest/BUILD.gn) | 34 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest:rs_frame_report_ext_test_common` | [foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/rs_frame_report_ext/test/unittest/BUILD.gn) | 44 |
| build-support | `config` | `//foundation/graphic/graphic_surface/utils/hebc_white_list:hebc_white_list_config` | [foundation/graphic/graphic_surface/utils/hebc_white_list/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/hebc_white_list/BUILD.gn) | 19 |
| build-support | `config` | `//foundation/graphic/graphic_surface/utils/hebc_white_list:hebc_white_list_public_config` | [foundation/graphic/graphic_surface/utils/hebc_white_list/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/hebc_white_list/BUILD.gn) | 31 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_surface/utils/hebc_white_list:hebc_white_list` | [foundation/graphic/graphic_surface/utils/hebc_white_list/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/hebc_white_list/BUILD.gn) | 38 |
| test | `group` | `//foundation/graphic/graphic_surface/utils/hebc_white_list/test:test` | [foundation/graphic/graphic_surface/utils/hebc_white_list/test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/hebc_white_list/test/BUILD.gn) | 14 |
| test | `group` | `//foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest:unittest` | [foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest:hebc_white_list_test` | [foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest:hebc_white_list_test_config` | [foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest/BUILD.gn) | 34 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest:hebc_white_list_test_common` | [foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/hebc_white_list/test/unittest/BUILD.gn) | 44 |
| build-support | `config` | `//foundation/graphic/graphic_surface/utils/frame_report:frame_report_config` | [foundation/graphic/graphic_surface/utils/frame_report/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/graphic/graphic_surface/utils/frame_report:frame_report_public_config` | [foundation/graphic/graphic_surface/utils/frame_report/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/BUILD.gn) | 28 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_surface/utils/frame_report:frame_report` | [foundation/graphic/graphic_surface/utils/frame_report/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/BUILD.gn) | 35 |
| test | `group` | `//foundation/graphic/graphic_surface/utils/frame_report/test/fuzztest:fuzztest` | [foundation/graphic/graphic_surface/utils/frame_report/test/fuzztest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/test/fuzztest/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphic_surface/utils/frame_report/test/fuzztest/framereport_fuzzer:FrameReportFuzzTest` | [foundation/graphic/graphic_surface/utils/frame_report/test/fuzztest/framereport_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/test/fuzztest/framereport_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphic_surface/utils/frame_report/test/fuzztest/framereport_fuzzer:fuzztest` | [foundation/graphic/graphic_surface/utils/frame_report/test/fuzztest/framereport_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/test/fuzztest/framereport_fuzzer/BUILD.gn) | 48 |
| test | `group` | `//foundation/graphic/graphic_surface/utils/frame_report/test:test` | [foundation/graphic/graphic_surface/utils/frame_report/test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/test/BUILD.gn) | 14 |
| test | `group` | `//foundation/graphic/graphic_surface/utils/frame_report/test/unittest:unittest` | [foundation/graphic/graphic_surface/utils/frame_report/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/test/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/utils/frame_report/test/unittest:frame_report_test` | [foundation/graphic/graphic_surface/utils/frame_report/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/test/unittest/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/graphic/graphic_surface/utils/frame_report/test/unittest:frame_report_test_config` | [foundation/graphic/graphic_surface/utils/frame_report/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/test/unittest/BUILD.gn) | 41 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_surface/utils/frame_report/test/unittest:frame_report_test_common` | [foundation/graphic/graphic_surface/utils/frame_report/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/utils/frame_report/test/unittest/BUILD.gn) | 51 |
| build-support | `config` | `//foundation/graphic/graphic_surface/buffer_handle:buffer_handle_config` | [foundation/graphic/graphic_surface/buffer_handle/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/buffer_handle/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/graphic/graphic_surface/buffer_handle:buffer_handle_public_config` | [foundation/graphic/graphic_surface/buffer_handle/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/buffer_handle/BUILD.gn) | 30 |
| production | `ohos_shared_library` | `//foundation/graphic/graphic_surface/buffer_handle:buffer_handle` | [foundation/graphic/graphic_surface/buffer_handle/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/buffer_handle/BUILD.gn) | 34 |
| production | `ohos_static_library` | `//foundation/graphic/graphic_surface/buffer_handle:buffer_handle_static` | [foundation/graphic/graphic_surface/buffer_handle/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/buffer_handle/BUILD.gn) | 58 |
| test | `group` | `//foundation/graphic/graphic_surface/buffer_handle/test:test` | [foundation/graphic/graphic_surface/buffer_handle/test/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/buffer_handle/test/BUILD.gn) | 14 |
| test | `group` | `//foundation/graphic/graphic_surface/buffer_handle/test/unittest:unittest` | [foundation/graphic/graphic_surface/buffer_handle/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/buffer_handle/test/unittest/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/graphic/graphic_surface/buffer_handle/test/unittest:BufferHandleTest` | [foundation/graphic/graphic_surface/buffer_handle/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/buffer_handle/test/unittest/BUILD.gn) | 25 |
| build-support | `config` | `//foundation/graphic/graphic_surface/buffer_handle/test/unittest:buffer_handle_test_config` | [foundation/graphic/graphic_surface/buffer_handle/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/buffer_handle/test/unittest/BUILD.gn) | 40 |
| test | `ohos_static_library` | `//foundation/graphic/graphic_surface/buffer_handle/test/unittest:buffer_handle_test_common` | [foundation/graphic/graphic_surface/buffer_handle/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphic_surface/buffer_handle/test/unittest/BUILD.gn) | 52 |

## 查询命令

```bash
awk -F '\t' '$1 == "graphic" && $2 == "graphic_surface"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
