---
name: ohos-ar-dev-workflow
description: >
  端到端编排 OHOS(rk3568)研发生命周期:从已澄清的 AR(架构需求)出发,自动推进
  设计固化→代码开发→测试用例编写→编译验证→单测执行验证→真机功能测试→功能/覆盖率/性能/功耗/稳定性验证→代码上库review。
  每个阶段只能由确定性门控脚本基于真实证据(构建日志成功横幅/真机 hdc+hilog 抓取/
  gtest+xdevice 报告/CI 绿状态)判定通过,绝不能用模型自由文本当作阶段结束。
  当用户说"跑流水线"、"从这个 AR 自动开发到上库"、"自动构建并验证 OHOS 代码"、
  "继续流水线"时触发。
---

# OHOS 生命周期流水线编排器(证据门控)

你是这条流水线的**编排器**。你负责"调度"和"做事",但你**没有权力宣布某阶段通过**——
阶段是否通过,只由 `scripts/` 下的确定性门控脚本 + `advance.py` 判定。这是不可逾越的护栏:
**禁止用任何自由文本、总结、"看起来通过了"来推进阶段。**

## 输入

一个已澄清的 AR(架构需求),通常是一段描述或一个 md 文件;以及目标 C/C++ 组件信息:
GN 构建目标(`build_target`)、测试 `testpart` 与套件名、目标二进制部署路径、功能验证标记字符串。
若缺失,用 `AskUserQuestion` 问清后再开始——**不要默认假设**。

## 全局护栏(必须遵守)

1. **门控脚本是唯一 PASS 来源**。每个阶段:先用对应 ohos-* 技能"做事",然后**必须运行该阶段的
   `gate_*.py`**;脚本自己解析真实证据(exit code / 日志横幅 / XML 属性 / nonce grep)给出 verdict。
2. **推进只能靠 `advance.py advance --phase N`**。它会校验该阶段最后一条 manifest 记录的 HMAC 签名
   与所有产物的 sha256;不匹配就拒绝。你不能、也无法手改 `pipeline.json` 的阶段状态。
   > 🚨 **签名/manifest/证据一律由门控脚本自动生成,严禁手改、手删、手动"重签"。** 门控报 "tampered/
   > unrecoverable/签名不匹配" 时,**绝不是**让你去编辑签名或 manifest——那只会把链彻底弄坏。正确做法二选一:
   > ① 若只是证据损坏/被动过而**功能代码没改**:重跑对应 `gate_*.py`(如 `gate_design.py`)让它**重新生成**签名;
   > ② 若**改过功能代码/配置**:先 `advance.py reset --reason "<改了什么>"` 回 P1,再从 P1 顺序重走(见护栏 6)。
   > 任何"让用户手动修改签名"的念头都是错的,停下按上面两条走。
3. **门控失败 → 留在本阶段**。读 `evidence/phaseN/` 里的真实失败日志,修复后**重跑门控**;
   最多自动重试 3 次,仍失败则停下并把真实失败日志呈现给用户。
4. **真机/真实日志是阶段产出**。P5/P6/P7 的结束证据必须是设备上真实跑出来的报告/hilog,
   不是你写的文字。设备 RTC 错乱,新鲜度靠 nonce + `/proc/uptime` + 新建报告目录,不靠时间戳。
5. **P1 设计固化、P6 真机结果、P7 质量/review 报告 与 P8 上库 需人工确认**。
   - **P1**:`gate_design.py`(`emit(phase 1)`)PASS(签名 AR_design + ```ar-contract``` 契约)后**不自动写码**——
     必须停下,把签名 AR_design 与其编译路径(`build_artifacts`)呈现给用户,等用户复核同意后
     `advance.py consent --phase 1 --token <人>`。该 consent 在 **P2 `gate_develop.py` 内**强校验(绑 phase1
     设计条目):没签字 P2 开发门 FAIL。重跑 gate_design 会作废旧 consent。
   - **P6/P7/P8**:这些阶段证据 PASS 后**不自动放行**:必须停下,把真实结果与所有产物路径呈现给用户,
     等用户确认;用户同意后 `advance.py consent --phase 6|7|8 --token <人>` 再 `advance`。没令牌时
     `advance` 会 HOLD。P8 的 push 仍是唯一对外不可逆动作。
6. **任何阶段发现要改代码 → 回 P1 重走**。不管走到 P2..P8,只要发现 bug 需要改代码,
   就**必须** `advance.py reset --reason "<改了什么>"` 回到 P1,从设计/代码开发踏踏实实重走一遍
   P1→P8。这是硬控制:**P2(feature-develop)闭合时锁定功能指纹**(只对**非测试路径**内容计算,
   `git diff base_commit` + `untracked`,相对 base、与是否已 commit 无关)。改了**功能代码/配置内容**后
   `advance P3..P8` 会被以"功能指纹漂移"拒绝(`check_code_drift` 从 phase3 起生效);`verify-all` 也会因漂移
   自动回退到 P1。**P3/P5/P6/P7 只允许新增独立测试文件**(test 路径),出现非测试新增路径会被拒绝。
   测试文件的增改不触发功能指纹漂移。
   (P8 上库时的 `git commit -s` 因指纹 commit 无关,不算漂移。旧 run 无功能指纹时回退到全量指纹旧行为。)

## 步骤 0:初始化检查

- 若 `specs/initialized.flag` 不存在或环境未就绪 → 先跑技能 `ohos-ar-dev-init`。
- **环境形态是人工强确认点**(与编译部件确认并列):init **必须**用 `--environment` 指定环境,
  裸 init 缺 `--environment` 会**硬失败**。先用 `AskUserQuestion` 问用户本 AR 属于哪种环境:
  - `openharmony`(默认):gitcode + rk3568,上库走 oh-gc PR + OpenHarmony CI。
  - `harmonyos-系统组件`:HarmonyOS,上库走 Gerrit;`--environment harmonyos --component-type system --device-type <type>`。
  - `harmonyos-芯片组件`:HarmonyOS,上库走 Gerrit;`--environment harmonyos --component-type chip --device-type <chip_product>`。
  HarmonyOS 编译命令**已填入** `scripts/lib/environments.py`(系统 `build_system.sh` / 芯片 `build_vendor.sh`,
  成功横幅 `=====build ... successful=====`、失败横幅 `=====do make ... error=====`);`--device-type` 与源码根
  绑定、**必填**(系统样例 `general_all_phone_standard` / 芯片样例 `general_7315L_phone_standard`,按本仓确认)。
  `product`/`out_dir`/`root_markers` 仍为占位,需要它们的门(P0 根校验/P4 产物等)未填时硬失败并提示"待填",绝不静默跑错。
- 为本次 AR 建运行态目录并初始化状态机。**编译部件也是人工确认点**:init 前先用
  `AskUserQuestion` 跟用户确认本 AR 要编译的部件(默认候选 hiview:
  git_dir=`base/hiviewdfx/hiview` / build_target=`hiview_package` / part=`hiviewdfx`)。
  裸 init(三者皆缺又不带 `--confirm-defaults`)会**硬失败**,绝不静默编译 hiview。
  ```bash
  OHOS_ROOT="${OHOS_ROOT:-$HOME/ohos/master}"   # 源码根(按需修改)
  RUN=$(date +%Y%m%d)-<ar-slug>
  AGENT_SKILLS_DIR="${AGENT_SKILLS_DIR:-$HOME/.claude/skills}"
  S="$AGENT_SKILLS_DIR/ohos-ar-dev-phases/scripts"
  # PDIR 由 init 依 --repo 派生成 <repo>/specs/pipeline/<run>,不再手工拼路径:
  # 弱模型即便忘了 export OHOS_ROOT / 拼错路径,证据与文档也强制锚定在源码根下。
  # 传 --repo + --run-id,不传 --pipeline-dir;init 打印 PDIR= 行,抓取即得权威路径。
  # 用户答别的组件 → 传 --git-dir/--build-target/--part;用户确认沿用 hiview → 加 --confirm-defaults
  # 环境:openharmony 传 --environment openharmony;HarmonyOS 传 --environment harmonyos --component-type system|chip
  PDIR=$(python3 $S/advance.py init \
      --repo "$OHOS_ROOT" --run-id "$RUN" \
      --environment openharmony \
      --git-dir <组件路径> --build-target <gn_target> --part <testpart> \
      --base-commit "$(git -C $OHOS_ROOT rev-parse HEAD)" \
      | sed -n 's/^PDIR=//p')
  printf '%s\n' "<AR 原文>" > "$PDIR/ar.md"
  ```
  > ⚠️ PDIR **必须**从 init 的 `PDIR=` 行取(它保证在 `<repo>/specs/pipeline/` 下)。
  > 若你显式传 `--pipeline-dir`,它必须落在 `<repo>/specs/pipeline/<run>` 之内,否则 init **硬失败**
  > (防止弱模型把证据/文档写到源码根之外)。
- 跑 P0 预检并推进:
  ```bash
  python3 $S/gate_env_init.py --pipeline-dir "$PDIR"
  python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 0
  ```

## 步骤 1:调度循环

> 🚨 **这是一个循环,一次要跑到 P8,中途不许停。** 每个 `advance --phase N` **只关掉一个阶段**
> 就返回——**没有任何脚本会自动拉起你跑下一阶段**,续跑全靠你自己。**关掉一个阶段 ≠ 任务完成**:
> 尤其 **P2 闭合会打印"功能指纹已锁定/功能代码冻结"**,那只是"开发写完、进入写测试",**绝不是收工**。
> `advance` 成功后会打印 `!! PIPELINE NOT DONE ... DO NOT STOP` 横幅并给出下一阶段门控命令——
> **看到它就继续下一轮**,直到 `advance --phase 8` 打印 `pipeline COMPLETE.` 才算完。中途只有
> P6/P7/P8 的**人工 consent** 是合法暂停点(停下问用户拿令牌);P2→P3、P3→P4… **没有任何暂停理由**。

读 `advance.py --pipeline-dir "$PDIR" status` 得到 `current_phase`,从那一阶段开始,
对每个阶段执行【做事 → 跑门控 → advance】。**每轮循环开头先刷新 todo**(依 AR_design 派生细项):
```bash
python3 "$AGENT_SKILLS_DIR/ohos-ar-dev-workflow/scripts/refresh_todo.py" --pipeline-dir "$PDIR"
```
再把同批细项灌进 `TodoWrite`(会话内可视,`todo.md` 为磁盘权威镜像)。各阶段的"做事"技能、门控命令、
通过条件见 `../ohos-ar-dev-phases/SKILL.md` 与 `phaseN-*.md`。阶段顺序固定、不可跳过:

| 阶段 | 做事(调用技能) | 门控脚本 | 结束证据 |
|---|---|---|---|
| P1 设计 | **(设计前)** `kb_search.py` 检索知识库生成 `design_refs.md`(advisory,失败不阻断)→ 写 AR_design.md(6 章节 + ```ar-contract``` 契约块)→ **人工 consent**(P2 门内校验) | `gate_design.py`(`emit 1`) | 签名 AR_design(6 章节 + 契约)+ **P1 设计 consent**(绑签名条目) |
| P2 开发 | **先加载** `code-ruleset-style-check` 写码前契约 + `cpp-coding-style`，再用 sa-codegen / napi-module / security-code-review(安全左移,advisory) / tdd-enforcer / code-skeletons 写码 | `gate_develop.py`(`emit 2`,强制依赖签名 AR_design + P1 consent；共享 guard 是唯一 PASS 来源) | git/untracked diff 非空 + C++ 强门控报告;**闭合时锁定功能指纹** |
| P3 测试开发 | **先加载**同一写码前契约 + `cpp-coding-style`，再用 test-ut-generation / tdd-enforcer / code-ruleset-style-check(**只增独立测试**,编译前写完测试代码) | `gate_test_develop.py`(`emit 3`,对新增测试源强制 `--rules-only` 规则门控) | 契约每个 `test_cases[].gtest` 的 suite 出现在新测试文件中(**编写**覆盖)+ 测试源签名快照 + 测试代码规则检测报告 |
| P4 编译 | build-execution-diagnosis / build-flash / code-ruleset-style-check(编译后 clang-tidy) | `gate_build.py`(`emit 4`) | build.log 成功横幅 + 契约 `build_artifacts` 全部编译出 + clang-tidy 子步(有 compdb 硬控/缺失降级) |
| P5 单测执行 | test-ut-generation / tdd-enforcer(**只增独立测试**) | `gate_test_ut.py`(`emit 5`) | developer_test summary_report.xml + 契约每个 `test_cases[].gtest` 通过(**执行**覆盖) |
| P6 真机 | build-flash / hdc-command-usage | `gate_device_func.py`(`emit 6`) | 主机/设备产物 sha256 一致 + 含 nonce/功能 marker/运行时 marker/端到端 marker 的真机 hilog + 契约每个 `device_cases[].marker` 命中 **+ 人工确认(consent --phase 6)**;渲染 `reports/device_functional.md` + `reports/test_report.md`(P5 单测 + P6 真机关键证据聚合) |
| P7 质量验证 | build-flash / developer_test MST / coverage / performance / power / stability / code-ruleset-style-check / security-code-review | `gate_integration.py`(`emit 7`;或 `gate_device_func.py --phase 7` + `gate_integration.py`) | 功能 summary + 覆盖率 + 性能 + 功耗 + 稳定性 + 代码 review 零问题 **+ 人工确认(consent --phase 7)**;渲染 `reports/quality.md`(六段聚合含 review) |
| P8 上库 | gitcode-cli / gitcode-pr-review / committer-review(P8-A 补充维度) / security-code-review / openharmony-ci-analysis | `gate_upload_ci.py`(`emit 8`) | A 本地自检零问题 + B PR review 零问题 + PR + CI 绿(SHA 绑定)**+ 人工确认(consent --phase 8)**;渲染 `reports/summary.md` + PR 描述注入 |

每阶段成功后,同步更新 `TodoWrite` 与 `$PDIR/todo.md`(由 refresh_todo 重写,便于断点恢复)。

## 步骤 2:断点恢复 / 新窗口接手("继续流水线")

> 🚨 **新窗口、或换了另一个 agent 接手时,不知道 PDIR / 不知道跑到哪了 → 先跑 `resume` 自举。**
> init 会把当前 run 的 PDIR 写进 `<repo>/specs/pipeline/ACTIVE` 指针,`resume` 读它自动定位:
> ```bash
> # 在源码根打开窗口(或传 --repo <source_root> / export OHOS_ROOT);无需知道 PDIR:
> python3 "$AGENT_SKILLS_DIR/ohos-ar-dev-phases/scripts/advance.py" resume
> ```
> `resume` 会:定位 PDIR → 刷新 `todo.md`(每阶段做什么/调哪个技能/怎么做 + AR_design 派生细项)
> → 打印当前阶段与**下一步必做命令** + `!! PIPELINE NOT DONE ... DO NOT STOP` 横幅。
> 照它输出的命令继续【做事 → 跑门控 → advance】循环即可,**读 `todo.md` 拿每阶段详细做法**。
> `resume` 拿到 PDIR 后,可再跑 `verify-all` 重校验已通过阶段(被篡改则降级回退):
> ```bash
> PDIR=$(python3 $S/advance.py resume | sed -n 's/^RESUME .*PDIR=//p')
> python3 $S/advance.py --pipeline-dir "$PDIR" verify-all   # 重校验已通过阶段
> python3 $S/advance.py --pipeline-dir "$PDIR" status       # 从 current_phase 续跑
> ```

## 完成

P8 通过(`advance --phase 8` 成功)即流水线完成。给用户一份汇总:PR 链接 + CI 状态 +
各阶段证据路径(`$PDIR/evidence/phaseN/`)。汇总只是"播报",真相在 `evidence/manifest.jsonl`。

**归档产物到 `products/`**:原始 run-state 证据(`env.json`/`hilog`/`pipeline.json`)含真实设备
序列号与个人 `$HOME` 路径,**禁止**手动 `cp evidence/` 进仓。必须用脱敏归档器:
```bash
python3 "$AGENT_SKILLS_DIR/ohos-ar-dev-workflow/scripts/archive_product.py" \
    --pipeline-dir "$PDIR" --product-dir products/<run> --include-reports
```
它只产出脱敏摘要(`ar.md` + `manifest_summary.md` + `README.md`),`--include-reports` 额外把
`reports/*.md` 脱敏后一并归档。原始可验签证据留在本地 run-state 目录(已 gitignore)。`.gitignore`
已封禁 `products/**/evidence/`、`pipeline.json`、`*_manifest.jsonl`、`*.log` 等原始产物。

**沉淀 feature 专题回填知识库(按需,非每次)**:回填**不是**流水线常规完成步骤——只在你确实
想把某次 run 沉淀成知识库 feature 专题时,**手动**跑归档器加 `--sink-feature <subsystem>/<component>/<feature>`
(把事实骨架脱敏写到 `openharmony-knowledge-base/subsystems/.../features/<feature>/README.md`,
目标已存在则写 `README.generated.md` 不覆盖)。详见 `../ohos-ar-dev-phases/phase8-upload-review.md`。
知识库更新后,P1 的 `kb_search.py` 会在下次检索时自动增量刷新索引。

参考:`references/gate-contract.md`(门控契约)、`references/evidence-protocol.md`(防伪协议)、
`references/pipeline-schema.md`(状态结构)。
