# P7 功能测试 + 质量报告 + 代码 review(quality,物理 phase 7)

`openharmony-qemu` 的 developer_test 和设备门复用 P0 的实例连接，原质量报告与人工确认继续生效。
QEMU 是本流程的一种真机/设备目标；TCG 下测得的性能、功耗、外设表现和安全行为不代表 rk3568 实体硬件。
验收依赖这些能力时补 rk3568 实体硬件证据，不能用基本启动替代缺失项目。详见
[QEMU 接入与证据边界](../ohos-ar-dev-workflow/references/qemu-development.md)。

P7 = **功能测试** ∧ **代码覆盖率测试用例编写和测试** ∧ **性能/功耗增量测试**
∧ **稳定性影响测试** ∧ **代码 review 问题清零**。本阶段必须把真实测试报告和
code review 报告落到 `evidence/phase7/`,最终只看该阶段 manifest 最后一条 PASS。
`gate_integration.py` 签名 `emit(phase 7)`。证据 PASS 后仍需人工确认质量报告和 review 报告无问题,
记录 `consent --phase 7` 后才可进入 P8。

## 开工前预警

> 开工前先看文末「问题预警」，可减少可避免的门控失败。

## A. 套件型功能与质量测试
做事:
- rk3568 使用 `ohos-build-flash` 部署改动后的产物；arm64_virt QEMU 使用 `ohos-qemu-run` 部署到本次固定实例。
- 用 `ohos-test-ut-generation` / `tdd-enforcer` 补充功能测试和覆盖率测试用例。
- 执行功能套件,生成 `summary_report.xml`。
- 执行覆盖率采集并输出覆盖率报告。
- 增加性能和功耗测试,输出性能报告与功耗报告。
- 执行稳定性影响测试,输出稳定性报告。
- C/C++ 覆盖率使用 `ohos-test-coverage`;XTS/兼容性测试使用
  `ohos-test-xts`，并用 `check-test-code-quality` 做静态质量扫描；需要
  native Fuzz 时使用 `ohos-test-fuzz-generation` 生成、审查和准备 corpus。
- 使用 `code-ruleset-style-check` 的规则做代码 review;涉及 IPC/权限/并发/
  隐私风险时同步用 `ohos-dev-security-code-review` 复核。review 问题必须清零。
- 若有经批准且 SHA-256 固定的 CodeArts 引擎，追加运行
  `ohos-ci-local-precheck` 并保存 `ci-near` 报告；缺失时记录 unavailable，
  不得把本地规则 guard 描述为 CI 等价。

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
2. 将覆盖率、性能、功耗、稳定性四类报告复制到 `evidence/phase7/` 并纳入 HMAC 签名证据。
3. 自动对改动 C/C++ 文件运行 `code_ruleset_guard.py`,生成
   `code_review_report.txt`;工具缺失或返回非 0 都判 FAIL。
4. 如提供 `--code-review-report`,报告必须是机器可校验的零问题报告:
   JSON 中 `issue_count/finding_count/problem_count/blocker_count` 为 0,或
   `issues/findings/problems/blockers` 数组为空;文本报告需包含 `review_issue_count=0`。

详细通过条件见下文「## 通过条件」；`--allow-missing-quality-reports` 是显式降级，不是干净的 P7 PASS。

## B. 设备行为型集成(端到端场景)
当功能验证是"多组件协同的设备行为"而非套件时,复用 P6 设备门控,指定 `--phase 7`:
```bash
python3 $S/gate_device_func.py --pipeline-dir "$PDIR" \
    --deploy-script /path/deploy.sh --scenario-script /path/integ_scenario.sh \
    --marker "<集成成功标记>" \
    --host-artifact "$OHOS_ROOT/<环境产物目录>/..." \
    --device-artifact "/system/..." \
    --runtime-marker "<改动代码运行标记>" \
    --e2e-marker "<端到端集成成功标记>" \
    --phase 7
```
通过条件建议同 P6(主机/设备产物 sha256 一致 + nonce + marker + runtime_marker +
e2e_marker + uptime 单调)。该路径只证明设备行为；完整 P7 仍需 `gate_integration.py`
核验覆盖率、性能、功耗、稳定性报告和 code review。

> ⚠️ 当前 `gate_device_func --phase 7` 的签名 PASS 只覆盖设备行为，代码本身不会强制
> 补齐四类质量报告和 review；`advance --phase 7` 只要求最后一条 P7 PASS。因此不能把
> device-only PASS 当作完整 P7 质量结论，完整 P7 以 `gate_integration.py` 为准。

## 通过条件

`gate_integration.py` 的实际判定是：

```text
test_ok    = summary_report.xml 的 tests > 0 && failures == 0 && errors == 0
quality_ok = coverage/performance/power/stability 四类报告都存在并被签名
             OR --allow-missing-quality-reports 显式降级
review_ok  = 自动 code_ruleset_guard 返回 0
             AND metric_findings 为空
             AND (未提供 external review OR 外部 review 零问题)
PASS       = test_ok AND quality_ok AND review_ok
```

逐项说明：

- `test_ok`：只看本次新报告目录里的 `summary_report.xml`；P7 门禁不逐项重查契约
  `test_cases[].gtest`，契约执行覆盖由 P5 负责。
- `quality_ok`：门禁只检查四类报告文件是否存在并纳入签名，不验证报告内容或新鲜度；
  报告真实性由生成过程和 P7 人工 consent 负责。
- `--allow-missing-quality-reports`：会把缺失报告降级为 `quality_ok=True`，并在签名 reason
  写 `QUALITY-GATE-DOWNGRADED`；这是有签名的 waiver，不是干净 PASS，正式流水线不应使用。
- `review_ok`：自动 review 对改动 C/C++ 跑完整 `code_ruleset_guard.py`（格式 + 规则），
  metric findings 也阻断；外部 review 报告是可选输入，提供时必须零问题。
  这与 P2/P4 的 observation-only 口径不同，不能假设 P2/P4 通过就意味着 P7 review 一定通过。
- 若启用优化预检，进入门禁前还必须通过 P7 preflight：设备在线/端点/用户态 ABI、xdevice、
  报告回传、test isolation、required-suites。预检不产生签名 PASS。
- 人工 consent 不属于 gate verdict；门禁 PASS 后仍需 `consent --phase 7` 才能 `advance`。

> P7 的 PASS 表示“本 AR 约定的质量证据完整、客观检查通过”；人工 consent 是 PASS
> 之后进入 P8 的条件，不属于 PASS 本身。P7 PASS 也不等于覆盖率/性能/功耗/稳定性
> 满足某个通用行业阈值。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 7 --token <审核人>
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 7
```

`advance --phase 7` 在没有 phase-7 consent 时会 **HOLD**。人工必须先检查
`evidence/phase7/` 下的覆盖率、性能、功耗、稳定性和代码 review 报告,确认无问题后再签字。

## 生成人读报告(证据/报告分离)
```bash
python3 "$AGENT_SKILLS_DIR/ohos-ar-dev-workflow/scripts/render_report.py" \
    --pipeline-dir "$PDIR" --kind quality
```
产出**单个** `reports/quality.md`(Markdown):覆盖率/性能/功耗/稳定性 + 功能 summary +
代码 review 全部聚合进这一个 md,不分散多文件。`--allow-missing-quality-reports` 降级时,
签名 reason 会带 `QUALITY-GATE-DOWNGRADED` 留痕。

> ⚠️ 若本阶段(或任何阶段)发现需要**改代码**,先 `advance.py reset` 回 P1 重走,见
> phase1 / 编排器护栏。改了码再继续 P7 会被 `advance` 以"代码指纹漂移"拒绝。

## 问题预警

| 预警信号（result 次数 / 置信） | 先查什么 | 需要什么证据 | 停止条件 |
|---|---|---|---|
| `auto_review_issues=1` / `guard rc=1`（3 次 / 高可信） | 先看 `code_review_report.txt` 的文件:行，再确认是否在本次增量 review 范围 | `style_report`、`code_review_report.txt`、changed_lines | 没有具体文件/规则时停止，不重跑 |
