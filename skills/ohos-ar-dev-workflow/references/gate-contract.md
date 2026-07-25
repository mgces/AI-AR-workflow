# 门控契约(gate-contract)

所有 `gate_*.py` 遵守同一契约，`advance.py` 只据**签名 manifest + artifact sha256 + consent 绑定**推进，绝不因为某个 JSON 摘要文件存在就放行。

## 调用约定

- 统一参数 `--pipeline-dir <PDIR>`（或环境变量 `PIPELINE_DIR`）。
- 其余参数见各脚本 `--help`。
- 退出码：PASS → 0；FAIL/BLOCKED → 非 0。但**退出码不是真相**——真相是 `evidence/manifest.jsonl` 的签名记录。

## 每个 gate 必须做的事

1. 真正执行该阶段的真实动作（跑 `build.sh` / `developer_test` / `hdc` / `oh-gc` 等）。
2. 把真实产物落到 `evidence/phaseN/`。
3. 调 `gatelib.emit(...)` 追加签名记录：
   - `verdict` 只能由脚本解析真实证据得出；
   - `emit` 会对 artifacts 计算 sha256，连同 `cmd` / `exit_code` / `nonce` 等一起 HMAC 签名。
4. 最佳努力写导航层摘要：
   - `evidence/phaseN/phase_summary.json`
   - `evidence/phaseN/failure_report.json`（FAIL/blocked 时）

## phase_summary / failure_report 的定位

它们是给 `advance.py status --json`、`advance.py next`、`refresh_todo.py` 和弱模型看的**导航层**，不是第二真相源：

- `phase_summary.json`
  - PASS / FAIL 都可以写
  - 常见字段：`phase`、`gate`、`verdict`、`reason`、`checks`、`ok`
  - 可扩展附加字段，如 `failure_class`、`tests`、`contract_status`
- `failure_report.json`
  - 只在 FAIL/blocked 场景写
  - 常见字段：`phase`、`gate`、`reason`、`problems`、`resume_hint`
- PASS 时应调用 `clear_failure_report()` 清理陈旧失败报告。
- 两者都必须 best-effort：写失败不能改变 gate verdict。

## P1 双子门控（设计固化 + 代码开发）

P1 有两个都写入 **phase 1** 的子 gate，中间夹一道人工 consent：

### 1) `gate_design.py`（P1a）

职责：

- 校验 `AR_design.md` 的必需章节；
- 拒绝 `TODO` / `TBD` / `占位` 等 placeholder；
- 解析唯一一个内嵌的 ````ar-contract` fenced JSON；
- 新 run 默认要求 **contract v2**；legacy 可显式放宽；
- 对 v2 做 requirement / file / test / device 的引用闭环校验；
- 把签名设计副本写入：
  - `evidence/phase1/AR_design.md`
  - `evidence/phase1/ar_contract.json`（有有效 contract 时）
  - `evidence/phase1/design_check.txt`
  - `evidence/phase1/phase_summary.json`
  - `evidence/phase1/failure_report.json`（失败时）

FAIL 条件示例：

- 缺章节 / 章节 body 为空
- placeholder 未清理
- contract 块缺失 / 多块 / 非法 JSON
- v2 引用闭环不成立
- 新 run 提供 v1 但未显式 `--allow-contract-v1`

### 2) P1 设计 consent（人工）

`gate_design.py` PASS 后，必须执行：

```bash
advance.py consent --phase 1 --token <reviewer>
```

此 consent 绑定到 **当前签名设计记录的 entry_id**。重跑 `gate_design.py` 后，旧 consent 自动失效。

### 3) `gate_develop.py`（P1b）

职责：

- 强制要求存在**未篡改**的签名设计证据；
- 强制要求存在绑定该设计 entry 的 P1 consent；
- 执行代码风格 / 严格校验；
- 校验 `changed_files` 与真实 touched files 的覆盖关系；
- 输出：
  - `evidence/phase1/changed_files_coverage.txt`
  - `phase_summary.json`
  - `failure_report.json`

下游 P2/P3/P4 只允许通过 `load_signed_contract()` 读取**签名设计字节**恢复 contract：

- `ok` → 做全量覆盖硬校验
- `absent` → legacy/bypass 路径，可跳过覆盖
- `tampered` / unrecoverable → fail closed

## P2 / P3 / P4 的 contract 覆盖硬门控

### P2 `gate_build.py`

P2 PASS 需要同时满足：

- `build.sh` 真正成功；
- fresh build 输出中出现 success banner 且没有 error banner；
- 签名 contract 的 `build_artifacts[]` **全部**确实被编译产出。

导航输出包含：

- `phase_summary.json`
  - `target`
  - `exit_code`
  - `success_banner_seen`
  - `error_banner_seen`
  - `contract_status`
  - `build_artifacts_missing`
  - `failure_class`
- `failure_report.json`
  - 典型 `failure_class`：
    - `ar_contract_unrecoverable`
    - `build_artifact_missing`
    - `build_verdict_failed`

证据文件示例：

- `build_stdout.log`
- `build_banner.txt`
- `artifact_check.txt`
- `error_distill.txt`（失败时）

### P3 `gate_test_ut.py`

P3 PASS 需要同时满足：

- 测试 target 真正 build 成功；
- 本次运行产生 fresh `developer_test/reports/<timestamp>/`；
- `summary_report.xml` 中 `tests>0 && failures==0 && errors==0`；
- contract `test_cases[].gtest` **每一个**都在 fresh result xml 中以 PASSED 形式出现。

导航输出包含：

- `test_target` / `suite` / `part`
- `tests` / `failures` / `errors`
- `fresh_report_dir`
- `contract_status`
- `missing_gtests`
- `failure_class`

典型 `failure_class`：

- `test_target_build_failed`
- `fresh_report_missing`
- `summary_report_missing`
- `ar_contract_unrecoverable`
- `gtest_coverage_missing`
- `unit_test_verdict_failed`

### P4 `gate_device_func.py`

P4 在旧有 `nonce + uptime + artifact sha + runtime/e2e marker + contract marker coverage` 基础上，叠加三层抗伪造证明：

1. **process provenance binding**
   - 从 trigger window 命中行解析 PID；
   - 校验该 PID 的进程与 `device_cases[].process` 一致。
2. **artifact loaded proof**
   - 校验 `/proc/<pid>/exe` 或 `/proc/<pid>/maps` 里确实加载了 `artifact_loaded`。
3. **real side-effect assertion**
   - 当前最小支持 `shell_assert`；记录命令/期望/stdout/stderr/rc/pass-fail。
4. **negative-control differential**
   - `BASELINE_START/START/END` 分窗；
   - `absent_before_trigger=true` 时，marker 触发前已出现直接 FAIL。

新增证据：

- `hilog_baseline_window.txt`
- `hilog_trigger_window.txt`
- `device_case_results.json`
- `phase_summary.json`
- `failure_report.json`
- `controls/device_functional/evidence_index.json`

#### 证据信任顺序（§17）

`phase_summary.json` 的 `evidence_priority` 与上面的 `evidence_index.json`
都会显式落下这个顺序（强 -> 弱），来源是 `gatelib.device_evidence_priority()`：

1. `process_provenance`
2. `artifact_loaded`
3. `side_effect`
4. `differential`
5. `runtime_e2e_marker`
6. `plain_marker`

含义：证据冲突时按此顺序取信。`plain_marker`（日志里出现过某字符串）是最弱的
主张，前四项合起来才能证明“目标进程真的加载了目标产物并产生了真实副作用”。
这个列表只是导航提示，判定仍由 gate 自身的硬校验与签名证据决定。

典型 `failure_class`：

- `marker_emitted_by_non_target_process`
- `process_provenance_mismatch`
- `artifact_not_loaded_by_target_process`
- `side_effect_assertion_failed`
- `marker_present_before_trigger`

## P5 `gate_integration.py`

P5 PASS 需要同时满足：

- integration / MST functional suite 真正通过；
- 所需质量报告（coverage / performance / power / stability）齐全，除非显式 `--allow-missing-quality-reports`；
- code review 报告零问题。

输出的导航摘要会包含：

- `testtype` / `part` / `suites`
- `tests` / `failures` / `errors`
- `fresh_report_dir`
- `quality_ok` / `quality_detail`
- `review_ok` / `review_detail`
- `quality_gate_downgraded`
- `failure_class`

典型 `failure_class`：

- `fresh_report_missing`
- `summary_report_missing`
- `integration_test_failed`
- `quality_reports_missing_or_invalid`
- `code_review_blocked`

## P6 `gate_upload_ci.py`

P6 是唯一对外不可逆阶段。PASS 需要同时满足：

- P1–P5 已全部 advance 成功；
- phase 6 consent 已记录；
- 本地 review 报告零问题（PR 创建路径上是硬门控）；
- PR review 报告零问题；
- 远端 PR 存在；
- CI overall 成功；
- 远端 PR head SHA 与本次 pushed SHA 一致。

DRY RUN（无 `--allow-push`）只产出导航性 FAIL/blocked 摘要，不产 PASS。

P6 摘要字段示例：

- `repo_slug`
- `branch`
- `pr`
- `ci_overall`
- `ci_ok`
- `pushed_sha`
- `pr_head_sha`
- `sha_ok`
- `local_review_detail`
- `pr_review_detail`
- `mode`（`precheck` / `dry_run` / `push` / `verify_pr`）
- `failure_class`

典型 `failure_class`：

- `prerequisite_phase_missing`
- `issue_binding_missing`
- `dry_run_no_pass`
- `consent_missing`
- `review_gate_failed`
- `ci_not_green`
- `pr_head_sha_mismatch`
- `pr_metadata_incomplete`

## `advance.py` 推进条件（摘要）

`advance.py advance --phase N` 的真正规则是：

- `phase == current_phase`
- manifest 哈希链完整
- 当前 phase 最后一条闭合记录是签名 PASS
- 所有 artifact 当前 sha256 与记录一致
- 需要 consent 的 phase，其 consent HMAC 有效且绑定当前 PASS entry
- P2–P6 功能指纹未漂移；P3/P4/P5 只允许新增独立测试路径

因此：

- 仅仅写一个 `phase_summary.json` 永远不能推进 phase
- 仅仅把 `pipeline.json` 改成 passed 也没用，`advance.py` 会重验账本并拒绝
