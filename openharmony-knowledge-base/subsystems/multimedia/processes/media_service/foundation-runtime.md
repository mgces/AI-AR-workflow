# media_service：Foundation 运行时说明

> 本文件由 `generate-foundation-process-docs.sh` 生成；运行时事实来自 init 配置、SA profile 和生产可执行目标。

[返回进程节点](README.md) | [返回进程清单](../../foundation-processes.md)

## 运行定位

`media_service` 归入 `multimedia` 子系统的进程层。当前源码识别到 2 条 init 服务配置、2 个 System Ability 和 2 个参与部件。

## 运行身份与启动

| 服务名 | 可执行路径 | 启动模式 | uid | gid | SELinux | 配置 |
| --- | --- | --- | --- | --- | --- | --- |
| `media_service` | `/system/bin/sa_main /system/profile/media_service.json` | ondemand | media | media_rw,system,netsys_socket | u:r:media_service:s0 | [foundation/multimedia/player_framework/services/etc/on_demand/media_service.cfg](../../../../../../foundation/multimedia/player_framework/services/etc/on_demand/media_service.cfg) |
| `media_service` | `/system/bin/sa_main /system/profile/media_service.json` | - | media | media_rw,system,netsys_socket,graphics | u:r:media_service:s0 | [foundation/multimedia/player_framework/services/etc/media_service.cfg](../../../../../../foundation/multimedia/player_framework/services/etc/media_service.cfg) |

## 承载的 System Ability

| SA ID | 实现库 | run-on-create | auto-restart | 提供部件 | Profile |
| ---: | --- | --- | --- | --- | --- |
| 3002 | `libmedia_service.z.so` | false | true | [multimedia:player_framework](../../../multimedia/components/player_framework/functional-overview.md) | [foundation/multimedia/player_framework/services/etc/on_demand/3002.json](../../../../../../foundation/multimedia/player_framework/services/etc/on_demand/3002.json) |
| 3002 | `libmedia_service.z.so` | true | - | [multimedia:player_framework](../../../multimedia/components/player_framework/functional-overview.md) | [foundation/multimedia/player_framework/services/etc/3002.json](../../../../../../foundation/multimedia/player_framework/services/etc/3002.json) |

## 功能职责

- 装载 `libmedia_service.z.so`，承载 media service 相关系统能力。
- [multimedia:player_framework](../../../multimedia/components/player_framework/functional-overview.md)：Media standard provides atomic capabilities（init-owner, sa-provider）。
- [systemabilitymgr:safwk](../../../systemabilitymgr/components/safwk/functional-overview.md)：system ability framework（executable-owner）。

## 部件与进程关系

| 子系统 | 部件 | 角色 |
| --- | --- | --- |
| `multimedia` | [player_framework](../../../multimedia/components/player_framework/functional-overview.md) | init-owner, sa-provider |
| `systemabilitymgr` | [safwk](../../../systemabilitymgr/components/safwk/functional-overview.md) | executable-owner |

角色含义：`init-owner` 提供启动配置，`executable-owner` 提供可执行目标，`sa-provider` 提供装载到进程中的 SA 实现。

## 可执行构建目标

- `//foundation/systemabilitymgr/safwk/services/safwk:sa_main`：[foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn)

## 生命周期判断

- init 配置包含按需启动，首次访问相关能力时可能触发进程创建。
- 部分 SA 设置 `run-on-create=true`，进程建立后会立即创建这些能力。
- 部分 SA 设置 `run-on-create=false`，通常由访问或框架调度触发加载。

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
