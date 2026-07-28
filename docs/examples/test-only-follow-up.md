# 只补测试示例

> 说明什么是"只补测试"、何时允许不改功能代码继续 P3、何时会被功能指纹拒绝。

## 什么是只补测试

只在 P3/P5/P6/P7 补测试,不改功能代码——约束于 `TEST_ONLY_PHASES=(3,5,6,7)`。

适用场景:

- 发现测试漏写(某个 gtest suite 没出现在新测试文件)
- P5 执行覆盖不足(某个 gtest 没通过)
- 想增加边界用例

**关键**:只允许**新增独立测试文件**,不能改现有功能文件。

## 何时允许不改功能代码继续 P3

允许继续的条件:

| 条件 | 说明 |
|---|---|
| 只新增独立测试文件 | test 路径,不触发功能指纹漂移 |
| 不改功能代码/配置内容 | 功能指纹保持锁定值 |
| 不新增非测试路径 | `TEST_ONLY_PHASES` 只允许 test 路径 |
| 契约 gtest suite 覆盖 | 补的测试要对应 `test_cases[].gtest` |

满足这些就能在 P3/P5/P6/P7 续跑,不必 reset 回 P1。

## 何时会被功能指纹拒绝

拒绝继续的场景:

| 改动 | 后果 |
|---|---|
| 改功能代码/配置内容 | 功能指纹漂移,`advance` 从 phase3 被拒 |
| 新增非测试路径 | `TEST_ONLY_PHASES` 拒绝,必须 reset |
| 改现有功能文件 | 同漂移,被拒 |

一旦触发漂移,**只能** `advance.py reset` 回 P1 重走,没有捷径。

## 判定流程

```
想改代码 ──是功能代码/配置?──是──▶ reset 回 P1 重走
                │
                否
                │
                ▼
        是新增独立测试文件?──是──▶ 可继续当前阶段(不触发漂移)
                │
                否
                │
                ▼
        改现有功能/新增非测试路径 ──▶ reset 回 P1 重走
```

## 与 workflow 配合

| 阶段 | skill | 做什么 |
|---|---|---|
| P3 编写 | `ohos-test-ut-generation` + `tdd-enforcer` | 生成新增独立测试文件 |
| P3 门 | `gate_test_develop.py` | 校验编写覆盖 + 签名快照(不动功能指纹) |
| P5 执行 | developer_test | 跑新增测试 |
| P5 门 | `gate_test_ut.py` | 校验执行覆盖 + 本次新建报告 |

## 常见误区

- **以为改测试也要 reset**:不必。新增独立测试文件不触发漂移
- **想偷偷改一点功能代码**:门控会校验,漂移即拒
- **补的测试不对应契约 gtest**:P3 要求契约每个 `test_cases[].gtest` 的 suite 出现在新测试文件
- **测试报告复用旧目录**:P5 要求本次新建报告,新鲜度靠新报告目录

## 延伸阅读

- [P3 测试阶段](/workflow/phase-3-test) — 编写覆盖与执行覆盖的门控
- [Consent 与 Reset](/workflow/consent-and-reset) — 功能指纹分层规则
- [改码回退重走示例](/examples/code-fix-and-rewalk) — 改功能代码必须 reset 的对照
- [Skill 实战:单测生成](/skill-playbooks/unit-test-generation) — test-ut-generation 详解
