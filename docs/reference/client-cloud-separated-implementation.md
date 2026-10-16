# DSH 客户端与云端分离：当前实施说明

本文记录当前仓库中已经落地并通过自动化测试的客户端/云端能力，以及仍需真实目标环境或生产基础设施才能验收的边界。总体目标、信任边界和未来扩展见[客户端与云端分离详细设计](./client-cloud-separated-detailed-design.md)；本页是当前实现状态，不把设计目标当成已交付能力。

## 当前实现状态

新工程位于仓库根目录 `dsh-client-platform/`。旧的 DSH Web AR 面板和网页 Connector 流程已归档到 `pending-delete/legacy-dsh-web/`，不再是新客户端的入口。当前实现由桌面客户端、本机执行核心、官方 DSH SDK/CodeAgent 适配、现有 AR workflow runtime、Cloud API 和独立 Cloud Console 组成。

| 能力 | 当前实现与边界 |
| --- | --- |
| Desktop 与本机执行 | Electron Desktop 使用 sandbox、`contextIsolation` 和受限 preload；Main 进程启动 Local Core 并通过 loopback 与之通信。Renderer 不直接持有执行凭证或访问任意本机进程。客户端可离线运行本地流程。 |
| 本机 CodeAgent 与 DSH | 可发现/配置 Claude Code、OpenCode、Codex 或兼容自定义 CodeAgent。对话和 Agent 请求由客户端内的官方 DSH SDK session/adapter 送到选定的本机 CodeAgent；不回退到 DSH 主模型。缺少 Agent、连接失败或 Agent 调用失败会返回错误。只记录 Agent 实际报告的 token 数，无法得知时保持未知。 |
| Workspace 与工具 | 支持本机 workspace、Windows 可发现的 WSL distribution，以及 SSH Host 别名或 `user@host` 形式的目标。通过选定 workspace 侧执行源码检查、CodeAgent、构建/测试和设备探测，因此 `hdc`、工具链及设备必须在该侧可访问。目标环境认证沿用系统 SSH/WSL 配置。 |
| P0 与工程类型 | P0 检查源码布局、工程类型（OpenHarmony/HarmonyOS）、构建入口、hdc/设备与工作区能力。缺少标记、工具或连接时会给出阻断项；P0 未通过时不创建/启动后续 AR run。具体检查结果取决于用户代码树和环境。 |
| AR workflow | 复用仓库现有 AR delivery runtime 和确定性 gate，覆盖 P0 前置检查与 P1–P8 工作阶段。阶段通过由 gate、构建、测试、设备等真实证据判定，CodeAgent 文本答复不能单独使阶段通过。工作台可呈现阶段状态、尝试、运行耗时、人工动作与输入、可取得的 token 用量、失败原因和本机产物。 |
| 本地环境/设备探测维测 | workspace 探测结果保存在本机 Local Core；配对云端后，本机同步器会把受 schema 约束的 `environment.probed`、`device.probed` 事件签名后写入持久 outbox，再同步到 Cloud API。Cloud Console 的“本机环境与设备探测”区域展示能力状态、允许的原因码、时长、时间和设备/工作区标识。不会把设备序列号、绝对路径或命令输出当作探测字段发送。 |
| 运行事件与离线同步 | run/stage/gate/人工动作/usage/终态事件映射为允许字段的云端事件，使用设备 Ed25519 签名。事件和探测数据在本机 outbox 持久化；云端 ACK 后才确认游标，离线或重启后续传。云端按 tenant/workspace/设备权限生成 run、阶段、事件和维测投影。 |
| 人工输入隐私 | 默认只同步人工输入的字节数、摘要和动作统计。客户端提供明确的正文同步选项；启用后只影响之后生成的事件，正文最多 16 KiB，已有 outbox 不会追溯改写。代码、绝对路径、shell 命令、stdout/stderr、任意 Agent 输出不属于默认事件内容。 |
| 审核产物与云端决定 | 用户可以从指定 run/phase 选择审核文件并上传 review bundle；API 校验文件大小、SHA-256、类型和分类，单文件上限 25 MiB。Cloud Console 展示已授权的审核内容，审核人可批准、退回或拒绝。决定绑定 run revision、bundle digest、nonce、设备并由 Ed25519 签名；客户端验签后应用本地状态转换并先持久化回执，再向云端确认。相同回执可安全重试，冲突/过期/不匹配决定不会静默生效。批准走本地 consent；退回重新排入同一阶段并把意见交给后续阶段上下文，仍需 gate；拒绝使运行进入终态。 |
| Cloud Console 与身份 | 支持一次性设备配对、设备撤销、运行/阶段与维测查看、审核队列/产物、决定状态及探测记录。除 loopback 本地开发外，提供单实例 Docker Compose 样例：Caddy HTTPS + OAuth2 Proxy OIDC + 共享代理密钥身份适配器，并校验浏览器写请求 Origin。身份提供方和账号目录由部署方提供。 |

云端保存的是客户端签名事实副本、投影和用户明确选择上传的审核文件，不是远程执行平面。Cloud Console 不能直接执行用户电脑上的 shell、SSH、hdc、CodeAgent 或修改源码。

## 本机开发和验证

需要 Node.js 24（包声明 `>=22.19`）。Electron 依赖版本固定在 lockfile 中；首次安装需要访问 lockfile 指定的 npm registry。

从仓库根目录运行完整的软件回归集：

```bash
cd dsh-client-platform
npm ci
npm run test:all
```

`test:all` 顺序执行客户端/Cloud API/DSH SDK bridge 测试、`dsh-workflow` 测试和 `platform` Local Console/runtime 测试。当前实施轮次的验证结果：客户端/云端测试 **90 passed, 0 failed**；`dsh-workflow` 测试 **36 passed, 0 failed**；`platform` 测试 **193 passed, 0 failed**；共 **319 passed, 0 failed**，`npm run test:all` 整体退出码为 0（2026-09-22）。测试集包括真实本机 DSH SDK sidecar 启动到本机 CodeAgent callback 的集成测试，以及审核动作回执重试、审核退回/拒绝转换、探测事件签名同步和云端接收/展示等软件路径。重跑时以本地实际输出为准。

需要单独执行时：

```bash
npm test
npm --prefix ../dsh-workflow test
npm --prefix ../platform test
```

### 启动 Cloud Console 与 Desktop

先在 `dsh-client-platform` 下启动本机开发 Cloud API：

```bash
DSH_CLOUD_HOST=127.0.0.1 \
DSH_CLOUD_PORT=8791 \
DSH_CLOUD_DATABASE=./data/cloud.sqlite3 \
DSH_CLOUD_ALLOW_LOCAL_DEV_AUTH=true \
npm run cloud
```

打开 `http://127.0.0.1:8791/`，生成一次性设备配对码。另开终端，在同一目录启动客户端：

```bash
npm run desktop
```

按向导配置本机/WSL/SSH workspace，检测 CodeAgent 与运行环境；填写 AR 描述并运行 P0。若 P0 通过，才可以创建和运行 AR workflow。云端观测和审核需要配对；不配对时，本机执行仍可用。测试普通临时目录时，P0 因没有 OHOS/HarmonyOS 源码标记而阻断属于预期结果。

`DSH_CLOUD_ALLOW_LOCAL_DEV_AUTH=true` 会把 loopback 来访者映射到本地开发 tenant；它只能用于本机验证，不能通过公网反向代理、端口转发或隧道暴露。

### Windows 安装包

在 Windows x64 或 GitHub Actions Windows runner 的 `dsh-client-platform` 目录执行：

```powershell
npm ci
npm test
npm run build:win
```

构建流程 stage AR/DSH runtime、运行 electron-builder NSIS 和包内容校验，预期生成 `release/DSH-Agent-Client-<版本>-Setup.exe`。2026-09-22 已从隔离副本在实际 Windows Node v24.15.0 环境成功构建安装包；随包独立 Node、DSH SDK、DSH CLI 和 ConPTY Node-API 预构建件均通过包内 smoke check。electron-builder 不重编译原生依赖，保留 npm 包内 Windows x64 预构建件。Runtime bundle 会携带策略注册表引用的全部 29 个 skills，并在 staging 时逐个校验。当前测试包位于 `dsh-client-platform/release/DSH-Agent-Client-0.1.0-Setup-tested.exe`。安装器尚未在目标 Windows 用户会话中完成安装和首次启动验收，也没有代码签名证书；自动更新、正式发行、SmartScreen/企业策略兼容、完整 CodeAgent/WSL/SSH/真实设备验收仍待验证。Windows Node 通过本 WSL shell 运行测试时，有两个 HTTP 集成测试在 Node test worker 退出期间触发 `UV_HANDLE_CLOSING`；对应 WSL 软件回归通过 319 项，需在原生 PowerShell 补验测试运行器行为。Linux/WSL 的 `npm run pack:win:dir` 仅检查打包目录，不能替代安装后的用户会话验收。

## 云端部署边界

当前 Cloud API 和 Console 已提供一台 Linux 主机的 Docker Compose 部署：由 Caddy 终止 HTTPS，OAuth2 Proxy 接入部署方的 OIDC 提供方，Cloud API 仅加入内部 Docker 网络，并使用受共享代理密钥保护的身份适配器。浏览器写请求校验 HTTPS Origin；桌面设备同步、审核产物上传和一次性配对走设备或短期凭据。操作步骤见 [`dsh-client-platform/deploy/cloud/README.md`](./dsh-client-cloud-deployment.md)。该路径可用于单实例团队试用和首台计算云部署，但不是高可用或可横向扩展的多租户发行版：

- OIDC 身份提供方和用户目录由部署方提供；随仓适配器只信任内网反向代理设置的 user identity header，并按部署配置 tenant、workspace 和管理员。必须只公开 Caddy 的 80/443 端口，不能绕过反向代理直接暴露 Cloud API。
- 数据层是单实例 SQLite，审核对象存于同一持久卷；没有 PostgreSQL/共享数据库与对象存储 adapter。多实例部署、横向扩展或弹性替换实例不受支持。
- 配对失败限流仍是单进程内存状态，重启会重置。备份需停机并将数据库、审核对象和 intent 签名私钥一起快照；没有自动备份/恢复编排、KMS/密钥轮换、审核文件内容扫描、完整告警、容量/保留治理或正式发布流程。
- Windows 安装器未签名，自动更新、正式发布渠道、签名密钥托管和供应链发布流程尚未交付。
- 当前环境没有 Docker 或 Caddy，Compose 仅完成 YAML/网络拓扑静态校验，OIDC 登录和计算云部署仍需在目标 Linux 主机实测。软件集成测试通过不等于真实目标环境端到端通过。仍需在目标 Windows 上验证安装/首次启动，在用户提供的 WSL 或 SSH workspace 上验证 CodeAgent 实际改码、OpenHarmony/HarmonyOS 构建分支、P0–P8 所需 gate、hdc 真机连接与测试，以及完整审核产物流转。

新架构单实例云部署请按[Cloud Console 部署手册](./dsh-client-cloud-deployment.md)操作；旧的[计算云 DSH Web 部署手册](./dsh-cloud-platform-v1/deploy-to-compute-cloud.md)仍是旧单体 DSH Web + Connector 方案，仅作迁移参考。

## 相关文档

- [客户端与云端分离详细设计](./client-cloud-separated-detailed-design.md)
- [客户端工程 README](https://github.com/mgces/AI-AR-workflow/blob/main/dsh-client-platform/README.md)
- [Cloud Console 单实例部署手册](./dsh-client-cloud-deployment.md)
- [旧计算云 DSH Web 部署手册（仅供旧架构迁移参考）](./dsh-cloud-platform-v1/deploy-to-compute-cloud.md)
