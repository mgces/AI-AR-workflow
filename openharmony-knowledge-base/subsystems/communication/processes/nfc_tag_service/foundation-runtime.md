# nfc_tag_service：Foundation 运行时说明

> 本文件由 `generate-foundation-process-docs.sh` 生成；运行时事实来自 init 配置、SA profile 和生产可执行目标。

[返回进程节点](README.md) | [返回进程清单](../../foundation-processes.md)

## 运行定位

`nfc_tag_service` 归入 `communication` 子系统的进程层。当前源码识别到 1 条 init 服务配置、1 个 System Ability 和 2 个参与部件。

## 运行身份与启动

| 服务名 | 可执行路径 | 启动模式 | uid | gid | SELinux | 配置 |
| --- | --- | --- | --- | --- | --- | --- |
| `nfc_tag_service` | `/system/bin/sa_main /system/profile/nfc_tag_service.json` | - | nfc_tag | nfc_tag,shell | u:r:nfc_tag_service:s0 | [foundation/communication/connected_nfc_tag/services/etc/init/nfc_tag_service.cfg](../../../../../../foundation/communication/connected_nfc_tag/services/etc/init/nfc_tag_service.cfg) |

## 承载的 System Ability

| SA ID | 实现库 | run-on-create | auto-restart | 提供部件 | Profile |
| ---: | --- | --- | --- | --- | --- |
| 1148 | `libnfc_tag_service.z.so` | true | - | [communication:connected_nfc_tag](../../../communication/components/connected_nfc_tag/functional-overview.md) | [foundation/communication/connected_nfc_tag/sa_profile/1148.json](../../../../../../foundation/communication/connected_nfc_tag/sa_profile/1148.json) |

## 功能职责

- 装载 `libnfc_tag_service.z.so`，承载 nfc tag service 相关系统能力。
- [communication:connected_nfc_tag](../../../communication/components/connected_nfc_tag/functional-overview.md)：nfc_tag service（sa-provider, init-owner）。
- [systemabilitymgr:safwk](../../../systemabilitymgr/components/safwk/functional-overview.md)：system ability framework（executable-owner）。

## 部件与进程关系

| 子系统 | 部件 | 角色 |
| --- | --- | --- |
| `communication` | [connected_nfc_tag](../../../communication/components/connected_nfc_tag/functional-overview.md) | sa-provider, init-owner |
| `systemabilitymgr` | [safwk](../../../systemabilitymgr/components/safwk/functional-overview.md) | executable-owner |

角色含义：`init-owner` 提供启动配置，`executable-owner` 提供可执行目标，`sa-provider` 提供装载到进程中的 SA 实现。

## 可执行构建目标

- `//foundation/systemabilitymgr/safwk/services/safwk:sa_main`：[foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn)

## 生命周期判断

- 部分 SA 设置 `run-on-create=true`，进程建立后会立即创建这些能力。

## 安全与验证重点

- 核对 init 中的 uid、gid、SELinux domain、permission 与实际访问资源一致。
- 核对 SA ID、实现库和宿主进程配置一致，避免 profile 安装但进程无法装载。
- 对按需启动进程验证首次调用、并发加载、失败回调、死亡重启和资源回收。
- 对跨部件宿主进程评估单个 SA 异常对同进程其他能力的影响。
- 真机验证应结合 `ps`、`hidumper -ls`、SA 查询、hilog 和进程 SELinux 上下文。

## 扫描边界

- 本页只纳入生产路径中的有效 JSON init 配置和 SA profile。
- 测试、示例、benchmark、CLI 工具不会建立生产进程节点。
- 条件编译可能选择不同 init/profile 变体，因此同一进程可能出现多条配置证据。
