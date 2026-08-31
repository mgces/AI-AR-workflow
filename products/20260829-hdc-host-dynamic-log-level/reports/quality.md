# 质量验证报告：HDC host server 动态日志级别

## 1. 验证基线

| 项目 | 值 |
|---|---|
| Source commit | `4804486da102698fad018d9c14c5838b3c420a70` |
| Base commit | `7a47ffb4b74b8b44ebf801c98e352e020427ce06` |
| Branch | `feat/host-dynamic-log-level` |
| F/TC coverage | 6/6 features；14/14 pairs |
| PR state | open / mergeable / waiting_for_review |

## 2. 功能与正确性

| 层级 | 覆盖方式 | 结果 |
|---|---|---|
| 命令解析 | query、`0..6`、非法值、双词命令、no-target | Pass |
| 运行态行为 | query → set → query → invalid → state unchanged → restore | Pass |
| 并发安全 | 四读线程/一写线程，10,000 次迭代；全仓 atomic 访问扫描 | Pass |
| 宏语义 | suppressed 参数 0 次求值；enabled 参数恰好 1 次 | Pass |
| libusb | 完整 0..6 映射、活动 context 更新、callback 前置过滤 | Pass |
| 安全边界 | UDS/回环放行，非回环 set 拒绝且状态不变 | Pass |
| 兼容性 | 原 `-l[0-6]`、级别值、daemon 协议、帮助内容 | Pass |

## 3. 构建与静态验证

| 平台/检查 | 结果 |
|---|---|
| OpenHarmony SDK Linux x86-64 host | hdc 链接通过 |
| OpenHarmony SDK Windows MinGW x86-64 host | hdc.exe 链接通过 |
| `hdc_host_base_unittest` | ARM64 测试目标链接通过 |
| 受影响 ext/host 测试对象 | 编译通过 |
| `git diff --check` | Pass |
| changed-line 静态规则预扫 | 无剩余新增问题 |
| PR 平台静态检查 | 成功标签 |

`hdc_ext_unittest` 完整聚合链接被旧测试的既有 unresolved references 阻塞；受影响对象和新增行为均通过独立可执行验证，因此不把该环境问题记为功能通过，也不把它误归因到本变更。

## 4. 性能分析

| 路径 | 本次成本/行为 | 判断 |
|---|---|---|
| suppressed log | 1 次 relaxed atomic load + compare + branch | 目标热路径；无分配、格式化、锁和文件访问 |
| enabled log | 参数求值 + 格式化 + timestamp/thread + 同步 sink | 主要剩余成本 |
| libusb suppressed callback | 在 `strdup`、regex、mask 前返回 | 避免第三方高频 DEBUG 的预处理开销 |
| 动态 set/query | 低频命令；原子更新 + 可选 libusb context 更新 | 非性能重点 |

没有用未执行的微基准伪造百分比收益。结构性结论是：当日志被关闭或降级时，本实现已把可避免成本移出调用路径；当日志大量启用时，后端同步 I/O 才是下一阶段优化重点。

更高吞吐备选为有界 MPSC 队列、单消费者、批量写、持久文件描述符。它会引入背压/丢弃、退出 drain、崩溃刷新、日志轮转和敏感数据驻留风险，需单独需求、容量模型与压力测试。

## 5. 安全与可靠性

- 命令不转发到设备，不改变 host–hdcd wire protocol。
- 只接受 UDS 或 IPv4/IPv6 回环 peer；peer 解析失败 fail closed。
- 非法值和未授权请求不修改运行态阈值。
- 动态级别不持久化，server 重启恢复现有启动配置，便于回滚和避免静默长期改变审计范围。
- 新实现不创建线程、锁、队列或无界资源。

## 6. Windows 产物

- 类型：PE32+ console executable，x86-64。
- 大小：5,761,536 bytes。
- SHA-256：`8a495db0e5e53c8ad4587c5dd5caac533cad5bd71668aea67e4f2f5756ef8847`。
- 构建目录与 Windows E 盘交付副本哈希一致。

二进制不进入 AR 文档仓，仅记录可复核哈希。

## 7. PR 门禁与残余风险

截至 2026-08-31，PR [!2515](https://gitcode.com/openharmony/developtools_hdc/merge_requests/2515) 为 open、mergeable，标签为：`dco检查成功`、`编译成功`、`静态检查成功`、`冒烟测试成功`、`waiting_for_review`。

残余风险：

- 并发切换允许个别日志观察旧阈值或新阈值，这是配置最终一致语义，不保证全线程瞬时栅栏。
- 运行时开启 DEBUG/VERBOSE 会恢复格式化和同步 I/O 成本，属于用户明确选择。
- libusb context 初始化/销毁窗口采用 best-effort 同步；新 context 初始化时读取当前 HDC level。
- 异步 sink 未纳入本 PR，不能把本次 suppressed-path 优化解释为高日志量 sink 吞吐提升。
