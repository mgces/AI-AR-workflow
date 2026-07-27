# pipeline.json 状态结构

每个 AR 一个运行态目录:`$OHOS_ROOT/specs/pipeline/{YYYYMMDD}-{ar-slug}/`

```
pipeline.json          # 规范状态;只有 advance.py 写
next_action.json       # 兼容根路径导航快照(advance.py next 生成,非真相源)
todo.md                # 人读镜像(refresh_todo.py 生成)
todo.json              # 机器待办镜像(refresh_todo.py 生成,非真相源)
ar.md                  # 输入的已澄清 AR 原文
AR_design.md           # 工作区设计草稿;P1 签名副本在 evidence/phase1/
controls/              # 控制层/导航层镜像(非真相源)
  next_action.json     # 与根 next_action.json 同 payload 的镜像
  memory_cards/
    current.json       # advance.py 投影的当前阶段最小启动卡
    phase<N>.json      # 各 gate 在 PASS/FAIL 两侧写的本阶段记忆卡
  receipts/
    phase0.json / phase1.json / phase2.json / ...
  handoffs/
    current.json
    phase0-next.json / phase2-next.json / ...
  repairs/
    current.json       # 当前 repair packet;PASS 时置 active=false
  packets/
    <logical_phase_id>.json  # 各 logical phase 的 Stage Packet(goal/entry/exit/failure_classes)
                             # advance.py(next 时)与各 gate(运行时)都从共享 def 表落同一份
  design_orchestrate/  # P1 由 signed contract 派生
    global_design_doc_index.json / stage_packet_index.json
    initial_bundle_definition.json
    completion_receipt_p1.json / handoff_to_feature_develop.json
  feature_develop/     # P2
    completion_receipt_p2.json / handoff_p2_to_p3.json
  test_develop/        # P3(prepare_test_bundle.py)
    development_freeze_snapshot.json / signed_test_scope.json
    test_intent_matrix.json / phase1_test_develop.json
    completion_receipt_p3.json / handoff_p3_test_develop.json
    failure_packet.json
  build_verify/        # P4
    completion_receipt.json / handoff_to_test_author.json
  test_author/         # P5
    completion_receipt.json / handoff_to_device_functional.json
  device_functional/   # P6
    completion_receipt.json / handoff_*.json
    evidence_index.json  # §17 证据信任顺序(强->弱)
  quality_verify/      # P7
    substate.json      # integration_run/quality_check/review_check/human_review_await
    completion_receipt.json / handoff_to_upload_review.json
  upload_review/       # P8
    substate.json      # precheck/local_review/consent_await/push_pr/pr_review/ci_green/finalize
                       #   (finalize 目前为占位子状态:CI 绿 + PR head SHA 校验通过后即视为完成,
                       #    暂无独立收尾动作;真相仍由 gate_upload_ci 的签名 PASS 决定)
    completion_receipt.json
evidence/              # 机器证据(签名,gitignore)——真相所在
  manifest.jsonl       # 追加式、HMAC 链式签名证据账本
  phase0/ … phase8/    # 各阶段真实产物 + phase_summary/failure_report
reports/               # 人读 Markdown 审计报告(脱敏,可归档)——与 evidence/ 并列分离
  device_functional.md / quality.md / summary.md   # 各为单个聚合 md
  pr_description.md    # P8 汇总,gate_upload_ci 注入 PR 描述
```

## pipeline.json 字段

```json
{
  "run_id": "20260629-<slug>",
  "ar": "20260629-<slug>",
  "repo": "$OHOS_ROOT",
  "git_dir": "$OHOS_ROOT",
  "product": "rk3568",
  "device_serial": "",
  "build_target": "<gn target>",
  "test": { "part": "<testpart>", "ut_suites": [], "mst_suites": [] },
  "base_commit": "<phase1 起点 SHA>",
  "current_phase": 0,
  "current_phase_name": "bootstrap",
  "current_substate": "awaiting_gate",
  "legacy_mode": false,
  "last_failure": null,
  "resume_hint": "Run gate_env_init.py to record signed bootstrap evidence.",
  "next_gate": "gate_env_init.py",
  "required_inputs": ["build_target"],
  "consent_tokens": {},
  "code_fingerprint": null,
  "functional_fingerprint": null,
  "locked_all_paths": null,
  "phases": [
    {
      "id": 0,
      "name": "bootstrap",
      "status": "pending",
      "manifest_ref": null,
      "closed_at_utc": null
    }
  ]
}
```

### 核心约束

- `advance.py` 是 **唯一** 会写 `pipeline.json` 的脚本。
- `evidence/manifest.jsonl` 是唯一放行真相源；`next_action.json`、`todo.json`、`phase_summary.json`、`failure_report.json` 只用于导航/恢复，不可单独推动阶段前进。
- `phases[].status` 实际使用的是 `pending | passed`，推进失败不会直接把 `pipeline.json` 改成 `failed`；失败事实来自 manifest 里的签名 FAIL 记录和 phase failure report。

## `current_substate` / `next_gate` / `required_inputs`

`advance.py status --json` 与 `advance.py next` 会把当前阶段细化成弱模型优先消费的导航状态：

- `current_substate`
  - `awaiting_gate`：当前 phase 还没有可闭合 PASS 证据，应运行 gate
  - `awaiting_design_gate`：P1 还没有签名设计，应先跑 `gate_design.py`
  - `awaiting_design_consent`：P1 设计已 PASS，但还缺设计人工 consent(在 P2 开发门校验)
  - `awaiting_develop_gate`：P2 等待 `gate_develop.py`(需 P1 签名设计 + consent)
  - `awaiting_test_develop_gate`：P3 等待 `gate_test_develop.py`
  - `awaiting_consent`：P6/P7/P8 已有 PASS 证据，但还缺人工审核令牌
  - `ready_to_advance`：当前 phase 已有有效 PASS 证据，可执行 `advance.py advance`
  - `blocked`：上游签名设计被篡改/丢失等 fail-closed 状态
  - `complete`：全部阶段闭合完成
- `next_gate`
  - 下一条应执行的命令/门控，如 `gate_build.py`、`advance.py consent --phase 7 --token <reviewer>`、`advance.py advance --phase 3`
- `required_inputs`
  - 当前动作最小必要输入，例如 `AR_design.md`、`reviewer_token`、`quality_reports`
- `resume_hint`
  - 供恢复时直接展示给弱模型/操作者的简短说明

## `status --json` 输出结构

`advance.py status --json` 返回一个聚合视图：

```json
{
  "run_id": "...",
  "ar": "...",
  "repo": "...",
  "git_dir": "...",
  "build_target": "...",
  "device_serial": "...",
  "current_phase": 6,
  "current_phase_name": "device-functional",
  "control_protocol_version": 1,
  "logical_phase_id": "device_functional",
  "logical_phase_name": "device-functional",
  "action_kind": "consent",
  "control_refs": {
    "next_action": "controls/next_action.json",
    "memory_card": "controls/memory_cards/current.json",
    "receipt": "controls/receipts/phase6.json",
    "handoff_in": "controls/handoffs/current.json",
    "handoff_out": "controls/handoffs/phase6-next.json"
  },
  "current_substate": "awaiting_consent",
  "legacy_mode": false,
  "window_startup_order": {
    "control_protocol_version": 1,
    "authority_note": "reading order is navigation only; pass authority stays with signed manifest + advance.py",
    "steps": [
      {"order": 1, "artifact": "phase_memory_card", "ref": "controls/memory_cards/current.json", "optional": false}
    ],
    "forbidden_starts": ["read_global_readme_first", "replay_full_chat_history_first"]
  },
  "last_failure": {
    "phase": 5,
    "gate": "gate_test_ut.py",
    "reason": "tests=5 failures=1 errors=0 ...",
    "ts_utc": "2026-07-23T10:00:00Z",
    "entry_id": "..."
  },
  "resume_hint": "Inspect the real artifacts, record signed human consent, then rerun advance.py advance.",
  "next_gate": "advance.py consent --phase 6 --token <reviewer>",
  "required_inputs": ["reviewer_token"],
  "phases": [
    {
      "id": 6,
      "name": "device-functional",
      "status": "pending",
      "manifest_ref": null,
      "closed_at_utc": null,
      "consent_required": true,
      "has_phase_summary": true,
      "has_failure_report": false
    }
  ]
}
```

其中：

- `last_failure` 来自 manifest 中最近一条签名 FAIL 记录；它不是 `failure_report.json` 的拷贝。
- `has_phase_summary` / `has_failure_report` 只是文件存在性提示。
- `window_startup_order`（§15）给出新窗口的**强制读取顺序**（memory card 优先，evidence 最后）与禁止的起手动作；由 `gatelib.window_startup_order()` 生成，也镜像进 memory card 与 `next_action.json`。它只是导航顺序，不改变放行判定。
- phase 真正是否可推进，仍由 `validate_closing_entry()` 重新校验签名账本 + artifact sha256 + consent 绑定。

## `next_action.json`

`advance.py next` 会把当前导航状态同时落盘到：

- 根路径 `next_action.json`（兼容旧消费方）
- `controls/next_action.json`（控制层正式镜像）

两者必须来自同一个 payload；弱模型优先消费 `controls/next_action.json`，但两者都不是放行真相源。

字段基本等同于 `_derive_next_action()` 的返回：

```json
{
  "run_id": "...",
  "pipeline_dir": "...",
  "current_phase": 7,
  "current_phase_name": "quality-verify",
  "legacy_mode": false,
  "last_failure": null,
  "phase_summary": { "phase": 7, "gate": "gate_integration.py", "verdict": "PASS", "ok": true },
  "failure_report": null,
  "current_substate": "awaiting_consent",
  "next_gate": "advance.py consent --phase 7 --token <reviewer>",
  "required_inputs": ["reviewer_token"],
  "resume_hint": "Inspect the real artifacts, record signed human consent, then rerun advance.py advance.",
  "control_protocol_version": 1,
  "logical_phase_id": "quality_verify",
  "logical_phase_name": "quality-verify",
  "action_kind": "consent",
  "control_refs": {
    "next_action": "controls/next_action.json",
    "memory_card": "controls/memory_cards/current.json",
    "receipt": "controls/receipts/phase7.json",
    "handoff_in": "controls/handoffs/current.json",
    "handoff_out": "controls/handoffs/phase7-next.json"
  },
  "generated_at_utc": "2026-07-23T10:00:00Z"
}
```

注意：

- `phase_summary` / `failure_report` 是把当前 phase 的 JSON 摘要内联进来，便于弱模型单次读取。
- `logical_phase_*` / `action_kind` / `control_refs` 表达弱模型优先消费的控制层视图(物理与逻辑 1:1)。
- `window_startup_order` 与 status 输出同源，供新窗口按固定顺序恢复。
- `control_refs.receipt` 落到当前物理阶段对应的 `phaseN.json`。
- 它们都不是签名对象；真正推进前 `advance.py` 仍回到账本重新验签。

## phase summary / failure report 约定

每个 gate 在 `evidence/phaseN/` 下最佳努力输出：

- `phase_summary.json`

```json
{
  "phase": 6,
  "gate": "gate_device_func.py",
  "verdict": "FAIL",
  "reason": "...",
  "checks": ["trigger_window=True", "process provenance=False"],
  "ok": false,
  "failure_class": "process_provenance_mismatch"
}
```

- `failure_report.json`

```json
{
  "phase": 6,
  "gate": "gate_device_func.py",
  "reason": "...",
  "problems": ["marker emitted by non-target process"],
  "resume_hint": "修复后重跑 gate_device_func.py",
  "failure_class": "process_provenance_mismatch"
}
```

约束：

- `phase_summary.json` 在 PASS / FAIL 都可写；PASS 时应清理陈旧的 `failure_report.json`。
- `failure_report.json` 只在 FAIL/blocked 场景写，且是 best-effort；写失败不能改变 gate verdict。
- `failure_class` / 额外字段按 phase 自由扩展，但必须保持“导航信息而非真相源”的定位。

## 指纹与 legacy 兼容

- `code_fingerprint`：旧全量指纹，保留给 legacy run。
- `functional_fingerprint`：**P2(feature-develop)闭合时锁定**的非测试路径内容指纹；P3–P8 推进前必须保持一致(`check_code_drift` 从 phase3 起生效)。
- `locked_all_paths`：**P2 闭合时锁定**的全量变更路径基线；P3/P5/P6/P7 只能新增独立测试路径。
- `legacy_mode=true` 的典型来源：
  - manifest reason 中出现 `LEGACY-BYPASS`
  - 进入 P2+ 后找不到签名设计 entry(设计条目在 phase1)

## consent_tokens

`consent_tokens` 记录签名且绑定证据的人工审批：

- `consent_tokens["1"]`：P1 设计固化后的人工审批，`gate_develop.py`(P2) 强制校验(绑 phase1 设计条目)
- `consent_tokens["6"|"7"|"8"]`：P6/P7/P8 的结果审核审批，`advance.py advance` 强制校验

旧 consent 只对**当时那条 PASS 证据**有效；重跑 gate 产生新的 PASS 记录后，旧 consent 自动失效。
