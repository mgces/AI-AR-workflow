# distributed_hardware_fwk 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

分布式硬件管理框架是为分布式硬件子系统提供信息管理能力的部件。分布式硬件管理框架为分布式硬件子系统提供统一的硬件接入、查询和使能等能力。 **硬件接入管理(AccessManager)**：硬件接入管理模块对接设备管理（DeviceManger）子系统，用于处理设备的上下线事件响应。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributedhardware` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 128KB / 6144KB |
| 源码仓 | `foundation/distributedhardware/distributed_hardware_fwk` |

## 核心能力

- **Distributed Hardware Distributed Hardware FWK**：提供“distributed hardware distributed hardware fwk”能力，系统能力标识为 `SystemCapability.DistributedHardware.DistributedHardwareFWK`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `distributed_hardware_fwk_low_latency`：distributed hardware fwk low latency。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributedhardware/distributed_hardware_fwk/services](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 160 | `distributedhardwarefwkservice` |
| [foundation/distributedhardware/distributed_hardware_fwk/av_transport](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/av_transport) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 109 | `av_trans_control_center`, `av_trans_engine`, `av_trans_handler`, `common`, `framework`, `interface` |
| [foundation/distributedhardware/distributed_hardware_fwk/interfaces](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 46 | `inner_kits`, `kits` |
| [foundation/distributedhardware/distributed_hardware_fwk/utils](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/utils) | 跨模块复用的基础工具和通用数据结构。 | 9 | `include`, `src` |
| [foundation/distributedhardware/distributed_hardware_fwk/taihe](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/taihe) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 6 | `idl`, `src` |
| [foundation/distributedhardware/distributed_hardware_fwk/application](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/application) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `AppScope`, `entry`, `hvigor`, `signature` |
| [foundation/distributedhardware/distributed_hardware_fwk/sa_profile](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/sa_profile) | System Ability 注册信息及进程装载配置。 | 2 | `close_source` |
| [foundation/distributedhardware/distributed_hardware_fwk/common](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/common) | 组件内部共享的公共定义、工具和基础实现。 | 0 | `log`, `utils` |

## 对外与内部接口

该部件声明 6 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributedhardware/distributed_hardware_fwk/interfaces/inner_kits:libdhfwk_sdk` | `//foundation/distributedhardware/distributed_hardware_fwk/interfaces/inner_kits/include` | `distributed_hardware_fwk_kit.h`, `distributed_hardware_fwk_kit_paras.h` |
| `//foundation/distributedhardware/distributed_hardware_fwk/av_transport/av_trans_engine/av_sender:distributed_av_sender` | `//foundation/distributedhardware/distributed_hardware_fwk/av_transport` | - |
| `//foundation/distributedhardware/distributed_hardware_fwk/av_transport/av_trans_engine/av_receiver:distributed_av_receiver` | `//foundation/distributedhardware/distributed_hardware_fwk/av_transport` | `common/include/av_sync_utils.h` |
| `//foundation/distributedhardware/distributed_hardware_fwk/utils:distributedhardwareutils` | `//foundation/distributedhardware/distributed_hardware_fwk/utils/include` | `anonymous_string.h`, `dh_utils_hisysevent.h`, `dh_utils_hitrace.h`, `dh_utils_tool.h`, `histreamer_ability_parser.h`, `histreamer_query_tool.h` |
| `//foundation/distributedhardware/distributed_hardware_fwk/utils:distributedhardwareutils` | `//foundation/distributedhardware/distributed_hardware_fwk/common/log/include` | `distributed_hardware_log.h` |
| `//foundation/distributedhardware/distributed_hardware_fwk/utils:distributedhardwareutils` | `//foundation/distributedhardware/distributed_hardware_fwk/common/utils/include` | `constants.h`, `device_type.h`, `dhardware_descriptor.h`, `dhardware_ipc_interface_code.h`, `distributed_hardware_errno.h`, `idistributed_hardware_manager.h`, `idistributed_hardware_sink.h`, `idistributed_hardware_source.h` 等 13 个 |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `distributedhardware` | [dhardware](../../processes/dhardware/foundation-runtime.md) | 启动配置, SA 实现 | `4801` | `libdistributedhardwarefwksvr.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_app` | `//foundation/distributedhardware/distributed_hardware_fwk/application:DHardware_UI` | [foundation/distributedhardware/distributed_hardware_fwk/application/BUILD.gn](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/application/BUILD.gn) |
| `ohos_app_scope` | `//foundation/distributedhardware/distributed_hardware_fwk/application:DHardware_UI_app_profile` | [foundation/distributedhardware/distributed_hardware_fwk/application/BUILD.gn](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/application/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/distributedhardware/distributed_hardware_fwk/sa_profile:dhfwk_sa_profile` | [foundation/distributedhardware/distributed_hardware_fwk/sa_profile/BUILD.gn](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/sa_profile/BUILD.gn) |

生产库形态：`ohos_source_set` 12 个，`ohos_shared_library` 8 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 34 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `av_codec`, `bundle_framework`, `napi`, `dsoftbus`, `eventhandler`, `hitrace`, `c_utils`, `hilog`, `cJSON`, `samgr`, `ipc`, `safwk`, `hisysevent`, `device_manager`, `config_policy`, `init`, `kv_store`, `resource_schedule_service`, `media_foundation`, `bounds_checking_function`, `openssl`, `ffmpeg`, `runtime_core`, `zlib`, `ffrt`, `libevdev`, `selinux_adapter`, `os_account`, `memmgr`, `graphic_surface`, `node`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 245 个测试目标，bundle 声明 16 个测试入口。

主要测试形态：`group` 115 个，`ohos_unittest` 90 个，`ohos_fuzztest` 39 个，`ohos_executable` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributedhardware/distributed_hardware_fwk/bundle.json](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/bundle.json)
- 原始源码 README：[foundation/distributedhardware/distributed_hardware_fwk/README_zh.md](../../../../../../foundation/distributedhardware/distributed_hardware_fwk/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
