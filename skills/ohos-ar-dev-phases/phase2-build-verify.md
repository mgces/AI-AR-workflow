# P2 编译验证(build-verify)

## 做事(调用现有技能)
- 构建与失败诊断:`ohos-dev-build-execution-diagnosis`(读 `out/rk3568/build.log` / `error.log`)。
- 需要刷机/部署辅助时:`ohos-build-flash`。

## 门控
```bash
python3 $S/gate_build.py --pipeline-dir "$PDIR"   # target 默认取 pipeline.json 的 build_target
# 或临时指定:--target <gn_target>
```
脚本逻辑:记录 `build.log` 启动前字节偏移 → 跑
`./build.sh --product-name rk3568 --ccache --build-target <target>` →
只在**新追加的尾部**找 `=====build rk3568 successful=====`,且无 error 横幅,且 build.sh exit 0。
成功后从签名 AR_design 取契约 `build_artifacts`,**逐个校验产物文件真的已编译出**
(路径先按相对仓根找,再回退 `out/rk3568/<rel>`),缺任一即 FAIL,写 `evidence/phase2/artifact_check.txt`
列出命中/缺失。失败时从新尾部蒸馏 `ninja: build stopped`/`FAILED:`/`ERROR at`/`[OHOS ERROR]` 到
`error_distill.txt`。证据:`build_tail.log`、`build_banner.txt`、`artifact_check.txt`(、`error_distill.txt`)。
契约缺失(legacy/`--allow-missing-contract`)→ 跳过产物覆盖并留 bypass 标;契约被篡改 → FAIL。

## 通过条件
build.sh exit 0 **且** 成功横幅在本次启动后的尾部出现 **且** 无 error 横幅(防旧日志冒充)
**且** 契约声明的全部 `build_artifacts` 都在产物中存在(全量覆盖硬门控)。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 2
```
