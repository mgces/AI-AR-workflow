# hiperf：developtools 功能说明

> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [developtools 模块索引](developtools-index.md)。

## 功能定位

hiperf interface provided for system

| 属性 | 值 |
| --- | --- |
| 子系统 | `developtools` |
| 产品选入 | yes |
| 适配系统 | standard |
| ROM/RAM | 930KB / 2000KB |
| 源码仓 | `developtools/hiperf` |

## 核心能力

- 元数据未声明 SystemCapability，需结合接口和服务实现确定能力边界。

## 产品功能开关

- `hiperf_sandbox_log_path_mapping`
- `hiperf_feature_support_usr_symlink`

## 进程归属

当前没有生产 init 或 SA profile 证据；该部件通常以库、接口、资源、插件或工具形式被其他部件使用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [developtools/hiperf/interfaces](../../../../../../developtools/hiperf/interfaces) | 对外或系统内部接口定义，包括 Kit、Inner Kit、IDL 和多语言绑定。 | 5 | `innerkits` |
| [developtools/hiperf/demo](../../../../../../developtools/hiperf/demo) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 2 | `js`, `cpp` |
| [developtools/hiperf/etc](../../../../../../developtools/hiperf/etc) | 安装到系统的启动、权限、策略或运行配置。 | 0 | - |
| [developtools/hiperf/include](../../../../../../developtools/hiperf/include) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `nonlinux` |
| [developtools/hiperf/proto](../../../../../../developtools/hiperf/proto) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | - |
| [developtools/hiperf/script](../../../../../../developtools/hiperf/script) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | `test`, `testModule` |
| [developtools/hiperf/src](../../../../../../developtools/hiperf/src) | 按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。 | 0 | - |

## 接口、依赖与测试

- Inner Kit：//developtools/hiperf/interfaces/innerkits/native/hiperf_client:hiperf_client,//developtools/hiperf/interfaces/innerkits/native/hiperf_local:hiperf_local。
- 组件依赖：ability_base,abseil-cpp,bounds_checking_function,bundle_framework,cJSON,c_utils,config_policy,faultloggerd,hiprofiler,hilog,hisysevent,init,ipc,napi,protobuf,samgr,zlib。
- 三方依赖：无声明。
- 测试入口：//developtools/hiperf/test:hiperf_test。
- 静态目标：生产 18，测试 13，总计 49。

## 继续深入

- 组件元数据：[developtools/hiperf/bundle.json](../../../../../../developtools/hiperf/bundle.json)
- 原始 README：[developtools/hiperf/README_zh.md](../../../../../../developtools/hiperf/README_zh.md)
- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。
