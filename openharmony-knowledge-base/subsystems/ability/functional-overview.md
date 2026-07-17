# ability：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 8 个部件，其中 5 个进入当前 rk3568 产品。5 个部件包含可识别的服务/可执行程序/SA profile，7 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `ability_base` | **ability_base**部件作为元能力的基础定义部件，提供组件启动参数（Want），系统环境参数（Configuration），URI参数（Uniform Resource Identifier）的定义，用于启动应用，获取环境参数等功能。 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/0 | yes | [查看](components/ability_base/functional-overview.md) |
| `ability_cangjie_wrapper` | The ability_cangjie_wrapper is a Cangjie API encapsulated on OpenHarmony based on the ability_runtime subsystem. | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/ability_cangjie_wrapper/functional-overview.md) |
| `ability_lite` | App development framework for mini and small system. | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 | 0/5 | no | [查看](components/ability_lite/functional-overview.md) |
| `ability_runtime` | Ability管理服务统一调度和管理应用中各Ability和应用管理服务, 用于管理应用运行关系、调度应用进程生命周期及状态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 10/12 | yes | [查看](components/ability_runtime/functional-overview.md) |
| `dmsfwk` | distributed ability manager service | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 2/17 | yes | [查看](components/dmsfwk/functional-overview.md) |
| `dmsfwk_lite` | distributed abiltiy manager service | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/dmsfwk_lite/functional-overview.md) |
| `form_fwk` | 卡片常用于嵌入到其他应用（当前只支持系统应用）中作为其界面的一部分显示，并支持拉起页面，发送消息等基础的交互功能。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/6 | yes | [查看](components/form_fwk/functional-overview.md) |
| `idl_tool` | 声明系统服务对外提供的服务接口，根据接口声明在编译时生成跨进程调用（IPC）或跨设备调用（RPC）的代理（Proxy）和桩（Stub）的C/C++代码或JS/TS代码。 | 服务/运行实体 + 系统内部接口 + 聚合/代码生成 | 0/0 | yes | [查看](components/idl_tool/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `ability` | [aimgr](processes/aimgr/foundation-runtime.md) | `ability_runtime` | 1 | [查看](processes/aimgr/foundation-runtime.md) |
| `ability` | [distributedsched](processes/distributedsched/foundation-runtime.md) | `dmsfwk` | 1 | [查看](processes/distributedsched/foundation-runtime.md) |
| `ability` | [quick_fix](processes/quick_fix/foundation-runtime.md) | `ability_runtime` | 1 | [查看](processes/quick_fix/foundation-runtime.md) |
| `ability` | [service_router](processes/service_router/foundation-runtime.md) | `ability_runtime` | 1 | [查看](processes/service_router/foundation-runtime.md) |
| `systemabilitymgr` | [foundation](../systemabilitymgr/processes/foundation/foundation-runtime.md) | `ability_runtime`, `dmsfwk`, `form_fwk` | 7 | [查看](../systemabilitymgr/processes/foundation/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
