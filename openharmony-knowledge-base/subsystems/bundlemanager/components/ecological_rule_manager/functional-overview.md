# ecological_rule_manager 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

生态规则管控服务提供一种系统的扩展能力，设备厂商可以在定制设备上（2B合作项目等），对应用的行为（跳转、添加桌面卡片、免安装元服务）进行管控，从而定制出满足厂商管控要求的用户体验。 `App`：App，在打开元服务时会受到生态规则服务的管控。 `AbilityManagerService`：元能力管理服务，用于协调各Ability运行关系、及对生命周期进行调度的系统服务。 `FormManagerService`：卡片管理服务，管理卡片的生命周期，并维护卡片信息以及卡片事件的调度。 `BundleManagerService`：包管理服务，负责应用安装包的管理，提供安装包的信息查询、安装、更新、卸载和包信息存储等能力。 `EcologicalRuleManagerService`：生态规则管控服务，对元服务的拉起，加桌等行为进行管控。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `bundlemanager` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 300KB / 1024KB |
| 源码仓 | `foundation/bundlemanager/ecological_rule_manager` |

## 核心能力

- **Bundle Manager Ecological Rule Manager**：提供“bundle manager ecological rule manager”能力，系统能力标识为 `SystemCapability.BundleManager.EcologicalRuleManager`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/bundlemanager/ecological_rule_manager/interfaces](../../../../../../foundation/bundlemanager/ecological_rule_manager/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 2 | `innerkits` |
| [foundation/bundlemanager/ecological_rule_manager/services](../../../../../../foundation/bundlemanager/ecological_rule_manager/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 2 | `manager` |
| [foundation/bundlemanager/ecological_rule_manager/utils](../../../../../../foundation/bundlemanager/ecological_rule_manager/utils) | 跨模块复用的基础工具和通用数据结构。 | 2 | `include` |
| [foundation/bundlemanager/ecological_rule_manager/profile](../../../../../../foundation/bundlemanager/ecological_rule_manager/profile) | 组件注册、系统能力或产品装配配置。 | 1 | - |
| [foundation/bundlemanager/ecological_rule_manager/patches](../../../../../../foundation/bundlemanager/ecological_rule_manager/patches) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/bundlemanager/ecological_rule_manager/services:ecologicalrulemgr_service` | `//foundation/bundlemanager/ecological_rule_manager/interfaces/innerkits/include` | `ecological_rule_mgr_service_interface.h` |
| `//foundation/bundlemanager/ecological_rule_manager/interfaces/innerkits:erms_client` | `//foundation/bundlemanager/ecological_rule_manager/interfaces/innerkits/include` | `ecological_rule_mgr_service_interface.h`, `ecological_rule_mgr_service_param.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `systemabilitymgr` | [foundation](../../../systemabilitymgr/processes/foundation/foundation-runtime.md) | SA 实现 | `6105` | `libecologicalrulemgr_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/bundlemanager/ecological_rule_manager/profile:ecologicalrulemgrservice_sa_profiles` | [foundation/bundlemanager/ecological_rule_manager/profile/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/bundlemanager/ecological_rule_manager/services:ecologicalrulemgr_service` | [foundation/bundlemanager/ecological_rule_manager/services/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/services/BUILD.gn) |

生产库形态：`ohos_shared_library` 2 个，`ohos_source_set` 1 个。

## 依赖与协作边界

该部件声明 10 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `bundle_framework`, `c_utils`, `eventhandler`, `hilog`, `ipc`, `safwk`, `samgr`, `access_token`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 2 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_unittest` 1 个，`group` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/bundlemanager/ecological_rule_manager/bundle.json](../../../../../../foundation/bundlemanager/ecological_rule_manager/bundle.json)
- 原始源码 README：[foundation/bundlemanager/ecological_rule_manager/README_zh.md](../../../../../../foundation/bundlemanager/ecological_rule_manager/README_zh.md)、[foundation/bundlemanager/ecological_rule_manager/README.md](../../../../../../foundation/bundlemanager/ecological_rule_manager/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
