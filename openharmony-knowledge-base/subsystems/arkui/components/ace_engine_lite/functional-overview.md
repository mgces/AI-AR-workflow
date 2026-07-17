# ace_engine_lite 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

轻量系统**JS-UI框架子系统**，是OpenHarmony为开发者提供的一套开发OpenHarmony应用的JS-UI框架，部署在轻量系统上，为应用提供UI开发能力。其组成如下所示： JS-UI框架子系统包括JS数据绑定框架（JS Data binding）、JS运行时（JS runtime）和JS框架（JS framework）。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `arkui` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | mini,small |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 521KB / ~82KB |
| 源码仓 | `foundation/arkui/ace_engine_lite` |

## 核心能力

- **Ark UI Ark UI Lite**：提供“ark ui lite”能力，系统能力标识为 `SystemCapability.ArkUI.ArkUI.Lite`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `ace_engine_lite_feature_product_config`：ace engine lite 功能 product config。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/arkui/ace_engine_lite/frameworks](../../../../../../foundation/arkui/ace_engine_lite/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 73 | `common`, `examples`, `include`, `module_manager`, `native_engine`, `packages`, `src`, `targets` |
| [foundation/arkui/ace_engine_lite/interfaces](../../../../../../foundation/arkui/ace_engine_lite/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_api` |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/arkui/ace_engine_lite/frameworks/targets/simulator:ace_lite` | `//foundation/arkui/ace_engine_lite/frameworks/targets/simulator` | `acelite_config.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`lite_library` 4 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 17 个组件依赖和 2 个三方依赖。

- 系统组件协作：`bundle_framework_lite`, `huks`, `ui_lite`, `surface_lite`, `i18n_lite`, `resource_management_lite`, `kv_store`, `utils_lite`, `ability_lite`, `init`, `camera_lite`, `media_lite`, `battery_lite`, `netstack`, `device_attest_lite`, `bounds_checking_function`, `jerryscript`。
- 三方实现依赖：`cJSON`, `freetype`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 62 个测试目标，bundle 声明 0 个测试入口。

主要测试形态：`unittest` 49 个，`group` 13 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/arkui/ace_engine_lite/bundle.json](../../../../../../foundation/arkui/ace_engine_lite/bundle.json)
- 原始源码 README：[foundation/arkui/ace_engine_lite/README_zh.md](../../../../../../foundation/arkui/ace_engine_lite/README_zh.md)、[foundation/arkui/ace_engine_lite/README.md](../../../../../../foundation/arkui/ace_engine_lite/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
