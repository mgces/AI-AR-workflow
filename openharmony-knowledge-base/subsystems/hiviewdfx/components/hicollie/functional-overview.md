# hicollie 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

为应用和系统服务提供超时、卡死与线程阻塞监测，在异常时采样堆栈、上报事件并按策略恢复。

应用、系统服务、FFRT 任务和事件循环通过 watchdog、timer 或 NDK/Rust 接口注册监控。

能力边界：该部件适配 `standard` 系统类型，当前 rk3568 产品已选入。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 超时定时器与任务看护 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hicollie/interfaces/app:libapp_hicollie` | `interfaces` |
| 线程/事件循环卡死检测 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hicollie/interfaces/native/innerkits:libhicollie` | `frameworks` |
| 线程采样和堆栈抓取 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hicollie/frameworks/native/thread_sampler:libthread_sampler` | `interfaces` |
| 故障上报及恢复策略 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hicollie/interfaces/rust:hicollie_rust` | `frameworks` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hicollie/interfaces/app:libapp_hicollie` | 系统部件/框架调用者 | 库接口与控制/数据交换 | app_watchdog.h |
| `//base/hiviewdfx/hicollie/interfaces/native/innerkits:libhicollie` | 系统部件/框架调用者 | 库接口与控制/数据交换 | xcollie/xcollie.h, xcollie/xcollie_define.h, xcollie/watchdog.h, xcollie/ipc_full.h |
| `//base/hiviewdfx/hicollie/interfaces/rust:hicollie_rust` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hicollie/bundle.json |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| 无独立进程 | 由调用方链接/装载或由相邻 DFX 服务调用 | 提供库、接口、插件或轻量框架能力 | 具体宿主由产品构建和调用方决定 |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hicollie/interfaces](../../../../../../base/hiviewdfx/hicollie/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hicollie/frameworks](../../../../../../base/hiviewdfx/hicollie/frameworks) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
watched task/thread -> HiCollie timer/watchdog -> thread sampler/faultloggerd -> HiSysEvent/recovery action
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| `hicollie_jank_detection_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hicollie/bundle.json) |
| `hicollie_suspend_check_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hicollie/bundle.json) |
| `hicollie_low_memory_freeze_strategy_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hicollie/bundle.json) |
| `hicollie_kick_watchdog_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hicollie/bundle.json) |
| `hicollie_asyncbinderspacefull_enable` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hicollie/bundle.json) |

## 依赖与协作边界

- 上游：应用、系统服务、FFRT 任务和事件循环通过 watchdog、timer 或 NDK/Rust 接口注册监控。
- 系统部件依赖：`api_metrics`、`bounds_checking_function`、`hilog`、`hisysevent`、`c_utils`、`eventhandler`、`faultloggerd`、`ffrt`、`ipc`、`init`、`hiview`、`storage_service`、`samgr`、`libuv`、`ability_runtime`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | `//base/hiviewdfx/hicollie/frameworks/app/test/unittest:unittest`、`//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:unittest`、`//base/hiviewdfx/hicollie/interfaces/ndk/test/unittest:unittest` | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 20 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | 由宿主进程验证 | 本次为静态分析，未执行真机测试 |

## 风险

- 误杀与误报、看门狗线程饥饿、回调重入、采样权限和恢复动作副作用。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hicollie/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hicollie/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
