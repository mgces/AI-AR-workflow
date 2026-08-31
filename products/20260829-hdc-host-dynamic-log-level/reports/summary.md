# 上库汇总报告：HDC host server 动态日志级别

## 背景介绍

HDC host server 原有日志级别主要在进程启动时确定，运行中需要提高诊断详细度或关闭高频日志时必须重启。原实现使用普通全局变量保存阈值，并在进入 `PrintLogEx` 后才判断是否输出；这既不适合跨线程动态写入，也无法阻止被抑制日志的参数构造和脱敏处理。

## 设计思路

- 新增 `hdc server loglevel [0-6]` host-local 命令，支持无设备查询与即时设置。
- 日志阈值改为 `std::atomic<uint8_t>`，使用 relaxed 读写提供无锁、最终一致的运行态配置。
- 在 `WRITE_LOG` 调用点预过滤，保证 suppressed log 的参数不求值；函数内保留防御性复检。
- 将 HDC 级别稳定映射到 libusb，并同步活动 USB context。
- 限制管理命令为 UDS/回环客户端，避免 LAN listener 被远端用于关闭审计或放大日志资源消耗。
- 保持既有 `-l[0-6]`、级别编号、daemon wire protocol 和重启行为兼容；动态值不持久化。

## 修改概要

- common：日志原子状态、宏快速过滤、严格级别解析、命令编号与事件分类。
- host：CLI 解析与帮助、server 本地路由、peer 安全判断、libusb 映射/context 更新和 callback 预过滤。
- test：parser/边界/非法输入、原子并发、宏副作用、libusb 映射、帮助兼容和运行态安全 e2e。
- workflow：AR 8 件套、跨文件 F/TC 校验脚本和真实验证报告。
- 相对基线总计 29 个文件，新增 1348 行、删除 95 行；统计包含 workflow 文档与验证脚本。

## 需求与用例追踪

- 功能点：F-001～F-006，共 6 项。
- 测试用例：TC-001～TC-013，共 13 项。
- 强制矩阵：14 组 F/TC pair。
- 每个功能点至少映射一个测试用例；每组关系由开发任务声明，并在 `apply-report.md` 中记录 Pass 证据。
- 归档前再次运行 `python3 scripts/validate_change.py --change-dir specs/changes/20260829-requirement-add-host-dynamic-log-level`，结果为 `6 features, 13 tests, 14 pairs`。

## 验证结果

| 验证项 | 结果 |
|---|---|
| Linux x86-64 host hdc | Pass，ELF 成功链接 |
| Windows x86-64 host hdc | Pass，PE32+ 成功链接 |
| `hdc_host_base_unittest` 目标 | Pass，ARM64 OpenHarmony 测试二进制成功链接 |
| 受影响 ext/host 测试对象 | Pass，OpenHarmony 工具链编译成功 |
| 原子并发与宏副作用 host-native smoke | Pass |
| query/set/boundary/invalid 隔离 server e2e | Pass |
| 非回环管理命令拒绝 e2e | Pass |
| AR pair validator | 6/6 features，14/14 pairs Pass |
| OpenHarmony PR 门禁 | DCO、编译、静态检查、冒烟测试成功 |

完整 `hdc_ext_unittest` 聚合链接仍受未修改旧测试中的既有 unresolved references 阻塞。本变更没有新增这些引用；受影响测试对象已编译，新增原子/宏行为由可执行 smoke 覆盖，所有 F/TC pair 均有独立真实证据。

## 性能判断

动态命令是低频控制面，日志判断是高频数据面。suppressed path 仅执行一次 relaxed 原子读取、比较和分支，不进入格式化及 I/O；这是本需求收益最大的优化点。启用高详细度日志时，同步 sink 仍是主要成本，异步有界队列与批量写建议拆分为后续独立变更。

## 上库结果

- 源提交：`4804486da102698fad018d9c14c5838b3c420a70`
- PR：[!2515](https://gitcode.com/openharmony/developtools_hdc/merge_requests/2515)
- Issue：[#1956](https://gitcode.com/openharmony/developtools_hdc/issues/1956)
- DCP runlist：`6a92ad6f64650f998b6990d8`

截至 2026-08-31，PR 状态为 open、可合并并等待评审；已有 DCO、编译、静态检查和冒烟测试成功标签，未将其描述为已合入。
