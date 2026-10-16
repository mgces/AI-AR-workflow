# DSH Cloud Console 单实例部署

新的客户端/云端分离架构提供一个适用于单台 Linux 计算云的 Docker Compose 部署入口。它通过 Caddy 提供 HTTPS、通过 OAuth2 Proxy 接入 OIDC 登录，并将 Cloud API 留在 Docker 私有网络中。该部署不提供数据库横向扩展或高可用。

按仓库内的[部署手册](https://github.com/mgces/AI-AR-workflow/blob/main/dsh-client-platform/deploy/cloud/README.md)配置 DNS、OIDC 回调、部署密钥、启动服务，并按步骤验证登录、设备配对、事件同步和审核产物流程。数据备份必须将 SQLite、审核对象和 intent 签名私钥作为同一快照保存。

当前单实例的 SQLite/本地文件存储、进程内限流和人工停机备份边界见[实施状态](./client-cloud-separated-implementation.md)。如需多实例，需要先接入共享数据库、对象存储、分布式限流和密钥托管。
