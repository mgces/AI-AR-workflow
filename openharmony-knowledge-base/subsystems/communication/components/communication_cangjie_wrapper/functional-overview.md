# communication_cangjie_wrapper 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The Distributed Softbus Cangjie API is a Cangjie API encapsulated on OpenHarmony based on the capabilities of the Distributed Softbus Subsystem.

源码 README 补充说明：

> 在OpenHarmony平台上，进程间通信仓颉封装为开发者提供了使用仓颉语言进行应用开发时所需的跨进程通信相关的能力。IPC（Inter-Process Communication）与RPC（Remote Procedure Call）机制用于实现跨进程通信，不同的是前者使用Binder驱动，用于设备内的跨进程通信，而后者使用软总线驱动，用于跨设备跨进程通信。IPC典型场景在后台服务，应用的后台服务通过IPC机制提供跨进程的服务调用能力，RPC典型使用场景在多端协同，多端协同通过RPC机制提供远端接口调用与数据传递能力。当前开放的进程间通信仓颉接口仅支持standard设备。 匿名共享内存对象：提供与匿名共享内存对象相关的方法，包括创建、关闭、映射和取消映射Ashmem、从Ashmem读取数据和写入数据、获取Ashmem大小、设置Ashmem保护。 消息序列：在RPC或IPC过程中，发送方可以使用MessageSequence提供的写方法，将待发送的数据以特定格式写入该对象。接收方可以使用MessageSequence提供的读方法从该对象中读取特定格式的数据。数据格式包括：基础类型及对应的数组、fd、接口描述符、匿名共享内存对象和自定义序列化对象。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 300KB / 228KB |
| 源码仓 | `foundation/communication/communication_cangjie_wrapper` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/communication_cangjie_wrapper/kit](../../../../../../foundation/communication/communication_cangjie_wrapper/kit) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | `IPCKit` |
| [foundation/communication/communication_cangjie_wrapper/ohos](../../../../../../foundation/communication/communication_cangjie_wrapper/ohos) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | `rpc` |
| [foundation/communication/communication_cangjie_wrapper/mock](../../../../../../foundation/communication/communication_cangjie_wrapper/mock) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 3 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/communication_cangjie_wrapper/ohos/rpc:ohos.rpc` | - | - |
| `//foundation/communication/communication_cangjie_wrapper:copy_sdk_communication_cangjie_libs` | - | - |
| `//foundation/communication/communication_cangjie_wrapper:copy_sdk_communication_cangjie_libs_kit` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_cangjie_shared_library` 2 个。

## 依赖与协作边界

该部件声明 3 个组件依赖和 0 个三方依赖。

- 系统组件协作：`cangjie_ark_interop`, `hiviewdfx_cangjie_wrapper`, `ipc`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/communication_cangjie_wrapper/bundle.json](../../../../../../foundation/communication/communication_cangjie_wrapper/bundle.json)
- 原始源码 README：[foundation/communication/communication_cangjie_wrapper/README_zh.md](../../../../../../foundation/communication/communication_cangjie_wrapper/README_zh.md)、[foundation/communication/communication_cangjie_wrapper/README.md](../../../../../../foundation/communication/communication_cangjie_wrapper/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
