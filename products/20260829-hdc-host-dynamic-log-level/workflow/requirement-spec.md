# Requirement Spec

## 1. Summary

- Change: `20260829-requirement-add-host-dynamic-log-level`
- Requirement type: `requirement-add`
- One sentence: 为运行中的 hdc host server 增加可查询、可修改、线程安全且低热路径开销的动态日志级别控制。

## 2. Terms

| Term | Definition |
|------|------------|
| host server | hdc 在 PC/host 侧常驻、接受 hdc client 命令并管理设备连接的进程。 |
| runtime level | 当前进程内生效的日志阈值，取值 `0..6`，数值越大输出越详细。 |
| suppressed log | 日志语句级别高于当前 runtime level、因此不应产生输出的日志。 |
| call-site filter | 在 `WRITE_LOG` 宏进入格式化函数前完成的阈值判断。 |

## 3. Functional Points

| Feature ID | Name | User Value | Input | Output | Business Rules | Acceptance Criteria |
|------------|------|------------|-------|--------|----------------|---------------------|
| F-001 | 查询 server 日志级别 | 运维人员可确认实际生效级别 | `hdc server loglevel` | 当前数值及名称 | 命令由 host server 本地处理，不要求设备在线 | 无设备时可执行；返回值与 `Base::GetLogLevel()` 一致 |
| F-002 | 动态设置 server 日志级别 | 无需重启即可改变日志详细度 | `hdc server loglevel <0..6>` | 旧级别、新级别及成功/失败信息 | 仅接受单个十进制字符 `0..6`；非法输入不得修改原值 | 对每个合法值即时生效；多参数、非数字和越界输入均有明确错误且原值不变；无参数按 F-001 查询处理 |
| F-003 | 多线程安全的进程级控制 | 并发日志线程与控制线程不会产生数据竞争 | 日志线程读取、命令线程写入 | 所有线程观察到完整级别值 | 全局阈值使用原子变量；读写使用 relaxed 顺序，因为不承载额外状态同步 | 并发读写测试通过；代码中不存在对该阈值的非原子访问 |
| F-004 | 被抑制日志的快速路径 | 降低关闭 DEBUG/ALL 日志后的 CPU 和分配开销 | 任意 `WRITE_LOG(level, fmt, args...)` | 被抑制时无格式化和 I/O | 调用点先做一次原子读取和分支；被抑制时参数不得求值；日志函数保留防御性检查 | 副作用参数测试证明被抑制时不求值；实现不进入 `PrintLogEx` 的格式化路径 |
| F-005 | libusb 日志级别同步 | USB 诊断输出与 host server 阈值一致 | 设置后的 hdc runtime level | 对应 libusb context level | `OFF->NONE`、`FATAL->ERROR`、`WARN->WARNING`、`INFO->INFO`、`DEBUG/ALL/VERBOSE->DEBUG`；外部 `LIBUSB_DEBUG` 的 libusb 固定语义不由 hdc 绕过 | 映射单测通过；server 设置级别时对活动 USB context 调用更新接口 |
| F-006 | CLI 可发现性、安全边界与兼容性 | 用户可通过帮助找到功能，既有行为不被破坏 | `hdc help`、既有 `-l[0-6]` | 新命令帮助；旧选项继续工作 | 新命令不绑定 target，不修改 daemon 协议；设置不持久化；仅允许 UDS 或 TCP 回环客户端执行 | Usage/Verbose 包含新命令；解析结果为新的 host-local command ID；非回环客户端被拒绝且状态不变；旧测试回归通过 |

## 4. Boundary Conditions

| Feature ID | Boundary | Expected Behavior |
|------------|----------|-------------------|
| F-001 | server 尚未运行 | hdc 沿用现有机制拉起 server，然后查询其默认/启动配置级别。 |
| F-002 | 参数为 `0` 或 `6` | 均接受，分别表示关闭和最详细日志。 |
| F-002 | 参数为 `7`、`-1`、`debug`、`3 extra` | 拒绝并保持旧级别。 |
| F-003 | 设置与大量日志同时发生 | 单条日志按其检查时观察到的完整旧值或新值处理，无未定义行为。 |
| F-004 | 宏参数含函数调用/临时对象 | 被抑制时不执行、不构造；启用时恰好执行一次。 |
| F-005 | USB context 不存在或正在初始化 | 核心级别仍更新；仅在 context 可用时更新 libusb，后续初始化读取当前级别。 |
| F-006 | host server 重启 | 动态值不持久化，恢复现有 `-l`/环境变量/默认值决策。 |
| F-006 | server 显式监听 LAN 地址且命令来自非回环客户端 | 拒绝查询/设置并保持原级别，防止远端关闭审计日志或放大日志资源消耗。 |

## 5. Non-Functional Requirements

| Feature ID | Category | Requirement |
|------------|----------|-------------|
| F-003 | reliability | 使用标准 C++ 原子类型消除全局阈值读写数据竞争，不新增控制路径锁。 |
| F-004 | performance | suppressed path 不分配、不格式化、不加锁、不访问文件，仅包含一次 relaxed 原子 load、整数比较和可预测分支。 |
| F-005 | compatibility | 不改变 libusb 回调输出格式及脱敏逻辑。 |
| F-006 | compatibility | 不改变现有 `-l` 参数编号、日志级别编号、daemon wire protocol 或已有命令语义。 |
| F-006 | security | 动态命令只接受 UDS/IPv4/IPv6 回环客户端，不向设备侧转发；无法取得 peer 地址时 fail closed。 |

## 6. Dependencies

| Feature ID | Dependency | Type | Notes |
|------------|------------|------|-------|
| F-001 | host command parser/channel | internal | `translate.cpp`、`client.cpp`、`server_for_client.cpp`。 |
| F-003 | C++17 `std::atomic` | toolchain | 项目已使用 C++17 和 atomic。 |
| F-005 | libusb `LIBUSB_OPTION_LOG_LEVEL` | external | 使用项目当前 libusb API。 |
| F-006 | hdc host unit tests | internal | `hdc_host_base_unittest`、`hdc_ext_unittest`。 |

## 7. Open Items

| ID | Item | Blocks Development | Resolution |
|----|------|--------------------|------------|
| O-001 | 是否本次引入异步日志队列？ | no | 不引入；它优化的是已启用日志的 I/O 主路径，应单独设计容量、丢弃、崩溃刷新和退出语义。 |
| O-002 | 外部 `LIBUSB_DEBUG` 覆盖 | no | 保持 libusb 官方语义并在架构/帮助文档记录限制。 |
