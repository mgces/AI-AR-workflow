# systemabilitymgr：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 5 个部件，其中 3 个进入当前 rk3568 产品。4 个部件包含可识别的服务/可执行程序/SA profile，4 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `safwk` | 在系统服务管理子系统中safwk组件定义OpenHarmony中SystemAbility的实现方法，并提供启动、注册等接口实现。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/3 | yes | [查看](components/safwk/functional-overview.md) |
| `safwk_lite` | Provider：服务的提供者，为系统提供能力（对外接口）。 | 服务/运行实体 | 0/3 | no | [查看](components/safwk_lite/functional-overview.md) |
| `samgr` | samgr组件是OpenHarmony的核心组件，提供OpenHarmony系统服务启动、注册、查询等功能。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/4 | yes | [查看](components/samgr/functional-overview.md) |
| `samgr_lite` | 简介 目录 约束 开发服务 开发服务的子功能 开发进程内对外接口 调用进程内服务 开发跨进程间对外接口 调用跨进程间服务 开发跨进程间服务调用客户端代理 相关仓 由于平台资源有限，且硬件平台多样，因此需要屏蔽不同硬件架构和平台资源的不同、以及运行形态的不同，提供统一化的系统服务开发框架。 | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/samgr_lite/functional-overview.md) |
| `selectionfwk` | Provide word selection capabilities | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/0 | yes | [查看](components/selectionfwk/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `systemabilitymgr` | [foundation](processes/foundation/foundation-runtime.md) | `safwk` | 0 | [查看](processes/foundation/foundation-runtime.md) |
| `systemabilitymgr` | [samgr](processes/samgr/foundation-runtime.md) | `samgr` | 0 | [查看](processes/samgr/foundation-runtime.md) |
| `systemabilitymgr` | [selection_service](processes/selection_service/foundation-runtime.md) | `selectionfwk` | 1 | [查看](processes/selection_service/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
