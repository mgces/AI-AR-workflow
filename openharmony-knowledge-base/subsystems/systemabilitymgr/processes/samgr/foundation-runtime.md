# samgr：Foundation 运行时说明

> 本文件由 `generate-foundation-process-docs.sh` 生成；运行时事实来自 init 配置、SA profile 和生产可执行目标。

[返回进程节点](README.md) | [返回进程清单](../../foundation-processes.md)

## 运行定位

`samgr` 归入 `systemabilitymgr` 子系统的进程层。当前源码识别到 1 条 init 服务配置、0 个 System Ability 和 1 个参与部件。

## 运行身份与启动

| 服务名 | 可执行路径 | 启动模式 | uid | gid | SELinux | 配置 |
| --- | --- | --- | --- | --- | --- | --- |
| `samgr` | `/system/bin/samgr` | boot | samgr | samgr,system,readproc,data_reserve | u:r:samgr:s0 | [foundation/systemabilitymgr/samgr/etc/samgr_standard.cfg](../../../../../../foundation/systemabilitymgr/samgr/etc/samgr_standard.cfg) |

## 承载的 System Ability

当前没有识别到由该进程承载的 SA profile；它可能是独立 daemon、渲染进程或辅助服务。

## 功能职责

- [systemabilitymgr:samgr](../../../systemabilitymgr/components/samgr/functional-overview.md)：system ability manager（init-owner, executable-owner）。

## 部件与进程关系

| 子系统 | 部件 | 角色 |
| --- | --- | --- |
| `systemabilitymgr` | [samgr](../../../systemabilitymgr/components/samgr/functional-overview.md) | init-owner, executable-owner |

角色含义：`init-owner` 提供启动配置，`executable-owner` 提供可执行目标，`sa-provider` 提供装载到进程中的 SA 实现。

## 可执行构建目标

- `//foundation/systemabilitymgr/samgr/services/samgr/native:samgr`：[foundation/systemabilitymgr/samgr/services/samgr/native/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr/services/samgr/native/BUILD.gn)

## 生命周期判断

- init 配置包含开机启动或非按需启动路径。

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
