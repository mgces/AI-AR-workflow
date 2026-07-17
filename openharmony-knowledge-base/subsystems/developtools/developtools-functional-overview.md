# developtools：developtools 功能全景

该源码域在本子系统包含 10 个部件、6 个宿主进程和 1205 个静态目标。

## 部件功能分工

| 部件 | 功能定位 | 产品 | 进程证据 | 说明 |
| --- | --- | --- | ---: | --- |
| `ace_ets2bundle` | ArkUI declarative paradigm parser for syntax compilation, conversion, verification | yes | 0 | [查看](components/ace_ets2bundle/developtools-functional-overview.md) |
| `ace_js2bundle` | ArkUI Web-like paradigm parser for syntax compilation, conversion, verification | no | 0 | [查看](components/ace_js2bundle/developtools-functional-overview.md) |
| `global_resource_tool` | OpenHarmony resource compile. | no | 0 | [查看](components/global_resource_tool/developtools-functional-overview.md) |
| `hapsigner` | hap包签名工具，支持.hsp、.hqf、.hap和.app等文件签名 | no | 0 | [查看](components/hapsigner/developtools-functional-overview.md) |
| `hdc` | Device debug connector that provides the device connection capability and a command line tool | yes | 3 | [查看](components/hdc/developtools-functional-overview.md) |
| `hiperf` | hiperf interface provided for system | yes | 0 | [查看](components/hiperf/developtools-functional-overview.md) |
| `hiprofiler` | Performance profiler that provides an analytics tool for the memory, bytrace plug-in, and IDE, as well as plug-in capabilities | yes | 5 | [查看](components/hiprofiler/developtools-functional-overview.md) |
| `packing_tool` | packing_tool for openharmony | yes | 0 | [查看](components/packing_tool/developtools-functional-overview.md) |
| `smartperf_host` | The SmartPerf performance tuning tool includes SmartPerf_Host and SmartPerf_Device. | yes | 0 | [查看](components/smartperf_host/developtools-functional-overview.md) |
| `syscap_codec` | System capability encode and decode. | yes | 0 | [查看](components/syscap_codec/developtools-functional-overview.md) |

## 运行进程与跨部件宿主

| 宿主子系统 | 进程 | 参与部件 | SA | 说明 |
| --- | --- | --- | ---: | --- |
| `developtools` | [hdc_credential](processes/hdc_credential/developtools-runtime.md) | `hdc` | 0 | [查看](processes/hdc_credential/developtools-runtime.md) |
| `developtools` | [hdcd](processes/hdcd/developtools-runtime.md) | `hdc` | 0 | [查看](processes/hdcd/developtools-runtime.md) |
| `developtools` | [hiprofiler_daemon](processes/hiprofiler_daemon/developtools-runtime.md) | `hiprofiler` | 0 | [查看](processes/hiprofiler_daemon/developtools-runtime.md) |
| `developtools` | [hiprofiler_plugins](processes/hiprofiler_plugins/developtools-runtime.md) | `hiprofiler` | 0 | [查看](processes/hiprofiler_plugins/developtools-runtime.md) |
| `developtools` | [hiprofilerd](processes/hiprofilerd/developtools-runtime.md) | `hiprofiler` | 0 | [查看](processes/hiprofilerd/developtools-runtime.md) |
| `developtools` | [memory_collector](processes/memory_collector/developtools-runtime.md) | `hiprofiler` | 1 | [查看](processes/memory_collector/developtools-runtime.md) |
