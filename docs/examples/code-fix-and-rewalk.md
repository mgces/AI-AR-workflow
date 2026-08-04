# 改码回退重走示例

> 解释一个极关键但容易误解的场景:在 P3/P4/P5 发现功能问题、为什么必须 reset 回 P1、重新走流程意味着什么。

## 场景

假设走到 P5(单测执行)时发现一个功能 bug——不是测试漏写,而是功能代码本身有问题。

## 为什么必须 reset 回 P1

**任何阶段发现要改功能代码 → 必须回 P1 重走**。这不是建议,是硬控制:

- P2(物理 phase 2)闭合时已**锁定功能指纹**(仅非测试路径内容,相对 base_commit)
- `check_code_drift` 从 phase3 起生效:改功能代码/配置内容 → `advance P3..P8` 因功能指纹漂移被拒
- P3/P5/P6/P7 只允许新增独立测试文件(`TEST_ONLY_PHASES=(3,5,6,7)`),改功能路径会被拒

也就是说:不 reset 硬改,后续所有 `advance` 都会被拒——你哪儿也去不了。

## 重新走流程意味着什么

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" reset --reason "P5 发现功能 bug:线程阈值比较写反"
```

打回 P1,从设计/代码开发踏踏实实重走一遍 P1→P8:

1. **P1a 设计固化**:重写 `AR_design.md` 修复 bug,重跑 `gate_design.py` 签名
2. **P1 consent**:旧 consent 绑签名设计条目,重跑 gate_design 即作废——必须**重新 consent**
3. **P1b 代码开发**:按新签名设计改代码,跑 `gate_develop.py` 闭合时**重锁功能指纹**
4. **P3 测试开发**:契约每个 gtest suite 出现在新测试文件(若需新测试)
5. **P4 编译**:真跑 build.sh
6. **P5 单元测试**:developer_test 跑通
7. **P6 端到端功能测试**:部署 + scenario + hilog + 人工 consent
8. **P7 质量**:覆盖率/性能/功耗/稳定性 + review 零问题 + 人工 consent
9. **P8 上库**:本地自检 + commit + push + PR + PR review + CI + 人工 consent

不是从 bug 出现的那一阶段续跑,而是从 P1 整条流水线重走。

## 关键约束

| 改动 | 后果 |
|---|---|
| 改功能代码/配置内容 | 必须 reset 回 P1,否则 advance 因指纹漂移被拒 |
| P3/P5/P6/P7 新增非测试路径 | 拒绝(`TEST_ONLY_PHASES`),必须 reset |
| 新增独立测试文件(test 路径) | **不触发**漂移,可继续当前阶段 |
| 只改测试不改功能 | 不必 reset,可继续(见 [只补测试](/examples/test-only-follow-up)) |

## 常见误区

- **想只补跑当前阶段**:不行。功能指纹漂移会被拒,必须 reset 回 P1
- **以为 reset 后能从 bug 阶段续跑**:不行。reset 打回 P1,从设计重走
- **想偷偷改一点功能代码不 reset**:门控会校验,漂移即拒
- **以为改测试也要 reset**:不必。新增独立测试文件不触发漂移

## 延伸阅读

- [Consent 与 Reset](/workflow/consent-and-reset) — reset 的状态流转与功能指纹
- [Evidence 与 Gates](/workflow/evidence-and-gates) — 功能指纹的防伪机制
- [只补测试示例](/examples/test-only-follow-up) — 何时允许不改功能继续 P3
- [新增功能端到端](/examples/new-feature-end-to-end) — 完整路线(从 P1 重走的参照)
