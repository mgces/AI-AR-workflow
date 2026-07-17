# multimedia_cangjie_wrapper 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The Cangjie API is a Cangjie API encapsulated on OpenHarmony based on the capabilities of the media subsystem.

源码 README 补充说明：

> 在OpenHarmnoy平台上，OS媒体软件仓颉封装为开发者提供了使用仓颉语言进行应用开发时所需的媒体相关的能力。媒体子系统为开发者提供一套简单且易于理解的接口，使得开发者能够方便地接入系统并使用系统的媒体资源。OS媒体软件仓颉接口包含了图片，相机，相册，视频相关媒体业务。当前开放的OS媒体软件仓颉接口仅支持standard设备。 相机管理接口：提供相机操作接口，支持预览、拍照、录像，控制闪光灯和曝光事件，对焦和调焦和视频防抖。 图片处理接口：支持获取图片信息以及常见图片格式的编解码。 媒体服务接口：为应用提供获取视频缩略图的功能。 相册管理接口：支持获取相册及其包含的图片，获取相册属性，修改相册以及监听相册变更。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 1300KB / 1212KB |
| 源码仓 | `foundation/multimedia/multimedia_cangjie_wrapper` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/multimedia_cangjie_wrapper/ohos](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/ohos) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 5 | `file`, `multimedia` |
| [foundation/multimedia/multimedia_cangjie_wrapper/kit](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/kit) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `CameraKit`, `ImageKit`, `MediaKit`, `MediaLibraryKit` |
| [foundation/multimedia/multimedia_cangjie_wrapper/mock](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/mock) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 3 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/multimedia_cangjie_wrapper/ohos/multimedia/image:ohos.multimedia.image` | - | - |
| `//foundation/multimedia/multimedia_cangjie_wrapper:copy_sdk_multimedia_cangjie_libs` | - | - |
| `//foundation/multimedia/multimedia_cangjie_wrapper:copy_sdk_multimedia_cangjie_libs_kit` | - | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_cangjie_shared_library` 9 个。

## 依赖与协作边界

该部件声明 11 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_cangjie_wrapper`, `bundlemanager_cangjie_wrapper`, `cangjie_ark_interop`, `distributeddatamgr_cangjie_wrapper`, `global_cangjie_wrapper`, `graphic_cangjie_wrapper`, `hiviewdfx_cangjie_wrapper`, `media_library`, `camera_framework`, `image_framework`, `player_framework`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/multimedia_cangjie_wrapper/bundle.json](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/bundle.json)
- 原始源码 README：[foundation/multimedia/multimedia_cangjie_wrapper/README_zh.md](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/README_zh.md)、[foundation/multimedia/multimedia_cangjie_wrapper/README.md](../../../../../../foundation/multimedia/multimedia_cangjie_wrapper/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
