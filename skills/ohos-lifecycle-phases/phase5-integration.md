# P5 集成功能测试(integration)

两种闭合方式,按 AR 性质二选一(最终只看该阶段 manifest 最后一条 PASS):

## A. 套件型集成(模块测试 / 跨组件套件)
做事:用 `ohos-build-flash` 部署多组件改动;必要时用 `ohos-test-ut-generation` 思路补模块测试。
门控:
```bash
python3 $S/gate_integration.py --pipeline-dir "$PDIR" \
    --testtype MST --suites <suite1> [<suite2> ...] [--part <testpart>]
```
逻辑同 P3:跑 `./start.sh run -t MST -tp <part> -ts ...`,集合差找新报告目录,解析
`summary_report.xml`。通过:新报告目录 + `tests>0 && failures==0 && errors==0`。

## B. 设备行为型集成(端到端场景)
当集成验证是"多组件协同的真机行为"而非套件时,复用 P4 真机门控,指定 `--phase 5`:
```bash
python3 $S/gate_device_func.py --pipeline-dir "$PDIR" \
    --deploy-script /path/deploy.sh --scenario-script /path/integ_scenario.sh \
    --marker "<集成成功标记>" --phase 5
```
通过条件同 P4(nonce + marker + uptime 单调)。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 5
```
