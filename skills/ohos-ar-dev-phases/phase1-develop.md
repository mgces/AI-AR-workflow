# P1 代码开发(develop)

P1 分**两个子门控**(阶段编号仍为 1):**P1a 设计固化 → P1b 代码开发**。
不先固化设计,不允许写代码。

## P1a 设计固化(gate_design.py)

先写 `$PDIR/AR_design.md`,**必须包含 6 个章节**(标题存在 + body 非空,门控确定性校验):
目标组件 / 详细功能需求 / 完整代码框架(其下含"文件清单""每文件功能""每文件代码框架"三小节)/
完整测试框架 / 需测试的功能点 / 真机测试用例构造。

**并且必须内嵌一个机器可读的 ```ar-contract``` 围栏 JSON 块**(恰好一个;下游 P2/P3/P4
据此做全量覆盖硬门控,让"编译路径"清晰、测试点/真机用例可逐项校验):
````markdown
```ar-contract
{
  "build_artifacts": ["out/rk3568/.../libfoo.z.so"],
  "test_cases":   [{"point": "处理超时", "gtest": "FooTest.HandleTimeout_001"}],
  "device_cases": [{"desc": "注入事件", "marker": "AR_DEV_CASE1_OK"}]
}
```
````
三个键均为**非空数组**:`build_artifacts` 为编译产物路径(相对仓根,或相对 `out/rk3568`);
`test_cases[].gtest` 形如 `Suite.Case`(允许 `/` 支持参数化名 `Suite/0.Case`);
`device_cases[].marker` 为真机日志里只会在该用例真实成功时出现的标记字符串。
```bash
python3 $S/gate_design.py --pipeline-dir "$PDIR"   # 默认读 $PDIR/AR_design.md
```
门控校验 6 章节 + ```ar-contract``` 块,把 AR_design.md 拷进 `evidence/phase1/AR_design.md`
并 HMAC 签名,合法契约另写签名副本 `evidence/phase1/ar_contract.json`。缺章节/空 body/缺契约块/
契约畸形(块数≠1、非法 JSON、空数组、gtest 不像 `Suite.Case`、device 项缺 desc/marker)→ FAIL。
legacy run 可 `--allow-missing-contract`(PASS 但 reason 标 `AR-CONTRACT-LEGACY-BYPASS`,不写 json)。
后续 P2–P6 的开发、测试、真机用例都**依据这份签名 AR_design 及其契约**构建。

### 人工确认(设计→开发之间的硬门控)
`gate_design.py` PASS 后**不自动进入写码**。必须由人工复核签名 AR_design 与其编译路径
(`build_artifacts`),同意后记录 P1 设计 consent,`gate_develop.py` 才放行:
```bash
# 人工复核 evidence/phase1/AR_design.md 与 ar_contract.json 后:
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase 1 --token <审核人>
```
该 consent 绑定到 gate_design 的签名记录(entry_id);**重跑 gate_design(设计变化)会作废旧
consent,需重新签字**。未签 consent 就跑 `gate_develop.py` 会 FAIL 并提示该命令。

## P1b 代码开发(gate_develop.py)

## 做事(调用现有技能)
- 系统能力/SA:`ohos-dev-sa-codegen`。NAPI 模块:`ohos-dev-napi-module`。
- 编码规范:`code-ruleset-style-check`（规则来源为 `code_ruleset` C++ 门禁表）。P1 门控会强制执行可机器判断的硬规则。
- 若该 AR 有可测行为,优先 `tdd-enforcer`:先写失败测试,再写实现(P3 会真机验证)。
- 依据 `$PDIR/AR_design.md` 的"完整代码框架"落实代码改动到 `$OHOS_ROOT` 下相应组件。
- **写码脚手架**:hiview 插件 / 单测 / 模块测试 / 模糊测试可用 `ohos-code-skeletons` 取占位符骨架
  (替换后进 P2 编译);SA/NAPI 用 `ohos-dev-sa-codegen` / `ohos-dev-napi-module`。写 AR_design
  「完整代码框架/完整测试框架」时也可直接用这些骨架的文件清单与片段填充。

## 门控
```bash
python3 $S/gate_develop.py --pipeline-dir "$PDIR"
# 强制前置:必须已有 gate_design.py 的签名 AR_design 证据,否则 FAIL(legacy run 可 --allow-missing-design,留痕)
# 强制前置:必须已有 P1 设计 consent(advance.py consent --phase 1),否则 FAIL 提示先签字
# --no-style 仅在无 C/C++ 改动时保留兼容；一旦有 C/C++ 改动会被拒绝
```
脚本逻辑:先校验已有**未被篡改**的签名 AR_design 证据,再校验绑定到该签名记录的 **P1 设计 consent**
(缺失/因重跑 gate_design 而 stale 都 FAIL);首跑把当前 HEAD 记为 `base_commit`;之后取
`git diff base..工作树` 并额外纳入 `git ls-files --others --exclude-standard` 的 untracked 文件,要求变更非空;对改动的 C/C++ 文件强制跑
`code_ruleset_guard.py`;同时执行来自 `code_ruleset` C++ 门禁表的可机器判断硬规则
(如禁用 `#pragma once`、头文件 `using namespace`、`.hpp/.cc/.cxx`、`NULL`、`system()/popen()`、默认 lambda 捕获)。
依赖脚本或 skill 缺失、手动传 `--no-style` 绕过、任一硬规则命中都会 FAIL。
证据:`AR_design.md`、`design_check.txt`(P1a)、`diff.patch`、`changed_files.txt`、`style_report.txt`、`strict_cpp_report.txt`(P1b)。

## 通过条件
已有签名 AR_design **且** 已有绑定该签名的 P1 设计 consent **且** 相对 `base_commit` 有 tracked 或
untracked 改动 **且** 格式 guard 与强规则检查都通过。
P1 通过后锁定**功能指纹**(只对**非测试路径**内容算 sha256,相对 base、commit 无关)+ `locked_all_paths`
(P1 时的全量路径基线)。后续任一**功能代码/配置内容**漂移都会被拒绝;测试文件留到 P3 新增(见 phase3)。

## 通过后
```bash
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 1
```
