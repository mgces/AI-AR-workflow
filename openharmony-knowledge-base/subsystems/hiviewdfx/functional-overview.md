# HiviewDFX 功能全景

> 本页基于 16 个部件的当前源码、接口、运行配置和测试入口生成。

[返回子系统](README.md) | [源码域总览](../../source-domains/hiviewdfx/README.md) | [完整模块索引](hiviewdfx-index.md)

## 子系统边界

HiviewDFX 负责操作系统和应用的可观测性、故障诊断、日志/事件/跟踪、卡死与违规检测，以及诊断数据的汇聚分析。它提供埋点和查询接口，也运行高权限守护进程与 System Ability。

它不负责各业务子系统自身的业务策略，也不替代内核调度、存储、权限或性能分析器；这些能力以数据源、执行环境或下游依赖的形式与 HiviewDFX 协作。standard 与 mini/small 部件是不同产品形态，不能因同处目录就同时视为选入。

## 部件功能分工

| 部件 | 功能定位 | 实现形态 | 主要接口 | 运行实体 | 产品状态 | 详细说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `api_metrics` | 为系统框架提供低开销 API 调用直方图采集、持久化和聚合查询能力，支撑接口使用频次与耗时分析。 | 接口/库/插件 | 1 Inner Kit / 0 SysCap | 宿主装载 | rk3568 已选入 | [查看](components/api_metrics/functional-overview.md) |
| `blackbox_lite` | 面向 LiteOS-M 小型设备记录重启、异常和崩溃现场，形成可在下次启动读取的黑匣子信息。 | 轻量框架/库 | 0 Inner Kit / 0 SysCap | 宿主装载 | rk3568 未选入 | [查看](components/blackbox_lite/functional-overview.md) |
| `faultloggerd` | 统一处理 native 崩溃、主动 dump、远程进程栈获取和故障日志落盘，并提供可靠的栈回溯基础库。 | 接口/库 + 进程/SA | 15 Inner Kit / 0 SysCap | faultloggerd, processdump | rk3568 已选入 | [查看](components/faultloggerd/functional-overview.md) |
| `hiappevent` | 向应用提供行为、性能和故障事件打点接口，并管理事件写入、观察、存储与上报配置。 | 接口/库/插件 | 3 Inner Kit / 1 SysCap | 宿主装载 | rk3568 已选入 | [查看](components/hiappevent/functional-overview.md) |
| `hichecker` | 在应用和框架运行时检测耗时调用、线程误用、资源泄漏等违规行为，并输出可定位的告警或故障事件。 | 接口/库/插件 | 2 Inner Kit / 1 SysCap | 宿主装载 | rk3568 已选入 | [查看](components/hichecker/functional-overview.md) |
| `hicollie` | 为应用和系统服务提供超时、卡死与线程阻塞监测，在异常时采样堆栈、上报事件并按策略恢复。 | 接口/库/插件 | 3 Inner Kit / 1 SysCap | 宿主装载 | rk3568 已选入 | [查看](components/hicollie/functional-overview.md) |
| `hidumper` | 提供统一的系统维测转储入口，将命令行请求路由到 System Ability、进程和注册插件并汇总输出。 | 接口/库 + 进程/SA | 4 Inner Kit / 0 SysCap | hidumper, hidumper_service | rk3568 已选入 | [查看](components/hidumper/functional-overview.md) |
| `hidumper_lite` | 为轻量设备提供命令注册、参数解析和系统/服务诊断信息输出框架。 | 轻量框架/库 | 0 Inner Kit / 0 SysCap | 宿主装载 | rk3568 未选入 | [查看](components/hidumper_lite/functional-overview.md) |
| `hievent_lite` | 为轻量设备提供结构化故障/行为事件构造、参数附加和上报接口。 | 轻量框架/库 | 0 Inner Kit / 0 SysCap | 宿主装载 | rk3568 未选入 | [查看](components/hievent_lite/functional-overview.md) |
| `hilog` | 提供系统统一日志写入、过滤、缓存、读取、持久化和命令行控制能力。 | 接口/库 + 进程/SA | 8 Inner Kit / 1 SysCap | hilogd, hilog | rk3568 已选入 | [查看](components/hilog/functional-overview.md) |
| `hilog_lite` | 为 mini/small 设备提供裁剪后的日志 API、服务和 apphilogcat 读取工具。 | 轻量框架/库 | 2 Inner Kit / 0 SysCap | 宿主装载 | rk3568 未选入 | [查看](components/hilog_lite/functional-overview.md) |
| `hisysevent` | 提供系统级结构化事件的定义、参数校验、写入、订阅和查询能力，是系统可观测数据的统一入口。 | 接口/库 + 进程/SA | 4 Inner Kit / 1 SysCap | hisysevent | rk3568 已选入 | [查看](components/hisysevent/functional-overview.md) |
| `hitrace` | 提供跨线程/跨进程调用链标识、用户态 TraceMeter 打点以及系统 trace 抓取和控制工具。 | 接口/库 + 进程/SA | 8 Inner Kit / 1 SysCap | hitrace | rk3568 已选入 | [查看](components/hitrace/functional-overview.md) |
| `hiview` | 作为 DFX 插件平台汇聚系统事件、故障、性能和资源数据，通过事件流水线完成分析、存储、导出和恢复。 | 接口/库 + 进程/SA | 11 Inner Kit / 3 SysCap | hiview, xperf_service, usage_report, analysis_faultlog | rk3568 已选入 | [查看](components/hiview/functional-overview.md) |
| `hiview_lite` | 为 mini 设备提供轻量事件队列、插件化处理和故障/日志维测基础框架。 | 轻量框架/库 | 0 Inner Kit / 0 SysCap | 宿主装载 | rk3568 未选入 | [查看](components/hiview_lite/functional-overview.md) |
| `hiviewdfx_cangjie_wrapper` | 将 HiLog、HiAppEvent、HiTraceMeter 等 DFX 能力封装为仓颉 API，并组成 PerformanceAnalysisKit。 | 接口/库/插件 | 4 Inner Kit / 0 SysCap | 宿主装载 | rk3568 未选入 | [查看](components/hiviewdfx_cangjie_wrapper/functional-overview.md) |

## 关键运行链

- 日志链：调用方 -> 多语言 HiLog API -> `hilogd` -> 环形缓冲/持久化 -> `hilog` 查询。
- 系统事件链：系统服务 -> HiSysEvent schema/API -> Hiview sysevent source -> 插件流水线 -> 存储、查询或导出。
- native 故障链：信号处理/主动 dump -> `faultloggerd`/`processdump` -> fault log -> Hiview 故障插件。
- 诊断链：`hidumper` -> SA 1212 -> 目标 SA/进程/插件；性能专项可进入 Hiview xperf SA 8600。
- 轻量链：hievent_lite/hilog_lite/blackbox_lite -> hiview_lite -> 平台存储或输出。

## 公共能力域

- observability：日志、系统事件、应用事件、调用链和 trace。
- reliability：崩溃、卡死、线程/资源泄漏、黑匣子和故障恢复。
- performance：API 指标、TraceMeter、统一采集、xperf 和性能插件。
- storage：日志缓冲、事件数据库、故障日志、导出与配额。
- ipc/security：SA、socket、fd/PID、权限、UID/GID 和 SELinux 边界。

## 风险与验证重点

- `hilogd`、`faultloggerd`、`hiview`、SA 1212 和 SA 8600 是高权限、高入度运行实体，应重点验证身份、权限、fd/PID/路径输入和拒绝服务。
- 高频日志、事件和 trace 必须验证背压、丢弃、磁盘配额、内存与功耗；故障路径需验证异步信号安全和资源不足场景。
- lite 与 standard 实现、rk3568 产品选入和 bundle feature 会改变交付边界；静态目录存在不能替代产品证据。
- 本次完成静态结构与链接/覆盖率验证，未执行编译、设备运行、性能或稳定性测试。
