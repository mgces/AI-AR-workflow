# image_effect 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Image standard editing abilities

源码 README 补充说明：

> 简介 - 基本概念 目录 编译 使用说明 - 滤镜链处理 - 单个滤镜处理 - 自定义滤镜处理 图像效果引擎框架提供支持图片编辑业务的开发，开发者可以通过已开放的接口实现图片编辑相关功能的开发。框架提供了单个滤镜处理能力、滤镜链处理能力以及开发者自定义滤镜的处理能力，支持pixelmap、uri、surface等多种输入输出图片数据场景。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | - / - |
| 源码仓 | `foundation/multimedia/image_effect` |

## 核心能力

- **Multimedia Image Effect Core**：提供“image effect core”能力，系统能力标识为 `SystemCapability.Multimedia.ImageEffect.Core`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/image_effect/frameworks](../../../../../../foundation/multimedia/image_effect/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 4 | `native` |
| [foundation/multimedia/image_effect/interfaces](../../../../../../foundation/multimedia/image_effect/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 2 | `inner_api`, `kits` |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/image_effect/frameworks/native:image_effect_impl` | `//foundation/multimedia/image_effect/interfaces/inner_api/native/base`<br>`//foundation/multimedia/image_effect/interfaces/inner_api/native/colorspace`<br>`//foundation/multimedia/image_effect/interfaces/inner_api/native/common`<br>`//foundation/multimedia/image_effect/interfaces/inner_api/native/custom`<br>`//foundation/multimedia/image_effect/interfaces/inner_api/native/effect`<br>`//foundation/multimedia/image_effect/interfaces/inner_api/native/efilter`<br>`//foundation/multimedia/image_effect/interfaces/inner_api/native/memory`<br>`//foundation/multimedia/image_effect/interfaces/inner_api/native/utils` | `effect_buffer.h`, `effect_context.h`, `effect_info.h`, `effect_type.h`, `colorspace_processor.h`, `any.h`, `error_code.h`, `delegate.h` 等 16 个 |
| `//foundation/multimedia/image_effect/frameworks/native:image_effect` | `//foundation/multimedia/image_effect/interfaces/kits/native/` | `image_effect.h`, `image_effect_errors.h`, `image_effect_filter.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 2 个，`ohos_ndk_library` 1 个。

## 依赖与协作边界

该部件声明 16 个组件依赖和 2 个三方依赖。

- 系统组件协作：`hitrace`, `hilog`, `napi`, `image_framework`, `graphic_2d`, `graphic_surface`, `c_utils`, `ability_base`, `bounds_checking_function`, `cJSON`, `drivers_interface_display`, `hisysevent`, `libexif`, `qos_manager`, `video_processing_engine`, `skia`。
- 三方实现依赖：`egl`, `opengles`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 2 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`group` 1 个，`ohos_unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/image_effect/bundle.json](../../../../../../foundation/multimedia/image_effect/bundle.json)
- 原始源码 README：[foundation/multimedia/image_effect/README_zh.md](../../../../../../foundation/multimedia/image_effect/README_zh.md)、[foundation/multimedia/image_effect/README.md](../../../../../../foundation/multimedia/image_effect/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
