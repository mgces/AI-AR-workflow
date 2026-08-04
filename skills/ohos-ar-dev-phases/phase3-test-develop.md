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
`moduletest/`、`fuzztest/` 目录,或 `*Test.cpp`/`test_*.cpp` 等命名;test 目录下的 BUILD.gn 也算测试),
**或契约声明的 ArkTS 应用测试工程文件**(见下「按 kind 分派」:`test_cases[].kind=="arkts"` 时,
`file` 声明的 `entry/src/ohosTest/...` 目录/文件放行)。
**任何自 phase-2 冻结以来新增的非测试路径都判违规**(复用 `prepare_test_bundle._verify_feature_freeze`);
改动被测组件功能代码/配置会被 `advance` 以功能指纹漂移拒绝,必须 `advance.py reset` 回 P1 重走。

## 测试语言形态:按 kind 分派(2026-08 新增)
契约 `test_cases[].kind` 决定 authorship 判据:
- **gtest(缺省,存量不变)**:suite 必须被某个新测试文件里的真实 `TEST`/`TEST_F`/`TEST_P`/
  `TYPED_TEST`/`TYPED_TEST_P` 宏注册(允许 `::` 限定名),裸出现于注释/字符串/自由文本不计数。
- **arkts**:suite 必须被某个新 ArkTS 测试文件里的真实 `describe('<suite>', ...)` 调用注册
  (先剥注释再匹配,`// describe(...)` 注释永不计数);`it('<case>', ...)` 承载用例。契约
  `file` 声明了具体文件时**优先检查该文件**——放行进来的工程文件必须真的承载套件。
两种 kind 的设计点(`point`)覆盖机制相同:核心 token 必须出现在该测试文件的**可执行代码区**
(注释剥离、字符串/字符字面量保留;`expect(...).assertEqual("点一")` 即实现,`// TODO 点一` 不算)。

## 🚨 动手前必做:先研究被测代码,别想当然写测试
写测试前**必须先读懂 P2 冻结的功能实现**,不允许对着 `AR_design.md` 的测试框架凭空造断言。
弱模型最常见的错:不看被测函数真实签名/行为就写 gtest,结果编译不过、断言与实现语义不符、
或漏掉契约要求的 suite。按下面顺序研究清楚再进入"做事":

1. **读被测实现**:对每个 `test_cases[].gtest` 的 "Suite.Case",先在 P2 已冻结的功能代码里找到
   它要覆盖的类/函数,读懂真实签名、返回值、错误码、边界与副作用——测试断言必须对齐**实现的真实行为**,
   不是设计文档里的理想描述。
2. **摸清测试基建**:该组件既有单测放哪、用什么 fixture/mock、GN 目标名(`<Test>`)、`testpart`、
   套件二进制名(`-ts`)怎么定,复用既有测试约定与工具,别另起一套。
3. **对齐契约覆盖**:把 `AR_design.md`「完整测试框架/需测试的功能点」逐条映射到要写的测试文件,
   确认每个契约 suite 都有新测试文件承载(门控按此判覆盖)。
4. **守功能冻结**:只新增独立测试文件(见上「只增独立测试的硬约束」);研究中若发现被测实现有 bug,
   **不要顺手改功能代码**(会触发指纹漂移被 `advance` 拒),记录问题、按流程回 P1/P2 处理。

产出:动手前应能说清「每个契约 suite 覆盖哪个被测函数的什么行为、断言依据是实现的哪段逻辑」。

## 做事(调用现有技能)
- 生成 OpenHarmony C/C++ 单测(HWTEST/HWTEST_F + `ohos_unittest` + BUILD.gn):`ohos-test-ut-generation`。
- TDD 闭环:`tdd-enforcer`。确认测试 GN 目标名(`<Test>`)、`testpart`、套件二进制名(`-ts`)。
- 在新增测试文件或测试 BUILD 输入前，先加载
  `ohos-dev-cpp-coding-style` 和
  `code-ruleset-style-check/references/pre-write-contract.md`；测试代码、测试名、
  fixture、字符串和构建输入都受同一套门禁规则约束。
- 依据 `AR_design.md` 的"完整测试框架/需测试的功能点"补测试,让每个契约 `test_cases[].gtest` 的
  suite 出现在新测试文件里。

写码顺序固定为：**研究被测实现与测试基建(见上「动手前必做」)** → 读取写码前契约 → 生成/补测试 → 对新增测试源运行共享 guard。
契约和自检只能指导写法，不能替代 `gate_test_develop.py` 的签名 PASS。

## 门控
```bash
python3 $S/gate_test_develop.py --pipeline-dir "$PDIR"
```
脚本逻辑:
1. 读 phase-2 冻结快照 `development_freeze_snapshot.json`(缺失 → FAIL,提示先跑 gate_develop.py)。
2. 校验功能冻结:自冻结以来只能出现新测试文件,任何新增非测试路径 → FAIL。
3. 从**签名设计**恢复 ar-contract:absent(legacy/无契约)→ `AR-CONTRACT-BYPASS` PASS;
   tampered(设计条目在但证据/契约损坏)→ FAIL-closed;ok → 强制全量编写覆盖。
4. 覆盖判据:**按 kind 分派**(gtest 走 `TEST` 宏注册,arkts 走 `describe()/it()` 于声明
   `file`),每个契约 `test_cases[].gtest` 的 suite 须在某个新测试文件文本中**真实注册**;
   再叠加设计点语义覆盖(该文件可执行代码区含 `point` 核心 token);
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
