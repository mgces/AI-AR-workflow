# connectivity_cangjie_wrapper 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Provides basic Bluetooth, BLE, WIFI Cangjie API for applications

源码 README 补充说明：

> 基础通信仓颉封装为OpenHarmony应用开发者提供使用蓝牙服务、WLAN服务能力的仓颉API实现。当前开放的基础通信仓颉接口仅支持standard设备。 WLAN服务：无线局域网（Wireless Local Area Networks，WLAN），是通过无线电、红外光信号或者其他技术发送和接收数据的局域网，用户可以通过WLAN实现结点之间无物理连接的网络通讯。常用于用户携带可移动终端的办公、公众环境中。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 1100KB / 1176KB |
| 源码仓 | `foundation/communication/connectivity_cangjie_wrapper` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/connectivity_cangjie_wrapper/ohos](../../../../../../foundation/communication/connectivity_cangjie_wrapper/ohos) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 8 | `bluetooth`, `wifi_manager` |
| [foundation/communication/connectivity_cangjie_wrapper/kit](../../../../../../foundation/communication/connectivity_cangjie_wrapper/kit) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | `ConnectivityKit` |
| [foundation/communication/connectivity_cangjie_wrapper/mock](../../../../../../foundation/communication/connectivity_cangjie_wrapper/mock) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/communication/connectivity_cangjie_wrapper:copy_sdk_connectivity_cangjie_libs` | - | - |
| `//foundation/communication/connectivity_cangjie_wrapper:copy_sdk_connectivity_cangjie_libs_kit` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_cangjie_shared_library` 9 个。

## 依赖与协作边界

该部件声明 4 个组件依赖和 0 个三方依赖。

- 系统组件协作：`cangjie_ark_interop`, `hiviewdfx_cangjie_wrapper`, `bluetooth`, `wifi`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/connectivity_cangjie_wrapper/bundle.json](../../../../../../foundation/communication/connectivity_cangjie_wrapper/bundle.json)
- 原始源码 README：[foundation/communication/connectivity_cangjie_wrapper/README_zh.md](../../../../../../foundation/communication/connectivity_cangjie_wrapper/README_zh.md)、[foundation/communication/connectivity_cangjie_wrapper/README.md](../../../../../../foundation/communication/connectivity_cangjie_wrapper/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
