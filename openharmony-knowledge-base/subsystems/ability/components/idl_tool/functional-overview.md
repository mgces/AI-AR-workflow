# idl_tool 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

在OpenHarmony中，当客户端和服务端进行IPC（Inter-Process Communication）跨线程通信时，需要定义双方都认可的接口，以保障双方可以成功通信，OpenHarmony IDL（Interface Definition Language）则是一种定义此类接口的工具。OpenHarmony IDL先把需要传递的对象分解成操作系统能够理解的基本类型，并根据开发者的需要封装跨边界的对象。 声明系统服务对外提供的服务接口，根据接口声明在编译时生成跨进程调用（IPC）或跨设备调用（RPC）的代理（Proxy）和桩（Stub）的C/C++代码或JS/TS代码。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `ability` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/ability/idl_tool` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/ability/idl_tool/idl_tool_2](../../../../../../foundation/ability/idl_tool/idl_tool_2) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 59 | `ast`, `codegen`, `hash`, `lexer`, `metadata`, `parser`, `preprocessor`, `util` |
| [foundation/ability/idl_tool/ast](../../../../../../foundation/ability/idl_tool/ast) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/ability/idl_tool/codegen](../../../../../../foundation/ability/idl_tool/codegen) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/ability/idl_tool/metadata](../../../../../../foundation/ability/idl_tool/metadata) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/ability/idl_tool/parser](../../../../../../foundation/ability/idl_tool/parser) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/ability/idl_tool/scripts](../../../../../../foundation/ability/idl_tool/scripts) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/ability/idl_tool/util](../../../../../../foundation/ability/idl_tool/util) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/ability/idl_tool:idl` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_executable` | `//foundation/ability/idl_tool:idl` | [foundation/ability/idl_tool/BUILD.gn](../../../../../../foundation/ability/idl_tool/BUILD.gn) |

## 依赖与协作边界

该部件声明 6 个组件依赖和 0 个三方依赖。

- 系统组件协作：`hilog`, `ipc`, `samgr`, `safwk`, `c_utils`, `bounds_checking_function`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 123 个测试目标，bundle 声明 6 个测试入口。

主要测试形态：`ohos_unittest` 69 个，`group` 38 个，`ohos_source_set` 6 个，`idl_gen_interface` 4 个，`ohos_shared_library` 3 个，`ohos_executable` 2 个，`ohos_moduletest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/ability/idl_tool/bundle.json](../../../../../../foundation/ability/idl_tool/bundle.json)
- 原始源码 README：[foundation/ability/idl_tool/README.md](../../../../../../foundation/ability/idl_tool/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
