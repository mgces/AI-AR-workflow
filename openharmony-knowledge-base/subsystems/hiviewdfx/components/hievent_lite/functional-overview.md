# hievent_lite 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

为轻量设备提供结构化故障/行为事件构造、参数附加和上报接口。

Lite 系统服务使用 C 接口创建事件并交由 hiview_lite 处理。

能力边界：该部件适配 `mini` 系统类型，当前 rk3568 parts 清单未选入，目录存在不代表进入该产品。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 事件对象与参数管理 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hievent_lite:hievent_lite` | `interfaces` |
| 文件路径等附件描述 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `frameworks` |
| 事件序列化和 Hiview Lite 上报 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `command` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| 无独立 Inner Kit 声明 | 上层构建目标或平台适配层 | 通过静态库、注册回调或聚合目标集成 | 见 bundle 和模块索引 |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| 无独立进程 | 由调用方链接/装载或由相邻 DFX 服务调用 | 提供库、接口、插件或轻量框架能力 | 具体宿主由产品构建和调用方决定 |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hievent_lite/interfaces](../../../../../../base/hiviewdfx/hievent_lite/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hievent_lite/frameworks](../../../../../../base/hiviewdfx/hievent_lite/frameworks) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hievent_lite/command](../../../../../../base/hiviewdfx/hievent_lite/command) | 命令行入口和参数处理 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
lite service -> HiEvent API -> event encode -> hiview_lite event pipeline
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| `hievent_lite_fault_file_size` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hievent_lite/bundle.json) |
| `hievent_lite_ue_file_size` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hievent_lite/bundle.json) |
| `hievent_lite_stat_file_size` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hievent_lite/bundle.json) |
| `hievent_lite_cache_size` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hievent_lite/bundle.json) |
| `hievent_lite_file_buffer_size` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hievent_lite/bundle.json) |
| `hievent_lite_customize_implementation` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hievent_lite/bundle.json) |
| `hievent_lite_mini` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hievent_lite/bundle.json) |

## 依赖与协作边界

- 上游：Lite 系统服务使用 C 接口创建事件并交由 hiview_lite 处理。
- 系统部件依赖：`hiview_lite`、`samgr_lite`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | 无声明 | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 0 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | 由宿主进程验证 | 本次为静态分析，未执行真机测试 |

## 风险

- 固定缓冲区、事件大小限制、字符串所有权和异常路径内存安全。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hievent_lite/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hievent_lite/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
