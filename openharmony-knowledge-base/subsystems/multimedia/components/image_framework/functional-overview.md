# image_framework 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Image standard provides atomic capabilities

源码 README 补充说明：

> 简介 目录 使用说明 - 读像素到数组 - 从区域读像素 - 写像素到区域 - 写buffer到像素 - 获取图片基本信息 - 获取字节 - 获取位图buffer - 获取像素密度 - 设置透明比率 - 生成Alpha通道 - 图片缩放 - 位置变换 - 图片旋转 - 图片翻转 - 图片裁剪 - 释放位图 - 从图片源获取信息 - 获取整型值 - 修改图片属性 - 创建位图 - 更新数据 - 释放图片源实例 - 打包图片 - 释放packer实例 - 获取surface id - 读取最新图片 - 读取下一张图片 - 注册回调 - 释放receiver实例 - 获取组件缓存 - 释放image实例 - CreateIncrementalSource - 创建ImageSource实例 - 创建PixelMap实例 - 创建imagepacker实例 - 创建imagereceiver实例 **image_framework仓库**提供了一系列易用的接口用于存放image的源码信息，提供创建图片源和位图管理能力，支持运行标准系统的设备使用。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 10000KB / 10000KB |
| 源码仓 | `foundation/multimedia/image_framework` |

## 核心能力

- **Multimedia Image Core**：提供“image core”能力，系统能力标识为 `SystemCapability.Multimedia.Image.Core`。
- **Multimedia Image Image Source**：提供“image image 媒体源”能力，系统能力标识为 `SystemCapability.Multimedia.Image.ImageSource`。
- **Multimedia Image Image Packer**：提供“image image packer”能力，系统能力标识为 `SystemCapability.Multimedia.Image.ImagePacker`。
- **Multimedia Image Image Receiver**：提供“image image receiver”能力，系统能力标识为 `SystemCapability.Multimedia.Image.ImageReceiver`。
- **Multimedia Image Image Creator**：提供“image image creator”能力，系统能力标识为 `SystemCapability.Multimedia.Image.ImageCreator`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `image_framework_feature_upgrade_skia`：image framework 功能 upgrade skia。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/image_framework/frameworks](../../../../../../foundation/multimedia/image_framework/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 228 | `innerkitsimpl`, `kits` |
| [foundation/multimedia/image_framework/plugins](../../../../../../foundation/multimedia/image_framework/plugins) | 可插拔能力实现，由框架或服务在运行时选择和装载。 | 40 | `common`, `cross`, `manager` |
| [foundation/multimedia/image_framework/interfaces](../../../../../../foundation/multimedia/image_framework/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 20 | `innerkits`, `kits` |
| [foundation/multimedia/image_framework/mock](../../../../../../foundation/multimedia/image_framework/mock) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `native` |
| [foundation/multimedia/image_framework/ide](../../../../../../foundation/multimedia/image_framework/ide) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | - |

## 对外与内部接口

该部件声明 22 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/image_framework/frameworks/kits/cj:cj_image_ffi` | `//foundation/multimedia/image_framework/frameworks/kits/cj/include` | `image_impl.h`, `image_ffi.h`, `image_source_impl.h`, `pixel_map_impl.h` |
| `//foundation/multimedia/image_framework/frameworks/innerkitsimpl/pixelconverter:pixelconvertadapter` | `//foundation/multimedia/image_framework/frameworks/innerkitsimpl/pixelconverter/include` | `pixel_convert_adapter.h`, `pixel_map_jni_utils.h` |
| `//foundation/multimedia/image_framework/interfaces/innerkits:image_native` | `//foundation/multimedia/image_framework/interfaces/innerkits/include` | `auxiliary_picture.h`, `picture.h`, `pixel_map.h`, `image_packer.h`, `image_source.h`, `image_type.h`, `peer_listener.h`, `incremental_pixel_map.h` 等 12 个 |
| `//foundation/multimedia/image_framework/interfaces/kits/js/common:image` | `//foundation/multimedia/image_framework/interfaces/kits/js/common/include` | `image_packer_napi.h`, `image_source_napi.h`, `native_module_ohos_image.h`, `pixel_map_napi.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/js/common/pixelmap_ndk:pixelmap` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/image/` | `image_common.h`, `pixelmap_native.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/js/common/picture_ndk:picture` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/image/` | `image_common.h`, `picture_native.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/js/common/pixelmap_ndk:pixelmap_ndk` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/` | `image_pixel_map_napi.h`, `image_pixel_map_mdk.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/js/common/ndk:image_ndk` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/` | `image_mdk_common.h`, `image_mdk.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/js/common/ndk:image_receiver_ndk` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/` | `image_mdk_common.h`, `image_receiver_mdk.h` |
| `//foundation/multimedia/image_framework/frameworks/innerkitsimpl/utils:image_utils` | `//foundation/multimedia/image_framework/frameworks/innerkitsimpl/utils/include/` | `image_utils.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/ani:image_ani` | `//foundation/multimedia/image_framework/frameworks/kits/ani/native/include/` | `pixel_map_ani.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/taihe:copy_image_taihe` | - | - |
| `//foundation/multimedia/image_framework/frameworks/kits/taihe:image_taihe` | `//foundation/multimedia/image_framework/frameworks/kits/taihe/include/` | `image_source_taihe_ani.h`, `image_taihe.h`, `picture_taihe.h`, `picture_taihe_ani.h`, `pixel_map_taihe.h`, `pixel_map_taihe_ani.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/js/common/ndk:image_source_ndk` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/` | `image_source_mdk.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/js/common/ndk:image_source` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/image` | `image_source_native.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/js/common/ndk:image_packer_ndk` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/` | `image_packer_mdk.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/js/common/ndk:image_packer` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/image` | `image_packer_native.h` |
| `//foundation/multimedia/image_framework/frameworks/innerkitsimpl/egl_image:egl_image` | `//foundation/multimedia/image_framework/frameworks/innerkitsimpl/egl_image/include` | `pixel_map_from_surface.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/native/common/ndk:ohimage` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/image/` | `image_common.h`, `image_native.h` |
| `//foundation/multimedia/image_framework/frameworks/kits/native/common/ndk:image_receiver` | `//foundation/multimedia/image_framework/interfaces/kits/native/include/image/` | `image_common.h`, `image_receiver_native.h` |
| `//foundation/multimedia/image_framework/plugins/common/libs/image/libextplugin:extplugin` | `//foundation/multimedia/image_framework/plugins/manager/include` | `image/abs_image_encoder.h` |
| `//foundation/multimedia/image_framework/frameworks/innerkitsimpl/accessor:image_accessor` | `//foundation/multimedia/image_framework/frameworks/innerkitsimpl/accessor/include` | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 41 个，`ohos_source_set` 7 个，`ohos_static_library` 6 个，`taihe_shared_library` 2 个。

## 依赖与协作边界

该部件声明 44 个组件依赖和 0 个三方依赖。

- 系统组件协作：`ability_runtime`, `access_token`, `bounds_checking_function`, `bundle_framework`, `c_utils`, `graphic_2d`, `graphic_surface`, `hichecker`, `hitrace`, `hilog`, `hisysevent`, `ipc`, `napi`, `zlib`, `init`, `memory_utils`, `drivers_interface_codec`, `drivers_interface_display`, `hdf_core`, `memmgr`, `libjpeg-turbo`, `libexif`, `libpng`, `opencl-headers`, `ffmpeg`, `astc-encoder`, `skia`, `samgr`, `resource_management`, `json`, `ffrt`, `openmax`, `os_account`, `runtime_core`, `qos_manager`, `eventhandler`, `ets_runtime`, `libtiff`, `api_metrics`, `dav1d`, `xmp_toolkit_sdk`, `egl`, `opengles`, `jsoncpp`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 175 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_fuzztest` 95 个，`ohos_unittest` 70 个，`group` 5 个，`ohos_shared_library` 3 个，`ohos_executable` 1 个，`generate_static_abc` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/image_framework/bundle.json](../../../../../../foundation/multimedia/image_framework/bundle.json)
- 原始源码 README：[foundation/multimedia/image_framework/README_zh.md](../../../../../../foundation/multimedia/image_framework/README_zh.md)、[foundation/multimedia/image_framework/README.md](../../../../../../foundation/multimedia/image_framework/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
