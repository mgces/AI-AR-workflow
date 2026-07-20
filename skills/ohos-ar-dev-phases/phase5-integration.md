# P5 功能测试 + 质量报告 + 代码 review(quality)

P5 = **功能测试** ∧ **代码覆盖率测试用例编写和测试** ∧ **性能/功耗增量测试**
∧ **稳定性影响测试** ∧ **代码 review 问题清零**。本阶段必须把真实测试报告和
code review 报告落到 `evidence/phase5/`,最终只看该阶段 manifest 最后一条 PASS。
证据 PASS 后仍需人工确认质量报告和 review 报告无问题,记录 `consent --phase 5` 后才可进入 P6。

## A. 套件型功能与质量测试
做事:
- 用 `ohos-build-flash` 部署改动后的产物。
- 用 `ohos-test-ut-generation` / `tdd-enforcer` 补充功能测试和覆盖率测试用例。
- 执行功能套件,生成 `summary_report.xml`。
- 执行覆盖率采集并输出覆盖率报告。
- 增加性能和功耗测试,输出性能报告与功耗报告。
- 执行稳定性影响测试,输出稳定性报告。
- 使用 `code-ruleset-style-check` 的规则做代码 review;涉及 IPC/权限/并发/
  隐私风险时同步用 `ohos-dev-security-code-review` 复核。review 问题必须清零。

门控:
```bash
python3 $S/gate_integration.py --pipeline-dir "$PDIR" \
    --testtype MST --suites <suite1> [<suite2> ...] [--part <testpart>] \
    --coverage-report /path/coverage_report.html \
    --performance-report /path/performance_report.md \
    --power-report /path/power_report.md \
    --stability-report /path/stability_report.md \
    [--code-review-report /path/code_review_report.json]
```
逻辑:
1. 跑 `./start.sh run -t MST -tp <part> -ts ...`,集合差找本次新报告目录,解析
   `summary_report.xml`(`tests>0 && failures==0 && errors==0`)。
2. 将覆盖率、性能、功耗、稳定性四类报告复制到 `evidence/phase5/` 并纳入 HMAC 签名证据。
3. 自动对改动 C/C++ 文件运行 `code_ruleset_guard.py`,生成
   `code_review_report.txt`;工具缺失或返回非 0 都判 FAIL。
4. 如提供 `--code-review-report`,报告必须是机器可校验的零问题报告:
   JSON 中 `issue_count/finding_count/problem_count/blocker_count` 为 0,或
   `issues/findings/problems/blockers` 数组为空;文本报告需包含 `review_issue_count=0`。

通过条件:功能套件通过,四类质量报告全部存在并被签名,代码 review 问题数为 0。
临时兼容旧流程时可加 `--allow-missing-quality-reports`,但正式流水线不应使用。

## B. 设备行为型集成(端到端场景)
当功能验证是"多组件协同的真机行为"而非套件时,复用 P4 真机门控,指定 `--phase 5`:
```bash
python3 $S/gate_device_func.py --pipeline-dir "$PDIR" \
    --deploy-script /path/deploy.sh --scenario-script /path/integ_scenario.sh \
    --marker "<集成成功标记>" \
    --host-artifact "$OHOS_ROOT/out/rk3568/..." \
    --device-artifact "/system/..." \
    --runtime-marker "<改动代码运行标记>" \
    --e2e-marker "<端到端集成成功标记>" \
    --phase 5
```
通过条件建议同 P4(主机/设备产物 sha256 一致 + nonce + marker + runtime_marker +
e2e_marker + uptime 单调)。走此路时,仍必须另外产出覆盖率、性能、功耗、稳定性报告和
代码 review 报告,并用 `gate_integration.py` 纳入 P5 证据;否则 P5 不完整。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 5 --token <审核人>
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 5
```

`advance --phase 5` 在没有 phase-5 consent 时会 **HOLD**。人工必须先检查
`evidence/phase5/` 下的覆盖率、性能、功耗、稳定性和代码 review 报告,确认无问题后再签字。

## 生成人读报告(证据/报告分离)
```bash
python3 ~/.claude/skills/ohos-ar-dev-workflow/scripts/render_report.py \
    --pipeline-dir "$PDIR" --kind quality
```
产出 `reports/phase5_quality.html`(覆盖率/性能/功耗/稳定性 + 功能 summary 聚合)。
`--allow-missing-quality-reports` 降级时,签名 reason 会带 `QUALITY-GATE-DOWNGRADED` 留痕。

> ⚠️ 若本阶段(或任何阶段)发现需要**改代码**,先 `advance.py reset` 回 P1 重走,见
> phase1 / 编排器护栏。改了码再继续 P5 会被 `advance` 以"代码指纹漂移"拒绝。
