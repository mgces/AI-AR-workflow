# DSH Local Console

这是 Windows→WSL 开发模式下的可运行入口。它默认绑定 `127.0.0.1:8787`，无需登录；官方 DSH Web 部署时，官方页面和 AR Delivery 面板仍是唯一用户入口，本 console 只作为没有 DSH Web 时的本地 fallback 和自动化验收面。

## 能力

- SQLite 持久化 AR run、任务、租约、事件、人工输入、审核、失败原因和 CodeAgent usage；调度器会真正启动已适配的本地 CLI，并支持取消、恢复和进程重启后的重新调度。
- Claude Code、OpenCode、Codex CLI 使用非交互执行协议；探测到的 Cursor/Trae 仍会显示，但没有对应 adapter 时会明确拒绝派发。自定义 Agent 可选择 `argv` 协议，Linux/macOS 命令通过 `shell:false` 执行。Windows 上常见的 npm `.cmd/.bat` 包装器会通过 PowerShell 的 JSON argv 桥启动，提示词中的 shell 字符仍作为参数传递；可用 `DSH_POWERSHELL_COMMAND` 指定受控的 `pwsh.exe` 或 `powershell.exe`。
- CodeAgent 选择和模型保存到运行目录的 `codeagent-settings.json`。只保存命令配置，不接收 API key、token 或 SSH 私钥；凭据由各 CLI 自己的配置管理。
- RAG 在本地模式使用工作区内持久索引；Workspace Gateway 模式使用 `RemoteRagIndex` 通过带 size/mtime 的 `workspace.list` 和 `workspace.read` 建索引，并在结果返回前回读 hash。设置 `DSH_RAG_ENDPOINT` 后会通过 OpenAI-compatible `/embeddings` 和 `/rerank` 真实执行语义检索，凭据从 `DSH_RAG_API_KEY` 读取且不写入 profile；未配置服务时明确显示词法 fallback。远端索引是否缓存到云端由 `workspaceGateway.ragEnabled` 控制。
- 远端调试产物优先通过 Gateway `workspace.hash` 在代码端计算二进制 sha256/字节数，再展示到 DSH 页面；官方页面下载时使用受限 `workspace.read_binary` 返回 base64，并再次校验 hash/bytes。旧 Gateway 不支持这些操作时会明确降级为只读元数据。`debug.device_probe` 仍是只读固定 profile，不会代替 P6/P7 gate。
- `/api/debug/status` 和 `/api/debug/scan` 识别 hdc 目标以及 `.hap/.hsp/.so/.ko/.elf/.img/.bin` 产物，并把设备/产物状态接到 AR 页面；识别结果是事实和 advisory，不替代 P6/P7 gate。
- OpenHarmony、HarmonyOS-system、HarmonyOS-chip 通过不同环境 profile 进入不同分支；当前仓库不是 OHOS 产品根目录时，P0 会保留阻塞原因。

## 启动

```bash
npm --prefix platform ci --ignore-scripts
npm --prefix platform run console
```

从 Windows 浏览器打开 `http://localhost:8787`。端口或 WSL localhost 转发不可用时，检查 `ss -ltnp`，或使用 WSL 地址。服务可用性检查：

```bash
curl http://127.0.0.1:8787/healthz
curl http://127.0.0.1:8787/api/status
```

如需启用 RAG 模型服务，在启动 console 前由宿主注入 endpoint 和 secret：

```bash
export DSH_RAG_ENDPOINT=https://rag.example/v1
export DSH_RAG_API_KEY='provided-by-secret-store'
npm --prefix platform run console
```

页面保存的 endpoint 只是模型 profile 元数据；实际请求使用服务端启动时注入的 endpoint，避免浏览器把凭据带入运行目录。

## 主要 API

| API | 用途 |
|---|---|
| `GET /api/status` | 环境、主机能力、Agent、RAG、设备/产物和最近 run |
| `GET /api/agent-settings` / `PUT` | 读取或保存 CodeAgent、模型和自定义 argv 命令 |
| `GET /api/agents` / `POST /api/agents/refresh` | 读取或重新探测当前 WSL 用户的 CLI |
| `GET/POST /api/ar/preflight` | 在创建 run 前检查本地工作区、Python/Git、环境分支、CodeAgent 和设备条件 |
| `POST /api/ar/runs` | 启动真实的本地 scheduler AR run |
| `/api/ar/runs/:id/*` | 状态、claim/context、heartbeat、submit、validate、consent、artifact、事件、取消和恢复 |
| `GET /api/rag/profile` / `PUT /api/rag/profile` | 读取或保存 RAG provider、embedding/reranker 模型配置（不接收凭据） |
| `POST /api/rag/index` / `POST /api/rag/search` | 建立索引和检索代码 |
| `GET /api/debug/status` / `POST /api/debug/scan` | 设备与产物识别 |

本地真实 scheduler 会在 `POST /api/ar/runs` 前强制执行 `/api/ar/preflight` 同等检查；检查失败时不会创建 run。每个 run 的 `pipeline_dir`、`evidence/`、`reports/` 和 `controls/` 都由权威 runtime 校验。CodeAgent 返回“完成”不会直接推进阶段，必须由真实 Python gate 和 `advance.py` 产生通过证据。

## 运行边界

本地 console 适合 WSL 单机和内网调试；要把代码留在用户电脑并由云端 DSH 调度，部署 `workspace-gateway` 的 JSONL/HTTP 传输和受限 SSH Connector，再在官方 DSH patch 中启用 `workspaceGateway`。该模式仍需要真实 OHOS/HarmonyOS 产品、工具链、设备和 gate 环境，不能用当前平台仓库冒充完整产品验收。
