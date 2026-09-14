# DSH platform foundation and local console

这是 DSH 云端编排平台的第一段可运行实现，对应方案中的 T01/T02 基础切片，并包含一个免登录本地控制台。它先把会影响所有服务的契约固定下来：

- `packages/contracts`：OpenHarmony、HarmonyOS-system、HarmonyOS-chip 的环境 profile 校验、确定性摘要、环境探测和人工确认绑定。
- `packages/workflow-registry`：workflow manifest 的摘要、签名元数据、阶段 DAG、路径安全和 AR P0–P8/P8-precheck/P8-publish 固定约束。
- `apps/local-console`：绑定 WSL `127.0.0.1:8787` 的可运行入口，持久化 run/阶段/人工输入，提供 Agent 版本探测、代码 RAG 词法检索、产物识别和 hdc 只读探测。

当前控制台可以运行真实的本地 P0 环境预检并保留可审计的阻塞产物；它不把版本探测当作 Agent 调度，不把扩展名识别当作可部署产物，也不产生真实 gate/PASS 证据。草案 manifest 的 `digest: null`、未锁定 source lock 和未完成的 HarmonyOS profile 会被安装校验拒绝。

T00 的当前探测快照在 `compatibility/`：本机 Node 22 不满足 Node 24 基线，OpenCode/DSH CLI 未发现，Claude Code 探测被 WSL 启动错误中断；因此 capability matrix 保持 `unknown`，不能作为真实宿主验收结果。

在 `platform/` 目录运行：

```bash
npm ci --ignore-scripts
npm test
npm run lint
npm run typecheck
npm run build
npm run console
```

运行 `npm run console` 后从 Windows 浏览器打开 `http://localhost:8787`，无需登录。界面可加载和校验 AR 草案、启动 P0 预检、查看阶段事件/产物、记录人工输入、建立本地词法 RAG 索引并检索代码；RAG 页面会标出当前是本地 fallback，未配置 embedding/reranker 模型。

Node 24 是设计基线；如果本机低于 Node 24，命令可能出现 engine warning，不能把它当作 T00 版本兼容性证据。真实 DSH/codeagent 执行、持久 SSH 服务、远端 Authority RPC、Connector、模型 RAG、设备部署和多用户云服务仍按实施任务单继续推进。当前运行入口属于本机可用的 local MVP，不应作为生产云服务或三环境 AR 验收结论。
