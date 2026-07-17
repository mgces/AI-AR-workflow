# hilog_lite 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

为 mini/small 设备提供裁剪后的日志 API、服务和 apphilogcat 读取工具。

LiteOS 组件、ACE Lite 和设备服务通过静态或共享库写入日志。

能力边界：该部件适配 `mini,small` 系统类型，当前 rk3568 parts 清单未选入，目录存在不代表进入该产品。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| mini/featured 日志前端 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hilog_lite/frameworks/mini:hilog_lite` | `interfaces` |
| 轻量日志缓存与输出 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_static` | `services` |
| apphilogcat 命令读取 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_shared` | `frameworks` |
| JS Lite 适配 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hilog_lite/services/apphilogcat:apphilogcat` | `command` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hilog_lite/frameworks/mini:hilog_lite` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hiview_log.h, log.h |
| `//base/hiviewdfx/hilog_lite/frameworks/featured:hilog_shared` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hilog_cp.h, hilog_trace.h, hiview_log.h, log.h |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| 无独立进程 | 由调用方链接/装载或由相邻 DFX 服务调用 | 提供库、接口、插件或轻量框架能力 | 具体宿主由产品构建和调用方决定 |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hilog_lite/interfaces](../../../../../../base/hiviewdfx/hilog_lite/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hilog_lite/services](../../../../../../base/hiviewdfx/hilog_lite/services) | 服务、进程与启动实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hilog_lite/frameworks](../../../../../../base/hiviewdfx/hilog_lite/frameworks) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hilog_lite/command](../../../../../../base/hiviewdfx/hilog_lite/command) | 命令行入口和参数处理 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
lite component -> hilog lite API -> lite log service/buffer -> apphilogcat or platform output
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| `hilog_lite_disable_privacy_feature` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_disable_hilog_static` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_file_size` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_disable_cache` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_limit_level_default` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_disable_print_limit` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_log_static_cache_size` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_hiview_hilog_file_buf_size` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_disable_core_init` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_customize_implementation` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_hilog_file_size` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_enable_apphilogcat_init_release` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_enable_apphilogcat_init_debug` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_apphilogcat_log_level_release` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_apphilogcat_log_level_debug` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_enable_hilogcat_build` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_apphilogcat_log_dir` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_disable_test` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_disable_js_feature` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |
| `hilog_lite_mini` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json) |

## 依赖与协作边界

- 上游：LiteOS 组件、ACE Lite 和设备服务通过静态或共享库写入日志。
- 系统部件依赖：`ace_engine_lite`、`battery_lite`、`hiview_lite`、`samgr_lite`、`utils_lite`。
- 三方依赖：`bounds_checking_function`。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | 无声明 | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 2 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | 由宿主进程验证 | 本次为静态分析，未执行真机测试 |

## 风险

- 小内存缓存、格式化边界、不同系统类型实现差异和日志丢弃策略。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hilog_lite/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hilog_lite/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
