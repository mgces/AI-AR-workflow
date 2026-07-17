# hiviewdfx_cangjie_wrapper 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

将 HiLog、HiAppEvent、HiTraceMeter 等 DFX 能力封装为仓颉 API，并组成 PerformanceAnalysisKit。

仓颉应用和框架通过 ohos.hilog、ohos.hiviewdfx.hi_app_event、ohos.hi_trace_meter 等包调用。

能力边界：该部件适配 `standard` 系统类型，当前 rk3568 parts 清单未选入，目录存在不代表进入该产品。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| HiLog 仓颉封装 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hilog:ohos.hilog` | `ohos` |
| HiAppEvent 仓颉封装 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hiviewdfx:ohos.hiviewdfx` | `kit` |
| HiTraceMeter 仓颉封装 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hiviewdfx/hi_app_event:ohos.hiviewdfx.hi_app_event` | `ohos` |
| PerformanceAnalysisKit 聚合导出 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hi_trace_meter:ohos.hi_trace_meter` | `kit` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hilog:ohos.hilog` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hiviewdfx_cangjie_wrapper/bundle.json |
| `//base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos/hi_trace_meter:ohos.hi_trace_meter` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hiviewdfx_cangjie_wrapper/bundle.json |
| `//base/hiviewdfx/hiviewdfx_cangjie_wrapper:copy_sdk_hiviewdfx_cangjie_libs` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hiviewdfx_cangjie_wrapper/bundle.json |
| `//base/hiviewdfx/hiviewdfx_cangjie_wrapper:copy_sdk_hiviewdfx_cangjie_libs_kit` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hiviewdfx_cangjie_wrapper/bundle.json |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| 无独立进程 | 由调用方链接/装载或由相邻 DFX 服务调用 | 提供库、接口、插件或轻量框架能力 | 具体宿主由产品构建和调用方决定 |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/ohos) | 该部件的 ohos 实现区域 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiviewdfx_cangjie_wrapper/kit](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/kit) | 该部件的 kit 实现区域 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
Cangjie caller -> wrapper package -> Cangjie Ark interop/FFI -> native hiviewdfx component
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| 无 bundle feature 声明 | - | 产品差异由 adapted system、GN 条件或上层产品配置决定 | bundle.json |

## 依赖与协作边界

- 上游：仓颉应用和框架通过 ohos.hilog、ohos.hiviewdfx.hi_app_event、ohos.hi_trace_meter 等包调用。
- 系统部件依赖：`cangjie_ark_interop`、`hiappevent`、`hilog`、`hitrace`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | 无声明 | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 0 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | 由宿主进程验证 | 本次为静态分析，未执行真机测试 |

## 风险

- 跨语言类型和异常映射、字符串生命周期、API 版本一致性和底层能力裁剪差异。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hiviewdfx_cangjie_wrapper/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
