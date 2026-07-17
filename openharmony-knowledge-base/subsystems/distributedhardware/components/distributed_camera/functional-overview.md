# distributed_camera 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

分布式相机是多个设备的相机同时协同使用的能力。分布式相机部件是为分布式硬件子系统提供这一能力的部件。本部件不直接对接应用，只向分布式硬件框架子系统提供C++接口。应用可以通过相机框架的接口使用分布式相机部件操作其他设备的Camera，使用方式与本地相机一致。 **分布式相机接口(DistributedCameraSDK)**：为分布式硬件管理框架提供超级终端虚拟Camera使能/去使能能力，以及相机状态。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributedhardware` |
| 实现形态 | 服务/运行实体 + 框架或基础库 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 5120KB / 66560KB |
| 源码仓 | `foundation/distributedhardware/distributed_camera` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `distributed_camera_common`：distributed camera common。
- `distributed_camera_filter_front`：distributed camera filter front。
- `distributed_camera_wakeup_enabled`：distributed camera wakeup 启用。
- `distributed_camera_open_stabile`：distributed camera open stabile。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributedhardware/distributed_camera/interfaces](../../../../../../foundation/distributedhardware/distributed_camera/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 180 | `inner_kits` |
| [foundation/distributedhardware/distributed_camera/services](../../../../../../foundation/distributedhardware/distributed_camera/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 48 | `cameraservice`, `channel`, `data_process` |
| [foundation/distributedhardware/distributed_camera/common](../../../../../../foundation/distributedhardware/distributed_camera/common) | 组件内部共享的公共定义、工具和基础实现。 | 5 | `distributed_camera_hap`, `include`, `src` |
| [foundation/distributedhardware/distributed_camera/sa_profile](../../../../../../foundation/distributedhardware/distributed_camera/sa_profile) | System Ability 注册信息及进程装载配置。 | 2 | `common` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `distributedhardware` | [dcamera](../../processes/dcamera/foundation-runtime.md) | 启动配置, SA 实现 | `4803`, `4804` | `libdistributed_camera_source.z.so`, `libdistributed_camera_sink.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/distributedhardware/distributed_camera/sa_profile:dcamera_sa_profile` | [foundation/distributedhardware/distributed_camera/sa_profile/BUILD.gn](../../../../../../foundation/distributedhardware/distributed_camera/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 9 个。

## 依赖与协作边界

该部件声明 29 个组件依赖和 0 个三方依赖。

- 系统组件协作：`accessibility`, `ipc`, `init`, `eventhandler`, `camera_framework`, `graphic_surface`, `distributed_hardware_fwk`, `device_security_level`, `device_manager`, `hdf_core`, `drivers_interface_display`, `drivers_interface_distributed_camera`, `c_utils`, `cJSON`, `dsoftbus`, `ffrt`, `ffmpeg`, `hicollie`, `media_foundation`, `hisysevent`, `hilog`, `samgr`, `hitrace`, `safwk`, `drivers_interface_camera`, `access_token`, `av_codec`, `os_account`, `sensor`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 211 个测试目标，bundle 声明 13 个测试入口。

主要测试形态：`group` 111 个，`ohos_fuzztest` 84 个，`ohos_unittest` 14 个，`ohos_executable` 1 个，`ohos_moduletest_suite` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributedhardware/distributed_camera/bundle.json](../../../../../../foundation/distributedhardware/distributed_camera/bundle.json)
- 原始源码 README：[foundation/distributedhardware/distributed_camera/README_zh.md](../../../../../../foundation/distributedhardware/distributed_camera/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
