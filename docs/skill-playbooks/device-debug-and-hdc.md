# 真机调试 hdc skill 实战

> 围绕 `ohos-dev-hdc-command-usage`:设备连接、target 选择、日志抓取、文件推送、系统组件替换,以及真机阶段常见路径。

## 适合何时调用

- P4(物理 phase 6)真机功能阶段:部署 + scenario 触发 + hilog 抓取
- 真机排障:连接失败、Empty/Unauthorized/Offline/日志抓取、crash/tombstone 检索
- 多设备管理:序列号选择、TCP target、sandbox 访问
- HAP/HSP/APP 安装卸载

## 设备连接

`lib/device.sh` 按优先级解析,不写死任何机器特定值:

| 项 | 解析顺序 |
|---|---|
| hdc 二进制 | `$HDC_BIN` → PATH 的 `hdc` → `~/.local/hdc/hdc` |
| hdc server | `$HDC_HOST_OVERRIDE` → `$HDC_WIN_PORT`(WSL 默认网关 IP:端口) → 原生 hdc |
| 设备序列号 | `$DEVICE_SERIAL` → `hdc list targets` 唑一目标 |

三种典型场景:

- **原生 USB 的 Linux**:开箱即用
- **WSL→Windows hdc 桥接**:`export HDC_WIN_PORT=10086`(IP 自动从默认网关取)
- **远端/多设备**:`export HDC_HOST_OVERRIDE=<ip:port>` 和/或 `export DEVICE_SERIAL=<serial>`

## 真机阶段常见路径

### 部署
```bash
hdc file send <host-artifact> <device-artifact>
```

### scenario 触发
从真实入口触发改动代码,输出功能 marker / runtime-marker / e2e-marker。

### hilog 抓取
```bash
hilog | grep -E "NONCE=$GATE_NONCE|<marker>"
```

scenario 必须让组件把 `$GATE_NONCE` 打进设备日志,否则无法证明日志是本次的。

### 系统组件替换
```bash
hdc shell mount -o rw,remount /
hdc file send <新组件> <系统路径>
```

## 与 workflow 配合

| 阶段 | skill | 做什么 |
|---|---|---|
| P0 环境预检 | `lib/device.sh` | 真机在线 + 序列号回填 |
| P6 真机 | `ohos-dev-hdc-command-usage` | 部署 + scenario + hilog |
| P6 真机 | `ohos-build-flash` | 增量构建 + 部署 |

抗伪造三层证明(由 `gate_device_func.py` 校验):

1. **进程溯源**:marker 命中行绑定 PID,校验进程名与契约 `device_cases[].process` 一致
2. **副作用断言**:`side_effect` 的 `shell_assert` 实跑并比对期望
3. **负对照差分**:按 `absent_before_trigger` 切 baseline/trigger 窗口

## 常见误区

- **抓取里没有 nonce**:scenario 必须把 `$GATE_NONCE` 打进设备日志
- **缺 runtime/e2e marker 或 hash 不一致**:scenario 必须从真实入口触发,输出 marker;确认 host/device-artifact 是本次产物/部署后文件
- **以为日志有 marker 就 PASS**:不够,还要抗伪造三层证明

## 延伸阅读

- [P6 真机功能阶段](/workflow/phase-6-device) — 抗伪造三层与人工确认
- [增量构建与刷机](/skill-playbooks/build-and-flash) — 与 hdc 的协作
- [真机验证示例](/examples/device-verification-example) — deploy/scenario/marker 思路
- [关键命令](/reference/key-commands) — hdc 常用命令速查
