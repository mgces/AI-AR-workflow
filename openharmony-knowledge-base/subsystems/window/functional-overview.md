# window：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 3 个部件，其中 1 个进入当前 rk3568 产品。2 个部件包含可识别的服务/可执行程序/SA profile，2 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `window_cangjie_wrapper` | cangjie wrapper for window, provide window manage and display manage | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/window_cangjie_wrapper/functional-overview.md) |
| `window_manager` | 简介 架构说明 分离架构与合一架构详解 各子模块架构详解 开发方式 目录 约束 接口说明 相关仓 窗口管理子系统为 OpenHarmony 系统提供窗口管理和显示管理的核心能力，是UI显示的基础子系统，负责协调和管理系统中所有窗口的创建、销毁、布局、显示和交互。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 2/19 | yes | [查看](components/window_manager/functional-overview.md) |
| `window_manager_lite` | APP调用客户端接口完成窗口状态获取、事件处理等操作，服务端与硬件交互实现送显、输入事件分发等。 | 服务/运行实体 + 框架或基础库 | 0/0 | no | [查看](components/window_manager_lite/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `systemabilitymgr` | [foundation](../systemabilitymgr/processes/foundation/foundation-runtime.md) | `window_manager` | 2 | [查看](../systemabilitymgr/processes/foundation/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
