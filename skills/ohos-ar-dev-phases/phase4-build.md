# P4 编译验证(build-verify,物理 phase 4)

## 做事(调用现有技能)
- 构建与失败诊断:`ohos-dev-build-execution-diagnosis`(读 `out/rk3568/build.log` / `error.log`)。
- 需要刷机/部署辅助时:`ohos-build-flash`。
- 编码规范 AST 复检:`code-ruleset-style-check`(`--clang-tidy`)——编译成功后由门控自动接入,见下。

## 门控
```bash
python3 $S/gate_build.py --pipeline-dir "$PDIR"   # target 默认取 pipeline.json 的 build_target
# 或临时指定:--target <gn_target>
```
脚本逻辑:记录 `build.log` 启动前字节偏移 → 跑**环境 profile 解析出的编译命令**
(openharmony 为 `./build.sh --product-name rk3568 --ccache --build-target <target>`;
HarmonyOS 系统/芯片组件为各自命令,**占位未填时门控硬失败并提示在 `lib/environments.py` 填充**)→
只在**新追加的尾部**找该环境的成功横幅(openharmony:`=====build rk3568 successful=====`),且无 error 横幅,
且 build.sh exit 0。成功后从签名 AR_design 取契约 `build_artifacts`,**逐个校验产物文件真的已编译出**
(路径先按相对仓根找,再回退环境产物目录 `<out_dir>/<rel>`,openharmony 为 `out/rk3568/`),缺任一即 FAIL,
写 `evidence/phase4/artifact_check.txt` 列出命中/缺失。失败时从新尾部蒸馏
`ninja: build stopped`/`FAILED:`/`ERROR at`/`[OHOS ERROR]` 到 `error_distill.txt`。
证据:`build_tail.log`、`build_banner.txt`、`artifact_check.txt`(、`error_distill.txt`)。
契约缺失(legacy/`--allow-missing-contract`)→ 跳过产物覆盖并留 bypass 标;契约被篡改 → FAIL。

### 编译成功后的 clang-tidy 子步(有 compdb 硬控 / 缺失降级)
编译一旦成功,`compile_commands.json` 立即可得,门控**紧接着**跑一遍 clang-tidy AST 复检
(这类规则正则判不了,又依赖编译数据库,所以放在 P4 而非 P2/P3):
- 生成编译数据库:`ninja -C out/rk3568 -t compdb cc cxx > out/rk3568/compile_commands.json`
  (优先用 `prebuilts/build-tools/linux-x86/bin/ninja`,回退 PATH 上的 ninja)。
- 对 P2 锁定的 changed C/C++ 文件调
  `code_ruleset_guard.py --clang-tidy out/rk3568 --json evidence/phase4/clang_tidy_findings.json`。
- **compdb 生成成功 + clang-tidy 在 PATH → findings 非空则 P4 FAIL**(与编译失败同级硬控,需改代码回 P2 重走)。
- **compdb 生成失败 / clang-tidy 不在 PATH → 降级 advisory**:写 `evidence/phase4/clang_tidy_note.txt`,
  P4 仍 PASS(fail-open),note 里明说"clang-tidy 未执行,CI 仍会扫此类问题"。
证据:`evidence/phase4/clang_tidy_findings.json` + `clang_tidy_note.txt`。

## 通过条件
build.sh exit 0 **且** 成功横幅在本次启动后的尾部出现 **且** 无 error 横幅(防旧日志冒充)
**且** 契约声明的全部 `build_artifacts` 都在产物中存在(全量覆盖硬门控)
**且** clang-tidy 子步通过(有 compdb 时 findings 为空;compdb/工具缺失时降级放行并在证据里标注)。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 4
```
