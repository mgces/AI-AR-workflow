# P7 质量验证

> 本页拆解 P7(物理 phase 7)的功能 summary、覆盖率/性能/功耗/稳定性、review 报告为何是 gate 条件。

## 功能 summary

`gate_integration.py`(emit 7)先校验功能 summary:`failures==0 && errors==0 && tests>0`——这是基础门槛,功能测试必须全过才有资格谈质量。

## 覆盖率 / 性能 / 功耗 / 稳定性

P7 四大质量维度全部要求生成并签名报告:

| 维度 | 报告 | 说明 |
|---|---|---|
| 覆盖率 | `coverage_report.*` | 代码覆盖率 |
| 性能 | `performance_report.*` | 性能指标 |
| 功耗 | `power_report.*` | 功耗指标 |
| 稳定性 | `stability_report.*` | 稳定性指标 |

`gate_integration.py` 参数:

```bash
gate_integration.py --pipeline-dir P [--testtype MST] --suites S1 [S2 …] [--part P]
    --coverage-report F --performance-report F --power-report F --stability-report F
    [--code-review-report F]
```

也可复用 `gate_device_func.py --phase 7` + `gate_integration.py`。

## review 报告为何是 gate 条件

P7 还要求**代码 review 问题数为 0**——这是 gate 条件,不是建议。

两道 review 报告契约(机器可读问题计数):

- JSON:`issue_count/finding_count/...==0` 或 `issues/findings/...` 空数组
- 文本:`review_issue_count=0`

报告可由模型/技能产出,gate 只在计数为 0 时放行;任一非零/缺失 → FAIL,改代码后 `advance.py reset` 回 P1 重走。

P7 的代码 review 报告字段是 `--code-review-report F`,由 `code-ruleset-style-check` + `ohos-dev-security-code-review` 产出。

## 人工确认点

P7 证据 PASS 后**不自动放行**——必须停下,把质量报告与 review 呈现给用户:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 7 --token <人>
```

通过后渲染 `reports/quality.md`(六段聚合含 review)。

## 顺序边界

P7 在 P6 端到端功能测试之后、P8 上库之前:

```
P6 端到端功能测试 → consent → P7 质量验证 → consent → P8 上库
```

## 常见 skill 参与 P7

- `ohos-build-flash` / developer_test(MST)
- `ohos-test-ut-generation`
- coverage / performance / power / stability 报告生成
- `code-ruleset-style-check` / `ohos-dev-security-code-review`

## 常见误区

- **以为功能过了就够**:不够。还要覆盖率/性能/功耗/稳定性四报告 + review 零问题
- **review 报告只给文字不给计数**:不行。必须携带机器可读问题计数,gate 只认计数
- **想跳过 review**:不能。review==0 是 gate 条件

## 延伸阅读

- [Skill 组合拳](/skill-playbooks/common-combinations) — 场景 C 上库前自检的 skill 组合
- [门控契约](/reference/gate-contract) — gate_integration 契约细节
- [上库 CI 示例](/examples/upload-ci-example) — P7 后接 P8 上库
- [关键命令](/reference/key-commands) — gate_integration 命令速查
