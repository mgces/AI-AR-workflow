# 编译与诊断 skill 实战

> 围绕 `ohos-dev-build-execution-diagnosis` + `ohos-build-flash`:典型场景包括编某个 target、定位 build.log、全量整编、局部失败后 narrow rebuild、镜像刷机什么时候需要。

## ohos-dev-build-execution-diagnosis

用于执行或诊断 OpenHarmony 编译,包括完整代码/测试/SDK/host/最小模拟器/全量模拟器/部件独立编译/测试列表、定向组件/测试构建、快速重建、hb 独立构建、build.log 失败分析。

### 典型场景

| 场景 | 用法 |
|---|---|
| 编某个 target | 指定 `--build-target` 跑 build.sh |
| 定位 build.log | 抓 `out/rk3568/build.log` 失败行,分析根因 |
| 全量整编 | 不指定 target,全量编译 |
| 局部失败后 narrow rebuild | 只重编失败部件,避免全量 |
| 镜像刷机 | 配合 `ohos-build-flash` 增量构建 + updater 刷机 |

### 何时使用

- P2(物理 phase 4)编译阶段:真跑 build.sh,捕获成功横幅
- 编译失败排查:读 build.log 定位,修复后重跑门控
- 修复窗口(Repair):新窗口修复,bundle revision 升级

## ohos-build-flash

增量构建 + updater 模式刷机 + send/dd 路径,详见 [增量构建与刷机](/skill-playbooks/build-and-flash)。

与 `ohos-dev-build-execution-diagnosis` 的协作:

- 编译阶段:diagnosis 跑构建,flash 备增量产物
- 真机阶段:flash 部署到设备,diagnosis 不参与

## 与 workflow 配合

| 阶段 | skill | 做什么 |
|---|---|---|
| P4 编译 | `ohos-dev-build-execution-diagnosis` | 跑 build.sh,捕获横幅 |
| P4 编译 | `ohos-build-flash` | 增量构建产物(若需要) |
| P6 端到端功能测试 | `ohos-build-flash` | 部署到设备 |

## 典型输入输出

### 输入
- build_target(GN 构建目标)
- build.log 路径(失败时)

### 输出
- build.sh stdout(含成功横幅 `=====build…successful=====`)
- 失败时:error 蒸馏行

## 常见误区

- **build.log 横幅找不到**:build.sh 横幅打在 stdout,build.log 可能轮转/为空;门控已改为捕获 stdout 正则判定
- **以为编译过就 advance**:还要校验成功横幅 + 无 error + build_artifacts 覆盖三者齐全
- **全量重编浪费时间**:局部失败用 narrow rebuild,只重编失败部件

## 延伸阅读

- [P4 编译阶段](/workflow/phase-2-build) — gate_build 门控细节
- [增量构建与刷机](/skill-playbooks/build-and-flash) — ohos-build-flash 详解
- [Skill 组合拳](/skill-playbooks/common-combinations) — 场景 B 编译失败排查
