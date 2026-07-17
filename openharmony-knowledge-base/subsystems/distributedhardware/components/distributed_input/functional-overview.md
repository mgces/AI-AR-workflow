# distributed_input 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

分布式输入提供了跨设备的输入外设控制能力，使一台设备可以使用另一台设备的输入外设（如鼠标，键盘，触摸板等）在本设备进行输入操作（如鼠标点击，键盘打字，触摸板滑动等），对端设备的外设输入事件在本机生效。 分布式输入不提供北向接口，由多模输入子系统提供分布式输入业务接口供开发者调用分布式输入的能力。 **主控端(source)**：分布式输入控制端设备，向被控端设备发送指令，使用其外设输入的能力。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributedhardware` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 16384KB / 15360KB |
| 源码仓 | `foundation/distributedhardware/distributed_input` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributedhardware/distributed_input/services](../../../../../../foundation/distributedhardware/distributed_input/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 33 | `common`, `sink`, `source`, `state`, `transportbase` |
| [foundation/distributedhardware/distributed_input/interfaces](../../../../../../foundation/distributedhardware/distributed_input/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 23 | `inner_kits`, `ipc` |
| [foundation/distributedhardware/distributed_input/dfx_utils](../../../../../../foundation/distributedhardware/distributed_input/dfx_utils) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `include`, `src` |
| [foundation/distributedhardware/distributed_input/inputdevicehandler](../../../../../../foundation/distributedhardware/distributed_input/inputdevicehandler) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `include`, `src` |
| [foundation/distributedhardware/distributed_input/sinkhandler](../../../../../../foundation/distributedhardware/distributed_input/sinkhandler) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `include`, `src` |
| [foundation/distributedhardware/distributed_input/sourcehandler](../../../../../../foundation/distributedhardware/distributed_input/sourcehandler) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `include`, `src` |
| [foundation/distributedhardware/distributed_input/utils](../../../../../../foundation/distributedhardware/distributed_input/utils) | 跨模块复用的基础工具和通用数据结构。 | 4 | `include`, `src` |
| [foundation/distributedhardware/distributed_input/common](../../../../../../foundation/distributedhardware/distributed_input/common) | 组件内部共享的公共定义、工具和基础实现。 | 3 | `include` |
| [foundation/distributedhardware/distributed_input/sa_profile](../../../../../../foundation/distributedhardware/distributed_input/sa_profile) | System Ability 注册信息及进程装载配置。 | 3 | - |
| [foundation/distributedhardware/distributed_input/frameworks](../../../../../../foundation/distributedhardware/distributed_input/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 0 | `include` |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributedhardware/distributed_input/interfaces/inner_kits:libdinput_sdk` | `//foundation/distributedhardware/distributed_input/interfaces/inner_kits/include` | `distributed_input_kit.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `distributedhardware` | [dinput](../../processes/dinput/foundation-runtime.md) | 启动配置, SA 实现 | `4809`, `4810` | `libdinput_source.z.so`, `libdinput_sink.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/distributedhardware/distributed_input/sa_profile:distributed_input_source_sa_profile` | [foundation/distributedhardware/distributed_input/sa_profile/BUILD.gn](../../../../../../foundation/distributedhardware/distributed_input/sa_profile/BUILD.gn) |
| `ohos_sa_profile` | `//foundation/distributedhardware/distributed_input/sa_profile:distributed_input_sink_sa_profile` | [foundation/distributedhardware/distributed_input/sa_profile/BUILD.gn](../../../../../../foundation/distributedhardware/distributed_input/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 14 个。

## 依赖与协作边界

该部件声明 24 个组件依赖和 0 个三方依赖。

- 系统组件协作：`access_token`, `accessibility`, `device_manager`, `eventhandler`, `hilog`, `ipc`, `json`, `libevdev`, `safwk`, `samgr`, `dsoftbus`, `c_utils`, `distributed_hardware_fwk`, `config_policy`, `hicollie`, `hisysevent`, `hitrace`, `graphic_surface`, `window_manager`, `openssl`, `os_account`, `graphic_2d`, `cJSON`, `selinux_adapter`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 94 个测试目标，bundle 声明 18 个测试入口。

主要测试形态：`group` 56 个，`ohos_unittest` 23 个，`ohos_fuzztest` 15 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributedhardware/distributed_input/bundle.json](../../../../../../foundation/distributedhardware/distributed_input/bundle.json)
- 原始源码 README：[foundation/distributedhardware/distributed_input/README_zh.md](../../../../../../foundation/distributedhardware/distributed_input/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
