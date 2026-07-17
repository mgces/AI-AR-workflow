# filemanagement_cangjie_wrapper 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The filemanagement_cangjie_wrapper is a Cangjie API encapsulated on OpenHarmony based on the capabilities of the file management Subsystem.

源码 README 补充说明：

> 文件管理仓颉封装为OpenHarmony应用开发者提供了一套文件数据管理解决方案，提供安全、易用的文件访问能力和完善的文件存储管理能力的仓颉API。当前开放的文件管理仓颉接口仅支持standard设备。 文件管理API：提供基础文件操作能力，包括文件基本管理、文件目录管理、文件信息统计、文件流式读写等常用文件功能的仓颉公开接口声明。 文件URI API：提供通过PATH获取文件统一资源标志符（Uniform Resource Identifier，URI）的仓颉公开接口声明。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `filemanagement` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 467KB / 412KB |
| 源码仓 | `foundation/filemanagement/filemanagement_cangjie_wrapper` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/filemanagement/filemanagement_cangjie_wrapper/ohos](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/ohos) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 3 | `file` |
| [foundation/filemanagement/filemanagement_cangjie_wrapper/kit](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/kit) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | `CoreFileKit` |
| [foundation/filemanagement/filemanagement_cangjie_wrapper/mock](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/mock) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/filemanagement/filemanagement_cangjie_wrapper:copy_sdk_filemanagement_cangjie_libs` | - | - |
| `//foundation/filemanagement/filemanagement_cangjie_wrapper:copy_sdk_filemanagement_cangjie_libs_kit` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_cangjie_shared_library` 4 个。

## 依赖与协作边界

该部件声明 4 个组件依赖和 0 个三方依赖。

- 系统组件协作：`app_file_service`, `cangjie_ark_interop`, `hiviewdfx_cangjie_wrapper`, `file_api`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/filemanagement/filemanagement_cangjie_wrapper/bundle.json](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/bundle.json)
- 原始源码 README：[foundation/filemanagement/filemanagement_cangjie_wrapper/README_zh.md](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/README_zh.md)、[foundation/filemanagement/filemanagement_cangjie_wrapper/README.md](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
