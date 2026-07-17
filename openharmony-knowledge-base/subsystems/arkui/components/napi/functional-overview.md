# napi 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Node-API (formerly N-API) is an API for build native Addons

源码 README 补充说明：

> NAPI（Native API）组件是一套对外接口基于Node.js N-API规范开发的原生模块扩展开发框架。 NAPI组件源代码在/foundation/arkui/napi下，目录结构如下图所示：

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `arkui` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 5120KB / 10240KB |
| 源码仓 | `foundation/arkui/napi` |

## 核心能力

- **Ark UI Ark UI Napi**：提供“ark ui napi”能力，系统能力标识为 `SystemCapability.ArkUI.ArkUI.Napi`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `napi_enable_container_scope`：napi 启用 container scope。
- `napi_feature_enable_pgo`：napi 功能 启用 pgo。
- `napi_feature_pgo_path`：napi 功能 pgo path。
- `napi_enable_data_protector`：napi 启用 data protector。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/arkui/napi/sample](../../../../../../foundation/arkui/napi/sample) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 86 | `native_module_advanced_examples`, `native_module_array`, `native_module_array_ops`, `native_module_array_suite`, `native_module_async_suite`, `native_module_bigint`, `native_module_boolean_suite`, `native_module_buffer` |
| [foundation/arkui/napi/interfaces](../../../../../../foundation/arkui/napi/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 5 | `inner_api`, `kits` |
| [foundation/arkui/napi/module_manager](../../../../../../foundation/arkui/napi/module_manager) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | - |
| [foundation/arkui/napi/callback_scope_manager](../../../../../../foundation/arkui/napi/callback_scope_manager) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/arkui/napi/native_engine](../../../../../../foundation/arkui/napi/native_engine) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `impl` |
| [foundation/arkui/napi/reference_manager](../../../../../../foundation/arkui/napi/reference_manager) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/arkui/napi/scope_manager](../../../../../../foundation/arkui/napi/scope_manager) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/arkui/napi/utils](../../../../../../foundation/arkui/napi/utils) | 跨模块复用的基础工具和通用数据结构。 | 0 | `platform` |

## 对外与内部接口

该部件声明 8 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/arkui/napi:ace_napi` | `//foundation/arkui/napi/interfaces/kits` | `napi/native_api.h` |
| `//foundation/arkui/napi:ace_napi` | `//foundation/arkui/napi/interfaces/inner_api` | `napi/native_common.h`, `napi/native_node_api.h`, `napi/native_node_hybrid_api.h` |
| `//foundation/arkui/napi:ace_napi` | `//foundation/arkui/napi/native_engine/` | `native_engine.h`, `worker_manager.h` |
| `//foundation/arkui/napi:cj_bind_ffi` | `//foundation/arkui/napi/interfaces/inner_api/cjffi/cj_ffi` | `cj_common_ffi.h`, `cj_data_ffi.h` |
| `//foundation/arkui/napi:cj_bind_native` | `//foundation/arkui/napi/interfaces/inner_api/cjffi/native` | `cj_fn_invoker.h`, `cj_lambda.h` |
| `//foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop:ark_interop` | `//foundation/arkui/napi/interfaces/inner_api/cjffi/ark_interop` | `ark_interop_napi.h` |
| `//foundation/arkui/napi:napi_packages` | `//third_party/node/src` | `jsvm.h` |
| `//foundation/arkui/napi/interfaces/inner_api/cjffi/cj_backtrace:cj_backtrace` | `//foundation/arkui/napi/interfaces/inner_api/cjffi/cj_backtrace` | `cj_backtrace.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 81 个，`ohos_source_set` 4 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 17 个组件依赖和 1 个三方依赖。

- 系统组件协作：`c_utils`, `ets_runtime`, `eventhandler`, `faultloggerd`, `hilog`, `hitrace`, `hiview`, `icu`, `libuv`, `node`, `ffrt`, `bounds_checking_function`, `init`, `runtime_core`, `ace_engine`, `resource_schedule_service`, `samgr`。
- 三方实现依赖：`jerryscript`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 34 个测试目标，bundle 声明 5 个测试入口。

主要测试形态：`group` 12 个，`ohos_unittest` 7 个，`ohos_fuzztest` 6 个，`test_ark_unittest` 6 个，`ohos_shared_library` 2 个，`ohos_static_library` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/arkui/napi/bundle.json](../../../../../../foundation/arkui/napi/bundle.json)
- 原始源码 README：[foundation/arkui/napi/README_zh.md](../../../../../../foundation/arkui/napi/README_zh.md)、[foundation/arkui/napi/README.md](../../../../../../foundation/arkui/napi/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
