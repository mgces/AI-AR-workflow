# P6 端到端功能测试

> 本页拆解 P6(物理 phase 6)端到端阶段如何理解、deploy/scenario/runtime/e2e marker、为什么必须人工确认、hdc skill 与 flash skill 怎样协作。

## 端到端阶段如何理解

P6 是端到端功能验证阶段——把编译产物部署到真机,跑 scenario 脚本从真实入口触发改动代码,抓取真机 hilog 证明功能真的在设备上跑起来了。门控脚本 `gate_device_func.py`(emit 6)。

> 📌 P5 与 P6 都在**真机**上跑,区别是"单元 vs 端到端",不是"离线 vs 真机"。P5 白盒逐个 gtest 验单元逻辑;P6 黑盒从真实入口触发验端到端功能 + 抗伪造 + 人工确认(见 [P5 单元测试](/workflow/phase-5-test-ut))。

设备 RTC 错乱,新鲜度不靠时间戳,而靠 per-run **nonce** + `/proc/uptime` 单调锚 + 内容切窗 + sha256。

## deploy/scenario/runtime/e2e marker

`gate_device_func.py` 的关键参数:

```bash
gate_device_func.py --pipeline-dir P \
    [--deploy-script f] --scenario-script f --marker M \
    --host-artifact F --device-artifact P \
    --runtime-marker M --e2e-marker M [--phase 6|7]
```

- **deploy-script**:部署脚本(把 host-artifact 推到 device-artifact 路径)
- **scenario-script**:场景脚本(从真实入口触发改动代码,输出 marker)
- **host-artifact**:本次构建产物(主机侧)
- **device-artifact**:部署后设备实际文件
- **runtime-marker**:成功路径运行时标记
- **e2e-marker**:端到端标记

四类 marker 契约:

| marker | 含义 |
|---|---|
| 功能 marker | scenario 脚本输出的功能验证标记 |
| runtime-marker | 成功路径运行时标记 |
| e2e-marker | 端到端标记 |
| nonce | per-run 防重放标记(`$GATE_NONCE`) |

## 抗伪造三层证明

真机功能不再只认"日志里出现过 marker",而是叠加三层抗伪造:

| 层 | 证明什么 |
|---|---|
| ① 进程溯源 | marker 命中行绑定 PID,校验进程名与契约 `device_cases[].process` 一致、且 `/proc/<pid>/exe\|maps` 真加载了 `artifact_loaded` |
| ② 副作用断言 | `side_effect` 的 `shell_assert` 命令实跑并比对期望 |
| ③ 负对照差分 | 按 `absent_before_trigger` 切 baseline/trigger 窗口,marker 若在触发前已出现即 FAIL |

证据优先级:进程溯源 > artifact_loaded > side_effect > baseline/trigger 差分 > runtime/e2e marker > 纯文本 marker。

## 为什么必须人工确认

P6 证据 PASS 后**不自动放行**——必须停下,把真实结果与所有产物路径呈现给用户,等用户确认:

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 6 --token <人>
```

没令牌时 `advance` 会 HOLD。这是为了确保真机真实结果被人工核对,不是脚本"看起来通过"。

通过后渲染 `reports/device_functional.md` + `reports/test_report.md`(P5 单元测试 + P6 端到端关键证据聚合)。

## hdc skill 与 flash skill 怎样协作

- [`ohos-dev-hdc-command-usage`](/skill-playbooks/device-debug-and-hdc):设备连接、target 选择、日志抓取、文件推送、系统组件替换
- [`ohos-build-flash`](/skill-playbooks/build-and-flash):增量构建 + updater 模式刷机 + send/dd 路径

真机阶段常见路径:build-flash 产增量构建 → hdc 部署到设备 → scenario 触发 → hdc 抓 hilog → gate 校验。

## 顺序边界

P6 在 P5 单元测试之后、P7 质量之前:

```
P5 单元测试 → P6 端到端功能测试 → consent → P7 质量验证
```

## 常见误区

- **抓取里没有 nonce**:scenario 脚本要让组件把 `$GATE_NONCE` 打进设备日志(`hilog`/`log -t … NONCE=$GATE_NONCE`),否则无法证明日志是本次的
- **缺 runtime/e2e marker 或 hash 不一致**:scenario 必须从真实入口触发改动代码,并在成功路径输出 marker;同时确认 host/device-artifact 是本次产物/部署后文件
- **以为日志有 marker 就 PASS**:不够。还要抗伪造三层证明(进程溯源 / 副作用断言 / 负对照差分)

## 延伸阅读

- [Skill 实战:真机调试 hdc](/skill-playbooks/device-debug-and-hdc)
- [Skill 实战:增量构建与刷机](/skill-playbooks/build-and-flash)
- [真机验证示例](/examples/device-verification-example) — deploy/scenario/marker 思路
- [门控契约](/reference/gate-contract) — gate_device_func 抗伪造三层细节
