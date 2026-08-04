# run 目录结构

> 解释 run-state 目录结构:pipeline.json / AR_design.md / todo.md / next_action.json / evidence / controls / reports。

## 目录总览

每个 AR 在 `$REPO/specs/pipeline/{YYYYMMDD}-{slug}/` 建独立流水线目录(PDIR):

```
$REPO/specs/pipeline/{YYYYMMDD}-{slug}/
├── pipeline.json        # 规范状态(只有 advance.py 写)
├── ar.md                # 输入的已澄清 AR 原文
├── AR_design.md         # P1 固化的设计文档(6 必含章节;签名副本在 evidence/phase1/)
├── todo.md              # 人读镜像(由 refresh_todo.py 依 AR_design 重写)
├── next_action.json     # 导航层:当前逻辑阶段/物理 phase/substate/下一步
├── evidence/            # ← 机器证据(签名,gitignore),真相所在
│   ├── manifest.jsonl   #   追加式 HMAC 链式签名证据账本
│   ├── phase0/ … phase8/  # 各阶段真实产物
├── controls/            # ← 弱模型控制/导航层(best-effort,非放行依据,可缺失容忍)
└── reports/             # ← 人读 Markdown 审计报告(脱敏,可归档)
```

## pipeline.json

规范状态,**只有 `advance.py` 能写**。关键字段:

- `current_phase` — 当前物理阶段(0–8)
- `environment` — 环境形态(`openharmony` | `harmonyos`),init 时确定,决定编译/上库后端
- `component_type` — HarmonyOS 组件类型(`system` | `chip`;openharmony 为 `null`)
- `consent` — 人工确认令牌(签名 + 绑定 PASS 条目)
- `functional_fingerprint` — P2 闭合时锁定的功能指纹
- `locked_all_paths` — 冻结路径快照
- 组件信息:`git_dir` / `build_target` / `testpart` / `base_commit`
- `product` — 由环境 profile 派生(openharmony 为 rk3568;HarmonyOS 占位未填为 `null`)

字段结构详见 `skills/ohos-ar-dev-workflow/references/pipeline-schema.md`。

## ar.md

输入的已澄清 AR 原文,一字不改落盘。作为运行态的输入凭证。

## AR_design.md

P1 固化的设计文档,**6 必含章节**:

1. 目标组件
2. 功能需求
3. 完整代码框架
4. 完整测试框架
5. 需测试功能点
6. 真机用例构造

内嵌 ```ar-contract``` JSON 契约块(三非空数组)。签名副本在 `evidence/phase1/`。

## todo.md

人读镜像,由 `refresh_todo.py` 依 AR_design 派生细项。与 `TodoWrite` 双轨:

- `TodoWrite` — 会话内可视
- `todo.md` — 磁盘权威镜像,便于断点恢复

每轮循环开头刷新:`refresh_todo → 做事 → 跑门控 → advance`。

## next_action.json

导航层:当前逻辑阶段 / 物理 phase / substate / 下一步。与 `controls/` 内有镜像。

`advance.py next` 输出当前逻辑阶段 + 下一步(retry/repair/regenerate/escalate),并写此文件。

## evidence/

机器证据(签名,gitignore),**真相所在**:

- `manifest.jsonl` — 追加式 HMAC 链式签名证据账本
- `phase0/ … phase8/` — 各阶段真实产物

放行唯一真相源 = `evidence/manifest.jsonl` 签名记录。

## controls/

弱模型控制/导航层(best-effort,非放行依据,可缺失容忍):

- `next_action.json` — 与 root 同源镜像
- `packets/` — 各逻辑阶段 Stage Packet
- `memory_cards/` — Phase Memory Card
- `handoffs/` — Handoff Packet
- `repairs/` — Repair Packet
- `receipts/` — Completion Receipt
- `indexes/` — artifact/evidence/report 三类索引
- 各逻辑阶段专属产物目录

控制 JSON 永远不是第二真相源;校验失败只告警不挡写入,绝不改变门控 verdict。

## reports/

人读 Markdown 审计报告(脱敏,可归档),与 `evidence/` 分离:

- `device_functional.md` — 真机功能完整报告
- `quality.md` — 覆盖率/性能/功耗/稳定性 + 代码 review(六段聚合)
- `summary.md` — 上库汇总(背景/设计/修改/用例/结果)
- `pr_description.md` — P8 汇总,gate_upload_ci 注入 PR 描述
- `test_report.md` — P5 单元测试 + P6 端到端关键证据聚合

## 延伸阅读

- [状态机](/reference/workflow-state-machine) — pipeline.json 的状态字段
- [门控契约](/reference/gate-contract) — evidence/manifest.jsonl 的签名账本
- [Evidence 与 Gates](/workflow/evidence-and-gates) — evidence 与 reports 的分离
- [关键命令](/reference/key-commands) — advance.py 各子命令速查
