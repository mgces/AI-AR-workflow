# object_editor 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The service for editing objects in the application files

源码 README 补充说明：

> `object_editor` 是 OpenHarmony 系统为开发者提供的一个部件，旨在实现应用间文档互相嵌入与协同编辑能力，以下简称`OE`。 该部件由**框架层**与**系统服务层**两部分组成： **框架层**：为OE客户端应用和OE服务端应用提供所需的开发接口。OE客户端应用通过该接口在自身文档中嵌入OE服务端应用的文档；OE服务端应用则利用OE Extension开发框架提供的能力，向OE客户端应用提供特定格式文档的嵌入与编辑支持。 **系统服务层**：负责响应OE服务端应用的注册请求，并在OE客户端应用发起请求时启动相应的OE服务端应用，同时管理其生命周期，保障嵌入与编辑流程的稳定运行。 `object_editor` 是一个可选系统能力，应用需要通过 SystemCapability.ContentEmbed.ObjectEditor **判断OpenHarmony设备是否支持本能力**。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `officeservice` |
| 实现形态 | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/officeservice/object_editor` |

## 核心能力

- **Content Embed Object Editor**：提供“content embed object editor”能力，系统能力标识为 `SystemCapability.ContentEmbed.ObjectEditor`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/officeservice/object_editor/frameworks](../../../../../../foundation/officeservice/object_editor/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 5 | `kits`, `ndk` |
| [foundation/officeservice/object_editor/client](../../../../../../foundation/officeservice/object_editor/client) | 客户端代理、调用封装和连接管理。 | 3 | `include`, `src` |
| [foundation/officeservice/object_editor/etc](../../../../../../foundation/officeservice/object_editor/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 3 | - |
| [foundation/officeservice/object_editor/utils](../../../../../../foundation/officeservice/object_editor/utils) | 跨模块复用的基础工具和通用数据结构。 | 3 | `include`, `src` |
| [foundation/officeservice/object_editor/resources](../../../../../../foundation/officeservice/object_editor/resources) | 运行资源、界面资源或组件随包资源。 | 2 | `config` |
| [foundation/officeservice/object_editor/system_ability](../../../../../../foundation/officeservice/object_editor/system_ability) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | `include`, `src` |
| [foundation/officeservice/object_editor/document](../../../../../../foundation/officeservice/object_editor/document) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 1 | `include`, `src` |
| [foundation/officeservice/object_editor/sa_profile](../../../../../../foundation/officeservice/object_editor/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/officeservice/object_editor/common](../../../../../../foundation/officeservice/object_editor/common) | 组件内部共享的公共定义、工具和基础实现。 | 0 | `include`, `src` |
| [foundation/officeservice/object_editor/database](../../../../../../foundation/officeservice/object_editor/database) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `include`, `src` |
| [foundation/officeservice/object_editor/extension_ability](../../../../../../foundation/officeservice/object_editor/extension_ability) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `include`, `src` |
| [foundation/officeservice/object_editor/interfaces](../../../../../../foundation/officeservice/object_editor/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `innerkits`, `kits` |
| [foundation/officeservice/object_editor/package](../../../../../../foundation/officeservice/object_editor/package) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `include`, `src` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `officeservice` | [object_editor_service](../../processes/object_editor_service/foundation-runtime.md) | 启动配置, SA 实现 | `66528` | `libcontent_embed_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/officeservice/object_editor/sa_profile:object_editor_service_sa_profile` | [foundation/officeservice/object_editor/sa_profile/BUILD.gn](../../../../../../foundation/officeservice/object_editor/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 7 个。

## 依赖与协作边界

该部件声明 25 个组件依赖和 0 个三方依赖。

- 系统组件协作：`hilog`, `c_utils`, `samgr`, `image_framework`, `ipc`, `safwk`, `ability_base`, `ability_runtime`, `access_token`, `eventhandler`, `napi`, `relational_store`, `resource_management`, `dlp_permission_service`, `os_account`, `bundle_framework`, `cJSON`, `udmf`, `app_file_service`, `common_event_service`, `icu`, `hisysevent`, `hitrace`, `init`, `window_manager`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 74 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_unittest` 40 个，`ohos_fuzztest` 18 个，`group` 16 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/officeservice/object_editor/bundle.json](../../../../../../foundation/officeservice/object_editor/bundle.json)
- 原始源码 README：[foundation/officeservice/object_editor/README.md](../../../../../../foundation/officeservice/object_editor/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
