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
失败时从新尾部蒸馏 `ninja: build stopped`/`FAILED:`/`ERROR at`/`[OHOS ERROR]` 到
`error_distill.txt`。证据:`build_tail.log`、`build_banner.txt`(、`error_distill.txt`)。

## 通过条件
build.sh exit 0 **且** 成功横幅在本次启动后的尾部出现 **且** 无 error 横幅(防旧日志冒充)。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 2
```
