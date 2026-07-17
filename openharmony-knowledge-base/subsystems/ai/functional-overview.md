# ai：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 3 个部件，其中 2 个进入当前 rk3568 产品。1 个部件包含可识别的服务/可执行程序/SA profile，2 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `ai_engine` | AI业务子系统是OpenHarmony提供原生的分布式AI能力的子系统。 | 框架或基础库 + 聚合/代码生成 | 1/0 | no | [查看](components/ai_engine/functional-overview.md) |
| `intelligent_voice_framework` | 智能语音组件包括智能语音服务框架和智能语音驱动，主要实现了语音注册及语音唤醒相关功能。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/7 | yes | [查看](components/intelligent_voice_framework/functional-overview.md) |
| `neural_network_runtime` | The Neural Network Runtime that bridges the inference framework and the device accelerator. | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/0 | yes | [查看](components/neural_network_runtime/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `ai` | [intell_voice_service](processes/intell_voice_service/foundation-runtime.md) | `intelligent_voice_framework` | 1 | [查看](processes/intell_voice_service/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
