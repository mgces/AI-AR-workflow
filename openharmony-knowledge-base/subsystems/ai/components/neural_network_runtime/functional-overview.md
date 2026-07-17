# neural_network_runtime 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

The Neural Network Runtime that bridges the inference framework and the device accelerator.

源码 README 补充说明：

> Neural Network Runtime（NNRt, 神经网络运行时）是面向AI领域的跨芯片推理计算运行时，作为中间桥梁连通上层AI推理框架和底层加速芯片，实现AI模型的跨芯片推理计算。 如图1所示，NNRt开放北向Native接口供AI推理框架接入，当前NNRt对接了系统内置的MindSpore Lite推理框架。同时NNRt开放南向HDI接口，供端侧AI加速芯片（如NPU、DSP等）接入OpenHarmony硬件生态。AI应用通过AI推理框架和NNRt能直接使用底层芯片加速推理计算。

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `ai` |
| 实现形态 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 1024KB / 2048KB |
| 源码仓 | `foundation/ai/neural_network_runtime` |

## 核心能力

- **AI Neural Network Runtime**：提供“ai neural network runtime”能力，系统能力标识为 `SystemCapability.AI.NeuralNetworkRuntime`。

## 产品功能开关

该部件没有在 `bundle.json` 中声明独立 feature 开关。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/ai/neural_network_runtime/frameworks](../../../../../../foundation/ai/neural_network_runtime/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 5 | `native` |
| [foundation/ai/neural_network_runtime/config](../../../../../../foundation/ai/neural_network_runtime/config) | 编译期或运行期功能配置。 | 1 | - |
| [foundation/ai/neural_network_runtime/common](../../../../../../foundation/ai/neural_network_runtime/common) | 组件内部共享的公共定义、工具和基础实现。 | 0 | - |
| [foundation/ai/neural_network_runtime/interfaces](../../../../../../foundation/ai/neural_network_runtime/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 0 | `innerkits`, `kits` |

## 对外与内部接口

该部件声明 3 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/ai/neural_network_runtime:nnrt_target` | `//foundation/ai/neural_network_runtime/interfaces/innerkits/c` | - |
| `//foundation/ai/neural_network_runtime/frameworks/native/neural_network_core:libneural_network_core` | `//foundation/ai/neural_network_runtime/interfaces/kits/c` | - |
| `//foundation/ai/neural_network_runtime/frameworks/native/neural_network_runtime:libneural_network_runtime` | `//foundation/ai/neural_network_runtime/interfaces/kits/c` | - |

## 运行实体与交付形态

### 进程归属

当前没有从生产 init 配置或 SA profile 中识别到该部件的独立进程归属。它通常以库、接口、插件、资源或构建工具形式被其他部件使用。

### 构建交付形态

没有识别到独立可执行程序或 SA profile；该部件主要以库、接口、插件或资源形式被其他进程装载。

生产库形态：`ohos_shared_library` 6 个，`ohos_prebuilt_shared_library` 2 个。

## 依赖与协作边界

该部件声明 12 个组件依赖和 0 个三方依赖。

- 系统组件协作：`c_utils`, `drivers_interface_nnrt`, `hdf_core`, `hilog`, `hitrace`, `ipc`, `mindspore`, `init`, `json`, `jsoncpp`, `eventhandler`, `openssl`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 58 个测试目标，bundle 声明 2 个测试入口。

主要测试形态：`ohos_unittest` 36 个，`group` 11 个，`ohos_moduletest_suite` 7 个，`ohos_fuzztest` 2 个，`ohos_systemtest` 2 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/ai/neural_network_runtime/bundle.json](../../../../../../foundation/ai/neural_network_runtime/bundle.json)
- 原始源码 README：[foundation/ai/neural_network_runtime/README_zh.md](../../../../../../foundation/ai/neural_network_runtime/README_zh.md)、[foundation/ai/neural_network_runtime/README.md](../../../../../../foundation/ai/neural_network_runtime/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
