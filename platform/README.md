# DSH platform foundation and local console

这是 DSH 云端编排平台的可运行基础。它把环境、workflow、Authority、调度、CodeAgent、RAG、设备/产物和 AR 运行时接到同一条可审计链路：模型或 CLI 的文本不会直接改变阶段，只有真实 Python gate、`advance.py` 和人工 consent 能推进 P0–P8。

## 已可运行的能力

- `packages/contracts` 校验 OpenHarmony、HarmonyOS-system、HarmonyOS-chip profile，并生成确定性摘要。
- `packages/workflow-registry` 校验 AR manifest、阶段 DAG、路径安全和 P8 发布门。
- `apps/local-console` 在 WSL `127.0.0.1:8787` 提供免登录本地入口；SQLite 持久化运行、任务、租约、事件、审核、人工输入、失败原因和 usage。
- 本地 fallback 的 `GET/POST /api/ar/preflight` 会在真实 scheduler 创建 run 前验证代码根可写、运行时脚本、环境分支和 CodeAgent；预检失败不会创建 run。
- 本地调度器实际启动非交互 Claude Code、OpenCode、Codex CLI；自定义 argv Agent 可配置，Cursor/Trae 在没有 adapter 时明确阻止派发。
- RAG 索引会保存到工作区 `.dsh/rag-index.json`，源码变化后标为 stale；官方面板和 DSH 工具可以保存 provider、embedding/reranker 模型与 endpoint 配置。宿主注入 `DSH_RAG_ENDPOINT` 后通过 OpenAI-compatible `/embeddings` 和 `/rerank` 执行语义检索，否则明确使用词法 fallback；凭据从宿主 secret 读取，不写入 profile。
- 设备 `hdc` 目标和 `.hap/.hsp/.so/.ko/.elf/.img/.bin` 产物识别已经接到状态 API；识别结果不替代真实设备 gate。
- `workspace-gateway` 提供 Authority envelope、受限 SSH Connector、JSONL Gateway、HTTP Gateway 和云端 HTTP Client，可作为用户电脑/WSL 的代码端接入层。
- `deploy/doctor.mjs`、systemd 单元和环境模板提供云主机安装前的 P0/P8 readiness 检查；Gateway/本地 DSH 的 ProcessSupervisor 可按环境变量启用 cgroup v2 operation 隔离。

## 本地运行

```bash
npm ci --ignore-scripts
npm test
npm run lint
npm run typecheck
npm run build
npm run console
# 云主机部署前检查（JSON；阻断时退出码 2）
npm run deploy:doctor -- --repo-root /srv/dsh/workspaces/default/project --environment openharmony --human
```

从 Windows 打开 `http://localhost:8787`。常用检查：

```bash
curl http://127.0.0.1:8787/healthz
curl http://127.0.0.1:8787/api/status
```

## 官方 DSH

生产用户入口是官方 DSH Web profile；`dsh-workflow/cordis.patch.yml` 把 AR Delivery 面板挂进官方 sidebar/main，不再另开一个产品页面。面板提供 CodeAgent 选择、OpenHarmony/HarmonyOS 分支选择、P0–P8 启动、阶段耗时、人工审核、完整审核产物、事件、失败原因、RAG、设备/产物调试和 token usage 展示。

## 真实环境边界

当前仓库自身不是 OpenHarmony 或 HarmonyOS 产品根目录。要跑通完整 P0–P8，必须绑定真实源码、profile、工具链、设备、`hdc`、GitCode/Gerrit 和发布凭据；缺少其中任何一项，页面会显示 `profile_incomplete` 或确定性阻塞。公网多租户还需要在反向代理/身份层补 OIDC、租户数据库和对象存储；本地免登录模式只适用于受信内网。
