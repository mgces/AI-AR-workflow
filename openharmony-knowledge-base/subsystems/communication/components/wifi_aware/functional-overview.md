# wifi_aware 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

WiFi Aware模块使用C语言编写，目前仅支持Hi3861开发板。如果您想接入其它芯片，那么仅需要适配实现鸿蒙的集成接口即可，将实现放在device下。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 框架或基础库 |
| 适配系统 | small,standard |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 967KB / 28MB |
| 源码仓 | `foundation/communication/wifi_aware` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/wifi_aware/frameworks](../../../../../../foundation/communication/wifi_aware/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 0 | `source` |
| [foundation/communication/wifi_aware/hals](../../../../../../foundation/communication/wifi_aware/hals) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/communication/wifi_aware/interfaces](../../../../../../foundation/communication/wifi_aware/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `kits` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`static_library` 1 个。

## 依赖与协作边界

该部件声明 0 个组件依赖和 0 个三方依赖。

- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/wifi_aware/bundle.json](../../../../../../foundation/communication/wifi_aware/bundle.json)
- 原始源码 README：[foundation/communication/wifi_aware/README_zh.md](../../../../../../foundation/communication/wifi_aware/README_zh.md)、[foundation/communication/wifi_aware/README.md](../../../../../../foundation/communication/wifi_aware/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
