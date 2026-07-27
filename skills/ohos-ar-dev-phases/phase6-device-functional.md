# P6 真机功能测试(device-functional,物理 phase 6)

`gate_device_func.py` 签名 `emit(phase 6)`(默认 `--phase 6`;集成复用时 `--phase 7`,见 phase7-quality)。

## 做事(调用现有技能)
- 部署改动到真机:`ohos-build-flash`(remount rw → `file send` → `restorecon` → 重启守护
  `kill -9 $(pidof <svc>)`)。
- 设备交互/抓日志命令:`ohos-dev-hdc-command-usage`。

## 准备两个 bash 片段(由你按组件写,门控逐字执行并留痕)
- **deploy 片段**(可选):用 `dev_remount_rw`/`dev_send`/`dev_shell`(已由 device.sh 提供)
  把 `out/rk3568/...` 的产物部署到 `/system/...` 并 `restorecon`、重启守护。
- **scenario 片段**(必需):驱动真实端到端场景,不能只 `log` 一个成功字符串。必须从真实入口触发,
  例如真实 API/SA IPC/ArkTS 调用/hdc shell 命令/系统事件注入/配置变更后重启服务等,让改动代码
  在设备进程里实际执行。环境变量 `$GATE_NONCE` 已导出,必须让组件或场景把它打进设备日志。
- **真实运行证明**(必需):提供主机侧构建产物路径与设备侧部署路径。门控会在 deploy 后对设备文件
  执行 `sha256sum`,并与主机产物 sha256 比对,证明设备上运行/加载的是本次构建产物。
- **端到端结果证明**(必需):scenario 必须产出一个只会在真实使用或注入场景成功后出现的
  `--e2e-marker`;同时产出一个只会在改动代码运行路径出现的 `--runtime-marker`。
  这两个 proof marker 不允许作为字面量出现在 deploy/scenario 脚本中,否则门控会拒绝;
  它们必须来自设备端真实运行路径或真实端到端结果。

## 门控
```bash
python3 $S/gate_device_func.py --pipeline-dir "$PDIR" \
    --deploy-script /path/deploy.sh \
    --scenario-script /path/scenario.sh \
    --marker "<功能成功标记字符串>" \
    --host-artifact "$OHOS_ROOT/out/rk3568/..." \
    --device-artifact "/system/..." \
    --runtime-marker "<改动代码运行标记>" \
    --e2e-marker "<端到端场景成功标记>"
```
脚本逻辑(RTC 无关三锚):生成 nonce → `dev_assert_online` → 采 `uptime_before` →
执行 deploy(任一命令非 0 即 FAIL)→ 对设备产物执行 `sha256sum` 并比对主机产物 sha256 →
`log -t LIFECYCLE_GATE NONCE=<n> START` → 跑 scenario → `... END` → `hilog -x` 抓取 +
采 `uptime_after`。另从签名 AR_design 取契约 `device_cases[].marker`,要求抓取文本**含每一个契约
marker**(全量覆盖硬门控),并对 deploy/scenario 脚本跑 `find_marker_literals` 防止把契约 marker
硬写进脚本混过覆盖。证据:`hilog_capture.txt`、`device_cmds.txt`、`run_meta.txt`
(nonce/uptime/marker/runtime_marker/e2e_marker)、`artifact_runtime_proof.txt`、
`device_marker_coverage.txt`(契约 marker 命中/缺失)。契约缺失(legacy)→ 跳过覆盖;契约被篡改 → FAIL。

## 通过条件
部署命令全 exit 0 **且** 主机产物 sha256 == 设备产物 sha256 **且** 抓取文本含**本次 nonce**
**且** 含 `--marker` **且** 含 `--runtime-marker` **且** 含 `--e2e-marker`
**且** 含契约声明的**每一个 `device_cases[].marker`**(全量覆盖)
**且** `uptime_after > uptime_before > 0`。同时 `--runtime-marker`/`--e2e-marker` 及契约 device
marker 都不得写死在 deploy/scenario 脚本中。缺少任一项即 FAIL。

## ⚠️ 真机结果需人工确认(本阶段特殊)
P6 与多数阶段不同:门控产出证据为 PASS 后**不自动放行**。脚本会停下并把真机真实结果与
所有产物路径打印出来(含 hilog 抓取末尾片段),**等待人工核对真机测试结果**。编排器到这里
**必须停住、把这些真实结果与产物呈现给用户,等用户确认**,不得自行继续。

人工确认真机结果可接受后,记录 consent 再推进:
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 6 --token <审核人>
python3 $S/advance.py --pipeline-dir "$PDIR" advance  --phase 6
```
`advance --phase 6` 在没有 phase-6 consent 时会 **HOLD**(打印复核指引,不推进);
有 consent 且证据 PASS 才推进到 P7。consent 也是 `pipeline.json` 状态、由 `advance.py` 写。

## 生成人读报告(证据/报告分离)
门控证据(签名,机器验)落在 `evidence/`;**人读 HTML 报告**渲染到并列的 `reports/`:
```bash
python3 "$AGENT_SKILLS_DIR/ohos-ar-dev-workflow/scripts/render_report.py" \
    --pipeline-dir "$PDIR" --kind device
```
产出 `reports/device_functional.html`(真机完整报告:nonce/marker/e2e、hilog 片段、
产物 sha256 一致)。渲染文本经脱敏;渲染失败不影响门控 verdict。
