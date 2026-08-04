# 增量构建与刷机 skill 实战

> 从 `ohos-build-flash` 提炼:增量构建、updater 模式刷机、send + dd 路径、刷后验证。

## 适合何时调用

- P2(物理 phase 4)编译阶段:增量构建产物
- P4(物理 phase 6)真机阶段:部署到设备
- 镜像刷机:当失败与设备镜像版本相关时

## 增量构建

只重编改动部件及其依赖,避免全量重编:

- 基于 base_commit 确定改动范围
- 配合 `ohos-dev-build-execution-diagnosis` 定位失败
- 产物供 P4 部署到真机

## updater 模式刷机

当需要刷整个镜像(updater 模式):

```bash
hdc file send <镜像包> /data/updater
# 设备侧 updater 流程
```

适用场景:设备镜像版本过旧、系统组件大范围更新。

## send + dd 路径

系统组件替换的底层路径:

```bash
hdc shell mount -o rw,remount /
hdc file send <新组件> /data/local/tmp/
hdc shell dd if=/data/local/tmp/<组件> of=<系统路径>
```

用于替换 `/system` 分区下的系统组件(如 hiview 插件)。

## 刷后验证

刷机/部署后的验证:

1. **sha256 一致**:主机产物与设备实际文件 sha256 校验
2. **进程加载证明**:`/proc/<pid>/exe\|maps` 真加载了 `artifact_loaded`
3. **scenario 触发**:从真实入口触发改动代码,输出 marker
4. **hilog 抓取**:含本次 nonce + 功能 marker + runtime marker + e2e marker

## 与 workflow 配合

| 阶段 | skill | 做什么 |
|---|---|---|
| P4 编译 | `ohos-build-flash` | 增量构建产物 |
| P6 端到端功能测试 | `ohos-build-flash` + `ohos-dev-hdc-command-usage` | 部署到设备 + scenario + hilog |

## 常见误区

- **以为部署完就 PASS**:不够,还要 sha256 一致 + hilog 含 nonce/marker + 抗伪造三层
- **hash 不一致**:确认 host-artifact 是本次构建产物、device-artifact 是部署后设备实际文件
- **忘了刷后 sha256 校验**:gate_device_func 会校验,不一致即 FAIL

## 延伸阅读

- [P6 端到端功能测试阶段](/workflow/phase-6-device) — 真机门控与抗伪造三层
- [真机调试 hdc](/skill-playbooks/device-debug-and-hdc) — 与 build-flash 的协作
- [编译与诊断](/skill-playbooks/build-and-diagnosis) — build-flash 在 P2 的角色
- [真机验证示例](/examples/device-verification-example) — deploy + scenario + marker
