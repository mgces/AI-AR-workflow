# <Process Name> 进程

> 进程节点描述真实运行时宿主。组件描述源码和产品所有权，两者不是一一对应关系。

## 归属与证据等级

| 属性 | 值 |
| --- | --- |
| host subsystem | `<subsystem>` |
| process name | `<device-visible-process-name>` |
| primary component | `<init/executable owner>` |
| participating components | `<SA/plugin providers>` |
| evidence level | `strong/medium/inferred` |

证据等级：

- `strong`：生产 init 配置、SA profile、应用 manifest、容器/服务管理配置。
- `medium`：生产 executable 目标、入口函数、安装路径和明确源码 README。
- `inferred`：仅根据目录或目标名推断，必须说明不确定性。

进程归属优先使用 init/服务管理配置所在部件。SA profile 可以来自其他部件或其他子系统，不能据此改变宿主进程归属。

## 运行定位

用一到三段说明：

- 该进程解决什么运行时问题。
- 它是独立 daemon、通用 SA 宿主、应用进程、插件宿主还是硬件服务。
- 哪些部件向该进程提供能力。
- 是否存在跨子系统装载。

## 运行身份与启动

| 服务名 | 可执行路径/镜像 | 启动方式 | uid | gid | SELinux/domain | 配置证据 |
| --- | --- | --- | --- | --- | --- | --- |

启动方式至少区分：

- boot/startup
- ondemand
- condition/parameter
- application lifecycle
- parent-spawned
- unknown

存在多套产品或条件编译配置时，应保留所有生产变体并标注选择条件，不直接去重。

## 承载的 System Ability 或服务单元

| SA/服务 ID | 实现库/模块 | run-on-create | auto-restart | 提供部件 | Profile |
| --- | --- | --- | --- | --- | --- |

没有 SA 时说明该进程属于独立 daemon、渲染进程、设备服务、工具宿主或其他运行形态，不生成空表。

## 部件与进程关系

| 子系统 | 部件 | 角色 | 说明 |
| --- | --- | --- | --- |

角色建议使用：

- `init-owner`：提供启动配置和运行身份。
- `executable-owner`：提供生产可执行目标。
- `sa-provider`：提供装载到宿主进程中的 SA 实现库。
- `plugin-provider`：提供运行时插件。
- `client-framework`：提供调用该进程的 Proxy/SDK/Kit。
- `app-owner`：提供应用包和应用生命周期入口。

同一进程可以承载多个部件甚至多个子系统；同一部件也可以向多个进程提供能力。

## 功能职责

| 能力 | 提供部件 | 实现库/模块 | 主要源码区域 | 说明 |
| --- | --- | --- | --- | --- |

功能说明必须基于实际接口、SA、插件、服务实现或源码 README，不能只把动态库名改成自然语言。

## 接口与通信边界

| 接口 | 调用者 | 协议/机制 | 权限 | 服务端入口 |
| --- | --- | --- | --- | --- |

检查：

- SA ID 与 IPC Stub/Proxy。
- sockets、binder、DBinder、HDI、NAPI/ANI、FFI。
- 文件、数据库、设备节点、共享内存和参数。
- 回调、死亡通知和跨设备通道。

## 启动与生命周期

说明：

- 谁创建进程，什么时候启动。
- SA 是进程创建时加载还是首次访问时加载。
- 并发加载和重复启动如何处理。
- 异常退出、死亡通知、自动重启和状态恢复。
- 停止条件和资源释放。

无法从静态配置确认时，明确列出需要真机验证的时序。

## 配置、权限与资源

| 类型 | 内容 | 证据 |
| --- | --- | --- |
| uid/gid | | |
| SELinux domain | | |
| permissions | | |
| capabilities | | |
| cgroup/memcg | | |
| files/devices | | |
| parameters | | |
| databases | | |

## 构建与交付

| 类型 | GN/构建目标 | 产物 | 安装位置 | 代码入口 |
| --- | --- | --- | --- | --- |

区分：

- 进程可执行程序。
- 通用宿主程序，例如 `sa_main`。
- SA 动态库。
- init/profile/config。
- 插件和资源。

## 关键调用链

```text
caller
  -> public/inner API
    -> proxy/client framework
      -> process IPC/service entry
        -> SA/plugin/engine
          -> downstream service/HDI/storage
```

必须替换为实际类、接口、SA ID、动态库或配置。

## 能力域

稳定能力继续放入：

```text
capabilities/<domain>/README.md
capabilities/<domain>/features/<feature>/README.md
```

常见能力域：

- lifecycle
- scheduling
- ipc
- storage
- rendering
- media-processing
- distributed-communication
- security
- reliability
- performance

## 测试与验证

| 验证类型 | 检查内容 | 命令/入口 | 通过条件 |
| --- | --- | --- | --- |

至少覆盖：

- 目标编译和产物安装。
- 进程存在、uid/gid 和 SELinux 上下文。
- SA 注册、查询和首次调用。
- boot/ondemand/condition 启动路径。
- 多 SA 共进程时的故障隔离。
- 进程死亡、重启和状态恢复。
- 非法 IPC、权限拒绝和资源访问。
- 内存、句柄、线程和长期稳定性。

## 风险

- 跨部件共进程导致故障域扩大。
- SA profile 与宿主进程/profile 安装不一致。
- uid/gid、权限或 SELinux 配置过宽或缺失。
- 按需加载竞态、重复创建和回调丢失。
- 插件或动态库版本不兼容。
- 进程退出时资源、回调和代理未正确清理。

## 扫描边界

- 是否排除了测试、示例、benchmark 和 CLI 工具。
- 是否存在动态生成的 profile 或产品覆盖配置。
- 是否只有可执行目标但没有运行配置。
- 是否需要真机确认实际进程名、启动时机和装载库。

## 继续深入

- 组件功能说明。
- 运行证据 TSV。
- init/profile 原文件。
- capability/feature 专题。
- 真机和 CI 证据。
