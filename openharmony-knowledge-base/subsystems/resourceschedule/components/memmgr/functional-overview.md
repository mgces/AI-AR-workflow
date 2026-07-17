# memmgr 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

内存管理部件 - 简介 - 目录 - 框架 - 进程回收优先级列表 - 补充 - 回收策略/查杀策略 - 使用说明 - 参数配置说明 - availbufferSize - ZswapdParam - killConfig - nandlife - 相关仓 内存管理部件位于全局资源调度管控子系统中，基于应用的生命周期状态，更新进程回收优先级列表，通过内存回收、查杀等手段管理系统内存，保障内存供给。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `resourceschedule` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 1000KB / 4316KB |
| 源码仓 | `foundation/resourceschedule/memmgr` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `memmgr_purgeable_memory`：memmgr purgeable memory。
- `memmgr_hyperhold_memory`：memmgr hyperhold memory。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/resourceschedule/memmgr/profile](../../../../../../foundation/resourceschedule/memmgr/profile) | 组件注册、系统能力或产品装配配置。 | 3 | - |
| [foundation/resourceschedule/memmgr/services](../../../../../../foundation/resourceschedule/memmgr/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 3 | `memmgrservice` |
| [foundation/resourceschedule/memmgr/interface](../../../../../../foundation/resourceschedule/memmgr/interface) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 2 | `innerkits` |
| [foundation/resourceschedule/memmgr/sa_profile](../../../../../../foundation/resourceschedule/memmgr/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/resourceschedule/memmgr/common](../../../../../../foundation/resourceschedule/memmgr/common) | 组件内部共享的公共定义、工具和基础实现。 | 0 | `include`, `src` |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/resourceschedule/memmgr/interface/innerkits:memmgrclient` | `//foundation/resourceschedule/memmgr/interface/innerkits/include/` | `mem_mgr_client.h`, `i_mem_mgr.h`, `mem_mgr_proxy.h`, `mem_mgr_constant.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `resourceschedule` | [memmgrservice](../../processes/memmgrservice/foundation-runtime.md) | 启动配置, SA 实现 | `1909` | `libmemmgrservice.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/resourceschedule/memmgr/sa_profile:memmgr_sa_profile` | [foundation/resourceschedule/memmgr/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/memmgr/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 2 个。

## 依赖与协作边界

该部件声明 17 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ipc`, `ability_base`, `bundle_framework`, `safwk`, `background_task_mgr`, `ability_runtime`, `os_account`, `common_event_service`, `eventhandler`, `hilog`, `c_utils`, `samgr`, `resource_management`, `access_token`, `init`, `libxml2`, `json`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 23 个测试目标，bundle 声明 3 个测试入口。

主要测试形态：`ohos_unittest` 18 个，`group` 3 个，`ohos_fuzztest` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/resourceschedule/memmgr/bundle.json](../../../../../../foundation/resourceschedule/memmgr/bundle.json)
- 原始源码 README：[foundation/resourceschedule/memmgr/README_zh.md](../../../../../../foundation/resourceschedule/memmgr/README_zh.md)、[foundation/resourceschedule/memmgr/README.md](../../../../../../foundation/resourceschedule/memmgr/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
