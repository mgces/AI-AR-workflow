# ui_service：Foundation 运行时说明

> 本文件由 `generate-foundation-process-docs.sh` 生成；运行时事实来自 init 配置、SA profile 和生产可执行目标。

[返回进程节点](README.md) | [返回进程清单](../../foundation-processes.md)

## 运行定位

`ui_service` 归入 `arkui` 子系统的进程层。当前源码识别到 1 条 init 服务配置、2 个 System Ability 和 3 个参与部件。

## 运行身份与启动

| 服务名 | 可执行路径 | 启动模式 | uid | gid | SELinux | 配置 |
| --- | --- | --- | --- | --- | --- | --- |
| `ui_service` | `/system/bin/sa_main /system/profile/ui_service.json` | - | uiserver | system,shell | u:r:ui_service:s0 | [foundation/arkui/ace_engine/adapter/ohos/services/uiservice/ui_service.cfg](../../../../../../foundation/arkui/ace_engine/adapter/ohos/services/uiservice/ui_service.cfg) |

## 承载的 System Ability

| SA ID | 实现库 | run-on-create | auto-restart | 提供部件 | Profile |
| ---: | --- | --- | --- | --- | --- |
| 7001 | `libuiservice.z.so` | true | - | [arkui:ace_engine](../../../arkui/components/ace_engine/functional-overview.md) | [foundation/arkui/ace_engine/adapter/ohos/sa_profile/7001.json](../../../../../../foundation/arkui/ace_engine/adapter/ohos/sa_profile/7001.json) |
| 7002 | `libui_appearance_service.z.so` | true | - | [arkui:ui_appearance](../../../arkui/components/ui_appearance/functional-overview.md) | [foundation/arkui/ui_appearance/sa_profile/7002.json](../../../../../../foundation/arkui/ui_appearance/sa_profile/7002.json) |

## 功能职责

- 装载 `libuiservice.z.so`，承载 uiservice 相关系统能力。
- 装载 `libui_appearance_service.z.so`，承载 ui appearance service 相关系统能力。
- [arkui:ace_engine](../../../arkui/components/ace_engine/functional-overview.md)：ArkUI Cross-Platform Engine for UI layout measure and paint（sa-provider, init-owner）。
- [systemabilitymgr:safwk](../../../systemabilitymgr/components/safwk/functional-overview.md)：system ability framework（executable-owner）。
- [arkui:ui_appearance](../../../arkui/components/ui_appearance/functional-overview.md)：Provide ui_appearance management.（sa-provider）。

## 部件与进程关系

| 子系统 | 部件 | 角色 |
| --- | --- | --- |
| `arkui` | [ace_engine](../../../arkui/components/ace_engine/functional-overview.md) | sa-provider, init-owner |
| `arkui` | [ui_appearance](../../../arkui/components/ui_appearance/functional-overview.md) | sa-provider |
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
