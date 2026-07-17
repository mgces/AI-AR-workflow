# ability_base 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

**ability_base**部件作为元能力的基础定义部件，提供组件启动参数（Want），系统环境参数（Configuration），URI参数（Uniform Resource Identifier）的定义，用于启动应用，获取环境参数等功能。 \| 子模块名称 \| 职责 \| \| ---------------- \| ------------------------------------------------------------\| \| Want模块 \| 组件启动参数模块，开发者可以使用Want携带自定义参数，显示/隐示启动应用，同时支持Pending机制，可本地及跨设备延迟启动目标组件。 \| \| Configuration模块 \| 系统环境参数模块，支持开发者查询当前环境配置信息，感知系统环境变化。 \| \| URI模块 \| URI参数定义模块，提供本地及跨设备资源访问能力，开发者可以使用URI访问文件等资源。 \| \| Base模块 \| 基础数据类型模块，提供Boolean，Integer，String等支持Want携带的基础数据类型定义，方便开发者启动过程中传递自定义参数。 \|

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `ability` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/ability/ability_base` |

## 核心能力

- **Ability Ability Base**：提供“ability ability base”能力，系统能力标识为 `SystemCapability.Ability.AbilityBase`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/ability/ability_base/interfaces](../../../../../../foundation/ability/ability_base/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_api`, `kits` |

## 对外与内部接口

该部件声明 10 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/ability/ability_base:ability_base_want` | `//foundation/ability/ability_base/interfaces/kits/c/cwant/include` | `want_manager.h`, `want.h` |
| `//foundation/ability/ability_base:base` | `//foundation/ability/ability_base/interfaces/inner_api/base/include/` | `base_def.h`, `base_interfaces.h`, `base_obj.h`, `base_types.h`, `bool_wrapper.h`, `byte_wrapper.h`, `double_wrapper.h`, `float_wrapper.h` 等 12 个 |
| `//foundation/ability/ability_base:want` | `//foundation/ability/ability_base/interfaces/kits/native/want/include/` | `element_name.h`, `want.h`, `skills.h`, `want_params.h`, `match_type.h`, `operation.h`, `patterns_matcher.h`, `pac_map.h` |
| `//foundation/ability/ability_base:configuration` | `//foundation/ability/ability_base/interfaces/kits/native/configuration/include` | `configuration.h`, `global_configuration_key.h` |
| `//foundation/ability/ability_base:zuri` | `//foundation/ability/ability_base/interfaces/kits/native/uri/include` | `uri.h` |
| `//foundation/ability/ability_base:extractortool` | `//foundation/ability/ability_base/interfaces/kits/native/extractortool/include` | `extractor.h`, `zip_file.h` |
| `//foundation/ability/ability_base:string_utils` | `//foundation/ability/ability_base/interfaces/kits/native/extractortool/include` | `file_path_utils.h` |
| `//foundation/ability/ability_base:extractresourcemanager` | `//foundation/ability/ability_base/interfaces/kits/native/extractortool/include` | `extract_resource_manager.h` |
| `//foundation/ability/ability_base:session_info` | `//foundation/ability/ability_base/interfaces/kits/native/session_info/include` | `session_info.h` |
| `//foundation/ability/ability_base:view_data` | `//foundation/ability/ability_base/interfaces/kits/native/view_data/include` | `view_data.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 10 个。

## 依赖与协作边界

该部件声明 12 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_runtime`, `bundle_framework`, `c_utils`, `hilog`, `hitrace`, `icu`, `ipc`, `resource_management`, `json`, `jsoncpp`, `zlib`, `window_manager`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 88 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_unittest` 32 个，`group` 29 个，`ohos_fuzztest` 27 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/ability/ability_base/bundle.json](../../../../../../foundation/ability/ability_base/bundle.json)
- 原始源码 README：[foundation/ability/ability_base/README.md](../../../../../../foundation/ability/ability_base/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
