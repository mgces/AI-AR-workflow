# graphic_surface 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

Surface组件用于管理和传递图形和媒体的共享内存。具体场景包括了图形的送显、合成，媒体的播放、录制等。 Surface的跨进程传输使用IPC传输句柄等控制结构（有拷贝），使用共享内存传递图形/媒体数据（零拷贝）。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `graphic` |
| 实现形态 | 系统内部接口 + 框架或基础库 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 10000KB / 10000KB |
| 源码仓 | `foundation/graphic/graphic_surface` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `graphic_surface_feature_tv_metadata_enable`：graphic surface 功能 tv metadata 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/graphic/graphic_surface/surface](../../../../../../foundation/graphic/graphic_surface/surface) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 63 | `include`, `src` |
| [foundation/graphic/graphic_surface/utils](../../../../../../foundation/graphic/graphic_surface/utils) | 跨模块复用的基础工具和通用数据结构。 | 25 | `frame_report`, `hebc_white_list`, `rs_frame_report_ext`, `trace` |
| [foundation/graphic/graphic_surface/sync_fence](../../../../../../foundation/graphic/graphic_surface/sync_fence) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 13 | `include`, `src` |
| [foundation/graphic/graphic_surface/buffer_handle](../../../../../../foundation/graphic/graphic_surface/buffer_handle) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 9 | `src` |
| [foundation/graphic/graphic_surface/sandbox](../../../../../../foundation/graphic/graphic_surface/sandbox) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | - |
| [foundation/graphic/graphic_surface/test_header](../../../../../../foundation/graphic/graphic_surface/test_header) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | `export` |
| [foundation/graphic/graphic_surface/.gitcode](../../../../../../foundation/graphic/graphic_surface/.gitcode) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 0 | - |
| [foundation/graphic/graphic_surface/interfaces](../../../../../../foundation/graphic/graphic_surface/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `inner_api` |

## 对外与内部接口

该部件声明 7 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/graphic/graphic_surface/surface:surface` | `//foundation/graphic/graphic_surface/interfaces/inner_api/surface` | `buffer_extra_data.h`, `common_types.h`, `external_window.h`, `native_buffer.h`, `native_buffer_inner.h`, `ibuffer_consumer_listener.h`, `ibuffer_producer.h`, `iconsumer_surface.h` 等 13 个 |
| `//foundation/graphic/graphic_surface/surface:surface_static` | - | - |
| `//foundation/graphic/graphic_surface/sync_fence:sync_fence_static` | - | - |
| `//foundation/graphic/graphic_surface/surface:surface_headers` | `//foundation/graphic/graphic_surface/interfaces/inner_api/surface` | `surface_type.h` |
| `//foundation/graphic/graphic_surface/sync_fence:sync_fence` | `//foundation/graphic/graphic_surface/interfaces/inner_api/sync_fence` | `sync_fence.h` |
| `//foundation/graphic/graphic_surface/utils/frame_report:frame_report` | - | `frame_report.h` |
| `//foundation/graphic/graphic_surface/buffer_handle:buffer_handle` | `//foundation/graphic/graphic_surface/interfaces/inner_api/buffer_handle` | `buffer_handle_parcel.h`, `buffer_handle_utils.h` |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_static_library` 7 个，`ohos_shared_library` 3 个，`ohos_source_set` 1 个。

## 依赖与协作边界

该部件声明 15 个组件依赖和 0 个三方依赖。

- 系统组件协作：`access_token`, `bounds_checking_function`, `cJSON`, `c_utils`, `config_policy`, `drivers_interface_display`, `eventhandler`, `hicollie`, `hilog`, `hitrace`, `hisysevent`, `init`, `ipc`, `samgr`, `selinux_adapter`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 83 个测试目标，bundle 声明 6 个测试入口。

主要测试形态：`ohos_unittest` 34 个，`group` 29 个，`ohos_fuzztest` 11 个，`ohos_static_library` 8 个，`ohos_source_set` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/graphic/graphic_surface/bundle.json](../../../../../../foundation/graphic/graphic_surface/bundle.json)
- 原始源码 README：[foundation/graphic/graphic_surface/README.md](../../../../../../foundation/graphic/graphic_surface/README.md)、[foundation/graphic/graphic_surface/README.en.md](../../../../../../foundation/graphic/graphic_surface/README.en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
