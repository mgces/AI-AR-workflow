# P4 编译

> 本页拆解 P4(物理 phase 4)的编译目标、成功横幅和 artifact 检查、失败如何诊断、`ohos-dev-build-execution-diagnosis` 何时使用。

## 编译目标

P4 是真实编译验证阶段——真跑 `build.sh`,捕获真实输出,校验成功横幅与契约 `build_artifacts` 全覆盖。门控脚本 `gate_build.py`(emit 4)。

## 成功横幅和 artifact 检查

`gate_build.py` 通过条件:

- `build.sh` exit 0
- 输出含 `=====build…successful=====` 横幅
- 无 error 横幅
- 契约 `build_artifacts` 全部编译出(全量覆盖硬门控)

产物落 `$PDIR/evidence/phase4/`:

- `build_tail.log` — build.sh stdout 尾部(含横幅)
- `build_banner.txt` — 抽出的成功横幅
- `artifact_check.txt` — 契约 build_artifacts 覆盖检查
- 失败时加 `error_distill.txt` — 蒸馏的 error 行

## 失败如何诊断

门控已改为捕获 build.sh stdout 并用正则判定横幅——因为 build.sh 横幅打在 stdout,而 `out/rk3568/build.log` 可能轮转或为空。

读 `$PDIR/evidence/phase4/build_tail.log` 与 `error_distill.txt` 真实日志定位,修复后重跑门控(≤3 次),仍失败停下报告。

## ohos-dev-build-execution-diagnosis 何时使用

[`ohos-dev-build-execution-diagnosis`](/skill-playbooks/build-and-diagnosis) 技能在 P4 帮助定位 build.log 失败分析,典型场景:

- 编某个 target
- 定位 build.log
- 全量整编
- 局部失败后如何 narrow rebuild
- 镜像刷机什么时候需要(配合 [`ohos-build-flash`](/skill-playbooks/build-and-flash))

## 顺序边界

P4 在 P3 测试开发之后、P5 单测执行之前——阶段顺序固定,不可跳:

```
P3 测试开发 → P4 编译 → P5 单测执行
```

**Finding 1 的意义**:P3 证明"编译前测试代码已写",不闭合 P3 就到不了 P4(build)。P4 是对 P2 改的代码 + P3 写的测试一起编译验证。

## 常见误区

- **横幅没识别到**:build.sh 横幅打在 stdout,build.log 可能轮转/为空;门控已改为捕获 stdout 正则判定
- **build_artifacts 缺一个**:契约全量覆盖硬门控,缺任一即 FAIL
- **以为编译过就 advance**:还要校验成功横幅 + 无 error + artifact 覆盖三者齐全

## 延伸阅读

- [Skill 实战:编译与诊断](/skill-playbooks/build-and-diagnosis) — build-execution-diagnosis 详解
- [门控契约](/reference/gate-contract) — gate_build 契约细节
- [新增功能端到端示例](/examples/new-feature-end-to-end) — P4 在完整路线中的位置
- [关键命令](/reference/key-commands) — gate_build 命令速查
