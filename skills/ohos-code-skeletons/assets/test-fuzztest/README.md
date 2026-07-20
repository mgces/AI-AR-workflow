# 模糊测试骨架(ohos_fuzztest)

服务鲁棒性验证(P5 质量域可选)。libFuzzer 反复用变异字节调 `LLVMFuzzerTestOneInput`。
文件落在 `test/fuzztest/<fuzzer_dir>/`,满足「只增独立测试」约束。

## 占位符变量表

| 占位符 | 含义 | 示例 |
| --- | --- | --- |
| `<FUZZ_TARGET>` | ohos_fuzztest 目标名 | 如 `ThreadLeakParseFuzzTest` |
| `<FuzzEntry>` | fuzz 函数名前缀(PascalCase) | 如 `ThreadLeakParse` |
| `<fuzzer_dir>` | fuzzer 目录名 / `fuzz_config_file` | 如 `threadleakparse_fuzzer` |
| `<fuzzer_name>` | 头文件前缀 | `<fuzzer_name>_fuzzer.h` |
| `<target>` | 源文件前缀 | `<target>_fuzzer.cpp` |
| `<PART_NAME>` / `<MODULE_OUT_SUBDIR>` | testpart / 输出子目录 | — |
| `<INCLUDE_DIR_UNDER_TEST>` / `<DEP_UNDER_TEST>` | include / 被测目标 | — |
| `<header_under_test>` / `<TYPE_UNDER_TEST>` / `<METHOD_UNDER_TEST>` | 被测头/类/方法 | — |

## 对照范例(OHOS 源码仓)

- `drivers/external_device_manager/test/fuzztest/**`(标准 `LLVMFuzzerTestOneInput`)
- `developtools/profiler/hidebug/**/fuzztest/`(fuzz BUILD.gn)

## 常见坑

- **必须 `import("//build/test.gni")`**,且需一个 `fuzz_config_file` 目录(含 corpus/project.xml)。
- fuzz 目标只喂**不可信输入的解析/入口**才有意义;纯内部逻辑用单测。
- `LLVMFuzzerTestOneInput` 必须 `extern "C"`。
