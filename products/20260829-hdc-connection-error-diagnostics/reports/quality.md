# 质量验证报告：HDC 连接错误诊断

## 1. 验证基线

| 项目 | 值 |
|---|---|
| Source commits | `276162dd5159c2a7aae81c96f0c39e27d752428c`, `fe699bdfdced1cc08128737790a49b4fb76e3f96`, `2841ecd39bfe623466ce9b6019c241c106675d16` |
| Base commit | `7a47ffb4b74b8b44ebf801c98e352e020427ce06` |
| Branch | `feat/connection-error-diagnostics` |
| Unit suites | mapper/catalog/instance 23；session lifecycle 2 |
| F/TC coverage | 16/16 features；42/42 pairs |

## 2. 功能与覆盖率

| 层级 | 覆盖方式 | 结果 |
|---|---|---|
| 目录与格式化 | 61 项唯一性、查找、短/详细格式、未知码和隐私字段；原 59 项 snapshot | Pass |
| 原生状态映射 | libuv、libusb、transfer status、POSIX、Win32、TLS、协议和 HDC state 表驱动 | Pass |
| Primary fault | 优先级、同优先级 first-fault、cancel/EOF 不覆盖根因 | Pass |
| 生命周期 | session 释放后保留、成功重连清理、daemon last fault | 2/2 Pass |
| 生产接入 | TCP、USB、UART、local channel/client 实际调用点编译与代表路径 | Pass |
| 可执行行 | `connection_error.cpp` | 274/274，100% |
| 反向有效性 | ACCESS→USB_IO 故意变异 | 测试按预期失败，恢复后通过 |
| server 实例分类 | metadata round-trip/非法输入、PID 状态、7 组 endpoint 关系、action 格式 | Pass |
| server 实例传播 | 端口冲突、metadata 异常、成功清候选、旧版 missing、原 E002110 | Pass |

gcov 原始分支统计还包含 C++ 字符串构造、异常路径和短路编译器边，因此不将其解释为所有物理原因均已复现。质量结论限定为：错误目录全部可构造、mapper/state 决策均有注入数据、mapper 可执行行 100% 覆盖。

## 3. 构建验证

| 平台 | 验证 | 结果 |
|---|---|---|
| Linux x86_64 | OpenHarmony `clang_x64` 生成参数，完整 HDC host target | 编译/链接通过，`Ver: 3.2.0f` |
| Windows x86_64 | OpenHarmony MinGW 生成参数，完整 HDC target `-Werror` | 50/50 编译、链接、strip 通过 |
| Windows x86_64 | `E:\temp\hdc.exe -v` | PE32+，`Ver: 3.2.0f` |
| UART optional | `HDC_SUPPORT_UART` | 编译通过 |

Windows 运行产物校验：

- `hdc.exe` SHA-256：`bf7263ce51ce40efb901b99489b82284b10ac330e466ce32d1d3003df9446056`
- `libusb_shared.dll` SHA-256：`6604cfc9f4d7e85d8127e651f61ab5279376cc759f0bebfa8dc24a6c4ef32f26`
- PE imports 包含配套 `libusb_shared.dll`；二进制包含 TCP refused、TLS handshake、USB access denied 等新增诊断文本。

## 4. CLI 代表路径

| 场景 | 预期输出 | 结果 |
|---|---|---|
| TCP refused | `[Fail][E001101] TCP connection was refused` | Pass |
| 指定 target 不存在 | `[Fail][E001006] Specified target was not found` | Pass |
| UART key 非法 | `[Fail][E001400] UART connect key is invalid` | Pass |
| USB backend 初始化失败 | `[Fail][E001201] USB backend initialization failed` | Pass |
| server `8711` / client `8710` | `[E002116] ... reason=port_mismatch ...` | Pass |
| metadata 非法 + connect failed | `[E002117] ... reason=metadata_invalid ...` | Pass |
| metadata 非法 + HDC handshake success | 不输出 `E002117` | Pass |
| 旧 server 缺少 `.info` | 不输出新码，继续旧路径 | Pass |

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

当前 head `2841ecd` 的 DCP runlist `6a94f16b64650f998bf679aa` 已以 0 问题通过 codeCheck，除 `hap_build` 及其聚合项外的直接构建/测试目标均成功。失败项重试 runlist `6a94ff1764650f998bfbe531` 再次成功链接 `clang_x64/developtools/hdc/hdc`，随后在 Contacts HAP 的 Hvigor SDK 管理模式校验重复报错 `The SDK management mode has changed`；日志未显示 HDC 编译错误。

## 6. 残余风险

- Windows/macOS USB 驱动差异需要实际主机抽样。
- 真实 UART 设备、线缆、供电、Hub 和 EMI 场景需要 HIL。
- 软件测试只断言可观测 native/status 事实，不承诺识别不可观测的物理根因。
- CLI 进程退出码分类及新的公开 verbose 开关不在本次兼容范围。
