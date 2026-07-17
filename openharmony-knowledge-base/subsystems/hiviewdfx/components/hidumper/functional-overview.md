# hidumper 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

提供统一的系统维测转储入口，将命令行请求路由到 System Ability、进程和注册插件并汇总输出。

开发者和测试人员使用 hidumper 命令，系统服务通过 Dump 接口或 hidumper client 响应查询。

能力边界：该部件适配 `standard` 系统类型，当前 rk3568 产品已选入。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 命令解析与目标发现 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hidumper:bin` | `interfaces` |
| SA/进程 dump 调度 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hidumper:service` | `services` |
| 插件化 CPU/内存等信息采集 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `frameworks` |
| 输出、超时和权限控制 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `plugins` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hidumper/interfaces/innerkits:lib_dump_usage` | 系统部件/框架调用者 | 库接口与控制/数据交换 | dump_usage.h |
| `//base/hiviewdfx/hidumper/services:hidumper_client` | 系统部件/框架调用者 | 库接口与控制/数据交换 | idump_broker.h, dump_broker_proxy.h |
| `//base/hiviewdfx/hidumper/services:hidumperservice_cpu_source` | 系统部件/框架调用者 | 库接口与控制/数据交换 | dump_manager_cpu_service.h |
| `//base/hiviewdfx/hidumper/plugins:hidumper_plugin` | 系统部件/框架调用者 | 库接口与控制/数据交换 | dumper_plugin.h |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| `hidumper` (command) | production executable | 提供统一的系统维测转储入口，将命令行请求路由到 System Ability、进程和注册插件并汇总输出。 | base/hiviewdfx/hidumper/frameworks/native/BUILD.gn；uid=shell |
| `hidumper_service` (system-ability) | SA profile and init cfg | 提供统一的系统维测转储入口，将命令行请求路由到 System Ability、进程和注册插件并汇总输出。 | base/hiviewdfx/hidumper/sa_profile/1212.json; base/hiviewdfx/hidumper/services/native/etc/hidumper_service.cfg；uid=1212；u:r:hidumper_service:s0 |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hidumper/interfaces](../../../../../../base/hiviewdfx/hidumper/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hidumper/services](../../../../../../base/hiviewdfx/hidumper/services) | 服务、进程与启动实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hidumper/frameworks](../../../../../../base/hiviewdfx/hidumper/frameworks) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hidumper/plugins](../../../../../../base/hiviewdfx/hidumper/plugins) | 事件、故障或性能业务插件 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hidumper/client](../../../../../../base/hiviewdfx/hidumper/client) | 该部件的 client 实现区域 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hidumper/utils](../../../../../../base/hiviewdfx/hidumper/utils) | 公共工具、数据类型和辅助算法 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hidumper/sa_profile](../../../../../../base/hiviewdfx/hidumper/sa_profile) | 产品、init 或 SA 运行配置 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
hidumper CLI -> hidumper client -> SA 1212 service -> target SA/process/plugin -> formatted output
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| `hidumper_feature_support_usr_symlink` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hidumper/bundle.json) |

## 依赖与协作边界

- 上游：开发者和测试人员使用 hidumper 命令，系统服务通过 Dump 接口或 hidumper client 响应查询。
- 系统部件依赖：`ability_base`、`access_token`、`bundle_framework`、`c_utils`、`eventhandler`、`hilog`、`hiview`、`hicollie`、`init`、`ipc`、`memmgr`、`netmanager_base`、`safwk`、`samgr`、`skia`、`drivers_interface_memorytracker`、`hdf_core`、`ability_runtime`、`graphic_2d`、`hisysevent`、`zlib`、`ffrt`、`cJSON`、`memory_utils`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | `//base/hiviewdfx/hidumper/test:unittest`、`//base/hiviewdfx/hidumper/test:fuzztest` | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 48 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | `hidumper`、`hidumper_service` | 本次为静态分析，未执行真机测试 |

## 风险

- shell 权限扩大、敏感信息泄露、阻塞目标服务、超大输出、插件超时与 fd 生命周期。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hidumper/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hidumper/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
