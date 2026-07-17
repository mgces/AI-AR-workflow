# memory_collector：developtools 运行时说明

> 由知识库 Skill 根据 `developtools` 源码中的生产 init 配置、SA profile 和可执行目标生成。

## 运行定位

`memory_collector` 的宿主子系统为 `developtools`，识别到 1 条 init 配置、1 个 SA 和 1 个参与部件。

## 运行身份与启动

| 可执行路径 | 启动模式 | uid | gid | SELinux | 证据 |
| --- | --- | --- | --- | --- | --- |
| `/system/bin/sa_main,/system/profile/memory_collector.json` | condition | hiprofiler | shell,readproc,system | u:r:native_daemon:s0 | [developtools/profiler/device/etc/hiprofiler_daemon.cfg](../../../../../../developtools/profiler/device/etc/hiprofiler_daemon.cfg) |

## 承载的 System Ability

| SA ID | 实现库 | run-on-create | 提供部件 | Profile |
| ---: | --- | --- | --- | --- |
| 1205 | `libmemory_profiler.z.so` | false | [developtools:hiprofiler](../../components/hiprofiler/developtools-functional-overview.md) | [developtools/profiler/device/sa_profile/1205.json](../../../../../../developtools/profiler/device/sa_profile/1205.json) |

## 部件与进程关系

| 子系统 | 部件 | 角色 |
| --- | --- | --- |
| `developtools` | `hiprofiler` | init-owner, sa-provider |

## 生命周期与验证

- 根据 boot、ondemand、condition 或应用生命周期确认实际启动时机。
- 校验 uid/gid、SELinux、权限、SA ID、实现库和宿主 profile 一致。
- 验证首次调用、并发加载、死亡重启、资源释放和多能力共进程故障隔离。
- 使用进程列表、SA 查询、hilog、hidumper 和 SELinux 上下文进行真机确认。

## 扫描边界

- 测试、示例、benchmark 和 CLI 不作为生产进程。
- 条件编译可能产生多个配置变体，当前页面保留全部静态证据。
