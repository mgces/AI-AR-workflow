# P4 编译验证(build-verify,物理 phase 4)

## 做事(调用现有技能)
- 构建与失败诊断:`ohos-dev-build-execution-diagnosis`(读 `out/rk3568/build.log` / `error.log`)。
- 需要刷机/部署辅助时:`ohos-build-flash`。
- 编码规范 AST 复检:`code-ruleset-style-check`(`--clang-tidy`)——编译成功后由门控自动接入,见下。

> 💡 **迭代编译加速(`--fast-rebuild`,HarmonyOS 已验证)**:P2↔P4 反复改源码重编时,若
> **同时满足** ①同一个 `--build-target` ②本轮只改了 `.c/.cpp/.h` 源码、没碰任何
> `BUILD.gn`/`.gni`/`bundle.json` ③该 target 之前已成功编过(有 out 缓存),可在**编译命令末尾**
> 追加 `--fast-rebuild` 跳过 GN/preloader 直接进 ninja 增量,省几分钟。三条件详解与命令样例见
> `ohos-build-flash` §1.1。
> - **门控编译本身不加此标**:`gate_build.py` 取环境 profile 的**完整命令**跑,保证权威结果不受
>   增量假设影响。`--fast-rebuild` 只用于门控之前你自己**快速试编、定位编译错误**的迭代循环。
> - ⚠️ 动了 GN / 换了 target / 首次编 / out 被清过 → **不要加**(会漏 GN 重生成致结果不一致)。
>   ⚠️ **OpenHarmony/rk3568 `build.sh` 尚未实测**是否支持,未验证前别默认在 rk3568 上加。

## 门控
```bash
python3 $S/gate_build.py --pipeline-dir "$PDIR"   # target 默认取 pipeline.json 的 build_target
# 或临时指定:--target <gn_target>
```
脚本逻辑:记录 `build.log` 启动前字节偏移 → 跑**环境 profile 解析出的编译命令**
(openharmony 为 `./build.sh --product-name rk3568 --ccache --build-target <target>`;
HarmonyOS 系统/芯片组件为各自命令,**占位未填时门控硬失败并提示在 `lib/environments.py` 填充**)→
在本次输出中记录成功/错误横幅；**exit code + 新产物是权威证据，成功横幅仅作辅助诊断**，避免工具链
文案变化把真实成功误判为失败；error 横幅仍与 rc=0 矛盾并阻塞。随后从签名 AR_design 取契约
`build_artifacts`,**逐个校验产物文件真的已编译出**
(路径先按相对仓根找,再回退环境产物目录 `<out_dir>/<rel>`,openharmony 为 `out/rk3568/`),缺任一即 FAIL,
写 `evidence/phase4/artifact_check.txt` 列出命中/缺失。失败时从新尾部蒸馏
`ninja: build stopped`/`FAILED:`/`ERROR at`/`[OHOS ERROR]` 到 `error_distill.txt`。
证据:`build_stdout.log`、`build_banner.txt`、`artifact_check.txt`(、`error_distill.txt`)。
契约缺失(legacy/`--allow-missing-contract`)→ 跳过产物覆盖并留 bypass 标;契约被篡改 → FAIL。

### 编译成功后的静态子步
编译成功后，门控从真实构建输出生成 `compile_commands.json`，紧接着运行 clang-tidy AST 复检。
(这类规则正则判不了,又依赖编译数据库,所以放在 P4 而非 P2/P3):
- 生成编译数据库:`ninja -C out/rk3568 -t compdb cc cxx > out/rk3568/compile_commands.json`
  (优先用 `prebuilts/build-tools/linux-x86/bin/ninja`,回退 PATH 上的 ninja)。
- 对真实 Git diff 中的 C/C++ 文件（包含 P3 新增测试）调用
  `code_ruleset_guard.py --clang-tidy out/rk3568 --json evidence/phase4/clang_tidy_findings.json`。
- **只有 `gatelib.P4_CRITICAL_AST_RULESET_IDS` 命中才阻断 P4**：
  `G.RES.07-CPP`、`G.FUU.11`、`G.VAR.01`、`G.EXP.08-CPP`、`G.STD.04-CPP`、
  `G.EXP.12-CPP`、`G.INT.03`。
- **其他 clang-tidy/内容 finding 仅留证**：写入本轮 JSON 与 `clang_tidy_note.txt`，
  不再触发 P4 FAIL，由 P8 review / 远端 CI 裁决。
- **工具链不可用必须 fail-closed**：ninja/clang-tidy 缺失、compdb 生成失败、超时、
  异常退出、报告缺失/不可读、诊断不可解析，均产生阻断的 `clang-tidy-backend` 状态；
  不再有旧运行的 advisory 放行路径，也不能把"未执行"当成"零告警"。
- metric 子步仍在 P4 执行并写入 `metric_findings.json`，但仅是观察证据，不再阻断 P4。
证据:`evidence/phase4/clang_tidy_findings.json` + `clang_tidy_note.txt` + `metric_findings.json`。

`phase_summary.json` 分别输出 `compile_execution`、`artifact_verification`、`static_analysis` 和
`phase_verdict`，因此“BUILD PASS; STATIC ANALYSIS FAIL”不会再显示成含糊的“构建失败”。

### 本轮静态报告与后端错误

每次 clang-tidy 扫描前先移除旧报告，仅本次生成的有效 JSON 可以证明扫描结果。
报告缺失、无效、扫描器异常退出、超时或无法解析的 checker 诊断均返回
`clang-tidy-backend` 阻断，由 P4 记录 FAIL 与诊断证据；不能沿用旧报告或把异常当作零告警。
报告内真实 findings 优先于附带的工具说明，说明不能掩盖已发现的问题。
签名证据只引用实际存在的本轮文件；note 记录扫描是否执行及非阻断观察数量。

预检 `workflow_checks.py` 仍执行静态扫描并写入 `preflight_history`，但
`author-rules` / `early-metrics` / `file-hygiene` 不再阻断阶段；工具与 compdb
探测仍按原规则阻断。

## 通过条件
build.sh exit 0 **且** 无 error 横幅
**且** 契约声明的全部 `build_artifacts` 都在产物中存在(全量覆盖硬门控)
**且** clang-tidy 静态子步可执行且无 critical/backend 命中；
非白名单 finding 与 metric 仅是观察证据，不构成通过条件。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 4
```
