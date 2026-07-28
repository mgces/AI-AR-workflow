# P5 单测执行

> 本页拆解 P5(物理 phase 5)的编出测试二进制、developer_test 本次新建报告、tests>0 且 fail==0 err==0、契约每个 gtest 通过(执行覆盖)。

## 阶段定位

P5 是单测**执行**验证阶段——把 P3 已编写好的测试真正跑通,证明功能代码与测试都按契约执行通过。门控脚本 `gate_test_ut.py`(emit 5)。

与 P3 的区别:

| 阶段 | 证明什么 | 门控 |
|---|---|---|
| P3 测试开发(物理 phase 3) | 测试**编写**覆盖(每个 gtest suite 出现在新测试文件) | `gate_test_develop.py` |
| P5 单测执行(物理 phase 5) | 测试**执行**覆盖(每个 gtest 通过) | `gate_test_ut.py` |

## 编出测试二进制

`gate_test_ut.py` 的关键参数:

```bash
gate_test_ut.py --pipeline-dir P --test-target T --suite S [--part P]
```

- `--test-target` — 编出的测试二进制目标
- `--suite` — 测试套件名
- `--part` — developer_test 的 part

## developer_test 本次新建报告

P5 要求 developer_test 产**本次新建**报告——新鲜度靠新报告目录,不靠时间戳(设备 RTC 错乱):

- 不认旧报告
- 新报告目录路径落 `report_dir.txt`
- `summary_report.xml` + `result_*.xml` 落 `evidence/phase5/`

## tests>0 且 fail==0 err==0

基础门槛:

- `tests>0` — 必须有测试跑过(空跑不算)
- `failures==0` — 无失败
- `errors==0` — 无错误

## 契约每个 gtest 通过(执行覆盖)

依签名 AR_design 契约的 `test_cases[].gtest` 全量覆盖硬门控:

- 契约每个 `test_cases[].gtest` 必须**执行通过**
- 缺任一即 FAIL
- 契约 absent(legacy)→ bypass 降级留痕;契约 tampered → FAIL-closed

产物落 `$PDIR/evidence/phase5/`:`summary_report.xml`、`result_*.xml`、`gtest_coverage.txt`、`start_sh_stdout.txt`、`report_dir.txt`。

## 常见 skill 参与P5

- [`ohos-test-ut-generation`](/skill-playbooks/unit-test-generation) — 生成测试
- `tdd-enforcer` — TDD 约束(**只增独立测试**)

## 常见误区

- **测试报告复用旧目录**:不行。P5 要求本次新建报告,新鲜度靠新报告目录
- **以为 P3 写完测试就到这**:不够。P3 证明编写覆盖,P5 证明执行覆盖
- **契约某个 gtest 没跑通**:全量覆盖硬门控,缺任一即 FAIL
- **想改现有测试文件**:P5 只允许新增独立测试文件(`TEST_ONLY_PHASES`),改功能代码要 reset 回 P1

## 顺序边界

P5 在 P4 编译之后、P6 真机之前——阶段顺序固定,不可跳:

```
P4 编译 → P5 单测执行 → P6 真机
```

## 延伸阅读

- [P3 测试阶段](/workflow/phase-3-test) — 测试开发(编写覆盖)与 P5 的区别
- [Skill 实战:单测生成](/skill-playbooks/unit-test-generation) — test-ut-generation 详解
- [门控契约](/reference/gate-contract) — gate_test_ut 契约细节
- [关键命令](/reference/key-commands) — gate_test_ut 命令速查
