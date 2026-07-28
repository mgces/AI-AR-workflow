# Skill 实战

> 这个栏目不是简单列 skill README,而是突出:**什么时候用**、**怎么和 workflow 配合**、**给什么输入**、**会解决什么问题**。

## Skill 映射表

按阶段列出常用 skill 与作用:

| 阶段 | 常用 skill | 作用 |
|---|---|---|
| P0 | [`ohos-ar-dev-init`](/skill-playbooks/environment-init) | 初始化环境 |
| P1 | [`ohos-ar-dev-workflow`](/skill-playbooks/workflow-orchestration) / `ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `code-ruleset-style-check` | 设计与开发 |
| P2 | [`ohos-dev-build-execution-diagnosis`](/skill-playbooks/build-and-diagnosis) / [`ohos-build-flash`](/skill-playbooks/build-and-flash) | 编译与构建诊断 |
| P3 | [`ohos-test-ut-generation`](/skill-playbooks/unit-test-generation) / `tdd-enforcer` | 单测生成与校验 |
| P4 | [`ohos-dev-hdc-command-usage`](/skill-playbooks/device-debug-and-hdc) / [`ohos-build-flash`](/skill-playbooks/build-and-flash) | 真机部署与验证 |
| P5 | `ohos-test-ut-generation` / `ohos-dev-security-code-review` / `code-ruleset-style-check` | 质量验证 |
| P6 | [`ohos-ci-gitcode-cli-usage`](/skill-playbooks/gitcode-pr-and-review) / [`ohos-dev-gitcode-pr-review`](/skill-playbooks/gitcode-pr-and-review) | 上库与 review |

## 本栏目各页

- [Workflow 编排器](/skill-playbooks/workflow-orchestration) — `ohos-ar-dev-workflow` 作为"大脑"的角色
- [环境初始化](/skill-playbooks/environment-init) — 围绕 `ohos-ar-dev-init`
- [编译与诊断](/skill-playbooks/build-and-diagnosis) — 围绕 `ohos-dev-build-execution-diagnosis` + `ohos-build-flash`
- [单测生成](/skill-playbooks/unit-test-generation) — 围绕 `ohos-test-ut-generation`
- [真机调试 hdc](/skill-playbooks/device-debug-and-hdc) — 围绕 `ohos-dev-hdc-command-usage`
- [增量构建与刷机](/skill-playbooks/build-and-flash) — 围绕 `ohos-build-flash`
- [GitCode PR 与 review](/skill-playbooks/gitcode-pr-and-review) — 围绕 `ohos-ci-gitcode-cli-usage` + `ohos-dev-gitcode-pr-review`
- [Skill 组合拳](/skill-playbooks/common-combinations) — 典型场景的 skill 组合

## 面向"用户任务"而不是"skill 目录"

本栏目不照搬 skill README,而是回答用户最关心的:

- 我在某一步卡住了,要用哪个 skill?
- 这个 skill 什么时候调用?
- skill 输入输出是什么?
- skill 与 workflow 如何衔接?

## 延伸阅读

- [Skill 映射参考](/reference/skill-map) — 阶段→技能 / 任务→技能 / 输入类型→技能 查表
- [关键命令参考](/reference/key-commands) — 各场景的关键命令速查
- [FAQ](/reference/faq) — 高频误解速查
