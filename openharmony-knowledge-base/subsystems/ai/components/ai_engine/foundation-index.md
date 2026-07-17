# ai_engine：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `ai` |
| component | `ai_engine` |
| Git 子仓 | `foundation/ai/ai_engine` |
| bundle | [foundation/ai/ai_engine/bundle.json](../../../../../../foundation/ai/ai_engine/bundle.json) |
| rk3568 selected | no |
| adapted systems | small |
| component dependencies | 4 |
| third-party dependencies | 1 |
| declared sub_component | 1 |
| inner kits | 0 |
| declared test entries | 1 |

## 依赖

组件依赖：`hilog`, `utils_base`, `ipc`, `samgr_lite`

三方依赖：`bounds_checking_function`

## 声明构建入口

- `//foundation/ai/ai_engine/services:ai`

## 声明测试入口

- `//foundation/ai/ai_engine/test`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 35 |
| test | 15 |
| build-support | 3 |
| aggregate-codegen | 4 |
| total | 57 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `source_set` | `//foundation/ai/ai_engine/services/client/communication_adapter:ai_communication_adapter` | [foundation/ai/ai_engine/services/client/communication_adapter/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/client/communication_adapter/BUILD.gn) | 14 |
| production | `lite_component` | `//foundation/ai/ai_engine/services/client/algorithm_sdk/asr:asr` | [foundation/ai/ai_engine/services/client/algorithm_sdk/asr/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/client/algorithm_sdk/asr/BUILD.gn) | 15 |
| production | `static_library` | `//foundation/ai/ai_engine/services/client/algorithm_sdk/asr/keyword_spotting:keyword_spotting_sdk` | [foundation/ai/ai_engine/services/client/algorithm_sdk/asr/keyword_spotting/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/client/algorithm_sdk/asr/keyword_spotting/BUILD.gn) | 15 |
| production | `lite_component` | `//foundation/ai/ai_engine/services/client/algorithm_sdk/cv:cv` | [foundation/ai/ai_engine/services/client/algorithm_sdk/cv/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/client/algorithm_sdk/cv/BUILD.gn) | 15 |
| production | `static_library` | `//foundation/ai/ai_engine/services/client/algorithm_sdk/cv/image_classification:image_classification_sdk` | [foundation/ai/ai_engine/services/client/algorithm_sdk/cv/image_classification/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/client/algorithm_sdk/cv/image_classification/BUILD.gn) | 15 |
| production | `lite_component` | `//foundation/ai/ai_engine/services/client/algorithm_sdk:algorithm_sdk` | [foundation/ai/ai_engine/services/client/algorithm_sdk/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/client/algorithm_sdk/BUILD.gn) | 15 |
| production | `shared_library` | `//foundation/ai/ai_engine/services/client:ai_client` | [foundation/ai/ai_engine/services/client/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/client/BUILD.gn) | 16 |
| production | `lite_component` | `//foundation/ai/ai_engine/services/client:client` | [foundation/ai/ai_engine/services/client/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/client/BUILD.gn) | 26 |
| production | `source_set` | `//foundation/ai/ai_engine/services/client/client_executor:client_executor` | [foundation/ai/ai_engine/services/client/client_executor/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/client/client_executor/BUILD.gn) | 14 |
| production | `lite_component` | `//foundation/ai/ai_engine/services:ai` | [foundation/ai/ai_engine/services/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/BUILD.gn) | 17 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/utils/encdec:encdec` | [foundation/ai/ai_engine/services/common/utils/encdec/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/utils/encdec/BUILD.gn) | 13 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/utils/file_operation:fileOperation` | [foundation/ai/ai_engine/services/common/utils/file_operation/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/utils/file_operation/BUILD.gn) | 13 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/protocol/data_channel:data_channel` | [foundation/ai/ai_engine/services/common/protocol/data_channel/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/protocol/data_channel/BUILD.gn) | 13 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/time:time` | [foundation/ai/ai_engine/services/common/platform/time/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/time/BUILD.gn) | 13 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/lock:lock` | [foundation/ai/ai_engine/services/common/platform/lock/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/lock/BUILD.gn) | 14 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/threadpool:threadpool` | [foundation/ai/ai_engine/services/common/platform/threadpool/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/threadpool/BUILD.gn) | 13 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/semaphore:semaphore` | [foundation/ai/ai_engine/services/common/platform/semaphore/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/semaphore/BUILD.gn) | 13 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/dl_operation:dlOperation` | [foundation/ai/ai_engine/services/common/platform/dl_operation/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/dl_operation/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/ai/ai_engine/services/common/platform/os_wrapper/feature:feature_config` | [foundation/ai/ai_engine/services/common/platform/os_wrapper/feature/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/os_wrapper/feature/BUILD.gn) | 15 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/os_wrapper/feature:norm_processor_dep` | [foundation/ai/ai_engine/services/common/platform/os_wrapper/feature/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/os_wrapper/feature/BUILD.gn) | 27 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/os_wrapper/feature:type_converter_dep` | [foundation/ai/ai_engine/services/common/platform/os_wrapper/feature/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/os_wrapper/feature/BUILD.gn) | 37 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/os_wrapper/feature:slide_window_processor_dep` | [foundation/ai/ai_engine/services/common/platform/os_wrapper/feature/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/os_wrapper/feature/BUILD.gn) | 44 |
| aggregate-codegen | `group` | `//foundation/ai/ai_engine/services/common/platform/os_wrapper/feature:feature_deps` | [foundation/ai/ai_engine/services/common/platform/os_wrapper/feature/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/os_wrapper/feature/BUILD.gn) | 51 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/os_wrapper/ipc:aie_ipc` | [foundation/ai/ai_engine/services/common/platform/os_wrapper/ipc/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/os_wrapper/ipc/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/ai/ai_engine/services/common/platform/os_wrapper/utils:os_wrapper_utils_config` | [foundation/ai/ai_engine/services/common/platform/os_wrapper/utils/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/os_wrapper/utils/BUILD.gn) | 15 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/os_wrapper/utils:plugin_helper` | [foundation/ai/ai_engine/services/common/platform/os_wrapper/utils/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/os_wrapper/utils/BUILD.gn) | 27 |
| build-support | `config` | `//foundation/ai/ai_engine/services/common/platform/os_wrapper/audio_loader:libaudio_common_config` | [foundation/ai/ai_engine/services/common/platform/os_wrapper/audio_loader/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/os_wrapper/audio_loader/BUILD.gn) | 15 |
| production | `lite_library` | `//foundation/ai/ai_engine/services/common/platform/os_wrapper/audio_loader:audio_loader` | [foundation/ai/ai_engine/services/common/platform/os_wrapper/audio_loader/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/os_wrapper/audio_loader/BUILD.gn) | 42 |
| production | `source_set` | `//foundation/ai/ai_engine/services/common/platform/event:event` | [foundation/ai/ai_engine/services/common/platform/event/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/common/platform/event/BUILD.gn) | 13 |
| production | `static_library` | `//foundation/ai/ai_engine/services/server/communication_adapter:ai_communication_adapter` | [foundation/ai/ai_engine/services/server/communication_adapter/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/communication_adapter/BUILD.gn) | 14 |
| production | `lite_component` | `//foundation/ai/ai_engine/services/server/plugin/asr:asr` | [foundation/ai/ai_engine/services/server/plugin/asr/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/plugin/asr/BUILD.gn) | 15 |
| aggregate-codegen | `copy` | `//foundation/ai/ai_engine/services/server/plugin/asr/keyword_spotting:kws_model` | [foundation/ai/ai_engine/services/server/plugin/asr/keyword_spotting/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/plugin/asr/keyword_spotting/BUILD.gn) | 15 |
| production | `lite_library` | `//foundation/ai/ai_engine/services/server/plugin/asr/keyword_spotting:asr_keyword_spotting` | [foundation/ai/ai_engine/services/server/plugin/asr/keyword_spotting/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/plugin/asr/keyword_spotting/BUILD.gn) | 24 |
| production | `lite_component` | `//foundation/ai/ai_engine/services/server/plugin/cv:cv` | [foundation/ai/ai_engine/services/server/plugin/cv/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/plugin/cv/BUILD.gn) | 15 |
| aggregate-codegen | `copy` | `//foundation/ai/ai_engine/services/server/plugin/cv/image_classification:ic_model` | [foundation/ai/ai_engine/services/server/plugin/cv/image_classification/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/plugin/cv/image_classification/BUILD.gn) | 15 |
| production | `lite_library` | `//foundation/ai/ai_engine/services/server/plugin/cv/image_classification:cv_image_classification` | [foundation/ai/ai_engine/services/server/plugin/cv/image_classification/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/plugin/cv/image_classification/BUILD.gn) | 20 |
| production | `lite_component` | `//foundation/ai/ai_engine/services/server/plugin:plugin` | [foundation/ai/ai_engine/services/server/plugin/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/plugin/BUILD.gn) | 16 |
| aggregate-codegen | `action` | `//foundation/ai/ai_engine/services/server/plugin_manager:gen_etc_ini` | [foundation/ai/ai_engine/services/server/plugin_manager/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/plugin_manager/BUILD.gn) | 15 |
| production | `source_set` | `//foundation/ai/ai_engine/services/server/plugin_manager:plugin_manager` | [foundation/ai/ai_engine/services/server/plugin_manager/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/plugin_manager/BUILD.gn) | 25 |
| production | `source_set` | `//foundation/ai/ai_engine/services/server/server_executor:server_executor` | [foundation/ai/ai_engine/services/server/server_executor/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/server_executor/BUILD.gn) | 14 |
| production | `lite_component` | `//foundation/ai/ai_engine/services/server:ai_server` | [foundation/ai/ai_engine/services/server/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/BUILD.gn) | 15 |
| production | `lite_component` | `//foundation/ai/ai_engine/services/server:server` | [foundation/ai/ai_engine/services/server/BUILD.gn](../../../../../../foundation/ai/ai_engine/services/server/BUILD.gn) | 44 |
| test | `unittest` | `//foundation/ai/ai_engine/test/function:ai_test_function_door` | [foundation/ai/ai_engine/test/function/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/function/BUILD.gn) | 16 |
| test | `group` | `//foundation/ai/ai_engine/test/function:function` | [foundation/ai/ai_engine/test/function/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/function/BUILD.gn) | 64 |
| test | `static_library` | `//foundation/ai/ai_engine/test/function/death_callback:testDeathCallbackLibrary` | [foundation/ai/ai_engine/test/function/death_callback/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/function/death_callback/BUILD.gn) | 15 |
| test | `lite_component` | `//foundation/ai/ai_engine/test/function/death_callback:testDeathCallback` | [foundation/ai/ai_engine/test/function/death_callback/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/function/death_callback/BUILD.gn) | 34 |
| test | `lite_component` | `//foundation/ai/ai_engine/test:test` | [foundation/ai/ai_engine/test/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/BUILD.gn) | 16 |
| test | `unittest` | `//foundation/ai/ai_engine/test/common:ai_test_common_door` | [foundation/ai/ai_engine/test/common/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/common/BUILD.gn) | 16 |
| test | `group` | `//foundation/ai/ai_engine/test/common:common` | [foundation/ai/ai_engine/test/common/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/common/BUILD.gn) | 50 |
| test | `shared_library` | `//foundation/ai/ai_engine/test/common/dl_operation/dl_operation_so:dlOperationSo` | [foundation/ai/ai_engine/test/common/dl_operation/dl_operation_so/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/common/dl_operation/dl_operation_so/BUILD.gn) | 15 |
| test | `lite_component` | `//foundation/ai/ai_engine/test/common/dl_operation:testDlOperationSo` | [foundation/ai/ai_engine/test/common/dl_operation/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/common/dl_operation/BUILD.gn) | 15 |
| test | `unittest` | `//foundation/ai/ai_engine/test/performance:ai_test_performance_unittest` | [foundation/ai/ai_engine/test/performance/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/performance/BUILD.gn) | 16 |
| test | `group` | `//foundation/ai/ai_engine/test/performance:performance` | [foundation/ai/ai_engine/test/performance/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/performance/BUILD.gn) | 51 |
| test | `source_set` | `//foundation/ai/ai_engine/test/sample:syncDemoPluginCode` | [foundation/ai/ai_engine/test/sample/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/sample/BUILD.gn) | 15 |
| test | `lite_component` | `//foundation/ai/ai_engine/test/sample:sample_plugin_1` | [foundation/ai/ai_engine/test/sample/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/sample/BUILD.gn) | 30 |
| test | `source_set` | `//foundation/ai/ai_engine/test/sample:asyncDemoPluginCode` | [foundation/ai/ai_engine/test/sample/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/sample/BUILD.gn) | 38 |
| test | `lite_component` | `//foundation/ai/ai_engine/test/sample:sample_plugin_2` | [foundation/ai/ai_engine/test/sample/BUILD.gn](../../../../../../foundation/ai/ai_engine/test/sample/BUILD.gn) | 53 |

## 查询命令

```bash
awk -F '\t' '$1 == "ai" && $2 == "ai_engine"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
