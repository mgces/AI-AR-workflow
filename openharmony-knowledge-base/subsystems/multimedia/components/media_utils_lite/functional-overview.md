# media_utils_lite 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Definition of public information such as media error code, and data types required for recording and playing audio and video.

源码 README 补充说明：

> 媒体子系统MEDIA\_UTILS\_LITE组件 - 简介 - 目录 - 使用说明 - 约束 - 相关仓 SourceType：播放片源类型 BufferFlags：Buffer承载数据标识 AudioSourceType：定义音频输入源类型枚举 AudioCodecFormat：定义音频数据格式枚举 AudioStreamType：定义音频流类型枚举 AudioBitWidth：定义采样位宽枚举

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `multimedia` |
| 实现形态 | 系统内部接口 + 框架或基础库 |
| 适配系统 | mini,small |
| rk3568 | 未选入当前产品 |
| ROM/RAM 声明 | 1024kB / 500kB |
| 源码仓 | `foundation/multimedia/media_utils_lite` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/multimedia/media_utils_lite/hals](../../../../../../foundation/multimedia/media_utils_lite/hals) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/multimedia/media_utils_lite/interfaces](../../../../../../foundation/multimedia/media_utils_lite/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `kits` |
| [foundation/multimedia/media_utils_lite/src](../../../../../../foundation/multimedia/media_utils_lite/src) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |

## 对外与内部接口

该部件声明 1 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/multimedia/media_utils_lite:media_common` | `//foundation/multimedia/media_utils_lite/hals`<br>`//foundation/multimedia/media_utils_lite/interfaces/kits` | `hal_camera.h`, `hal_display.h`, `data_stream.h`, `format.h`, `media_errors.h`, `media_info.h`, `media_log.h`, `source.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`lite_library` 1 个。

## 依赖与协作边界

该部件声明 0 个组件依赖和 0 个三方依赖。

- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 0 个测试目标，bundle 声明 0 个测试入口。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/multimedia/media_utils_lite/bundle.json](../../../../../../foundation/multimedia/media_utils_lite/bundle.json)
- 原始源码 README：[foundation/multimedia/media_utils_lite/README_zh.md](../../../../../../foundation/multimedia/media_utils_lite/README_zh.md)、[foundation/multimedia/media_utils_lite/README.md](../../../../../../foundation/multimedia/media_utils_lite/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
