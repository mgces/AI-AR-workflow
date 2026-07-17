# bundlemanager：Foundation 功能全景

> 本页解释该子系统在 Foundation 源码域中的部件职责和能力分工；构建数量与全部目标见 [Foundation 索引](foundation-index.md)。

[返回子系统](README.md) | [返回 Foundation 源码域](../../source-domains/foundation/README.md)

## 子系统构成

Foundation 在该子系统下包含 7 个部件，其中 5 个进入当前 rk3568 产品。6 个部件包含可识别的服务/可执行程序/SA profile，6 个部件声明 Inner Kit。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 系统能力/开关 | rk3568 | 详细说明 |
| --- | --- | --- | ---: | --- | --- |
| `app_domain_verify` | 应用域名校验部件是包管理子系统中的一个部件，其与包管理基础框架，元能力管理服务，互相协作共同完成`Applinking`$^1$功能。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/1 | yes | [查看](components/app_domain_verify/functional-overview.md) |
| `bundle_framework` | 提供OpenHarmony应用和服务安装包的安装、更新、卸载以及信息查询等能力，包含包管理接口和包管理服务 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 9/11 | yes | [查看](components/bundle_framework/functional-overview.md) |
| `bundle_framework_lite` | Bundle installation management frameworks | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/3 | no | [查看](components/bundle_framework_lite/functional-overview.md) |
| `bundle_tool` | 包管理命令行工具：提供命令行中执行hap包的安装、更新、卸载及信息查询的能力 | 服务/运行实体 + 框架或基础库 + 聚合/代码生成 | 0/0 | yes | [查看](components/bundle_tool/functional-overview.md) |
| `bundlemanager_cangjie_wrapper` | The bundlemanager_cangjie_wrapper is a Cangjie API encapsulated on OpenHarmony based on the bundle_framework subsystem. | 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 0/0 | no | [查看](components/bundlemanager_cangjie_wrapper/functional-overview.md) |
| `distributed_bundle_framework` | 分布式包管理服务负责管理跨设备的组件调度和任务管理，实现跨设备RPC的能力，可以按需获取跨设备指定语言的资源。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/1 | yes | [查看](components/distributed_bundle_framework/functional-overview.md) |
| `ecological_rule_manager` | 生态规则管控服务提供一种系统的扩展能力，设备厂商可以在定制设备上（2B合作项目等），对应用的行为（跳转、添加桌面卡片、免安装元服务）进行管控，从而定制出满足厂商管控要求的用户体验。 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 | 1/0 | yes | [查看](components/ecological_rule_manager/functional-overview.md) |

“系统能力/开关”分别表示 `syscap` 和 product feature 数量。具体名称、接口、运行目标和源码职责区请进入部件说明。

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 本子系统参与部件 | SA | 运行说明 |
| --- | --- | --- | ---: | --- |
| `bundlemanager` | [app_domain_verify_agent](processes/app_domain_verify_agent/foundation-runtime.md) | `app_domain_verify` | 1 | [查看](processes/app_domain_verify_agent/foundation-runtime.md) |
| `bundlemanager` | [d-bms](processes/d-bms/foundation-runtime.md) | `distributed_bundle_framework` | 1 | [查看](processes/d-bms/foundation-runtime.md) |
| `bundlemanager` | [installs](processes/installs/foundation-runtime.md) | `bundle_framework` | 1 | [查看](processes/installs/foundation-runtime.md) |
| `systemabilitymgr` | [foundation](../systemabilitymgr/processes/foundation/foundation-runtime.md) | `app_domain_verify`, `bundle_framework`, `ecological_rule_manager` | 3 | [查看](../systemabilitymgr/processes/foundation/foundation-runtime.md) |

## 阅读顺序

1. 先从上表确认部件的功能定位和实现形态。
2. 进入部件功能说明，查看 SystemCapability、功能开关、Inner Kit 和运行实体。
3. 需要编译或定位文件时，再进入完整模块索引。
4. 对具体业务继续建立能力域和 feature 文档，不在本页堆叠实现细节。
