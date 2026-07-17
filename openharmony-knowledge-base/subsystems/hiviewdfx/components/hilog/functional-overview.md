# hilog 功能说明

> 本文由生成器基于当前源码、bundle、README、构建目标和运行配置生成；机器事实见 [完整模块索引](hiviewdfx-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

提供系统统一日志写入、过滤、缓存、读取、持久化和命令行控制能力。

native、NDK、Rust、ArkTS、ANI、Cangjie 及沙箱调用者写日志；hilog 工具和诊断服务读取日志。

能力边界：该部件适配 `standard` 系统类型，当前 rk3568 产品已选入。

## 核心能力

| 能力 | 功能说明 | 主要接口/目标 | 主要源码区域 |
| --- | --- | --- | --- |
| 多语言日志 API 与格式化 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hilog/services/hilogtool:hilog` | `interfaces` |
| hilogd 缓冲区和流控 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hilog/services/hilogd:hilogd` | `services` |
| 日志查询、过滤、清理与持久化 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hilog/interfaces/js:hilog_napi` | `frameworks` |
| 隐私格式与沙箱日志转发 | 负责该能力的输入校验、状态处理、结果输出及异常路径。 | `//base/hiviewdfx/hilog/interfaces/cj:cj_hilog_ffi` | `platform` |

## 对外与内部接口

| 接口/Kit | 调用者 | 数据或控制作用 | 头文件/IDL/API |
| --- | --- | --- | --- |
| `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hilog/log.h, hilog/log_c.h, hilog/log_cpp.h, hilog_trace.h |
| `//base/hiviewdfx/hilog/interfaces/cj:cj_hilog_ffi` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hilog/bundle.json |
| `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_base` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hilog_base/log_base.h |
| `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_snapshot` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hilog_snapshot/log_snapshot.h |
| `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_base_for_musl` | 系统部件/框架调用者 | 库接口与控制/数据交换 | hilog_base/log_base.h |
| `//base/hiviewdfx/hilog/interfaces/rust:hilog_rust` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hilog/bundle.json |
| `//base/hiviewdfx/hilog/frameworks/hilog_ndk:hilog_ndk` | 系统部件/框架调用者 | 库接口与控制/数据交换 | base/hiviewdfx/hilog/bundle.json |
| `//base/hiviewdfx/hilog/interfaces/sandbox_log:libsandboxlog` | 系统部件/框架调用者 | 库接口与控制/数据交换 | page_switch_log.h |

## 运行实体与生命周期

| 进程/SA/应用/插件 | 启动方式 | 运行职责 | 配置和权限 |
| --- | --- | --- | --- |
| `hilogd` (daemon) | init cfg | 提供系统统一日志写入、过滤、缓存、读取、持久化和命令行控制能力。 | base/hiviewdfx/hilog/services/hilogd/etc/hilogd.cfg；uid=logd；u:r:hilogd:s0 |
| `hilog` (command) | production executable | 提供系统统一日志写入、过滤、缓存、读取、持久化和命令行控制能力。 | base/hiviewdfx/hilog/services/hilogtool/BUILD.gn；uid=shell |

## 源码职责区

| 目录 | 职责 | 与其他区域的关系 |
| --- | --- | --- |
| [base/hiviewdfx/hilog/interfaces](../../../../../../base/hiviewdfx/hilog/interfaces) | 对外和内部接口定义 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hilog/services](../../../../../../base/hiviewdfx/hilog/services) | 服务、进程与启动实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hilog/frameworks](../../../../../../base/hiviewdfx/hilog/frameworks) | 框架和公共实现 | 与构建入口、接口、服务或测试协作 |
| [base/hiviewdfx/hilog/platform](../../../../../../base/hiviewdfx/hilog/platform) | 平台和系统服务适配 | 与构建入口、接口、服务或测试协作 |

## 关键调用链

```text
application/service log API -> socket/transport -> hilogd buffers -> hilog reader/persistence
```

## 产品功能开关

| Feature | 默认值/产品值 | 改变的行为 | 代码证据 |
| --- | --- | --- | --- |
| `hilog_native_feature_ohcore` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog/bundle.json) |
| `hilog_feature_support_usr_symlink` | bundle 未声明默认值 | 控制对应实现、接口、容量参数或插件是否参与构建/运行 | [bundle.json](../../../../../../base/hiviewdfx/hilog/bundle.json) |

## 依赖与协作边界

- 上游：native、NDK、Rust、ArkTS、ANI、Cangjie 及沙箱调用者写日志；hilog 工具和诊断服务读取日志。
- 系统部件依赖：`bounds_checking_function`、`c_utils`、`cJSON`、`ffrt`、`init`、`napi`、`zlib`、`runtime_core`。
- 三方依赖：无声明。
- bundle 依赖是部件级事实；运行时 IPC、动态加载和私有 GN 依赖需继续按具体目标核对。

## 测试与验证边界

| 测试类型 | 覆盖能力 | 构建/执行入口 | 缺口 |
| --- | --- | --- | --- |
| bundle 声明测试 | 公共接口、核心逻辑和异常路径 | `//base/hiviewdfx/hilog/test:hilog_unittest`、`//base/hiviewdfx/hilog/test:hilog_moduletest`、`//base/hiviewdfx/hilog/test:fuzztest` | 未声明不等于无测试，需查完整模块索引 |
| 静态识别测试目标 | 单元、模块、fuzz、系统或示例测试 | 13 个目标 | 动态模板目标可能漏计 |
| 产品运行验证 | 启动、权限、存储、并发和故障恢复 | `hilogd`、`hilog` | 本次为静态分析，未执行真机测试 |

## 风险

- 格式串与隐私标记、日志洪泛、环形缓冲并发、跨 UID 读取权限和启动早期日志。
- 产品裁剪、feature 覆写和依赖版本变化可能改变实际交付边界。
- 对包含 IPC、fd、PID、路径、回调或事件参数的入口，应继续做权限、输入校验和生命周期专项审查。

## 继续深入

- [完整构建索引](hiviewdfx-index.md)
- [bundle.json](../../../../../../base/hiviewdfx/hilog/bundle.json)
- [源码 README_zh](../../../../../../base/hiviewdfx/hilog/README_zh.md)
- 对持续演进的插件、协议、状态机和独立故障域继续拆分到 `capabilities/<domain>/features/<feature>/`。
