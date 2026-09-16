# DSH 云端部署资产

这里的文件把官方 DSH Web、Workspace Gateway、持久状态和部署前检查变成可执行的安装边界。它们不包含模型密钥、SSH 私钥、配对 token 或真实 environment profile。

`doctor.mjs` 是“当前主机”的启动前检查，不会通过 SSH 猜测另一台代码主机的源码、工具链、设备或发布权限。在目标拓扑（DSH Web 在云端、代码和 gate 在 SSH 主机）中，云主机先检查 Node、官方 DSH、patch、Gateway profile、Bearer/HMAC 和服务级资源；代码主机再检查源码、Python/gate、编译、设备和发布工具。官方 DSH 的 `/api/ohos-ar/preflight` 会通过签名 Gateway 对同一个 `remoteRoot` 做第二次远端探测，只有该远端预检和 Gate 证据都通过，运行才会进入 P0–P8。不要把云主机 doctor 对本地 `repoRoot` 的阻断项误解为远端探测结果，也不要用 `sourceLayoutVerified` 之外的普通健康检查替代远端预检。

## 部署前检查

在云主机上以运行服务的账号执行：

```bash
node /opt/dsh/AI-AR-workflow/platform/deploy/doctor.mjs \
  --repo-root /srv/dsh/workspaces/default/project \
  --state-root /var/lib/dsh/runtime \
  --delivery-scripts-root /opt/dsh/AI-AR-workflow/skills/ohos-ar-dev-phases/scripts \
  --delivery-bridge /opt/dsh/AI-AR-workflow/runtime/dsh-ohos/src/workflows/ar-delivery/python/delivery_bridge.py \
  --environment openharmony \
  --dsh-command /opt/dsh/official/node_modules/.bin/dsh \
  --patch-file /opt/dsh/AI-AR-workflow/platform/deploy/cordis.cloud.patch.yml \
  --gateway-profiles-file /opt/dsh/AI-AR-workflow/workspace-gateway/examples/ar-delivery-profiles.json \
  --require-gateway-profiles \
  --dsh-env-file /etc/dsh/dsh.env \
  --gateway-env-file /etc/dsh/gateways/default.env \
  --require-gateway-auth \
  --require-dsh --codeagent /usr/local/bin/claude --human
```

输出中的 `P0: ready` 才允许创建 AR run；`P8: ready` 还要求 `--require-device --require-publish` 并且设备、发布工具和凭据探测通过。命令默认输出 JSON，适合被部署流水线保存为机器证据；阻断时退出码为 2。

HarmonyOS 必须额外提供完整的 `--profile-file`，并选择 `harmonyos/system` 或 `harmonyos/chip`。profile 的 product、out_dir、root_markers、设备类型和 Gerrit 发布字段不能使用 `UNSET/TODO` 占位值。

## 安装 systemd 服务

```bash
sudo install -d -m 0750 /etc/dsh /etc/dsh/gateways /var/lib/dsh/runtime /var/lib/dsh/controller-state /var/lib/dsh/gateway /var/log/dsh
sudo install -o root -g dsh -m 0640 platform/deploy/env/dsh.env.example /etc/dsh/dsh.env
sudo install -o root -g dsh -m 0640 platform/deploy/env/workspace-gateway.env.example /etc/dsh/gateways/default.env
sudo install -o root -g dsh -m 0640 platform/deploy/cordis.cloud.patch.yml /opt/dsh/AI-AR-workflow/platform/deploy/cordis.cloud.patch.yml
sudo install -o root -g dsh -m 0640 workspace-gateway/examples/ar-delivery-profiles.json /opt/dsh/AI-AR-workflow/workspace-gateway/examples/ar-delivery-profiles.json
sudo install -m 0644 platform/deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dsh-web.service
# 只有配置好 default.env 中的 SSH、HMAC 和 bearer secret 后才启动：
sudo systemctl enable --now dsh-workspace-gateway@default.service
```

随仓库提供的 Web 单元固定使用 `/opt/dsh/official/node_modules/.bin/dsh` 和
`/opt/dsh/AI-AR-workflow/platform/deploy/cordis.cloud.patch.yml`，并在启动前再次做可执行/可读检查。
如果实际安装目录不同，需要同时修改 systemd 单元和 doctor 参数；`dsh.env` 中的同名变量只用于 doctor，
不会被当作 `ExecStart` 的 shell 展开。

`dsh-web.service` 只监听 `127.0.0.1:8787`。公网访问应由 Nginx、Caddy 或云负载均衡终止 HTTPS/WSS，并把 WebSocket `/v1/connect` 转发到该端口；安全组不应直接暴露 8787 或 8790。
本仓提供可直接修改的 Nginx 模板：`platform/deploy/reverse-proxy/dsh-nginx.conf.example`。免登录只适用于可信内网、VPN 或已有身份代理；模板中的 TLS 终止和 WebSocket 转发不能替代多租户身份系统。

Gateway 的 8790 HTTP transport 要求 Bearer，Authority envelope 还要求 HMAC。`/etc/dsh/dsh.env` 的
`DSH_GATEWAY_BEARER_TOKEN` 必须与 `/etc/dsh/gateways/default.env` 中的同名 secret 相同；
`DSH_AUTHORITY_SHARED_SECRET` 必须与 Gateway 侧的 `DSH_GATEWAY_SHARED_SECRET` 相同且至少 32 字节。
云端 patch 使用 `Bearer ${DSH_GATEWAY_BEARER_TOKEN}` 引用，插件启动时才解析，不把 token 或 HMAC
secret 写入 patch 或浏览器。doctor 会校验两套值的配置、长度和一致性，但不会回显 secret。

要让网页把 CodeAgent 派发到用户电脑，把 canonical patch 中
`localConnector.enabled` 改为 `true`，在 `/etc/dsh/dsh.env` 配置随机的
`DSH_CONNECTOR_TOKEN`，并把同一 token 写入用户 Connector 的配置；不启用时，CodeAgent
会按 `workspaceGateway.profiles` 在 SSH 代码端执行。Connector 与 Gateway 的
`workspaceId/remoteRoot` 必须分别保持 `workspace-1` 和 `/srv/project`，否则 P0 会阻断。

systemd 的 `KillMode=control-group`、MemoryMax、TasksMax 和 `Delegate=yes` 为服务级硬边界。每个 Gateway 内的 `ProcessSupervisor` 还支持 `DSH_PROCESS_CGROUP_MODE=best_effort|required`，按 operation 创建 cgroup v2 子组并记录隔离状态；`DSH_PROCESS_CGROUP_ROOT=self` 会自动定位当前 systemd 服务的委派子树。先运行 doctor 确认 cgroup 子树可写，再把模式切换为 `required`；required 模式在不能创建或绑定 cgroup 时会在子进程启动前失败并留下结构化原因。

## 运行后验证

```bash
# 官方 DSH Web 使用 token/cookie 认证；未带 cookie 的 401 证明服务已监听。
curl -i http://127.0.0.1:8787/ | head
# 在浏览器建立会话后，用该会话 cookie 验证 AR API（替换占位 cookie）。
curl --fail -H 'Cookie: <DSH_SESSION_COOKIE>' \
  http://127.0.0.1:8787/api/ohos-ar/overview
# Workspace Gateway 提供独立的无状态健康检查。
curl --fail http://127.0.0.1:8790/healthz
sudo journalctl -u dsh-web -n 100 --no-pager
sudo journalctl -u dsh-workspace-gateway@default -n 100 --no-pager
```

随后在官方 DSH 页面打开 AR Delivery 面板，先刷新 CodeAgent、Connector、工作区和 P0 预检。页面中的阶段、审核输入、审核产物、失败原因、token、设备和发布状态都来自持久 runtime/Gateway 证据；预检或 gate 阻断时不能通过 UI 手工改成 PASS。
