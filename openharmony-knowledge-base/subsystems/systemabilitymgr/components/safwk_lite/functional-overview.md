# safwk_lite 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Provider：服务的提供者，为系统提供能力（对外接口）。 Consumer：服务的消费者，调用服务提供的功能（对外接口）。 Samgr：作为中介者，管理Provider提供的能力，同时帮助Consumer发现Provider的能力。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `systemabilitymgr` |
| 实现形态 | 服务/运行实体 |
| 适配系统 | small |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 100KB / 2048KB |
| 源码仓 | `foundation/systemabilitymgr/safwk_lite` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `safwk_lite_feature_enable_abilityms`：safwk lite 功能 启用 abilityms。
- `safwk_lite_feature_enable_bundlems`：safwk lite 功能 启用 bundlems。
- `safwk_lite_feature_enable_dtbschedmgr`：safwk lite 功能 启用 dtbschedmgr。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/systemabilitymgr/safwk_lite/src](../../../../../../foundation/systemabilitymgr/safwk_lite/src) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `executable` | `//foundation/systemabilitymgr/safwk_lite:foundation` | [foundation/systemabilitymgr/safwk_lite/BUILD.gn](../../../../../../foundation/systemabilitymgr/safwk_lite/BUILD.gn) |

## 依赖与协作边界

该部件声明 6 个组件依赖和 2 个三方依赖。

- 系统组件协作：`ability_lite`, `bundle_framework_lite`, `dmsfwk_lite`, `hilog_lite`, `permission_lite`, `samgr_lite`。
- 三方实现依赖：`bounds_checking_function`, `cJSON`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/systemabilitymgr/safwk_lite/bundle.json](../../../../../../foundation/systemabilitymgr/safwk_lite/bundle.json)
- 原始源码 README：[foundation/systemabilitymgr/safwk_lite/README_zh.md](../../../../../../foundation/systemabilitymgr/safwk_lite/README_zh.md)、[foundation/systemabilitymgr/safwk_lite/README.md](../../../../../../foundation/systemabilitymgr/safwk_lite/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
