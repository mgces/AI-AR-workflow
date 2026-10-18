# Workflow 运行观测

静态统计网站，读取本仓库的 `workflow_metrics.json`，呈现运行总览、阶段耗时、门禁失败次数、失败原因、人工介入说明与运行详情。无需安装前端依赖。

仓库不预置运行快照。缺少 `data.json` 时页面显示空状态，仍可导入 JSON 并保存在当前浏览器。
首次启用管理员共享发布前，需要先通过下方命令行导出生成、核对并提交公开快照；后续网页发布再更新该文件。

## 更新数据

### 直接在网站导入及管理员共享发布

1. 从首页点击 **导入 JSON / 管理员发布**；优化总结页也有 **导入运行 JSON** 入口。
2. 选择一份或多份 `workflow_metrics.json`（schema version 2），或本网站导出的去敏备份（version 1）。每份最多 10 MB，每次最多 20 份。页面校验版本、阶段和非负计数，并预览去敏后的原因、修改和复验；损坏文件逐个显示错误，其他有效文件仍可导入。
3. **保存到当前浏览器** 无需登录，统计立即更新，刷新后保留，仅本浏览器可见。按 workflow + run-id 去重，较旧或相同时间的记录不覆盖新版。**导出去敏备份** 可在另一浏览器恢复；**清除本浏览器导入** 不删除共享数据。
4. 要让所有访问者看到，展开 **管理员发布**。在 GitHub 创建仅授权 `mgces/AI-AR-workflow` 的 fine-grained token，赋予 **Contents: Read and write**，在页面密码框输入。账号也必须有该仓库写入权限。账号的仓库角色和 Token 的授权是两回事：读取公开快照成功，不能证明 Token 获得了 Contents 写权限。授权不会写入浏览器存储、URL、备份或快照；关闭窗口、提交完成或权限检查失败后清空。
5. 点击 **检查账号与共享差异**。页面读取 main 的最新快照，显示账号身份、将新增/更新的运行和共享总数；这一步不验证 Token 的写权限，真正提交时由 GitHub 校验。核对去敏明细后点击 **确认公开并发布**。文件选择和权限检查均不会上传运行数据；最终确认才提交公开快照。
6. GitHub Pages 自动部署后，所有访客无需登录即可看到新统计；可通过页面返回的提交链接查看此次变更。页面提示“已提交”时部署可能还未完成，请稍后刷新。并发修改导致 409 时，需要重新检查差异，不会盲目覆盖。

共享发布只更新 GitHub 的 `docs/public/workflow-metrics/data.json`，不会创建新仓库、上传原始文件或自动修改 GitCode 镜像。网站源码维护仍按双仓同步。优化页的“最新运行失败复盘”会读取最新共享快照和本浏览器导入，展示 JSON 已记录的原因、修改、复验及缺失信息；新运行或更新版本标记为待人工复盘。此入口不会自动生成新的会话推断、人工改进计划或更新固定评估样本。

授权仅发往固定的 `api.github.com`，拒绝重定向。实现使用 GitHub 官方 [Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents) 和 [浏览器跨域支持](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests)。自由文本只能遮掩已识别的敏感片段；公开前请核对预览，必要时修改文件后重新选择。

### 命令行导出

在仓库根目录执行：

```bash
python3 workflow-metrics-site/export_metrics.py
```

默认递归扫描当前仓库，包括 `products/.run/`、`specs/pipeline/` 和需求目录；跳过 Git、依赖、构建目录和符号链接。可通过 `--root /absolute/repository` 指定其他源码目录，通过 `--output /absolute/data.json` 指定输出。

导出器只读原始文件，不修改 metrics、pipeline 或门禁证据。发布文件位于 `dist/`，其中 `data.json` 是脱敏、字段白名单化后的快照。不会导出 pipeline、manifest 原文、HMAC、命令参数或 consent token。原因文本保留诊断说明并替换用户目录与显式凭据赋值；这不是任意自由文本的通用敏感信息检测器。

在线网页无法自动读取本机目录。可在页面主动选择 JSON 导入，也可重新运行导出命令并发布。页面“刷新快照”读取已发布的 `data.json`，并合并本浏览器保存的导入，不会丢弃本地记录。

公开发布使用单独的去敏数据快照，保留运行、阶段计数、耗时、门禁原因、人工介入说明与修复记录；只替换其中的 IP 地址、凭据赋值、邮箱、绝对本机或设备路径及证书文件名。相对源码路径和其他诊断文字保留。生成方式：

```bash
python3 workflow-metrics-site/export_metrics.py --public-dir docs/public/workflow-metrics
```

公开产物位于 `docs/public/workflow-metrics/`；本地详细快照继续存放在 `workflow-metrics-site/dist/data.json`，该文件已加入 `.gitignore`，不要将其提交。公开产物保留运行 ID、模型名、相对来源路径和指标数字；新增自由文本字段也会经过同一片段遮掩函数。

后续命令行导出前，应先同步 main 上最新的公开 `data.json`。导出器保留其中 `import_origin: browser` 的网页共享记录，并以更新时间与本机记录合并；保留流程复用浏览器白名单与去敏校验，需要 Node.js。校验失败时停止覆盖公开快照。

## 本地运行

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory workflow-metrics-site/dist
```

打开 `http://localhost:4173/`。不要直接通过 `file://` 打开页面，浏览器会阻止读取 JSON。

## 统计口径

优化后新运行的 `preflight_summary` 和失败预检在运行详情单独展示。原始命令、环境、完整输出不导出；保留检查原因、规则编号、修复及复验。历史没有预检记录显示未知，不当作零失败。首次实测对照位于优化页，主要评价 P0–P7，P8 作为折叠的次要说明；参见 `docs/workflow/optimization-real-run-20261010.md`。

- 支持仓库 schema version 2，AR 的 P0–P8 与 Requirement 的 R1–R9 分开聚合。
- 总有效耗时、人工等待与墙钟时间优先使用 `summary` 中的记录器口径；缺失时汇总已知阶段值。缺失时长显示“—”，真实 0 保留为 0。平均耗时仅以有有效耗时的运行计样本。
- 同一 `workflow` + `run_id` 的重复快照保留 `updated_at_utc` 最新一份。损坏、不支持的数据文件在页面提示，不静默丢弃。
- 门禁失败次数来自 `fail_attempts`，分母为 `gate_attempts`，包含恢复前失败及确认门禁的 FAIL；不把次数当成最终失败运行数。
- “门禁失败分布”的每个柱子可点击，按当前筛选范围列出该阶段失败的运行与记录，并可继续打开单次运行详情；零失败柱子显示空状态。
- 首页只展示汇总、阶段分布和运行列表；失败原因与人工介入在阶段或运行详情中查看，避免运行数增加时首页不断变长。
- 运行表和详情里的所有非“已完成”状态都可点击（键盘可用 Enter / 空格）打开状态说明。“受阻”显示最近失败阶段、门禁和原因；“等待人工”显示未结束的等待区间及原因；“进行中”和“未开始”说明推断依据。说明均标明指标更新时间，只反映记录时点，不证明当前进程状态。
- 对旧指标缺少逐次失败日志的运行，可在原始 `workflow_metrics.json` 中补 `session_failure_analysis` 阶段级会话线索。导出时直接把可确认的阶段原因填到原来的失败条目，并在同一条里展示处理、结果与证据索引。失败次数保持原值，无法逐次对应的情况在条目中说明；后续会话结果与旧快照状态分开展示。
- “门禁失败的下一步优化总结”页面将历史案例整理为 workflow 自身的改进清单，支持阶段、归因、优先级及进度筛选。改进措施、验收证据和进度维护方式见 [OPTIMIZATION.md](OPTIMIZATION.md)。指标导出时同步页面与导航。
- 新的 AR `attempt_history` 会显示每次失败的签名原因、首次尝试与轮次、人工查明的根因、修复动作和同一门禁的复验结果；未记录修复的 PASS 不显示为“修改已解决”。首轮通过率只用有逐次记录的首轮样本，P8 人工审核停点单独计数。
- 优先读取 `attempt_history` 的逐次原因、修复和复验结果；旧版记录在同目录有 `evidence/manifest.jsonl` 时，可关联其去重的 FAIL 原因。原因缺失显式展示，绝不从最新门禁名称反推全部历史失败原因。
- Requirement 记录器仅保存 `attempts` / `last_result` 时，历史失败次数未知，最近失败单独展示，不纳入门禁失败率。
- 人工介入说明独立展示，不冒充门禁失败根因；原因分类是基于文本关键词的展示辅助。
- 状态是快照推断：明确完成结果或全部阶段已通过并关闭判为完成；人工等待单独标记；以最近打开的阶段识别 repair/reset 后的进展，不简单取最大阶段编号。没有实时进程存活保证。
- 不用当前时间扩展陈旧运行的耗时；网页显示快照生成时间和源指标更新时间，时区为 Asia/Shanghai。

## 验证

```bash
python3 -m unittest discover -s workflow-metrics-site/tests -v
node --test workflow-metrics-site/tests/*.test.mjs
node --check workflow-metrics-site/dist/app.mjs
```

真实浏览器回归（需安装 Playwright 和 Chrome，并启动上面的本地服务器）：

```bash
node workflow-metrics-site/tests/import-browser.mjs
```

测试会拦截所有 GitHub API 调用，不会实际发布。覆盖多文件导入、错误与去敏、刷新保留、备份、管理员预览/确认、权限失败、清除及手机导航。可通过参数指定 Playwright 模块目录和预览地址。

页面渐进注册只读 WebMCP 工具 `read_workflow_summary`，复用可见筛选状态；不支持该 API 的浏览器不受影响。当前环境没有可用的受支持 WebMCP 浏览器上下文，其实际注册与调用尚未验证。

## GitHub Pages 发布

仓库现有 `.github/workflows/deploy-docs.yml` 在 GitHub `main` 分支的 `docs/**` 变化时构建 VitePress，`docs/public/workflow-metrics/` 会作为静态子页面进入同一次 Pages 发布，地址为 `https://mgces.github.io/AI-AR-workflow/workflow-metrics/`。更新公开数据后检查 `docs/public/workflow-metrics/data.json`，将该目录提交到 GitHub `main` 即可触发部署。

原始 `products/.run/` 数据目录不提交到 GitHub，也不会由 GitHub Actions 自动读取。更新指标可以使用管理员导入发布，或本地导出、检查去敏结果后提交公开快照。源码目录内的 `.openai/hosting.json` 是未使用的 Sites 项目身份，已忽略，GitHub 发布无需它。

## 计时覆盖检查

运行详情显示历史完整性及 P1/P2/P3 每轮 UTC 起止时间。旧记录默认为未知；`recording-notes.json`
按 run-id 与精确开始时间登记已经由 session 确认的缺失，只增加说明，不修改原始指标或猜测时长。
已知不完整记录暂停完整任务耗时和失败减少度评估。新 workflow 在工作开始前登记 `work-start`，
同一 run 强制初始化会保留并归档历史。原始 `metrics-history/` 只留本地。

上传被拒绝时，页面区分 Token 授权不足、API 限流、main 分支规则和远端并发修改，并显示 HTTP 状态与可用的 GitHub 请求编号。错误正文不原样显示，防止泄露自由文本中的敏感信息。若出现写入 403/404，优先核对 fine-grained Token 的 Resource owner、选定仓库及 Contents: Read and write，保存权限后重新输入 Token，再检查差异并发布。
