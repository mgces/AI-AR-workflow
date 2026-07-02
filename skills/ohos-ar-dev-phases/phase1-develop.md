# P1 代码开发(develop)

## 做事(调用现有技能)
- 系统能力/SA:`ohos-dev-sa-codegen`。NAPI 模块:`ohos-dev-napi-module`。
- 编码规范:`ohos-dev-cpp-coding-style` 与 `openharmony-cpp`。P1 门控会强制执行可机器判断的硬规则。
- 若该 AR 有可测行为,优先 `tdd-enforcer`:先写失败测试,再写实现(P3 会真机验证)。
- 在 `$PDIR/ar.md` 对照 AR 落实代码改动到 `$OHOS_ROOT` 下相应组件。

## 门控
```bash
python3 $S/gate_develop.py --pipeline-dir "$PDIR"
# --no-style 仅在无 C/C++ 改动时保留兼容；一旦有 C/C++ 改动会被拒绝
```
脚本逻辑:首跑把当前 HEAD 记为 `base_commit`;之后取 `git diff base..工作树` 并额外纳入
`git ls-files --others --exclude-standard` 的 untracked 文件,要求变更非空;对改动的 C/C++ 文件强制跑
`oh_cpp_guard.py --format-only`;同时执行来自 `ohos-dev-cpp-coding-style` 与 `openharmony-cpp` 的可机器判断硬规则
(如禁用 `#pragma once`、头文件 `using namespace`、`.hpp/.cc/.cxx`、`NULL`、`system()/popen()`、默认 lambda 捕获)。
依赖脚本或 skill 缺失、手动传 `--no-style` 绕过、任一硬规则命中都会 FAIL。
证据:`diff.patch`、`changed_files.txt`、`style_report.txt`、`strict_cpp_report.txt`。

## 通过条件
相对 `base_commit` 有 tracked 或 untracked 改动 **且** 格式 guard 与强规则检查都通过。P1 通过后锁定代码指纹
(组件仓 `HEAD + tracked diff + untracked 文件内容`),后续任一代码漂移都会被拒绝。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 1
```
