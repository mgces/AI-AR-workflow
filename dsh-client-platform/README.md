# DSH Client Platform

DSH Client Platform 将 AR workflow 的执行放在用户的 Windows 客户端及其选择的本地/远程代码环境中，把运行观测和可选的审核协作放在 Cloud Console。旧网页代码已归档到 [`pending-delete/legacy-dsh-web`](../pending-delete/legacy-dsh-web/README.md)，不再作为本客户端的入口。

## 当前能力

- **桌面客户端与本机执行核心**：Electron Renderer 使用 sandbox、`contextIsolation` 和受限 preload IPC。Electron Main 启动只监听 loopback 的 Local Core；API 使用短期随机凭据，Renderer 不直接获得访问令牌、文件系统或进程执行能力。
- **CodeAgent 由本机环境提供**：客户端检测并允许配置 Claude Code、OpenCode、Codex 或兼容的自定义 CodeAgent。对话与 workflow 调用进入随客户端运行的官方 DSH SDK session，再由 DSH adapter/tool bridge 派发给所选 CodeAgent。系统不会因为 CodeAgent 不可用而回退到 DeepSeek 主模型；缺少 agent、连接失败和调用错误会明确失败。可用 token usage 按 CodeAgent 报告记录，未报告的用量保持未知，不估算。
- **本机、WSL 与 SSH workspace**：本机可直接使用本地源码和工具；远程执行适配器可配置 Windows 检测到的 WSL distribution，或 SSH Host 别名/`user@host`。探测会在选定 workspace 侧检查代码树、hdc、设备及可写性；AR workflow、CodeAgent、构建/测试和设备探测通过该 workspace 适配器执行。SSH 身份与连接参数沿用系统 SSH 配置；工具和设备可用性仍取决于目标环境本身。
- **AR workflow**：客户端调用仓库现有 AR delivery runtime 与确定性 gate，包含 P0 前置检查和 P1–P8 阶段。阶段是否通过取决于 gate/构建/测试等实际证据，不由 CodeAgent 的自然语言答复单独判定。运行详情显示阶段状态、尝试、耗时、人工介入/输入、CodeAgent 可用 token、失败原因和本机产物；审核人可查看本机完整审核产物。
- **本地运行与云端同步相互独立**：不配对 Cloud API 也可启动本地环境检查和 workflow。配对后，签名事件先写入本地 outbox，再异步同步；断网时会保留待发送事件并在恢复后续传。事件 schema 采用允许字段策略。默认云端维测记录人工动作及输入长度/摘要，不上传人工输入正文、源码、绝对路径、命令、stdout/stderr 或任意 agent 输出。
- **显式审核产物与云端审核回执**：用户可从指定 run/phase 的产物中选择文件，创建审核包并上传到云端；云端校验内容长度和 SHA-256。支持文本、JSON、PDF、PNG/JPEG，单文件上限 25 MiB，只允许 `public`/`internal` 分类。Cloud Console 可查看授权范围内的审核产物并作出通过、退回或拒绝决定。决定会绑定 run revision、审核包 digest、nonce 和设备，并由云端 Ed25519 签名。客户端校验签名、设备、审核包和 revision 后执行本地决定，将结果先持久化，再向云端确认；断网重试会重放确认，不重复执行本地动作。旧 revision 或不匹配的审核包会被标记为 stale/rejected，不能静默套用。
- **Cloud Console**：支持一次性设备配对、设备吊销、运行与阶段投影、耗时/人工介入/输入摘要/token/失败分类、在线状态、审核队列和已选审核产物。普通用户的设备和 workspace 可见范围受 Cloud API 授权限制。新架构提供单实例 Docker Compose 部署，包含 Caddy HTTPS、OAuth2 Proxy OIDC 登录、反向代理身份校验和 CSRF Origin 校验；详见 [`deploy/cloud/README.md`](deploy/cloud/README.md)。

## 能力边界与部署状态

当前代码和自动化测试覆盖桌面、本机 Local Core、官方 DSH SDK bridge、CodeAgent callback、AR runtime、WSL/SSH adapter、Cloud API、事件 outbox、审核产物及签名审核回执的主要软件路径。**这不等于已经在所有客户的 Windows、WSL/SSH 主机、OpenHarmony/HarmonyOS 代码树、真实 HDC 设备上完成硬件端到端验收。** 真实构建、测试、设备授权及 P0–P8 gate 的结果取决于用户提供的代码树、工具链、设备和权限；目标环境未就绪时流程会在对应检查处失败或阻断。

Windows 客户端已有 x64 per-user NSIS 安装包；2026-09-22 已在实际 Windows Node v24.15.0 环境从隔离副本构建，随包 Node、DSH SDK、DSH CLI 和 ConPTY 预构建件均通过启动检查。安装包包括桌面应用、Local Core、DSH runtime、AR gate runtime 和策略注册表引用的 29 个 workflow skills，不要求用户另行克隆本仓。当前安装包尚未在目标 Windows 用户会话中完成安装和首次启动验收；安装器没有代码签名证书，不能视为正式发行版。自动更新和正式发布渠道尚未实现。

Cloud API 和网页可以在开发机运行；仓库提供单实例 Docker Compose 部署，包括外部 OIDC 登录代理、Caddy HTTPS 入口、代理身份校验和持久数据卷。它适用于单台计算云上的团队试用或单实例部署，不是高可用或可横向扩展的多租户发行版：数据层仍是单机 SQLite 与本地审核文件，配对限流在进程内，备份需人工停机执行，尚无共享数据库与对象存储、分布式限流、密钥 KMS/轮换、文件内容扫描、完整运维告警和正式发布流程。具体步骤与边界见 [`deploy/cloud/README.md`](deploy/cloud/README.md)。本 README 后面的 `local-dev` 模式只能绑定 loopback，禁止公开代理访问。当前 workflow 随客户端分发，不提供经签名的云端 workflow 下载、版本更新和回滚机制。

## 目录

```text
dsh-client-platform/
  deploy/cloud/  单实例 Cloud Console Docker Compose、HTTPS/OIDC 入口与部署手册
  apps/
    desktop/       Electron Main、受限 Preload、工作台与运行详情
    local-core/    本机受限 API、AR runtime 与工作区适配
    dsh-runtime/   官方 DSH SDK 启动器及本机 CodeAgent bridge
    cloud-api/     签名事件、配对、产物、审核包/决定和运行投影
    cloud-web/     独立云端 Console
  packages/
    contracts/     事件 schema、canonical hash 和 Ed25519 签验
  scripts/        本机 AR runtime staging、Windows 包验证等
```

## 开发和本机测试

需要 Node.js 24（项目声明 Node.js `>=22.19`）；桌面构建固定使用 Electron 44.4.3。首次安装需能访问 lockfile 指定的 npm registry 下载依赖。

在仓库根目录执行：

```bash
cd dsh-client-platform
npm ci
npm test
```

执行客户端、AR workflow 和 Local Console 的组合测试：

```bash
npm run test:all
```

此命令依次运行客户端/云端测试、`../dsh-workflow` 测试和 `../platform` 测试。

### 启动本机 Cloud Console 与客户端

先在 `dsh-client-platform` 目录启动仅用于本机开发的 Cloud API：

```bash
DSH_CLOUD_HOST=127.0.0.1 DSH_CLOUD_PORT=8791 DSH_CLOUD_DATABASE=./data/cloud.sqlite3 DSH_CLOUD_ALLOW_LOCAL_DEV_AUTH=true npm run cloud
```

浏览器打开 `http://127.0.0.1:8791/`。在网页生成一次性配对码。该开发认证只创建 `local-dev` tenant，且服务要求 loopback bind；不要通过端口转发、隧道或公开反向代理暴露。

另开终端，在 `dsh-client-platform` 目录运行：

```bash
npm run desktop
```

按客户端提示选择源码目录，检测可用 CodeAgent，选择本机/WSL/SSH workspace 并检查连接。然后在工作台填写 AR 描述、确认识别出的工程类型和 CodeAgent，运行环境检查通过后启动 AR workflow。无 OHOS/HarmonyOS 标记的普通测试目录会在 P0 被确定性检查阻断，这是预期行为。无需云端配对也能做本地 workflow；如需 Cloud Console 运行观测或云端审核，再输入本机 Cloud API 地址并配对。

要验证 CodeAgent 对话，在客户端的“AI 问题分析”面板中选择关联运行并发送问题；请求通过本机 DSH SDK session 到达配置的 CodeAgent。要验证云端审核，在 Cloud Console 查看设备同步的运行，选择本机已生成的审核文件上传审核包，再提交通过/退回/拒绝；客户端在线并恢复同步后会拉取签名回执并应用/确认。

## Windows 安装包

在 Windows x64 或 GitHub Actions Windows runner 中，从 `dsh-client-platform` 目录执行：

```powershell
npm ci
npm test
npm run build:win
```

生成 `release/DSH-Agent-Client-<版本>-Setup.exe`。`build:win` 会先 stage AR runtime，再运行 electron-builder NSIS 打包和 `verify:win` 包内容校验。安装器为 per-user、允许选择安装目录并创建快捷方式；无需管理员权限。Windows CI 定义在仓库 `.github/workflows/dsh-client-windows.yml`，执行测试和打包并保留安装器 artifact 14 天。没有有效签名证书时产物是 unsigned，仅供内部安装验证。当前工作区附有一个已构建的测试安装包：`release/DSH-Agent-Client-0.1.0-Setup-tested.exe`。

Linux/WSL 环境可执行 `npm run pack:win:dir` 对 Windows app 目录做打包检查，但该命令不能替代 Windows 原生 NSIS 安装/启动测试。最终 Windows 安装体验、SmartScreen/企业策略兼容和签名状态需在目标 Windows 环境验证。

## Cloud API 的开发配置与生产要求

本地开发模式要求显式设置 `DSH_CLOUD_ALLOW_LOCAL_DEV_AUTH=true`，并且只接受 loopback bind；设置 `DSH_CLOUD_AUTH_MODULE` 时不能同时启用本地开发认证。单实例 Compose 示例将 `DSH_CLOUD_AUTH_MODULE` 接到 OIDC Proxy，校验反向代理密钥和浏览器写请求 Origin；OIDC Provider、账号目录及组织邮箱域由部署方提供。更换反向代理或身份提供方时，需另行实现并审查兼容的 `authenticateUser(request)` 模块。

Cloud API 提供以下主要接口：

- `GET /healthz`：健康状态。
- `POST /v1/devices/{device_id}/events:batch` 和 `GET /v1/devices/{device_id}/sync-state`：签名事件批量接收及同步游标。
- `GET /v1/runs`、`GET /v1/runs/{run_id}?device_id=...`：授权范围内的运行/阶段投影和事件时间线。
- `POST /v1/artifacts/manifests`、`POST /v1/artifacts/{artifact_id}/uploads`、`PUT /v1/artifacts/{artifact_id}/uploads/{upload_id}`：登记与上传显式选中的 `review_bundle` 文件；上限 25 MiB，服务端检查大小、hash、类型和分类，不接收客户端文件路径。
- `GET /v1/artifacts/{artifact_id}` 与 `GET /v1/artifacts/{artifact_id}/content`：按设备所有权或 workspace 授权读取审核产物。
- `POST /v1/runs/{run_id}/review-bundles`、`GET /v1/reviews/pending`、`GET /v1/review-bundles/{bundle_id}`、`POST /v1/review-bundles/{bundle_id}/decisions`：创建、查看审核包并提交通过/退回/拒绝决定。
- `GET /v1/devices/{device_id}/intents`、`POST /v1/intents/{intent_id}/result`：客户端拉取签名决定并回传 applied/stale/rejected 结果。

云端默认只保存策略允许的结构化事件；人工输入正文和审核产物正文是不同的数据路径。只有经用户明确选择上传的审核文件才会作为审核包内容传到云端。文件上传不等同于全量运行目录同步。

Cloud API 当前以 SQLite 和本机文件系统存储为默认实现。单机开发时用持久数据目录；多实例或生产部署还需要实现/接入共享数据库、持久对象存储与统一签名密钥管理。默认 intent 私钥文件为 `${DSH_CLOUD_DATABASE}.intent-ed25519.pem`，需限制服务账号读权限并纳入安全备份/轮换设计。不要在没有外部认证、HTTPS、访问控制、共享限流、持久备份和容量治理的情况下把本地开发模式暴露到公网。

完整架构决策与验收边界见 [`docs/reference/client-cloud-separated-detailed-design.md`](../docs/reference/client-cloud-separated-detailed-design.md)。旧版网页使用说明仅作迁移参考，不是本客户端操作指南。

### 人工输入正文的云端同步授权

客户端“连接云端工作区”区域提供“同步人工输入正文到云端”选项，默认关闭。关闭时云端只接收人工输入的字节数、SHA-256 与动作统计；开启后，之后新同步的人工输入事件会附带最多 16 KiB 正文，并在 Cloud Console 的运行详情中显示。正文超过限制时仅上传 UTF-8 安全截断的前 16 KiB，哈希和原始字节数仍对应本机保存的完整输入。已经进入本地签名 outbox 的事件不会被追溯修改，开启前产生的 metrics-only 事件也不会补传正文。请只在允许将这类人工输入存入云端时启用。
