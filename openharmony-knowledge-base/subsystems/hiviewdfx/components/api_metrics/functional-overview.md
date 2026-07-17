# api_metrics 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

为系统框架提供低开销 API 调用直方图采集、持久化和聚合查询能力，支撑接口使用频次与耗时分析。

需要记录 API 指标的系统部件通过 Histogram/管理接口写入，维测侧从关系型存储读取聚合结果。

能力边界：该部件适配 `standard` 系统类型，当前 rk3568 产品已选入。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 直方图定义与采样 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiviewdfx_api_metrics:histogrammanager` | `manager` |
| 异步批量写入与数据库管理 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `manager` |
| 指标查询、清理与生命周期控制 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `manager` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hiviewdfx_api_metrics:histogrammanager` | 系统部件/框架调用者 | 库接口与控制/数据交换 | histogram_plugin_macros.h |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| 无独立进程 | 由调用方链接/装载或由相邻 DFX 服务调用 | 提供库、接口、插件或轻量框架能力 | 具体宿主由产品构建和调用方决定 |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hiviewdfx_api_metrics/manager](../../../../../../base/hiviewdfx/hiviewdfx_api_metrics/manager) | 指标/对象管理与持久化调度 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
framework caller -> Histogram API -> HistogramManager -> FFRT task -> relational store
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| 无 bundle feature 声明 | - | 产品差异由 adapted system、GN 条件或上层产品配置决定 | bundle.json |

## 依赖与协作边界

- 上游：需要记录 API 指标的系统部件通过 Histogram/管理接口写入，维测侧从关系型存储读取聚合结果。
- 系统部件依赖：`hilog`、`c_utils`、`relational_store`、`storage_service`、`ffrt`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | 无声明 | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 0 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | 由宿主进程验证 | 本次为静态分析，未执行真机测试 |

## 风险

- 高频埋点开销、异步任务生命周期、数据库膨胀与并发写入。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hiviewdfx_api_metrics/bundle.json)
- [源码 README](../../../../../../base/hiviewdfx/hiviewdfx_api_metrics/README.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
