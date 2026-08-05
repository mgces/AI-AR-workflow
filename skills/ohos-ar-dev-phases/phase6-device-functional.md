# P6 端到端功能测试(device-functional,物理 phase 6)

> 📌 P5 单元测试与本阶段都在**真机**上跑;区别是 P5 逐个 gtest 验单元逻辑,P6 从真实入口触发验
> 端到端功能(marker + 产物 sha256 + 抗伪造 + 人工确认)。"真机"不是本阶段独有,端到端才是。

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

## ❓ 组件"没有 hilog 输出"怎么办(弱模型高频质疑,照此走勿绕门)
> ⏫ **本应在 P1 就想清楚**:marker 的运行时来源应在 **P1 DFX设计章节 + `device_cases[].observability`**
> 声明好(见 `phase1-design.md`)。走到 P6 才发现"组件没日志、marker 不知从哪来" = P1 设计不完整,
> **首选 `advance.py reset` 回 P1 补 DFX 设计**,而非在 P6 现编或绕门。下面是补救决策树。

门控 `ok = marker_seen and …`(`gate_device_func.py`),**真机日志里命中一行 marker 是唯一硬锚,不可绕过**。
但这一行 marker **不是、也不该由"测试用例"来打**:它不是"测试通过标记",而是**把这次真机运行钉在
本台设备、本次 nonce、目标进程上**的运行时痕迹(marker 行的 PID 还会反查进程身份/加载的 so)。
所以它必须来自**真实运行时路径**,不能是脚本里写死的字面量(`find_marker_literals` 就是防这个)。

先分清层级:**P5 单元测试**证明"逻辑对"(gtest/ArkTS 报告,不碰 hilog);**P6 端到端**证明
"组件在真机上被真实触发、真的跑了那条路径"。"组件没 hilog" ≠ "不用验 hilog",而是"这次真机运行
当前不可观测"。按下面三种情况取一,**都不是去掉 hilog 校验**:

- **情况 1 — 组件有成功路径、只是没打日志 → 在成功路径补一行 HILOG(首选)。**
  这是正经的可观测性改进,不是给门控开后门:
  ```cpp
  HILOG_INFO(LOG_CORE, "AR_E2E_OK nonce=%{public}s", nonce.c_str());  // nonce 由 $GATE_NONCE 注入并回读
  ```
  marker 由真实成功分支发出,防伪三锚(nonce + 时间窗 + /proc/uptime)全部成立。
  ⚠️ 改了组件**功能代码** → 按 workflow 护栏 6 必须 `advance.py reset` 回 P1 重走。
- **情况 2 — 组件确实"沉默"(纯数据/纯计算,无合理日志点)→ 用 side_effect/process/artifact 作证,
  marker 只当锚,组件一行日志都不用加。** 契约 `device_cases[]` 除 `marker` 外支持更强维度:
  `side_effect`(真实副作用:读文件/属性/端口)、`process`(marker 行 PID 命中目标进程)、
  `artifact_loaded`(目标进程 maps 里加载了你编的 so)。真正的功能断言落在这些维度上;门控要的
  那行 marker 由 **scenario 片段**在"真实触发组件之后"打出(见上节:场景必须触发真实入口并把
  `$GATE_NONCE` 写进设备日志),marker 只负责锚定 nonce/PID/时间窗。
- **情况 3 — 让 ArkTS/Hypium app-test 当发日志者 → 可以,但它必须"真跑组件"而非自证。**
  判据只有一条:**marker 源自被测组件被拉起后的真实运行时路径**,而非测试脚本里 `console.log('passed')`
  式的自说自话。谁触发的不重要,marker 来自哪条路径才重要。

> 一句话:P6 要的不是"测试系统写 hilog",是"**被测组件在真机上真的跑起来了**"这个事实的运行时痕迹。
> 让它变可观测(情况 1)或用真实副作用作证(情况 2),**不要**去掉 hilog 校验——那是防伪设计,非可选项。

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
读设备墙钟 `dev_now`(baseline/start 边界)→ 跑 scenario → 再读 `dev_now`(end 边界)→
`hilog -x` 抓取 + 采 `uptime_after`。**触发窗口用时间戳分窗**:只保留自身时间戳落在
`[start, end]` 内的 hilog 行(不再注入 `log` fence——OHOS 无 `log`,且 hdc 远端失败仍
rc=0;时钟读不出/非单调即 FAIL-closed,靠输出形状而非退出码)。另从签名 AR_design 取契约
`device_cases[].marker`,要求抓取文本**含每一个契约 marker**(全量覆盖硬门控),并对
deploy/scenario 脚本跑 `find_marker_literals` 防止把契约 marker 硬写进脚本混过覆盖。证据:
`hilog_capture.txt`、`device_cmds.txt`、`run_meta.txt`
(nonce/uptime/marker/runtime_marker/e2e_marker/window_start·window_end 时间戳边界)、
`artifact_runtime_proof.txt`、`device_marker_coverage.txt`(契约 marker 命中/缺失)。
契约缺失(legacy)→ 跳过覆盖;契约被篡改 → FAIL。

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
门控证据(签名,机器验)落在 `evidence/`;**人读 Markdown 报告**渲染到并列的 `reports/`:
```bash
python3 "$AGENT_SKILLS_DIR/ohos-ar-dev-workflow/scripts/render_report.py" \
    --pipeline-dir "$PDIR" --kind device
```
产出**单个** `reports/device_functional.md`(真机完整报告:nonce/marker/e2e、hilog 片段、
产物 sha256 一致,全部聚合进这一个 md)。渲染文本经脱敏;渲染失败不影响门控 verdict。

P5 单元测试 + P6 端到端都通过后,再渲染**测试用例报告**(P5 单元测试执行结果 + P6 端到端关键证据点聚合,
供人快速判断"测试是否真过了、关键证据点是什么";device_functional.md 仍为端到端完整报告):
```bash
python3 "$AGENT_SKILLS_DIR/ohos-ar-dev-workflow/scripts/render_report.py" \
    --pipeline-dir "$PDIR" --kind test
```
产出**单个** `reports/test_report.md`:P5 单元测试总体/计数/逐用例/合约覆盖 + P6 端到端总体/抗伪造与
窗口命中/nonce·marker/产物 sha256 一致/device_cases 逐项,全部聚合进这一个 md。
