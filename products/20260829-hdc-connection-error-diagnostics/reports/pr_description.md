## 背景介绍

HDC client/host 的本机 server、target/session、TCP、USB 和 UART 连接失败存在大量通用错误聚合，用户通常只能看到 connect failed 或 generic I/O，定位权限、拒绝、超时、拔出、协议或状态错位需要反复抓日志。

## 设计思路

1. 新增 61 项稳定错误目录和 `ConnectionFault` 结构；原有 59 项规格不变。
2. 将 libuv、libusb、USB callback、POSIX、Win32、TLS、协议和 HDC state 映射为稳定码。
3. 采用 primary-fault 规则防止清理错误覆盖真实根因。
4. 在 client retry、channel/session、daemon target map 中传播最近故障。
5. 默认输出保持隐私安全，不修改 host–hdcd 线协议和既有码值。
6. server ready 后原子记录 active endpoint；client 发现已有实例时，明确端口/类型冲突输出 `E002116`，实例状态异常统一输出 `E002117`。

## 修改概要

- 新增 `connection_error.{h,cpp}` 及 GN 构建接入。
- 修改 client/channel/TCP/USB/UART/server 生产调用点。
- 新增 catalog/mapper 和 session 生命周期测试。
- 新增 `server_instance.{h,cpp}` 及 metadata/endpoint 分类和真实进程分支测试。
- 三个提交相对基线共 24 个文件，新增 2858 行、删除 339 行。

## 用例概要

- 23 个 catalog/mapper/实例分类单元测试。
- 2 个 session 生命周期组件测试。
- 274/274 mapper 可执行行覆盖。
- 42 组 F/TC 追踪关系校验。
- Linux/Windows 各 50 个 HDC TU 完整构建、链接和版本冒烟。
- TCP refused、missing target、invalid UART key、USB backend 四类隔离 CLI 验证。
- 映射变异测试证明测试可以发现错误分支回归。
- server 非默认端口冲突、metadata 异常、成功清候选、旧 server missing 和原 E002110 反例通过。

## 用例结果总结

所有软件可构造目录、mapper/state/实例分类分支和代表性传播路径均通过。当前 head `2841ecd39bfe623466ce9b6019c241c106675d16` 已更新 OpenHarmony PR [!2514](https://gitcode.com/openharmony/developtools_hdc/merge_requests/2514)，关联 Issue 为 [#1955](https://gitcode.com/openharmony/developtools_hdc/issues/1955)，codeCheck 为 0 问题。物理线缆、供电、Hub、EMI 和设备重启保留为 HIL 验证项。
