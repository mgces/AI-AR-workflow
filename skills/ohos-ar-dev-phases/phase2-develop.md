# P2 代码开发(feature-develop,物理 phase 2)

功能代码开发是独立物理阶段。前置是**已签名的 P1 设计 + P1 设计 consent**。
本阶段闭合门为 `gate_develop.py`(签名 `emit(phase 2)`)。

## 做事(调用现有技能)
- 系统能力/SA:`ohos-dev-sa-codegen`。NAPI 模块:`ohos-dev-napi-module`。
- 编码规范:`code-ruleset-style-check`（规则来源为 `code_ruleset` C++ 门禁表）。门控会强制执行可机器判断的硬规则。
- 若该 AR 有可测行为,优先 `tdd-enforcer`:先写失败测试,再写实现(真机在 P6 验证)。
- 依据 `$PDIR/AR_design.md` 的"完整代码框架"落实代码改动到 `$OHOS_ROOT` 下相应组件。
- **写码脚手架**:hiview 插件 / 单测 / 模块测试 / 模糊测试可用 `ohos-code-skeletons` 取占位符骨架
  (替换后进 P4 编译);SA/NAPI 用 `ohos-dev-sa-codegen` / `ohos-dev-napi-module`。写 AR_design
  「完整代码框架/完整测试框架」时也可直接用这些骨架的文件清单与片段填充。

## 门控
```bash
python3 $S/gate_develop.py --pipeline-dir "$PDIR"
# 强制前置:必须已有 gate_design.py 的签名 AR_design 证据,否则 FAIL(legacy run 可 --allow-missing-design,留痕)
# 强制前置:必须已有 P1 设计 consent(advance.py consent --phase 1),否则 FAIL 提示先签字
# --no-style 仅在无 C/C++ 改动时保留兼容；一旦有 C/C++ 改动会被拒绝
```
脚本逻辑:先校验已有**未被篡改**的签名 AR_design 证据(仍在物理 phase 1),再校验绑定到该签名记录的
**P1 设计 consent**(缺失/因重跑 gate_design 而 stale 都 FAIL);首跑把当前 HEAD 记为 `base_commit`;之后取
`git diff base..工作树` 并额外纳入 `git ls-files --others --exclude-standard` 的 untracked 文件,要求变更非空;对改动的 C/C++ 文件强制跑
`code_ruleset_guard.py`;同时执行来自 `code_ruleset` C++ 门禁表的可机器判断硬规则
(如禁用 `#pragma once`、头文件 `using namespace`、`.hpp/.cc/.cxx`、`NULL`、`system()/popen()`、默认 lambda 捕获)。
依赖脚本或 skill 缺失、手动传 `--no-style` 绕过、任一硬规则命中都会 FAIL。
证据:`diff.patch`、`changed_files.txt`、`style_report.txt`、`strict_cpp_report.txt`。

## 通过条件
已有签名 AR_design **且** 已有绑定该签名的 P1 设计 consent **且** 相对 `base_commit` 有 tracked 或
untracked 改动 **且** 格式 guard 与强规则检查都通过。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 2
```
**P2 闭合时锁定功能指纹**(只对**非测试路径**内容算 sha256,相对 base、commit 无关)+ `locked_all_paths`
(此刻的全量路径基线)。语义正是"功能开发完、写测试前冻结功能代码"。此后 P3–P8 任一**功能代码/配置内容**
漂移都会被 `advance` 拒绝(`check_code_drift` 从 phase 3 起生效);测试文件留到 P3 新增(见 phase3-test-develop)。
推进到物理 phase 3(test-develop)。
