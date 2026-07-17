# intelligent_voice_framework 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

智能语音组件包括智能语音服务框架和智能语音驱动，主要实现了语音注册及语音唤醒相关功能。 智能语音服务框架支持如下功能： 系统事件监测：开机解锁、亮灭屏等系统事件监测 并发策略：智能语音业务并发管理 智能语音业务：语音注册、语音唤醒等智能语音业务处理 声音触发器：DSP模型加载、DSP算法启停、DSP事件处理

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `ai` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 675KB / 7680KB |
| 源码仓 | `foundation/ai/intelligent_voice_framework` |

## 核心能力

- **AI Intelligent Voice Core**：提供“intelligent voice core”能力，系统能力标识为 `SystemCapability.AI.IntelligentVoice.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `intelligent_voice_framework_trigger_enable`：intelligent voice framework trigger 启用。
- `intelligent_voice_framework_engine_enable`：intelligent voice framework engine 启用。
- `intelligent_voice_framework_only_first_stage`：intelligent voice framework only first stage。
- `intelligent_voice_framework_only_second_stage`：intelligent voice framework only second stage。
- `intelligent_voice_framework_window_manager_enable`：intelligent voice framework window manager 启用。
- `intelligent_voice_framework_power_manager_enable`：intelligent voice framework 电源协同 manager 启用。
- `intelligent_voice_framework_first_stage_oneshot_enable`：intelligent voice framework first stage oneshot 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/ai/intelligent_voice_framework/services](../../../../../../foundation/ai/intelligent_voice_framework/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 14 | `etc`, `intell_voice_engine`, `intell_voice_service`, `intell_voice_trigger` |
| [foundation/ai/intelligent_voice_framework/frameworks](../../../../../../foundation/ai/intelligent_voice_framework/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 12 | `js`, `native`, `taihe` |
| [foundation/ai/intelligent_voice_framework/sa_profile](../../../../../../foundation/ai/intelligent_voice_framework/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/ai/intelligent_voice_framework/utils](../../../../../../foundation/ai/intelligent_voice_framework/utils) | 跨模块复用的基础工具和通用数据结构。 | 1 | - |
| [foundation/ai/intelligent_voice_framework/interfaces](../../../../../../foundation/ai/intelligent_voice_framework/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_api`, `kits` |
| [foundation/ai/intelligent_voice_framework/llt](../../../../../../foundation/ai/intelligent_voice_framework/llt) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `hdt` |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/ai/intelligent_voice_framework/frameworks/js:intelligentvoice_js` | `//foundation/ai/intelligent_voice_framework/frameworks/js/napi/include` | `intell_voice_manager_napi.h`, `intell_voice_engine_napi.h`, `enroll_intell_voice_engine_napi.h` |
| `//foundation/ai/intelligent_voice_framework/frameworks/native:intellvoice_native` | `//foundation/ai/intelligent_voice_framework/interfaces/inner_api/native` | `intell_voice_manager.h`, `i_headset_wakeup.h`, `wakeup_intell_voice_engine.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `ai` | [intell_voice_service](../../processes/intell_voice_service/foundation-runtime.md) | 启动配置, SA 实现 | `312` | `libintell_voice_server.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/ai/intelligent_voice_framework/sa_profile:intell_voice_service_sa_profile` | [foundation/ai/intelligent_voice_framework/sa_profile/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/ai/intelligent_voice_framework/services/intell_voice_service:intell_voice_server` | [foundation/ai/intelligent_voice_framework/services/intell_voice_service/BUILD.gn](../../../../../../foundation/ai/intelligent_voice_framework/services/intell_voice_service/BUILD.gn) |

生产库形态：`ohos_shared_library` 7 个，`ohos_source_set` 3 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 27 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `c_utils`, `common_event_service`, `data_share`, `drivers_interface_intelligent_voice`, `hdf_core`, `hilog`, `image_framework`, `ipc`, `kv_store`, `audio_framework`, `napi`, `relational_store`, `safwk`, `samgr`, `state_registry`, `core_service`, `call_manager`, `huks`, `jsoncpp`, `power_manager`, `window_manager`, `ffrt`, `runtime_core`, `eventhandler`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 15 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`ohos_unittest` 7 个，`ohos_shared_library` 3 个，`ohos_fuzztest` 3 个，`group` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/ai/intelligent_voice_framework/bundle.json](../../../../../../foundation/ai/intelligent_voice_framework/bundle.json)
- 原始源码 README：[foundation/ai/intelligent_voice_framework/README_zh.md](../../../../../../foundation/ai/intelligent_voice_framework/README_zh.md)、[foundation/ai/intelligent_voice_framework/README.md](../../../../../../foundation/ai/intelligent_voice_framework/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
