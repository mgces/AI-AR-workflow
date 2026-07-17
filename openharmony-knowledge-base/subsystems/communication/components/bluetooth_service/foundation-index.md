# bluetooth_service：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `communication` |
| component | `bluetooth_service` |
| Git 子仓 | `foundation/communication/bluetooth_service` |
| bundle | [foundation/communication/bluetooth_service/bundle.json](../../../../../../foundation/communication/bluetooth_service/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 31 |
| third-party dependencies | 0 |
| declared sub_component | 0 |
| inner kits | 0 |
| declared test entries | 8 |

## 依赖

组件依赖：`ability_base`, `ability_runtime`, `audio_framework`, `av_session`, `hilog`, `hisysevent`, `hitrace`, `ipc`, `samgr`, `access_token`, `bluetooth`, `drivers_interface_bluetooth`, `eventhandler`, `ability_base`, `call_manager`, `core_service`, `hdf_core`, `init`, `input`, `safwk`, `common_event_service`, `state_registry`, `c_utils`, `jsoncpp`, `image_framework`, `googletest`, `libuv`, `libxml2`, `openssl`, `bounds_checking_function`, `bundle_framework`

三方依赖：无声明

## 声明构建入口

- 无

## 声明测试入口

- `//foundation/communication/bluetooth_service/test/unittest/spp:unittest`
- `//foundation/communication/bluetooth_service/test/unittest/host:unittest`
- `//foundation/communication/bluetooth_service/test/unittest/ble:unittest`
- `//foundation/communication/bluetooth_service/test/unittest/hid:unittest`
- `//foundation/communication/bluetooth_service/test/unittest/pan:unittest`
- `//foundation/communication/bluetooth_service/test/unittest/gatt_c:unittest`
- `//foundation/communication/bluetooth_service/test/fuzztest/host:fuzztest`
- `//foundation/communication/bluetooth_service/test/example/bluetoothtest:bluetoothtest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 15 |
| test | 51 |
| build-support | 23 |
| aggregate-codegen | 2 |
| total | 91 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_sa_profile` | `//foundation/communication/bluetooth_service/sa_profile:communication_bluetooth_service_sa_profile` | [foundation/communication/bluetooth_service/sa_profile/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/sa_profile/BUILD.gn) | 16 |
| production | `lite_component` | `//foundation/communication/bluetooth_service/services/bluetooth_lite:bluetooth` | [foundation/communication/bluetooth_service/services/bluetooth_lite/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth_lite/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/communication/bluetooth_service/services/bluetooth/external:btdummy_config` | [foundation/communication/bluetooth_service/services/bluetooth/external/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/external/BUILD.gn) | 19 |
| build-support | `config` | `//foundation/communication/bluetooth_service/services/bluetooth/external:btdummy_public_config` | [foundation/communication/bluetooth_service/services/bluetooth/external/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/external/BUILD.gn) | 30 |
| production | `ohos_shared_library` | `//foundation/communication/bluetooth_service/services/bluetooth/external:btdummy` | [foundation/communication/bluetooth_service/services/bluetooth/external/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/external/BUILD.gn) | 34 |
| build-support | `config` | `//foundation/communication/bluetooth_service/services/bluetooth/stack:btstack_public_config` | [foundation/communication/bluetooth_service/services/bluetooth/stack/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/stack/BUILD.gn) | 186 |
| build-support | `config` | `//foundation/communication/bluetooth_service/services/bluetooth/stack:btstack_config` | [foundation/communication/bluetooth_service/services/bluetooth/stack/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/stack/BUILD.gn) | 190 |
| production | `ohos_shared_library` | `//foundation/communication/bluetooth_service/services/bluetooth/stack:btstack` | [foundation/communication/bluetooth_service/services/bluetooth/stack/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/stack/BUILD.gn) | 212 |
| build-support | `config` | `//foundation/communication/bluetooth_service/services/bluetooth/ipc:btipc_public_config` | [foundation/communication/bluetooth_service/services/bluetooth/ipc/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/ipc/BUILD.gn) | 20 |
| production | `ohos_static_library` | `//foundation/communication/bluetooth_service/services/bluetooth/ipc:btipc_service` | [foundation/communication/bluetooth_service/services/bluetooth/ipc/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/ipc/BUILD.gn) | 24 |
| build-support | `config` | `//foundation/communication/bluetooth_service/services/bluetooth/ipc:btipc_static_public_config` | [foundation/communication/bluetooth_service/services/bluetooth/ipc/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/ipc/BUILD.gn) | 127 |
| production | `ohos_shared_library` | `//foundation/communication/bluetooth_service/services/bluetooth/hardware:bluetooth_hdi_adapter` | [foundation/communication/bluetooth_service/services/bluetooth/hardware/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/hardware/BUILD.gn) | 19 |
| production | `lite_component` | `//foundation/communication/bluetooth_service/services/bluetooth:bluetooth` | [foundation/communication/bluetooth_service/services/bluetooth/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/BUILD.gn) | 16 |
| aggregate-codegen | `group` | `//foundation/communication/bluetooth_service/services/bluetooth/etc/init:etc` | [foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn) | 17 |
| production | `ohos_prebuilt_etc` | `//foundation/communication/bluetooth_service/services/bluetooth/etc/init:bt_config.xml` | [foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn) | 27 |
| production | `ohos_prebuilt_etc` | `//foundation/communication/bluetooth_service/services/bluetooth/etc/init:bt_device_config.xml` | [foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn) | 34 |
| production | `ohos_prebuilt_etc` | `//foundation/communication/bluetooth_service/services/bluetooth/etc/init:bt_device_info.xml` | [foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn) | 41 |
| production | `ohos_prebuilt_etc` | `//foundation/communication/bluetooth_service/services/bluetooth/etc/init:bt_profile_config.xml` | [foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn) | 48 |
| production | `ohos_prebuilt_etc` | `//foundation/communication/bluetooth_service/services/bluetooth/etc/init:bluetooth_service_cfg` | [foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/etc/init/BUILD.gn) | 55 |
| production | `ohos_shared_library` | `//foundation/communication/bluetooth_service/services/bluetooth/server:bluetooth_server` | [foundation/communication/bluetooth_service/services/bluetooth/server/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/server/BUILD.gn) | 21 |
| aggregate-codegen | `group` | `//foundation/communication/bluetooth_service/services/bluetooth/server:bluetooth_codec` | [foundation/communication/bluetooth_service/services/bluetooth/server/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/server/BUILD.gn) | 125 |
| build-support | `config` | `//foundation/communication/bluetooth_service/services/bluetooth/service:btservice_public_config` | [foundation/communication/bluetooth_service/services/bluetooth/service/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/service/BUILD.gn) | 157 |
| build-support | `config` | `//foundation/communication/bluetooth_service/services/bluetooth/service:btservice_config` | [foundation/communication/bluetooth_service/services/bluetooth/service/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/service/BUILD.gn) | 163 |
| production | `ohos_shared_library` | `//foundation/communication/bluetooth_service/services/bluetooth/service:btservice` | [foundation/communication/bluetooth_service/services/bluetooth/service/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/service/BUILD.gn) | 208 |
| production | `ohos_shared_library` | `//foundation/communication/bluetooth_service/services/bluetooth/service:btsbc` | [foundation/communication/bluetooth_service/services/bluetooth/service/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/services/bluetooth/service/BUILD.gn) | 392 |
| test | `action` | `//foundation/communication/bluetooth_service/test/example/bluetoothtest:bluetoothtest` | [foundation/communication/bluetooth_service/test/example/bluetoothtest/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/example/bluetoothtest/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/communication/bluetooth_service/test/fuzztest/host/pairdevice_fuzzer:PairDeviceFuzzTest` | [foundation/communication/bluetooth_service/test/fuzztest/host/pairdevice_fuzzer/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/fuzztest/host/pairdevice_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/communication/bluetooth_service/test/fuzztest/host/pairdevice_fuzzer:fuzztest` | [foundation/communication/bluetooth_service/test/fuzztest/host/pairdevice_fuzzer/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/fuzztest/host/pairdevice_fuzzer/BUILD.gn) | 45 |
| test | `group` | `//foundation/communication/bluetooth_service/test/fuzztest/host:fuzztest` | [foundation/communication/bluetooth_service/test/fuzztest/host/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/fuzztest/host/BUILD.gn) | 14 |
| test | `ohos_fuzztest` | `//foundation/communication/bluetooth_service/test/fuzztest/host/setbluetoothscanmode_fuzzer:SetBluetoothScanModeFuzzTest` | [foundation/communication/bluetooth_service/test/fuzztest/host/setbluetoothscanmode_fuzzer/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/fuzztest/host/setbluetoothscanmode_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/communication/bluetooth_service/test/fuzztest/host/setbluetoothscanmode_fuzzer:fuzztest` | [foundation/communication/bluetooth_service/test/fuzztest/host/setbluetoothscanmode_fuzzer/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/fuzztest/host/setbluetoothscanmode_fuzzer/BUILD.gn) | 44 |
| test | `ohos_fuzztest` | `//foundation/communication/bluetooth_service/test/fuzztest/host/setlocalname_fuzzer:SetLocalNameFuzzTest` | [foundation/communication/bluetooth_service/test/fuzztest/host/setlocalname_fuzzer/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/fuzztest/host/setlocalname_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/communication/bluetooth_service/test/fuzztest/host/setlocalname_fuzzer:fuzztest` | [foundation/communication/bluetooth_service/test/fuzztest/host/setlocalname_fuzzer/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/fuzztest/host/setlocalname_fuzzer/BUILD.gn) | 45 |
| test | `ohos_fuzztest` | `//foundation/communication/bluetooth_service/test/fuzztest/host/cancelpaireddevice_fuzzer:CancelPairedDeviceFuzzTest` | [foundation/communication/bluetooth_service/test/fuzztest/host/cancelpaireddevice_fuzzer/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/fuzztest/host/cancelpaireddevice_fuzzer/BUILD.gn) | 20 |
| test | `group` | `//foundation/communication/bluetooth_service/test/fuzztest/host/cancelpaireddevice_fuzzer:fuzztest` | [foundation/communication/bluetooth_service/test/fuzztest/host/cancelpaireddevice_fuzzer/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/fuzztest/host/cancelpaireddevice_fuzzer/BUILD.gn) | 45 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/hid:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/hid/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/hid/BUILD.gn) | 22 |
| test | `ohos_moduletest` | `//foundation/communication/bluetooth_service/test/unittest/hid:btfw_hid_unit_test` | [foundation/communication/bluetooth_service/test/unittest/hid/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/hid/BUILD.gn) | 37 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/hid:unittest` | [foundation/communication/bluetooth_service/test/unittest/hid/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/hid/BUILD.gn) | 59 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/ble:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/ble/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/ble/BUILD.gn) | 21 |
| test | `ohos_moduletest` | `//foundation/communication/bluetooth_service/test/unittest/ble:btfw_ble_unit_test` | [foundation/communication/bluetooth_service/test/unittest/ble/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/ble/BUILD.gn) | 36 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/ble:unittest` | [foundation/communication/bluetooth_service/test/unittest/ble/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/ble/BUILD.gn) | 58 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/avrcp:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/avrcp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/avrcp/BUILD.gn) | 22 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/avrcp:btfw_avrcp_tg_unit_test` | [foundation/communication/bluetooth_service/test/unittest/avrcp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/avrcp/BUILD.gn) | 37 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/avrcp:btfw_avrcp_ct_unit_test` | [foundation/communication/bluetooth_service/test/unittest/avrcp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/avrcp/BUILD.gn) | 57 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/avrcp:unittest` | [foundation/communication/bluetooth_service/test/unittest/avrcp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/avrcp/BUILD.gn) | 78 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/hfp:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/hfp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/hfp/BUILD.gn) | 23 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/hfp:btfw_hfp_ag_unit_test` | [foundation/communication/bluetooth_service/test/unittest/hfp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/hfp/BUILD.gn) | 38 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/hfp:btfw_hfp_hf_unit_test` | [foundation/communication/bluetooth_service/test/unittest/hfp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/hfp/BUILD.gn) | 58 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/hfp:btfw_hf_call_unit_test` | [foundation/communication/bluetooth_service/test/unittest/hfp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/hfp/BUILD.gn) | 78 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/hfp:unittest` | [foundation/communication/bluetooth_service/test/unittest/hfp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/hfp/BUILD.gn) | 101 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/BUILD.gn) | 21 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest:btfw_gatt_spp_unit_test` | [foundation/communication/bluetooth_service/test/unittest/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/BUILD.gn) | 36 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest:unittest` | [foundation/communication/bluetooth_service/test/unittest/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/BUILD.gn) | 64 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/opp:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/opp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/opp/BUILD.gn) | 22 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/opp:btfw_opp_unit_test` | [foundation/communication/bluetooth_service/test/unittest/opp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/opp/BUILD.gn) | 37 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/opp:unittest` | [foundation/communication/bluetooth_service/test/unittest/opp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/opp/BUILD.gn) | 58 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/gatt_c:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/gatt_c/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt_c/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/gatt_c:btfw_gatt_client_c_unit_test` | [foundation/communication/bluetooth_service/test/unittest/gatt_c/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt_c/BUILD.gn) | 27 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/gatt_c:unittest` | [foundation/communication/bluetooth_service/test/unittest/gatt_c/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt_c/BUILD.gn) | 45 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/pbap:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/pbap/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/pbap/BUILD.gn) | 22 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/pbap:btfw_pbap_client_test` | [foundation/communication/bluetooth_service/test/unittest/pbap/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/pbap/BUILD.gn) | 37 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/pbap:btfw_pbap_server_test` | [foundation/communication/bluetooth_service/test/unittest/pbap/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/pbap/BUILD.gn) | 59 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/pbap:unittest` | [foundation/communication/bluetooth_service/test/unittest/pbap/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/pbap/BUILD.gn) | 82 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/a2dp:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/a2dp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/a2dp/BUILD.gn) | 22 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/a2dp:btfw_a2dp_snk_unit_test` | [foundation/communication/bluetooth_service/test/unittest/a2dp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/a2dp/BUILD.gn) | 37 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/a2dp:btfw_a2dp_src_unit_test` | [foundation/communication/bluetooth_service/test/unittest/a2dp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/a2dp/BUILD.gn) | 57 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/a2dp:unittest` | [foundation/communication/bluetooth_service/test/unittest/a2dp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/a2dp/BUILD.gn) | 78 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/spp:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/spp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/spp/BUILD.gn) | 21 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/spp:btfw_spp_test` | [foundation/communication/bluetooth_service/test/unittest/spp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/spp/BUILD.gn) | 34 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/spp:unittest` | [foundation/communication/bluetooth_service/test/unittest/spp/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/spp/BUILD.gn) | 54 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/gatt:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn) | 22 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/gatt:btfw_gatt_service_unit_test` | [foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn) | 37 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/gatt:btfw_gatt_client_unit_test` | [foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn) | 57 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/gatt:btfw_gatt_server_unit_test` | [foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn) | 77 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/gatt:btfw_gatt_manager_unit_test` | [foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn) | 99 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/gatt:btfw_gatt_descriptor_unit_test` | [foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn) | 119 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/gatt:btfw_gatt_characteristic_unit_test` | [foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn) | 141 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/gatt:unittest` | [foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/gatt/BUILD.gn) | 164 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/map:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/map/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/map/BUILD.gn) | 22 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/map:btfw_map_mce_unit_test` | [foundation/communication/bluetooth_service/test/unittest/map/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/map/BUILD.gn) | 37 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/map:btfw_map_mse_unit_test` | [foundation/communication/bluetooth_service/test/unittest/map/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/map/BUILD.gn) | 59 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/map:unittest` | [foundation/communication/bluetooth_service/test/unittest/map/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/map/BUILD.gn) | 82 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/pan:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/pan/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/pan/BUILD.gn) | 22 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/pan:btfw_pan_unit_test` | [foundation/communication/bluetooth_service/test/unittest/pan/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/pan/BUILD.gn) | 37 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/pan:unittest` | [foundation/communication/bluetooth_service/test/unittest/pan/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/pan/BUILD.gn) | 59 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/unittest/host:module_private_config` | [foundation/communication/bluetooth_service/test/unittest/host/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/host/BUILD.gn) | 21 |
| test | `ohos_unittest` | `//foundation/communication/bluetooth_service/test/unittest/host:btfw_host_unit_test` | [foundation/communication/bluetooth_service/test/unittest/host/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/host/BUILD.gn) | 36 |
| test | `group` | `//foundation/communication/bluetooth_service/test/unittest/host:unittest` | [foundation/communication/bluetooth_service/test/unittest/host/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/unittest/host/BUILD.gn) | 59 |
| build-support | `config` | `//foundation/communication/bluetooth_service/test/moduletest:module_private_config` | [foundation/communication/bluetooth_service/test/moduletest/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/moduletest/BUILD.gn) | 21 |
| test | `ohos_moduletest` | `//foundation/communication/bluetooth_service/test/moduletest:btsvr_module_test` | [foundation/communication/bluetooth_service/test/moduletest/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/moduletest/BUILD.gn) | 42 |
| test | `group` | `//foundation/communication/bluetooth_service/test/moduletest:moduletest` | [foundation/communication/bluetooth_service/test/moduletest/BUILD.gn](../../../../../../foundation/communication/bluetooth_service/test/moduletest/BUILD.gn) | 65 |

## 查询命令

```bash
awk -F '\t' '$1 == "communication" && $2 == "bluetooth_service"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
