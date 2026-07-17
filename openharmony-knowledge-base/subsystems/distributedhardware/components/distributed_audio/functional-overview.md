# distributed_audio 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

分布式音频是指多个设备之间音频外设跨设备协同使用的能力，如将设备A的音频通过设备B的Speaker进行播音，或者设备A使用设备B的Mic进行录音。 分布式音频不直接向应用提供接口，应用可以通过音频框架的接口来调用分布式音频能力，使用方式与本地音频一致。 **主控端（source）**：分布式音频控制端设备，向被控端设备发送指令，实现在被控端设备上音频播放和录制的功能； **被控端（sink）**：分布式音频被控制端设备，接收来自主控端设备的指令，使本地音频外设为主控端设备所用，用来播音或录音。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributedhardware` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2000KB / 6MB |
| 源码仓 | `foundation/distributedhardware/distributed_audio` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `distributed_audio_extension_sa`：distributed audio extension sa。
- `distributed_audio_same_account`：distributed audio same account。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributedhardware/distributed_audio/services](../../../../../../foundation/distributedhardware/distributed_audio/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 132 | `audioclient`, `audiocontrol`, `audiohdiproxy`, `audiomanager`, `audioprocessor`, `audiotransport`, `common`, `test_example` |
| [foundation/distributedhardware/distributed_audio/interfaces](../../../../../../foundation/distributedhardware/distributed_audio/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 82 | `inner_kits` |
| [foundation/distributedhardware/distributed_audio/common](../../../../../../foundation/distributedhardware/distributed_audio/common) | 组件内部共享的公共定义、工具和基础实现。 | 6 | `dfx_utils`, `include`, `src` |
| [foundation/distributedhardware/distributed_audio/audiohandler](../../../../../../foundation/distributedhardware/distributed_audio/audiohandler) | 音频采集、播放、路由、焦点或处理能力。 | 4 | `include`, `src` |
| [foundation/distributedhardware/distributed_audio/sa_profile](../../../../../../foundation/distributedhardware/distributed_audio/sa_profile) | System Ability 注册信息及进程装载配置。 | 2 | `common` |

## 对外与内部接口

该部件声明 5 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributedhardware/distributed_audio/interfaces/inner_kits/native_cpp/audio_sink:distributed_audio_sink_sdk` | `//foundation/distributedhardware/distributed_audio/interfaces/inner_kits/native_cpp/audio_sink/include` | `idaudio_sink.h` |
| `//foundation/distributedhardware/distributed_audio/interfaces/inner_kits/native_cpp/audio_source:distributed_audio_source_sdk` | `//foundation/distributedhardware/distributed_audio/interfaces/inner_kits/native_cpp/audio_source/include` | `idaudio_source.h` |
| `//foundation/distributedhardware/distributed_audio/services/audiotransport/receiverengine:distributed_audio_decode_transport` | `//foundation/distributedhardware/distributed_audio/services/audiotransport/receiverengine` | `include/av_receiver_engine_adapter.h`, `include/av_receiver_engine_transport.h` |
| `//foundation/distributedhardware/distributed_audio/services/audiotransport/senderengine:distributed_audio_encode_transport` | `//foundation/distributedhardware/distributed_audio/services/audiotransport/senderengine` | `include/av_sender_engine_adapter.h`, `include/av_sender_engine_transport.h` |
| `//foundation/distributedhardware/distributed_audio/services/common:distributed_audio_utils` | `//foundation/distributedhardware/distributed_audio/services/common/` | `audiodata/include/audio_data.h`, `audioparam/audio_param.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `distributedhardware` | [daudio](../../processes/daudio/foundation-runtime.md) | 启动配置, SA 实现 | `4805`, `4806` | `libdistributed_audio_source.z.so`, `libdistributed_audio_sink.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/distributedhardware/distributed_audio/sa_profile:daudio_sa_profile` | [foundation/distributedhardware/distributed_audio/sa_profile/BUILD.gn](../../../../../../foundation/distributedhardware/distributed_audio/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 8 个。

## 依赖与协作边界

该部件声明 25 个组件依赖和 0 个三方依赖。

- 系统组件协作：`access_token`, `accessibility`, `audio_framework`, `av_codec`, `cJSON`, `c_utils`, `device_security_level`, `device_manager`, `distributed_hardware_fwk`, `drivers_interface_audio`, `drivers_interface_distributed_audio`, `dsoftbus`, `eventhandler`, `hdf_core`, `hicollie`, `hisysevent`, `hitrace`, `hilog`, `init`, `media_foundation`, `ipc`, `os_account`, `player_framework`, `safwk`, `samgr`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 191 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`group` 96 个，`ohos_fuzztest` 67 个，`ohos_unittest` 27 个，`ohos_executable` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributedhardware/distributed_audio/bundle.json](../../../../../../foundation/distributedhardware/distributed_audio/bundle.json)
- 原始源码 README：[foundation/distributedhardware/distributed_audio/README_zh.md](../../../../../../foundation/distributedhardware/distributed_audio/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
