# HiProfiler 采集与插件流水线

## 边界

该能力组织设备侧性能采集会话，把内存、trace、网络、FFRT、eBPF 等插件数据输送给命令行或 IDE。`hiprofilerd` 控制会话，`hiprofiler_plugins` 承载常规插件，`hiprofiler_daemon` 和 `memory_collector` 隔离需要独立权限或故障域的采集。

## 共享机制

- `hiprofilerd` 在开发者模式下创建本地 gRPC `ProfilerService`，通过 `PluginService` 管理插件生命周期。
- 插件实现 `PluginModuleCallbacks`；数据由框架轮询，或通过 `WriterStruct::write/flush` 主动写入。
- native daemon 通过 Unix socket 服务 hook 客户端，以 `SO_PEERCRED` 获取对端身份并按 PID 管理控制连接。
- SA 1205 由 `libmemory_profiler.z.so` 提供；其实际宿主仍需设备运行时确认。

## 功能与调用链

| 功能 | 入口 | 宿主 | 状态 |
| --- | --- | --- | --- |
| 会话控制 | `hiprofiler_cmd` / gRPC | `hiprofilerd` | 生产 |
| 插件生命周期 | `PluginModuleCallbacks` | `hiprofiler_plugins` | 生产 |
| native hook/内存采集 | Unix socket | `hiprofiler_daemon` | 生产 |
| Memory Collector SA | SA 1205 | `memory_collector` | 需运行时确认 |

```text
IDE/hiprofiler_cmd -> hiprofilerd ProfilerService -> PluginService
  -> 插件 start -> report 或 writer/flush -> 数据通道/文件 -> 主机分析

hook client -> native daemon Unix socket -> peer credential/PID
  -> 配置与启停命令 -> 原生采样数据回传
```

`hiprofilerd` 拒绝非开发者模式和重复实例，默认监听 `127.0.0.1:<service-port>`。gRPC 使用 insecure credentials，因此回环监听、开发者模式和系统进程隔离是关键访问边界。

## 接口、测试与风险

- 接口位于 `device/plugins/api`、`hidebug/interfaces`、`interfaces/kits` 和 protobuf service 定义。
- 单元测试覆盖 ProfilerService、插件、native daemon、Hidebug 和编码器；设备验证需核对服务、端口、插件枚举、会话输出和 SA 1205 宿主。
- 重点风险：采集权限、PID 身份、hook 注入、缓冲区边界、插件故障传播、敏感数据落盘和监听范围。

## 证据

- `developtools/profiler/README_zh.md`
- `developtools/profiler/device/services/profiler_service/src/main.cpp`
- `developtools/profiler/device/services/profiler_service/src/profiler_service.cpp`
- `developtools/profiler/device/plugins/native_daemon/src/hook_service.cpp`
- `developtools/profiler/device/etc/*.cfg`
- `developtools/profiler/device/sa_profile/1205.json`

