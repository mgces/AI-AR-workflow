# hiprofiler：developtools 功能说明

> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [developtools 模块索引](developtools-index.md)。

## 功能定位

Performance profiler that provides an analytics tool for the memory, bytrace plug-in, and IDE, as well as plug-in capabilities

| 属性 | 值 |
| --- | --- |
| 子系统 | `developtools` |
| 产品选入 | yes |
| 适配系统 | standard |
| ROM/RAM | 188KB / 2000KB |
| 源码仓 | `developtools/profiler` |

## 核心能力

- `SystemCapability.HiviewDFX.HiProfiler.HiDebug`

## 产品功能开关

- `hiprofiler_SmartPerf`
- `hiprofiler_sandbox_log_path_mapping`
- `hiprofiler_feature_support_usr_symlink`

## 进程归属

| 宿主子系统 | 进程 | 角色 | SA | 实现库 |
| --- | --- | --- | --- | --- |
| `developtools` | [hiprofiler_daemon](../../processes/hiprofiler_daemon/developtools-runtime.md) | 启动配置 | - | - |
| `developtools` | [hiprofiler_plugins](../../processes/hiprofiler_plugins/developtools-runtime.md) | 启动配置 | - | - |
| `developtools` | [hiprofilerd](../../processes/hiprofilerd/developtools-runtime.md) | 启动配置 | - | - |
| `developtools` | [memory_collector](../../processes/memory_collector/developtools-runtime.md) | SA 实现, 启动配置 | `1205` | `libmemory_profiler.z.so` |

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [developtools/profiler/device](../../../../../../developtools/profiler/device) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 263 | `plugins`, `services`, `etc`, `cmds`, `base`, `sa_profile` |
| [developtools/profiler/protos](../../../../../../developtools/profiler/protos) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 127 | `types`, `services` |
| [developtools/profiler/hidebug](../../../../../../developtools/profiler/hidebug) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 21 | `test`, `interfaces`, `frameworks` |
| [developtools/profiler/host](../../../../../../developtools/profiler/host) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 17 | `smartperf` |
| [developtools/profiler/hiebpf](../../../../../../developtools/profiler/hiebpf) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 13 | `data`, `test`, `include`, `src`, `scripts` |
| [developtools/profiler/proto_encoder](../../../../../../developtools/profiler/proto_encoder) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 8 | `test`, `include`, `src`, `example` |
| [developtools/profiler/interfaces](../../../../../../developtools/profiler/interfaces) | 对外或系统内部接口定义，包括 Kit、Inner Kit、IDL 和多语言绑定。 | 3 | `kits` |
| [developtools/profiler/timestamps](../../../../../../developtools/profiler/timestamps) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 2 | - |
| [developtools/profiler/tools](../../../../../../developtools/profiler/tools) | 开发、诊断或命令行辅助工具。 | 2 | `smaps_show`, `pagemap_parse` |

## 接口、依赖与测试

- Inner Kit：//developtools/profiler/device/plugins/api:libhidebug,//developtools/profiler/device/plugins/api:libhidebug_init,//developtools/profiler/device/plugins/native_daemon:libnative_daemon_client,//developtools/profiler/device/plugins/native_daemon:memory_profiler_client,//developtools/profiler/device/plugins/network_profiler/client:libnetwork_profiler,//developtools/profiler/device/plugins/ffrt_profiler/client:libffrt_profiler,//developtools/profiler/device/base:libstack_common,//developtools/profiler/device/base:stack_common_static,//developtools/profiler/hidebug/interfaces/cj:cj_hidebug_ffi,//developtools/profiler/device/plugins/preload_client:hiprofiler_preload_client,//developtools/profiler/hidebug/interfaces/innerkits/native/hidebug_dump:hidebug_dump。
- 组件依赖：ability_runtime,ability_base,access_token,arkxtest,bounds_checking_function,bundle_framework,common_event_service,cJSON,c_utils,faultloggerd,hiappevent,hichecker,hicollie,hidumper,hilog,hisysevent,hitrace,hiview,icu,ipc,init,libbpf,libpng,napi,protobuf,runtime_core,safwk,samgr,storage_service,drivers_interface_memorytracker,graphic_2d,os_account,window_manager,image_framework,ffrt,openssl,zlib,grpc,abseil-cpp,netmanager_base,ets_frontend。
- 三方依赖：无声明。
- 测试入口：//developtools/profiler/device:fuzztest,//developtools/profiler/device:unittest,//developtools/profiler/interfaces/kits/test:unittest,//developtools/profiler/hidebug/test/unittest:unittest,//developtools/profiler/hidebug/test/fuzztest:fuzztest,//developtools/profiler/proto_encoder/test:unittest。
- 静态目标：生产 184，测试 149，总计 456。

## 继续深入

- 组件元数据：[developtools/profiler/bundle.json](../../../../../../developtools/profiler/bundle.json)
- 原始 README：[developtools/profiler/README_zh.md](../../../../../../developtools/profiler/README_zh.md)
- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。
