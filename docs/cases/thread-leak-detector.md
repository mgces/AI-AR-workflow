# 案例：线程泄漏检测

> hiview 插件新增线程阈值检测——来自 `products/20260707-thread-leak-detector/`。

## 背景

OpenHarmony 研发中，线程泄漏是常见可靠性问题：应用创建线程后未正确释放，导致线程数累积、资源占用、最终可能崩溃或卡死。需要一种机制在阈值超过时触发一次维测抓取，保留现场用于事后分析。

## 目标

在 `base/hiviewdfx/hiview` 下面新增一个线程泄漏检测插件：

- 阈值 3000
- 超过 3000 阈值后**只触发一次**调用
- 调用 `hidumper sa` 的能力获取（类似 `hidumper -p <pid> --thread` 的维测）进程线程维测
- 然后通过 `LogCatcherUtils::DumpStacktrace` 抓取当前应用调用栈
- 并保存一份线程泄漏文件在 `data/log/reliability/resource_leak/thread_leak/` 中

## 方案

### 流程使用情况

这是一个端到端新增功能开发，走完整 P0~P8 流水线：

| 阶段 | 做什么 |
|---|---|
| P0 | 校验 hiview 部件环境就绪 |
| P1 | 设计插件结构：阈值检测 + 一次触发 + hidumper sa 调用 + LogCatcherUtils 抓栈 + 文件落盘 |
| P2 | 用 `ohos-code-skeletons` 取 hiview 插件骨架，写 C++ 代码 |
| P3 | 生成单测：阈值触发逻辑、一次触发保证、调用栈抓取 |
| P4 | 编译 `hiview_package` |
| P5 | 单测执行 |
| P6 | 真机部署插件，scenario 制造线程泄漏，hilog 抓 marker |
| P7 | 覆盖率/性能/功耗/稳定性 + review |
| P8 | 上库：commit → PR → CI |

### 产物

- `products/20260707-thread-leak-detector/ar.md` — 脱敏 AR 原文
- `products/20260707-thread-leak-detector/README.md` — 案例说明
- `products/20260707-thread-leak-detector/manifest_summary.md` — 证据账本脱敏摘要

> 原始可验签证据留在本地 run-state 目录（已 gitignore），含真实设备序列号与个人 `$HOME` 路径，禁止入仓。

## 经验

- **一次触发的状态管理**：需用原子标志位保证阈值超过后只触发一次，避免重复抓栈
- **hidumper sa 调用**：通过 shell 命令调用 hidumper sa 能力，注意权限与返回处理
- **文件落盘路径**：`data/log/reliability/resource_leak/thread_leak/` 需确保目录存在与权限
- **真机 scenario**：制造线程泄漏需要在真机上跑真实应用，scenario 要能触发并等待阈值超过

## 延伸阅读

- [新增功能端到端示例](/examples/new-feature-end-to-end) — 通用端到端流程
- [P6 真机功能阶段](/workflow/phase-6-device) — 真机 scenario 与 marker 思路
- [根 README 示例 AR](https://atomgit.com) — 本案例的 AR 原文出处
