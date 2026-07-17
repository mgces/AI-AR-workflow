# smartperf_host：developtools 功能说明

> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [developtools 模块索引](developtools-index.md)。

## 功能定位

The SmartPerf performance tuning tool includes SmartPerf_Host and SmartPerf_Device.

| 属性 | 值 |
| --- | --- |
| 子系统 | `developtools` |
| 产品选入 | yes |
| 适配系统 | standard |
| ROM/RAM | 188KB / 2000KB |
| 源码仓 | `developtools/smartperf_host` |

## 核心能力

- 元数据未声明 SystemCapability，需结合接口和服务实现确定能力边界。

## 产品功能开关

- `smartperf_host_device`

## 进程归属

当前没有生产 init 或 SA profile 证据；该部件通常以库、接口、资源、插件或工具形式被其他部件使用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [developtools/smartperf_host/smartperf_host](../../../../../../developtools/smartperf_host/smartperf_host) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 257 | `patches`, `ide`, `figures`, `docs`, `trace_streamer` |
| [developtools/smartperf_host/smartperf_device](../../../../../../developtools/smartperf_host/smartperf_device) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 15 | `device_command`, `device_ui`, `build` |

## 接口、依赖与测试

- Inner Kit：//developtools/smartperf_host/smartperf_device/device_command:smartperf_daemon。
- 组件依赖：ability_base,arkxtest,bounds_checking_function,common_event_service,c_utils,hilog,hisysevent,hiview,ipc,init,libpng,protobuf,samgr,graphic_2d,window_manager,image_framework,zlib。
- 三方依赖：libsec_static,libunwind,sqlite。
- 测试入口：//developtools/smartperf_host/smartperf_device/device_command/test:unittest。
- 静态目标：生产 139，测试 23，总计 272。

## 继续深入

- 组件元数据：[developtools/smartperf_host/bundle.json](../../../../../../developtools/smartperf_host/bundle.json)
- 原始 README：[developtools/smartperf_host/README_zh.md](../../../../../../developtools/smartperf_host/README_zh.md)
- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。
