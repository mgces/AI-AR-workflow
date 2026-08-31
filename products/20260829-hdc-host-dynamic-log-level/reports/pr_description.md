## 背景介绍

HDC host server 原有日志级别主要在启动时确定，运行中调整需要重启；普通全局阈值也不适合命令线程写、日志线程读。阈值判断位于日志函数内部时，被抑制日志的参数仍会先求值，带来字符串构造、脱敏和格式化前置成本。

## 设计思路

1. 新增 `hdc server loglevel [0-6]` host-local 查询/设置命令。
2. 用 relaxed `std::atomic<uint8_t>` 保存进程级阈值，消除 data race 且不引入锁。
3. 在 `WRITE_LOG` 调用点过滤 suppressed log，函数内保留防御性复检。
4. 修正并同步 libusb 日志级别，callback 在复制、正则和脱敏前预过滤。
5. 管理命令仅允许 UDS/IPv4/IPv6 回环客户端，非回环和 peer 查询失败均拒绝。

## 修改概要

- 增加命令 ID、帮助、双词命令解析、host-local 路由和 old→new 反馈。
- 增加严格 `0..6` 解析、级别名称和原子 Get/Set/IsLoggable 接口。
- 更新日志宏、`PrintLogEx`、libusb 映射/context 和 USB callback。
- 新增 parser、边界、异常、并发、宏副作用、libusb、帮助、构建及安全 e2e 覆盖。

## 用例概要

- 6 个功能点、13 个测试用例、14 组 F/TC pair。
- Linux/Windows host 构建和 `hdc_host_base_unittest` 目标链接。
- 受影响测试对象编译与 host-native 原子/宏 smoke。
- 隔离 server query/set/invalid/restore 流程。
- LAN listener 的非回环管理请求拒绝验证。
- `git diff --check`、原子访问扫描和 AR pair validator。

## 用例结果总结

所有 14 组 F/TC pair 均有真实 Pass 证据。Windows `hdc.exe` 为 PE32+ x86-64，SHA-256 为 `8a495db0e5e53c8ad4587c5dd5caac533cad5bd71668aea67e4f2f5756ef8847`。PR [!2515](https://gitcode.com/openharmony/developtools_hdc/merge_requests/2515) 已获得 DCO、编译、静态检查和冒烟测试成功标签，关联 Issue 为 [#1956](https://gitcode.com/openharmony/developtools_hdc/issues/1956)，当前等待评审。
