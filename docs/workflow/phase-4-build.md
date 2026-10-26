# P4 编译

`openharmony-qemu` 分支经公共 QEMU 入口构建 arm64_virt，日志和产物位于 `out/arm64_virt/`。
运行实例应使用独立镜像快照，门控保留基础盘占用保护。详见 [QEMU 开发](/skill-playbooks/qemu-development)。

新运行通过 `init --optimized-checks` 启用 [优化预检](./workflow-optimization.md)。构建前检查工具及受影响矩阵；
导出符号在当前构建成功后对实际库核验，保存并签名 `evidence/phase4/symbol_checks.json`。
P4 只把 `gatelib.P4_CRITICAL_AST_RULESET_IDS` 作为静态硬门；ninja/clang-tidy/compdb/报告任一不可用
都 fail-closed，不再有 advisory 放行。metric 与非白名单 clang-tidy finding 仅签名留证。

> 本页拆解 P4(物理 phase 4)的编译目标、成功横幅和 artifact 检查、失败如何诊断、`ohos-dev-build-execution-diagnosis` 何时使用。

## 编译目标

P4 是真实编译验证阶段——真跑 `build.sh`,捕获真实输出,以退出码与产物为准,并校验契约 `build_artifacts` 全覆盖。门控脚本 `gate_build.py`(emit 4)。

> **编译命令 / 成功横幅 / 产物目录按环境 profile 解析**(`lib/environments.py`,取自 `pipeline.json` 的 `environment`):openharmony 为 `./build.sh --product-name rk3568 …` + `out/rk3568/`;openharmony-qemu 经公共 QEMU 构建入口编译 `arm64_virt` + `out/arm64_virt/`;HarmonyOS 系统/芯片组件命令不同且**目前为占位**,占位未填时 P4 **硬失败并打印"待填"提示**,绝不静默跑错。门控不再写死 rk3568。

## 成功横幅和 artifact 检查

`gate_build.py` 通过条件:

- `build.sh` exit 0
- 无 error 横幅；成功横幅仅作诊断，不作为独立硬条件（避免工具链文案变化误判）
- 契约 `build_artifacts` 全部编译出(全量覆盖硬门控)
- clang-tidy 静态子步可执行且无 critical/backend 命中；非白名单 finding 与 metric 仅观察留证

产物落 `$PDIR/evidence/phase4/`:

- `build_stdout.log` — 本次 build.sh stdout/stderr
- `build_banner.txt` — 抽出的成功横幅诊断
- `artifact_check.txt` — 契约 build_artifacts 覆盖检查
- `clang_tidy_findings.json`、`clang_tidy_note.txt` — 本轮静态检查与执行状态
- `metric_findings.json` — 度量的观察证据
- 失败时加 `error_distill.txt` — 蒸馏的 error 行

## 失败如何诊断

门控已改为捕获 build.sh stdout 并用正则判定横幅——因为 build.sh 横幅打在 stdout,而环境产物目录下的 `build.log`(openharmony 为 `out/rk3568/build.log`)可能轮转或为空。

读 `$PDIR/evidence/phase4/build_stdout.log` 与 `error_distill.txt` 真实日志定位,修复后重跑门控(≤3 次),仍失败停下报告。

## ohos-dev-build-execution-diagnosis 何时使用

[`ohos-dev-build-execution-diagnosis`](/skill-playbooks/build-and-diagnosis) 技能在 P4 帮助定位 build.log 失败分析,典型场景:

- 编某个 target
- 定位 build.log
- 全量整编
- 局部失败后如何 narrow rebuild
- 镜像刷机什么时候需要(配合 [`ohos-build-flash`](/skill-playbooks/build-and-flash))

## 静态检查后端失败

P4 先完成编译及产物校验，再执行度量与 clang-tidy。度量结果仅观察留证；clang-tidy 只阻断
`gatelib.P4_CRITICAL_AST_RULESET_IDS`（`G.RES.07-CPP`、`G.FUU.11`、`G.VAR.01`、
`G.EXP.08-CPP`、`G.STD.04-CPP`、`G.EXP.12-CPP`、`G.INT.03`）与 backend 失败。
应分别查看 `phase_summary.json` 中的编译、产物和静态分析结果。

每轮扫描先清除旧报告。ninja/clang-tidy 缺失、compdb 生成失败、扫描器异常退出、超时、
报告缺失/无效或 checker 诊断不可解析时，一律以 `clang-tidy-backend` 记录阻断；
旧的零告警报告不能证明本轮通过。其他内容 finding 写入 JSON 留证，不会被规则过滤器
当成 backend 错误，也不会反过来掩盖 backend 错误。

## 顺序边界

P4 在 P3 测试开发之后、P5 单元测试之前——阶段顺序固定,不可跳:

```
P3 测试开发 → P4 编译 → P5 单元测试
```

**Finding 1 的意义**:P3 证明"编译前测试代码已写",不闭合 P3 就到不了 P4(build)。P4 是对 P2 改的代码 + P3 写的测试一起编译验证。

## 常见误区

- **横幅没识别到**:成功横幅只作诊断；权威条件是退出码、无 error 横幅与产物。build.log 可能轮转/为空，门控改为捕获 build.sh stdout
- **build_artifacts 缺一个**:契约全量覆盖硬门控,缺任一即 FAIL
- **以为编译过就 advance**:还要无 error 横幅、artifact 覆盖齐全、clang-tidy 子步可执行且无 critical/backend 命中

## 延伸阅读

- [Skill 实战:编译与诊断](/skill-playbooks/build-and-diagnosis) — build-execution-diagnosis 详解
- [门控契约](/reference/gate-contract) — gate_build 契约细节
- [新增功能端到端示例](/examples/new-feature-end-to-end) — P4 在完整路线中的位置
- [关键命令](/reference/key-commands) — gate_build 命令速查
