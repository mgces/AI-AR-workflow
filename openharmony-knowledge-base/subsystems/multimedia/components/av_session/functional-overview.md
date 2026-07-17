# av_session 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Audio and Video Session Management

源码 README 补充说明：

> AVSession部件为系统提供了统一的媒体控制能力，当三方应用在OpenHarmony系统上运行时，用户可以通过系统播控中心对本端和组网内的远端音视频应用的播放行为进行控制，展示相关播放信息。 1、面向用户：提供便捷的全局播控入口，将媒体信息充分展示给用户。同时自动展示分布式媒体设备信息，用户操作远端媒体如同操作本地媒体。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 3000KB / 5120KB |
| 源码仓 | `foundation/multimedia/av_session` |

## 核心能力

- **Multimedia AVSession AVCast**：提供“avsession avcast”能力，系统能力标识为 `SystemCapability.Multimedia.AVSession.AVCast`。
- **Multimedia AVSession Core**：提供“avsession core”能力，系统能力标识为 `SystemCapability.Multimedia.AVSession.Core`。
- **Multimedia AVSession Extended Display Cast**：提供“avsession extended display cast”能力，系统能力标识为 `SystemCapability.Multimedia.AVSession.ExtendedDisplayCast`。
- **Multimedia AVSession Manager**：提供“avsession manager”能力，系统能力标识为 `SystemCapability.Multimedia.AVSession.Manager`。
- **Multimedia AVSession AVInput Cast = false**：提供“avsession avinput cast = false”能力，系统能力标识为 `SystemCapability.Multimedia.AVSession.AVInputCast = false`。
- **Multimedia AVSession AVMusic Template = false**：提供“avsession avmusic template = false”能力，系统能力标识为 `SystemCapability.Multimedia.AVSession.AVMusicTemplate = false`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `av_session_enable_start_stop_on_demand`：av session 启用 按需启停。
- `av_session_enable_input_redistribute`：av session 启用 input redistribute。
- `av_session_enable_dsoftbus`：av session 启用 dsoftbus。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/av_session/services](../../../../../../foundation/multimedia/av_session/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 103 | `etc`, `session` |
| [foundation/multimedia/av_session/frameworks](../../../../../../foundation/multimedia/av_session/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 66 | `cj`, `common`, `js`, `native`, `taihe` |
| [foundation/multimedia/av_session/interfaces](../../../../../../foundation/multimedia/av_session/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 10 | `inner_api`, `kits` |
| [foundation/multimedia/av_session/avpicker_static](../../../../../../foundation/multimedia/av_session/avpicker_static) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 9 | `avpicker`, `avpicker_mock` |
| [foundation/multimedia/av_session/avvolumepanel_static](../../../../../../foundation/multimedia/av_session/avvolumepanel_static) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 9 | `avvolumepanel`, `avvolumepanel_watch` |
| [foundation/multimedia/av_session/avpicker](../../../../../../foundation/multimedia/av_session/avpicker) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 8 | - |
| [foundation/multimedia/av_session/avinputcastpicker_static](../../../../../../foundation/multimedia/av_session/avinputcastpicker_static) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 5 | `avinputcastpicker` |
| [foundation/multimedia/av_session/avvolumepanel](../../../../../../foundation/multimedia/av_session/avvolumepanel) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | - |
| [foundation/multimedia/av_session/avinputcastpicker](../../../../../../foundation/multimedia/av_session/avinputcastpicker) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 3 | - |
| [foundation/multimedia/av_session/utils](../../../../../../foundation/multimedia/av_session/utils) | 跨模块复用的基础工具和通用数据结构。 | 2 | `include`, `src` |
| [foundation/multimedia/av_session/sa_profile](../../../../../../foundation/multimedia/av_session/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/multimedia/av_session/tools](../../../../../../foundation/multimedia/av_session/tools) | 开发、诊断、命令行或构建辅助工具。 | 1 | `ohos-avsession-manager` |

## 对外与内部接口

该部件声明 5 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/av_session/frameworks/native/session:avsession_client` | `//foundation/multimedia/av_session/interfaces/inner_api/native/session/include` | `avsession_manager.h`, `av_session.h`, `avsession_controller.h`, `avsession_info.h`, `avsession_errors.h` |
| `//foundation/multimedia/av_session/frameworks/cj:cj_multimedia_avsession_ffi` | `//foundation/multimedia/av_session/frameworks/cj/include` | - |
| `//foundation/multimedia/av_session/frameworks/native/session:avsession_cast_client` | `//foundation/multimedia/av_session/interfaces/inner_api/native/session/include` | - |
| `//foundation/multimedia/av_session/frameworks/common:avsession_common` | `//foundation/multimedia/av_session/interfaces/inner_api/native/session/include` | - |
| `//foundation/multimedia/av_session/utils:avsession_utils` | `//foundation/multimedia/av_session/interfaces/inner_api/native/session/include` | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `multimedia` | [av_session](../../processes/av_session/foundation-runtime.md) | 启动配置, SA 实现 | `3010` | `libavsession_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/multimedia/av_session/sa_profile:avsession_sa_profile` | [foundation/multimedia/av_session/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/av_session/sa_profile/BUILD.gn) |
| `av_session_ohos_library` | `//foundation/multimedia/av_session/services/session:avsession_service` | [foundation/multimedia/av_session/services/session/BUILD.gn](../../../../../../foundation/multimedia/av_session/services/session/BUILD.gn) |
| `ohos_cli_executable` | `//foundation/multimedia/av_session/tools/ohos-avsession-manager:ohos-avsession-manager` | [foundation/multimedia/av_session/tools/ohos-avsession-manager/BUILD.gn](../../../../../../foundation/multimedia/av_session/tools/ohos-avsession-manager/BUILD.gn) |

生产库形态：`ohos_shared_library` 15 个，`av_session_ohos_library` 4 个，`ohos_static_library` 1 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 39 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `cJSON`, `data_share`, `json`, `init`, `access_token`, `ace_engine`, `audio_framework`, `bundle_framework`, `c_utils`, `cast_engine`, `curl`, `data_object`, `device_manager`, `dsoftbus`, `eventhandler`, `graphic_surface`, `hilog`, `hisysevent`, `hitrace`, `input`, `ipc`, `image_framework`, `napi`, `safwk`, `samgr`, `distributed_notification_service`, `relational_store`, `runtime_core`, `window_manager`, `background_task_mgr`, `bluetooth`, `os_account`, `hicollie`, `openssl`, `bounds_checking_function`, `ets_frontend`, `taihe_ffi_gen`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 145 个测试目标，bundle 声明 13 个测试入口。

主要测试形态：`ohos_unittest` 89 个，`ohos_fuzztest` 38 个，`group` 13 个，`ohos_benchmarktest` 3 个，`ohos_js_unittest` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/av_session/bundle.json](../../../../../../foundation/multimedia/av_session/bundle.json)
- 原始源码 README：[foundation/multimedia/av_session/README_zh.md](../../../../../../foundation/multimedia/av_session/README_zh.md)、[foundation/multimedia/av_session/README.md](../../../../../../foundation/multimedia/av_session/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
