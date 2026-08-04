# Skill 映射

> 做成查表页：阶段 → 技能 / 任务 → 技能 / 输入类型 → 技能。

## 阶段 → 技能

| 阶段 | 常用 skill | 作用 |
|---|---|---|
| P0 | `ohos-ar-dev-init` | 初始化环境与能力校验 |
| P1 设计 | `ohos-ar-dev-workflow`（编排） / `ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `code-ruleset-style-check` | 设计固化与代码骨架 |
| P2 开发 | `ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `code-ruleset-style-check` / `tdd-enforcer` / `ohos-code-skeletons` | 代码开发与门控 |
| P3 测试开发 | `ohos-test-ut-generation` / `tdd-enforcer` / `code-ruleset-style-check` | 单测生成（只增独立测试） |
| P4 编译 | `ohos-dev-build-execution-diagnosis` / `ohos-build-flash` | 编译与诊断 |
| P5 单元测试 | `ohos-test-ut-generation` / `tdd-enforcer` | developer_test 跑通 |
| P6 端到端功能测试 | `ohos-build-flash` / `ohos-dev-hdc-command-usage` | 部署 + scenario + hilog |
| P7 质量 | `ohos-build-flash` / developer_test(MST) / `ohos-test-ut-generation` / coverage / performance / power / stability / `code-ruleset-style-check` / `ohos-dev-security-code-review` | 质量验证与 review |
| P8 上库 | `ohos-ci-gitcode-cli-usage` / `ohos-dev-gitcode-pr-review` / `ohos-dev-security-code-review` / `ohos-ci-openharmony-ci-analysis` | 上库与 review |

## 任务 → 技能

| 任务 | skill |
|---|---|
| 初始化流水线环境 | `ohos-ar-dev-init` |
| 编排端到端开发 | `ohos-ar-dev-workflow` |
| 查阶段做事说明 | `ohos-ar-dev-phases` |
| 生成 SA 代码 | `ohos-dev-sa-codegen` |
| 生成 NAPI 模块 | `ohos-dev-napi-module` |
| C/C++ 格式与强规则门控 | `code-ruleset-style-check` |
| TDD 约束 | `tdd-enforcer` |
| 写码脚手架 | `ohos-code-skeletons` |
| 编译诊断 | `ohos-dev-build-execution-diagnosis` |
| 增量构建与刷机 | `ohos-build-flash` |
| 生成单元测试 | `ohos-test-ut-generation` |
| hdc 真机调试 | `ohos-dev-hdc-command-usage` |
| 安全代码 review | `ohos-dev-security-code-review` |
| GitCode CLI 操作 | `ohos-ci-gitcode-cli-usage` |
| GitCode PR review | `ohos-dev-gitcode-pr-review` |
| CI 状态分析 | `ohos-ci-openharmony-ci-analysis` |

## 输入类型 → 技能

| 输入类型 | skill |
|---|---|
| 已澄清 AR 文本 | `ohos-ar-dev-workflow` |
| 组件路径 + build_target + testpart | `ohos-ar-dev-init` |
| C/C++ 源文件 | `ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `code-ruleset-style-check` / `ohos-code-skeletons` |
| 测试目标 + suite + part | `ohos-test-ut-generation` |
| build_target | `ohos-dev-build-execution-diagnosis` / `ohos-build-flash` |
| 设备序列号 / hdc 连接 | `ohos-dev-hdc-command-usage` |
| PR 号 / URL | `ohos-dev-gitcode-pr-review` |
| repo slug + branch + issue | `ohos-ci-gitcode-cli-usage` |
| DCP event ID / CI 日志 URL | `ohos-ci-openharmony-ci-analysis` |

## 延伸阅读

- [Skill 实战](/skill-playbooks/) — 各 skill 的输入输出与配合方式
- [Skill 组合拳](/skill-playbooks/common-combinations) — 典型场景的 skill 组合
- [关键命令](/reference/key-commands) — 各场景的命令速查
