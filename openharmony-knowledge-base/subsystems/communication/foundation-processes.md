# communication：Foundation 运行进程

> 本页由 `generate-foundation-process-docs.sh` 根据 init 配置和 SA profile 生成。

[返回子系统](README.md) | [功能全景](functional-overview.md)

## 进程清单

| 进程 | init 服务 | SA | 参与部件 | 启动模式 | uid | SELinux | 说明 |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| `bluetooth_service` | 1 | 1 | 2 | - | bluetooth | u:r:bluetooth_service:s0 | [查看](processes/bluetooth_service/foundation-runtime.md) |
| `fusion_ranging` | 1 | 1 | 2 | ondemand | fusion_ranging | u:r:fusion_ranging:s0 | [查看](processes/fusion_ranging/foundation-runtime.md) |
| `mdnsmanager` | 1 | 1 | 2 | ondemand | net_manager | u:r:mdnsmanager:s0 | [查看](processes/mdnsmanager/foundation-runtime.md) |
| `netmanager` | 1 | 10 | 3 | - | net_manager | u:r:netmanager:s0 | [查看](processes/netmanager/foundation-runtime.md) |
| `netsysnative` | 1 | 1 | 2 | - | netsysnative | u:r:netsysnative:s0 | [查看](processes/netsysnative/foundation-runtime.md) |
| `nfc_service` | 1 | 1 | 2 | ondemand | nfc | u:r:nfc_service:s0 | [查看](processes/nfc_service/foundation-runtime.md) |
| `nfc_tag_service` | 1 | 1 | 2 | - | nfc_tag | u:r:nfc_tag_service:s0 | [查看](processes/nfc_tag_service/foundation-runtime.md) |
| `partner_device_agent` | 1 | 1 | 2 | ondemand | partner_device_agent | u:r:partner_device_agent:s0 | [查看](processes/partner_device_agent/foundation-runtime.md) |
| `softbus_server` | 2 | 1 | 2 | - | dsoftbus | u:r:softbus_server:s0 | [查看](processes/softbus_server/foundation-runtime.md) |
| `wifi_hal_service` | 1 | 0 | 1 | condition | wifi | u:r:wifi_hal_service:s0 | [查看](processes/wifi_hal_service/foundation-runtime.md) |
| `wifi_manager_service` | 1 | 6 | 3 | ondemand | wifi | u:r:wifi_manager_service:s0 | [查看](processes/wifi_manager_service/foundation-runtime.md) |

## 说明

- 进程归属优先使用 init 配置所在部件；没有 init 证据时使用可执行目标或 SA provider。
- 一个进程可以承载多个部件甚至多个子系统提供的 SA。
- 测试、示例和 CLI 工具不进入本清单。
