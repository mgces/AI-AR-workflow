# P4 真机功能测试(device-functional)

## 做事(调用现有技能)
- 部署改动到真机:`ohos-build-flash`(remount rw → `file send` → `restorecon` → 重启守护
  `kill -9 $(pidof <svc>)`)。
- 设备交互/抓日志命令:`ohos-dev-hdc-command-usage`。

## 准备两个 bash 片段(由你按组件写,门控逐字执行并留痕)
- **deploy 片段**(可选):用 `dev_remount_rw`/`dev_send`/`dev_shell`(已由 device.sh 提供)
  把 `out/rk3568/...` 的产物部署到 `/system/...` 并 `restorecon`、重启守护。
- **scenario 片段**(必需):驱动功能场景。环境变量 `$GATE_NONCE` 已导出,**应让组件把它打进设备日志**
  (例如触发路径里 `hilog`/`log -t ... NONCE=$GATE_NONCE`,或场景产物里带上它),否则无法证明日志是本次的。

## 门控
```bash
python3 $S/gate_device_func.py --pipeline-dir "$PDIR" \
    --deploy-script /path/deploy.sh \
    --scenario-script /path/scenario.sh \
    --marker "<功能成功标记字符串>"
```
脚本逻辑(RTC 无关三锚):生成 nonce → `dev_assert_online` → 采 `uptime_before` →
执行 deploy(任一命令非 0 即 FAIL)→ `log -t LIFECYCLE_GATE NONCE=<n> START` → 跑 scenario →
`... END` → `hilog -x` 抓取 + 采 `uptime_after`。证据:`hilog_capture.txt`、`device_cmds.txt`、
`run_meta.txt`(nonce/uptime/marker)。

## 通过条件
抓取文本含**本次 nonce** **且** 含 `--marker` **且** `uptime_after > uptime_before > 0`
**且** 部署命令全 exit 0。

## ⚠️ 真机结果需人工确认(本阶段特殊)
P4 与其它阶段不同:门控产出证据为 PASS 后**不自动放行**。脚本会停下并把真机真实结果与
所有产物路径打印出来(含 hilog 抓取末尾片段),**等待人工核对真机测试结果**。编排器到这里
**必须停住、把这些真实结果与产物呈现给用户,等用户确认**,不得自行继续。

人工确认真机结果可接受后,记录 consent 再推进:
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 4 --token <审核人>
python3 $S/advance.py --pipeline-dir "$PDIR" advance  --phase 4
```
`advance --phase 4` 在没有 phase-4 consent 时会 **HOLD**(打印复核指引,不推进);
有 consent 且证据 PASS 才推进到 P5。consent 也是 `pipeline.json` 状态、由 `advance.py` 写。
