# P3 测试开发

> 本页拆解 P3(物理 phase 3 测试开发)——为什么只能新增独立测试文件、如何生成 UT、如何验证 `test_cases[].gtest` 编写覆盖、`ohos-test-ut-generation` 如何配合 workflow。单测**执行**见 [P5 单测执行](/workflow/phase-5-test-ut)。

## 阶段定位

P3 是测试**编写**验证阶段——在编译前证明测试代码已写完,契约每个 `test_cases[].gtest` 的 suite 出现在新测试文件。门控脚本 `gate_test_develop.py`(emit 3)。

与 P5 的区别:

| 阶段 | 证明什么 | 门控 |
|---|---|---|
| P3 测试开发(物理 phase 3) | 测试**编写**覆盖(每个 gtest suite 出现在新测试文件) | `gate_test_develop.py` |
| P5 单测执行(物理 phase 5) | 测试**执行**覆盖(每个 gtest 通过) | `gate_test_ut.py` |

## 为什么只能新增独立测试文件

指纹分层规则:`TEST_ONLY_PHASES=(3,5,6,7)`——P3/P5/P6/P7 只允许**新增独立测试文件**(test 路径)。

- 新增非测试路径 → 拒绝,必须 `reset` 回 P1 重走
- 改功能代码/配置内容 → 功能指纹漂移,`advance` 从 phase3 起会被拒
- 测试文件的增改**不触发**功能指纹漂移

## 如何生成 UT

调用 [`ohos-test-ut-generation`](/skill-playbooks/unit-test-generation) 技能为 OpenHarmony C/C++ 代码生成单元测试用例,产出 HWTEST/HWTEST_F 测试 + ohos_unittest。

配合 `tdd-enforcer` 约束测试质量,配合 `code-ruleset-style-check` 对新增测试源强制 `--rules-only` 规则门控。

## 如何验证 test_cases[].gtest

### P3 编写覆盖(gate_test_develop.py)

- phase2 冻结快照存在
- 无新增非测试路径
- 契约每个 `test_cases[].gtest` 的 suite 被某个**新测试文件**引用
- 测试源签名快照(`authored/*`)

产物:`new_test_files.txt`、`authorship_coverage.txt`、`authored/*` 签名快照。

### P5 执行覆盖(gate_test_ut.py)

- 编出测试二进制
- developer_test 本次**新建**报告
- `tests>0 && failures==0 && errors==0`
- 契约每个 `test_cases[].gtest` 通过

产物:`summary_report.xml`、`result_*.xml`、`gtest_coverage.txt`、`start_sh_stdout.txt`、`report_dir.txt`。

## ohos-test-ut-generation 如何配合 workflow

- P3:按 AR_design 契约的 `test_cases[].gtest` 生成测试文件,满足编写覆盖门控
- P5:测试执行由 `gate_test_ut.py` 用 developer_test 跑,校验执行覆盖
- `prepare_test_bundle.py` 是 P3 控制层薄层(非真相门),由 `gate_test_develop` 调用产 `test_intent_matrix` + bundle revision

## 常见误区

- **想改现有测试文件**:P3 只允许新增独立测试文件,改现有功能文件会触发指纹漂移
- **以为测试写完就 advance**:还要跑 gate_test_develop 校验编写覆盖 + 签名快照
- **测试报告复用旧目录**:不行。P5 要求本次新建报告,新鲜度靠新报告目录

## 延伸阅读

- [Skill 实战:单测生成](/skill-playbooks/unit-test-generation) — test-ut-generation 详解
- [改码回退重走示例](/examples/code-fix-and-rewalk) — 改功能代码必须 reset 回 P1
- [只补测试示例](/examples/test-only-follow-up) — 何时允许不改功能代码继续 P3
