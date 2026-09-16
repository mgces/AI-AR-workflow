# Workspace Gateway

这个包是用户电脑/WSL 代码端的受限执行边界。云端只发送 Authority envelope；Gateway 校验租户、工作区、run、revision、phase epoch、连接世代和可选签名，再通过 `ssh` 的 argv + `shell:false` 访问登记的远端代码根。路径、profile、输出大小、超时、CAS 写入、幂等重放和取消都在 Connector 内门控。

## 组件

- `src/authority/envelope.js`：固定 schema 和世代护栏。
- `src/connector/workspace-connector.js`：`inspect/probe/read/write/list/search/hash/read_binary/diff/exec_profile` 白名单 SSH 操作。
- `src/connector/jsonl-gateway.js`：用于本机 supervisor/systemd/SSH stdio 的并发 JSONL 服务，也提供反向代理可用的 HTTP `/v1/envelope` 和 `/healthz`。
- `src/connector/http-client.js`：云端 DSH 调用 Gateway 的超时、取消、错误和响应大小边界。
- `src/connector/websocket.js`：官方 DSH WebServer 的 `/v1/connect` upgrade、Connector hello/heartbeat、命令相关、断线和超时处理；本地端使用 Node 原生 WebSocket，不引入额外运行时依赖。
- `src/connector/pairing-registry.js`：设备/工作区配对凭据的哈希存储、过期、撤销和轮换；可挂到 WebSocket hub 的 hello 校验。
- `src/supervisor/process-supervisor.js`：把每个远端 SSH/profile 子进程的启动意图、PID/PGID、输出和终态写入持久库，支持进程组取消与重启对账。
- `bin/workspace-gateway.js`：读取受限环境变量并启动 JSONL Gateway；不会从 stdin 接收任意 shell。
- `bin/dsh-local-connector.js`：用户电脑/WSL 常驻 Connector；探测本地 CodeAgent，在受控 SSHFS 挂载或 remote-tools MCP 模式执行并主动连接 DSH。
- `bin/dsh-connector-pair.js`：运维端生成、轮换、撤销和列出 Connector 配对凭据；token 只在生成/轮换响应中返回一次。

## 检查

```bash
npm ci --ignore-scripts
npm test
npm run lint
npm run typecheck
```

## 启动 WSL JSONL Gateway

为每个受信工作区启动一个进程，并把 SSH 私钥、known_hosts 和 authority 上下文放在进程环境/secret store；不要写入仓库：

```bash
export DSH_GATEWAY_HOST=code-host.example
export DSH_GATEWAY_REMOTE_ROOT=/srv/project
export DSH_GATEWAY_USER=builder
export DSH_GATEWAY_IDENTITY_FILE=/var/lib/dsh/secrets/id_ed25519
export DSH_GATEWAY_KNOWN_HOSTS_FILE=/var/lib/dsh/secrets/known_hosts
export DSH_TENANT_ID=tenant-1
export DSH_WORKSPACE_ID=workspace-1
export DSH_CLOUD_RUN_ID=run-1
export DSH_AUTHORITY_RUN_ID=authority-1
export DSH_REVISION=1
export DSH_PHASE_EPOCH=P0-a
export DSH_CONNECTION_EPOCH=1
# Authority envelope HMAC key (use the same secret-store value as the cloud; never commit it)
export DSH_GATEWAY_SHARED_SECRET='<same-value-as-DSH_AUTHORITY_SHARED_SECRET>'
export DSH_GATEWAY_KEY_ID=dsh-cloud
# 跨进程 profile/构建资源锁（持久 SQLite；目录需由 dsh 用户预先创建）
export DSH_GATEWAY_LOCK_DB=/var/lib/dsh/gateway/resource-locks.sqlite3
# 操作幂等与失败回放日志（建议与锁库分开；同一工作区重启后仍可回放结果）
export DSH_GATEWAY_JOURNAL_DB=/var/lib/dsh/gateway/operations.sqlite3
# 固定 profile bundle；生产建议用 root:dsh 0640 的文件，避免把长 JSON 放进环境文件。
# 也可使用 DSH_GATEWAY_PROFILES='<JSON>'，但文件和内嵌 JSON 不能同时设置。
export DSH_GATEWAY_PROFILES_FILE=/opt/dsh/AI-AR-workflow/workspace-gateway/examples/ar-delivery-profiles.json
npm --prefix workspace-gateway start
```

生产部署通常把该 JSONL 进程放到本地 supervisor 后面，通过 mTLS/WSS 或只允许内网的 HTTP 反向代理暴露；HTTP 适配器的 `authorize` hook 用于传输层鉴权，Authority envelope HMAC 签名是操作授权边界。启动脚本默认要求 `DSH_GATEWAY_SHARED_SECRET`（只有隔离开发环境才可显式设置 `DSH_GATEWAY_ALLOW_UNSIGNED=1`），并用 `DSH_GATEWAY_KEY_ID` 支持密钥轮换。云端 DSH 通过 `signatureSecretEnv` 使用同一 secret 生成签名，secret 只来自 secret store，不进入 patch 或日志。

Connector WebSocket hub 已提供 `allowedOrigins`、`requireTls`、`requireClientCertificate`、证书指纹 allowlist、配对 registry 和审计回调。DSH 进程或前置反向代理必须实际启用 TLS，并把客户端证书验证结果传给 Node 请求；只有设置配对 registry 时，hello 中的 `device_id/workspace_id/token` 才会按持久记录验证。示例：

```js
localConnector: {
  enabled: true,
  workspaceId: 'workspace-1',
  remoteRoot: '/srv/project',
  pairingRegistry: { filePath: '/var/lib/dsh/connector-pairings.json' },
  allowedOrigins: ['https://dsh.example.com'],
  requireTls: true,
  requireClientCertificate: true
}
```

首次配对在云端执行（输出中的 token 只复制到用户 Connector 配置，不提交仓库）：

```bash
npx dsh-connector-pair --registry /var/lib/dsh/connector-pairings.json \
  --device-id windows-mgces-01 --workspace-id workspace-1 --label mgces-windows
npx dsh-connector-pair --registry /var/lib/dsh/connector-pairings.json --list
npx dsh-connector-pair --registry /var/lib/dsh/connector-pairings.json --rotate \
  --device-id windows-mgces-01 --workspace-id workspace-1
```

证书配对可在 `pair()` 时提供 `certificateFingerprint`，hub 会在 hello 时比较证书指纹。配对文件只保存 token 摘要；撤销或轮换后旧 token 立即失效。将 hub 配置 `replayPending: true` 可在断线时保留幂等命令、收到新 hello 后重发，并用 `ack` 帧记录 Connector 已接收；队列受 `maxReplayPending` 限制。生产环境同时设置绝对路径 `outboxFilePath`（或 `outbox_file_path`，也可用 DSH 宿主环境变量 `DSH_CONNECTOR_OUTBOX_FILE`），hub 会以 0600 权限原子写入 JSON outbox，在云端进程重启后按 `operation_id` 重绑 pending 操作，并直接回放已完成/失败结果；配置了 outbox 路径但未显式设置 `replayPending` 时会自动开启回放。`outboxRetentionMs` 和 `outboxMaxBytes` 分别限制保留时间和文件大小。Connector operation journal 已保证同一 `operation_id` 不会在本机重复执行。

持久化 outbox 示例：

```js
localConnector: {
  enabled: true,
  replayPending: true,
  maxReplayPending: 1024,
  outboxFilePath: '/var/lib/dsh/connector/outbox.json',
  outboxRetentionMs: 24 * 60 * 60 * 1000,
  outboxMaxBytes: 16 * 1024 * 1024
}
```

`outboxFilePath` 的父目录必须由运行 DSH 的账号预先创建并限权。文件只保存幂等操作的结构化命令摘要、状态和有界结果，不保存未标记 `operation_id` 的临时请求；页面可从 `connector.snapshot` 读取 `persistent_outbox_enabled`、`outbox_load_error`、`durable_outbox_records` 和 `replay_pending` 展示恢复状态。
如果 outbox 文件损坏、摘要不匹配或无法解析，hub 会把 `outbox_load_error` 暴露给页面并拒绝新的 Connector 命令（`connector_outbox_load_failed`），避免在无法判断历史副作用时重复执行；修复或恢复该文件后再重启 DSH。

`DSH_GATEWAY_JOURNAL_DB` 保存每个 `operation_id` 的输入指纹、running/completed/failed 状态和有界结果，同时保存 `supervised_processes` 表。Gateway 在启动子进程前先写入启动意图，随后记录 PID、PGID、Linux boot id/start ticks 和有界 stdout/stderr；取消或超时时按进程组发送 SIGTERM，并在必要时发送 SIGKILL。相同操作在进程重启后会回放已完成结果或原始结构化失败，避免重复执行远端副作用。

启动时内置 `ProcessSupervisor` 会先把之前仍处于 `starting/running` 的记录标为 `unknown`，并默认对仍存活的进程组发送 SIGTERM，宽限期后发送 SIGKILL；它保留 `unknown` 供云端对账，不能把它改写成成功。需要只读检查时可调用 `reconcile({terminate:false})`；确认旧进程已停止后使用新的 operation id 重试，或调用取消接口终止记录的进程组。`operation.cancel` 可以按父 operation id 一次取消该 operation 产生的所有 SSH/profile 子进程，`authority.inspect`/`ProcessSupervisor.snapshot()` 可供宿主运维读取脱敏证据（命令、参数和输出不会返回）。不要删除操作库来解锁。未设置该变量时，若设置了 `DSH_GATEWAY_LOCK_DB`，启动器会为兼容旧部署复用锁库；生产建议显式使用独立的 journal 路径并纳入备份。

该 supervisor 现在可以通过 `cgroupMode` 接入 Linux cgroup v2：`disabled` 保持开发机旧行为，`best_effort` 在无法取得委派子树时回退到进程组并把原因写进 `process_isolation`，`required` 则在子进程启动前失败，不允许无隔离运行。部署启动器读取 `DSH_PROCESS_CGROUP_MODE`、`DSH_PROCESS_CGROUP_ROOT`、`DSH_PROCESS_CGROUP_PREFIX` 以及可选的 memory/pids/cpu 限制；`DSH_PROCESS_CGROUP_ROOT=self`（或 `auto`）会从 `/proc/self/cgroup` 解析当前 systemd 服务的委派子树。它仍不替代 systemd 或容器级故障回收；生产云端应使用本仓 `platform/deploy/systemd/` 单元的 `KillMode=control-group`、资源上限和 `Delegate=yes`，再由 doctor 确认委派根可写后启用 required。任何操作仍必须通过 Gateway 的 authority、路径和 profile 校验。

`workspace.hash` 在代码端执行 `sha256sum` 和 `wc -c`，只回传摘要与字节数，适合 HAP/HSP/SO/IMG 等二进制产物；云端调试面板优先使用该操作，不会把二进制文件按 UTF-8 读入内存。旧 Gateway 不支持该操作时，面板保留受限元数据并明确标记不可验证，不把二进制当文本读取。

`workspace.read_binary` 只对受限大小的产物返回 base64，并在 Gateway 端计算字节数和 SHA-256；官方 DSH 的下载路由会再次校验这两个值后返回原始字节。旧 Gateway 没有该操作时仍可查看 hash/bytes，但下载会明确显示不可用。

`workspace.probe` 是启动 P0 前的实际代码端探测。它在登记的 SSH 主机上解析 `remoteRoot`，确认目标仍是目录并具备读权限；调用方传入 `require_write: true` 时还必须具备写权限。传入 `expect: "file"` 时会额外确认目标是普通文件，供源码入口（例如 `build.sh`）和 AR 文件检查使用；默认 `expect: "directory"`。Gateway 返回的 `realpath` 只作为脱敏绑定证据，不能被请求覆盖。SSH/HTTP Gateway 的 `/healthz` 只能证明进程存活，不能替代这个工作区探测；DSH 远端预检只有在两者都通过时才会把代码端标为可写。

DSH 预检会先探测本次 run 的 `repo_root`（它可以是登记 `remoteRoot` 下的项目子目录），再按所选环境探测源码入口：OpenHarmony 默认要求可执行的 `build.sh` 文件、`test/testfwk/developer_test` 目录和可执行的 `start.sh` 测试入口；HarmonyOS 的 system/chip 入口和其他 root markers 必须由对应环境 profile 显式登记，缺少时保持阻断。AR 文件也必须在选定项目根内并通过 `expect: "file"` 探测；远端没有本地示例文件时，调用方应传远端相对路径或 `ar_text`。

## Gateway profile

`workspace.exec_profile` 只运行登记的固定命令。云端 AR CodeAgent 可登记例如：

```json
{
  "codeagent.claude": {
    "command": "claude",
    "args": ["-p", "{{prompt}}", "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits", "--model", "{{model}}"],
    "resource_lock": "workspace",
    "capabilities": ["workspace_write", "usage_observable", "cancel_observable"]
  },
  "codeagent.opencode": {
    "command": "opencode",
    "args": ["run", "--format", "json", "--dir", "{{workspace_root}}", "--model", "{{model}}", "{{prompt}}"],
    "resource_lock": "workspace",
    "capabilities": ["workspace_write", "usage_observable", "cancel_observable"]
  },
  "codeagent.codex": {
    "command": "codex",
    "args": ["exec", "--json", "--sandbox", "workspace-write", "-C", "{{workspace_root}}", "{{prompt}}"],
    "resource_lock": "workspace",
    "capabilities": ["workspace_write", "usage_observable", "cancel_observable"]
  },
  "codeagent.custom": {
    "command": "my-codeagent",
    "args": ["--workspace", "{{workspace_root}}", "--prompt-file", "{{prompt_file}}", "--model", "{{model}}"],
    "resource_lock": "workspace",
    "capabilities": ["workspace_write", "usage_observable", "cancel_observable"]
  }
}
```

profile 变量会逐项 shell quote；不能通过变量注入命令。`RemoteCodeAgentExecutor` 会先写入受限 prompt 文件，再调用 profile，并把 stdout/stderr 写回远端 `evidence/<phase>/`，返回 usage 和 artifact refs。云端仍必须让 Python gate 在同一可见代码根执行，或提供等价的远端 gate profile；Gateway 自己不会把 CodeAgent 文本变成 PASS。

这条 profile 路径是“计算云 DSH + SSH 代码主机”部署的推荐实现：CodeAgent 和 Python gate 都在
`remoteRoot` 所在主机运行，所以 Agent 改完的文件无需同步就能被下一步 gate 读取。

当前也已实现“计算云 DSH + 用户电脑本地 CodeAgent + SSH 代码”的 Connector 模式。Connector
必须把 SSH 代码根挂载为本地绝对目录（Linux/WSL 使用 `sshfs` 或企业受控等价物），云端只发送
`repo_relative`、`pipeline_relative` 和固定 Agent id；本地服务把路径映射到挂载目录后调用
`LocalCodeAgentExecutor`，因此 Claude Code/OpenCode/Codex 的修改会直接落到 SSH 主机。云端不能
下发任意本地命令或路径，Connector 只接受 `probe`、`agent.start/status/cancel`。P4–P8 的 Python
gate、设备、产物和发布仍通过 SSH Workspace Gateway 在代码端执行，两个连接都必须在预检中通过。
挂载模式会增加网络 IO、软链接/权限和断线恢复成本；预检会明确显示 `connector_sshfs_mount`，
挂载未就绪时保持阻断，不把本地目录误报成远端证据。

如果不希望挂载源码，也可以使用已经实现的 `remote_tools` 模式。Connector 在本机保留 SSH
凭据和 WorkspaceConnector，按 run 创建短时 Unix socket；本地 CodeAgent 通过 MCP 配置调用
`dsh_workspace_read/list/search/write/diff/hash/read_binary` 及管理员显式登记的
`dsh_workspace_exec_profile`。MCP 子进程拿不到 SSH 私钥，所有请求仍经过远端 root、符号链接、
CAS、profile 和资源锁校验。CodeAgent 的 stdout/stderr 会写回 SSH 工作区的
`evidence/<phase>/`，临时本地目录在 run 结束后删除。Claude Code 使用
`--strict-mcp-config --mcp-config` 加载 `mcpServers` JSON；OpenCode 使用 `OPENCODE_CONFIG`
加载官方 flat `mcp.dsh_remote` JSON，并通过官方 `permission` deny 规则拒绝本地 bash/read/write 工具；Codex 使用隔离的 `CODEX_HOME/config.toml` 加载 `mcp_servers` TOML。
Codex 临时 home 会复制本机存在的 `auth.json`/`credentials.json`，不修改持久配置。
目标 CLI 若需要自定义参数，Connector 配置支持 `remote_tools.mcp_config_format`/
`mcpConfigArg`；自定义 argv Agent 必须显式使用配置文件占位符，不会静默降级为本地目录。
P4–P8 仍由 SSH Workspace Gateway 的 AR gate profile 执行。

remote-tools 配置示例见 [`examples/local-connector-remote-tools.json`](examples/local-connector-remote-tools.json)。
它不需要 `local_root` 或 SSHFS；`ssh.host`、`remote_root`、known_hosts 和身份文件必须由用户
本机预先准备，`remote_tools.allowed_profiles` 只能列入已登记的固定 profile。Connector 探测会
返回 `workspace_access: "remote_tools"`、远端目录读写状态和可用 Agent，官方 DSH 预检据此阻断
不可达的 SSH 工作区。

启动本地 Connector（Windows 可在 WSL 中运行）。`local_root` 必须是 SSHFS 挂载目录；可以先手工挂载，也可以让 Connector 用受限 argv 自动挂载并在退出时卸载。Windows 原生运行时如果 CLI 是 npm 生成的 `.cmd/.bat` 包装器，Connector 会通过 PowerShell JSON argv 桥调用，不会把提示词拼进 shell；必要时用 `DSH_POWERSHELL_COMMAND` 指定 `pwsh.exe`/`powershell.exe`：

```bash
sshfs builder@code-host:/srv/project /mnt/dsh-code -o StrictHostKeyChecking=yes
node workspace-gateway/bin/dsh-local-connector.js --config /absolute/path/connector.json
```

自动挂载只接受固定 SSH 参数，不执行配置中的 shell 字符串。`sshfs`、`fusermount3` 和 FUSE
必须由本机管理员安装；挂载状态会通过 Linux `/proc/self/mountinfo` 验证，空目录不会被误认为
远端代码。自动挂载的 Connector 退出时只卸载它自己创建的挂载：

```json
{
  "url": "wss://dsh.example.com/v1/connect",
  "token": "one-time-or-rotated-connector-token",
  "device_id": "windows-mgces-01",
  "workspace_id": "workspace-1",
  "remote_root": "/srv/project",
  "auto_mount": true,
  "ssh": {
    "host": "code-host.example",
    "username": "builder",
    "port": 22,
    "mount_point": "/mnt/dsh-code",
    "identity_file": "/home/user/.ssh/id_ed25519",
    "known_hosts_file": "/home/user/.ssh/known_hosts",
    "options": ["reconnect", "ServerAliveInterval=15", "ServerAliveCountMax=3"]
  }
}
```

`ssh.remote_root`（若填写）必须与顶层 `remote_root` 完全一致。若不启用 `auto_mount`，Connector
仍会拒绝未出现在 mountinfo 中的目录；这避免把本地空目录误绑定为 SSH 代码。挂载失败会在
Connector 启动输出和官方 DSH 的 `/api/ohos-ar/connector/probe` 中显示原因。
可直接复制 [`examples/local-connector-sshfs.json`](examples/local-connector-sshfs.json) 作为自动挂载模板。

SSHFS 配置文件最小示例（token 只放本地文件或环境变量，不提交仓库；`ssh.host` 是必填绑定）：

```json
{
  "url": "wss://dsh.example.com/v1/connect",
  "token": "one-time-or-rotated-connector-token",
  "device_id": "windows-mgces-01",
  "workspace_id": "workspace-1",
  "local_root": "/mnt/dsh-code",
  "remote_root": "/srv/project",
  "ssh": {
    "host": "code-host.example",
    "username": "builder",
    "mount_point": "/mnt/dsh-code",
    "identity_file": "/home/user/.ssh/id_ed25519",
    "known_hosts_file": "/home/user/.ssh/known_hosts"
  },
  "settings_file": "/home/user/.config/dsh/codeagent-settings.json",
  "reconnect": true
}
```

云端 DSH 插件启用对应模式：

```js
localConnector: {
  enabled: true,
  workspaceId: 'workspace-1',
  remoteRoot: '/srv/project',
  authToken: process.env.DSH_CONNECTOR_TOKEN
},
workspaceGateway: {
  enabled: true,
  remoteRoot: '/srv/project',
  // deliveryProfiles、signatureSecretEnv 和 profiles 与上面的 Gateway 配置相同
}
```

官方 DSH WebServer 会注册 `GET /v1/connect` upgrade；TLS 由 DSH 进程或反向代理终止，公网使用
`wss://`，本机验证也可使用 `ws://127.0.0.1:8787/v1/connect`。Connector 连接后，官方 AR
页面的 Overview/CodeAgent/Preflight 会显示在线设备、Agent 版本、SSHFS 工作区和两个执行位置。

`workspace.exec_profile` 的远端调用使用 `privateInvocation`：Supervisor 对这类 CodeAgent
profile 不持久化原始 argv、prompt 或 stdout/stderr，实时结果仍返回给当前调度器并用于 usage/产物
摘要。临时 `.dsh/scheduler-prompts/<attempt>.md` 在成功、失败和取消路径都会删除；清理失败会作为
独立诊断附在原始 CodeAgent 错误上，不覆盖真正的构建或测试原因。

DSH 页面中的模型字段是可选的。若 profile 使用相邻的 `--model {{model}}` 参数而本次模型为空，Connector 会把这两个 argv 项一起省略，让 CLI 使用自己的默认模型；其他变量仍要求显式提供。

### AR Python gate profiles

仅登记 CodeAgent profile 还不能启动完整 P0–P8。`RemotePythonDeliveryAdapter` 还需要六个固定 profile，
它们在代码端调用仓库的 `advance.py` 与只读 `delivery_bridge.py`：
`ar.delivery.init`、`ar.delivery.inspect`、`ar.delivery.validate`、`ar.delivery.advance`、
`ar.delivery.consent` 和 `ar.delivery.failure_snapshot`。本仓提供可直接复制的完整模板
[`examples/ar-delivery-profiles.json`](examples/ar-delivery-profiles.json)。

Gateway 启动器支持两种 profile bundle 来源：推荐设置绝对路径
`DSH_GATEWAY_PROFILES_FILE`，由启动用户读取一个 root-owned、只读的 JSON 对象文件；开发或
容器内嵌场景也可设置 `DSH_GATEWAY_PROFILES`。两者同时设置、相对路径、文件不存在、JSON
不是对象都会在进程启动前失败，避免服务使用空 profile 启动后才在 P0 暴露问题。systemd
模板已默认指向本仓的 `examples/ar-delivery-profiles.json`，部署时应把其中的命令路径和
代码端 gate bundle 按目标主机审阅后再启用。

模板中的 `/usr/local/bin/dsh-ar-delivery` 是随本包提供的固定 argv helper；将
`workspace-gateway/bin/dsh-ar-delivery.js` 安装到代码端并命名为该路径，或把 profile 的
`command` 改成代码端 Node 的绝对路径并把脚本路径作为第一个固定参数。helper 只接受上述固定操作，
默认从本次 run 的 `repo_root` 定位 `skills/ohos-ar-dev-phases/scripts/advance.py` 和
`runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py`，不执行任意 shell。
对于代码仓本身没有 DSH bundle 的情况，在 `remoteRoot/.dsh/ar-workflow/` 下安装管理员维护的只读
脚本副本，并在云端 `workspaceGateway` 设置 `deliveryScriptsRoot` 和 `deliveryBridgePath`；模板的
`{{scripts_root}}`/`{{bridge_path}}` 会由适配器注入，不能由页面或模型覆盖。两个路径必须位于
登记的 `remoteRoot` 内，P0 会用 `workspace.probe` 检查每个 gate、`lib/environments.py` 和 bridge。
profile 变量由 Gateway 逐项 shell quote；空的可选 flag 会被成对省略。每个 profile 都应设置
`resource_lock: workspace`，否则同一工作区的 gate 与 CodeAgent 可能并发写入。

模板同时登记 `debug.device_probe`。将 `workspace-gateway/bin/dsh-device-probe.js`
安装为 `/usr/local/bin/dsh-device-probe`，并在云端 patch 的 `workspaceGateway` 中设置
`deviceProfile: 'debug.device_probe'`。它只执行 `hdc list targets`，返回设备状态和候选
序列号；设备属性、产物兼容性和 P6/P7 gate 仍由目标仓库的正式脚本确认。

远端模式默认开启 `RemoteRagIndex`：云端索引通过 Gateway 的 `workspace.list/read` 获取
允许的文本源码，并在每次检索返回前重新读取并校验 hash。索引内容会写入 DSH 的
`dataRoot/remote-rag-index.json`，因此启用前应确认 workspace 的云端出站授权；设置
`workspaceGateway.ragEnabled: false` 可关闭该入口。配置 OpenAI-compatible RAG endpoint 后，
`embedding_reranker` profile 会真实调用 `/embeddings` 和 `/rerank` 并显示 `execution=active`；
无 endpoint 或模型请求失败时显示 `planned`/`partial`，结果保留词法 fallback 原因，不会伪装成向量检索。

## 云端接入

```js
import { WorkspaceGatewayClient } from '@ai-ar-workflow/workspace-gateway/gateway';
```

当前包的导出路径是 `@ai-ar-workflow/workspace-gateway/gateway`；它同时导出 Connector、JSONL/HTTP Gateway 和 HTTP client。DSH patch 中设置：

```js
workspaceGateway: {
  enabled: true,
  baseUrl: 'https://connector.internal/workspaces/w1',
  remoteRoot: '/srv/project',
  deliveryScriptsRoot: '/srv/project/.dsh/ar-workflow/skills/ohos-ar-dev-phases/scripts',
  deliveryBridgePath: '/srv/project/.dsh/ar-workflow/runtime/delivery_bridge.py',
  // Only tenant/workspace are fixed for a multi-run workspace gateway.
  // The DSH adapters derive the run/revision/phase fields per operation.
  authorityContext: { tenant_id: 't1', workspace_id: 'w1' },
  signatureSecretEnv: 'DSH_AUTHORITY_SHARED_SECRET',
  signatureKeyId: 'dsh-cloud',
  ragEnabled: true,
  deviceProfile: 'debug.device_probe',
  profiles: { opencode: 'codeagent.opencode', codex: 'codeagent.codex', custom: 'codeagent.custom' },
  deliveryProfiles: {
    init: 'ar.delivery.init', inspect: 'ar.delivery.inspect', validate: 'ar.delivery.validate',
    advance: 'ar.delivery.advance', consent: 'ar.delivery.consent',
    failureSnapshot: 'ar.delivery.failure_snapshot'
  }
}
```

需要串行化同一工作区的 CodeAgent、构建或设备 profile 时，在 profile 上增加
`"resource_lock": "workspace"`，并设置 `DSH_GATEWAY_LOCK_DB`。Gateway 会用 SQLite
事务原子获取/续租/释放锁；进程异常退出后锁记录仍可被 Supervisor 对账，不能用删除
SQLite 文件的方式强制解锁。

启用后，OpenCode/Codex 和登记了 `codeagent.claude` 的 Claude Code 会在官方 CodeAgent catalog 中显示 `gateway_configured`，scheduler 使用远端 profile；没有该 profile 时 Claude 仍由官方 DSH provider 在 DSH 主机执行。远程根、authority context 和 profile 不能由模型请求覆盖。
