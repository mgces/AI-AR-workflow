# ability_lite 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

App development framework for mini and small system.

源码 README 补充说明：

> **元能力组件**，是OpenHarmony为开发者提供的一套开发鸿蒙应用的开发框架。元能力组件由如下模块组成： **AbilityKit**是Ability框架提供给开发者的开发包，开发者基于该开发包可以开发出基于Ability组件的应用。基于Ability组件开发的应用有两种类型：基于Javascript语言开发的Ability（**JS Ability**）和基于C/C++语言开发的Ability（**Native Ability**）。**JS应用开发框架**是开发者开发JS Ability所用到框架，是在AbilityKit基础封装的包含JS UI组件的一套方便开发者能够迅速开发Ability应用的框架。 **Ability**是系统调度应用的最小单元，是能够完成一个独立功能的组件，一个应用可以包含一个或多个Ability。Ability分为两种类型：Page类型的Ability和Service类型的Ability - **Page类型的Ability**：带有界面，为用户提供人机交互的能力。 - **Service类型的Ability**：不带界面，为用户提供后台任务机制。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `ability` |
| 实现形态 | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | mini,small |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/ability/ability_lite` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `ability_lite_enable_ohos_appexecfwk_feature_ability`：ability lite 启用 ohos appexecfwk 功能 ability。
- `ability_lite_enable_ohos_aafwk_multi_tasks_feature`：ability lite 启用 ohos aafwk multi tasks 功能。
- `ability_lite_config_ohos_aafwk_ams_task_size`：ability lite config ohos aafwk ams task size。
- `ability_lite_config_ohos_aafwk_aafwk_lite_task_stack_size`：ability lite config ohos aafwk aafwk lite task stack size。
- `ability_lite_config_ohos_aafwk_ability_list_capacity`：ability lite config ohos aafwk ability list capacity。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/ability/ability_lite/frameworks](../../../../../../foundation/ability/ability_lite/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 13 | `ability_lite`, `abilitymgr_lite`, `want_lite` |
| [foundation/ability/ability_lite/services](../../../../../../foundation/ability/ability_lite/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 9 | `abilitymgr_lite` |
| [foundation/ability/ability_lite/interfaces](../../../../../../foundation/ability/ability_lite/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 3 | `inner_api`, `kits` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `executable` | `//foundation/ability/ability_lite/services/abilitymgr_lite/tools:aa` | [foundation/ability/ability_lite/services/abilitymgr_lite/tools/BUILD.gn](../../../../../../foundation/ability/ability_lite/services/abilitymgr_lite/tools/BUILD.gn) |

生产库形态：`lite_library` 4 个，`static_library` 1 个，`ohos_shared_library` 1 个。

## 依赖与协作边界

该部件声明 7 个组件依赖和 3 个三方依赖。

- 系统组件协作：`bundle_framework_lite`, `kv_store`, `ui_lite`, `surface_lite`, `hilog`, `samgr_lite`, `window_manager_lite`。
- 三方实现依赖：`bounds_checking_function`, `cJSON`, `freetype`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 5 个测试目标，bundle 声明 0 个测试入口。

主要测试形态：`unittest` 3 个，`group` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/ability/ability_lite/bundle.json](../../../../../../foundation/ability/ability_lite/bundle.json)
- 原始源码 README：[foundation/ability/ability_lite/README_zh.md](../../../../../../foundation/ability/ability_lite/README_zh.md)、[foundation/ability/ability_lite/README.md](../../../../../../foundation/ability/ability_lite/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
