# 门控契约(gate-contract)

所有 `gate_*.py` 遵守同一契约,`advance.py` 据此判定推进。

## 调用约定

- 统一参数 `--pipeline-dir <PDIR>`(或环境变量 `PIPELINE_DIR`)。
- 其余参数见各脚本 `--help`。
- 退出码:PASS → 0;FAIL → 非 0。但**退出码不是真相**——真相是脚本追加到
  `evidence/manifest.jsonl` 的签名记录的 `verdict`。

## 每个门控必须做的事

1. 真正执行该阶段的真实动作(跑 build.sh / developer_test / hdc / oh-gc 等)。
2. 把真实产物落到 `evidence/phaseN/`(日志、xml、hilog、patch……)。
3. 调 `gatelib.emit(pdir, phase, gate, verdict=..., reason=..., artifacts_rel=[...])`:
   - verdict 完全由脚本解析证据算出,**不接受调用方传入 verdict**;
   - emit 会对每个 artifact 计算 sha256,连同 cmd/exit_code/nonce 一起 HMAC 签名后追加。

## P1 双子门控(设计固化 + 代码开发)

P1 由两个都 emit 到 phase 1 的子门控组成,顺序固定:

1. **`gate_design.py`(P1a)**:确定性校验 `AR_design.md` 的 6 个必含章节(标题存在 + body 非空;
   "完整代码框架"下须含 文件清单/每文件功能/代码框架 三锚点),把它拷进 `evidence/phase1/AR_design.md`
   并 HMAC 签名。缺章节/空 body → FAIL。
2. **`gate_develop.py`(P1b)**:**强制前置**存在**未被篡改**的签名 AR_design 证据(`latest_design_entry`
   + HMAC/sha256 校验),否则 FAIL；legacy run 可 `--allow-missing-design`(signed reason 标
   `DESIGN-GATE-LEGACY-BYPASS`)。

P1 闭合(`advance --phase 1`)时锁定**功能指纹** `functional_fingerprint`(仅非测试路径内容)+
`locked_all_paths`(全量路径基线);`code_fingerprint`(全量)保留供 legacy 兼容。

## advance.py 推进 N→N+1 的充要条件

- `phase==current_phase`(顺序,不可跳);
- **manifest 哈希链完整**:每条记录带 `seq`+`prev`(上一条 hmac)并纳入签名,`verify_chain` 校验全链
  连续——重放一条历史合法 PASS 记录会因 `seq`/`prev` 对不上而被拒;
- 该阶段最后一条 manifest 记录 `verdict=="PASS"`;
- HMAC 用 per-run 密钥校验通过(防伪造/篡改);
- 记录里每个 artifact 文件存在且当前 sha256 与记录一致(防事后替换);
- (P4 真机 / P5 质量与 code review 报告 / P6 上库)**签名且绑定证据的 consent**:consent 记录带
  `evidence_ref`(该阶段当前 PASS 记录的 entry_id)+ HMAC,`verify_consent` 要求签名有效且 evidence_ref
  匹配当前证据——凭空盖章、重跑门控后旧 consent 复用都会失效,否则 `advance` HOLD。
- (P2–P6)**功能指纹未漂移**:当前非测试路径内容的 sha256 必须等于 P1 锁定的 `functional_fingerprint`
  (相对 `base_commit`,commit 无关，故 P6 的 `git commit -s` 不算漂移);**(P3/P4/P5)只增独立测试**:
  相对 `locked_all_paths` 新出现的路径必须都是测试路径(`test/`/`unittest/`/`*Test.cpp` 等,含 test 目录
  下 BUILD.gn),出现非测试新增路径即拒绝。改功能内容/新增功能文件 → 要求 `advance.py reset` 回 P1。
  (旧 run 无 `functional_fingerprint` 时回退到全量 `code_fingerprint` 旧行为。)
- (P5 / P6)code review 报告零问题:report 必须携带**机器可读的问题计数**(JSON `issue_count/finding_count/problem_count/blocker_count==0` 或 `issues/findings/problems/blockers` 空数组,或文本 `review_issue_count=0`;**所有出现的计数键任一非零即 FAIL**)。报告可由模型/技能产出,但 gate 只在计数为 0 时放行;无计数/非零/缺失一律 FAIL(不认自由文本)。P6 需 **A 本地自检报告**(commit 前硬控)与 **B PR review 报告**(建 PR 后、CI 校验前硬控)两份;任一非零即 FAIL,修复须改代码后 `advance.py reset` 回 P1。

任一不满足 → `advance.py` 非 0 退出、不改状态。

## 唯一写状态者

`pipeline.json` 的 `phases[].status` / `current_phase` 只由 `advance.py` 写。
门控脚本只读状态拿配置(build_target/test.part 等),只写 `evidence/` 与 manifest。
