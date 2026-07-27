# 弱模型自治 — 剩余任务 & workflow 薄弱点全面盘点 (2026-07-27)

本文合并三个来源:
1. 本批次 `todo.md` 里未完成项(回归验证)
2. `../20260723-weak-model-optimization/confidence_assessment.md` §6 残余风险(~18% 缺口)
3. 本次两轮定向审计(**控制层薄弱点** + **CI 泄漏缺口**),均带 `file:line` 证据

> 说明:规则覆盖 / 敏感词相关任务(原 C1/C4/C5)已按用户要求从本盘点移除。

置信度现状:**~89%**(2026-07-27 复核,见同目录 `status_review.md`)。批次 A/B 全落地 + C2/C3/D
+ B6/E1 完成后,从计划基线 82% 抬到 ~89%。唯一剩余项 E2(真机/CI 外部成熟度)是硬上限,非脚本可补。

图例:`(P0)` 阻断级 · `(P1)` 高 · `(P2)` 中 · `(P3)` 低 / 打磨。effort 为粗估。
状态图例:✅ 已完成 · ⚠️ 部分完成 · ☐ 未做。逐条已对当前工作区代码核实(带 file:line)。

---

## A. 控制层 — 弱模型自恢复的结构性洞(审计二,最高优先)

真相层(签名/HMAC)完好;下面全是**控制层 best-effort** 的洞,专门坑弱模型的"失败后怎么办"。

### A1 `(P0)` ✅ 熔断器在 `bundle_revision` 为空时静默失效 → 可无限重试
> **已完成**(S1):`gatelib.py:1088/1131-1175` 引入 revision-无关 `fallback_key`,空 revision 也累积计数;测试 `test_control_protocol.py:628-645`。
- 证据:`lib/gatelib.py:1079-1096`(`repair_round_metadata`),`same_revision` 依赖 `bool(bundle_revision_from)`。
- 各 gate 传入 `bundle_revision_from = bundle.get("bundle_revision") or ""`(`gate_build.py:104` 等)。
- **legacy / bypass / 缺 `signed_test_scope.json` 的 run** → `bundle_revision=""` → `same_revision` 恒 `False` → 第 1094 行每次都把 `repair_rounds=1, retry_rounds=0` 硬重置 → 计数永不累积 → `human_escalation_needed` 永不触发。
- 后果:唯一防死循环的机制,恰好在弱模型最可能所处的降级 run 里是 no-op。
- 修:空 revision 时改用稳定回退键(如 `phase + failure_class + suspect 摘要哈希`)累积计数,而不是直接跳过熔断。effort: **中**。

### A2 `(P1)` ✅ P1/P2/P3 失败时**不产出 repair packet**,且**完全没有重试计数/熔断**
> **已完成**(S2):`finalize_control()`(`gatelib.py:1484`);FAIL 调用 `gate_design.py:370`/`gate_develop.py:513`/`gate_test_develop.py:338`;`advance.py:757-815` cur==1/2/3 补 escalation/awaiting_repair 分支。
- 证据:`gate_design.py:347-363`、`gate_develop.py:429-447`、`gate_test_develop.py:267-283` 失败仅写 `failure_report.json`+memory card,从不调 `write_repair_packet`。
- `advance.py:694-750`(`_derive_next_action` 的 `cur==1/2/3` 分支)没有 repair/escalation 分支;只有 `else`(`advance.py:751-783`)读 repair_packet。
- 后果:写设计/写代码/写测试——弱模型最容易反复失败的三个阶段——零重试预算、零结构化修复指引,substate 停在 `awaiting_develop_gate`+提示"修复后重跑",可无限循环。
- 修:给 P1/P2/P3 也产 repair packet + 接入 `repair_round_metadata` 熔断。effort: **中**。

### A3 `(P1)` ✅ repair packet 只给粗粒度 `suspect_files`,从不给 `file:line:rule`
> **已完成**(S3):`suspect_locations[]` 由 build 编译行/gtest xml/ci-codecheck/findings-json 四种回填(`gatelib.py:1324-1481`,各 gate 已接);`gate_device_func` 有意留空(真机证据无 file:line)。
- 证据:`gate_build.py:115-116`、`gate_integration.py:154-155`、`gate_test_ut.py:108-109`、`gate_device_func.py:155-156`、`gate_upload_ci.py:348-349`。
- `suspect_files` = 整个 `changed_files_under_test` + 所有 `depends_on_files`;`suspect_tests` = 所有 `expected_gtest`;真正的失败点只在自由文本 `problems[]`/日志里。
- 后果:弱模型被告知"这 N 个文件里有一个错了,去读日志",而不是"改 foo.cpp:42 违反规则 X"——正是弱模型自己推不出来的精度。
- 修:让 gate 把已解析出的结构化失败(如 code_ruleset 的 `--json` findings、build 报错行、gtest 失败断言)回填进 repair packet 的 `suspect_locations[]`。effort: **中-高**(需逐 gate 解析)。

### A4 `(P2)` ✅ 缺测试 bundle 时 `suspect_files/suspect_tests` 退化为 `[]`
> **已完成**(S2 兜底):`finalize_control` 在 suspect 为空且 bundle 缺失时回退到功能指纹 `changed_files`,再兜底占位,绝不写空列表。
- 证据:`gate_build.py:60-74`(标 `bundle_present`)但 `:115-116` 仍 `... or []`;`gate_integration.py:112-116` 连 `bundle_present` 都不算。
- 触发点正是 `advance.py:396-400` 警告的"跳过 `prepare_test_bundle.py`"弱模型捷径。
- 后果:repair packet 变成"出错了,零嫌疑对象",熔断 + 修复指引一起塌成空。
- 修:bundle 缺失时回退到 `changed_files`(功能指纹)作 suspect,而非空列表。effort: **低**。

### A5 `(P2)` ✅ `next_expected_action_class` 两套不一致词表 + 无 schema enum
> **已完成**(S4):`ACTION_CLASSES` 单一 enum(`gatelib.py:1281`),`action_class_for`(`:1302`)收敛复合 token;schema enum `phase_memory_card.schema.json:19-31`;validator fail-closed。
- 证据:`advance.py:457-474`(`complete|advance|consent|blocked|run_gate|inspect`)vs 各 gate 直接写的另一套(`advance_phase`、`repair_or_regenerate`、`prepare_test_bundle`、`repair_design`、`author_tests_or_repair`、`repair_environment` 等)。
- `phase_memory_card.schema.json` 把该字段声明为自由 `["string","null"]`,**无 enum**,无人对账。
- 歧义值:`repair_or_regenerate`(到底哪个?)、`author_tests_or_repair`(一个 token 两个动作);`inspect` 是 `advance.py:474` 的 catch-all 无具体动作。
- 后果:同字段因最后写者不同(gate card vs advance 全局 card,都落 `controls/memory_cards/`)含义漂移,弱模型无法据此确定唯一下一步。
- 修:统一成单一 enum 写进 schema,`validate_control_payload` 强校验;歧义值拆成单动作。effort: **中**。

### A6 `(P2)` ✅ `advance.py` 的 `blocked`/`inspect` 死胡同 token 已消除
> **已完成**:`blocked` 全部走 `_escalation_next_gate`;`inspect` 兜底(`advance.py:865-895`)在 `next_gate=None` 时强制经 `_inspect_fallback_command` 落具体命令 + resume hint(呈现 `evidence/phaseN` 日志给人工 + 重跑本阶段 gate),已做到与 `blocked` 一致的"永不死胡同"。

### A7 `(P3)` ✅ 全局 card 对 P1-P3 丢失结构化 `last_failure_class`
> **已完成**(随 A2/S2):P1-P3 有了 repair packet 即有 `failure_class`,`_memory_card_payload` 不再回退到 gate 名/原始 reason。
- 证据:`advance.py:551`(`_memory_card_payload`)`last_failure_class = repair_packet.failure_class or failure.gate or failure.reason`;P1-P3 无 repair packet(A2)→ 回退到 gate 名/原始 reason 串。窗口启动顺序(`gatelib.py:515`)让 `current.json` 成第 1 读,弱模型先读到的恰是降级值。
- 后果:随 A2 一并解决(有了 repair packet 就有 failure_class)。
- 好消息(已核实,无需动):所有 gate 在 PASS/FAIL 都无条件产 memory card,崩溃恢复能拿到卡片。

### A8 `(P3)` ✅ mislabel 全部修正
> **已完成**:card `phase_name` 与 handoff 已改 `design-orchestrate`(`gate_design.py:352/152/156`);未映射失败类走显式 `unknown_quality`/`unknown_upload`;`gate_design.py:79,91` 两个 report-index 也已改 `phase_name="design-orchestrate"`(此前残留)。已核实。

> 审计确认:控制层**无** TODO/FIXME/stub(唯一 `placeholder` 命中是设计文档占位符检测器,属预期功能)。

---

## B. CI 泄漏缺口 — author 时不拦、P8 才炸(审计一)

结构性根因:**所有 author 时检查都漏斗进 `code_ruleset_guard.py`,而它只认 C/C++(`EXTS`,`code_ruleset_guard.py:46,156`)+ 只查禁用 API/敏感词**。整类**文件卫生**检查 CI 会跑但本地无更早门,`gate_upload_ci.py:909` 又把它们全塌成一个不透明 `overall_result` → 弱模型首次得知已在**不可逆 push 之后**。

按"弱模型命中概率"排序:

### B1 `(P1)` ✅ License/版权头缺失或格式错 — 无任何本地门 — effort: **低**
> **已完成**(H1):`file_hygiene_guard.py _license_finding`;P2/P3 blocking 接线(`gate_develop.py:413`/`gate_test_develop.py:225`)。
- OpenHarmony 每个新 `.cpp/.h/.gn/.json` 都需 Apache-2.0 头;弱模型新建文件几乎必漏。CI 由 OAT + license codecheck 拦。
- guard 已经逐行读每个 C/C++ 文件(`code_ruleset_guard.py:113`),加一条头存在性正则 + 覆盖新增 `.gn/.json` 约 15 行。**性价比最高**。

### B2 `(P2)` ✅ BUILD.gn / GN 目标卫生 — 无本地门 — effort: **中**
> **已完成**(H5):`file_hygiene_guard.py _gn_findings` 校验 `sources`/`public` 条目指向的 C/C++ 文件存在。
- 新源文件/测试几乎都要改 BUILD.gn;模型常漏接 target、写错 `sources`。CI 由 build job + GN codecheck 拦;`.gn` 在 `code_ruleset_guard.py:156` / `gate_develop.py:135` 被丢弃。
- 最小检查:新 `.cpp` ⇒ 必被某 BUILD.gn 引用。

### B3 `(P2)` ✅ 换行/编码/行尾/尾空白/末尾换行 — 无本地门,且被主动隐藏 — effort: **低**
> **已完成**(H2):`file_hygiene_guard.py _byte_findings`(UTF-8/CRLF/尾空白/末尾换行)覆盖所有改动文本文件。
- 当前 `errors="replace"`(`gate_develop.py:154`、`gate_test_develop.py:113`)把编码错误**掩盖**了。OAT/codecheck 会拦。
- 加一个字节级检查覆盖所有改动文本文件。

### B4 `(P2)` ✅ bundle.json / 组件配置校验(JSON 合法 + 必填字段)
> **已完成**:`file_hygiene_guard.py _json_finding` 做 JSON 合法性(`json.load`),并对名为 `bundle.json` 的文件经 `_bundle_required_keys_finding`(`file_hygiene_guard.py:204`)校验组件必填键。此前残留的"必填键校验"已落地(完整 JSON Schema 仍可后续加,非阻断)。

### B5 `(P2)` ✅ 敏感词/禁用 API 在**非 C++ 文件**漏检 — effort: **低**
> **已完成**(H4):`file_hygiene_guard.py _sensitive_findings` 对全文本文件(.md/.gn/.ts/.json)跑敏感词,复用 `data/ruleset_c.json`。
- 敏感词扫描存在但被 `EXTS` 挡住(`code_ruleset_guard.py:124-131,156`),`.md/.json/.gn/.ts` 里的禁用品牌串直达 CI WordsTool。
- 扩一个 all-text 模式(或对文本类文件也跑敏感词)。

### B6 `(P3)` ✅ commit-message 格式 — effort: **低**
> **已完成**:`validate_commit_message()`(`gate_upload_ci.py`)对 commit 主题行做保守 fail-closed 校验——空/过短(<8)/过长(>100)/占位符(`P6 upload`/`wip`/`fix` 等闭集)一律 FAIL,`failure_class="commit_message_invalid"`(映射 `push_pr` substate),在 `commit_pending_changes` 里于**不可逆 push 之前**拦截。旧的 `title or "P6 upload"` 静默兜底已消除。仅拒绝退化占位符,真实描述性主题原样通过(语义质量仍归 PR/人工评审)。测试 `test_validate_commit_message_rejects_placeholders`。
> 另:H6(P8 CI defect 分类回填 `suspect_locations`)**已完成**——`gate_upload_ci.py:936`。

### B7 `(P3)` 测试文件不跑 clang-format(P3 故意 `--rules-only`)— 若 CI 对测试跑 format 则泄漏
- `gate_test_develop.py:72` 是**有意设计**(gtest 布局多变),优先级最低,仅记录。

---

## C. 回归验证(承接 todo.md)

> 规则覆盖 / 敏感词相关任务(原 C1/C4/C5)已按用户要求从盘点中移除。

### C2 `(P1)` ✅ 无"P3 测试文件含禁用 API 应 FAIL 门"的集成测试 — effort: **低**
> **已完成**:`test_phase1_test_develop.py:342 test_p3_disabled_api_in_test_fails_rules_only`(测试文件调禁用 API → 经 `--rules-only` FAIL P3),锁死 Fix-1 P3 接线。

### C3 `(P2)` ✅ 无"裸 `init`(不带组件 flag)应落 hiview 默认并打印 NOTE"的测试 — effort: **低**
> **已完成**:`test_init_hiview_default.py`(裸 init 落默认 + NOTE;指定组件时无 NOTE)。

---

## D. gitcode / PR review

### D1 `(P2)` ✅ PR 评论真超 100 条时分页/聚合 — effort: **低-中**
> **已完成**:超限时写 `comment_truncation` 并显式提示提高 `--comments-limit`(`collect_pr_context.py:304-330`),不再被读作"全部评论"。

### D2 `(P3)` ✅ 暴露评论 resolved/unresolved 状态(若 CLI 支持)— effort: **中**
> **已完成**:`comment_resolved()` 探测多种字段名 + resolved/unresolved/unknown 统计(`collect_pr_context.py:217-327`)。

---

## E. 外部链路(confidence_assessment §6,协议已尽,属工程调优)

### E1 `(P3)` ✅ `external_api_unstable` 退避重连 — effort: **中**
> **已完成**:`_query_ci_with_backoff(cmd, env, *, max_attempts, base_delay)`(`gate_upload_ci.py:186`)对**仅传输层失败**做有界指数退避(1→2→4…),遇到任意 CI 判定(exit 0,或 exit≠0 但有输出——含真红 CI)立即停止返回,绝不把红 CI 重试成绿(fail-closed 不变量保持)。flags `--ci-query-attempts`(默认 3)/`--ci-query-backoff`(默认 2.0),接线于 `:919-923`。此前只有 `_is_transport_failure` 与升级路径有测试,现补 `test_query_ci_with_backoff_retries_only_on_transport_failure` 直测重试循环。仍保留同 revision 反复不稳→人工升级(`EXTERNAL_INSTABILITY_CLASSES`)。

### E2 `—` P6 真机 / P7-P8 CI 端到端依赖外部成熟度 — **非本仓可完全兜底**(模型 patch 质量、真机观测稳定性)。记录为已知上限。

---

## 落地进度(2026-07-27 复核)

**已完成(批次 A/B + 验证 + 打磨)**:A1/A2/A3/A4/A5/A6/A7/A8(控制层全组)、B1/B2/B3/B4/B5/B6 + H6(文件卫生)、C2/C3(回归测试)、D1/D2(PR review)、E1(退避重连)。三套 unittest 全绿(298 + 19 + 10 = 327)。**82% → ~89%**。

> 注:规则覆盖 / 敏感词相关任务(原 C1/C4/C5)已按用户要求从盘点移除。
> 注:pr-review 套件此前文档记为 19,实际为 4;本批补 D1/D2 直测后为 10。总数从"334"更正为 327。

**剩余(按 ROI)**:
1. `☐ E2`(硬上限)P6 真机观测稳定性 + CI 语义检查 + 模型 patch 质量 — 非本仓可完全兜底。

预期收益:A 组 + B 组已让弱模型在**降级 run 死循环**与**license/文件卫生 push 后才炸**两类最痛失败上显著收敛;B6(占位符 commit 主题于 push 前拦截)+ E1(传输层退避,不误伤真红 CI)把打磨项也补齐,82% → ~89%。唯一剩余硬上限是真机/CI 外部成熟度(E2),非协议缺口。详见同目录 `status_review.md`。
