# 上库汇总报告：HDC 连接错误诊断

## 背景介绍

HDC 上位机 client 与 host 侧原有大量连接失败最终收敛为通用错误或文本，难以区分本机 server、target/session、TCP、USB、UART、TLS 和协议阶段。该变更建立稳定错误码目录、结构化故障对象和按原生状态映射的诊断链路，同时保持既有码值及 host–hdcd 线协议兼容。

## 设计思路

- 建立 61 项稳定错误目录，显式维护 code、symbol、message、retryable 和 priority；原有 59 项逐项保持不变。
- 以 `ConnectionFault` 保存 stable code、stage、transport、native domain/code。
- 根据 libuv、libusb、USB transfer、POSIX、Win32、TLS、协议和 HDC 状态进行纯函数映射。
- 采用 primary-fault 选择规则，避免 EOF、cancel 和释放阶段错误覆盖首个确定根因。
- 在 client retry、channel/session、daemon target map 生命周期中按值传播故障。
- 默认 CLI 仅输出稳定码和安全短消息，不输出 token、payload、完整序列号或未经白名单允许的路径。
- 用版本化 `.HDCServer.info` 描述 active endpoint；requested/active 明确冲突输出 `E002116`，实例元数据/PID 异常在真实连接失败后输出 `E002117`。

## 修改概要

- 新增 `src/host/connection_error.{h,cpp}`。
- 接入 `client`、`channel`、`tcp`、`host_tcp`、`host_usb`、`host_uart`、`server` 和 `server_for_client`。
- 更新 GN 构建和 host 单元测试目标。
- 新增 mapper/catalog 测试和 session 生命周期组件测试。
- 新增 `server_instance.{h,cpp}`、实例元数据/endpoint 分类测试和进程级兼容反例。
- 三个实现提交相对基线共修改 24 个文件，新增 2858 行、删除 339 行。

## 需求与用例追踪

- 功能点：F-001～F-016，共 16 项。
- 测试用例：TC-001～TC-028，其中 42 组 F/TC pair 进入强制矩阵。
- 每个 F-xxx 至少映射一个 TC-xxx。
- 每组矩阵关系均由 `tasks.md` 声明，并在 `apply-report.md` 中记录 Pass 证据。
- 发布副本运行 `workflow/validate-change.ps1` 再验证通过。

## 验证结果

| 验证项 | 结果 |
|---|---|
| Catalog/mapper/实例分类单元测试 | 23/23 Pass |
| Session 生命周期组件测试 | 2/2 Pass |
| Mapper 可执行行覆盖 | 274/274，100% |
| 变异验证 | 故意将 ACCESS 映射为 USB_IO 后测试失败，恢复后通过 |
| Linux/OpenHarmony host 构建 | 完整 50 个 TU 编译、链接及 `hdc -v` 通过 |
| Windows MinGW | 完整 50 个 TU 以生成构建参数 `-Werror` 编译、链接、strip 和 Windows 版本冒烟通过 |
| CLI 代表分支 | E001101、E001006、E001400、E001201 均命中预期输出 |
| server 实例分支 | E002116、E002117、成功清候选、缺元数据降级和原 E002110 均通过 |
| AR pair validator | 16 个功能点、42 组关系全部通过 |
| OpenHarmony PR 门禁 | 当前 head codeCheck 通过（0 问题），HDC/直接目标成功；总门禁被重复出现的 Contacts HAP SDK 环境故障阻断 |

## 上库结果

- 源提交：`276162dd5159c2a7aae81c96f0c39e27d752428c`
- 补充提交：`fe699bdfdced1cc08128737790a49b4fb76e3f96`
- 代码检查整改提交/当前 head：`2841ecd39bfe623466ce9b6019c241c106675d16`
- Change-Id：`I7601033ddeb09e6244773375bac3f0522da770a3`
- PR：[!2514](https://gitcode.com/openharmony/developtools_hdc/merge_requests/2514)
- Issue：[#1955](https://gitcode.com/openharmony/developtools_hdc/issues/1955)
- 当前 DCP runlist：`6a94f16b64650f998bf679aa`
- 失败项重试 runlist：`6a94ff1764650f998bfbe531`

当前 head 的 codeCheck 已以 0 问题通过，主轮中的 `dayu600_7885`、`ohos-host_mini_tdd`、`dayu200_tdd`、`ohos-sdk`、`dayu200`（含测试）和 `x86_64_virt` 均成功。失败项重试再次成功编译/链接 HDC，随后仍在 Contacts HAP 的 SDK 管理模式校验失败；该重复外部故障未触发 HDC 源码改动。

## 构造边界

61 项错误目录构造、所有纯 mapper/state/实例分类分支和传播规则均可由自动化测试构造。真实线缆、供电、Hub、EMI、设备重启等物理根因不能由软件稳定复现，应通过 HIL 验证主机可观测事实，而不能把推断包装成确定物理诊断。
