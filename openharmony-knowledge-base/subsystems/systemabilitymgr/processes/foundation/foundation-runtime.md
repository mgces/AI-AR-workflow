# foundation：Foundation 运行时说明

> 本文件由 `generate-foundation-process-docs.sh` 生成；运行时事实来自 init 配置、SA profile 和生产可执行目标。

[返回进程节点](README.md) | [返回进程清单](../../foundation-processes.md)

## 运行定位

`foundation` 归入 `systemabilitymgr` 子系统的进程层。当前源码识别到 1 条 init 服务配置、14 个 System Ability 和 9 个参与部件。

## 运行身份与启动

| 服务名 | 可执行路径 | 启动模式 | uid | gid | SELinux | 配置 |
| --- | --- | --- | --- | --- | --- | --- |
| `foundation` | `/system/bin/sa_main /system/profile/foundation.json` | - | foundation | system,appspawn,update,data_reserve,app_install,gameservice_server | u:r:foundation:s0 | [foundation/systemabilitymgr/safwk/etc/profile/foundation.cfg](../../../../../../foundation/systemabilitymgr/safwk/etc/profile/foundation.cfg) |

## 承载的 System Ability

| SA ID | 实现库 | run-on-create | auto-restart | 提供部件 | Profile |
| ---: | --- | --- | --- | --- | --- |
| 1404 | `libdistributed_ability_manager_svr.z.so` | false | - | [ability:dmsfwk](../../../ability/components/dmsfwk/functional-overview.md) | [foundation/ability/dmsfwk/sa_profile/1404.json](../../../../../../foundation/ability/dmsfwk/sa_profile/1404.json) |
| 180 | `libabilityms.z.so` | true | - | [ability:ability_runtime](../../../ability/components/ability_runtime/functional-overview.md) | [foundation/ability/ability_runtime/services/sa_profile/180.json](../../../../../../foundation/ability/ability_runtime/services/sa_profile/180.json) |
| 182 | `libdataobsms.z.so` | true | - | [ability:ability_runtime](../../../ability/components/ability_runtime/functional-overview.md) | [foundation/ability/ability_runtime/services/sa_profile/182.json](../../../../../../foundation/ability/ability_runtime/services/sa_profile/182.json) |
| 183 | `libupms.z.so` | false | - | [ability:ability_runtime](../../../ability/components/ability_runtime/functional-overview.md) | [foundation/ability/ability_runtime/services/sa_profile/183.json](../../../../../../foundation/ability/ability_runtime/services/sa_profile/183.json) |
| 185 | `libagentmgr.z.so` | true | - | [ability:ability_runtime](../../../ability/components/ability_runtime/functional-overview.md) | [foundation/ability/ability_runtime/services/sa_profile/185.json](../../../../../../foundation/ability/ability_runtime/services/sa_profile/185.json) |
| 401 | `libbms.z.so` | true | - | [bundlemanager:bundle_framework](../../../bundlemanager/components/bundle_framework/functional-overview.md) | [foundation/bundlemanager/bundle_framework/sa_profile/401.json](../../../../../../foundation/bundlemanager/bundle_framework/sa_profile/401.json) |
| 403 | `libfms.z.so` | true | - | [ability:form_fwk](../../../ability/components/form_fwk/functional-overview.md) | [foundation/ability/form_fwk/sa_profile/403.json](../../../../../../foundation/ability/form_fwk/sa_profile/403.json) |
| 403 | `libfms.z.so` | false | - | [ability:form_fwk](../../../ability/components/form_fwk/functional-overview.md) | [foundation/ability/form_fwk/sa_profile/403_dynamic.json](../../../../../../foundation/ability/form_fwk/sa_profile/403_dynamic.json) |
| 4606 | `libwms.z.so` | true | - | [window:window_manager](../../../window/components/window_manager/functional-overview.md) | [foundation/window/window_manager/sa_profile/4606.json](../../../../../../foundation/window/window_manager/sa_profile/4606.json) |
| 4607 | `libscreen_session_manager.z.so` | true | - | [window:window_manager](../../../window/components/window_manager/functional-overview.md) | [foundation/window/window_manager/sa_profile/scene_board/4607.json](../../../../../../foundation/window/window_manager/sa_profile/scene_board/4607.json) |
| 4607 | `libwms.z.so` | true | - | [window:window_manager](../../../window/components/window_manager/functional-overview.md) | [foundation/window/window_manager/sa_profile/4607.json](../../../../../../foundation/window/window_manager/sa_profile/4607.json) |
| 501 | `libappms.z.so` | true | - | [ability:ability_runtime](../../../ability/components/ability_runtime/functional-overview.md) | [foundation/ability/ability_runtime/services/sa_profile/501.json](../../../../../../foundation/ability/ability_runtime/services/sa_profile/501.json) |
| 6105 | `libecologicalrulemgr_service.z.so` | true | - | [bundlemanager:ecological_rule_manager](../../../bundlemanager/components/ecological_rule_manager/functional-overview.md) | [foundation/bundlemanager/ecological_rule_manager/profile/6105.json](../../../../../../foundation/bundlemanager/ecological_rule_manager/profile/6105.json) |
| 6200 | `libapp_domain_verify_mgr_service.z.so` | true | - | [bundlemanager:app_domain_verify](../../../bundlemanager/components/app_domain_verify/functional-overview.md) | [foundation/bundlemanager/app_domain_verify/profile/6200.json](../../../../../../foundation/bundlemanager/app_domain_verify/profile/6200.json) |

## 功能职责

- 装载 `libdistributed_ability_manager_svr.z.so`，承载 distributed ability manager svr 相关系统能力。
- 装载 `libabilityms.z.so`，承载 abilityms 相关系统能力。
- 装载 `libdataobsms.z.so`，承载 dataobsms 相关系统能力。
- 装载 `libupms.z.so`，承载 upms 相关系统能力。
- 装载 `libagentmgr.z.so`，承载 agentmgr 相关系统能力。
- 装载 `libbms.z.so`，承载 bms 相关系统能力。
- 装载 `libfms.z.so`，承载 fms 相关系统能力。
- 装载 `libwms.z.so`，承载 wms 相关系统能力。
- 装载 `libscreen_session_manager.z.so`，承载 screen session manager 相关系统能力。
- 装载 `libappms.z.so`，承载 appms 相关系统能力。
- 装载 `libecologicalrulemgr_service.z.so`，承载 ecologicalrulemgr service 相关系统能力。
- 装载 `libapp_domain_verify_mgr_service.z.so`，承载 app domain verify mgr service 相关系统能力。
- [ability:ability_runtime](../../../ability/components/ability_runtime/functional-overview.md)：Ability管理服务统一调度和管理应用中各Ability和应用管理服务, 用于管理应用运行关系、调度应用进程生命周期及状态（sa-provider）。
- [bundlemanager:app_domain_verify](../../../bundlemanager/components/app_domain_verify/functional-overview.md)：app domain verify functions（sa-provider）。
- [bundlemanager:bundle_framework](../../../bundlemanager/components/bundle_framework/functional-overview.md)：提供OpenHarmony应用和服务安装包的安装、更新、卸载以及信息查询等能力，包含包管理接口和包管理服务（sa-provider）。
- [ability:dmsfwk](../../../ability/components/dmsfwk/functional-overview.md)：distributed ability manager service（sa-provider）。
- [bundlemanager:ecological_rule_manager](../../../bundlemanager/components/ecological_rule_manager/functional-overview.md)：Ecological rule manager service（sa-provider）。
- [ability:form_fwk](../../../ability/components/form_fwk/functional-overview.md)：提供卡片创建、卡片删除、卡片释放等能力，包含接口和服务（sa-provider）。
- [systemabilitymgr:safwk](../../../systemabilitymgr/components/safwk/functional-overview.md)：system ability framework（init-owner, executable-owner）。
- [systemabilitymgr:safwk_lite](../../../systemabilitymgr/components/safwk_lite/functional-overview.md)：system ability framework（executable-owner）。
- [window:window_manager](../../../window/components/window_manager/functional-overview.md)：library for window（sa-provider）。

## 部件与进程关系

| 子系统 | 部件 | 角色 |
| --- | --- | --- |
| `ability` | [ability_runtime](../../../ability/components/ability_runtime/functional-overview.md) | sa-provider |
| `ability` | [dmsfwk](../../../ability/components/dmsfwk/functional-overview.md) | sa-provider |
| `ability` | [form_fwk](../../../ability/components/form_fwk/functional-overview.md) | sa-provider |
| `bundlemanager` | [app_domain_verify](../../../bundlemanager/components/app_domain_verify/functional-overview.md) | sa-provider |
| `bundlemanager` | [bundle_framework](../../../bundlemanager/components/bundle_framework/functional-overview.md) | sa-provider |
| `bundlemanager` | [ecological_rule_manager](../../../bundlemanager/components/ecological_rule_manager/functional-overview.md) | sa-provider |
| `systemabilitymgr` | [safwk](../../../systemabilitymgr/components/safwk/functional-overview.md) | init-owner, executable-owner |
| `systemabilitymgr` | [safwk_lite](../../../systemabilitymgr/components/safwk_lite/functional-overview.md) | executable-owner |
| `window` | [window_manager](../../../window/components/window_manager/functional-overview.md) | sa-provider |

角色含义：`init-owner` 提供启动配置，`executable-owner` 提供可执行目标，`sa-provider` 提供装载到进程中的 SA 实现。

## 可执行构建目标

- `//foundation/systemabilitymgr/safwk/services/safwk:sa_main`：[foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk/services/safwk/BUILD.gn)
- `//foundation/systemabilitymgr/safwk_lite:foundation`：[foundation/systemabilitymgr/safwk_lite/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk_lite/BUILD.gn)

## 生命周期判断

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
