# 控制层加固 + author 时缺检 —— 解决方案设计 (2026-07-27)

关联:`remaining_tasks.md`(问题清单,带 file:line)。本文只写**解决方案**与**改动点清单**,供实施对照。

## 顶层原则(一句话)

把真相层已有的 **fail-closed 纪律**,分别延伸到两个至今仍会**静默降级**的地方:
1. **控制层导航产物**——不给弱模型放行权,但保证它产出的导航**永不为空/歧义/缺失**(自域 fail-closed)。
2. **author 时文件卫生**——把 CI 里**确定性、无误报**的检查,做成本地 blocking 镜像门,前移到 P2/P3。

## 不可动的不变量(硬约束,实施时逐条自检)

- **真相层不变**:PASS 权仍只在签名 manifest + `advance.py`。控制层任何改动**不得**成为 verdict 依据。
- **P8 兜底完整保留**(本次用户明确要求):
  - P8 的**人工 consent**(`advance.py consent --phase 8`)不变;
  - **CI 绿 + push SHA 绑定**(`gate_upload_ci.py` 读 `overall_result` + head-SHA 校验)不变;
  - **push 是唯一对外不可逆动作**不变;
  - `external_api_unstable`(传输层失败 vs 真红 CI 区分 → 升级人工)不变。
  - 解法二把**确定性**检查前移到 author 时,**不删除也不削弱** P8 及 CI 对语义/易抖检查的兜底——前移是"多一道早门",不是"搬走 CI"。
- **只增独立测试**指纹规则(`TEST_ONLY_PHASES`)不变;新增的 author 门产出的是 evidence 证据,不改功能指纹。

---

# 解法一:控制层 → 自域 fail-closed 的单一导航契约

现有基础(已核实,复用而非重写):
- `gatelib.write_repair_packet` / `write_gate_phase_memory_card` / `repair_round_metadata`(`gatelib.py:618/write_gate_phase_memory_card/1062`)已在;
- `validate_control_payload`(`gatelib.py:425`)已是 advisory;
- 各 gate 已在 PASS/FAIL 都产 memory card(审计确认,保留)。

缺的是:**统一收尾**、**revision-无关熔断**、**结构化 suspect**、**enum 强制**。

## S1 熔断计数改用 revision-无关稳定键(解 A1)

**改点**:`gatelib.repair_round_metadata`(`gatelib.py:1062-1123`)。

- 现状:`same_revision` 末项 `and bool(bundle_revision_from)`(`:1083`)使空 revision 时恒 `False`,每次硬重置计数。
- 方案:新增参数 `fallback_key`(默认 `None`)。当 `bundle_revision_from` 为空时,`same_revision` 改判 `prev.get("fallback_key") == fallback_key and bool(fallback_key)`;把 `fallback_key` 一并写进返回 dict 与 repair packet,供下一轮比对。
  ```python
  def repair_round_metadata(prev, *, phase, bundle_revision_from,
                            recommended_next_action, failure_class=None,
                            fallback_key=None,          # NEW
                            max_repair_rounds=2, max_retry_rounds=2):
      prev = prev or {}
      rev = bundle_revision_from
      if rev:
          same_revision = (... and prev.get("bundle_revision_from") == rev and bool(rev))
      else:                                             # NEW: revision-agnostic
          same_revision = (prev.get("active", True) is not False and
                           prev.get("phase") == phase and
                           prev.get("fallback_key") == fallback_key and
                           bool(fallback_key))
      ...
      return {..., "fallback_key": fallback_key}        # NEW field
  ```
- `fallback_key` 由调用方(各 gate 的 `_write_repair_packet`)算成:
  `sha1("|".join([str(phase), failure_class or "", *sorted(suspect_files), *sorted(suspect_tests)]))[:16]`。
  这样**任何 run(含 legacy/bypass/缺 bundle)都能累积计数、都能升级人工**,熔断不再是 no-op。
- schema:`repair_packet.schema.json` 加 `"fallback_key": {"type": ["string","null"]}`。
- 兼容:有 `bundle_revision` 的 run 行为**完全不变**(走原分支);仅空 revision 分支被激活。

## S2 统一收尾器 `finalize_control()`,让 P1/P2/P3 也产 repair packet 并接熔断(解 A2/A4/A7)

**改点**:新增 `gatelib.finalize_control(...)`;`gate_design.py` / `gate_develop.py` / `gate_test_develop.py` 的 FAIL 路径改调它;`advance.py:694-750`(P1/P2/P3 分支)增加读 repair packet 的 escalation/awaiting_repair 分支。

- 新接口(gatelib,标准收尾,PASS/FAIL 都过):
  ```python
  def finalize_control(pdir, *, phase, phase_name, verdict, failure_class=None,
                       suspect_files=None, suspect_tests=None,
                       problems=None, last_failure_reason=None,
                       recommended_next_action, downstream_scope=None,
                       bundle_revision_from="", prev_repair=None):
      """Single exit point every gate calls. Guarantees, on FAIL, that a
      repair packet AND a memory card with a non-empty enum failure_class and
      a concrete next action always exist. Raises ControlContractError if it
      cannot build a complete packet — the control layer fails closed on its
      OWN bug rather than shipping a degraded navigation artifact. NEVER
      authoritative over the signed manifest."""
  ```
  内部:算 `fallback_key`(见 S1)→ `repair_round_metadata` → `write_repair_packet` → `write_gate_phase_memory_card`。
  **suspect 退化兜底(解 A4)**:`suspect_files` 为空且 bundle 缺失时,回退到功能指纹 `changed_files`(经 `gl.collect_changed_files`/指纹快照),绝不写空列表;仍为空则回退到 `[failure_class]` 占位并在 `problems` 记一条 "suspects_unavailable"。
- **P1/P2/P3 FAIL 现在产 repair packet**(解 A2):三个 gate 的 FAIL 分支
  (`gate_design.py:347-363`、`gate_develop.py:429-447`、`gate_test_develop.py:267-283`)
  从"只写 failure_report + card"改为经 `finalize_control(...)`,failure_class 用各自已知类
  (设计:`ar_contract_*` / `design_sections_missing`;开发:`develop_gate_failed` / `code_ruleset_finding`;测试:`test_authoring_incomplete` / `test_style_finding`)。
- **advance.py 接入熔断**(解 A2):`_derive_next_action` 的 `cur==1/2/3` 分支,在 `validate_closing_entry` FAIL 后,**先读 repair packet**:若 `_repair_requires_escalation` → `substate="blocked"` + 具体 `next_command`;否则 `awaiting_repair` + `_repair_next_gate`。与 `else`(P4-P8)分支同构,复用现有 `_repair_*` helper。
- **全局 card failure_class(解 A7)**:`_memory_card_payload`(`advance.py:551`)现在 P1-P3 也能拿到 `repair_packet.failure_class`,不再回退到 gate 名/原始 reason。

## S3 repair packet 携带结构化 `suspect_locations[]`(解 A3)

**改点**:各 gate 的 `_write_repair_packet`(`gate_build.py:92`、`gate_integration.py`、`gate_test_ut.py`、`gate_device_func.py`、`gate_upload_ci.py`);schema。

- schema `repair_packet.schema.json` 新增:
  ```json
  "suspect_locations": {"type": "array", "items": {"type": "object",
    "properties": {"file":{"type":"string"}, "line":{"type":["integer","null"]},
      "rule":{"type":["string","null"]}, "message":{"type":["string","null"]}},
    "required": ["file"]}}
  ```
- 各 gate 把**已解析出的**结构化失败回填(不新增解析器,复用现成产物):
  - **code_ruleset**(P2/P3):guard 已能 `--json` 输出 findings(`code_ruleset_guard.py:163-169`),直接映射 `{file,line,rule,message}`。
  - **build**(P4):从 `build.log` 已解析的报错行(`gate_build.py` 现有解析)取 `{file,line}`。
  - **gtest**(P5):从 `summary_report.xml` 失败用例取 `{file(suite),message}`。
  - 拿不到精确定位时,`suspect_locations` 可空,但 `suspect_files`(S2 兜底)必非空——**不退化**。
- `suspect_files` 保留(向后兼容),`suspect_locations` 是叠加的精度层。

## S4 `next_expected_action_class` 收敛为单一 enum + schema 强校验(解 A5/A6/A8)

**改点**:`phase_memory_card.schema.json`、`repair_packet.schema.json`、`advance.py:457-474`、各 gate 直写处。

- 定义唯一 enum(写进两个 schema 的对应字段):
  ```
  ACTION_CLASSES = [
    "advance", "consent", "run_gate", "prepare_test_bundle",
    "repair", "regenerate", "retry", "human_escalation",
    "await_ci", "complete", "inspect"
  ]
  ```
  拆掉复合/歧义 token:
  - `author_tests_or_repair` → 依 substate 选 `run_gate`(还没写)或 `repair`(写了但没过);
  - `repair_or_regenerate` → 依 `classify_repair_vs_regenerate` 结果落 `repair` 或 `regenerate`;
  - `repair_design` / `repair_environment` → 统一 `repair`(具体动作走 `next_command`)。
- schema 从 advisory 升为**发射即校验**:在 `finalize_control` 内对 memory card + repair packet 调 `validate_control_payload`,`ok=False` 即 `raise ControlContractError`(控制层自域 fail-closed;**不影响 verdict**,只保证不发降级导航)。
- **死胡同修复(解 A6)**:`blocked`/`inspect` 必须带具体 `next_command`(字符串,如 "呈现 evidence/phaseN 日志给人工;修复后重跑 gate_X.py")。`_action_kind` 的 `inspect` 兜底改为:无法定级时也要给出"读 memory card + 呈现失败日志"的具体命令,`next_gate` 不再为 `None`。
- **mislabel 修复(解 A8)**:`gate_design.py:352` card `phase_name` 改 `"design-orchestrate"`;`:151/:155` handoff `from/to_phase_name` 修正;`advance.py:71-113` 的 `P7/P8_FAILURE_TO_SUBSTATE` 未映射类改落显式 `unknown_quality` / `unknown_upload` substate,而非默默落首 substate。

## S5 新增异常类型

`gatelib.ControlContractError(Exception)`:仅在 `finalize_control` 无法构造完整合规导航产物时抛出。这是**控制层自己的 bug 信号**,让它这次 run 失败暴露出来——与真相层 verdict 无关,不改变 PASS 判定语义(gate 本身的 FAIL 仍由签名 manifest 决定)。

---

# 解法二:author 时缺检 → CI 确定性检查的本地镜像门(P8 兜底不动)

新增 `skills/code-ruleset-style-check/scripts/file_hygiene_guard.py`,对**全部改动文件**(不再只 C/C++)跑**确定性**检查;P2/P3 blocking 接入,像现有 code_ruleset guard 一样 fail-closed。

## H1 license/版权头存在性(B1,最高性价比)
- 新增 `.c/.cc/.cpp/.h/.gn/.json` 必含 Apache-2.0 头正则块。现有 guard 已逐行读文件(`code_ruleset_guard.py:113`),约 15 行正则。

## H2 字节级卫生(B3)
- UTF-8 合法(**停用 `errors="replace"` 掩盖**,`gate_develop.py:154`/`gate_test_develop.py:113` 改为检测非法编码即 finding)、无 CRLF、无尾空白、有末尾换行。覆盖所有改动文本文件。

## H3 JSON 合法 + 必填键(B4)
- `bundle.json`/`*.json`:`json.load` + 必填键。完整 schema 可后续加。

## H4 敏感词扩到全文本文件(B5)
- 现有敏感词扫描被 `EXTS` 挡住(`code_ruleset_guard.py:124-131,156`)。新增 all-text 模式,对 `.md/.gn/.ts/.json` 也跑敏感词(复用 `data/ruleset_c.json`)。

## H5 GN 引用一致性(B2,中等,可二期)
- 新 `.cpp` ⇒ 必被某 BUILD.gn 引用。

## H6 P8 defect 分类回填(部分缓解不透明 `overall_result`)
- `gate_upload_ci.py` 把 CI `codeCheckSummary` defect 按类回填进 repair packet 的 `suspect_locations`,让 P8 失败报出**哪一类**。**P8 兜底逻辑本身不变**——这是"多报信息",不是改判定。

## 明确不做(避免误报/过度承诺)
- CI 非确定性检查(FossScan、语义静态分析、易抖 job)——**不镜像**,继续靠 P8/CI 兜底。
- 度量类 G.* 规则(圈复杂度/大函数/switch 分支数)——做正则会误报,留人工。
- P6 真机观测稳定性、模型 patch 质量——协议兜不住,记为剩余硬上限。

---

# 实施顺序 & 验证

**批次 1(堵死循环 + 结构完整,先做)**
1. S1 revision-无关熔断键(`gatelib.repair_round_metadata` + schema)
2. S5 `ControlContractError` + S2 `finalize_control`;P1/P2/P3 FAIL 接入;advance.py P1-P3 escalation 分支
3. H1 license 头(单点高收益)

**批次 2(精度 + enum)**
4. S3 `suspect_locations`(逐 gate 回填)
5. S4 enum 收敛 + schema 强校验 + 死胡同/mislabel 修复

**批次 3(文件卫生其余 + P8 分类)**
6. H2/H3/H4 字节卫生 / JSON / 全文本敏感词;H5 GN(可延后);H6 P8 defect 分类

**回归测试(每批次配套,补 `remaining_tasks.md` C1/C2/C3)**
- `code-ruleset-style-check/tests/`(当前**无**该目录):每条规则 + hygiene 检查一正一负 fixture;`data/ruleset_c.json` 缺失应 fail-closed。
- 控制层:空 `bundle_revision` 下连续 FAIL 应在 `max` 轮后 `human_escalation_needed=True`(锁 S1);P1/P2/P3 FAIL 应产 repair packet 且 memory card `last_failure_class` 非空且 ∈ enum(锁 S2/S4);P8 consent + CI-SHA 兜底路径**不回归**(专门断言 P8 行为不变)。
- 全量:`ohos-ar-dev-phases` / `ohos-ar-dev-workflow` / `ohos-dev-gitcode-pr-review` unittest 全绿。

**统一自检口径**:每批次结束跑三套 unittest;S 系列改动**不得**让任何真相层测试(签名/HMAC/指纹/consent)变红——变红即说明碰了不该碰的层,回退。
