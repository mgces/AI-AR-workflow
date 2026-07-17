# communication：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 18 |
| rk3568 选入部件 | 11 |
| GN 目标 | 2736 |
| 生产目标 | 564 |
| 测试目标 | 1810 |
| 构建支持目标 | 235 |
| 聚合/代码生成目标 | 127 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| bluetooth | yes | foundation/communication/bluetooth | 107 | 58 | 9 | [查看](components/bluetooth/foundation-index.md) |
| bluetooth_service | yes | foundation/communication/bluetooth_service | 91 | 15 | 51 | [查看](components/bluetooth_service/foundation-index.md) |
| communication_cangjie_wrapper | no | foundation/communication/communication_cangjie_wrapper | 3 | 2 | 0 | [查看](components/communication_cangjie_wrapper/foundation-index.md) |
| connected_nfc_tag | no | foundation/communication/connected_nfc_tag | 34 | 7 | 23 | [查看](components/connected_nfc_tag/foundation-index.md) |
| connectivity_cangjie_wrapper | no | foundation/communication/connectivity_cangjie_wrapper | 10 | 9 | 0 | [查看](components/connectivity_cangjie_wrapper/foundation-index.md) |
| dhcp | yes | foundation/communication/dhcp | 50 | 15 | 27 | [查看](components/dhcp/foundation-index.md) |
| dsoftbus | yes | foundation/communication/dsoftbus | 977 | 47 | 889 | [查看](components/dsoftbus/foundation-index.md) |
| fusion_connectivity | yes | foundation/communication/fusion_connectivity | 71 | 29 | 19 | [查看](components/fusion_connectivity/foundation-index.md) |
| ipc | yes | foundation/communication/ipc | 424 | 40 | 342 | [查看](components/ipc/foundation-index.md) |
| netmanager_base | yes | foundation/communication/netmanager_base | 220 | 102 | 83 | [查看](components/netmanager_base/foundation-index.md) |
| netmanager_cangjie_wrapper | no | foundation/communication/netmanager_cangjie_wrapper | 5 | 4 | 0 | [查看](components/netmanager_cangjie_wrapper/foundation-index.md) |
| netmanager_ext | yes | foundation/communication/netmanager_ext | 165 | 77 | 48 | [查看](components/netmanager_ext/foundation-index.md) |
| netstack | yes | foundation/communication/netstack | 100 | 41 | 41 | [查看](components/netstack/foundation-index.md) |
| nfc | no | foundation/communication/nfc | 271 | 29 | 215 | [查看](components/nfc/foundation-index.md) |
| t2stack | yes | foundation/communication/t2stack | 27 | 13 | 5 | [查看](components/t2stack/foundation-index.md) |
| wifi | yes | foundation/communication/wifi | 178 | 75 | 58 | [查看](components/wifi/foundation-index.md) |
| wifi_aware | no | foundation/communication/wifi_aware | 1 | 1 | 0 | [查看](components/wifi_aware/foundation-index.md) |
| wifi_lite | no | foundation/communication/wifi_lite | 2 | 0 | 0 | [查看](components/wifi_lite/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "communication"' specs/knowledge-base/generated/foundation/modules.tsv
```
