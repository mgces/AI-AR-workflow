# P5 单元测试执行与验证(test-author,物理 phase 5)

测试**编写**已在 phase 3(test-develop)签名固化;本阶段**执行**这些测试并按契约做全量通过校验。
`gate_test_ut.py` 签名 `emit(phase 5)`。

## ⚠️ 只增独立测试的硬约束
本阶段仍**只能新增独立测试文件**(路径规则:`test/`、`unittest/`、`moduletest/`、`fuzztest/` 目录,
或 `*Test.cpp`/`test_*.cpp` 等命名;test 目录下的 BUILD.gn 也算测试)。**不得改动被测组件的功能代码/配置/
功能目录的 BUILD.gn**。违反时 `advance --phase 5` 会以"功能指纹漂移"或"新增了非测试路径"拒绝,
必须 `advance.py reset` 回 P1 重走。真机功能测试必须用**真实态的功能代码 + 配置文件**运行(见 phase6)。

## 做事(调用现有技能)
- 生成 OpenHarmony C/C++ 单测(HWTEST/HWTEST_F + `ohos_unittest` + BUILD.gn):`ohos-test-ut-generation`。
- TDD 闭环:`tdd-enforcer`。确认测试 GN 目标名(`<Test>`)、`testpart`、套件二进制名(`-ts`)。

## 门控
```bash
python3 $S/gate_test_ut.py --pipeline-dir "$PDIR" \
    --test-target <gn_unittest_target> --suite <suite_bin_name> [--part <testpart>]
```
脚本逻辑:
1. 编测试目标 `./build.sh ... --build-target <Test>`(同样校验成功横幅);
2. 记录运行前 `test/testfwk/developer_test/reports/20*` 列表;
3. 跑 `(cd test/testfwk/developer_test && ./start.sh run -t UT -tp <part> -ts <suite>)`;
4. 集合差找**本次新建**的 `reports/<host-时间戳>/`(主机时钟正确 → RTC 无关的新鲜度证明);
5. 解析其中 `summary_report.xml` 根 `<testsuites name="summary_report">` 的 tests/failures/errors,
   并拷 per-suite `result/*.xml`。证据:`summary_report.xml`、`result_*.xml`、`start_sh_stdout.txt`、
   `report_dir.txt`、`test_build_tail.log`。
6. 从签名 AR_design 取契约 `test_cases[].gtest`,把 per-suite `result_*.xml` 汇成**通过用例集**
   (某 `<testcase classname.name>` 无 `<failure>`/`<error>` 子节点即通过),要求**每个契约 gtest 都在
   通过集里**(全量覆盖硬门控),缺任一即 FAIL,写 `evidence/phase5/gtest_coverage.txt` 列出命中/缺失。
   契约 `gtest` 需精确等于 XML 的 `classname.name`(参数化名如 `Suite/0.Case`)。契约缺失(legacy/
   `--allow-missing-contract`)→ 跳过覆盖并留 bypass 标;契约被篡改 → FAIL。

## 通过条件
本次确有新报告目录 **且** `tests>0 && failures==0 && errors==0`
**且** 契约声明的每个 `test_cases[].gtest` 都在本次通过用例集中(全量覆盖)。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 5
```
