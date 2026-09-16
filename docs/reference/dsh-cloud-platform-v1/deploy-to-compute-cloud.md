# 迁移到计算云部署手册

版本：1.2 · 日期：2026-09-15
适用范围：`AI-AR-workflow` 当前仓库、官方 DSH Web、AR Delivery 面板、CodeAgent 探测与选择。

本文给出从当前 WSL 开发环境迁移到一台 Linux 计算云主机的可执行步骤。命令中的路径、域名、用户和端口都是示例，部署时必须替换成自己的值。

## 先确认部署模式

当前仓库有两个边界，不能混在一起验收。

| 模式 | 代码和 Agent 在哪里 | 当前仓库状态 | 适用场景 |
|---|---|---|---|
| 单云节点 MVP | DSH、CodeAgent、AR runtime、代码仓和 Python gate 都在计算云 | 可以按本文直接启动 | 个人试用、内网演示、先验证 P0/P1 |
| 目标云架构 | DSH 在云；CodeAgent/代码端在用户电脑或 SSH 主机 | 本地 Connector 的 WSS upgrade/出站客户端、SSHFS 与 remote-tools MCP、远端 gate profile 已具备；公网 TLS/mTLS 配对、签名密钥服务、租户数据库和生产隔离仍需部署 | 多用户服务、用户不把代码复制到云 |

本文第 1 至 8 节可以让单云节点 MVP 运行起来。第 9 节以后说明如何向目标云架构演进。

单云节点仍不能把 `repoRoot` 写成 `ssh://...`。目标云模式不要把 SSH URL 填进本地 `repoRoot`，而是登记 Gateway 的 `remoteRoot`、固定 profile 和 Authority context；`RemoteCodeAgentExecutor` 负责把 CodeAgent 调用送到 Gateway。AR Python gate 必须能看到同一代码根（在远端运行 gate、挂载只读工作区或配置等价的受限 gate profile），否则会明确停在 `needs_reconcile`/阻塞，不会把远端 CLI 输出当作 PASS。

## 1. 计算云准备条件

建议使用一台 Ubuntu 22.04/24.04 x86_64 云主机，初始规格为 8 vCPU、16 GiB 内存、100 GiB 持久盘。真实 OHOS 编译和设备测试按源码规模另行扩容。需要：

- Node.js 24 或更高（仓库的 `dsh-workflow` 包本身支持 `>=22.19`，但平台、Workspace Gateway 和生产 systemd 单元以 Node 24 为基线）；
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

# 首先让官方 CLI 创建带有 dsh.profile.bundles 的 Web profile。若直接对
# 一个尚不存在的 profile 执行 npm install，npm 会只写 package.json，官方
# Web bundles 不会进入组合树，启动时 AR 插件会停在 pending。
sudo -u dsh env DSH_HOME="$DSH_HOME" \
  "$DSH_INSTALL/node_modules/.bin/dsh" --profile web --dump-config >/dev/null

sudo -u dsh npm install --prefix "$DSH_HOME/profiles/web" \
  --save @deepseek-ai/dsh-subagent-claude-code@0.1.5-rc.2

sudo -u dsh mkdir -p "$DSH_HOME/profiles/web/node_modules/@ai-ar"
sudo -u dsh ln -sfn "$APP_ROOT/dsh-workflow" \
  "$DSH_HOME/profiles/web/node_modules/@ai-ar/dsh-workflow"
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

## 5. 使用云专用 DSH patch

不要直接把开发机的 `/home/mgces/code/...` 和 `/tmp/dsh-ohos-official` 带到云上。仓库已经提供
`platform/deploy/cordis.cloud.patch.yml`，它与 systemd 单元和 `/etc/dsh/dsh.env` 的默认路径一致。
部署时复制仓库后只需审阅并按实际代码端修改其中的 workspace、Gateway 和环境 profile 值；不要把密钥
写入 patch。若安装包没有包含部署目录，可从本仓复制该文件到 `$APP_ROOT/platform/deploy/`：

```bash
sudo install -D -o root -g dsh -m 0640 \
  platform/deploy/cordis.cloud.patch.yml \
  "$APP_ROOT/platform/deploy/cordis.cloud.patch.yml"
sudo install -D -o root -g dsh -m 0640 \
  workspace-gateway/examples/ar-delivery-profiles.json \
  "$APP_ROOT/workspace-gateway/examples/ar-delivery-profiles.json"
```

```yaml
# /opt/dsh/AI-AR-workflow/platform/deploy/cordis.cloud.patch.yml
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
        pythonCommand: '/usr/bin/python3'
        # Must equal DSH_WORKSPACE_ID in the matching Gateway EnvironmentFile.
        workspaceId: 'workspace-1'
        workflowId: 'ar-delivery'
        hostBindingId: 'dsh-cloud-agent'
        hostKind: 'claude-code'
        hostVersion: 'dsh-cloud'
        workspaceGateway:
          enabled: true
          baseUrl: 'http://127.0.0.1:8790'
          remoteRoot: '/srv/project'
          # Gate bundle paths are on the SSH code host and must stay inside
          # remoteRoot. Install the read-only bundle before starting DSH.
          deliveryScriptsRoot: '/srv/project/.dsh/ar-workflow/skills/ohos-ar-dev-phases/scripts'
          deliveryBridgePath: '/srv/project/.dsh/ar-workflow/runtime/delivery_bridge.py'
          headers:
            authorization: 'Bearer ${DSH_GATEWAY_BEARER_TOKEN}'
          authorityContext:
            tenant_id: 'tenant-1'
            workspace_id: 'workspace-1'
          signatureSecretEnv: 'DSH_AUTHORITY_SHARED_SECRET'
          signatureKeyId: 'dsh-cloud'

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

本仓当前可直接自动派发的是官方 `@deepseek-ai/dsh-subagent-claude-code`、本机探测成功的 OpenCode/Codex CLI 和受限 argv 自定义命令。目标云 patch 登记 `workspaceGateway.profiles.claude-code/opencode/codex/custom` 后，相应 Agent 会以 `gateway_configured` 显示并由远端 profile 执行；Claude 远端 profile 使用代码端安装的 `claude` CLI，认证仍只读取代码端原生凭据。Cursor、Trae 和没有受支持协议的命令仍返回 `codeagent_adapter_unavailable`（HTTP 422）。

## 7. 用 systemd 启动官方 DSH

仓库已提供可直接复制的部署资产：`platform/deploy/README.md`、`platform/deploy/doctor.mjs`、`cordis.cloud.patch.yml`、`dsh-web.service`、`dsh-workspace-gateway@.service` 和 Nginx 模板。先以服务用户运行 doctor，并传入 `--dsh-env-file /etc/dsh/dsh.env --gateway-env-file /etc/dsh/gateways/default.env --require-gateway-auth`；它会把 Node、Python、Git、代码根、全部 gate、环境 profile、官方 DSH、Gateway 固定 profiles、Bearer/HMAC 配置、CodeAgent、hdc、发布工具和 cgroup 委派状态写成 JSON，并分别给出 `can_start_p0` 与 `can_complete_p8`。阻断项没有修复前，服务仍可启动查看页面，但 AR run 会被前置检查拒绝。Gateway 8790 的 Bearer secret 必须与 DSH Web 进程环境中的 `DSH_GATEWAY_BEARER_TOKEN` 相同，云 patch 用 `Bearer ${DSH_GATEWAY_BEARER_TOKEN}` 在启动时解析；Authority HMAC 则要求 DSH 的 `DSH_AUTHORITY_SHARED_SECRET` 与 Gateway 的 `DSH_GATEWAY_SHARED_SECRET` 相同且至少 32 字节。doctor 只报告是否配置、长度是否合格和是否匹配，不回显 secret。

`doctor.mjs` 只检查执行它的主机。目标云架构中，云主机的 doctor 负责 DSH Web/Gateway 服务资产，SSH 代码主机单独运行不带 `--require-dsh` 的 doctor 检查源码、Python gate、编译、设备和发布依赖；最终以官方页面的 `/api/ohos-ar/preflight`（签名 `workspace.probe`、远端 gate bundle 和源码入口）作为本次远程工作区的 P0 准入结果。云主机没有 OHOS 源码时，doctor 对云端 `repoRoot` 的源码/gate 阻断是预期的，不能用它代替远端预检。

Gateway 内置 `ProcessSupervisor` 支持 Linux cgroup v2：`DSH_PROCESS_CGROUP_MODE=best_effort` 在未委派子树时保留进程组回退并记录原因，`required` 在子进程启动前失败。systemd 单元的 `KillMode=control-group`、MemoryMax、TasksMax 和 `Delegate=yes` 提供服务级回收与资源边界；启用 required 前必须确认 doctor 的 cgroup 检查为 `pass`。

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
  --patch /opt/dsh/AI-AR-workflow/platform/deploy/cordis.cloud.patch.yml \
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

生产环境让 Nginx/Caddy/云负载均衡终止 TLS，并把请求转到 `127.0.0.1:8787`。仓库提供
`platform/deploy/reverse-proxy/dsh-nginx.conf.example`，替换域名和证书路径后即可作为起点。Nginx 至少需要支持 WebSocket：

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

部署前还要做一次完整的静态完整性检查。P0 会逐一确认仓库中存在 `advance.py`、
`gate_env_init.py`、`gate_design.py`、`gate_develop.py`、`gate_test_develop.py`、
`gate_build.py`、`gate_test_ut.py`、`gate_device_func.py`、`gate_integration.py`、
`gate_upload_ci.py`、`prepare_test_bundle.py`、`lib/environments.py` 和
`runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py`；只存在
`advance.py` 的裁剪包不能作为完整 P0–P8 部署。它还会检查 AR 文件位于项目根内且可读，或
确认非空 `ar_text`。Gateway 模式会用签名 `workspace.probe` 对同一清单做远端源码标志探测：
OpenHarmony 要有可执行的 `build.sh`、`test/testfwk/developer_test` 目录和 `start.sh` 测试入口；HarmonyOS system/chip 的
root markers 要写入对应 profile，缺少时 P0 明确阻断。

工程初始化必须先确认三类分支：

```text
OpenHarmony       → OpenHarmony build.sh / gate / 发布路径
HarmonyOS-system  → HarmonyOS system profile / 编译与验证路径
HarmonyOS-chip    → HarmonyOS chip profile / 编译与验证路径
```

未知或资料不完整时，页面应保持 `profile_incomplete`/阻塞状态；不要把默认值填成 OpenHarmony。设备识别和产物识别只能产生事实与匹配结果，不能自动触发刷机或替代 P6/P7 gate。

## 11. 部署用户本地 Agent + SSH 代码端

目标拓扑是：

```text
浏览器 → 云 DSH/API → WSS Connector Gateway ← 用户电脑 Connector/Supervisor
                                              ├─ 本地 Claude Code/OpenCode
                                              └─ 用户 SSH → Workspace Gateway → 代码/构建/设备
```

当前仓库已经提供 Connector 的 WSS transport、JSONL/HTTP Workspace Gateway 和云端 HTTP client。下面的步骤可完成单工作区内网接入；公网仍应由 TLS 反向代理或独立连接服务承载，并在生产环境增加 mTLS/配对/撤销。

### 11.1 在 WSL/用户代码端启动 Gateway

在用户代码端安装仓库依赖，并为一个工作区启动一个 Gateway 进程：

```bash
npm --prefix workspace-gateway ci --ignore-scripts
export DSH_GATEWAY_HOST=127.0.0.1
export DSH_GATEWAY_REMOTE_ROOT=/home/<USER>/code/project
export DSH_GATEWAY_USER=$USER
export DSH_GATEWAY_IDENTITY_FILE=/home/<USER>/.ssh/id_ed25519
export DSH_GATEWAY_KNOWN_HOSTS_FILE=/home/<USER>/.ssh/known_hosts
export DSH_TENANT_ID=tenant-1
export DSH_WORKSPACE_ID=workspace-1
# 多 run 工作区不要固定 run/revision/phase；云端适配器会按每次操作填写。
# 单 run 隔离部署才设置下面四项：DSH_CLOUD_RUN_ID、DSH_AUTHORITY_RUN_ID、
# DSH_REVISION、DSH_PHASE_EPOCH、DSH_CONNECTION_EPOCH。
# 必须与云端 DSH 的 signatureSecretEnv 指向同一 secret store 值
# 在云端 secret store 生成一次并复用到 DSH_AUTHORITY_SHARED_SECRET；不要每次启动重新生成
export DSH_GATEWAY_SHARED_SECRET='<same-value-as-DSH_AUTHORITY_SHARED_SECRET>'
export DSH_GATEWAY_KEY_ID=dsh-cloud
export DSH_GATEWAY_LOCK_DB=/var/lib/dsh/gateway/resource-locks.sqlite3
export DSH_GATEWAY_JOURNAL_DB=/var/lib/dsh/gateway/operations.sqlite3
# 固定的 CodeAgent + AR gate profile；JSON 只登记命令模板，不放模型密钥。
# 模板包含 codeagent.* 和 ar.delivery.* 六个 profile；先在 SSH 代码端安装
# helper 和只读的 gate bundle。bundle 必须在登记 remoteRoot 里面，便于
# Workspace Gateway 用同一条路径边界探测脚本完整性。
sudo install -m 755 workspace-gateway/bin/dsh-ar-delivery.js /usr/local/bin/dsh-ar-delivery
sudo install -m 755 workspace-gateway/bin/dsh-device-probe.js /usr/local/bin/dsh-device-probe
# 代码端执行 gate 时不依赖云端的 APP_ROOT。把脚本和 bridge 放到远端
# workspace 的只读 .dsh 目录；如果云端和代码端不是同一台机器，用 rsync/scp
# 将下面两个目录复制过去，再由 root/管理员去掉写权限。
export REMOTE_ROOT=/home/<USER>/code/project
sudo install -d -o root -g dsh -m 0750 "$REMOTE_ROOT/.dsh/ar-workflow/skills/ohos-ar-dev-phases/scripts"
sudo install -d -o root -g dsh -m 0750 "$REMOTE_ROOT/.dsh/ar-workflow/runtime"
sudo rsync -a --delete --chmod=Du=rwx,Dg=rx,Do=rx,Fu=r,Fg=r,Fo=r \
  /opt/dsh/AI-AR-workflow/skills/ohos-ar-dev-phases/scripts/ \
  "$REMOTE_ROOT/.dsh/ar-workflow/skills/ohos-ar-dev-phases/scripts/"
sudo install -o root -g dsh -m 0640 \
  /opt/dsh/AI-AR-workflow/runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py \
  "$REMOTE_ROOT/.dsh/ar-workflow/runtime/delivery_bridge.py"
# Prefer a root-owned profile file for systemd; the gateway reads this file
# before it starts and validates that it is a JSON object. Inline
# DSH_GATEWAY_PROFILES is still supported for disposable development only.
export DSH_GATEWAY_PROFILES_FILE=/opt/dsh/AI-AR-workflow/workspace-gateway/examples/ar-delivery-profiles.json
npm --prefix workspace-gateway start
```

需要让云端访问时，可以使用内网 HTTP transport（默认只监听 loopback，生产必须放在 mTLS/反向代理后）：

```bash
export DSH_GATEWAY_HTTP_PORT=9443
export DSH_GATEWAY_HTTP_HOST=127.0.0.1
export DSH_GATEWAY_BEARER_TOKEN='<random-secret-from-secret-store>'
npm --prefix workspace-gateway start
```

HTTP `/v1/envelope` 只接受 JSON Authority envelope；Bearer 是传输层附加校验，`DSH_GATEWAY_SHARED_SECRET` 负责 Authority HMAC 验签。云端配置使用 `signatureSecretEnv: 'DSH_AUTHORITY_SHARED_SECRET'` 和同值 secret。不要把 HTTP 端口或 SSH 私钥暴露到公网。

### 11.2 在云端 patch 中启用远程执行

在 `ai-ar-adaptive-workflow-controller` 的 `config` 里添加：

```yaml
workspaceGateway:
  enabled: true
  baseUrl: 'http://<private-gateway-host>:9443'
  remoteRoot: '/home/<USER>/code/project'
  # 远端 gate bundle 的绝对路径，必须位于 remoteRoot 内且由部署管理员
  # 以只读方式维护；不填时 helper 会在本次 repo_root 下寻找 skills/runtime，
  # 适合 bundle 已随项目根部署的情况。
  deliveryScriptsRoot: '/home/<USER>/code/project/.dsh/ar-workflow/skills/ohos-ar-dev-phases/scripts'
  deliveryBridgePath: '/home/<USER>/code/project/.dsh/ar-workflow/runtime/delivery_bridge.py'
  # 如果 remoteRoot 是多个项目的父目录，可把本次 run 的 repo_root
  # 设为其下子目录；预检和 gate 会按该子目录探测源码标志。
  # remoteDefaultArPath: 'docs/AR.md'  # 可选；否则每次启动显式传 ar_path/ar_text
  headers:
    authorization: 'Bearer ${DSH_GATEWAY_BEARER_TOKEN}'
  authorityContext:
    tenant_id: 'tenant-1'
    workspace_id: 'workspace-1'
    # cloud_run_id/authority_run_id/revision/phase_epoch/connection_epoch
    # 可省略，由 workspace-scoped Gateway 适配器按操作派生；单 run 部署可固定。
  signatureSecretEnv: 'DSH_AUTHORITY_SHARED_SECRET'
  signatureKeyId: 'dsh-cloud'
  ragEnabled: true
  deviceProfile: 'debug.device_probe'
  profiles:
    claude-code: 'codeagent.claude'
    opencode: 'codeagent.opencode'
    codex: 'codeagent.codex'
    custom: 'codeagent.custom'
  deliveryProfiles:
    init: 'ar.delivery.init'
    inspect: 'ar.delivery.inspect'
    validate: 'ar.delivery.validate'
    advance: 'ar.delivery.advance'
    consent: 'ar.delivery.consent'
    failureSnapshot: 'ar.delivery.failure_snapshot'
```

建议在两个 profile 上声明 `resource_lock: workspace`，并让 Gateway 使用上面的
`DSH_GATEWAY_LOCK_DB`。这会把同一远端工作区的 CodeAgent、构建和校验串行化，避免
两个浏览器 run 同时改写源码。`DSH_GATEWAY_JOURNAL_DB` 保存 operation 的输入指纹、
完成结果和结构化失败；服务重启后会回放已完成/已失败操作，对仍处于 `running` 的
operation 返回 `operation_in_progress`，等待 Supervisor 或人工对账后再用新 operation
继续。两个 SQLite 文件由 Gateway 用户持有并纳入备份；恢复时先通过 Supervisor/authority
对账锁和 operation owner，不能直接删除锁库或操作库绕过授权。

对应 Gateway profile 必须同时登记固定的 `opencode run --format json`、`codex exec --json` 命令和六个 `ar.delivery.*` gate profile。云端页面会把 OpenCode/Codex 标记为 `gateway_configured`，scheduler 通过 remote executor 写入 prompt、执行 profile、保存 stdout/stderr 并采集 usage；AR runtime 通过 gate profile 在同一代码根完成 init/inspect/validate/advance/consent。一次 Gateway 实例固定一个工作区；多 run/多租户部署应省略 run-specific authority 环境变量，由连接服务按 workspace/run 分配上下文和短期签名，不能复用静态单 run 示例值。

Gateway 的 `DSH_GATEWAY_PROFILES_FILE`（或开发场景的 `DSH_GATEWAY_PROFILES`）必须在 Gateway 进程启动前设置；只在 DSH patch 中写 `profiles` 映射不会自动把 profile 注册到代码端。文件路径必须是绝对路径，且不能与内嵌 JSON 同时设置；文件不存在、JSON 非对象或无法解析时启动即失败。profile 命令由 Gateway 用 `shell:false` 约束并逐项 quote，`{{model}}` 为空会删除相邻的 `--model` 参数，避免把空模型 id 传给 CLI。`deliveryScriptsRoot` 和 `deliveryBridgePath` 是部署配置，不接受页面或模型覆盖；P0 会通过 `workspace.probe` 逐一检查脚本、`lib/environments.py` 和 bridge，发现 bundle 缺失就阻断。
未显式填写这两个路径时，远端适配器会按本次 run 的 `repo_root` 注入标准 bundle 路径；因此
`remoteRoot` 下挂多个项目时，必须让每个项目自己的 `repo_root/skills/...` 和 `repo_root/runtime/...`
都存在，或者为每个项目配置位于 `remoteRoot` 内的独立只读 bundle。预检探测到的路径与实际 profile
执行使用同一组变量，不会出现“P0 看到了云端 bundle、P4 却在代码端找不到”的隐式回退。

环境 profile 也必须绑定到具体分支。部署配置可提供类似下面的非敏感元数据（digest 必须由目标代码端
的实际 `environments.profile_digest` 生成，不能填写示例值）：

```yaml
environmentProfile:
  environment: openharmony       # 或 harmonyos
  profile_digest: 'sha256:<目标环境实测摘要>'
  # HarmonyOS 必须显式提供目标仓库的 root markers；字符串默认按文件处理，
  # 需要目录时使用 {path: '...', kind: 'directory'}。
  root_markers: ['build_system.sh']
```

HarmonyOS 还要在 run 初始化时选择 `component_type: system|chip`，并由对应外部 profile 提供
product、out_dir、root markers、测试 runner 和 Gerrit 参数。缺少环境名或 digest 时，官方页面只显示
`pending`，不会把另一环境的 profile 当成当前分支。

迁移顺序：

1. 云端保留 DSH、workflow manifest、审核、指标和对象存储；不要让云端直接读取用户 SSH 私钥。
2. 用户电脑安装 Connector，主动通过 WSS 443 出站连接；用户电脑不开放公网入站端口。当前 WSS 协议已经能完成 hello、心跳、命令相关、超时、取消、重连、Origin/TLS/mTLS 策略、持久配对 token 的撤销/轮换和 ACK；启用 hub 的 `replayPending: true` 与绝对 `outboxFilePath` 后，pending/completed/failed 记录会原子写入云端文件，云端重启可按 `operation_id` 重绑或回放。生产仍需在 DSH 或反向代理实际部署证书、配置证书指纹和真实连接审计。
3. Connector 启动前探测本地 CodeAgent 的命令、版本和固定 adapter，并把结果随 hello 发送；“探测存在”与“允许执行”分开记录。页面刷新会再次请求 `probe`，不会使用云主机的 PATH 冒充用户电脑状态。
4. Connector 只接收固定 schema 的 `probe`、`agent.start`、`agent.status`、`agent.cancel`，不接收任意 shell 字符串或绝对本地路径。`agent.start` 只允许已发现的 Claude/OpenCode/Codex/自定义 argv adapter；SSHFS 模式把相对路径映射到挂载根，remote-tools 模式把相对路径映射到受限 MCP broker。
5. 当前 Workspace Gateway 在 SSH 主机执行 `workspace.inspect/probe/read/write/list/search/hash/read_binary/diff/exec_profile` 白名单操作；路径解析、CAS hash 和资源锁在 Gateway 边界完成。AR gate 与远端 CodeAgent profile 通过固定 `exec_profile` 调用，不能把模型提供的脚本或命令直接传给 SSH。P0 先用 `workspace.probe` 解析 `remoteRoot` 并验证目录、读权限和写权限；Gateway `/healthz` 通过但 probe 失败时仍阻断。`hash` 只回传二进制产物的 sha256 与字节数，`read_binary` 只在大小上限内返回 base64，官方下载路由会二次校验后返回原始字节。Connector 的 `remote_tools` 模式会以一次性 MCP socket 提供 `read/list/search/write/diff/hash/read_binary` 和管理员登记的 profile；该模式不复制源码，P4–P8 gate 仍走 SSH Gateway。
6. 云端为每个 run 固定 `tenant_id/workspace_id/agent_profile_id/environment_profile_digest`，阶段切换或环境切换时生成新 revision。
7. 本地 Agent 进程结束、断线或恢复都要通过 Connector/Supervisor 回执；SSH channel 断开不等于构建或发布停止。Remote executor 取消时会发送 `operation.cancel`，Connector operation journal 会按 `operation_id` 回放完成结果并把重启中断的 operation 标为 `unknown`；服务重启后仍需根据 revision/lease 做 reconcile。
8. 云端只接受 Gateway 签名的 gate/consent/完成回执；CodeAgent 文本不能推进 P0–P8。若 gate 仍只在云端本地路径执行，远端工作区只能用于实验，必须先补远端 gate profile 或安全挂载。

这些组件对应本仓的 [接口与数据契约](contracts.md)、[模型交接提示词](model-handoff.md) 和 [实施任务单](implementation-tasks.md)。Connector 和 Gateway 的单工作区实现已随仓库提供；生产身份、租户和隔离仍需按后文部署。

### 11.3 本地 CodeAgent 修改 SSH 代码的实际选择

本地 CLI 进程不能直接把 SSH 路径当作本地 `cwd`。例如云端 DSH 进程不能读取用户电脑的
`/home/user/project`，用户本地 Agent 也不能直接打开云端的 `/srv/project`。把路径字符串写进
prompt 只会让 Agent 产生不可执行的命令，或把文件写到错误主机。

有四种部署方式：

| 方式 | 文件实际位置 | 使用体验和代价 | 本期结论 |
|---|---|---|---|
| DSH 与代码同机 | 云主机本地绝对路径 | Agent、Python gate、编译和产物共享文件系统，速度最好 | 单云节点直接使用 |
| Gateway 远端 profile | SSH 代码主机的 `remoteRoot` | 不复制源码；Gateway 用固定 profile 在代码主机启动 CodeAgent 和 gate，云端只编排、验签和展示 | 计算云 + 用户 SSH 代码的推荐方式 |
| 本地 Connector + SSHFS/受控挂载 | 远端目录挂载到本地路径；本地 Connector 启动 CodeAgent，Gateway 运行 gate | 大仓扫描、软链接、权限、断线和锁恢复会受挂载影响；必须同时保持 Connector 与 Gateway 在线 | 当前可用，可跑完整 P0–P8；按仓库实测性能决定是否改用 Gateway 远端 profile |
| 本地 Connector + remote-tools MCP | 本地 Connector 启动 CodeAgent；CodeAgent 通过一次性 MCP socket 调用 SSH read/search/write/diff 和登记 profile；Gateway 运行 gate | 不复制源码、不需要 FUSE；每次工具调用有网络往返，CLI 配置格式需匹配 | 当前可用，可跑完整 P0–P8；配置见 `workspace-gateway/examples/local-connector-remote-tools.json` |

推荐的 Gateway 方式不需要让本地 CodeAgent“费劲地改 SSH 文件”：在代码端安装 Claude Code/OpenCode，
完成各自原生认证；在 `DSH_GATEWAY_PROFILES_FILE` 指向的 JSON 中登记 `codeagent.claude`、`codeagent.opencode`
或 `codeagent.codex`；在云端 patch 的 `workspaceGateway.profiles` 做名称映射；再登记六个
`ar.delivery.*` profile。一次 run 中，CodeAgent 与 `advance.py` 使用同一个 `remoteRoot`，修改
立即对 gate 可见，免去同步、上传和路径转换。前置检查会显示 `ssh_code_host`、
`gateway_registered_profile` 和 `remote_codeagent_profile`，便于确认没有误走本地 CLI。

如果必须保留本地 CLI，运行 `dsh-local-connector`，填写 `ssh.host`/远端根并把远端目录挂载成 Connector 可读写的本地绝对路径；
SSHFS 模式拒绝没有 SSH 绑定的普通本地目录，避免 CodeAgent 修改错代码树；
云端 patch 同时启用 `localConnector` 和 `workspaceGateway`，不要把 `ssh://` URL 传给 AR。挂载断开、文件
hash 变化或权限不一致时，P0/P4/P6/P8 会停在阻断或 `needs_reconcile`，不能用重新上传文件绕过源码快照和资源锁。
当前仓库的远端 `workspace.read/write/list/search/hash/read_binary/diff/exec_profile` 能力用于 Gateway 和
remote-tools 模式；云端不会下发任意 shell。remote-tools 模式的本地 Connector 配置不需要 `local_root`，
但必须提供 `workspace_access: "remote_tools"`、SSH host/known_hosts/identity、登记的 profile 和目标 CLI
对应的 MCP 配置格式。P4–P8 的 gate、设备与发布仍必须由 SSH Workspace Gateway 执行。

canonical patch 默认把 `localConnector.enabled` 设为 `false`，这样只部署云端 Agent/SSH Gateway 时不会因为
缺少用户 token 阻断官方 DSH 启动。要实现“本地网页调用本地 CodeAgent”，先在 `/etc/dsh/dsh.env` 注入
`DSH_CONNECTOR_TOKEN`，把 patch 改为 `localConnector.enabled: true`，然后在用户电脑启动 Connector，配置同一
`workspace_id=workspace-1`、`remote_root=/srv/project` 和 token。Connector 主动通过 WSS 连接云端；浏览器不直接
执行本机命令，云端只下发固定的 `agent.start/status/cancel` 意图。连接成功后页面的 CodeAgent 来源显示
`local-connector`，本地 Agent 修改会通过 SSHFS 或 remote-tools 作用到相同代码根，P4–P8 仍由 Gateway 编译和验收。

## 12. RAG 在云上的迁移边界

当前可运行代码里的 RAG 分两种：本地工作区使用持久索引；启用 `workspaceGateway` 后，云端使用
`RemoteRagIndex` 通过受签名的带 size/mtime 的 `workspace.list/read` 建索引，并在每次结果返回前回读 hash。
配置 OpenAI-compatible endpoint 后两种索引都可调用真实 embedding/reranker；没有 endpoint 时保留明确的词法
fallback。远端索引会把允许范围内的源码缓存到 DSH `dataRoot/remote-rag-index.json`，因此必须先完成 workspace
的云端出站授权；设置 `ragEnabled: false` 可保持代码只留在远端。

官方 AR 面板已提供模型配置入口：在 **代码知识库（RAG）** 卡片保存 `local_lexical` 或
`embedding_reranker`、provider、embedding/reranker 模型和非敏感 endpoint。保存后 overview 与
`ohos_rag_profile` 会返回 `execution=active/planned/partial`；宿主 endpoint 可直接执行 embedding/reranker，
无 endpoint 或请求失败时保留词法 fallback 和失败原因。生产仍需为 worker 配置 ACL、向量库、配额和评测。

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
- 每个 Gateway 的 `resource-locks.sqlite3` 与 `operations.sqlite3`；
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
| CLI 已发现但启动返回 422 | 检查是否是 Cursor/Trae/未声明协议的自定义命令；OpenCode/Codex 在本机或已登记 Gateway profile 时应可派发，仍失败时查看 scheduler 的 `last_error` 和 profile/签名配置 |
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
- [ ] SSH 私钥、模型 key、CodeAgent 登录凭据和 Gateway Bearer/签名 secret 没有进入 Git、镜像或公开日志；
- [ ] P0–P8 的 gate、consent、artifact 和事件都来自真实 authority；
- [ ] RAG 未部署时页面标记 fallback/unknown，部署后可回 SSH 核验引用；
- [ ] 数据库、pipeline、artifact、日志和 secret 已完成恢复演练；
- [ ] 本机 JSONL/HTTP Gateway 已通过 health、签名、路径越界、幂等、取消和重启验收；公网 WSS/mTLS、断网、旧 revision、设备不匹配和 adapter 缺失场景均有可见阻塞原因。

相关文档：[DSH 官方 Web UI 接入边界](dsh-integration.md) · [一期完整实施方案](index.md) · [验收矩阵](acceptance.md)。
