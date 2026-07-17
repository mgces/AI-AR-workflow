# hiappevent 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

向应用提供行为、性能和故障事件打点接口，并管理事件写入、观察、存储与上报配置。

ArkTS、ANI、Cangjie、NDK 和 native 应用接口调用者写入应用事件或注册观察者。

能力边界：该部件适配 `standard` 系统类型，当前 rk3568 产品已选入。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 多语言应用事件 API | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiappevent/frameworks/native/libhiappevent:libhiappevent_base` | `interfaces` |
| 事件参数校验与编码 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiappevent/frameworks/native/ndk:hiappevent_ndk` | `frameworks` |
| 观察者、处理器与配置管理 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiappevent/frameworks/js/napi:hiappevent` | `interfaces` |
| 本地存储、导出和上报协作 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hiappevent/frameworks/js/napi:hiappevent_v9` | `frameworks` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hiappevent/interfaces/native/inner_api:hiappevent_innerapi` | 系统部件/框架调用者 | 库接口与控制/数据交换 | app_event.h, app_event_processor.h, app_event_processor_mgr.h, app_api_metric.h, base_type.h |
| `//base/hiviewdfx/hiappevent/frameworks/cj/ffi:cj_hiappevent_ffi` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hiappevent/bundle.json |
| `//base/hiviewdfx/hiappevent/frameworks/native/ndk:hiappevent_ndk` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hiappevent/hiappevent.h |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| 无独立进程 | 由调用方链接/装载或由相邻 DFX 服务调用 | 提供库、接口、插件或轻量框架能力 | 具体宿主由产品构建和调用方决定 |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hiappevent/interfaces](../../../../../../base/hiviewdfx/hiappevent/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hiappevent/frameworks](../../../../../../base/hiviewdfx/hiappevent/frameworks) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
application API -> language binding -> native event framework -> local store/observer -> Hiview or analytics consumer
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| 无 bundle feature 声明 | - | 产品差异由 adapted system、GN 条件或上层产品配置决定 | bundle.json |

## 依赖与协作边界

- 上游：ArkTS、ANI、Cangjie、NDK 和 native 应用接口调用者写入应用事件或注册观察者。
- 系统部件依赖：`ability_base`、`ability_runtime`、`api_metrics`、`bundle_framework`、`common_event_service`、`c_utils`、`eventhandler`、`ets_frontend`、`ffrt`、`hitrace`、`hilog`、`hicollie`、`hisysevent`、`init`、`ipc`、`napi`、`relational_store`、`resource_management`、`samgr`、`storage_service`、`jsoncpp`、`runtime_core`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | `//base/hiviewdfx/hiappevent/test:unittest` | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 16 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | 由宿主进程验证 | 本次为静态分析，未执行真机测试 |

## 风险

- 隐私数据与事件配额、应用生命周期、回调并发、磁盘占用和跨语言参数一致性。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hiappevent/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hiappevent/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
