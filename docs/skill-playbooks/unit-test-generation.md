# 单测生成 skill 实战

> 围绕 `ohos-test-ut-generation`:为什么适合 P3、典型输入、典型输出、如何与 `gate_test_ut.py` 协作。

## 为什么适合 P3

P3(物理 phase 3 测试开发 + phase 5 单测执行)要求:

- **编译前测试代码已写**(Finding 1):不闭合 phase3 就到不了 phase4
- 编写覆盖:契约每个 `test_cases[].gtest` 的 suite 出现在**新测试文件**
- 执行覆盖:契约每个 `test_cases[].gtest` 通过

`ohos-test-ut-generation` 为 OpenHarmony C/C++ 代码生成 HWTEST/HWTEST_F 测试用例 + ohos_unittest,正满足 P3 的测试编写需求。

## 典型输入

- 目标 C/C++ 源文件路径
- AR_design 契约的 `test_cases[].gtest` 列表(指定 suite.name)
- 测试框架约定(HWTEST / HWTEST_F / ohos_unittest)

## 典型输出

- 新增独立测试文件(P3 只允许新增独立测试文件,不能改现有功能文件)
- HWTEST/HWTEST_F 测试用例
- ohos_unittest 注册

## 如何与 gate_test_ut.py 协作

| 阶段 | skill/gate | 职责 |
|---|---|---|
| P3 编写(物理 phase 3) | `ohos-test-ut-generation` + `tdd-enforcer` | 生成测试文件,满足编写覆盖 |
| P3 编写门 | `gate_test_develop.py`(emit 3) | 校验每个 gtest suite 出现在新测试文件 + 签名快照 |
| P5 执行(物理 phase 5) | developer_test | 跑单测 |
| P5 执行门 | `gate_test_ut.py`(emit 5) | 校验 tests>0 且 fail==0 err==0 + 每个 gtest 通过 |

`prepare_test_bundle.py` 是 P3 控制层薄层(非真相门),由 `gate_test_develop` 调用产 `test_intent_matrix` + bundle revision。

## 关键约束

- **只新增独立测试文件**:`TEST_ONLY_PHASES=(3,5,6,7)`,改功能代码会触发指纹漂移
- **编写覆盖 ≠ 执行覆盖**:P3 证明测试已编写,P5 证明测试已执行通过
- **报告必须本次新建**:P5 不认旧报告,新鲜度靠新报告目录

## 常见误区

- **想改现有测试文件**:P3 只允许新增独立测试文件
- **以为测试写完就 advance**:还要跑 gate_test_develop 校验编写覆盖 + 签名快照
- **测试报告复用旧目录**:不行,P5 要求本次新建报告

## 延伸阅读

- [P3 测试阶段](/workflow/phase-3-test) — 两步合一的门控细节
- [只补测试示例](/examples/test-only-follow-up) — 何时允许不改功能继续 P3
- [Skill 组合拳](/skill-playbooks/common-combinations) — 场景 D 只补测试
