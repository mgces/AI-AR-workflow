# cast_engine 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

提供自适应Cast+ Stream，Wi-Fi Display，DLNA多种协议的音视频投播能力，为南北向开发者提供统一的接口及归一化的体验。 提供整体的投播框架，支持其他投屏协议的接入以及投屏协议自适应选择。 北向接入可参考Sample。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `castplus` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 5M / 50M |
| 源码仓 | `foundation/CastEngine/castengine_cast_framework` |

## 核心能力

- ****：提供“”能力，系统能力标识为 ``。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/CastEngine/castengine_cast_framework/service](../../../../../../foundation/CastEngine/castengine_cast_framework/service) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 16 | `include`, `src` |
| [foundation/CastEngine/castengine_cast_framework/interfaces](../../../../../../foundation/CastEngine/castengine_cast_framework/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 4 | `inner_api`, `kits` |
| [foundation/CastEngine/castengine_cast_framework/client](../../../../../../foundation/CastEngine/castengine_cast_framework/client) | 客户端代理、调用封装和连接管理。 | 2 | `include`, `src` |
| [foundation/CastEngine/castengine_cast_framework/common](../../../../../../foundation/CastEngine/castengine_cast_framework/common) | 组件内部共享的公共定义、工具和基础实现。 | 2 | `include`, `src` |
| [foundation/CastEngine/castengine_cast_framework/etc](../../../../../../foundation/CastEngine/castengine_cast_framework/etc) | 安装到系统镜像的运行配置、权限、启动或策略文件。 | 1 | `init` |
| [foundation/CastEngine/castengine_cast_framework/sa_profile](../../../../../../foundation/CastEngine/castengine_cast_framework/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/CastEngine/castengine_cast_framework/interfaces/inner_api:cast_engine_client` | `//foundation/CastEngine/castengine_cast_framework/interfaces/inner_api/include` | `cast_engine_common.h`, `cast_session_manager.h`, `i_cast_session.h`, `i_cast_session_manager_adaptor.h`, `i_cast_session_manager_listener.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `castplus` | [cast_engine_service](../../processes/cast_engine_service/foundation-runtime.md) | 启动配置, SA 实现 | `5526` | `libcast_engine_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/CastEngine/castengine_cast_framework/sa_profile:cast_engine_sa_profile` | [foundation/CastEngine/castengine_cast_framework/sa_profile/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/CastEngine/castengine_cast_framework/service:cast_engine_service` | [foundation/CastEngine/castengine_cast_framework/service/BUILD.gn](../../../../../../foundation/CastEngine/castengine_cast_framework/service/BUILD.gn) |

生产库形态：`ohos_static_library` 9 个，`ohos_shared_library` 3 个。

## 依赖与协作边界

该部件声明 41 个组件依赖和 2 个三方依赖。

- 系统组件协作：`hilog`, `hisysevent`, `hitrace`, `media_foundation`, `access_token`, `audio_framework`, `av_codec`, `ipc`, `init`, `input`, `safwk`, `samgr`, `c_utils`, `eventhandler`, `power_manager`, `dsoftbus`, `device_manager`, `common_event_service`, `bundle_framework`, `ability_base`, `ability_runtime`, `ace_engine`, `napi`, `graphic_2d`, `graphic_surface`, `window_manager`, `player_framework`, `image_framework`, `wifi`, `device_auth`, `device_info_manager`, `thermal_manager`, `screenlock_mgr`, `state_registry`, `core_service`, `call_manager`, `os_account`, `sharing_framework`, `jsoncpp`, `openssl`, `json`。
- 三方实现依赖：`bounds_checking_function`, `musl`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/CastEngine/castengine_cast_framework/bundle.json](../../../../../../foundation/CastEngine/castengine_cast_framework/bundle.json)
- 原始源码 README：[foundation/CastEngine/castengine_cast_framework/README_zh.md](../../../../../../foundation/CastEngine/castengine_cast_framework/README_zh.md)、[foundation/CastEngine/castengine_cast_framework/README.md](../../../../../../foundation/CastEngine/castengine_cast_framework/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
