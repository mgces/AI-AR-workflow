# P5 集成功能测试 + 代码 review(integration)

P5 = **集成功能测试** ∧ **上库规范代码 review**。两种闭合方式按 AR 性质二选一
(最终只看该阶段 manifest 最后一条 PASS):

## A. 套件型集成(模块测试 / 跨组件套件)+ 代码 review
做事:用 `ohos-build-flash` 部署多组件改动;必要时用 `ohos-test-ut-generation` 思路补模块测试。
门控:
```bash
python3 $S/gate_integration.py --pipeline-dir "$PDIR" \
    --testtype MST --suites <suite1> [<suite2> ...] [--part <testpart>]
```
逻辑:① 跑 `./start.sh run -t MST -tp <part> -ts ...`,集合差找新报告目录,解析
`summary_report.xml`(`tests>0 && failures==0 && errors==0`);② **代码 review**:用
`ohos-dev-cpp-coding-style` 的 `oh_cpp_guard.py --format-only` 对(相对 `base_commit`)
改动的 C/C++ 文件做上库编码规范检查。**测试与 review 都过**才 P5 PASS;证据多一份
`review_report.txt`。`--skip-review` 可跳过(不建议)。

> 补充人工/AI review:除自动 `oh_cpp_guard` 外,建议同时用 `ohos-dev-cpp-coding-style`
> (`references/rules.md`)与 `ohos-dev-security-code-review` 对照检查,确保符合上库规范。

## B. 设备行为型集成(端到端场景)
当集成验证是"多组件协同的真机行为"而非套件时,复用 P4 真机门控,指定 `--phase 5`:
```bash
python3 $S/gate_device_func.py --pipeline-dir "$PDIR" \
    --deploy-script /path/deploy.sh --scenario-script /path/integ_scenario.sh \
    --marker "<集成成功标记>" --phase 5
```
通过条件同 P4(nonce + marker + uptime 单调)。走此路时,代码 review 请另跑一次
`gate_integration.py`(可只为 review)或手动用 `oh_cpp_guard` 确认。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 5
```

> ⚠️ 若本阶段(或任何阶段)发现需要**改代码**,先 `advance.py reset` 回 P1 重走,见
> phase1 / 编排器护栏。改了码再继续 P5 会被 `advance` 以"代码指纹漂移"拒绝。
