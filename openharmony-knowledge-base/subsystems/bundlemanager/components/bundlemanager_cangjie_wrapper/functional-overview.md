# bundlemanager_cangjie_wrapper 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The bundlemanager_cangjie_wrapper is a Cangjie API encapsulated on OpenHarmony based on the bundle_framework subsystem.

源码 README 补充说明：

> 包管理仓颉封装负责应用安装包的管理，提供安装包的信息查询能力以及ElementName信息、元数据对象和Skill标签对象的定义。当前开放的包管理仓颉接口仅支持standard设备。 应用程序包管理模块：包含面向开发者提供的用于应用信息查询的API能力；应用组件结构体、元数据对象和Skill标签对象的定义。 - 应用信息查询能力：面向开发者提供的用于应用信息查询的API能力。提供UIAbility组件信息、ExtensionAbility组件信息的查询能力，返回json格式字符串。提供查询给定的链接是否可以打开的能力。 - 应用组件结构体: 面向开发者提供的应用组件结构体的定义。包含bundleName、moduleName和abilityName等。通常用于组件启动回调函数中。 - 元数据对象: 面向开发者提供的元数据对象的定义。包含元数据名称、元数据值和元数据资源。可通过BundleInfo获取。 - Skill标签对象：面向开发者提供的Skill标签对象的定义。包含Skill接收的actions、entities、uris、domainVerify集合。可通过BundleInfo获取。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `bundlemanager` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 400KB / 468KB |
| 源码仓 | `foundation/bundlemanager/bundlemanager_cangjie_wrapper` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 5 | `bundle`, `element_name`, `metadata`, `skill` |
| [foundation/bundlemanager/bundlemanager_cangjie_wrapper/mock](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/mock) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 3 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/bundle/bundle_manager:ohos.bundle.bundle_manager` | - | - |
| `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/element_name:ohos.element_name` | - | - |
| `//foundation/bundlemanager/bundlemanager_cangjie_wrapper:copy_sdk_bundlemanager_cangjie_libs` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_cangjie_shared_library` 5 个。

## 依赖与协作边界

该部件声明 5 个组件依赖和 0 个三方依赖。

- 系统组件协作：`cangjie_ark_interop`, `global_cangjie_wrapper`, `hiviewdfx_cangjie_wrapper`, `bundle_framework`, `ability_runtime`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/bundlemanager/bundlemanager_cangjie_wrapper/bundle.json](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/bundle.json)
- 原始源码 README：[foundation/bundlemanager/bundlemanager_cangjie_wrapper/README_zh.md](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/README_zh.md)、[foundation/bundlemanager/bundlemanager_cangjie_wrapper/README.md](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
