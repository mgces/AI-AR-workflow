# 部署 DSH Cloud Console（单实例）

本目录提供新的客户端/云端分离架构的 Docker Compose 部署入口：Cloud API、Cloud Console、Caddy HTTPS 入口和 OIDC 登录代理。它适用于单台 Linux 计算云上的团队验证或单实例部署。它**不支持横向扩展或无损替换实例**：SQLite、审核文件、Cloud 审核签名私钥保存在同一个 Docker 数据卷中。不要启动多个 API 副本，也不要直接公开 Cloud API 容器端口。

本方案使用 OAuth2 Proxy 的 OIDC 登录以及 Caddy `forward_auth`，并通过只存在于 Docker 私有网络的共享密钥把已登录的用户身份转交给 Cloud API。浏览器写请求还必须携带匹配的 HTTPS `Origin`。设备同步、一次性配对、设备产物上传和审核回执使用服务端已有的配对码、设备 Bearer 凭据或短期上传 token；这些 API 路径不要求浏览器登录，但仍由 Cloud API 验证各自凭据。Cloud API 本身没有默认的公网浏览器登录。

## 前置条件

- 一台受支持的 Linux x64/arm64 Docker 主机，安装 Docker Engine 和 Docker Compose v2。
- 一个已指向该主机的公网 DNS 名称，TCP 80/443 可从互联网到达；UDP 443 可选，用于 HTTP/3。
- 一个支持 OIDC 的身份提供方及已注册的 confidential client。把回调地址设为 `https://<你的域名>/oauth2/callback`，并启用 `openid email profile` scope。邮箱域名应限制为你的组织。
- 该主机提供持久磁盘空间并定期备份；SQLite 数据库、审核文件和签名私钥都包含在同一个卷内。

## 首次部署

在仓库根目录执行：

```bash
cp dsh-client-platform/deploy/cloud/.env.example dsh-client-platform/deploy/cloud/.env
chmod 600 dsh-client-platform/deploy/cloud/.env
openssl rand -hex 32
openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
```

将第一条随机值填入 `DSH_CLOUD_PROXY_AUTH_SECRET`，第二条填入 `OAUTH2_PROXY_COOKIE_SECRET`。编辑 `dsh-client-platform/deploy/cloud/.env`，填写 DNS 域名和 `https://` origin、OIDC issuer、client ID/secret、允许登录的邮箱域名、部署租户 ID 和管理员邮箱。租户 ID 用部署级稳定值；Cloud API 会为第一次配对生成设备工作区 ID。可选的 `DSH_CLOUD_WORKSPACE_IDS` 是以逗号分隔的共享工作区 allowlist；留空时，普通用户只能查看自己配对设备的数据，管理员邮箱列表中的用户可按租户管理员权限查看全部租户数据。

构建并启动：

```bash
docker compose --project-name dsh-cloud \
  --env-file dsh-client-platform/deploy/cloud/.env \
  --file dsh-client-platform/deploy/cloud/compose.yaml \
  config --quiet

docker compose --project-name dsh-cloud \
  --env-file dsh-client-platform/deploy/cloud/.env \
  --file dsh-client-platform/deploy/cloud/compose.yaml \
  up --build --detach
```

Caddy 会自动向 ACME 获取和续期 HTTPS 证书。只有 Caddy 发布到主机的 80/443 端口；Cloud API 与 OAuth2 Proxy 只连接 Docker 私有网络。`.env` 含有身份提供方 client secret、OIDC cookie secret 和代理共享密钥，不能提交 Git、放到网页目录或在支持请求中粘贴。

访问 `https://<你的域名>/`，用 OIDC 登录后生成一次性设备配对码。在 Windows 客户端的“连接云端工作区”中填写该 HTTPS origin 和配对码。客户端配对 API 使用一次性代码；此后设备同步使用设备凭据，Cloud Console 浏览器会话由 OIDC Proxy 控制。

## 上线检查

```bash
docker compose --project-name dsh-cloud \
  --env-file dsh-client-platform/deploy/cloud/.env \
  --file dsh-client-platform/deploy/cloud/compose.yaml \
  ps

curl --fail https://<你的域名>/healthz
docker compose --project-name dsh-cloud \
  --env-file dsh-client-platform/deploy/cloud/.env \
  --file dsh-client-platform/deploy/cloud/compose.yaml \
  logs --tail=100 cloud-api oauth2-proxy caddy
```

随后至少验收：未登录浏览器访问 Console 会跳转 OIDC；登录用户可创建 pairing session；错误的 OIDC 身份代理密钥不能通过 API 用户认证；浏览器跨 origin 的写请求被拒绝；设备使用有效 pairing code 能配对、发送签名事件和上传审核产物；撤销设备后其旧凭据被拒绝；非管理员用户只能查看自己设备或显式授权的 workspace。`/healthz` 是不含用户数据的公开存活探针。

可运行 Caddy/OIDC Proxy/Cloud API 日志检查证书、回调、Cookie 和身份 header。Cloud API 不对主机发布端口；请勿通过额外端口映射、云安全组、端口转发或另一反向代理绕过 Caddy。Caddy 在代理到 API 前会覆盖代理密钥和来源 IP，并清除机器 API 中的用户身份 header。

## 数据备份与恢复

SQLite、审核对象和 Ed25519 审核签名私钥必须作为一个一致快照保存。低流量单实例维护时采用停机备份：

```bash
mkdir -p backups

docker compose --project-name dsh-cloud \
  --env-file dsh-client-platform/deploy/cloud/.env \
  --file dsh-client-platform/deploy/cloud/compose.yaml \
  stop cloud-api

docker run --rm \
  --volume dsh-cloud_cloud-data:/data:ro \
  --volume "$PWD/backups:/backup" \
  alpine:3.22 \
  tar -C /data -czf /backup/dsh-cloud-data-$(date +%Y%m%d-%H%M%S).tar.gz .

docker compose --project-name dsh-cloud \
  --env-file dsh-client-platform/deploy/cloud/.env \
  --file dsh-client-platform/deploy/cloud/compose.yaml \
  start cloud-api
```

备份 `.env` 时使用单独的加密秘密管理流程；它不在数据卷中。恢复时先停止 Cloud API，将完整归档解压到 `dsh-cloud_cloud-data` 卷，再启动服务并检查 SQLite、审核文件读取和签名审核回执校验。**不要只恢复数据库或只恢复 signing key**：客户端会 pin 云端签名公钥，错误的密钥/数据库组合会让审核回执停止应用。定期在隔离环境演练恢复；当前没有自动备份、保留策略或恢复控制台。

更新应使用经过审查的代码版本：

```bash
docker compose --project-name dsh-cloud \
  --env-file dsh-client-platform/deploy/cloud/.env \
  --file dsh-client-platform/deploy/cloud/compose.yaml \
  up --build --detach
```

不要使用 `docker compose down --volumes`，除非确实要删除这套服务的数据库、审核文件和签名私钥。滚动升级、多 API 副本、数据库迁移、对象存储和无停机备份暂未实现。

## 当前边界

此部署把 Cloud API 和 Console 通过 OIDC 接到一个单实例上，并保护私有审核数据。它不提供高可用、横向扩展、PostgreSQL、共享对象存储、分布式限流、自动备份、密钥 KMS/轮换、审核文件恶意内容扫描、完整告警或外部审计日志。生产团队仍需管理 OIDC 提供方、主机补丁、加密备份、磁盘空间、日志保留、隐私告知和访问复核。若服务规模超过单实例，需先设计并验收共享数据库、对象存储、密钥托管和分布式限流 adapter。

安装 Docker Compose 的命令和 OIDC Provider 的具体管理界面因发行版及身份提供方不同而异；配置字段以随部署的 Compose 文件和所选服务的当前官方文档为准。

参考：

- [OAuth2 Proxy configuration](https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/)
- [Caddy `forward_auth`](https://caddyserver.com/docs/caddyfile/directives/forward_auth)
- [Docker Compose](https://docs.docker.com/compose/)
