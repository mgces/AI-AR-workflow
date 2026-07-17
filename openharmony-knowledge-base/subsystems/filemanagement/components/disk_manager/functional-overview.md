# disk_manager 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Disk manager system ability: volume and disk management, callbacks from storage_daemon, and related inner APIs.

源码 README 补充说明：

> 磁盘管理是OpenHarmony文件管理子系统中的磁盘管理部件。本部件基于OpenHarmony已集成的开源三方磁盘工具（例如gptfdisk、f2fs-tools等），负责磁盘与卷的识别、挂载与卸载、分区、检查、修复、格式化及相关事件处理。 **应用层** - **文件管理**：面向文件与卷场景发起卷管理请求 - **系统设置**：面向设备维护场景发起磁盘与分区管理请求 **框架层** - **Core File Kit**：对上提供统一接口，并将请求转发至系统服务 **系统服务层** - **磁盘管理服务**：核心编排模块，负责状态管理、策略控制及对外能力呈现 - **磁盘查询**：聚合磁盘与分区信息及状态 - **磁盘分区**：执行分区创建、调整与删除 - **磁盘检查**：执行文件系统检查 - **挂载卸载**：执行卷挂载、卸载及状态切换 - **格式化**：执行文件系统格式化 - **检查修复**：执行文件系统修复 - **存储管理服务**：承接高权限操作，与底层能力交互并回传结果 **内核层** - **磁盘操作工具**：提供分区、格式化、检查、修复等底层执行能力 - **内核文件系统**：提供磁盘信息查询及状态变化上报

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `filemanagement` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 512KB / 2048KB |
| 源码仓 | `foundation/filemanagement/disk_manager` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/filemanagement/disk_manager/interfaces](../../../../../../foundation/filemanagement/disk_manager/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 13 | `innerkits`, `kits` |
| [foundation/filemanagement/disk_manager/sa_profile](../../../../../../foundation/filemanagement/disk_manager/sa_profile) | System Ability 注册信息及进程装载配置。 | 2 | - |
| [foundation/filemanagement/disk_manager/services](../../../../../../foundation/filemanagement/disk_manager/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 2 | `disk_manager` |
| [foundation/filemanagement/disk_manager/common](../../../../../../foundation/filemanagement/disk_manager/common) | 组件内部共享的公共定义、工具和基础实现。 | 1 | `include`, `src` |
| [foundation/filemanagement/disk_manager/etc](../../../../../../foundation/filemanagement/disk_manager/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 1 | - |
| [foundation/filemanagement/disk_manager/utils](../../../../../../foundation/filemanagement/disk_manager/utils) | 跨模块复用的基础工具和通用数据结构。 | 1 | `include`, `src` |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/filemanagement/disk_manager/interfaces/innerkits:disk_manager_innerkits` | `//foundation/filemanagement/disk_manager/interfaces/innerkits/include` | `disk.h`, `disk_manager_client.h`, `volume_core.h`, `volume_external.h`, `partition_types.h`, `block_info.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `filemanagement` | [disk_manager](../../processes/disk_manager/foundation-runtime.md) | 启动配置, SA 实现 | `8640` | `libdisk_manager_server.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/filemanagement/disk_manager/sa_profile:disk_manager_sa_profile` | [foundation/filemanagement/disk_manager/sa_profile/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/filemanagement/disk_manager/services/disk_manager:disk_manager_server` | [foundation/filemanagement/disk_manager/services/disk_manager/BUILD.gn](../../../../../../foundation/filemanagement/disk_manager/services/disk_manager/BUILD.gn) |

生产库形态：`ohos_shared_library` 3 个，`ohos_source_set` 2 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 22 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `bounds_checking_function`, `common_event_service`, `c_utils`, `dfs_service`, `file_api`, `hilog`, `hisysevent`, `hitrace`, `init`, `ipc`, `json`, `libuv`, `napi`, `node`, `runtime_core`, `safwk`, `samgr`, `security_guard`, `taihe_ffi_gen`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 27 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_unittest` 17 个，`group` 9 个，`ohos_fuzztest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/filemanagement/disk_manager/bundle.json](../../../../../../foundation/filemanagement/disk_manager/bundle.json)
- 原始源码 README：[foundation/filemanagement/disk_manager/README_zh.md](../../../../../../foundation/filemanagement/disk_manager/README_zh.md)、[foundation/filemanagement/disk_manager/README.md](../../../../../../foundation/filemanagement/disk_manager/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
