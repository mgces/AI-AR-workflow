# Requirement Clarification

## 1. Original Request

`基于已完成的 HDC client + host 连接错误码方案，开发、测试、验证，然后向 OpenHarmony 上游提交 PR。`

## 2. Parsed Intent

- Type: `requirement-add`
- Name: `hdc-connection-error-diagnostics`
- User goal: 将 host 已能观察到的连接失败稳定分类并传递给 CLI，且每个错误码检测分支都有可重复测试证据。
- Target users: HDC CLI 用户、IDE/CI 集成方、HDC 维护者和故障定位人员。
- Trigger scenario: client 连接本机 server，host 选择 target，或 host 通过 TCP、USB、UART 连接 hdcd 时失败。

## 3. Clarification Questions

| ID | Question | Priority | Answer | Status |
|----|----------|----------|--------|--------|
| Q-001 | 是否实现此前目录中的全部错误码，而不只实现 P0？ | blocker | 是；59 个目录项全部进入注册表和测试，已有码保持兼容 | confirmed |
| Q-002 | 是否修改 host 与 hdcd 的线协议？ | important | 否；第一阶段只基于 host 已有状态和 native error 分类 | confirmed |
| Q-003 | 是否要求每个硬件现象都通过真实硬件自然复现？ | important | 否；所有分支必须自动化，实机仅作代表性第二重验证 | confirmed |
| Q-004 | legacy 通用码如何处理？ | important | `E001003/E001005/E002106` 保留为未知条件兜底，不覆盖已知细分错误 | confirmed |
| Q-005 | 是否允许改变成功输出？ | important | 不允许；成功路径和 host–hdcd 兼容行为保持不变 | confirmed |

## 4. Confirmed Scope

### In Scope

- 建立 host 侧稳定错误码目录和错误描述注册表。
- 建立 libuv/libusb/USB transfer/UART/target 状态到稳定错误码的映射。
- 建立结构化 `ConnectionFault`，保留 stage、transport、native domain/code 和 retryable。
- 将确定性错误写入 session/channel fault，避免清理产生的 EOF/cancel 覆盖根因。
- 细化 target 不存在、offline、session 不可用、握手暂态/超时和多目标状态。
- 默认 CLI 输出稳定 `[Exxxxxx]` 前缀；保留已有码数值和 legacy fallback。
- 用表驱动单测覆盖全部目录项及每个 native/state 映射来源。
- 对异步、状态错位、错误优先级和释放后诊断信息进行回归测试。
- 更新用户错误码参考和 AR-Workflow 追踪产物。

### Out of Scope

- 修改 host–hdcd 消息格式或要求设备镜像同步升级。
- 把 timeout/disconnect 武断描述成坏线、供电不足或防火墙等不可确认物理根因。
- 在本次 PR 引入远程遥测、上传设备标识或连接日志。
- 依赖真实坏线、损坏 Hub 或不稳定公网作为自动化门禁。
- 清理 HDC 全部历史错误文案；只处理连接链路。

## 5. Open Items

| ID | Item | Blocks Development | Owner | Resolution Plan |
|----|------|--------------------|-------|-----------------|
| O-001 | 正式编号是否与上游未发布分支冲突 | no | developer | 编译前全仓扫描，显式赋值并由唯一性单测门禁 |
| O-002 | Windows/macOS 实机环境是否可用 | no | maintainer | mapper 跨平台单测为强制门禁，实机结果单独记录 |
| O-003 | 非零进程退出码是否会影响外部脚本 | no | maintainer | 本 PR 保持当前进程退出契约，先稳定错误码文本；后续独立兼容变更 |
