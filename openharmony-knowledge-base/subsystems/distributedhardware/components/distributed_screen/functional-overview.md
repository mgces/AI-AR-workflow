# distributed_screen 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

分布式屏幕是一种屏幕虚拟化能力，支持用户指定组网认证过的其他OpenHarmony设备的屏幕作为Display的显示区域。在分布式硬件子系统中，分布式屏幕组件提供跨设备屏幕能力调用，为OpenHarmony操作系统提供系统投屏、屏幕镜像、屏幕分割等能力的实现。 **屏幕区域管理（ScreenRegionManager）**：管理主控端映射在被控端屏幕上的显示区域的状态，包括为显示区域指定显示的display，设置显示区域的宽高，解码类型等参数。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributedhardware` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 5120KB / 33580KB |
| 源码仓 | `foundation/distributedhardware/distributed_screen` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributedhardware/distributed_screen/services](../../../../../../foundation/distributedhardware/distributed_screen/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 76 | `common`, `screenclient`, `screendemo`, `screenservice`, `screentransport`, `softbusadapter` |
| [foundation/distributedhardware/distributed_screen/interfaces](../../../../../../foundation/distributedhardware/distributed_screen/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 54 | `innerkits` |
| [foundation/distributedhardware/distributed_screen/screenhandler](../../../../../../foundation/distributedhardware/distributed_screen/screenhandler) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 10 | `include`, `src` |
| [foundation/distributedhardware/distributed_screen/common](../../../../../../foundation/distributedhardware/distributed_screen/common) | 组件内部共享的公共定义、工具和基础实现。 | 4 | `include`, `src` |
| [foundation/distributedhardware/distributed_screen/sa_profile](../../../../../../foundation/distributedhardware/distributed_screen/sa_profile) | System Ability 注册信息及进程装载配置。 | 2 | - |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributedhardware/distributed_screen/interfaces/innerkits/native_cpp/screen_sink:distributed_screen_sink_sdk` | `//foundation/distributedhardware/distributed_screen/interfaces/innerkits/native_cpp/screen_sink/include` | `idscreen_sink.h` |
| `//foundation/distributedhardware/distributed_screen/interfaces/innerkits/native_cpp/screen_source:distributed_screen_source_sdk` | `//foundation/distributedhardware/distributed_screen/interfaces/innerkits/native_cpp/screen_source/include` | `idscreen_source.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `distributedhardware` | [dscreen](../../processes/dscreen/foundation-runtime.md) | 启动配置, SA 实现 | `4807`, `4808` | `libdistributed_screen_source.z.so`, `libdistributed_screen_sink.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/distributedhardware/distributed_screen/sa_profile:dscreen_sa_profile` | [foundation/distributedhardware/distributed_screen/sa_profile/BUILD.gn](../../../../../../foundation/distributedhardware/distributed_screen/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 9 个。

## 依赖与协作边界

该部件声明 28 个组件依赖和 0 个三方依赖。

- 系统组件协作：`access_token`, `accessibility`, `av_codec`, `device_manager`, `dsoftbus`, `eventhandler`, `hisysevent`, `init`, `ipc`, `hilog`, `input`, `json`, `ffrt`, `graphic_2d`, `graphic_surface`, `media_foundation`, `os_account`, `samgr`, `safwk`, `selinux_adapter`, `hicollie`, `hitrace`, `cJSON`, `c_utils`, `window_manager`, `distributed_hardware_fwk`, `libjpeg-turbo`, `hdf_core`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 114 个测试目标，bundle 声明 18 个测试入口。

主要测试形态：`group` 57 个，`ohos_fuzztest` 35 个，`ohos_unittest` 21 个，`ohos_executable` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributedhardware/distributed_screen/bundle.json](../../../../../../foundation/distributedhardware/distributed_screen/bundle.json)
- 原始源码 README：[foundation/distributedhardware/distributed_screen/README_zh.md](../../../../../../foundation/distributedhardware/distributed_screen/README_zh.md)、[foundation/distributedhardware/distributed_screen/README_en.md](../../../../../../foundation/distributedhardware/distributed_screen/README_en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
