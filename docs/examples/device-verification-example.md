# 真机验证示例

> 给一个真机验证页面:deploy script、scenario script、marker 思路、人工 review 点。

## 场景

P4(物理 phase 6)真机功能阶段:把编译产物部署到真机,跑 scenario 触发改动代码,抓取 hilog 证明功能真的跑起来了。

## deploy script

部署脚本负责把 host-artifact 推到 device-artifact 路径:

```bash
# lib/device.sh 解析 hdc 连接(不写死 IP/序列号)
hdc file send <host-artifact> <device-artifact>
hdc shell mount -o rw,remount /        # 若替换系统组件
hdc shell sync
```

**关键**:`host-artifact` 是本次构建产物,`device-artifact` 是部署后设备实际文件——`gate_device_func.py` 会校验两者 sha256 一致。

## scenario script

场景脚本从真实入口触发改动代码,输出功能 marker:

```bash
# scenario 脚本例
hdc shell "<触发命令>"
hilog | grep -E "NONCE=$GATE_NONCE|<功能 marker>|<runtime marker>|<e2e marker>"
```

四类 marker 契约:

| marker | 含义 | 来源 |
|---|---|---|
| 功能 marker | scenario 输出的功能验证标记 | scenario 脚本 |
| runtime-marker | 成功路径运行时标记 | `--runtime-marker` |
| e2e-marker | 端到端标记 | `--e2e-marker` |
| nonce | per-run 防重放标记 | `$GATE_NONCE`(scenario 必须打进设备日志) |

## marker 思路

`gate_device_func.py` 关键参数:

```bash
gate_device_func.py --pipeline-dir P \
    --deploy-script <deploy.sh> --scenario-script <scenario.sh> --marker <功能marker> \
    --host-artifact <主机产物> --device-artifact <设备路径> \
    --runtime-marker <运行时标记> --e2e-marker <端到端标记>
```

**契约的 `device_cases[]` �驱抗伪造三层**:

1. **进程溯源**:`process` 命中行绑定 PID,校验进程名一致且 `/proc/<pid>/exe\|maps` 真加载了 `artifact_loaded`
2. **副作用断言**:`side_effect` 的 `shell_assert` 命令实跑并比对期望
3. **负对照差分**:`absent_before_trigger` 切 baseline/trigger 窗口,marker 若在触发前已出现即 FAIL

## 人工 review 点

P4 证据 PASS 后**不自动放行**——停下等人工核对:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 6 --token <人>
```

人工核对什么:

- 真机真实结果是否符合 AR 需求
- hilog 抓取的 marker 是否对应预期功能
- 部署的 sha256 与主机产物一致
- 抗伪造三层证明是否可信

通过后渲染 `reports/device_functional.md` + `reports/test_report.md`(P5 单测 + P6 真机关键证据聚合)。

## 常见误区

- **抓取里没有 nonce**:scenario 必须把 `$GATE_NONCE` 打进设备日志(`hilog`/`log -t … NONCE=$GATE_NONCE`)
- **缺 runtime/e2e marker**:scenario 必须从真实入口触发,并在成功路径输出 marker
- **hash 不一致**:确认 host-artifact 是本次构建产物、device-artifact 是部署后设备实际文件
- **以为日志有 marker 就 PASS**:不够,还要抗伪造三层证明

## 延伸阅读

- [P6 真机功能阶段](/workflow/phase-6-device) — 抗伪造三层与人工确认
- [Skill 实战:真机调试 hdc](/skill-playbooks/device-debug-and-hdc) — hdc 连接与抓取
- [Skill 实战:增量构建与刷机](/skill-playbooks/build-and-flash) — 部署到设备
- [门控契约](/reference/gate-contract) — gate_device_func 契约细节
