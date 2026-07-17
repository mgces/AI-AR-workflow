# HiviewDFX 子系统

[返回子系统目录](../README.md)

全域分析入口：

- [16 个部件功能全景](functional-overview.md)
- [完整 GN 模块索引](hiviewdfx-index.md)
- [HiviewDFX 物理源码域](../../source-domains/hiviewdfx/README.md)
- [覆盖率与链接验证](../../generated/hiviewdfx/verification.md)

## 子系统定位

HiviewDFX 提供日志、系统/应用事件、故障采集、诊断转储、性能跟踪、卡死检测和维测数据处理能力。当前 rk3568 选择 10 个部件。

## rk3568 部件

| 组件 | 主要职责 | 源码 |
| --- | --- | --- |
| `hilog` | 系统日志 API、hilogd、日志读写和控制 | [base/hiviewdfx/hilog](../../../../base/hiviewdfx/hilog) |
| `hisysevent` | 系统事件定义、编码、写入和查询接口 | [base/hiviewdfx/hisysevent](../../../../base/hiviewdfx/hisysevent) |
| `hiappevent` | 应用事件接口和存储/上报能力 | [base/hiviewdfx/hiappevent](../../../../base/hiviewdfx/hiappevent) |
| `hiview` | 插件平台、事件流水线、故障与性能维测 | [base/hiviewdfx/hiview](../../../../base/hiviewdfx/hiview) |
| `faultloggerd` | 崩溃、栈、故障日志和 dump 服务 | [base/hiviewdfx/faultloggerd](../../../../base/hiviewdfx/faultloggerd) |
| `hidumper` | 系统能力/进程维测转储 | [base/hiviewdfx/hidumper](../../../../base/hiviewdfx/hidumper) |
| `hitrace` | TraceMeter、TraceChain 和系统跟踪 | [base/hiviewdfx/hitrace](../../../../base/hiviewdfx/hitrace) |
| `hicollie` | 卡死/超时检测和恢复接口 | [base/hiviewdfx/hicollie](../../../../base/hiviewdfx/hicollie) |
| `hichecker` | 运行时违规和错误使用检查 | [base/hiviewdfx/hichecker](../../../../base/hiviewdfx/hichecker) |
| `api_metrics` | API 调用指标统计 | [base/hiviewdfx/hiviewdfx_api_metrics](../../../../base/hiviewdfx/hiviewdfx_api_metrics) |

完整组件元数据见 [HiviewDFX components.tsv](../../generated/hiviewdfx/components.tsv)，产品选入见 [rk3568-parts.tsv](../../generated/rk3568-parts.tsv)。
上述表格只列 rk3568 当前选入的 10 个部件；lite 和仓颉封装等其余 6 个部件见[功能全景](functional-overview.md)。

## 运行拓扑

| 运行实体 | 启动方式 | 主要能力 |
| --- | --- | --- |
| `hilogd` | init service | 日志输入、输出和控制 socket |
| `hiview` | boot init service | HiSysEvent socket、插件平台、事件/故障/性能处理 |
| `faultloggerd` | init service | fault/crash/sdkdump sockets、故障日志与栈服务 |
| `hidumper_service` | SA 1212，按需启动 | 系统服务和进程 dump broker |
| `xperf_service` | SA 8600 | Hiview 性能服务 |

部分能力是库或被加载到业务进程，例如 HiAppEvent、HiChecker、HiCollie 和 HiTrace，不应全部理解为独立 daemon。

## 能力域

```text
HiviewDFX
├── logging
│   └── hilog / hilogd
├── eventing
│   ├── hisysevent
│   ├── hiappevent
│   └── api_metrics
├── reliability
│   ├── faultloggerd
│   ├── hicollie
│   ├── hichecker
│   └── hiview reliability plugins
├── diagnostics
│   ├── hidumper_service
│   └── faultlogger/dump catcher
└── tracing-performance
    ├── hitrace
    ├── hiview unified collector
    └── xperf_service
```

## 组件与进程目录

- [组件清单](components/README.md)
- [Hiview 进程](processes/hiview/README.md)

后续可以继续增加：

```text
processes/hilogd/
processes/faultloggerd/
processes/hidumper-service/
processes/xperf-service/
components/hisysevent/
components/hiappevent/
components/hitrace/
```

具体功能应继续放入所属进程或组件的 `capabilities/<domain>/features/`，不再提升到知识库根目录。
