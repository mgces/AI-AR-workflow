# 防伪协议(evidence-protocol)

目标：让“阶段通过”无法被自由文本伪造，并且让主机 / 真机 / 上库证据都能在弱模型场景下通过结构化导航文件恢复，但**只有签名 manifest 能真正放行**。

## 1. 签名账本（唯一真相源）

- `evidence/manifest.jsonl` 每行一条门控记录：

```json
{
  "ts_utc": "...",
  "seq": 12,
  "prev": "<上一条 hmac>",
  "phase": 6,
  "gate": "gate_device_func.py",
  "cmd": "...",
  "argv": ["..."],
  "exit_code": 0,
  "nonce": "...",
  "artifacts": [{"path": "evidence/phase6/hilog_capture.txt", "sha256": "..."}],
  "verdict": "PASS",
  "reason": "...",
  "hmac": "..."
}
```

- `hmac = HMAC-SHA256(per-run secret, canonical-json(record_without_hmac))`
- per-run secret 在 `.lifecycle-secret/<run_id>`，不放进 pipeline 目录。
- `seq + prev` 一并签名，形成哈希链：
  - 篡改任一字段 / artifact → HMAC 或 sha256 不符
  - 把历史 PASS 记录复制到末尾 → `seq/prev` 对不上，`verify_chain()` 失败
- `advance.py` / `verify-all` 永远先验 manifest，再决定是否可推进。

## 2. 导航层 JSON（非真相源）

每个 phase 现在都会尽量写：

- `evidence/phaseN/phase_summary.json`
- `evidence/phaseN/failure_report.json`（失败/阻塞时）

并在 run 根目录 / 控制层写：

- `next_action.json`（兼容根路径）
- `controls/next_action.json`（控制层正式镜像）
- `controls/memory_cards/current.json`（advance.py 投影）与 `controls/memory_cards/phase<N>.json`（各 gate 写）
- `controls/receipts/*.json`
- `controls/handoffs/*.json`
- `controls/repairs/current.json`（repair packet；PASS 时置 `active=false`）
- 各 logical phase 目录下的 entry / receipt / handoff / index（见 pipeline-schema.md 的 `controls/` 布局）
- `todo.json`

这些文件的作用：

- 让弱模型 / 恢复流程快速获得“当前卡在哪、下一步是什么、最近失败是什么”；
- 让 `advance.py status --json` / `advance.py next` / `refresh_todo.py` 可以直接聚合展示；
- 把物理 phase 表达成 machine-readable 的 logical phase / action / handoff / receipt 视图(物理与逻辑 1:1)。

### 2.1 packet schema 与校验（依赖可选）

控制层的 5 类 packet 加 index 各有一份 draft-07 JSON Schema，位于
`skills/ohos-ar-dev-phases/scripts/schemas/`：

| kind | schema |
| --- | --- |
| `repair_packet` | `repair_packet.schema.json` |
| `completion_receipt` | `completion_receipt.schema.json` |
| `handoff_packet` | `handoff_packet.schema.json` |
| `phase_memory_card` | `phase_memory_card.schema.json` |
| `substate` | `substate.schema.json` |
| `index` | `index.schema.json` |

写入统一走 `gatelib` 的 typed helper（`write_repair_packet` /
`write_completion_receipt` / `write_handoff_packet` / `write_phase_memory_card` /
`write_substate_snapshot` / `write_control_index` 等），它们会：

1. 补齐 `control_protocol_version`；
2. 调 `validate_control_payload(kind, payload)` 做**建议性**校验；
3. 无论校验结果如何都照常写盘。

`validate_control_payload()` **依赖可选**：能 `import jsonschema` 就用它，
否则退化为内置的 required-keys + 顶层类型检查（返回值里的 `validated_by`
会标明是 `jsonschema` / `structural` / `none`）。这样控制层可以搬到没有
第三方依赖的弱模型运行环境。

校验失败**只是建议**，绝不改变任何 gate 的 verdict——它不是放行条件。

它们**不能**单独作为通过依据，原因：

- 没有 HMAC 账本签名约束；
- 允许 best-effort 写入，写失败不能反向影响真实 gate verdict；
- schema 校验不通过同样不影响 verdict（仅作为导航质量提示）；
- `advance.py` 推进前仍会回到 manifest 重新验签、验 artifact sha256、验 consent 绑定。

## 3. 主机侧新鲜度锚(P1 / P2 / P3 / P4 / P5 / P7)

### P1(设计固化)

- 设计固化依赖签名 `AR_design.md` 副本,而不是工作树草稿。

### P2(代码开发)

- 依赖 `base_commit`;**P2 闭合(`advance --phase 2`)时锁定** `functional_fingerprint`、`locked_all_paths`:
  - 改功能代码/配置 → 后续 phase 一律拒绝,要求 `reset` 回 P1(`check_code_drift` 从 phase3 起生效)
  - P3/P5/P6/P7 只能新增独立测试路径

### P3(测试开发,★Finding 1)

- 依赖 phase-2 冻结快照:自冻结以来只允许新增测试文件;
- 额外硬门控:签名 contract 的 `test_cases[].gtest` 的 suite 必须逐个在**新测试文件**中出现(**编写**覆盖,非执行);
- 新测试源快照落 `evidence/phase3/authored/` 并作为签名 artifact。

相关摘要:`new_test_files` / `missing_suites` / `contract_status` / `failure_class`。

### P4(编译)

- 直接捕获本次 `build.sh` 的 stdout 作为权威 fresh build 证据;
- 通过条件:`rc==0` + success banner present + error banner absent;
- 额外硬门控:签名 contract 的 `build_artifacts[]` 必须全部产出。

相关导航摘要:

- `phase_summary.json.success_banner_seen`
- `phase_summary.json.error_banner_seen`
- `phase_summary.json.contract_status`
- `phase_summary.json.build_artifacts_missing`
- `failure_report.json.failure_class`

### P5(单测执行)

- 运行前后对 `developer_test/reports/20*` 做集合差,要求出现 **fresh** 报告目录;
- 解析 `summary_report.xml` 的 `tests/failures/errors`;
- 额外硬门控:签名 contract 的 `test_cases[].gtest` 必须逐个在 fresh result xml 中以 passed 形式出现(**执行**覆盖)。

相关摘要:

- `fresh_report_dir`
- `missing_gtests`
- `contract_status`
- `failure_class`

### P7(功能与质量验证)

- 同样要求 fresh integration report;
- 功能 suite 必须通过;
- quality reports(coverage/performance/power/stability)必须齐全,除非显式 downgrade;
- review 报告必须 machine-readable zero issues。

相关摘要:

- `quality_ok` / `quality_detail`
- `review_ok` / `review_detail`
- `quality_gate_downgraded`
- `failure_class`

## 4. 真机侧证据(P6 / 设备型 P7)

旧模型只靠 marker 命中容易被伪造;当前 P6 已升级为"四锚联合证明":

### 4.1 per-run nonce

- 主机生成随机 nonce；
- 注入 hilog fence：
  - `NONCE=<n> BASELINE_START`
  - `NONCE=<n> START`
  - `NONCE=<n> END`
- 场景脚本通过 `$GATE_NONCE` 使用同一个 nonce；
- 本次抓取文本必须包含本次 nonce，旧日志不能冒充。

### 4.2 `/proc/uptime` 单调锚

- 部署前 / 抓取后各采一次 `/proc/uptime`；
- 要求严格递增且 >0；
- 证明抓取发生在本次设备会话内，不依赖 RTC。

### 4.3 baseline / trigger 分窗

P6 不再对整份 hilog 做模糊匹配,而是切成:

- `hilog_baseline_window.txt`
- `hilog_trigger_window.txt`

`device_cases[].absent_before_trigger=true` 时：

- marker 在 baseline window 出现即 FAIL；
- 这把“本次触发前就存在的旧行为”排除掉了。

### 4.4 process provenance + artifact loaded + real side effect

对每个签名 `device_case`：

- 在 trigger window 里找 marker 命中行；
- 解析 PID；
- 校验该 PID 的进程与 `device_cases[].process` 一致；
- 校验 `/proc/<pid>/exe` 或 `/proc/<pid>/maps` 确实加载了 `artifact_loaded`；
- 执行 `side_effect`（当前最小支持 `shell_assert`）并记录 stdout/stderr/returncode/pass-fail。

结构化证据：

- `device_case_results.json`
  - 每个 case 单独记录 `marker_seen`、`marker_pid`、`process_match`、`artifact_loaded_verified`、`side_effect_ok`、`negative_control_ok`、`problems`
- `phase_summary.json`
  - 聚合级 `process_provenance_verified`、`artifact_loaded_verified`、`side_effect_verified`、`negative_control_verified`
- `failure_report.json`
  - `failure_class` 例子：
    - `marker_emitted_by_non_target_process`
    - `artifact_not_loaded_by_target_process`
    - `side_effect_assertion_failed`
    - `marker_present_before_trigger`

## 5. code review 证据(P7 / P8)

P7 和 P8 都要求 **machine-readable zero-issue** 报告:

- JSON 计数字段如 `issue_count/finding_count/problem_count/blocker_count == 0`
- 或数组字段 `issues/findings/problems/blockers` 为空
- 或文本 `review_issue_count=0`

任何非零 / 缺失 / 不可解析都 fail closed。

P8 需要两道 review:

1. **local self-review**(commit/push 前)
2. **PR review**(PR 创建后、CI 检查前)

相关导航信息会体现在 P8 `phase_summary.json` / `failure_report.json`:

- `local_review_detail`
- `pr_review_detail`
- `failure_class=review_gate_failed`

## 6. 上库与 CI 证据(P8)

P8 的真实不可逆动作是 push + create PR。

### DRY RUN

无 `--allow-push` 时：

- 只写 full diff / stat 和导航性 FAIL 摘要；
- `failure_class=dry_run_no_pass`；
- 明确表示“计划已准备，但未执行外部动作”。

### 真正 PASS 的条件

- P1–P7 已 advance 完毕;
- phase 8 consent 已记录;
- review 双门都为零问题;
- PR 存在;
- CI overall 是 success;
- 远端 PR head SHA == 本次 pushed SHA。

这最后一条是关键：

- 防止“旧 commit 的绿色 CI”冒充当前提交；
- 若 PR head SHA 不可读 / 不匹配，则 fail closed。

相关摘要字段：

- `repo_slug`
- `branch`
- `pr`
- `ci_overall`
- `ci_ok`
- `pushed_sha`
- `pr_head_sha`
- `sha_ok`
- `mode`
- `failure_class`

## 7. consent 绑定(P1 / P6 / P7 / P8)

consent 不是普通字符串标记,而是 `advance.py` 写入的、绑定到某条 PASS 证据 entry 的签名对象:

- P1:设计人工批准,供 **P2 `gate_develop.py`** 校验(绑 phase1 设计条目)
- P6/P7/P8:结果人工批准,供 `advance.py advance` 校验

性质：

- 没有当前 PASS 证据时不能盖章；
- 重跑 gate 产生新 PASS 后，旧 consent 自动失效；
- 手改 `pipeline.json` 中的 consent 内容会破坏其 HMAC。

## 8. 弱模型恢复路径（强制窗口启动顺序）

每个新窗口必须按此固定顺序读取（与 §15 窗口启动顺序一致，由
`gatelib.window_startup_order()` 生成，落入 memory card 的
`window_startup_order` 字段并镜像进 `next_action.json`）：

1. `controls/memory_cards/current.json`（phase memory card；它自身携带本顺序）
2. `advance.py status --json`
3. 当前 logical phase 的 `Stage Packet`（`controls/packets/<logical_phase_id>.json`）
4. 最新 `Handoff Packet` 或 `Repair Packet`
5. 当前阶段 `completion_receipt.json`（若存在）
6. 当前阶段 `failure_report.json` / `phase_summary.json`（若存在）
7. 当前阶段必要 evidence

禁止的启动顺序：先读全局 README、先读大段日志、先读后续阶段 packet、先回看整条历史对话。

但执行推进前必须回到 truth layer：

1. `validate_closing_entry()` 验 manifest / artifact
2. `verify_consent()` 验 consent 绑定
3. 指纹 / 路径漂移检查

这样既有可恢复的结构化控制层，又不会把 JSON 摘要变成第二真相源——放行权仍只来自
signed manifest + artifact sha + consent + `advance.py`。
