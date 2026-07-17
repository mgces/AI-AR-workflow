# bundle_framework_lite 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Bundle installation management frameworks

源码 README 补充说明：

> **包管理子系统**是OpenHarmony为开发者提供的应用安装包的管理框架，该模块实现的功能包括了应用的安装，卸载，升级，应用信息的查询和应用状态监听。当前仅支持在OpenHarmony的轻量级设备上运行，支持的设备包括穿戴手表，Hi3516DV300等。包管理子系统由如下模块组成： **BundleKit**：是包管理服务对外提供的接口，有安装/卸载接口、包信息查询接口、包状态变化监听接口。 **包扫描子模块**：用来解析本地预制或者安装的安装包，提取里面的各种信息，供管理子模块进行管理，持久化。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `bundlemanager` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | mini,small |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 300KB / >2MB |
| 源码仓 | `foundation/bundlemanager/bundle_framework_lite` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `bundle_framework_lite_enable_ohos_bundle_manager_service_permission`：bundle framework lite 启用 ohos bundle manager service permission。
- `bundle_framework_lite_enable_ohos_bundle_manager_service`：bundle framework lite 启用 ohos bundle manager service。
- `bundle_framework_lite_enable_ohos_bundle_manager_service_parse_metadata`：bundle framework lite 启用 ohos bundle manager service parse metadata。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/bundlemanager/bundle_framework_lite/services](../../../../../../foundation/bundlemanager/bundle_framework_lite/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 10 | `bundlemgr_lite` |
| [foundation/bundlemanager/bundle_framework_lite/frameworks](../../../../../../foundation/bundlemanager/bundle_framework_lite/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 4 | `bundle_lite` |
| [foundation/bundlemanager/bundle_framework_lite/interfaces](../../../../../../foundation/bundlemanager/bundle_framework_lite/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 2 | `inner_api`, `kits` |
| [foundation/bundlemanager/bundle_framework_lite/utils](../../../../../../foundation/bundlemanager/bundle_framework_lite/utils) | 跨模块复用的基础工具和通用数据结构。 | 0 | `bundle_lite` |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite:appexecfwk_services_lite` | `foundation/bundlemanager/bundle_framework_lite/interfaces/inner_api/bundlemgr_lite` | `bundle_daemon_interface.h`, `bundle_inner_interface.h`, `bundle_service_interface.h` |
| `//foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite:appexecfwk_kits_lite` | `foundation/bundlemanager/bundle_framework_lite/interfaces/kits/bundle_lite` | `ability_info.h`, `appexecfwk_errors.h`, `bundle_info.h`, `element_name.h`, `module_info.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `executable` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/bundle_daemon:bundle_daemon` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/bundle_daemon/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/bundle_daemon/BUILD.gn) |
| `executable` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/tools:bm` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/tools/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/tools/BUILD.gn) |

生产库形态：`static_library` 2 个，`shared_library` 2 个，`lite_library` 1 个。

## 依赖与协作边界

该部件声明 7 个组件依赖和 4 个三方依赖。

- 系统组件协作：`ability_lite`, `utils_lite`, `hilog_lite`, `permission_lite`, `samgr_lite`, `resource_management_lite`, `appverify`。
- 三方实现依赖：`zlib`, `bounds_checking_function`, `cJSON`, `jerryscript`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/bundlemanager/bundle_framework_lite/bundle.json](../../../../../../foundation/bundlemanager/bundle_framework_lite/bundle.json)
- 原始源码 README：[foundation/bundlemanager/bundle_framework_lite/README_zh.md](../../../../../../foundation/bundlemanager/bundle_framework_lite/README_zh.md)、[foundation/bundlemanager/bundle_framework_lite/README.md](../../../../../../foundation/bundlemanager/bundle_framework_lite/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
