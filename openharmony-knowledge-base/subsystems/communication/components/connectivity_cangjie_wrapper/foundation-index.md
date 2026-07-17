# connectivity_cangjie_wrapper：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `communication` |
| component | `connectivity_cangjie_wrapper` |
| Git 子仓 | `foundation/communication/connectivity_cangjie_wrapper` |
| bundle | [foundation/communication/connectivity_cangjie_wrapper/bundle.json](../../../../../../foundation/communication/connectivity_cangjie_wrapper/bundle.json) |
| rk3568 selected | no |
| adapted systems | standard |
| component dependencies | 4 |
| third-party dependencies | 0 |
| declared sub_component | 9 |
| inner kits | 2 |
| declared test entries | 0 |

## 依赖

组件依赖：`cangjie_ark_interop`, `hiviewdfx_cangjie_wrapper`, `bluetooth`, `wifi`

三方依赖：无声明

## 声明构建入口

- `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth:ohos.bluetooth`
- `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/a2dp:ohos.bluetooth.a2dp`
- `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/base_profile:ohos.bluetooth.base_profile`
- `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/ble:ohos.bluetooth.ble`
- `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/connection:ohos.bluetooth.connection`
- `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/constant:ohos.bluetooth.constant`
- `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/hfp:ohos.bluetooth.hfp`
- `//foundation/communication/connectivity_cangjie_wrapper/ohos/wifi_manager:ohos.wifi_manager`
- `//foundation/communication/connectivity_cangjie_wrapper/kit/ConnectivityKit:kit.ConnectivityKit`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 9 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 1 |
| total | 10 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_cangjie_shared_library` | `//foundation/communication/connectivity_cangjie_wrapper/ohos/wifi_manager:ohos.wifi_manager` | [foundation/communication/connectivity_cangjie_wrapper/ohos/wifi_manager/BUILD.gn](../../../../../../foundation/communication/connectivity_cangjie_wrapper/ohos/wifi_manager/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/ble:ohos.bluetooth.ble` | [foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/ble/BUILD.gn](../../../../../../foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/ble/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/connection:ohos.bluetooth.connection` | [foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/connection/BUILD.gn](../../../../../../foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/connection/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/hfp:ohos.bluetooth.hfp` | [foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/hfp/BUILD.gn](../../../../../../foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/hfp/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth:ohos.bluetooth` | [foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/BUILD.gn](../../../../../../foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/base_profile:ohos.bluetooth.base_profile` | [foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/base_profile/BUILD.gn](../../../../../../foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/base_profile/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/a2dp:ohos.bluetooth.a2dp` | [foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/a2dp/BUILD.gn](../../../../../../foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/a2dp/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/constant:ohos.bluetooth.constant` | [foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/constant/BUILD.gn](../../../../../../foundation/communication/connectivity_cangjie_wrapper/ohos/bluetooth/constant/BUILD.gn) | 19 |
| aggregate-codegen | `copy_ohos_cangjie_sdk_api_lib` | `//foundation/communication/connectivity_cangjie_wrapper:copy_sdk_connectivity_cangjie_libs` | [foundation/communication/connectivity_cangjie_wrapper/BUILD.gn](../../../../../../foundation/communication/connectivity_cangjie_wrapper/BUILD.gn) | 30 |
| production | `ohos_cangjie_shared_library` | `//foundation/communication/connectivity_cangjie_wrapper/kit/ConnectivityKit:kit.ConnectivityKit` | [foundation/communication/connectivity_cangjie_wrapper/kit/ConnectivityKit/BUILD.gn](../../../../../../foundation/communication/connectivity_cangjie_wrapper/kit/ConnectivityKit/BUILD.gn) | 19 |

## 查询命令

```bash
awk -F '\t' '$1 == "communication" && $2 == "connectivity_cangjie_wrapper"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
