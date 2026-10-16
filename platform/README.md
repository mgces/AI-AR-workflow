# DSH platform foundation

这是 DSH 云端编排平台的可运行基础。它把环境、workflow、Authority、调度、CodeAgent、RAG、设备/产物和 AR 运行时接到同一条可审计链路：模型或 CLI 的文本不会直接改变阶段，只有真实 Python gate、`advance.py` 和人工 consent 能推进 P0–P8。

## 已可运行的能力

- `packages/contracts` 校验 OpenHarmony、HarmonyOS-system、HarmonyOS-chip profile，并生成确定性摘要。
- `packages/workflow-registry` 校验 AR manifest、阶段 DAG、路径安全和 P8 发布门。
- `apps/local-console` 提供共享的本机 AR runtime/API 和自动化验收后端；桌面客户端在 `dsh-client-platform/apps/local-core` 通过受限 loopback API 复用它。
- 本地 fallback 的 `GET/POST /api/ar/preflight` 会在真实 scheduler 创建 run 前验证代码根可写、运行时脚本、环境分支和 CodeAgent；预检失败不会创建 run。
- 本地调度器实际启动非交互 Claude Code、OpenCode、Codex CLI；自定义 argv Agent 可配置，Cursor/Trae 在没有 adapter 时明确阻止派发。
- RAG 索引会保存到工作区 `.dsh/rag-index.json`，源码变化后标为 stale；DSH 工具可以保存 provider、embedding/reranker 模型与 endpoint 配置。桌面端 RAG UI 仍待迁移。宿主注入 `DSH_RAG_ENDPOINT` 后通过 OpenAI-compatible `/embeddings` 和 `/rerank` 执行语义检索，否则明确使用词法 fallback；凭据从宿主 secret 读取，不写入 profile。
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

`npm run console` 只启动本地 API fallback，用于脚本和自动化验收，不要把它当作 DSH 主页面。常用检查：

```bash
curl http://127.0.0.1:8787/healthz
curl http://127.0.0.1:8787/api/status
```

当前客户端与云端分离工程位于 [`dsh-client-platform`](../dsh-client-platform/README.md)。旧 DSH 网页入口已归档在 [`pending-delete/legacy-dsh-web`](../pending-delete/legacy-dsh-web/README.md)。

## DSH Runtime

`dsh-workflow/` 保留 DSH Cordis tools、MCP facade 和 AR runtime adapter，不再注入旧 AR 浏览器面板。桌面客户端、独立云端网页和实施进度见 `dsh-client-platform/README.md`。

## 真实环境边界

当前仓库自身不是 OpenHarmony 或 HarmonyOS 产品根目录。要跑通完整 P0–P8，必须绑定真实源码、profile、工具链、设备、`hdc`、GitCode/Gerrit 和发布凭据；缺少其中任何一项，Local Core 会显示阻断原因。新 Cloud API 的生产 OIDC、租户数据库和对象存储仍待实施；loopback 开发模式不允许直接作为公网多人服务。
