# hichecker 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

在应用和框架运行时检测耗时调用、线程误用、资源泄漏等违规行为，并输出可定位的告警或故障事件。

ArkUI、运行时和应用调试代码通过 native/ArkTS 接口启停规则或接收检测结果。

能力边界：该部件适配 `standard` 系统类型，当前 rk3568 产品已选入。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 规则开关与违规检测 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hichecker/interfaces/native/innerkits:libhichecker` | `interfaces` |
| 调用栈及线程上下文采集 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hichecker/interfaces/js/kits/napi:hichecker` | `frameworks` |
| JS 泄漏观察 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher:jsleakwatcher` | `interfaces` |
| 告警日志和系统事件上报 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hichecker/interfaces/js/kits/napi/js_leak_watcher:jsleakwatchernative` | `frameworks` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hichecker/interfaces/native/innerkits:libhichecker` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hichecker.h, caution.h, hichecker_wrapper.h, js_leak_watcher_ts.h |
| `//base/hiviewdfx/hichecker/frameworks/native:libhichecker_source` | 系统部件/框架调用者 | 库接口与控制/数据交换 | caution.cpp, hichecker.cpp, hichecker_wrapper.cpp |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| 无独立进程 | 由调用方链接/装载或由相邻 DFX 服务调用 | 提供库、接口、插件或轻量框架能力 | 具体宿主由产品构建和调用方决定 |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hichecker/interfaces](../../../../../../base/hiviewdfx/hichecker/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hichecker/frameworks](../../../../../../base/hiviewdfx/hichecker/frameworks) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
runtime/framework hook -> HiChecker rule engine -> stack/context capture -> HiLog/HiSysEvent
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| `hichecker_support_asan` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hichecker/bundle.json) |

## 依赖与协作边界

- 上游：ArkUI、运行时和应用调试代码通过 native/ArkTS 接口启停规则或接收检测结果。
- 系统部件依赖：`api_metrics`、`c_utils`、`ets_frontend`、`ets_runtime`、`faultloggerd`、`hilog`、`init`、`hitrace`、`hisysevent`、`napi`、`runtime_core`、`ace_engine`、`eventhandler`、`window_manager`、`ipc`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | `//base/hiviewdfx/hichecker/test:unittest`、`//base/hiviewdfx/hichecker/test:hichecker_fuzztest` | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 6 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | 由宿主进程验证 | 本次为静态分析，未执行真机测试 |

## 风险

- 检测探针对性能的扰动、误报、跨线程状态同步、生产与调试开关差异。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hichecker/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hichecker/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
