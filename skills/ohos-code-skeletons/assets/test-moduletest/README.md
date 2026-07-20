# 模块测试骨架(ohos_moduletest)

服务流水线 P5(功能/集成)。与单测的区别:**用真实阈值、真实协作对象跑端到端行为**,不是纯 mock。
文件落在 `test/moduletest/`,同样满足「只增独立测试」约束。

## 占位符变量表

| 占位符 | 含义 | 示例 |
| --- | --- | --- |
| `<MTEST_TARGET>` | ohos_moduletest 目标名(= `-ts` 套件名) | 如 `ThreadLeakModuleTest` |
| `<MTEST_SUITE>` | fixture 类名 | 通常同 `<MTEST_TARGET>` |
| `<MCASE_NAME>` | 用例名 | 如 `Warning2FaultAtRealThreshold` |
| `<target>` | 源文件前缀 | `<target>_module_test.cpp` |
| `<PART_NAME>` / `<MODULE_OUT_SUBDIR>` | testpart / 输出子目录 | 同单测 |
| `<INCLUDE_DIR_UNDER_TEST>` / `<DEP_UNDER_TEST>` | include / 被测目标 | 从 BUILD.gn 查 |
| `<header_under_test>` / `<SUBSYSTEM_NS>` / `<TYPE_UNDER_TEST>` / `<METHOD_UNDER_TEST>` | 被测头/命名空间/类/方法 | — |
| `<REAL_THRESHOLD>` / `<EXPECTED_DECISION>` | 真实阈值 / 期望的真实状态转移 | 如 `3000` / `FAULT` |

## developer_test 入口

```bash
cd test/testfwk/developer_test
./start.sh run -t MST -tp <PART_NAME> -ts <MTEST_TARGET> -p rk3568
```
> P5 门控 `gate_integration.py --testtype MST --suites <MTEST_TARGET>` 会跑它。

## 对照范例(OHOS 源码仓)

- `base/hiviewdfx/hiview/plugins/reliability/thread_leak_detector/test/moduletest/`
  (真实 2000/3000 阈值的 warning→fault 端到端)

## 常见坑

- **必须 `import("//build/test.gni")`**。
- moduletest 用 `-t MST`,单测用 `-t UT`——别混。
- 真实阈值不要用 mock 值代替,否则失去 moduletest 的意义。
