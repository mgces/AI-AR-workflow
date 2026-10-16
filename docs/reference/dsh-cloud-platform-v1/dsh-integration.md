# DSH Runtime 接入与旧网页迁移说明

## 当前状态

旧的 DSH Web AR 主面板和 `/api/ohos-ar/*` 路由已从活跃 DSH bundle 移至仓库内
`pending-delete/legacy-dsh-web/` 历史归档目录。当前不应再按旧部署步骤启动 DSH 官方 Web 来使用 AR 工作台。

新的客户端与云端分离工程正在 `dsh-client-platform/` 实施，当前状态见[客户端与云端实施说明](../client-cloud-separated-implementation.md)：

- Electron Desktop 是本地执行入口；
- Local Core 复用已有 AR runtime 并通过进程 token 保护本机 API；
- Cloud API 验证设备签名事件并生成运行投影；
- 独立 Cloud Console 展示云端运行列表；
- DSH 作为 tools/MCP/Agent runtime adapter 保留，不再承载产品主页面。

当前代码已实现设备配对、签名事件 outbox、AR 事件映射与维测、网页审核签名回执、用户选定的审核产物上传、WSL/SSH adapters，以及接入外部 OIDC 的单实例部署方案。软件路径已有自动化测试；Windows 安装及首次启动、真实源码与设备的完整 P0–P8、目标主机 OIDC 部署仍待验收，正式签名发行及高可用能力尚未完成。请以客户端实施说明和后续验收清单为准。

## DSH 当前活跃用法

`dsh-workflow/cordis.patch.yml` 只装载 `@ai-ar/dsh-workflow` 的工具插件，不含 AR 浏览器面板。它可通过 `ctx.tools` 注册模块路由与 delivery runtime tools；MCP Server 仍可供 Codex/Claude 等宿主使用。DSH tool 的执行结果本身不构成 P0–P8 PASS，实际阶段仍需要 `runtime/dsh-ohos` 和 Python gates 产生的证据。

旧版 Web UI、路由与 Connector installer 的原始源码只留在 pending-delete 目录，等新客户端完成验收后删除。不得从新产品代码导入该目录。
