# sharing_framework 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

foundation Castengine sharing framework

源码 README 补充说明：

> castengine_wifi_display部件别名Sharing，媒体分享之意。拥有流媒体协议接入、媒体预览、媒体转分发能力，受投播管理服务管理和调用，是音视频投播子系统重要的流媒体能力部件。提供一套简单的Native C++的接口，主要业务是Miracast投屏，提供以下常用功能： 主投端（WFD Source）：主投端发送器，用于投屏Source端业务，可发送多路屏幕镜像流到不同设备。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `castplus` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/CastEngine/castengine_wifi_display` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `sharing_framework_feature_coverage = false`：sharing framework 功能 覆盖率 = false。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/CastEngine/castengine_wifi_display/services](../../../../../../foundation/CastEngine/castengine_wifi_display/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 41 | `agent`, `codec`, `common`, `configuration`, `context`, `etc`, `event`, `extend` |
| [foundation/CastEngine/castengine_wifi_display/interfaces](../../../../../../foundation/CastEngine/castengine_wifi_display/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 4 | `innerkits`, `kits` |
| [foundation/CastEngine/castengine_wifi_display/sa_profile](../../../../../../foundation/CastEngine/castengine_wifi_display/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |
| [foundation/CastEngine/castengine_wifi_display/frameworks](../../../../../../foundation/CastEngine/castengine_wifi_display/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 0 | `innerkitsimpl`, `kitsimpl` |
| [foundation/CastEngine/castengine_wifi_display/openspec](../../../../../../foundation/CastEngine/castengine_wifi_display/openspec) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | `changes`, `specs` |
| [foundation/CastEngine/castengine_wifi_display/patches](../../../../../../foundation/CastEngine/castengine_wifi_display/patches) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/CastEngine/castengine_wifi_display/interfaces/innerkits/native/wfd:sharingwfd_client` | `//foundation/CastEngine/castengine_wifi_display/interfaces/innerkits/native/wfd/include` | `wfd.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `castplus` | [sharing_service](../../processes/sharing_service/foundation-runtime.md) | 启动配置, SA 实现 | `5527`, `5528` | `libsharing_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/CastEngine/castengine_wifi_display/sa_profile:sharing_sa_profile` | [foundation/CastEngine/castengine_wifi_display/sa_profile/BUILD.gn](../../../../../../foundation/CastEngine/castengine_wifi_display/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/CastEngine/castengine_wifi_display/services:sharing_service` | [foundation/CastEngine/castengine_wifi_display/services/BUILD.gn](../../../../../../foundation/CastEngine/castengine_wifi_display/services/BUILD.gn) |

生产库形态：`ohos_source_set` 22 个，`ohos_shared_library` 9 个，`ohos_static_library` 5 个。

## 依赖与协作边界

该部件声明 35 个组件依赖和 4 个三方依赖。

- 系统组件协作：`ipc`, `safwk`, `media_foundation`, `av_codec`, `audio_framework`, `player_framework`, `camera_framework`, `wifi`, `hisysevent`, `device_manager`, `c_utils`, `graphic_2d`, `graphic_surface`, `drivers_peripheral_display`, `hilog`, `ability_base`, `samgr`, `ability_runtime`, `bundle_framework`, `napi`, `kv_store`, `access_token`, `drivers_interface_camera`, `eventhandler`, `ffmpeg`, `window_manager`, `bounds_checking_function`, `preferences`, `data_share`, `os_account`, `cJSON`, `json`, `jsoncpp`, `openssl`, `selinux_adapter`。
- 三方实现依赖：`cJSON`, `jsoncpp`, `openssl`, `ffmpeg`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 93 个测试目标，bundle 声明 3 个测试入口。

主要测试形态：`ohos_unittest` 29 个，`group` 28 个，`ohos_executable` 20 个，`ohos_fuzztest` 16 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/CastEngine/castengine_wifi_display/bundle.json](../../../../../../foundation/CastEngine/castengine_wifi_display/bundle.json)
- 原始源码 README：[foundation/CastEngine/castengine_wifi_display/README_zh.md](../../../../../../foundation/CastEngine/castengine_wifi_display/README_zh.md)、[foundation/CastEngine/castengine_wifi_display/README.en.md](../../../../../../foundation/CastEngine/castengine_wifi_display/README.en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
