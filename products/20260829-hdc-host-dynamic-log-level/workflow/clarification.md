# Requirement Clarification

## 1. Original Request

`分析 hdc host 动态调节日志级别方案，通过新增命令来允许修改 host server 的日志级别，级别通过全局变量控制，打印日志时根据级别判断是否打印，从而支持动态调节 host server log 级别；生成完整方案、流程图和代码修改逻辑文档；开发测试验证然后提交 PR。`

## 2. Parsed Requirement

- Type: `requirement-add`
- Name: `host-dynamic-log-level`
- User goal: 无需重启 hdc host server 即可查询和修改其日志级别，并尽量降低关闭高等级日志后的热路径开销。
- Target users: hdc 开发、测试、问题定位和维护人员。
- Trigger scenario: host server 已运行，需要临时提高日志详细度定位问题，或降低日志量减少 I/O 与 CPU 开销。

## 3. Clarification Questions

| ID | Question | Priority | Answer | Status |
|----|----------|----------|--------|--------|
| Q-001 | 命令形态和参数范围是什么？ | important | 使用 `hdc server loglevel [0-6]`；无参数查询，单个数值参数设置，沿用现有 `-l[0-6]` 语义。 | confirmed |
| Q-002 | 动态设置是否持久化？ | important | 不持久化，仅作用于当前 server 进程；重启后仍由现有启动参数/环境变量决定。 | confirmed |
| Q-003 | 是否影响 device daemon 日志？ | blocker | 不影响，仅修改接收该命令的 host server 进程及其 libusb 日志入口。 | confirmed |
| Q-004 | 是否需要重启或中断已有连接？ | blocker | 不需要；已有 session 和传输任务继续运行。 | confirmed |
| Q-005 | 用户已授权后续阶段吗？ | important | 原始请求明确要求开发、测试、验证并提交 PR，可连续执行无阻塞的四阶段。 | confirmed |

## 4. Confirmed Scope

### In Scope

- 新增 `server loglevel` 查询/设置命令、帮助文本和 host 本地路由。
- 使用原子全局级别保证多线程读取/更新无数据竞争。
- 在日志宏调用点进行快速过滤，避免被抑制日志的参数求值、格式化、锁和文件 I/O。
- 保留日志函数内部二次检查，保护绕过宏的直接调用和并发切换窗口。
- 动态同步 hdc 管理的 libusb context 日志级别。
- 单元测试、运行态命令验证、构建与 AR-Workflow 追踪校验。

### Out of Scope

- 修改 hdcd/device 侧日志级别。
- 将设置写入配置文件、注册表或系统参数。
- 新增按模块、session、设备或线程的独立日志级别。
- 本需求中重构同步日志文件后端为完整异步日志系统。

## 5. Open Items

| ID | Item | Blocks Development | Owner | Resolution Plan |
|----|------|--------------------|-------|-----------------|
| O-001 | 外部预置 `LIBUSB_DEBUG` 时 libusb 会固定初始化级别。 | no | implementation | hdc 不再主动设置该变量；文档说明外部变量属于第三方库显式覆盖，核心 hdc 级别仍可动态更新。 |
| O-002 | 异步批量落盘可进一步提升启用日志时性能。 | no | future | 作为后续独立架构优化，不扩大本次变更。 |
