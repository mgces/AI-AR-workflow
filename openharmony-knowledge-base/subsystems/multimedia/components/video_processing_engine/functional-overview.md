# video_processing_engine 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

VPE（Video Processing Engine）引擎是处理视频和图像数据的媒体引擎，包括细节增强、对比度增强、亮度增强、动态范围增强等基础能力，为转码、分享、显示后处理等提供色彩空间转换、缩放超分、动态元数据集生成等基础算法。 \| 依赖模块 \| 功能描述 \| \| :-- \| :-- \| \| graphic_graphic_surface \| 提供视频surface支持 \| \| graphic_graphic_2d \| 提供图片surfacebuffer支持 \| \| multimedia_media_foundation \| 提供pixelmap支持 \| \| multimedia_image_framework \| 提供Format参数设置支持 \| \| third_party_skia \| 提供缩放算法 \|

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 10000KB / 10000KB |
| 源码仓 | `foundation/multimedia/video_processing_engine` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/video_processing_engine/framework](../../../../../../foundation/multimedia/video_processing_engine/framework) | 客户端框架、公共运行库以及面向上层的能力封装。 | 15 | `algorithm`, `capi`, `dfx` |
| [foundation/multimedia/video_processing_engine/interfaces](../../../../../../foundation/multimedia/video_processing_engine/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 13 | `inner_api`, `kits` |
| [foundation/multimedia/video_processing_engine/services](../../../../../../foundation/multimedia/video_processing_engine/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 8 | `algorithm`, `include`, `sa_profile`, `src`, `utils` |

## 对外与内部接口

该部件声明 7 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/video_processing_engine/framework:videoprocessingengine` | `//foundation/multimedia/video_processing_engine/interfaces/inner_api` | `algorithm_common.h`, `algorithm_errors.h`, `colorspace_converter.h`, `colorspace_converter_display.h`, `metadata_generator.h`, `colorspace_converter_video.h`, `colorspace_converter_video_common.h`, `colorspace_converter_video_description.h` 等 14 个 |
| `//foundation/multimedia/video_processing_engine/services:videoprocessingservice` | `//foundation/multimedia/video_processing_engine/services/include` | `video_processing_client.h` |
| `//foundation/multimedia/video_processing_engine/services:videoprocessingserviceimpl` | `//foundation/multimedia/video_processing_engine/services/algorithm/include` | `ivideo_processing_algorithm.h` |
| `//foundation/multimedia/video_processing_engine/framework:image_processing` | `//foundation/multimedia/video_processing_engine/interfaces/kits/c` | `image_processing.h`, `image_processing_types.h` |
| `//foundation/multimedia/video_processing_engine/framework:video_processing` | `//foundation/multimedia/video_processing_engine/interfaces/kits/c` | `video_processing.h`, `video_processing_types.h` |
| `//foundation/multimedia/video_processing_engine/framework:detailEnhancer` | `//foundation/multimedia/video_processing_engine/interfaces/kits/js` | `detail_enhance_napi.h` |
| `//foundation/multimedia/video_processing_engine/framework:videoprocessingenginenapi` | `//foundation/multimedia/video_processing_engine/interfaces/kits/js` | `detail_enhance_napi_formal.h`, `native_module_ohos_imageprocessing.h` |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `multimedia` | [video_processing_service](../../processes/video_processing_service/foundation-runtime.md) | 启动配置, SA 实现 | `66134` | `libvideoprocessingservice.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/multimedia/video_processing_engine/services/sa_profile:video_processing_service` | [foundation/multimedia/video_processing_engine/services/sa_profile/BUILD.gn](../../../../../../foundation/multimedia/video_processing_engine/services/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 7 个，`ohos_prebuilt_shared_library` 3 个，`ohos_ndk_library` 2 个，`taihe_shared_library` 2 个。

## 依赖与协作边界

该部件声明 24 个组件依赖和 0 个三方依赖。

- 系统组件协作：`c_utils`, `graphic_2d`, `graphic_surface`, `hilog`, `hitrace`, `drivers_interface_display`, `ffrt`, `init`, `hdf_core`, `image_framework`, `media_foundation`, `napi`, `ipc`, `runtime_core`, `safwk`, `samgr`, `eventhandler`, `libxml2`, `skia`, `egl`, `opengles`, `bounds_checking_function`, `opencl-headers`, `window_manager`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 30 个测试目标，bundle 声明 4 个测试入口。

主要测试形态：`ohos_unittest` 16 个，`group` 5 个，`ohos_moduletest` 4 个，`ohos_executable` 2 个，`ohos_source_set` 2 个，`ohos_fuzztest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/video_processing_engine/bundle.json](../../../../../../foundation/multimedia/video_processing_engine/bundle.json)
- 原始源码 README：[foundation/multimedia/video_processing_engine/README_zh.md](../../../../../../foundation/multimedia/video_processing_engine/README_zh.md)、[foundation/multimedia/video_processing_engine/README.md](../../../../../../foundation/multimedia/video_processing_engine/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
