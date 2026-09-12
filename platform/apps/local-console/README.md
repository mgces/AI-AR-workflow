# DSH Local Console

这是当前实现可以直接使用的免登录本地控制台。它默认只绑定 `127.0.0.1:8787`，显示 Windows→WSL SSH 烟测、当前仓库环境识别、Claude/OpenCode 版本探测、代码 RAG 入口和产物/设备只读探测，并允许校验 AR workflow 草案和 Authority envelope。

它可以创建并持久化一个 AR P0 预检 run，记录阶段耗时、事件、人工输入、阻塞原因和环境报告；RAG 是授权代码根上的本地词法 fallback，产物/设备识别是只读 advisory 探测。它仍不是完整 DSH 云服务：不会启动 codeagent、执行 SSH 作业、调用 embedding/reranker、部署设备、编译或发布。

在仓库根目录运行：

```bash
npm --prefix platform run console
```

然后从 Windows 浏览器打开 `http://localhost:8787`。如果 WSL 没有启用 localhost 转发，可改用 WSL 地址访问；控制台仍然只应在受信本机使用。

主要接口：`/api/status`、`/api/projects`、`/api/workspaces`、`/api/runs`、`/api/rag/index`、`/api/rag/search`、`/api/debug/status` 和 `/healthz`。状态中出现 `unknown`、`missing`、`not_implemented` 或 `not_verified` 时，表示真实能力尚未接入，不代表成功。
