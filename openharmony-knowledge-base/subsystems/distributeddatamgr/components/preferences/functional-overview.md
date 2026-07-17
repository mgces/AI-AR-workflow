# preferences 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

**首选项（Preferences）** 主要提供轻量级Key-Value操作，支持本地应用存储少量数据，数据存储在本地文件中，同时也加载在内存中，所以访问速度更快，效率更高。首选项提供非关系型数据存储，不宜存储大量数据，经常用于操作键值对形式数据的场景。 本模块提供首选项的操作类，应用通过这些操作类完成首选项操作。 借助getPreferences，可以将指定文件的内容加载到Preferences实例，每个文件最多有一个Preferences实例，系统会通过静态容器将该实例存储在内存中，直到主动从内存中移除该实例或者删除该文件。 获取Preferences实例后，可以借助Preferences类的函数，从Preferences实例中读取数据或者将数据写入Preferences实例，通过flush将Preferences实例持久化。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `distributeddatamgr` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 512KB / 1024KB |
| 源码仓 | `foundation/distributeddatamgr/preferences` |

## 核心能力

- **Distributed Data Manager Preferences Core**：提供“preferences core”能力，系统能力标识为 `SystemCapability.DistributedDataManager.Preferences.Core`。
- **Distributed Data Manager Preferences Core Lite**：提供“core lite”能力，系统能力标识为 `SystemCapability.DistributedDataManager.Preferences.Core.Lite`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/distributeddatamgr/preferences/frameworks](../../../../../../foundation/distributeddatamgr/preferences/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 25 | `cj`, `common`, `ets`, `js`, `native`, `ndk` |
| [foundation/distributeddatamgr/preferences/interfaces](../../../../../../foundation/distributeddatamgr/preferences/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 12 | `inner_api`, `ndk` |

## 对外与内部接口

该部件声明 4 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/distributeddatamgr/preferences/interfaces/inner_api:native_preferences` | `//foundation/distributeddatamgr/preferences/interfaces/inner_api/include` | `preferences.h`, `preferences_observer.h`, `preferences_helper.h`, `preferences_errno.h`, `preferences_value.h` |
| `//foundation/distributeddatamgr/preferences/interfaces/ndk:libohpreferences` | `//foundation/distributeddatamgr/preferences/interfaces/ndk/include` | `oh_preferences.h`, `oh_preferences_value.h`, `oh_preferences_option.h`, `oh_preferences_value.h` |
| `//foundation/distributeddatamgr/preferences/frameworks/cj:cj_preferences_ffi` | `//foundation/distributeddatamgr/preferences/frameworks/cj/src` | - |
| `//foundation/distributeddatamgr/preferences/frameworks/ets/taihe/preferences:copy_taihe` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 10 个，`ohos_source_set` 4 个，`taihe_shared_library` 1 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 16 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_runtime`, `bundle_framework`, `access_token`, `ets_frontend`, `napi`, `hilog`, `c_utils`, `ability_base`, `common_event_service`, `hisysevent`, `hitrace`, `ipc`, `bounds_checking_function`, `libxml2`, `runtime_core`, `ffrt`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 45 个测试目标，bundle 声明 7 个测试入口。

主要测试形态：`group` 23 个，`ohos_fuzztest` 11 个，`ohos_js_unittest` 4 个，`ohos_unittest` 3 个，`ohos_js_stage_unittest` 1 个，`ohos_app_scope` 1 个，`ohos_js_assets` 1 个，`ohos_resources` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/distributeddatamgr/preferences/bundle.json](../../../../../../foundation/distributeddatamgr/preferences/bundle.json)
- 原始源码 README：[foundation/distributeddatamgr/preferences/README_zh.md](../../../../../../foundation/distributeddatamgr/preferences/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
