# Test Cases

## 1. Test Strategy

- Change: `20260829-requirement-add-host-dynamic-log-level`
- Scope: host CLI 解析与路由、全局日志级别原子访问、日志宏快速过滤、libusb 映射、真实 server 运行态行为和既有 host 回归。
- Test levels: unit, integration, e2e, static
- Strategy: 先提交/运行新增单测观察缺失行为，再实现最小代码；最终执行目标构建、相关单测、CLI e2e 和 F/TC 校验。

## 2. Test Cases

### TC-001: parse query command

- Feature ID: F-001
- Level: unit
- Type: positive
- Preconditions:
  - `TranslateCommand::FormatCommand` 已初始化。
- Given:
  - 输入 `server loglevel`。
- When:
  - 调用 `String2FormatCommand`。
- Then:
  - 无解析错误；`cmdFlag == CMD_SERVER_LOG_LEVEL`；parameters 为空；命令不进入 daemon command 类型。
- Data:
  - `server loglevel`
- Automation: automated

### TC-002: parse all valid set levels

- Feature ID: F-002
- Level: unit
- Type: boundary
- Preconditions:
  - level 解析接口可调用。
- Given:
  - 依次输入 `0` 到 `6`。
- When:
  - 调用严格解析并通过 host command parser 解析完整命令。
- Then:
  - 每个值解析为对应 `uint8_t`；完整命令参数被原样传递。
- Data:
  - `0, 1, 2, 3, 4, 5, 6`
- Automation: automated

### TC-003: reject malformed levels without state change

- Feature ID: F-002
- Level: unit
- Type: negative
- Preconditions:
  - 当前 level 保存为已知值 `LOG_INFO`。
- Given:
  - `7`、`-1`、`debug`、`3 extra`、`03`、前后空格等非法 set 参数。
- When:
  - 调用严格解析/设置控制逻辑。
- Then:
  - 解析失败；当前 level 仍为 `LOG_INFO`；错误提示包含 `server loglevel [0-6]`。
- Data:
  - `7|-1|debug|3 extra|03| 3|3 `
- Automation: automated

### TC-004: atomic level access under concurrency

- Feature ID: F-003
- Level: unit
- Type: concurrency
- Preconditions:
  - 使用支持 C++17 atomic 的 host 单测目标。
- Given:
  - 一个线程反复设置 `0..6`，多个线程并发读取。
- When:
  - 运行固定迭代次数并等待所有线程退出。
- Then:
  - 所有读值始终位于 `0..6`；无崩溃/死锁；最终写入值可读取。
- Data:
  - writer 10000 iterations, 4 readers
- Automation: automated

### TC-005: suppressed macro does not evaluate arguments

- Feature ID: F-004
- Level: unit
- Type: performance-regression
- Preconditions:
  - 当前 level 为 `LOG_WARN`。
- Given:
  - `WRITE_LOG(LOG_DEBUG, "%d", SideEffect())`，SideEffect 增加计数器。
- When:
  - 执行日志语句。
- Then:
  - 计数器保持 0，证明实参未求值；`IsLoggable(LOG_DEBUG)` 为 false。
- Data:
  - WARN threshold / DEBUG statement
- Automation: automated

### TC-006: enabled macro evaluates arguments once

- Feature ID: F-004
- Level: unit
- Type: positive
- Preconditions:
  - 当前 level 为 `LOG_DEBUG`。
- Given:
  - 与 TC-005 相同的副作用日志参数。
- When:
  - 执行日志语句。
- Then:
  - 计数器恰好为 1，避免宏重复求值。
- Data:
  - DEBUG threshold / DEBUG statement
- Automation: automated

### TC-007: libusb mapping covers every hdc level

- Feature ID: F-005
- Level: unit
- Type: boundary
- Preconditions:
  - host libusb headers/library可用。
- Given:
  - hdc levels `0..6`。
- When:
  - 调用显式 level 映射接口。
- Then:
  - 结果依次为 `NONE, ERROR, WARNING, INFO, DEBUG, DEBUG, DEBUG`。
- Data:
  - complete enum range
- Automation: automated

### TC-008: help and host-local classification

- Feature ID: F-006
- Level: unit
- Type: compatibility
- Preconditions:
  - host translate 单测目标可运行。
- Given:
  - `Usage()`、`Verbose()` 和新命令。
- When:
  - 检索帮助并执行 parser。
- Then:
  - 两种帮助均包含 `server loglevel [0-6]`；命令解析到 ID 19；既有 `-l[0-6]` 帮助仍存在。
- Data:
  - usage, verbose, query command
- Automation: automated

### TC-009: running server query-set-query-invalid flow

- Feature IDs: F-001, F-002
- Level: e2e
- Type: positive-negative
- Preconditions:
  - 已构建本变更 hdc host 可执行文件；使用隔离端口；无复用的旧 server。
- Given:
  - 启动 server 并查询其实际初始 level `X`。
- When:
  - 依次执行 query、set 4、query、set 7、query，并在结束时恢复 `X`（若 `X == 4`，先切到 3 再恢复 4 以验证变更反馈）。
- Then:
  - 第一次返回 `X`；合法设置返回 old->new；非法值失败且之后仍返回合法设置值；最终恢复 `X`；全程不要求设备在线或 server 重启。
- Data:
  - isolated `OHOS_HDC_SERVER_PORT`
- Automation: scripted

### TC-010: host build and existing unit regression

- Feature ID: F-006
- Level: integration
- Type: regression
- Preconditions:
  - OpenHarmony build environment可用。
- Given:
  - 本变更全部源码与测试。
- When:
  - 构建 Linux/Windows host hdc、链接 `hdc_host_base_unittest`，编译所有受影响测试对象，并执行 host-native smoke/e2e。
- Then:
  - 两个 host 产物成功链接；受影响测试源码成功编译；host-native smoke/e2e 全部通过。
- Data:
  - current target toolchain
- Automation: automated

### TC-011: no non-atomic direct level access remains

- Feature ID: F-003
- Level: static
- Type: regression
- Preconditions:
  - 实现完成。
- Given:
  - 全仓源代码。
- When:
  - 搜索 `g_logLevel` 的所有读写。
- Then:
  - 定义为 atomic；所有非宏访问通过 `load/store` 或 `Get/SetLogLevel`，不存在普通读写。
- Data:
  - `rg -n "g_logLevel" src test`
- Automation: automated

### TC-012: libusb callback fast rejection

- Feature ID: F-005
- Level: static
- Type: performance-regression
- Preconditions:
  - 实现完成。
- Given:
  - `UsbLogHandler` 收到高于 hdc runtime level 的 libusb 日志。
- When:
  - 检查 callback 控制流并运行相关单测/编译。
- Then:
  - 在 `strdup`、regex 和脱敏之前通过 `IsLoggable` 返回。
- Data:
  - libusb DEBUG with hdc WARN
- Automation: static + build

### TC-013: reject non-loopback administration

- Feature ID: F-006
- Level: e2e
- Type: security-negative
- Preconditions:
  - host server 显式监听 LAN 地址和隔离端口；本机同时拥有回环与非回环地址。
- Given:
  - 当前 server level 为已知值 `X`。
- When:
  - 回环客户端执行 query，非回环客户端尝试 set 6，再由回环客户端 query。
- Then:
  - 回环查询成功；非回环设置返回 only-local 错误；最终 level 仍为 `X`。
- Data:
  - `127.0.0.1`, host LAN IP, isolated port
- Automation: scripted

## 3. Regression Tests

| Test Case ID | Related Feature | Regression Area | Notes |
|--------------|-----------------|-----------------|-------|
| TC-001 | F-001 | command parser | 新双词命令不得遮蔽已有命令。 |
| TC-002 | F-002 | level boundaries | 与 `-l[0-6]` 数值范围一致。 |
| TC-003 | F-002 | error handling | 失败不可改变运行态状态。 |
| TC-004 | F-003 | cross-thread logging | 不引入锁和死锁。 |
| TC-005 | F-004 | macro semantics | suppressed 参数从“会执行”改为“不执行”是目标语义。 |
| TC-006 | F-004 | macro semantics | enabled 参数保持恰好一次求值。 |
| TC-007 | F-005 | USB diagnostics | 修正映射后 callback 仍由 hdc 阈值二次过滤。 |
| TC-008 | F-006 | CLI compatibility | 既有帮助和 `-l` 保留。 |
| TC-009 | F-001, F-002 | client-server integration | 使用隔离端口，避免影响用户 server。 |
| TC-010 | F-006 | build/test | 覆盖 host 与 common 目标。 |
| TC-011 | F-003 | source safety | 防止遗漏普通全局访问。 |
| TC-012 | F-005 | libusb callback cost | 防止高成本预处理回归。 |
| TC-013 | F-006 | administration boundary | 防止 LAN 暴露时的远端日志资源放大与审计规避。 |
