# 单元测试骨架(ohos_unittest)

服务流水线 P3。测试文件天然落在组件 `test/` 目录,符合「只增独立测试」约束——
`advance` 不会因此判功能指纹漂移。

## 占位符变量表

| 占位符 | 含义 | 示例 / 来源 |
| --- | --- | --- |
| `<TEST_TARGET>` | ohos_unittest 目标名(= developer_test 的 `-ts` 套件名) | 如 `ThreadLeakDetectorTest` |
| `<test_target>` | 目标名的 snake_case(config 名) | 如 `thread_leak_detector_test` |
| `<TEST_SUITE>` | gtest fixture 类名 | 通常同 `<TEST_TARGET>` |
| `<CASE_NAME>` | 单个用例名 | 如 `ThresholdTriggersOnce` |
| `<target>` | 源文件名前缀 | `<target>_test.cpp`,如 `thread_leak_detector` |
| `<PART_NAME>` | testpart(= developer_test 的 `-tp`) | 从 `components.tsv` / bundle.json part_name |
| `<MODULE_OUT_SUBDIR>` | module_out_path 子目录 | 如 `hiview/thread_leak_detector` |
| `<header_under_test>` | 被测头文件名 | 如 `thread_leak_detector` |
| `<SUBSYSTEM_NS>` | 命名空间(OHOS::X) | 如 `HiviewDFX` |
| `<TYPE_UNDER_TEST>` / `<METHOD_UNDER_TEST>` / `<EXPECTED_VALUE>` | 被测类/方法/期望 | — |
| `<INCLUDE_DIR_UNDER_TEST>` | 被测代码 include 目录 | 如 `../` |
| `<DEP_UNDER_TEST>` | 被测生产目标(或 `*_for_test` 变体) | 从 BUILD.gn 查 |

## developer_test 入口

```bash
# P3 门控实际跑的命令(gate_test_ut.py)
cd test/testfwk/developer_test
./start.sh run -t UT -tp <PART_NAME> -ts <TEST_TARGET> -p rk3568
```

## 对照范例(OHOS 源码仓)

- `base/hiviewdfx/hiview/**/test/unittest/`(含 `SetUpTestCase`/`SetUp`/`HWTEST_F`)
- 本仓 `products/20260715-appfreeze-recovery-barrier/p3-tests/p3_verification_cases.cpp`(真实用例)

## 常见坑

- **必须 `import("//build/test.gni")`**——否则 `ohos_unittest` 模板 not found。
- `<TEST_TARGET>` 必须与 `-ts` 完全一致,否则 developer_test 找不到套件。
- rk3568 上跑要带 `-p rk3568`,否则 productform 默认 phone,找不到用例(P3 门控已自动带)。
- Level 分级:核心 `Level1`,次要 `Level2/3`。
