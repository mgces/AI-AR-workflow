# 迁移到计算云部署手册

版本：1.0 · 日期：2026-09-12
适用范围：`AI-AR-workflow` 当前仓库、官方 DSH Web、AR Delivery 面板、CodeAgent 探测与选择。

本文给出从当前 WSL 开发环境迁移到一台 Linux 计算云主机的可执行步骤。命令中的路径、域名、用户和端口都是示例，部署时必须替换成自己的值。

## 先确认部署模式

当前仓库有两个边界，不能混在一起验收。

| 模式 | 代码和 Agent 在哪里 | 当前仓库状态 | 适用场景 |
|---|---|---|---|
| 单云节点 MVP | DSH、CodeAgent、AR runtime、代码仓和 Python gate 都在计算云 | 可以按本文直接启动 | 个人试用、内网演示、先验证 P0/P1 |
| 目标云架构 | DSH 在云；CodeAgent 在用户电脑；代码在用户指定 SSH 主机 | Connector、Workspace Gateway、OpenCode/Claude 双适配器仍需按实施任务实现 | 多用户公网服务、用户不把代码复制到云 |

本文第 1 至 8 节可以让单云节点 MVP 运行起来。第 9 节以后说明如何向目标云架构演进。

当前实现不能把 `repoRoot` 写成 `ssh://...`，也不能把 `CodeAgent` 选择理解为已经完成远程 Connector。AR Python adapter 需要在 DSH 进程所在主机执行 `advance.py`、gate 和 inspect；真正的远端执行必须经过后续 Workspace Gateway。

## 1. 计算云准备条件

建议使用一台 Ubuntu 22.04/24.04 x86_64 云主机，初始规格为 8 vCPU、16 GiB 内存、100 GiB 持久盘。真实 OHOS 编译和设备测试按源码规模另行扩容。需要：

- Node.js 22.19 或更高；生产基线建议 Node 24；
- Python 3、`venv`、Git、`curl`、`ca-certificates`；
- 能访问 npm 镜像、CodeAgent 模型服务和目标 SSH 主机的出站网络；
- 云安全组只开放 443，SSH 管理端口只允许管理网段；
- `/var/lib/dsh` 使用持久盘，不能放在会被回收的临时盘；
- 如果在云上执行 P4/P6，云主机还必须安装对应 OpenHarmony/HarmonyOS 编译工具链、hdc、设备驱动和发布工具。

先检查基础版本：

```bash
node --version
npm --version
python3 --version
git --version
```

若 Node 低于仓库要求，先用发行版包管理器、nvm 或企业 Node 镜像升级。不要用 Node 版本警告代替真实兼容性验收。

## 2. 创建服务用户和目录

不要用 root 运行 DSH 或 CodeAgent。以下命令创建一个只用于该实例的系统用户；如果云平台已有运维用户和目录规范，按同等权限替换。

```bash
sudo useradd --system --create-home --home-dir /var/lib/dsh \
  --shell /usr/sbin/nologin dsh

sudo install -d -o dsh -g dsh -m 0750 \
  /opt/dsh /opt/dsh/official \
  /var/lib/dsh /var/lib/dsh/runtime \
  /var/lib/dsh/controller-state \
  /var/log/dsh
```

本文后续使用这些变量：

```bash
export DSH_USER=dsh
export DSH_HOME=/var/lib/dsh
export DSH_INSTALL=/opt/dsh/official
export APP_ROOT=/opt/dsh/AI-AR-workflow
export CODE_ROOT=/srv/dsh/workspaces/default
export RUNTIME_ROOT=/var/lib/dsh/runtime
export CONTROLLER_STATE=/var/lib/dsh/controller-state
```

把变量写入 `/etc/dsh/dsh.env`（权限 `0640`、属主 `root:dsh`），供 systemd 使用；不要把 API key、SSH 私钥或 CodeAgent 登录文件写进 Git。

## 3. 上传仓库到云主机

推荐在云主机固定目录保留完整仓库，而不是只打包 `dsh-workflow/`。当前 `dsh-workflow` 通过相对路径复用 `runtime/`、`platform/` 和 `skills/`，只安装一个裁剪后的 npm 包会导致这些导入和 Python 脚本缺失。

从 Git 仓库拉取：

```bash
sudo -u dsh git clone <YOUR_GIT_URL> "$APP_ROOT"
sudo chown -R dsh:dsh "$APP_ROOT"
```

如果使用当前工作树打包上传，在 Windows/WSL 执行：

```bash
rsync -az --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  /home/mgces/code/AI-AR-workflow/ \
  dsh@<CLOUD_HOST>:/opt/dsh/AI-AR-workflow/
```

不要把 `dsh-workflow/.runtime/`、SQLite 密钥、模型凭据和用户输入备份到公开制品库。上传后在云主机核对提交：

```bash
sudo -u dsh git -C "$APP_ROOT" rev-parse HEAD
sudo -u dsh test -f "$APP_ROOT/skills/ohos-ar-dev-phases/scripts/advance.py"
sudo -u dsh test -f "$APP_ROOT/runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py"
```

单云节点模式下，把需要运行 AR 的代码仓放到 `$CODE_ROOT`，并保证它位于后面 patch 的 `repoRoot` 之下：

```bash
sudo install -d -o dsh -g dsh -m 0750 "$CODE_ROOT"
sudo -u dsh git clone <OHOS_OR_HARMONYOS_REPO_URL> "$CODE_ROOT/project"
```

如果编译环境只能存在另一台 SSH 主机，先不要伪造 `repoRoot`；应进入目标云架构，部署 SSH Workspace Gateway 后再绑定该工作区。

## 4. 安装官方 DSH 和本仓插件

当前仓库按官方 DSH Web profile 接入。版本必须固定，以下版本与本地验证环境一致；升级时要重新做 smoke test。

```bash
sudo -u dsh npm install --prefix "$DSH_INSTALL" \
  @deepseek-ai/dsh@0.1.5-rc.1

sudo -u dsh mkdir -p "$DSH_HOME/profiles/web/node_modules/@ai-ar"
sudo -u dsh ln -sfn "$APP_ROOT/dsh-workflow" \
  "$DSH_HOME/profiles/web/node_modules/@ai-ar/dsh-workflow"

sudo -u dsh npm install --prefix "$DSH_HOME/profiles/web" \
  --save @deepseek-ai/dsh-subagent-claude-code@0.1.5-rc.2
```

确认链接和包存在：

```bash
sudo -u dsh readlink -f \
  "$DSH_HOME/profiles/web/node_modules/@ai-ar/dsh-workflow"
sudo -u dsh "$DSH_INSTALL/node_modules/.bin/dsh" --version
sudo -u dsh test -f \
  "$DSH_HOME/profiles/web/node_modules/@deepseek-ai/dsh-subagent-claude-code/package.json"
```

官方 Claude provider 的账号认证由 Claude Code/Provider 自己管理。凭据通过云主机的 secret store、受限环境变量或该用户的原生配置注入，不能写入 `cordis.patch.yml`。

## 5. 生成云专用 DSH patch

不要直接把开发机的 `/home/mgces/code/...` 和 `/tmp/dsh-ohos-official` 带到云上。复制一份部署 patch，例如 `$APP_ROOT/deploy/cordis.cloud.patch.yml`，把路径全部换成云目录：

```bash
sudo -u dsh mkdir -p "$APP_ROOT/deploy"
sudo -u dsh cp "$APP_ROOT/dsh-workflow/cordis.patch.yml" \
  "$APP_ROOT/deploy/cordis.cloud.patch.yml"
```

```yaml
# /opt/dsh/AI-AR-workflow/deploy/cordis.cloud.patch.yml
- insert:
    - id: ai-ar-adaptive-workflow-controller
      name: '@ai-ar/dsh-workflow'
      config:
        enableDeliveryRuntime: true
        dataRoot: '/var/lib/dsh/runtime'
        stateDir: '/var/lib/dsh/controller-state'
        workspaceRoot: '/srv/dsh/workspaces/default/project'
        repoRoot: '/srv/dsh/workspaces/default/project'
        defaultArPath: 'docs/reference/dsh-cloud-platform-v1/examples/ar-delivery.workflow.json'
        deliveryScriptsRoot: '/opt/dsh/AI-AR-workflow/skills/ohos-ar-dev-phases/scripts'
        deliveryBridgePath: '/opt/dsh/AI-AR-workflow/runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py'
        pythonCommand: '/usr/bin/python3'
        workspaceId: 'cloud-default'
        workflowId: 'ar-delivery'
        hostBindingId: 'dsh-cloud-agent'
        hostKind: 'claude-code'
        hostVersion: 'dsh-cloud'

- id: ui-settings-models
  name: '@deepseek-ai/dsh-client-ui-settings-models'
  disabled: true

- id: agent-presets
  name: '@deepseek-ai/dsh-agent-presets'
  config:
    default: 'claude-code'
    roots:
      - path: '/opt/dsh/AI-AR-workflow/dsh-workflow/config/presets'
        trust: system
    includeShippedRoot: true
    includeUserRoot: true

- insert:
    - id: subagent-claude-code
      name: '@deepseek-ai/dsh-subagent-claude-code'
      config:
        permissionMode: 'acceptEdits'
```

目录权限至少要满足：

```bash
sudo chown -R dsh:dsh /var/lib/dsh /var/log/dsh "$CODE_ROOT"
sudo chmod 0750 /var/lib/dsh /var/lib/dsh/runtime /var/lib/dsh/controller-state
```

`ui-settings-models` 的禁用只表示当前 AR 工作台不弹 DeepSeek API key onboarding；它不代表云端模型、Claude Code 或其他 Agent 已经认证。生产环境如果要启用 DSH 自己的模型，按 DSH 的 Provider 文档单独配置凭据和额度。

## 6. 安装和探测 CodeAgent

CodeAgent 设置保存在：

```text
/var/lib/dsh/runtime/codeagent-settings.json
```

页面会探测运行 DSH 的这台云主机的 `PATH`，不是探测用户 Windows 本机。为可重复部署，把 CLI 的绝对路径写进 `/etc/dsh/dsh.env`：

```dotenv
PATH=/usr/local/bin:/usr/bin:/bin
DSH_OPENCODE_CLI=/usr/local/bin/opencode
DSH_CODEX_CLI=/usr/local/bin/codex
DSH_CURSOR_CLI=/usr/local/bin/cursor-agent
DSH_TRAE_CLI=/usr/local/bin/trae
```

只安装自己有权使用的 Agent，并按各产品官方文档完成认证。安装后先在同一用户下检查：

```bash
sudo -u dsh env PATH=/usr/local/bin:/usr/bin:/bin opencode --version
sudo -u dsh env PATH=/usr/local/bin:/usr/bin:/bin codex --version
sudo -u dsh env PATH=/usr/local/bin:/usr/bin:/bin cursor-agent --version
sudo -u dsh env PATH=/usr/local/bin:/usr/bin:/bin trae --version
```

当前 DSH 集成的状态含义如下：

| 状态 | 含义 |
|---|---|
| `available` / 可发现 | 命令存在且 `--version` 成功，或官方 Claude provider 已加载 |
| `missing` / 未发现 | 配置的命令不在 PATH 或文件不存在 |
| `probe_failed` / 探测失败 | 命令存在，但版本探测返回错误、超时或权限错误 |
| `configured` / 已配置 | 自定义命令已保存；发现阶段不会执行自定义命令 |
| `待适配器` | 已发现 CLI，但当前 DSH 尚未挂载对应宿主适配器 |

在官方 AR 页面进入 **CodeAgent 设置**，点击“刷新本地 Agent”。也可以在已建立 DSH 浏览器会话后调用：

```bash
curl -X POST \
  -H 'Cookie: <DSH_SESSION_COOKIE>' \
  https://<YOUR_DOMAIN>/api/ohos-ar/codeagents/refresh
```

本仓当前可直接自动派发的是官方 `@deepseek-ai/dsh-subagent-claude-code`。OpenCode、Codex CLI、Cursor Agent、Trae CLI 和自定义命令可以被发现、保存和显示；没有对应宿主适配器时，启动 run 会返回 `codeagent_adapter_unavailable`（HTTP 422），不会创建一个看似运行但实际无人执行的任务。

## 7. 用 systemd 启动官方 DSH

创建 `/etc/systemd/system/dsh-web.service`：

```ini
[Unit]
Description=DeepSeek Harness Web with AI-AR workflow
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=dsh
Group=dsh
WorkingDirectory=/opt/dsh/AI-AR-workflow
EnvironmentFile=/etc/dsh/dsh.env
Environment=DSH_HOME=/var/lib/dsh
Environment=NODE_ENV=production
ExecStart=/opt/dsh/official/node_modules/.bin/dsh --profile web \
  --patch /opt/dsh/AI-AR-workflow/deploy/cordis.cloud.patch.yml \
  --no-open --host 127.0.0.1 --port 8787
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/var/lib/dsh /var/log/dsh /srv/dsh/workspaces
StandardOutput=append:/var/log/dsh/web.log
StandardError=append:/var/log/dsh/web-error.log

[Install]
WantedBy=multi-user.target
```

启用并查看日志：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dsh-web
sudo systemctl status dsh-web --no-pager
sudo journalctl -u dsh-web -n 100 --no-pager
```

开发/内网首次使用时，日志会打印一次性 token URL。官方 Web 默认只监听 `127.0.0.1`，云安全组不应直接开放 8787。

## 8. 反向代理和首次打开

### 8.1 内网或临时调试：SSH 隧道

这是最简单的安全验证方式，不需要公开云端端口：

```bash
ssh -N -L 8787:127.0.0.1:8787 <CLOUD_USER>@<CLOUD_HOST>
```

把 systemd 日志中的 token URL 的主机部分替换成 `http://localhost:8787`，在本地浏览器打开。token 只用于建立浏览器会话，后续使用 DSH cookie。

### 8.2 HTTPS 反向代理

生产环境让 Nginx/Caddy/云负载均衡终止 TLS，并把请求转到 `127.0.0.1:8787`。Nginx 至少需要支持 WebSocket：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name dsh.example.com;

    ssl_certificate     /etc/letsencrypt/live/dsh.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dsh.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 3600s;
    }
}
```

首次打开时，把日志里的 token URL 换成 `https://dsh.example.com/?token=...`。如果前置身份代理已经保护站点，仍要保留 DSH 自己的 token/cookie 交换；不要把 token 写入长期书签或聊天记录。

当前官方 DSH Web 没有完整的多租户账号系统。只在私有网络使用时可以维持免登录体验；公网多人服务必须在反向代理或云身份层接 OIDC/企业 SSO，并把每个租户的 DSH profile、runtime 数据、工作区和密钥隔离。不能把一次性 token 当成用户登录系统。

## 9. 首次验收顺序

在云主机执行以下检查：

```bash
# 端口只应在本机监听；外网安全组不开放 8787
ss -ltn | grep ':8787'

# 未带 cookie 时返回 401 是预期行为
curl -i http://127.0.0.1:8787/ | head

# 插件路径和 Python 事实源存在
sudo -u dsh test -f "$APP_ROOT/dsh-workflow/src/dsh/plugin.js"
sudo -u dsh test -f "$APP_ROOT/skills/ohos-ar-dev-phases/scripts/advance.py"

# AR 运行时依赖可导入
sudo -u dsh npm --prefix "$APP_ROOT/dsh-workflow" run check
sudo -u dsh node --check "$APP_ROOT/dsh-workflow/src/dsh/codeagents.js"
```

在浏览器会话建立后，按以下顺序验收：

1. 打开官方 DSH 左侧 **AR Delivery**，确认没有 DeepSeek API key onboarding 页面。
2. 进入 **CodeAgent 设置**，刷新并确认 Claude provider、各 CLI 的状态、命令和版本。
3. 选择 Claude Code 保存，确认新建 run 的详情显示 `Agent claude-code`。
4. 选择一个未安装或未适配的 CLI，确认页面显示“待适配器”，启动时返回明确的 adapter 错误。
5. 选择 OpenHarmony，启动 P0，确认 `pipeline_dir` 位于配置的代码根 `specs/pipeline/<run_id>`，状态和事件可以刷新。
6. 只有在真实环境资料齐全时才选择 HarmonyOS-system 或 HarmonyOS-chip；不能用 OpenHarmony 的值代替 HarmonyOS profile。
7. 检查阶段耗时、人工等待、审核输入、阻塞原因、失败次数、产物哈希和 `token_usage` 的真实覆盖状态。

P0 只通过真实 `advance.py`/gate 证据后才能继续。模型文本、CodeAgent 返回的“完成”或页面上的普通状态都不能授予 PASS。

## 10. 计算云上运行 AR 的工程要求

单云节点要跑完整 P0–P8，必须把下面能力装在同一云工作区，或按目标云架构接入受管 Gateway：

- OpenHarmony 或 HarmonyOS 的真实源码、Git 仓和工具链；
- `skills/ohos-ar-dev-phases/scripts` 中的 `advance.py` 和 gate 脚本；
- P4 编译依赖、P5 测试依赖、P6 设备/hdc 依赖；
- P8 对应的 GitCode/Gerrit 凭据和发布权限；
- 每个 run 独立 pipeline 目录、SQLite runtime 数据和受控输出目录；
- 设备 serial、产品、ABI、系统版本和 profile 的真实探测结果。

工程初始化必须先确认三类分支：

```text
OpenHarmony       → OpenHarmony build.sh / gate / 发布路径
HarmonyOS-system  → HarmonyOS system profile / 编译与验证路径
HarmonyOS-chip    → HarmonyOS chip profile / 编译与验证路径
```

未知或资料不完整时，页面应保持 `profile_incomplete`/阻塞状态；不要把默认值填成 OpenHarmony。设备识别和产物识别只能产生事实与匹配结果，不能自动触发刷机或替代 P6/P7 gate。

## 11. 从单云 MVP 演进到用户本地 Agent + SSH 代码

目标拓扑是：

```text
浏览器 → 云 DSH/API → WSS Connector Gateway ← 用户电脑 Connector/Supervisor
                                              ├─ 本地 Claude Code/OpenCode
                                              └─ 用户 SSH → Workspace Gateway → 代码/构建/设备
```

迁移顺序：

1. 云端保留 DSH、workflow manifest、审核、指标和对象存储；不要让云端直接读取用户 SSH 私钥。
2. 用户电脑安装 Connector，主动通过 WSS 443 出站连接；用户电脑不开放公网入站端口。
3. Connector 注册本地 CodeAgent 的命令、版本、模型能力和权限范围；“探测存在”与“允许执行”分开记录。
4. Connector 只接收固定 schema 的 `agent.start/status/cancel` 和 `workspace.operation`，不接收任意 shell 字符串。
5. Workspace Gateway 在 SSH 主机执行 `list/read/search/patch/diff/exec/gate/artifact` 白名单操作；路径解析、CAS hash、资源锁和进程监督都在 Gateway 边界完成。
6. 云端为每个 run 固定 `tenant_id/workspace_id/agent_profile_id/environment_profile_digest`，阶段切换或环境切换时生成新 revision。
7. 本地 Agent 进程结束、断线或恢复都要通过 Connector/Supervisor 回执；SSH channel 断开不等于构建或发布停止。
8. 云端只接受 Gateway 签名的 gate/consent/完成回执；CodeAgent 文本不能推进 P0–P8。

这些组件对应本仓的 [接口与数据契约](contracts.md)、[模型交接提示词](model-handoff.md) 和 [实施任务单](implementation-tasks.md)。当前目录中的设计文件不能被当成已经安装完成的 Connector 或生产 Gateway。

## 12. RAG 在云上的迁移边界

当前可运行代码里的 RAG 是本地控制台的词法 fallback，不能把它当成云端 embedding/reranker 服务。要在计算云启用正式 RAG，按以下顺序实施：

1. 为每个租户登记允许索引的 SSH workspace、路径前缀、环境 profile 和保留策略。
2. 部署独立 RAG worker、向量数据库/索引存储、embedding 服务和可选 reranker；模型密钥只进入 secret store。
3. 索引结果保存源码路径、行号、source snapshot hash、profile digest、index version 和模型版本。
4. 每次 DSH/CodeAgent 使用召回结果前，回 SSH 核验当前文件 hash；文件变化时返回 `RAG_SOURCE_STALE` 并重新检索。
5. RAG 只能提高代码识别和上下文召回，不能决定 OpenHarmony/HarmonyOS 分支，也不能授予 gate PASS。
6. 单独记录 embedding、reranker 和生成模型的 token/费用；不可得时显示 `unknown`/`partial`，不能填 0。

详细字段和失败分类见 [RAG、工程初始化与调试扩展](rag-environment-debug.md)。在 RAG worker 尚未部署前，页面应明确显示 fallback/未配置，不要伪造“已启用模型”。

## 13. 日志、备份和升级

至少备份以下内容到加密、限权的备份目标：

- `/var/lib/dsh/runtime/controller.sqlite3`；
- `/var/lib/dsh/runtime/task-credential.key`；
- `/var/lib/dsh/runtime/codeagent-settings.json`；
- 每个活动 run 的 pipeline、`evidence/`、`reports/`、`controls/`；
- DSH 审计日志和反向代理日志；
- RAG 索引元数据与不可变 artifact 清单。

SSH 私钥、CodeAgent 登录 token、云模型 key 和 HMAC secret 由独立 secret store/OS key store 管理，不放进上述公开归档。恢复时先还原数据库和文件，再运行 `sync/inspect`；不能用旧云快照覆盖远端较新的 pipeline。

升级流程：

1. 固定 DSH、Node、Claude SDK、CodeAgent CLI、Python 和 workflow commit/digest。
2. 复制当前 patch、systemd unit、环境文件和备份清单。
3. 在新目录安装新版本，运行 `npm run check`、CodeAgent 探测和 DSH smoke test。
4. 暂停新 run，等待或隔离活动 run；不要原地替换正在执行的 Agent、构建或发布进程。
5. 切换符号链接/服务版本，启动后核对 API、数据库 schema、事件 cursor 和 pipeline inspect。
6. 保留旧版本可回滚；新版本不兼容时拒绝新 run，旧 run 继续按原版本对账。

## 14. 常见故障

| 现象 | 检查 |
|---|---|
| 浏览器显示 401 | 使用日志中新 token；先通过反向代理域名完成 token 交换，或用 SSH 隧道；不要只打开无 token 的 `/` |
| 8787 启动失败 | `ss -ltnp` 检查旧 DSH；确认 systemd 只启动一个实例；不要把端口直接暴露公网 |
| Claude Code 显示 provider missing | 检查 profile 中 `@deepseek-ai/dsh-subagent-claude-code`、patch 的 preset root 和 `subagent-claude-code` 行，重启 DSH |
| OpenCode/Codex 显示 missing | 以 `dsh` 服务用户执行 `command -v` 和 `--version`；检查 `/etc/dsh/dsh.env` 的 PATH 和 `DSH_*_CLI` |
| CLI 已发现但启动返回 422 | 这是预期的适配器门控；先实现并挂载对应宿主 adapter，不能通过改状态字段绕过 |
| P0 报 `repo_root` 越界 | run 的 `repoRoot` 必须位于 patch 的 `repoRoot` 内，且使用绝对路径；不要传 `ssh://` |
| Python adapter 找不到 gate | 检查 `deliveryScriptsRoot`、`deliveryBridgePath`、`pythonCommand` 和仓库完整性 |
| 页面能打开但没有 AR 面板 | 检查 `@ai-ar/dsh-workflow` 链接、patch 是否作为最后一层加载、`dsh --dump-config` 和 systemd 日志 |
| token usage 是 unknown | 这是未观测事实；接入真实 Provider/Connector usage 回执后才可填充，不能由页面估算 |

## 15. 上线前清单

- [ ] Node/DSH/Python/CodeAgent/仓库 commit 已锁定；
- [ ] DSH 由 `dsh` 用户运行，runtime 和代码盘为持久盘；
- [ ] 8787 只监听 `127.0.0.1`，公网只开放 HTTPS；
- [ ] 反向代理支持 WebSocket、TLS 和超时；
- [ ] 公网部署已接 OIDC/SSO 和租户隔离；内网免登录模式没有暴露到互联网；
- [ ] Claude provider 已通过真实一次性任务验证；其他 Agent 的发现状态与适配器状态分开；
- [ ] OpenHarmony、HarmonyOS-system、HarmonyOS-chip 的 profile 和真实工具链分别验证；
- [ ] SSH 私钥、模型 key、CodeAgent 登录凭据没有进入 Git、镜像或公开日志；
- [ ] P0–P8 的 gate、consent、artifact 和事件都来自真实 authority；
- [ ] RAG 未部署时页面标记 fallback/unknown，部署后可回 SSH 核验引用；
- [ ] 数据库、pipeline、artifact、日志和 secret 已完成恢复演练；
- [ ] 断网、重启、旧 revision、设备不匹配和 adapter 缺失场景均有可见阻塞原因。

相关文档：[DSH 官方 Web UI 接入边界](dsh-integration.md) · [一期完整实施方案](index.md) · [验收矩阵](acceptance.md)。
