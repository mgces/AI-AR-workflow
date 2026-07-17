# midi_framework：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `multimedia` |
| component | `midi_framework` |
| Git 子仓 | `foundation/multimedia/midi_framework` |
| bundle | [foundation/multimedia/midi_framework/bundle.json](../../../../../../foundation/multimedia/midi_framework/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard,small,mini |
| component dependencies | 15 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 0 |
| declared test entries | 3 |

## 依赖

组件依赖：`ability_base`, `access_token`, `bluetooth`, `c_utils`, `common_event_service`, `hicollie`, `hitrace`, `hilog`, `init`, `ipc`, `qos_manager`, `safwk`, `samgr`, `usb_manager`, `drivers_interface_midi`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/multimedia/midi_framework/test:midi_unit_test`
- `//foundation/multimedia/midi_framework/test:midi_demo_test`
- `//foundation/multimedia/midi_framework/test:midi_fuzz_test`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 9 |
| test | 20 |
| build-support | 1 |
| aggregate-codegen | 1 |
| total | 31 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_sa_profile` | `//foundation/multimedia/midi_framework/sa_profile:midi_service_sa_profile` | [foundation/multimedia/midi_framework/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/sa_profile/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/multimedia/midi_framework/frameworks/native/midiutils:midiutils` | [foundation/multimedia/midi_framework/frameworks/native/midiutils/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/frameworks/native/midiutils/BUILD.gn) | 18 |
| production | `ohos_shared_library` | `//foundation/multimedia/midi_framework/frameworks/native/ohmidi:ohmidi` | [foundation/multimedia/midi_framework/frameworks/native/ohmidi/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/frameworks/native/ohmidi/BUILD.gn) | 18 |
| production | `ohos_shared_library` | `//foundation/multimedia/midi_framework/frameworks/native/midi:midi_client` | [foundation/multimedia/midi_framework/frameworks/native/midi/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/frameworks/native/midi/BUILD.gn) | 17 |
| production | `idl_gen_interface` | `//foundation/multimedia/midi_framework/services/idl:midi_service_idl_interface` | [foundation/multimedia/midi_framework/services/idl/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/services/idl/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/multimedia/midi_framework/services/idl:midi_service_sa_idl_config` | [foundation/multimedia/midi_framework/services/idl/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/services/idl/BUILD.gn) | 34 |
| production | `ohos_shared_library` | `//foundation/multimedia/midi_framework/services/idl:midi_framework_interface` | [foundation/multimedia/midi_framework/services/idl/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/services/idl/BUILD.gn) | 44 |
| aggregate-codegen | `group` | `//foundation/multimedia/midi_framework/services:midi_service_packages` | [foundation/multimedia/midi_framework/services/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/services/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/multimedia/midi_framework/services:midi_server_init` | [foundation/multimedia/midi_framework/services/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/services/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//foundation/multimedia/midi_framework/services:midi_service` | [foundation/multimedia/midi_framework/services/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/services/BUILD.gn) | 31 |
| production | `ohos_shared_library` | `//foundation/multimedia/midi_framework/services/common:midi_common` | [foundation/multimedia/midi_framework/services/common/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/services/common/BUILD.gn) | 18 |
| test | `ohos_fuzztest` | `//foundation/multimedia/midi_framework/test/fuzztest/midiservicecontroller_fuzzer:MidiServiceControllerFuzzTest` | [foundation/multimedia/midi_framework/test/fuzztest/midiservicecontroller_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/fuzztest/midiservicecontroller_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/multimedia/midi_framework/test/fuzztest/midiservicecontroller_fuzzer:fuzztest` | [foundation/multimedia/midi_framework/test/fuzztest/midiservicecontroller_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/fuzztest/midiservicecontroller_fuzzer/BUILD.gn) | 66 |
| test | `ohos_fuzztest` | `//foundation/multimedia/midi_framework/test/fuzztest/midiipcstub_fuzzer:MidiIpcStubFuzzTest` | [foundation/multimedia/midi_framework/test/fuzztest/midiipcstub_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/fuzztest/midiipcstub_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/multimedia/midi_framework/test/fuzztest/midiipcstub_fuzzer:fuzztest` | [foundation/multimedia/midi_framework/test/fuzztest/midiipcstub_fuzzer/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/fuzztest/midiipcstub_fuzzer/BUILD.gn) | 68 |
| test | `group` | `//foundation/multimedia/midi_framework/test:midi_demo_test` | [foundation/multimedia/midi_framework/test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/BUILD.gn) | 18 |
| test | `group` | `//foundation/multimedia/midi_framework/test:midi_unit_test` | [foundation/multimedia/midi_framework/test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/BUILD.gn) | 23 |
| test | `group` | `//foundation/multimedia/midi_framework/test:midi_fuzz_test` | [foundation/multimedia/midi_framework/test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/BUILD.gn) | 41 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/midi_service_client_unit_test:midi_service_client_unittest` | [foundation/multimedia/midi_framework/test/unittest/midi_service_client_unit_test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/midi_service_client_unit_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/common:midi_common_unittest` | [foundation/multimedia/midi_framework/test/unittest/common/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/common/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/midi_service_controller_unit_test:midi_service_controller_unit_test` | [foundation/multimedia/midi_framework/test/unittest/midi_service_controller_unit_test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/midi_service_controller_unit_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/ump_converter_unit_test:ump_converter_unittest` | [foundation/multimedia/midi_framework/test/unittest/ump_converter_unit_test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/ump_converter_unit_test/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/midi_device_manager_unit_test:midi_device_manager_unit_test` | [foundation/multimedia/midi_framework/test/unittest/midi_device_manager_unit_test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/midi_device_manager_unit_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/midi_client_unit_test:midi_client_unit_test` | [foundation/multimedia/midi_framework/test/unittest/midi_client_unit_test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/midi_client_unit_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/midi_server_unit_test:midi_server_unittest` | [foundation/multimedia/midi_framework/test/unittest/midi_server_unit_test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/midi_server_unit_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/ump_processor_unit_test:ump_processor_unittest` | [foundation/multimedia/midi_framework/test/unittest/ump_processor_unit_test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/ump_processor_unit_test/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/midi_client_connection:midi_client_connection_unittest` | [foundation/multimedia/midi_framework/test/unittest/midi_client_connection/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/midi_client_connection/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/ble_midi_codec_unit_test:ble_midi_codec_unittest` | [foundation/multimedia/midi_framework/test/unittest/ble_midi_codec_unit_test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/ble_midi_codec_unit_test/BUILD.gn) | 20 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/midi_device_usb_unit_test:midi_device_usb_unittest` | [foundation/multimedia/midi_framework/test/unittest/midi_device_usb_unit_test/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/midi_device_usb_unit_test/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/multimedia/midi_framework/test/unittest/midi_device_connection:midi_device_connection_unittest` | [foundation/multimedia/midi_framework/test/unittest/midi_device_connection/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/unittest/midi_device_connection/BUILD.gn) | 20 |
| test | `ohos_executable` | `//foundation/multimedia/midi_framework/test/demo:midi_demo` | [foundation/multimedia/midi_framework/test/demo/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/test/demo/BUILD.gn) | 17 |

## 查询命令

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "midi_framework"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
