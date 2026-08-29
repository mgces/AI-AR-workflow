# Requirement Spec

## 1. Summary

- Change: `20260829-requirement-add-hdc-connection-error-diagnostics`
- Requirement type: `requirement-add`
- One sentence: 为 HDC 上位机连接链路提供稳定、可传播、可自动化验证且兼容既有码的细分错误诊断。

## 2. Terms

| Term | Definition |
|------|------------|
| stable code | 对外稳定的六位十六进制错误编号，例如 `E001202` |
| native code | libuv、libusb、errno、Win32 或 transport callback 的平台原始状态 |
| stage | 错误发生阶段，如参数、server 启动、本机 channel、transport connect、handshake、active I/O |
| primary fault | 同一连接 attempt 中最能表达首个确定根因、不会被清理错误覆盖的故障 |
| legacy fallback | 为兼容保留、仅在无法细分时使用的通用错误码 |

## 3. Functional Points

| Feature ID | Name | User Value | Input | Output | Business Rules | Acceptance Criteria |
|------------|------|------------|-------|--------|----------------|---------------------|
| F-001 | 稳定错误码目录 | 错误编号可检索、可长期解析 | 59 个现有/建议错误码 | 唯一的 code/symbol/message/retryable 描述 | 显式十六进制赋值；既有码不改义；未知编号有安全兜底 | 全部编号和 symbol 唯一；格式固定为六位；59 项均可查询 |
| F-002 | 结构化连接故障 | 调试信息不再只剩字符串 | code、stage、transport、native domain/code | `ConnectionFault` | 默认无错误；detail 不含 payload/secret；结构可按值复制 | 构造、格式化、脱敏和无错误路径测试通过 |
| F-003 | 主错误优先级 | 清理回调不覆盖真正根因 | 当前 fault、候选 fault | 选定 primary fault | 参数/认证/确定不可重试/open/终态/protocol/timeout/I/O/fallback 依序；cancel 清理不得覆盖 | 所有优先级和 first-fault 反例通过 |
| F-004 | 本机 server/channel 映射 | 区分 server 未起、端口、权限、超时和协议问题 | process/libuv/channel 状态 | `E002103/E002107～E002115` 或 `E002106` | 阶段参与映射；同一 native code 在 bind/connect/I/O 可得到不同码 | 表驱动 mapper 和本机 channel 集成测试通过 |
| F-005 | target/session 映射 | 区分未找到、多目标、offline 和内部状态错位 | connectKey、target 数量、状态、session、handshake | `E001006～E001013` 或暂态 `E000004` | 认证错误优先；specified-not-found 与 no-target 不混淆；deadline 前后不同 | 正常、边界、状态错位和超时测试通过 |
| F-006 | TCP 映射 | 区分拒绝、超时、不可达、reset、协议、TLS 和 I/O | libuv/TLS/协议状态及 stage | `E001100/E001104/E001101～E001111` | 参数错误复用既有码；连接后 EOF/reset 不得分类成 connect refused | 全部 native/state 分支表驱动测试通过 |
| F-007 | USB 映射 | 区分后端、权限、占用、描述符、拔出、timeout、STALL、overflow 和 I/O | libusb API 返回值、transfer status、枚举事件 | `E001201～E001213` | submit 返回值与 callback status 分开；主动 cancel 不报错；无候选设备不误报 interface-not-found | 全部 libusb/transfer 分支及误报反例通过 |
| F-008 | UART 映射 | 区分 key、端口、权限、占用、配置、无响应、完整性、断开和 I/O | POSIX/Win32 native 状态、UART protocol 状态 | `E001400～E001408` | 可选构建也必须有 mapper 单测；Win32/POSIX 同事实同 stable code | 全部 UART 映射和跨平台参数化测试通过 |
| F-009 | session 故障传播 | target/session 释放后仍能定位最近失败 | transport fault、session 生命周期 | session fault、daemon last fault、CLI fault | fault 按值复制；成功重连清理陈旧 fault；并发只发布一次根因 | 生命周期、并发和状态错位测试通过 |
| F-010 | client 本机连接传播 | client 能看到 local connect 的真实原因 | libuv connect callback、重试耗尽 | `[E0021xx]` CLI 错误 | callback 必须保存 status；最终重试输出最后稳定码；成功清理失败状态 | refused/timeout/UDS missing/closed 测试通过 |
| F-011 | host transport 接入 | TCP/USB/UART 实际 call site 使用 mapper | transport callback/API return | 结构化 fault 和兼容文本 | 测试从 native 条件注入，不允许直接注入最终 code 证明 mapper | TCP、USB、UART 组件测试通过 |
| F-012 | CLI 与 target 诊断输出 | 用户获得稳定码和可执行事实 | `ConnectionFault`、list targets 详细模式 | 短格式/详细格式 | 成功输出不变；默认不暴露完整序列号、路径、payload、token | golden、隐私和兼容测试通过 |
| F-013 | legacy 和协议兼容 | 老版本及脚本不会因线协议变化失效 | 旧码、旧 server/hdcd 行为 | legacy fallback | `E001003/E001005/E002106` 仅未知条件使用；不修改 host–hdcd 协议 | 既有码数值测试、fallback 负例和版本组合测试通过 |
| F-014 | 可追踪验证与资料 | 维护者能证明每个功能和错误分支有效 | F/TC 矩阵、执行命令、错误目录 | 测试报告和参考资料 | 每个 F/TC 对有真实 Pass；每个 code 至少一个检测源用例；多来源 code 逐来源展开 | AR validator、构建、单测和文档一致性检查通过 |

## 4. Boundary Conditions

| Feature ID | Boundary | Expected Behavior |
|------------|----------|-------------------|
| F-001 | 未知 code | 返回 `UNKNOWN_ERROR` 描述，不抛异常、不越界 |
| F-003 | 当前为确定根因，随后收到 EOF/cancel | 保留当前根因，只把清理事件作为日志上下文 |
| F-004 | `UV_EACCES` 出现在 bind 与 connect 不同阶段 | 根据 stage 分别映射 server 权限或对应连接兜底 |
| F-005 | target 显示 connected，但 session 为 null/dead | 返回 `E001009`，不得静默成功或返回 no target |
| F-005 | handshake 未完成 | deadline 前 `E000004`，deadline 后 `E001010` |
| F-006 | TCP 成功连接后收到 EOF | 返回 `E001107`，不是 `E001101` |
| F-007 | libusb 主动取消 transfer | 无用户错误；非主动取消才降级为 `E001210` |
| F-007 | 普通 USB 设备没有 HDC interface | 不输出 `E001212`，无 HDC 候选时保持 no target |
| F-008 | Windows native value 在 Linux UT 中验证 | mapper 接收显式 native domain，跨平台稳定测试 |
| F-009 | session 释放与读写 callback 并发 | primary fault 只写一次，复制后不引用已释放 session |
| F-012 | native detail 含设备序列号或路径 | 默认格式不输出未经白名单允许的 detail |
| F-013 | 已知 native error | 必须映射细分码，不得落入 legacy generic |

## 5. Non-Functional Requirements

| Feature ID | Category | Requirement |
|------------|----------|-------------|
| F-001 | compatibility | 对外编号显式固定，禁止 enum 自增或复用已发布编号 |
| F-002 | security | 不保存认证 secret、命令 payload 或完整私有标识 |
| F-003 | reliability | 并发更新无 data race，清理错误不覆盖根因 |
| F-004 | performance | mapper 为无阻塞、无 I/O 的常量时间操作 |
| F-007 | reliability | USB callback 不增加阻塞等待或持锁输出路径 |
| F-009 | memory | fault 按值保存，无裸指针指向 native buffer/session 生命周期外对象 |
| F-013 | compatibility | 第一阶段 host–hdcd wire format 零变化 |
| F-014 | quality | mapper 每个分支 100% 用例覆盖，完整构建和 AR pair validator 通过 |

## 6. Dependencies

| Feature ID | Dependency | Type | Notes |
|------------|------------|------|-------|
| F-004/F-006 | libuv | external | 使用稳定 `UV_E*` status，不解析平台错误字符串 |
| F-007 | libusb | external | 同时覆盖 API return 和 transfer status |
| F-008 | HDC_SUPPORT_UART | internal | mapper 始终可测试，实际接入受可选构建控制 |
| F-009 | HdcSession/HdcDaemonInformation | internal | 需要安全复制 fault 并维护生命周期 |
| F-014 | googletest/gmock、GN | internal | 复用 `hdc_host_base_unittest` 测试目标 |

## 7. Open Items

| ID | Item | Blocks Development | Resolution |
|----|------|--------------------|------------|
| O-001 | 详细 CLI 输出开关最终命名 | no | 本 PR只增加稳定默认短格式和内部字段；开关后续单独评审 |
| O-002 | 实机 Windows/macOS 结果 | no | 不作为 mapper 合入阻塞；PR 中明确未替代的 manual 验证项 |
