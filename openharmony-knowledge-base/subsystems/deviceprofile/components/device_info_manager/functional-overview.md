# device_info_manager 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

DeviceProfile是设备硬件能力和系统软件特征的管理器，典型的Profile有设备类型、设备名称、设备OS类型、OS版本号等。DeviceProfile提供快速访问本地和远端设备Profile的能力，是发起分布式业务的基础。主要功能如下： 本地设备Profile的插入、删除、查询。 远程设备Profile的查询。 订阅远程Profile变化的通知。 跨设备同步Profile。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `deviceprofile` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2048KB / 9000KB |
| 源码仓 | `foundation/deviceprofile/device_info_manager` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `device_info_manager_supported_switch`：device info manager 支持ed switch。
- `device_info_manager_capability`：device info manager capability。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/deviceprofile/device_info_manager/services](../../../../../../foundation/deviceprofile/device_info_manager/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 72 | `core` |
| [foundation/deviceprofile/device_info_manager/common](../../../../../../foundation/deviceprofile/device_info_manager/common) | 组件内部共享的公共定义、工具和基础实现。 | 11 | `include`, `src` |
| [foundation/deviceprofile/device_info_manager/etc](../../../../../../foundation/deviceprofile/device_info_manager/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 3 | `init`, `profile` |
| [foundation/deviceprofile/device_info_manager/interfaces](../../../../../../foundation/deviceprofile/device_info_manager/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 2 | `innerkits` |
| [foundation/deviceprofile/device_info_manager/radar](../../../../../../foundation/deviceprofile/device_info_manager/radar) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | `include`, `src` |
| [foundation/deviceprofile/device_info_manager/permission](../../../../../../foundation/deviceprofile/device_info_manager/permission) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | - |
| [foundation/deviceprofile/device_info_manager/sa_profile](../../../../../../foundation/deviceprofile/device_info_manager/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/deviceprofile/device_info_manager/ai_refactor](../../../../../../foundation/deviceprofile/device_info_manager/ai_refactor) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `services` |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/deviceprofile/device_info_manager/interfaces/innerkits/core:distributed_device_profile_sdk` | `//foundation/deviceprofile/device_info_manager/interfaces/innerkits/core/include/` | `distributed_device_profile_client.h`, `distributed_device_profile_proxy.h` |
| `//foundation/deviceprofile/device_info_manager/common:distributed_device_profile_common` | `//foundation/deviceprofile/device_info_manager/common/include/interfaces` | `access_control_profile.h`, `accessee.h`, `accesser.h`, `characteristic_profile.h`, `device_profile.h`, `dp_subscribe_info.h`, `dp_sync_options.h`, `i_distributed_device_profile.h` 等 18 个 |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `deviceprofile` | [deviceprofile](../../processes/deviceprofile/foundation-runtime.md) | 启动配置, SA 实现 | `6001` | `libdistributed_device_profile_svr.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/deviceprofile/device_info_manager/sa_profile:dps_sa_profile` | [foundation/deviceprofile/device_info_manager/sa_profile/BUILD.gn](../../../../../../foundation/deviceprofile/device_info_manager/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 4 个，`ohos_source_set` 1 个。

## 依赖与协作边界

该部件声明 28 个组件依赖和 0 个三方依赖。

- 系统组件协作：`cJSON`, `c_utils`, `common_event_service`, `config_policy`, `data_share`, `ffrt`, `hicollie`, `hisysevent`, `hilog`, `ipc`, `json`, `syscap_codec`, `access_token`, `device_auth`, `samgr`, `kv_store`, `hitrace`, `eventhandler`, `safwk`, `dsoftbus`, `dmsfwk`, `device_manager`, `init`, `relational_store`, `os_account`, `asset`, `selinux_adapter`, `memmgr`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 76 个测试目标，bundle 声明 4 个测试入口。

主要测试形态：`ohos_unittest` 54 个，`group` 14 个，`ohos_fuzztest` 8 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/deviceprofile/device_info_manager/bundle.json](../../../../../../foundation/deviceprofile/device_info_manager/bundle.json)
- 原始源码 README：[foundation/deviceprofile/device_info_manager/README_zh.md](../../../../../../foundation/deviceprofile/device_info_manager/README_zh.md)、[foundation/deviceprofile/device_info_manager/README.md](../../../../../../foundation/deviceprofile/device_info_manager/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
