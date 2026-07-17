# t2stack 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

t2stack是面向智能终端场景的极简网络协议栈及其配套中间件的统称，主要提供文件、音视频流以及设备发现三大核心能力，且适配多种操作系统平台；同时，也属于软总线下面的关键传输、设备发现模块。 文件传输能力：提供文件传输基本能力，并在文件传输中提供多种优化，如大小文件协同、小文件打包等用途。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `communication` |
| 实现形态 | 框架或基础库 + 聚合/代码生成 |
| 适配系统 | mini,small,standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 3000KB / 40MB |
| 源码仓 | `foundation/communication/t2stack` |

## 核心能力

- `bundle.json` 未声明 SystemCapability；功能边界主要由接口、构建入口和运行实体定义。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `t2stack_feature_vtp`：t2stack 功能 vtp。
- `t2stack_feature_dfile`：t2stack 功能 dfile。
- `t2stack_feature_coap`：t2stack 功能 coap。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/communication/t2stack/nstackx_util](../../../../../../foundation/communication/t2stack/nstackx_util) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 6 | `core`, `interface`, `platform` |
| [foundation/communication/t2stack/nstackx_core](../../../../../../foundation/communication/t2stack/nstackx_core) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 5 | `dfile`, `platform` |
| [foundation/communication/t2stack/nstackx_ctrl](../../../../../../foundation/communication/t2stack/nstackx_ctrl) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 4 | `core`, `include`, `interface` |
| [foundation/communication/t2stack/fillp](../../../../../../foundation/communication/t2stack/fillp) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 3 | `include`, `src` |
| [foundation/communication/t2stack/nstackx_congestion](../../../../../../foundation/communication/t2stack/nstackx_congestion) | 该目录承载组件按源码命名划分的独立实现区域，具体边界以其 BUILD.gn 和接口定义为准。 | 2 | `core`, `interface`, `platform` |

## 对外与内部接口

该部件未声明 Inner Kit。调用入口主要来自公开 Kit、运行服务、应用或构建聚合目标。

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`shared_library` 5 个，`ohos_shared_library` 5 个，`static_library` 2 个。

## 依赖与协作边界

该部件声明 8 个组件依赖和 8 个三方依赖。

- 系统组件协作：`bounds_checking_function`, `c_utils`, `cJSON`, `dsoftbus`, `hilog`, `libcoap`, `mbedtls`, `openssl`。
- 三方实现依赖：`cJSON`, `json`, `mbedtls`, `openssl`, `bounds_checking_function`, `sqlite`, `zlib`, `libnl`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 5 个测试目标，bundle 声明 0 个测试入口。

主要测试形态：`ohos_unittest` 3 个，`group` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/communication/t2stack/bundle.json](../../../../../../foundation/communication/t2stack/bundle.json)
- 原始源码 README：[foundation/communication/t2stack/README.md](../../../../../../foundation/communication/t2stack/README.md)、[foundation/communication/t2stack/README.en.md](../../../../../../foundation/communication/t2stack/README.en.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
