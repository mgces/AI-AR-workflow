# hitrace 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

提供跨线程/跨进程调用链标识、用户态 TraceMeter 打点以及系统 trace 抓取和控制工具。

应用和系统框架通过 native/NDK/Rust/Cangjie/ArkTS 接口埋点，开发者使用 hitrace 命令采集。

能力边界：该部件适配 `small,standard` 系统类型，当前 rk3568 产品已选入。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| HiTraceChain 调用链传播 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hitrace:hitrace_all_target` | `interfaces` |
| 同步/异步 TraceMeter 打点 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `frameworks` |
| trace 分类与开关管理 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `common` |
| 抓取、压缩和 boot trace | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `utils` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hitrace/interfaces/native/innerkits:hitrace_meter` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hitrace_meter.h, hitrace_meter_c.h |
| `//base/hiviewdfx/hitrace/interfaces/native/innerkits:hitrace_dump` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hitrace_dump.h |
| `//base/hiviewdfx/hitrace/interfaces/native/innerkits:libhitrace_option` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hitrace_option.h |
| `//base/hiviewdfx/hitrace/interfaces/native/innerkits:libhitracechain` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hitrace/hitracechain.h, hitrace/hitracechainc.h, hitrace/hitraceid.h, hitrace/trace.h, hitrace/tracechain.h |
| `//base/hiviewdfx/hitrace/interfaces/rust/innerkits/hitrace_meter:hitrace_meter_rust` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hitrace/bundle.json |
| `//base/hiviewdfx/hitrace/interfaces/rust/innerkits/hitracechain:hitracechain_rust` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hitrace/bundle.json |
| `//base/hiviewdfx/hitrace/interfaces/cj/kits/ffi:cj_hitracechain_ffi` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hitrace/bundle.json |
| `//base/hiviewdfx/hitrace/interfaces/cj/kits/ffi:cj_hitracemeter_ffi` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hitrace/bundle.json |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| `hitrace` (command) | production executable and boot-trace config | 提供跨线程/跨进程调用链标识、用户态 TraceMeter 打点以及系统 trace 抓取和控制工具。 | base/hiviewdfx/hitrace/cmd/BUILD.gn；uid=shell |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hitrace/interfaces](../../../../../../base/hiviewdfx/hitrace/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hitrace/frameworks](../../../../../../base/hiviewdfx/hitrace/frameworks) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hitrace/common](../../../../../../base/hiviewdfx/hitrace/common) | 公共工具、数据类型和辅助算法 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hitrace/utils](../../../../../../base/hiviewdfx/hitrace/utils) | 公共工具、数据类型和辅助算法 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hitrace/cmd](../../../../../../base/hiviewdfx/hitrace/cmd) | 命令行入口和参数处理 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hitrace/config](../../../../../../base/hiviewdfx/hitrace/config) | 产品、init 或 SA 运行配置 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hitrace/tools](../../../../../../base/hiviewdfx/hitrace/tools) | 公共工具、数据类型和辅助算法 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
instrumented caller -> HiTraceChain/TraceMeter -> kernel/user trace buffers -> hitrace command -> trace file
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| `hitrace_support_executable_file` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hitrace/bundle.json) |
| `hitrace_snapshot_tracebuffer_size` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hitrace/bundle.json) |
| `hitrace_snapshot_file_limit` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hitrace/bundle.json) |
| `hitrace_record_file_limit` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hitrace/bundle.json) |
| `hitrace_feature_enable_pgo` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hitrace/bundle.json) |
| `hitrace_feature_pgo_path` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hitrace/bundle.json) |
| `hitrace_feature_support_usr_symlink` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hitrace/bundle.json) |

## 依赖与协作边界

- 上游：应用和系统框架通过 native/NDK/Rust/Cangjie/ArkTS 接口埋点，开发者使用 hitrace 命令采集。
- 系统部件依赖：`bounds_checking_function`、`cJSON`、`c_utils`、`ets_frontend`、`faultloggerd`、`hilog`、`hilog_lite`、`hisysevent`、`hiview`、`init`、`napi`、`zlib`、`runtime_core`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | `//base/hiviewdfx/hitrace/test:hitrace_systemtest`、`//base/hiviewdfx/hitrace/test:hitrace_unittest`、`//base/hiviewdfx/hitrace/test:hitrace_fuzztest` | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 33 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | `hitrace` | 本次为静态分析，未执行真机测试 |

## 风险

- 链路 ID 传播正确性、热路径开销、trace 缓冲和文件空间、特权 trace 数据暴露。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hitrace/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hitrace/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
