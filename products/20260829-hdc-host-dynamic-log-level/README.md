# HDC host server 动态日志级别

本归档记录 HDC host server 运行态日志级别控制需求的完整 AR 闭环：需求澄清、架构与性能分析、流程图、测试设计、代码修改逻辑、真实构建/运行验证，以及上游 PR 状态。

## 归档状态

| 项目 | 状态 |
|---|---|
| AR workflow | Completed |
| F/TC 追踪 | 6/6 功能点覆盖，14/14 F-TC pair 通过 |
| Linux/Windows host 构建 | Pass |
| host 单测目标与受影响测试对象 | Pass |
| 隔离 server e2e | Pass |
| 上游 PR | Open，等待评审；DCO/编译/静态检查/冒烟测试成功 |

## 产物导航

| 产物 | 内容 |
|---|---|
| [AR_design.md](AR_design.md) | 完整架构方案、控制流/热路径流程图、数据与并发模型、性能方案比较、代码修改逻辑、风险与回滚 |
| [ar.md](ar.md) | 需求规格、功能点、边界条件、非功能要求 |
| [workflow/](workflow/) | AR 工作流 8 件套、F/TC 矩阵和可复用校验器 |
| [reports/summary.md](reports/summary.md) | 实现与上库汇总 |
| [reports/quality.md](reports/quality.md) | 构建、功能、安全、性能和残余风险报告 |
| [reports/pr_description.md](reports/pr_description.md) | PR 描述归档 |
| [manifest_summary.md](manifest_summary.md) | 脱敏哈希与外部验证锚点 |

## 用户接口

```text
hdc server loglevel          # 查询当前 host server 日志级别
hdc server loglevel 0        # 关闭日志
hdc server loglevel 4        # DEBUG
hdc server loglevel 6        # VERBOSE
```

命令只在 host server 本地处理，不依赖设备在线，不修改 host–hdcd 协议；取值仅接受 `0..6`，非法输入不改变状态。管理命令只接受 UDS 或 IPv4/IPv6 回环客户端，非回环访问 fail closed。

## 核心实现

1. 新增 host-local `CMD_SERVER_LOG_LEVEL`，完成帮助、解析、查询、设置和反馈。
2. 用 `std::atomic<uint8_t>` 保存进程级阈值，读写采用 `memory_order_relaxed`，消除多线程 data race 且不引入锁。
3. 把常见拒绝判断前移到 `WRITE_LOG` 调用点；日志被抑制时，参数不求值、不格式化、不分配、不访问文件。
4. `PrintLogEx` 保留防御性复检，覆盖并发降级窗口和潜在直接调用。
5. 修正 HDC 到 libusb 的级别映射，设置后同步活动 context，并在 USB callback 的复制、正则和脱敏前预过滤。

## 性能结论

本次方案针对最常见的 suppressed-log 路径，成本收敛为一次 relaxed atomic load、整数比较和分支。这比“全局普通变量 + 进入日志函数后判断”更安全，也避免了被抑制日志实参的隐性构造成本。

日志真正启用时，主要成本仍是格式化、时间/线程信息、字符串分配以及同步 `open/write/close`。更高吞吐方案应作为独立需求设计：有界 MPSC 队列、单消费者、批量写和持久文件描述符；必须同时定义队列满策略、崩溃刷新、轮转、退出和敏感数据语义，因此未混入本次最小变更。

## 上游锚点

- Source commit: `4804486da102698fad018d9c14c5838b3c420a70`
- Base commit: `7a47ffb4b74b8b44ebf801c98e352e020427ce06`
- PR: [openharmony/developtools_hdc !2515](https://gitcode.com/openharmony/developtools_hdc/merge_requests/2515)
- Issue: [openharmony/developtools_hdc #1956](https://gitcode.com/openharmony/developtools_hdc/issues/1956)

Windows x86-64 `hdc.exe` 未提交到文档仓；其 SHA-256 为 `8a495db0e5e53c8ad4587c5dd5caac533cad5bd71668aea67e4f2f5756ef8847`。
