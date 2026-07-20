---
name: ohos-ar-dev-workflow
description: >
  端到端编排 OHOS(rk3568)研发生命周期:从已澄清的 AR(架构需求)出发,自动推进
  代码开发→编译验证→测试用例编写与验证→真机功能测试→功能/覆盖率/性能/功耗/稳定性验证→代码上库review。
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
3. **门控失败 → 留在本阶段**。读 `evidence/phaseN/` 里的真实失败日志,修复后**重跑门控**;
   最多自动重试 3 次,仍失败则停下并把真实失败日志呈现给用户。
4. **真机/真实日志是阶段产出**。P3/P4/P5 的结束证据必须是设备上真实跑出来的报告/hilog,
   不是你写的文字。设备 RTC 错乱,新鲜度靠 nonce + `/proc/uptime` + 新建报告目录,不靠时间戳。
5. **P4 真机结果、P5 质量/review 报告 与 P6 上库 需人工确认**。这些阶段证据 PASS 后
   **不自动放行**:必须停下,把真实结果与所有产物路径呈现给用户,等用户确认;用户同意后
   `advance.py consent --phase 4|5|6 --token <人>` 再 `advance`。没令牌时 `advance` 会 HOLD。
   P6 的 push 仍是唯一对外不可逆动作。
6. **任何阶段发现要改代码 → 回 P1 重走**。不管走到 P2/P3/P4/P5,只要发现 bug 需要改代码,
   就**必须** `advance.py reset --reason "<改了什么>"` 回到 P1,从代码开发踏踏实实重走一遍
   P1→P6。这是硬控制:P1 通过时锁定**功能指纹**(只对**非测试路径**内容计算,`git diff base_commit`
   + `untracked`,相对 base、与是否已 commit 无关)。改了**功能代码/配置内容**后 `advance P2..P6`
   会被以"功能指纹漂移"拒绝;`verify-all` 也会因漂移自动回退到 P1。**P3/P4/P5 只允许新增独立测试文件**
   (test 路径),出现非测试新增路径会被拒绝。测试文件的增改不触发功能指纹漂移。
   (P6 上库时的 `git commit -s` 因指纹 commit 无关,不算漂移。旧 run 无功能指纹时回退到全量指纹旧行为。)

## 步骤 0:初始化检查

- 若 `specs/initialized.flag` 不存在或环境未就绪 → 先跑技能 `ohos-ar-dev-init`。
- 为本次 AR 建运行态目录并初始化状态机:
  ```bash
  OHOS_ROOT="${OHOS_ROOT:-$HOME/ohos/master}"   # OHOS 仓根(按需修改)
  RUN=$(date +%Y%m%d)-<ar-slug>
  PDIR=$OHOS_ROOT/specs/pipeline/$RUN
  mkdir -p "$PDIR"; printf '%s\n' "<AR 原文>" > "$PDIR/ar.md"
  S=~/.claude/skills/ohos-ar-dev-phases/scripts
  python3 $S/advance.py --pipeline-dir "$PDIR" init \
      --build-target <gn_target> --part <testpart> \
      --base-commit "$(git -C $OHOS_ROOT rev-parse HEAD)"
  ```
- 跑 P0 预检并推进:
  ```bash
  python3 $S/gate_env_init.py --pipeline-dir "$PDIR"
  python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase 0
  ```

## 步骤 1:调度循环

读 `advance.py --pipeline-dir "$PDIR" status` 得到 `current_phase`,从那一阶段开始,
对每个阶段执行【做事 → 跑门控 → advance】。**每轮循环开头先刷新 todo**(依 AR_design 派生细项):
```bash
python3 ~/.claude/skills/ohos-ar-dev-workflow/scripts/refresh_todo.py --pipeline-dir "$PDIR"
```
再把同批细项灌进 `TodoWrite`(会话内可视,`todo.md` 为磁盘权威镜像)。各阶段的"做事"技能、门控命令、
通过条件见 `../ohos-ar-dev-phases/SKILL.md` 与 `phaseN-*.md`。阶段顺序固定、不可跳过:

| 阶段 | 做事(调用技能) | 门控脚本 | 结束证据 |
|---|---|---|---|
| P1 开发 | **P1a** 写 AR_design.md → sa-codegen / napi-module / code-ruleset-style-check / tdd-enforcer | `gate_design.py`(P1a)+ `gate_develop.py`(P1b) | 签名 AR_design(6 必含章节)+ git/untracked diff + C++ 强门控报告 |
| P2 编译 | build-execution-diagnosis / build-flash | `gate_build.py` | build.log 成功横幅 |
| P3 测试 | test-ut-generation / tdd-enforcer(**只增独立测试**) | `gate_test_ut.py` | developer_test summary_report.xml |
| P4 真机 | build-flash / hdc-command-usage | `gate_device_func.py` | 主机/设备产物 sha256 一致 + 含 nonce/功能 marker/运行时 marker/端到端 marker 的真机 hilog **+ 人工确认(consent --phase 4)**;渲染 `reports/` device HTML |
| P5 质量验证 | build-flash / developer_test MST / coverage / performance / power / stability / code-ruleset-style-check / security-code-review | `gate_integration.py`(或 `gate_device_func.py --phase 5` + `gate_integration.py`) | 功能 summary + 覆盖率 + 性能 + 功耗 + 稳定性 + 代码 review 零问题 **+ 人工确认(consent --phase 5)**;渲染 `reports/` quality HTML |
| P6 上库 | gitcode-cli / gitcode-pr-review / security-code-review / openharmony-ci-analysis | `gate_upload_ci.py` | A 本地自检零问题 + B PR review 零问题 + PR + CI 绿(SHA 绑定)**+ 人工确认(consent --phase 6)**;渲染 summary HTML + PR 描述注入 |

每阶段成功后,同步更新 `TodoWrite` 与 `$PDIR/todo.md`(由 refresh_todo 重写,便于断点恢复)。

## 步骤 2:断点恢复("继续流水线")

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" verify-all   # 重校验已通过阶段;被篡改则降级回退
python3 $S/advance.py --pipeline-dir "$PDIR" status       # 从 current_phase 续跑
```

## 完成

P6 通过(`advance --phase 6` 成功)即流水线完成。给用户一份汇总:PR 链接 + CI 状态 +
各阶段证据路径(`$PDIR/evidence/phaseN/`)。汇总只是"播报",真相在 `evidence/manifest.jsonl`。

**归档产物到 `products/`**:原始 run-state 证据(`env.json`/`hilog`/`pipeline.json`)含真实设备
序列号与个人 `$HOME` 路径,**禁止**手动 `cp evidence/` 进仓。必须用脱敏归档器:
```bash
python3 ~/.claude/skills/ohos-ar-dev-workflow/scripts/archive_product.py \
    --pipeline-dir "$PDIR" --product-dir products/<run> --include-reports
```
它只产出脱敏摘要(`ar.md` + `manifest_summary.md` + `README.md`),`--include-reports` 额外把
`reports/*.html` 脱敏后一并归档。原始可验签证据留在本地 run-state 目录(已 gitignore)。`.gitignore`
已封禁 `products/**/evidence/`、`pipeline.json`、`*_manifest.jsonl`、`*.log` 等原始产物。

参考:`references/gate-contract.md`(门控契约)、`references/evidence-protocol.md`(防伪协议)、
`references/pipeline-schema.md`(状态结构)。
