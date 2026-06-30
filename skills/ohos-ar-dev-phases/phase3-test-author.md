# P3 测试用例编写与验证(test-author)

## 做事(调用现有技能)
- 生成 OpenHarmony C/C++ 单测(HWTEST/HWTEST_F + `ohos_unittest` + BUILD.gn):
  `ohos-test-ut-generation`。
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

## 通过条件
本次确有新报告目录 **且** `tests>0 && failures==0 && errors==0`。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 3
```
