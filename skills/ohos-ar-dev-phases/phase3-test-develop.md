# P3 测试开发(test-develop,物理 phase 3)

**设计核心卖点"先写完功能代码 + 测试代码,再正式编译"的真门控。**
物理 phase 3 夹在 feature-develop(phase 2)与 build-verify(phase 4)之间,闭合门
`gate_test_develop.py` 产**真签名记录** `emit(phase 3)`——`advance --phase 3` 只有在本门真的
跑过时才放行。它是测试**编写(authorship)**的真相层;测试**执行(execution)**留在 phase 5
(`gate_test_ut.py`)。分界刻意如此:

- **编写(本阶段)**:对签名 ar-contract 里每个 `test_cases[].gtest` "Suite.Case",要求存在一个
  **新测试文件**(phase-2 功能冻结之后新增)且其文本引用该 suite。证明测试在编译前已写,
  无需工具链去跑它。
- **执行(phase 5)**:同一批 gtest 必须在新产出的 result xml 里真的 PASS。

## ⚠️ 只增独立测试的硬约束(功能冻结)
phase 2 闭合已锁定功能指纹。本阶段起**只允许新增独立测试文件**(路径规则:`test/`、`unittest/`、
`moduletest/`、`fuzztest/` 目录,或 `*Test.cpp`/`test_*.cpp` 等命名;test 目录下的 BUILD.gn 也算测试)。
**任何自 phase-2 冻结以来新增的非测试路径都判违规**(复用 `prepare_test_bundle._verify_feature_freeze`);
改动被测组件功能代码/配置会被 `advance` 以功能指纹漂移拒绝,必须 `advance.py reset` 回 P1 重走。

## 做事(调用现有技能)
- 生成 OpenHarmony C/C++ 单测(HWTEST/HWTEST_F + `ohos_unittest` + BUILD.gn):`ohos-test-ut-generation`。
- TDD 闭环:`tdd-enforcer`。确认测试 GN 目标名(`<Test>`)、`testpart`、套件二进制名(`-ts`)。
- 依据 `AR_design.md` 的"完整测试框架/需测试的功能点"补测试,让每个契约 `test_cases[].gtest` 的
  suite 出现在新测试文件里。

## 门控
```bash
python3 $S/gate_test_develop.py --pipeline-dir "$PDIR"
```
脚本逻辑:
1. 读 phase-2 冻结快照 `development_freeze_snapshot.json`(缺失 → FAIL,提示先跑 gate_develop.py)。
2. 校验功能冻结:自冻结以来只能出现新测试文件,任何新增非测试路径 → FAIL。
3. 从**签名设计**恢复 ar-contract:absent(legacy/无契约)→ `AR-CONTRACT-BYPASS` PASS;
   tampered(设计条目在但证据/契约损坏)→ FAIL-closed;ok → 强制全量编写覆盖。
4. 覆盖判据:每个契约 `test_cases[].gtest` 的 suite(`test_target_from_gtest`)须在某个新测试文件文本中出现;
   缺任一即 FAIL,写 `evidence/phase3/authorship_coverage.txt` 列命中/缺失。
5. 把新测试源文件快照进 `evidence/phase3/authored/<flattened>` 并作为签名 artifact(sha256)绑进
   manifest——后续删/改测试会被 `validate_closing_entry`(advance 闭合 phase 3 时)抓到。
6. PASS 后 best-effort 调 `prepare_test_bundle.run_prepare` 产控制层导航(`signed_test_scope.json` /
   `test_intent_matrix.json` / status),控制写失败**不翻转 verdict**。
证据:`new_test_files.txt`、`authorship_coverage.txt`、`authored/*`(签名)。

## 通过条件
phase-2 冻结快照存在 **且** 无新增非测试路径 **且**(契约 ok 时)每个 `test_cases[].gtest` 的 suite
都被某个新测试文件引用。契约 absent → bypass PASS;契约 tampered → FAIL。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 3
```
推进到物理 phase 4(build-verify)。至此"编译前测试代码已写"由**阶段顺序 + 签名**结构性保证:
不闭合 phase 3 就到不了 phase 4。
