# ability_cangjie_wrapper 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The ability_cangjie_wrapper is a Cangjie API encapsulated on OpenHarmony based on the ability_runtime subsystem.

源码 README 补充说明：

> 元能力仓颉封装实现对Ability的运行及生命周期进行统一的调度和管理，应用进程能够支撑多个Ability，Ability具有跨应用进程间和同一进程内调用的能力。Ability管理服务统一调度和管理应用中各Ability，并对Ability的生命周期变更进行管理。当前开放的元能力仓颉接口仅支持standard设备。 UIAbility：面向开发者提供的UIAbility的API能力。UIAbility是包含UI界面的应用组件，提供UIAbility组件创建、销毁、前后台切换等生命周期回调的能力。开发者可通过继承此类来实现对UIAbility组件的监控能力。应用上下文提供了获取组件信息的能力。 应用上下文：面向开发者提供的应用上下文的API能力。应用上下文提供了Ability或Application的上下文的基础能力，包括访问特定应用程序的资源等。UIAbility组件的上下文提供了拉起其他UIAbility、销毁UIAbility的能力。开发者可通过UIAbilityContext获取相关信息或拉起其他UIAbility。 组件管理器：面向开发者提供的组件管理器的API能力。一个Module级别的组件管理器，用于进行Module级别的资源预加载、线程创建等初始化操作，以及维护Module下的应用状态。 错误观测管理：面向开发者提供的错误观测管理的API能力。提供了对错误观察器的注册和注销能力。当开发者需要注册或注销错误观察器时，可以使用其提供的接口。 自动化测试框架管理：面向开发者提供的自动化测试框架管理API能力。开发者可通过此模块来监视指定的Ability的生命周期状态更改和获取测试参数。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `ability` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 1500KB / 1536KB |
| 源码仓 | `foundation/ability/ability_cangjie_wrapper` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/ability/ability_cangjie_wrapper/ohos](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 25 | `ability`, `app`, `application` |
| [foundation/ability/ability_cangjie_wrapper/kit](../../../../../../foundation/ability/ability_cangjie_wrapper/kit) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | `AbilityKit` |
| [foundation/ability/ability_cangjie_wrapper/mock](../../../../../../foundation/ability/ability_cangjie_wrapper/mock) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 8 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability:ohos.app.ability` | - | - |
| `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ui_ability:ohos.app.ability.ui_ability` | - | - |
| `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/want:ohos.app.ability.want` | - | - |
| `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ability_delegator_registry:ohos.app.ability.ability_delegator_registry` | - | - |
| `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/context_constant:ohos.app.ability.context_constant` | - | - |
| `//foundation/ability/ability_cangjie_wrapper/ohos/application/test_runner:ohos.application.test_runner` | - | - |
| `//foundation/ability/ability_cangjie_wrapper:copy_sdk_ability_cangjie_libs` | - | - |
| `//foundation/ability/ability_cangjie_wrapper:copy_sdk_ability_cangjie_libs_kit` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_cangjie_shared_library` 24 个。

## 依赖与协作边界

该部件声明 12 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_runtime`, `access_token`, `accesscontrol_cangjie_wrapper`, `cangjie_ark_interop`, `arkui_cangjie_wrapper`, `hiviewdfx_cangjie_wrapper`, `bundlemanager_cangjie_wrapper`, `communication_cangjie_wrapper`, `global_cangjie_wrapper`, `multimedia_cangjie_wrapper`, `window_cangjie_wrapper`, `testfwk_cangjie_wrapper`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 1 个测试目标，bundle 声明 0 个测试入口。

主要测试形态：`ohos_cangjie_shared_library` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/ability/ability_cangjie_wrapper/bundle.json](../../../../../../foundation/ability/ability_cangjie_wrapper/bundle.json)
- 原始源码 README：[foundation/ability/ability_cangjie_wrapper/README_zh.md](../../../../../../foundation/ability/ability_cangjie_wrapper/README_zh.md)、[foundation/ability/ability_cangjie_wrapper/README.md](../../../../../../foundation/ability/ability_cangjie_wrapper/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
