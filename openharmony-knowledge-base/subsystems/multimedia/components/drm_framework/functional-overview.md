# drm_framework 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

DRM（Digital Rights Management）框架组件支持音视频媒体业务数字版权管理功能的开发。开发者可以调用系统提供的DRM插件，完成DRM证书管理、DRM许可证管理等功能，支持DRM加密媒体数据的解密，实现DRM节目授权和解密播放。 DRM框架组件提供以下功能： DRM证书管理：生成证书请求、设置证书响应，实现对证书Provision(下载)功能； DRM许可证管理：生成许可证请求、设置许可证响应，同时实现对许可证的离线管理等功能； DRM节目授权：支持底层DRM插件根据许可证对DRM节目授权； DRM节目解密：支持媒体播放功能的解密调用，实现对DRM节目的解密和播放。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/multimedia/drm_framework` |

## 核心能力

- **Multimedia Drm Core**：提供“drm core”能力，系统能力标识为 `SystemCapability.Multimedia.Drm.Core`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `drm_framework_service_support_lazy_loading`：drm framework service 支持 lazy loading。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/drm_framework/frameworks](../../../../../../foundation/multimedia/drm_framework/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 25 | `c`, `js`, `native`, `taihe` |
| [foundation/multimedia/drm_framework/services](../../../../../../foundation/multimedia/drm_framework/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 7 | `drm_service`, `etc`, `utils` |
| [foundation/multimedia/drm_framework/interfaces](../../../../../../foundation/multimedia/drm_framework/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 6 | `inner_api`, `kits` |
| [foundation/multimedia/drm_framework/sa_profile](../../../../../../foundation/multimedia/drm_framework/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | `lazy_loading`, `resident` |

## 对外与内部接口

该部件声明 5 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/drm_framework/frameworks/native:drm_framework` | `foundation/multimedia/drm_framework/interfaces/inner_api/native/drm` | `media_key_system_impl.h`, `key_session_impl.h`, `media_decrypt_module_impl.h` |
| `//foundation/multimedia/drm_framework/frameworks/taihe:drm_taihe` | `//foundation/multimedia/drm_framework/frameworks/taihe/include` | `key_session_taihe.h` |
| `//foundation/multimedia/drm_framework/frameworks/taihe:copy_drm_taihe` | - | - |
| `//foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi:native_drm` | `foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi/common`<br>`foundation/multimedia/drm_framework/interfaces/kits/c/drm_capi/include` | `native_mediakeysession.h`, `native_mediakeysystem.h`, `native_drm_common.h`, `native_drm_object.h`, `native_drm_err.h` |
| `//foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi:drm_napi` | `//foundation/multimedia/drm_framework/interfaces/kits/js/drm_napi/include` | `key_session_napi.h`, `media_key_system_napi.h`, `media_key_system_callback_napi.h`, `native_module_ohos_drm.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `multimedia` | [drm_service](../../processes/drm_service/foundation-runtime.md) | 启动配置, SA 实现 | `3012` | `libdrm_service.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/multimedia/drm_framework/sa_profile:drm_service_sa_profile` | [foundation/multimedia/drm_framework/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/sa_profile/BUILD.gn) |
| `ohos_shared_library` | `//foundation/multimedia/drm_framework/services/drm_service:drm_service` | [foundation/multimedia/drm_framework/services/drm_service/BUILD.gn](../../../../../../foundation/multimedia/drm_framework/services/drm_service/BUILD.gn) |

生产库形态：`ohos_shared_library` 4 个，`ohos_source_set` 2 个，`taihe_shared_library` 1 个。

## 依赖与协作边界

该部件声明 26 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_base`, `ability_runtime`, `access_token`, `curl`, `safwk`, `napi`, `samgr`, `hitrace`, `ipc`, `hisysevent`, `c_utils`, `hilog`, `hidumper`, `hicollie`, `hdf_core`, `eventhandler`, `bundle_framework`, `drivers_interface_drm`, `memmgr`, `hiappevent`, `json`, `init`, `data_share`, `os_account`, `runtime_core`, `netmanager_base`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 8 个测试目标，bundle 声明 3 个测试入口。

主要测试形态：`ohos_fuzztest` 5 个，`group` 2 个，`ohos_unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/drm_framework/bundle.json](../../../../../../foundation/multimedia/drm_framework/bundle.json)
- 原始源码 README：[foundation/multimedia/drm_framework/README_zh.md](../../../../../../foundation/multimedia/drm_framework/README_zh.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
