# ohos-ar-dev-workflow — 架构

「thin 入口 + thick 阶段 skill + 确定性门控脚本」三层,mirror AID/MigBot 范式,
但**阶段边界是脚本门控,不是用户点头**。

```
                         ┌─────────────────────────────────────────┐
   AR(已澄清需求) ───▶ │  ohos-ar-dev-workflow/SKILL.md (编排)  │
                         │  路由 → init → 调度循环 → 断点恢复         │
                         └───────────────┬─────────────────────────┘
                                         │ 每阶段:做事 → 跑门控 → advance
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                 ▼
  ohos-ar-dev-phases/SKILL.md   scripts/gate_*.py                advance.py
  + phaseN-*.md(做事说明)        (唯一 PASS 来源,产签名证据)    (唯一状态写入器)
        │                                │                                 │
        │ 调用现有能力技能               │ 解析真实证据                     │ 校验 HMAC+sha256
        ▼                                ▼                                 ▼
  ohos-dev-sa-codegen 等           build.log / hilog / xml / CI     specs/pipeline/<run>/
                                                                     pipeline.json
                                                                     evidence/manifest.jsonl
```

## 流程(证据门控,全自动)

```
P0 bootstrap ─┐
P1 design+dev │  每阶段:
P2 build      │    0) 每轮循环开头 refresh_todo.py 依 AR_design 刷新 todo.md
P3 test       │    1) 用命名的 ohos-* 技能做事
P4 device     ├─▶ 2) 跑 gate_*.py(脚本基于真实证据判 PASS/FAIL,产 HMAC 链签名记录)
P5 quality    │    3) PASS → advance.py advance --phase N(校验签名+链+产物哈希后才推进)
P6 upload ────┘    4) FAIL → 读 evidence/phaseN/ 真实日志,修复重跑(≤3 次)
                   P1 拆两子门控:gate_design(AR_design 6 章节 + ar-contract 契约块,签名)→ 人工 consent --phase 1 → gate_develop(依赖签名设计 + P1 consent)
                   P2/P3/P4 按签名契约做全量覆盖硬门控(build_artifacts / test_cases gtest / device_cases marker,缺一即 FAIL)
                   P3/P4/P5 只允许新增独立测试文件(功能指纹漂移会被拒)
                   P1/P4/P5/P6 需 advance.py consent(签名绑定证据)后才推进;并渲染 reports/ 人读 HTML
```

证据两轨:`evidence/`(机器,HMAC 链签名,gitignore) ‖ `reports/`(人读 HTML,脱敏可归档)。

## 逻辑阶段控制层(面向弱模型,导航非放行)

在真相层之上叠加一层 machine-readable 控制层,让中等能力模型也能稳定跑完整链。
`advance.py` 把物理 phase0–6 投影成逻辑阶段 **P0–P8**(物理 phase1 拆 `P1 design-orchestrate /
P2 feature-develop / P3 test-develop`;phase5/6 内 P7/P8 再拆子状态),
`status --json` / `next` 输出 `logical_phase_id / physical_phase / logical_substate /
action_kind / control_refs`。

```
run/controls/                        ← best-effort,非放行依据,可缺失容忍
├── packets/        Stage Packet(共享 def 表统一产;entry/exit/allowed/forbidden)
├── handoffs/       Handoff Packet(阶段→下一阶段事实摘要)
├── repairs/        Repair Packet(bundle_revision_from/suspect_*/downstream_revalidate_scope/repair_disallowed_if/regen_trigger_if)
├── memory_cards/   Phase Memory Card(新窗口先读的 5~10 条最重要事实)
├── receipts/       Completion Receipt(semantic_done/truth_layer_pass_known/next_phase_ready/human_gate_pending)
├── indexes/        artifact/evidence/report 三类索引
└── design_orchestrate/…/test_develop/  各逻辑阶段专属产物(bundle 定义 / test_intent_matrix / 子状态快照)
```

失败三分回路 `Retry / Repair / Regenerate` + 双熔断(`MAX_RETRY_ROUNDS`/`MAX_REPAIR_ROUNDS`
默认各 2)+ 人工升级;`downstream_revalidate_scope` 决定修完后重验到哪层。每个控制包有
draft-07 schema(`../ohos-ar-dev-phases/scripts/schemas/`)与建议性 `validate_control_payload()`
——**校验失败绝不改变门控 verdict**。设计全文见
`products/20260723-weak-model-optimization/`。

## 为什么"文本不能当通过"

- 模型没有任何工具能写 `pipeline.json` 的阶段状态——只有 `advance.py`。
- `advance.py` 只认 `manifest.jsonl` 里**该阶段最后一条、HMAC 签名有效、且记录的每个产物
  当前 sha256 仍匹配**的 PASS 记录。
- 签名密钥(per-run,32B,mode 600)存在当前 Agent 配置目录的 `.lifecycle-secret/<run>`,不在证据目录里,
  模型无法据此伪造签名。
- 因此唯一让阶段通过的途径,是门控脚本真的跑出了真实证据。
