# P2 代码开发(feature-develop,物理 phase 2)

功能代码开发是独立物理阶段。前置是**已签名的 P1 设计 + P1 设计 consent**。
本阶段闭合门为 `gate_develop.py`(签名 `emit(phase 2)`)。

## 🚨 动手前必做:先研究,别想当然
写第一行代码前**必须先读懂要改的既有实现**,不允许凭猜测直接开写。弱模型最容易犯的错就是
不看上下文就照 `AR_design.md` 的框架硬塞代码,结果接口对不上、复用了不该复用的、破坏既有约定。
按下面顺序把"要改哪、怎么改"研究清楚,再进入"做事":

1. **定位真实改动点**:对 `AR_design.md`「完整代码框架/文件清单」里的每个文件,先在 `$OHOS_ROOT`
   下找到它(存在则读,新建则读同目录邻近文件),确认它真实的职责、对外接口、被谁调用。
   用搜索工具查关键类/函数/宏的**现有定义与调用方**,别假设签名和行为。
2. **读懂调用链与数据流**:改动涉及的入口(IPC Stub/NAPI/SA 接口/回调)从哪进、到哪个 sink、
   经过哪些状态。搞清楚生命周期、所有权、并发边界,再决定在哪落代码。
3. **摸清既有约定**:同级目录既有代码的命名/缩进/头文件顺序/错误处理/日志/注释密度(对齐它,
   见下方「就近一致」),以及该组件已有的错误码、日志 tag、返回约定,复用而非另造。
4. **对齐设计与现实**:若 `AR_design.md` 的框架与既有实现冲突(接口不存在、路径变了、假设不成立),
   **不要硬塞**——记录冲突,按既有实现调整落地方式;必要时说明并回到设计澄清,而不是想当然地强改。

产出:动手前应能说清「改哪几个文件、每个文件改什么、复用了哪些既有接口/约定、为什么这样落」。
研究属 advisory(不硬门控),但它直接决定 `gate_develop.py` 与 P7/P8 能不能一次过——省的是返工。

## 做事(调用现有技能)
- 系统能力/SA:`ohos-dev-sa-codegen`。NAPI 模块:`ohos-dev-napi-module`。
- 编码规范先加载 `ohos-dev-cpp-coding-style` 的 OpenHarmony 指导和
  `code-ruleset-style-check/references/pre-write-contract.md` 的写码前契约，再开始第一处编辑。
  规则集仍以 `code_ruleset` C++ 门禁表为唯一来源；写码前契约用于减少返工，不能代替门控。
- 写完后必须由共享 `code-ruleset-style-check` guard 执行可机器判断的硬规则；门控是唯一 PASS 来源。
- **就近一致**(advisory,写码时遵循,不硬门控):新增/改动代码的风格尽量与**同级目录既有代码**保持一致——
  命名约定、缩进/大括号、头文件包含顺序、错误处理与日志习惯、注释密度,优先随该目录现有代码,而非全局理想化风格。
  改一个既有文件时沿用该文件的既有约定;新建文件时对齐同目录邻近文件。门控只判 `code_ruleset` 硬规则,
  「就近一致」靠写码时自觉 + P8 review 兜底。
- **安全左移**(advisory,写码时同步做,不硬门控):涉及 IPC Stub/`OnRemoteRequest`、`MessageParcel`/fd/回调解析、
  `AccessTokenKit` 权限校验、跨 SA/跨用户/跨设备访问、HILOG 隐私输出、共享状态并发时,用
  `ohos-dev-security-code-review` 边写边审,把攻击者可控入口→敏感 sink 的校验/权限/并发缺口在开发期就消除。
  P2 门控**不**解析安全报告(完整调用链在 P7/P8 才齐,安全零问题由 P7/P8 硬门控兜底);此处目的是安全左移、减少返工。
- 若该 AR 有可测行为,优先 `tdd-enforcer`:先写失败测试,再写实现(真机在 P6 验证)。
- 依据 `$PDIR/AR_design.md` 的"完整代码框架"落实代码改动到 `$OHOS_ROOT` 下相应组件。
- 写码顺序固定为：**研究既有实现与调用链(见上「动手前必做」)** → 读取写码前契约 → 读取 OpenHarmony C++ 规则 → 检查邻近文件约定 → 编码 → 对改动文件运行门控。
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
(如禁用 `#pragma once`、头文件 `using namespace`、`.hpp/.cc/.cxx`、`NULL`、`system()/popen()`、默认 lambda 捕获);
另按**文件扩展名**对全部改动路径查禁用后缀(G.INC.02:头文件必须用 `.h` 不用 `.inc`——`.inc` 会绕过 C/C++ 内容过滤)。
依赖脚本、规则集 skill 或写码前契约缺失、手动传 `--no-style` 绕过、任一硬规则命中都会 FAIL。
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

**语言无关:** 功能指纹与冻结对**任何语言的 functional 代码**一视同仁 —— 若该 AR 的 P1 设计声明了
`test_cases[].kind=="arkts"`,其 ArkTS 应用功能代码(`entry/src/main/...`、`AppScope/...` 等)同样算
functional、在冻结锁内;P3 只对契约**声明的** arkts 测试工程路径(`file` 指向的 `entry/src/ohosTest/...`)
放行新增,应用功能 `.ets` 的增改仍是 freeze 违规(与 C++ 功能改动同待遇)。
