# P1 代码开发(develop)

## 做事(调用现有技能)
- 系统能力/SA:`ohos-dev-sa-codegen`。NAPI 模块:`ohos-dev-napi-module`。
- 编码规范:`ohos-dev-cpp-coding-style`(改完用它自查)。
- 若该 AR 有可测行为,优先 `tdd-enforcer`:先写失败测试,再写实现(P3 会真机验证)。
- 在 `$PDIR/ar.md` 对照 AR 落实代码改动到 `$OHOS_ROOT` 下相应组件。

## 门控
```bash
python3 $S/gate_develop.py --pipeline-dir "$PDIR"
# 无 C/C++ 改动时可加 --no-style
```
脚本逻辑:首跑把当前 HEAD 记为 `base_commit`;之后取 `git diff base..工作树`,要求非空;
对改动的 C/C++ 文件跑 `oh_cpp_guard.py --format-only`。证据:`diff.patch`、`changed_files.txt`、
`style_report.txt`。

## 通过条件
HEAD/工作树相对 `base_commit` 有改动 **且** 风格检查 exit 0。新鲜度锚=git SHA(与 RTC 无关)。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 1
```
