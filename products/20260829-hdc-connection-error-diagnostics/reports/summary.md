# 上库汇总报告：HDC 连接错误诊断

## 背景介绍

HDC 上位机 client 与 host 侧原有大量连接失败最终收敛为通用错误或文本，难以区分本机 server、target/session、TCP、USB、UART、TLS 和协议阶段。该变更建立稳定错误码目录、结构化故障对象和按原生状态映射的诊断链路，同时保持既有码值及 host–hdcd 线协议兼容。

## 设计思路

- 建立 59 项稳定错误目录，显式维护 code、symbol、message、retryable 和 priority。
- 以 `ConnectionFault` 保存 stable code、stage、transport、native domain/code。
- 根据 libuv、libusb、USB transfer、POSIX、Win32、TLS、协议和 HDC 状态进行纯函数映射。
- 采用 primary-fault 选择规则，避免 EOF、cancel 和释放阶段错误覆盖首个确定根因。
- 在 client retry、channel/session、daemon target map 生命周期中按值传播故障。
- 默认 CLI 仅输出稳定码和安全短消息，不输出 token、payload、完整序列号或未经白名单允许的路径。

## 修改概要

- 新增 `src/host/connection_error.{h,cpp}`。
- 接入 `client`、`channel`、`tcp`、`host_tcp`、`host_usb`、`host_uart`、`server` 和 `server_for_client`。
- 更新 GN 构建和 host 单元测试目标。
- 新增 mapper/catalog 测试和 session 生命周期组件测试。
- 最终提交修改 21 个文件，新增 2231 行、删除 328 行。

## 需求与用例追踪

- 功能点：F-001～F-014，共 14 项。
- 测试用例：TC-001～TC-022，其中 30 组 F/TC pair 进入强制矩阵。
- 每个 F-xxx 至少映射一个 TC-xxx。
- 每组矩阵关系均由 `tasks.md` 声明，并在 `apply-report.md` 中记录 Pass 证据。
- 发布副本运行 `workflow/validate-change.ps1` 再验证通过。

## 验证结果

| 验证项 | 结果 |
|---|---|
| Catalog/mapper 单元测试 | 18/18 Pass |
| Session 生命周期组件测试 | 2/2 Pass |
| Mapper 可执行行覆盖 | 274/274，100% |
| 变异验证 | 故意将 ACCESS 映射为 USB_IO 后测试失败，恢复后通过 |
| Linux/OpenHarmony host 构建 | 完整 49 个 TU 编译、链接及 `hdc -v` 通过 |
| Windows MinGW | 9 个受影响 TU 以生成构建参数 `-Werror` 编译通过；完整 PE 链接通过 |
| CLI 代表分支 | E001101、E001006、E001400、E001201 均命中预期输出 |
| AR pair validator | 14 个功能点、30 组关系全部通过 |
| OpenHarmony PR 门禁 | DCO 成功、编译成功 |

## 上库结果

- 源提交：`276162dd5159c2a7aae81c96f0c39e27d752428c`
- Change-Id：`I7601033ddeb09e6244773375bac3f0522da770a3`
- PR：[!2514](https://gitcode.com/openharmony/developtools_hdc/merge_requests/2514)
- Issue：[#1955](https://gitcode.com/openharmony/developtools_hdc/issues/1955)
- DCP runlist：`6a9270b764650f998b565dc9`

直接构建/测试门禁均通过，PR 获得“DCO检查成功”“编译成功”标签。`master_inner_build` 聚合项曾返回无流水线日志的 `failed`，按门禁规则不属于该 PR 的有效直接门禁，未阻塞编译成功结论。

## 构造边界

59 项错误目录构造、所有纯 mapper/state 分支和传播规则均可由自动化测试构造。真实线缆、供电、Hub、EMI、设备重启等物理根因不能由软件稳定复现，应通过 HIL 验证主机可观测事实，而不能把推断包装成确定物理诊断。
