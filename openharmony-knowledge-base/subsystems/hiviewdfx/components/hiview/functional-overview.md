# hiview 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

作为 DFX 插件平台汇聚系统事件、故障、性能和资源数据，通过事件流水线完成分析、存储、导出和恢复。

HiSysEvent、faultloggerd、HiAppEvent、系统服务和性能采集器向 Hiview 投递数据，诊断接口和后台任务消费结果。

能力边界：该部件适配 `standard` 系统类型，当前 rk3568 产品已选入。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 插件加载、事件循环和流水线编排 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiview:hiview_package` | `interfaces` |
| 故障日志与可靠性分析 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiview/plugins/faultlogger:fwk_group_fault_log_extension` | `service` |
| 系统事件存储、查询和导出 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiview/plugins/faultlogger/interfaces/js/napi:faultlogger_napi` | `framework` |
| 性能/功耗/统一采集与 xperf 服务 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiview/plugins/faultlogger/interfaces/cj:cj_faultlogger_ffi` | `core` |
| 日志库、故障接口和维测检索 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiview/interfaces/js/napi:loglibrary_napi` | `plugins` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hiview/plugins/faultlogger:libfaultlogger` | 系统部件/框架调用者 | 库接口与控制/数据交换 | faultlog_info.h, faultlog_query_result.h, faultlogger_client.h |
| `//base/hiviewdfx/hiview/interfaces/inner_api/xpower_event:libxpower_event` | 系统部件/框架调用者 | 库接口与控制/数据交换 | xpower_event_common.h, xpower_event.h |
| `//base/hiviewdfx/hiview/interfaces/inner_api/xpower_event:libxpower_event_js` | 系统部件/框架调用者 | 库接口与控制/数据交换 | xpower_event_common.h, xpower_event_js.h, xpower_event_jsvm.h |
| `//base/hiviewdfx/hiview/base:hiviewbase` | 系统部件/框架调用者 | 库接口与控制/数据交换 | plugin_factory.h, event_loop.h, plugin.h, event.h |
| `//base/hiviewdfx/hiview/interfaces/inner_api/unified_collection/client:libucollection_client` | 系统部件/框架调用者 | 库接口与控制/数据交换 | client/cpu_collector_client.h, client/trace_collector_client.h |
| `//base/hiviewdfx/hiview/interfaces/inner_api/unified_collection/utility:libucollection_utility` | 系统部件/框架调用者 | 库接口与控制/数据交换 | utility/cpu_collector.h, utility/gpu_collector.h, utility/io_collector.h, utility/memory_collector.h, utility/network_collector.h |
| `//base/hiviewdfx/hiview/plugins/faultlogger/interfaces/cj:cj_faultlogger_ffi` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hiview/bundle.json |
| `//base/hiviewdfx/hiview/plugins/faultlogger/service/bdfr_base/sanitizer_collector/gwp_asan:libasan_logger` | 系统部件/框架调用者 | 库接口与控制/数据交换 | gwpasan_collector.h |
| `//base/hiviewdfx/hiview/plugins/performance/perfmonitor:libperfmonitor` | 系统部件/框架调用者 | 库接口与控制/数据交换 | perf_monitor_adapter.h, perf_model.h, perf_constants.h |
| `//base/hiviewdfx/hiview/plugins/performance/xperf_service/interfaces/inner_api/xperfservice_client:xperfservice_client` | 系统部件/框架调用者 | 库接口与控制/数据交换 | xperf_service_action_type.h, xperf_service_client.h, rs_monitor_adapter.h |
| `//base/hiviewdfx/hiview/plugins/performance/xperf_service/services:xperfservice_server` | 系统部件/框架调用者 | 库接口与控制/数据交换 | xperf_service_main.h, xperf_service_interfaces.h |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| `hiview` (daemon) | init cfg | 作为 DFX 插件平台汇聚系统事件、故障、性能和资源数据，通过事件流水线完成分析、存储、导出和恢复。 | base/hiviewdfx/hiview/service/config/hiview.cfg；uid=hiview；u:r:hiview:s0 |
| `xperf_service` (system-ability) | SA profile and init cfg | 作为 DFX 插件平台汇聚系统事件、故障、性能和资源数据，通过事件流水线完成分析、存储、导出和恢复。 | base/hiviewdfx/hiview/plugins/performance/xperf_service/sa_profile/8600.json; base/hiviewdfx/hiview/plugins/performance/xperf_service/sa_profile/xperf_service.cfg；uid=hiview |
| `usage_report` (helper-executable) | production executable; start relationship requires product integration review | 作为 DFX 插件平台汇聚系统事件、故障、性能和资源数据，通过事件流水线完成分析、存储、导出和恢复。 | base/hiviewdfx/hiview/plugins/usage_event_report/service/BUILD.gn |
| `analysis_faultlog` (command) | production diagnostic executable | 作为 DFX 插件平台汇聚系统事件、故障、性能和资源数据，通过事件流水线完成分析、存储、导出和恢复。 | base/hiviewdfx/hiview/utility/analysis_faultlog/BUILD.gn；uid=shell |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hiview/interfaces](../../../../../../base/hiviewdfx/hiview/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiview/service](../../../../../../base/hiviewdfx/hiview/service) | 服务、进程与启动实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiview/framework](../../../../../../base/hiviewdfx/hiview/framework) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiview/core](../../../../../../base/hiviewdfx/hiview/core) | 事件循环、插件装载或核心调度 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiview/plugins](../../../../../../base/hiviewdfx/hiview/plugins) | 事件、故障或性能业务插件 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiview/adapter](../../../../../../base/hiviewdfx/hiview/adapter) | 平台和系统服务适配 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiview/utility](../../../../../../base/hiviewdfx/hiview/utility) | 公共工具、数据类型和辅助算法 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiview/hiretrieval](../../../../../../base/hiviewdfx/hiview/hiretrieval) | 该部件的 hiretrieval 实现区域 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiview/base](../../../../../../base/hiviewdfx/hiview/base) | 该部件的 base 实现区域 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiview/hisysevent](../../../../../../base/hiviewdfx/hiview/hisysevent) | 该部件的 hisysevent 实现区域 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
event/fault producer -> Hiview source plugin -> pipeline/plugin -> store/analysis/export/recovery
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| `hiview_feature_bbox_userspace` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_enable_leak_detector` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_enable_performance_monitor` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_PC_app_state_collect_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_enable_crash_validator` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_freeze_collect_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_eventlogger_window_manager_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_eventlogger_stacktrace_catcher_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_eventlogger_binder_catcher_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_eventlogger_dmesg_catcher_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_eventlogger_hilog_catcher_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_eventlogger_hitrace_catcher_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_eventlogger_usage_catcher_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_eventlogger_scb_catcher_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_eventlogger_other_catcher_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_appevent_publish_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_param_update_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_sysevent_store_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_privacy_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_usage_stat_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_perf_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_ebpf_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_network_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_usage_fold_stat_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_graphic_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_gpu_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_cpu_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_mem_profiler_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_io_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_thermal_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_memory_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_hilog_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_wm_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_process_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_trace_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_low_mem_threshold` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_unified_collector_trace_for_cpu_high_load` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_eventlogger_kernel_catcher_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_support_local_read_diagnostic_logs` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |
| `hiview_support_fold_pc_count_duration_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json) |

## 依赖与协作边界

- 上游：HiSysEvent、faultloggerd、HiAppEvent、系统服务和性能采集器向 Hiview 投递数据，诊断接口和后台任务消费结果。
- 系统部件依赖：`ability_base`、`ability_runtime`、`access_token`、`bounds_checking_function`、`bundle_framework`、`common_event_service`、`config_policy`、`cJSON`、`c_utils`、`data_share`、`device_usage_statistics`、`drivers_interface_memorytracker`、`ets_frontend`、`ets_runtime`、`faultloggerd`、`ffrt`、`graphic_2d`、`hicollie`、`hidumper`、`hilog`、`hiprofiler`、`hisysevent`、`icu`、`init`、`input`、`ipc`、`jsoncpp`、`libxml2`、`openssl`、`os_account`、`power_manager`、`preferences`、`relational_store`、`safwk`、`samgr`、`storage_service`、`thermal_manager`、`libuv`、`napi`、`node`、`hiperf`、`hitrace`、`wifi`、`window_manager`、`zlib`、`resource_schedule_service`、`eventhandler`、`selinux_adapter`、`runtime_core`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | `//base/hiviewdfx/hiview:hiview_test_package` | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 214 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | `hiview`、`xperf_service`、`usage_report`、`analysis_faultlog` | 本次为静态分析，未执行真机测试 |

## 风险

- 高权限插件边界、事件队列背压、插件生命周期和并发、磁盘配额、隐私数据与恢复动作。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hiview/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hiview/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
