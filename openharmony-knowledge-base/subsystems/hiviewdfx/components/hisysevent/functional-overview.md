# hisysevent 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

提供系统级结构化事件的定义、参数校验、写入、订阅和查询能力，是系统可观测数据的统一入口。

系统服务通过 native/Rust/ArkTS/ANI 接口写事件，Hiview 和管理接口消费、订阅或查询事件。

能力边界：该部件适配 `standard` 系统类型，当前 rk3568 产品已选入。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 事件 schema 与代码生成 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent:libhisysevent` | `interfaces` |
| 多语言事件写入和校验 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager:libhisyseventmanager` | `frameworks` |
| 事件订阅/查询管理 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hisysevent/interfaces/js/kits:hisysevent_napi_ref` | `adapter` |
| IPC 传输及落盘协作 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hisysevent/interfaces/rust/innerkits:hisysevent_rust` | `interfaces` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent:libhisysevent` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hisysevent_c.h, hisysevent.h |
| `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_easy:libhisysevent_easy` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hisysevent_easy.h |
| `//base/hiviewdfx/hisysevent/interfaces/native/innerkits/hisysevent_manager:libhisyseventmanager` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hisysevent_manager_c.h, hisysevent_manager.h |
| `//base/hiviewdfx/hisysevent/interfaces/rust/innerkits:hisysevent_rust` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hisysevent/bundle.json |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| `hisysevent` (command) | production executable | 提供系统级结构化事件的定义、参数校验、写入、订阅和查询能力，是系统可观测数据的统一入口。 | base/hiviewdfx/hisysevent/frameworks/native/BUILD.gn；uid=shell |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hisysevent/interfaces](../../../../../../base/hiviewdfx/hisysevent/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hisysevent/frameworks](../../../../../../base/hiviewdfx/hisysevent/frameworks) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hisysevent/adapter](../../../../../../base/hiviewdfx/hisysevent/adapter) | 平台和系统服务适配 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
system service -> HiSysEvent API/schema -> transport -> Hiview sysevent source/store -> query/listener
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| `hisysevent_feature_support_usr_symlink` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hisysevent/bundle.json) |

## 依赖与协作边界

- 上游：系统服务通过 native/Rust/ArkTS/ANI 接口写事件，Hiview 和管理接口消费、订阅或查询事件。
- 系统部件依赖：`access_token`、`bounds_checking_function`、`c_utils`、`ets_frontend`、`hilog`、`hitrace`、`ipc`、`jsoncpp`、`libuv`、`napi`、`node`、`safwk`、`samgr`、`storage_service`、`runtime_core`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | `//base/hiviewdfx/hisysevent/test:moduletest`、`//base/hiviewdfx/hisysevent/test:unittest`、`//base/hiviewdfx/hisysevent/test:fuzztest` | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 22 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | `hisysevent` | 本次为静态分析，未执行真机测试 |

## 风险

- schema 兼容、敏感字段、事件洪泛、IPC 调用者校验、订阅回调生命周期。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hisysevent/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hisysevent/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
