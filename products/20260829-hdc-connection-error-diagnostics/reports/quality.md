# 质量验证报告：HDC 连接错误诊断

## 1. 验证基线

| 项目 | 值 |
|---|---|
| Source commit | `276162dd5159c2a7aae81c96f0c39e27d752428c` |
| Base commit | `7a47ffb4b74b8b44ebf801c98e352e020427ce06` |
| Branch | `feat/connection-error-diagnostics` |
| Unit suites | mapper/catalog 18；session lifecycle 2 |
| F/TC coverage | 14/14 features；30/30 pairs |

## 2. 功能与覆盖率

| 层级 | 覆盖方式 | 结果 |
|---|---|---|
| 目录与格式化 | 59 项唯一性、查找、短/详细格式、未知码和隐私字段 | Pass |
| 原生状态映射 | libuv、libusb、transfer status、POSIX、Win32、TLS、协议和 HDC state 表驱动 | Pass |
| Primary fault | 优先级、同优先级 first-fault、cancel/EOF 不覆盖根因 | Pass |
| 生命周期 | session 释放后保留、成功重连清理、daemon last fault | 2/2 Pass |
| 生产接入 | TCP、USB、UART、local channel/client 实际调用点编译与代表路径 | Pass |
| 可执行行 | `connection_error.cpp` | 274/274，100% |
| 反向有效性 | ACCESS→USB_IO 故意变异 | 测试按预期失败，恢复后通过 |

gcov 原始分支统计还包含 C++ 字符串构造、异常路径和短路编译器边，因此不将其解释为所有物理原因均已复现。质量结论限定为：错误目录全部可构造、mapper/state 决策均有注入数据、mapper 可执行行 100% 覆盖。

## 3. 构建验证

| 平台 | 验证 | 结果 |
|---|---|---|
| Linux x86_64 | OpenHarmony `clang_x64` 生成参数，完整 HDC host target | 编译/链接通过，`Ver: 3.2.0f` |
| Windows x86_64 | OpenHarmony MinGW 生成参数，受影响 TU `-Werror` | 9/9 编译通过 |
| Windows x86_64 | SDK 原始链接参数 + 最终 PR 对象 | PE32+ 完整链接通过，`Ver: 3.2.0f` |
| UART optional | `HDC_SUPPORT_UART` | 编译通过 |

Windows 运行产物校验：

- `hdc.exe` SHA-256：`150474d14f39c32cbce481ca3c490fe3cb5efe08f46bf55af240dc46627ee975`
- `libusb_shared.dll` SHA-256：`6604cfc9f4d7e85d8127e651f61ab5279376cc759f0bebfa8dc24a6c4ef32f26`
- PE imports 包含配套 `libusb_shared.dll`；二进制包含 TCP refused、TLS handshake、USB access denied 等新增诊断文本。

## 4. CLI 代表路径

| 场景 | 预期输出 | 结果 |
|---|---|---|
| TCP refused | `[Fail][E001101] TCP connection was refused` | Pass |
| 指定 target 不存在 | `[Fail][E001006] Specified target was not found` | Pass |
| UART key 非法 | `[Fail][E001400] UART connect key is invalid` | Pass |
| USB backend 初始化失败 | `[Fail][E001201] USB backend initialization failed` | Pass |

## 5. CI 门禁

DCP runlist `6a9270b764650f998b565dc9` 完成，以下直接任务通过：

- `dayu600_7885` build
- `ohos-host_mini_tdd`
- `dayu200_tdd`
- `ohos-sdk`
- `hap_build`
- `dayu200` build/test
- `x86_64_virt`
- docs format 与 code check

PR 最终标签包含“DCO检查成功”“编译成功”。无日志的 `master_inner_build` 聚合失败按现行门禁定义忽略，不覆盖直接任务及 PR 标签结论。

## 6. 残余风险

- Windows/macOS USB 驱动差异需要实际主机抽样。
- 真实 UART 设备、线缆、供电、Hub 和 EMI 场景需要 HIL。
- 软件测试只断言可观测 native/status 事实，不承诺识别不可观测的物理根因。
- CLI 进程退出码分类及新的公开 verbose 开关不在本次兼容范围。
