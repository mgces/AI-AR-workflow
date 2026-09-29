# Workflow 运行观测

静态统计网站，读取本仓库的 `workflow_metrics.json`，呈现运行总览、阶段耗时、门禁失败次数、失败原因、人工介入说明与运行详情。无需安装前端依赖。

## 更新数据

在仓库根目录执行：

```bash
python3 workflow-metrics-site/export_metrics.py
```

默认递归扫描当前仓库，包括 `products/.run/`、`specs/pipeline/` 和需求目录；跳过 Git、依赖、构建目录和符号链接。可通过 `--root /absolute/repository` 指定其他源码目录，通过 `--output /absolute/data.json` 指定输出。

导出器只读原始文件，不修改 metrics、pipeline 或门禁证据。发布文件位于 `dist/`，其中 `data.json` 是脱敏、字段白名单化后的快照。不会导出 pipeline、manifest 原文、HMAC、命令参数或 consent token。原因文本保留诊断说明并替换用户目录与显式凭据赋值；这不是任意自由文本的通用敏感信息检测器。

在线网页无法访问本机目录。新增文件后需要重新运行导出命令并发布新版本。页面“刷新快照”只重新读取已发布的 `data.json`。

公开发布使用单独的去敏数据快照，保留运行、阶段计数、耗时、门禁原因、人工介入说明与修复记录；只替换其中的 IP 地址、凭据赋值、邮箱、绝对本机或设备路径及证书文件名。相对源码路径和其他诊断文字保留。生成方式：

```bash
python3 workflow-metrics-site/export_metrics.py --public-dir docs/public/workflow-metrics
```

公开产物位于 `docs/public/workflow-metrics/`；本地详细快照继续存放在 `workflow-metrics-site/dist/data.json`，该文件已加入 `.gitignore`，不要将其提交。公开产物保留运行 ID、模型名、相对来源路径和指标数字；新增自由文本字段也会经过同一片段遮掩函数。

## 本地运行

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory workflow-metrics-site/dist
```

打开 `http://localhost:4173/`。不要直接通过 `file://` 打开页面，浏览器会阻止读取 JSON。

## 统计口径

- 支持仓库 schema version 2，AR 的 P0–P8 与 Requirement 的 R1–R9 分开聚合。
- 总有效耗时、人工等待与墙钟时间优先使用 `summary` 中的记录器口径；缺失时汇总已知阶段值。缺失时长显示“—”，真实 0 保留为 0。平均耗时仅以有有效耗时的运行计样本。
- 同一 `workflow` + `run_id` 的重复快照保留 `updated_at_utc` 最新一份。损坏、不支持的数据文件在页面提示，不静默丢弃。
- 门禁失败次数来自 `fail_attempts`，分母为 `gate_attempts`，包含恢复前失败及确认门禁的 FAIL；不把次数当成最终失败运行数。
- “门禁失败分布”的每个柱子可点击，按当前筛选范围列出该阶段失败的运行与记录，并可继续打开单次运行详情；零失败柱子显示空状态。
- 运行表和详情里的所有非“已完成”状态都可点击（键盘可用 Enter / 空格）打开状态说明。“受阻”显示最近失败阶段、门禁和原因；“等待人工”显示未结束的等待区间及原因；“进行中”和“未开始”说明推断依据。说明均标明指标更新时间，只反映记录时点，不证明当前进程状态。
- 对旧指标缺少逐次失败日志的运行，可在原始 `workflow_metrics.json` 中补 `session_failure_analysis` 阶段级会话线索。页面会在阶段失败明细和运行详情展示原因、处理、结果与证据索引，但仍把无法对应到单次 FAIL 的计数标为原因缺失，不把会话推断伪装成原始门禁记录。后续会话结果也与旧快照状态分开展示。
- 新的 AR `attempt_history` 会显示每次失败的签名原因、首次尝试与轮次、人工查明的根因、修复动作和同一门禁的复验结果；未记录修复的 PASS 不显示为“修改已解决”。首轮通过率只用有逐次记录的首轮样本，P8 人工审核停点单独计数。
- 优先读取 `attempt_history` 的逐次原因、修复和复验结果；旧版记录在同目录有 `evidence/manifest.jsonl` 时，可关联其去重的 FAIL 原因。原因缺失显式展示，绝不从最新门禁名称反推全部历史失败原因。
- Requirement 记录器仅保存 `attempts` / `last_result` 时，历史失败次数未知，最近失败单独展示，不纳入门禁失败率。
- 人工介入说明独立展示，不冒充门禁失败根因；原因分类是基于文本关键词的展示辅助。
- 状态是快照推断：明确完成结果或全部阶段已通过并关闭判为完成；人工等待单独标记；以最近打开的阶段识别 repair/reset 后的进展，不简单取最大阶段编号。没有实时进程存活保证。
- 不用当前时间扩展陈旧运行的耗时；网页显示快照生成时间和源指标更新时间，时区为 Asia/Shanghai。

## 验证

```bash
python3 -m unittest discover -s workflow-metrics-site/tests -v
node workflow-metrics-site/tests/analytics.test.mjs
node --check workflow-metrics-site/dist/app.mjs
```

页面渐进注册只读 WebMCP 工具 `read_workflow_summary`，复用可见筛选状态；不支持该 API 的浏览器不受影响。当前环境没有可用的受支持 WebMCP 浏览器上下文，其实际注册与调用尚未验证。

## GitHub Pages 发布

仓库现有 `.github/workflows/deploy-docs.yml` 在 GitHub `main` 分支的 `docs/**` 变化时构建 VitePress，`docs/public/workflow-metrics/` 会作为静态子页面进入同一次 Pages 发布，地址为 `https://mgces.github.io/AI-AR-workflow/workflow-metrics/`。更新公开数据后检查 `docs/public/workflow-metrics/data.json`，将该目录提交到 GitHub `main` 即可触发部署。

原始 `products/.run/` 数据目录不提交到 GitHub，也不会由 GitHub Actions 自动读取。每次更新指标都需要在本地重新导出、检查去敏结果并提交公开快照。源码目录内的 `.openai/hosting.json` 是未使用的 Sites 项目身份，已忽略，GitHub 发布无需它。
