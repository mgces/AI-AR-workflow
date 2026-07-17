# ai_engine 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

AI业务子系统是OpenHarmony提供原生的分布式AI能力的子系统。本次开源范围是提供了统一的AI引擎框架，实现算法能力快速插件化集成。框架中主要包含插件管理、模块管理和通信管理等模块，对AI算法能力进行生命周期管理和按需部署。后续，会逐步定义统一的AI能力接口，便于AI能力的分布式调用。同时，提供适配不同推理框架层级的统一推理接口。 **AI服务启动的约束与限制**：SAMGR（System Ability Manager）启动且运行正常

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `ai` |
| 实现形态 | 框架或基础库 + 聚合/代码生成 |
| 适配系统 | small |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 130KB / ~337KB |
| 源码仓 | `foundation/ai/ai_engine` |

## 核心能力

- **Ai Ai Engine**：提供“ai ai engine”能力，系统能力标识为 `SystemCapability.Ai.AiEngine`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/ai/ai_engine/services](../../../../../../foundation/ai/ai_engine/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 42 | `client`, `common`, `server` |
| [foundation/ai/ai_engine/interfaces](../../../../../../foundation/ai/ai_engine/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `kits` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`source_set` 18 个，`static_library` 3 个，`lite_library` 3 个，`shared_library` 1 个。

## 依赖与协作边界

该部件声明 4 个组件依赖和 1 个三方依赖。

- 系统组件协作：`hilog`, `utils_base`, `ipc`, `samgr_lite`。
- 三方实现依赖：`bounds_checking_function`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 15 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`lite_component` 5 个，`unittest` 3 个，`group` 3 个，`source_set` 2 个，`shared_library` 1 个，`static_library` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/ai/ai_engine/bundle.json](../../../../../../foundation/ai/ai_engine/bundle.json)
- 原始源码 README：[foundation/ai/ai_engine/README_zh.md](../../../../../../foundation/ai/ai_engine/README_zh.md)、[foundation/ai/ai_engine/README.md](../../../../../../foundation/ai/ai_engine/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
