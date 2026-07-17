# graphic_utils_lite 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

HALS组件中实现了对驱动子系统和平台相关功能的适配封装，包括了FrameBuffer/GFX/SIMD等。 UTILS组件中定义了图形子系统中的公共数据结构，并提供了一层轻薄的操作系统适配层（如锁、线程、文件系统）。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `graphic` |
| 实现形态 | 系统内部接口 + 框架或基础库 |
| 适配系统 | mini,small |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 450KB / ~50KB |
| 源码仓 | `foundation/graphic/graphic_utils_lite` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `graphic_utils_lite_enable_ohos_product_config`：graphic utils lite 启用 ohos product config。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/graphic/graphic_utils_lite/frameworks](../../../../../../foundation/graphic/graphic_utils_lite/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 0 | `diagram`, `hals` |
| [foundation/graphic/graphic_utils_lite/interfaces](../../../../../../foundation/graphic/graphic_utils_lite/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `innerkits`, `kits` |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/graphic/graphic_utils_lite:utils_lite` | `//foundation/graphic/graphic_utils_lite/interfaces/kits`<br>`//foundation/graphic/graphic_utils_lite/interfaces/innerkits` | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`lite_library` 1 个，`shared_library` 1 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 3 个组件依赖和 0 个三方依赖。

- 系统组件协作：`hilog_lite`, `drivers_peripheral_display`, `bounds_checking_function`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 3 个测试目标，bundle 声明 0 个测试入口。

主要测试形态：`group` 2 个，`unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/graphic/graphic_utils_lite/bundle.json](../../../../../../foundation/graphic/graphic_utils_lite/bundle.json)
- 原始源码 README：[foundation/graphic/graphic_utils_lite/README_zh.md](../../../../../../foundation/graphic/graphic_utils_lite/README_zh.md)、[foundation/graphic/graphic_utils_lite/README.md](../../../../../../foundation/graphic/graphic_utils_lite/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
