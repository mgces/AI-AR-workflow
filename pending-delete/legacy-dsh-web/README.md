# 旧 DSH 网页入口（待删除）

该目录保存迁移前的 DSH 官方 Web AR 面板、`/api/ohos-ar/*` 路由、网页下载 Connector 安装器、旧 DSH 插件装配代码及对应测试。

这些文件用于迁移对照，不得被新客户端或 Cloud API 导入，也不再作为可运行产品入口。新实现位于 [`dsh-client-platform/`](../../dsh-client-platform/README.md)：桌面端负责本地执行，独立 Cloud Console 负责云端观测。

删除门槛：新 Desktop 与 Cloud Console 完成真实 AR P0–P8、人工审核、完整产物/维测、离线补传和双用户隔离验收后，删除本目录及本说明。迁移期间只修复被新实现复用的共享 runtime；不要在此目录继续增加产品功能。
