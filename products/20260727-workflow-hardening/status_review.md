# Workflow 全面盘点 & 弱模型迁移置信度复核 (2026-07-27)

对照 `solution_design.md`(S1–S5 / H1–H6) 与 `remaining_tasks.md`(A–E),
逐条核实**当前工作区代码**(含未提交改动)实际落地情况。三套 unittest 全绿:
`ohos-ar-dev-phases 298` + `code-ruleset-style-check 19` + `ohos-dev-gitcode-pr-review 10` = **327 全过**。
(注:pr-review 套件此前文档误记为 19,实际 4;补 D1/D2 直测后 10。总数由"334"更正为 327。)

> 说明:规则覆盖 / 敏感词相关任务(原 C1/C4/C5)已按用户要求从盘点移除,不再计入剩余项。

---

## 一、已落地(对照计划核实,带 file:line)

### 控制层 A 组 / S1–S5 —— 基本全部完成
- **S1** 熔断改用 revision-无关 `fallback_key`:`gatelib.py:1088 / 1131-1175`。A1 死循环 bug 已修
  (空 `bundle_revision_from` 不再每次重置计数),有专项测试 `test_control_protocol.py:628-645`。
- **S2** 统一 `finalize_control()`(`gatelib.py:1484`),P1/P2/P3 FAIL 都产 repair packet + 熔断:
  `gate_design.py:370` / `gate_develop.py:513` / `gate_test_develop.py:338`。
  `advance.py._derive_next_action` 给 cur==1/2/3 补了 escalation/awaiting_repair 分支(`:757-815`)。
- **S3** 结构化 `suspect_locations[]`:build 编译行 / gtest xml / ci-codecheck / findings-json 四种回填齐全
  (`gatelib.py:1324-1481`,各 gate 已接)。`gate_device_func` 有意留空(真机证据无 file:line 定位)。
- **S4** action_class 收敛为单一 enum + schema/validator fail-closed(`gatelib.py:1281/1302`,
  `phase_memory_card.schema.json:19-31`);复合 token 已消除。A6/A8 残留已补(见下)。
- **A6/A8** `inspect` 兜底强制具体 `next_command`(`advance.py:865-895`,与 `blocked` 一致,永不死胡同);
  `gate_design.py:79,91` report-index `phase_name` 已改 `design-orchestrate`。已核实。
- **B4** `bundle.json` 必填键校验(`file_hygiene_guard.py:204 _bundle_required_keys_finding`),
  不只是 JSON 合法性。
- **S5** `ControlContractError`(`gatelib.py:1269`)自域 fail-closed,已接入并测试
  (`test_s3_s4_control_hardening.py:232`)。

### 文件卫生 B 组 / H1–H6 —— 全部实现且**已真接线**
- 新增 `code-ruleset-style-check/scripts/file_hygiene_guard.py` 实现:
  - H1 license/版权头(`_license_finding`)
  - H2 字节卫生 UTF-8/CRLF/尾空白/末尾换行(`_byte_findings`)
  - H3 JSON 合法性(`_json_finding`)
  - H4 敏感词扩到全文本文件(`_sensitive_findings`,复用 `data/ruleset_c.json`)
  - H5 GN 引用一致性(`_gn_findings`)
- **关键:blocking + fail-closed 接线**:P2 `gate_develop.py:413`、P3 `gate_test_develop.py:225`;
  guard 缺失即 BLOCKER(不静默放行)。
- H6:P8 把 CI codecheck defect 类回填进 `suspect_locations`(`gate_upload_ci.py:936`)。

### 测试 / PR 验证 C / D
- **C2** ✅ `test_phase1_test_develop.py:342 test_p3_disabled_api_in_test_fails_rules_only`
  (P3 测试文件含禁用 API → FAIL,锁 Fix-1 P3 接线)。
- **C3** ✅ `test_init_hiview_default.py`(裸 `init` 落 hiview 默认 + 打印 NOTE;指定组件时无 NOTE)。
- **D1** ✅ 评论超限显式标注 `comment_truncation`(`collect_pr_context.py:304-330`)。
- **D2** ✅ resolved/unresolved/unknown 统计(`collect_pr_context.py:217-327`)。

---

## 二、还没做完 / 薄弱点(按优先级 & ROI)

| 项 | 状态 | 说明 | effort |
|---|---|---|---|
| **B6** commit-message 格式 | ✅ 已做 | `validate_commit_message()` fail-closed 拦占位符/空/过短/过长主题于 push 前(`commit_message_invalid`→`push_pr`),消除 `title or "P6 upload"` 静默兜底 | 低 |
| **E1** 外部不稳退避 | ✅ 已做 | `_query_ci_with_backoff`(`gate_upload_ci.py:186`)对仅传输层失败做有界指数退避,遇任意 CI 判定即停(不把红 CI 重试成绿);retry 循环已补直测 | 中 |
| **E2** 真机/CI 成熟度 | 硬上限 | 模型 patch 质量、真机观测稳定性、CI 语义检查——本仓不可完全兜底 | — |

> 规则覆盖 / 敏感词相关任务(原 C1/C4/C5)已按用户要求移除,不再计入。

**结论**:B6/E1 打磨项已补齐,仅剩 E2 外部成熟度硬上限(非脚本可补)。

---

## 三、迁移到弱模型的置信度:**~89%**

计划基线 82%;本批 A 组全落地 + B 组全落地 + C2/C3/D + B6/E1 打磨项完成,达计划预期的"88%+"区间上沿。

拆解:
- **主链路协议**(签名/HMAC/指纹/consent 真相层)+ **控制层 fail-closed 导航**:已扎实。
  弱模型两类最痛失败——**降级 run 死循环**、**license/文件卫生 push 后才炸**——已收敛。
- B6(占位符 commit 主题于 push 前拦截)+ E1(仅传输层退避、绝不误伤真红 CI)已补齐,
  两处打磨闭合;精度与可回归性上抬,置信度落到 ~89%。
- 扣掉的 ~11% 几乎全在 **E2 硬上限**(真机功能观测、CI 语义检查、模型自身 patch 质量,
  非本仓可完全兜底),是天花板,不是再写脚本能补的。

**一句话**:协议侧该做的基本做完,弱模型可在受门控保护下自治推进到"上库前";
剩余风险集中在真机/CI 外部环节,属工程成熟度而非协议缺口。
