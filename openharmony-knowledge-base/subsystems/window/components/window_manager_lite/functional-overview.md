# window_manager_lite 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

图形服务采用C/S架构，内部分为窗口管理（WMS: Window Manager Service）和输入事件管理（IMS: Input Manager Service）两个子服务。APP调用客户端接口完成窗口状态获取、事件处理等操作，服务端与硬件交互实现送显、输入事件分发等。 WMS：窗口管理服务对不同APP的窗口进行统一管理、合成。窗口与UI组件中的RootView呈一一对应的关系； IMS：输入事件管理服务对接底层输入事件驱动框架，对输入事件进行监听和分发。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `window` |
| 实现形态 | 服务/运行实体 + 框架或基础库 |
| 适配系统 | small |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 110KB / ~50KB |
| 源码仓 | `foundation/window/window_manager_lite` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/window/window_manager_lite/frameworks](../../../../../../foundation/window/window_manager_lite/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 0 | `ims`, `wms` |
| [foundation/window/window_manager_lite/interfaces](../../../../../../foundation/window/window_manager_lite/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `innerkits` |
| [foundation/window/window_manager_lite/services](../../../../../../foundation/window/window_manager_lite/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 0 | `ims`, `wms` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `executable` | `//foundation/window/window_manager_lite:wms_server` | [foundation/window/window_manager_lite/BUILD.gn](../../../../../../foundation/window/window_manager_lite/BUILD.gn) |

生产库形态：`shared_library` 1 个。

## 依赖与协作边界

该部件声明 7 个组件依赖和 1 个三方依赖。

- 系统组件协作：`samgr_lite`, `surface_lite`, `drivers_peripheral_input`, `ipc`, `graphic_utils_lite`, `hdf_core`, `permission_lite`。
- 三方实现依赖：`bounds_checking_function`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 4 个测试目标，bundle 声明 0 个测试入口。

主要测试形态：`executable` 3 个，`group` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/window/window_manager_lite/bundle.json](../../../../../../foundation/window/window_manager_lite/bundle.json)
- 原始源码 README：[foundation/window/window_manager_lite/README_zh.md](../../../../../../foundation/window/window_manager_lite/README_zh.md)、[foundation/window/window_manager_lite/README.md](../../../../../../foundation/window/window_manager_lite/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
