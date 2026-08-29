## 背景介绍

HDC client/host 的本机 server、target/session、TCP、USB 和 UART 连接失败存在大量通用错误聚合，用户通常只能看到 connect failed 或 generic I/O，定位权限、拒绝、超时、拔出、协议或状态错位需要反复抓日志。

## 设计思路

1. 新增 59 项稳定错误目录和 `ConnectionFault` 结构。
2. 将 libuv、libusb、USB callback、POSIX、Win32、TLS、协议和 HDC state 映射为稳定码。
3. 采用 primary-fault 规则防止清理错误覆盖真实根因。
4. 在 client retry、channel/session、daemon target map 中传播最近故障。
5. 默认输出保持隐私安全，不修改 host–hdcd 线协议和既有码值。

## 修改概要

- 新增 `connection_error.{h,cpp}` 及 GN 构建接入。
- 修改 client/channel/TCP/USB/UART/server 生产调用点。
- 新增 catalog/mapper 和 session 生命周期测试。
- 21 个文件，新增 2231 行、删除 328 行。

## 用例概要

- 18 个 catalog/mapper 单元测试。
- 2 个 session 生命周期组件测试。
- 274/274 mapper 可执行行覆盖。
- 30 组 F/TC 追踪关系校验。
- Linux 完整 target、Windows MinGW、UART optional 构建。
- TCP refused、missing target、invalid UART key、USB backend 四类隔离 CLI 验证。
- 映射变异测试证明测试可以发现错误分支回归。

## 用例结果总结

所有软件可构造目录、mapper/state 分支和代表性传播路径均通过。OpenHarmony PR [!2514](https://gitcode.com/openharmony/developtools_hdc/merge_requests/2514) 已获得 DCO 成功与编译成功标签，关联 Issue 为 [#1955](https://gitcode.com/openharmony/developtools_hdc/issues/1955)。物理线缆、供电、Hub、EMI 和设备重启保留为 HIL 验证项。
