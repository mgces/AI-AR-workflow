# midi_framework 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

`midi_framework` 是 OpenHarmony 系统中用于管理和控制 MIDI（Musical Instrument Digital Interface）设备的模块。它提供统一的接口来管理符合 MIDI 标准的电子乐器、控制器及周边音频设备（如电子琴、电子鼓等），屏蔽底层硬件差异，使得应用能够方便地通过 Native API 与外部 MIDI 设备进行高性能交互。 **设备发现与管理**：支持查询已连接 USB 及 BLE MIDI 设备的列表、热插拔监听及连接 BLE MIDI 设备。 **高性能数据传输**：支持基于 UMP（Universal MIDI Packet）协议的指令收发。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard,small,mini |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 4096KB / 4096KB |
| 源码仓 | `foundation/multimedia/midi_framework` |

## 核心能力

- **Multimedia Audio MIDI**：提供“audio midi”能力，系统能力标识为 `SystemCapability.Multimedia.Audio.MIDI`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/midi_framework/services](../../../../../../foundation/multimedia/midi_framework/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 7 | `common`, `etc`, `idl`, `server` |
| [foundation/multimedia/midi_framework/frameworks](../../../../../../foundation/multimedia/midi_framework/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 3 | `native` |
| [foundation/multimedia/midi_framework/sa_profile](../../../../../../foundation/multimedia/midi_framework/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/multimedia/midi_framework/interfaces](../../../../../../foundation/multimedia/midi_framework/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_api`, `kits` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `multimedia` | [midi_server](../../processes/midi_server/foundation-runtime.md) | 启动配置, SA 实现 | `3014` | `libmidi_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/multimedia/midi_framework/sa_profile:midi_service_sa_profile` | [foundation/multimedia/midi_framework/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimedia/midi_framework/services:midi_service` | [foundation/multimedia/midi_framework/services/BUILD.gn](../../../../../../foundation/multimedia/midi_framework/services/BUILD.gn) |

生产库形态：`ohos_shared_library` 6 个。

## 依赖与协作边界

该部件声明 15 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `access_token`, `bluetooth`, `c_utils`, `common_event_service`, `hicollie`, `hitrace`, `hilog`, `init`, `ipc`, `qos_manager`, `safwk`, `samgr`, `usb_manager`, `drivers_interface_midi`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 20 个测试目标，bundle 声明 3 个测试入口。

主要测试形态：`ohos_unittest` 12 个，`group` 5 个，`ohos_fuzztest` 2 个，`ohos_executable` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/midi_framework/bundle.json](../../../../../../foundation/multimedia/midi_framework/bundle.json)
- 原始源码 README：[foundation/multimedia/midi_framework/README_zh.md](../../../../../../foundation/multimedia/midi_framework/README_zh.md)、[foundation/multimedia/midi_framework/README.md](../../../../../../foundation/multimedia/midi_framework/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
