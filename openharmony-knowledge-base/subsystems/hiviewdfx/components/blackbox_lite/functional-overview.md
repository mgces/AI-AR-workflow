# blackbox_lite 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

面向 LiteOS-M 小型设备记录重启、异常和崩溃现场，形成可在下次启动读取的黑匣子信息。

内核或设备适配层在故障路径写入异常信息，启动或诊断流程读取持久化记录。

能力边界：该部件适配 `mini` 系统类型，当前 rk3568 parts 清单未选入，目录存在不代表进入该产品。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 异常信息注册与采集 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/blackbox_lite:blackbox_lite` | `interfaces` |
| 重启原因和故障上下文保存 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `interfaces` |
| 平台适配与恢复后读取 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | 见 bundle Inner Kit/模块索引 | `interfaces` |

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
| [base/hiviewdfx/blackbox_lite/interfaces](../../../../../../base/hiviewdfx/blackbox_lite/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
kernel/platform fault hook -> blackbox adapter -> persistent fault record -> boot-time diagnosis
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| 无 bundle feature 声明 | - | 产品差异由 adapted system、GN 条件或上层产品配置决定 | bundle.json |

## 依赖与协作边界

- 上游：内核或设备适配层在故障路径写入异常信息，启动或诊断流程读取持久化记录。
- 系统部件依赖：`utils_lite`、`liteos_m`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | 无声明 | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 0 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | 由宿主进程验证 | 本次为静态分析，未执行真机测试 |

## 风险

- 异常上下文可重入性、掉电一致性、有限存储空间和平台适配差异。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/blackbox_lite/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/blackbox_lite/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
