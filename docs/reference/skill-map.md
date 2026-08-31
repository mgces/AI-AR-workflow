# Skill 映射

> 做成查表页：阶段 → 技能 / 任务 → 技能 / 输入类型 → 技能。

## 阶段 → 技能

| 阶段 | 常用 skill | 作用 |
|---|---|---|
| 需求分析与设计工作流（Requirement workflow）需求导入 | `ohos-req-intake-orchestration`（编排）+ `ohos-req-*` 关联技能 | 原始需求→01-05/IR/SR→AR.md |
| P0 | `ohos-ar-dev-init` | 初始化环境与能力校验 |
| P1 设计 | `ohos-ar-dev-workflow`（编排） / `ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `code-ruleset-style-check` | 设计固化与代码骨架 |
| P2 开发 | `ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `code-ruleset-style-check` / `tdd-enforcer` / `ohos-code-skeletons` | 代码开发与门控 |
| P3 测试开发 | `ohos-test-ut-generation` / `tdd-enforcer` / `code-ruleset-style-check` | 单测生成（只增独立测试） |
| P4 编译 | `ohos-dev-build-execution-diagnosis` / `ohos-build-flash` | 编译与诊断 |
| P5 单元测试 | `ohos-test-ut-generation` / `tdd-enforcer` | developer_test 跑通 |
| P6 端到端功能测试 | `ohos-build-flash` / `ohos-dev-hdc-command-usage` | 部署 + scenario + hilog |
| P7 质量 | `ohos-test-xts` / `check-test-code-quality` / `ohos-test-fuzz-generation` / `ohos-test-coverage` / `code-ruleset-style-check` / `ohos-ci-local-precheck`（可选）/ `ohos-dev-security-code-review` | XTS、Fuzz、覆盖率、确定性预检与语义 review |
| P8 上库 | `ohos-ci-local-precheck`（CI-near）/ `ohos-ci-gitcode-cli-usage` / `ohos-dev-gitcode-pr-review` / `ohos-dev-security-code-review` / `ohos-ci-openharmony-ci-analysis`（远端权威） | 上库、review 与 CI |

## 任务 → 技能

| 任务 | skill |
|---|---|
| 编排需求分析与设计工作流（Requirement workflow） | `ohos-req-intake-orchestration` |
| 需求/可行性/决策/Feature 基线 | `ohos-req-requirement-intake` / `ohos-req-feasibility-analysis` / `ohos-req-arch-decision` / `ohos-req-feature-baseline` |
| Review Ready Gate / 评审纪要 | `ohos-req-review-gate` / `ohos-req-value-decision` |
| Feature 转 IR / Proposal 转 SR | `ohos-req-feature-to-ir` / `ohos-req-proposal-to-sr` |
| 初始化流水线环境 | `ohos-ar-dev-init` |
| 编排端到端开发 | `ohos-ar-dev-workflow` |
| 查阶段做事说明 | `ohos-ar-dev-phases` |
| 生成 SA 代码 | `ohos-dev-sa-codegen` |
| 生成 NAPI 模块 | `ohos-dev-napi-module` |
| C/C++ 确定性本地规则预检 | `code-ruleset-style-check` |
| 本地 CodeArts CI-near 预检 | `ohos-ci-local-precheck` |
| TDD 约束 | `tdd-enforcer` |
| 写码脚手架 | `ohos-code-skeletons` |
| 编译诊断 | `ohos-dev-build-execution-diagnosis` |
| 增量构建与刷机 | `ohos-build-flash` |
| 生成单元测试 | `ohos-test-ut-generation` |
| XTS 构建、执行与证据 | `ohos-test-xts` |
| XTS/兼容性测试代码质量 | `check-test-code-quality` |
| 生成和审查 native Fuzz | `ohos-test-fuzz-generation` |
| 全量/增量 C++ 覆盖率 | `ohos-test-coverage` |
| 文档与知识库一致性 | `ohos-doc-quality-check` |
| hdc 真机调试 | `ohos-dev-hdc-command-usage` |
| 安全代码 review | `ohos-dev-security-code-review` |
| GitCode CLI 操作 | `ohos-ci-gitcode-cli-usage` |
| GitCode PR review | `ohos-dev-gitcode-pr-review` |
| CI 状态分析 | `ohos-ci-openharmony-ci-analysis` |

## 输入类型 → 技能

| 输入类型 | skill |
|---|---|
| 原始需求 / RR / PRD / 评审材料 | `ohos-req-intake-orchestration` |
| 自然语言 AR 或需求分析与设计工作流生成的 AR.md | `ohos-ar-dev-workflow` |
| 组件路径 + build_target + testpart | `ohos-ar-dev-init` |
| C/C++ 源文件 | `ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `code-ruleset-style-check` / `ohos-code-skeletons` |
| 测试目标 + suite + part | `ohos-test-ut-generation` / `ohos-test-xts` / `check-test-code-quality` |
| C/C++ API/头文件 + Fuzz 目标 | `ohos-test-fuzz-generation` |
| 覆盖率范围 + base/head 或部件 | `ohos-test-coverage` |
| build_target | `ohos-dev-build-execution-diagnosis` / `ohos-build-flash` |
| 设备序列号 / hdc 连接 | `ohos-dev-hdc-command-usage` |
| PR 号 / URL | `ohos-dev-gitcode-pr-review` |
| repo slug + branch + issue | `ohos-ci-gitcode-cli-usage` |
| DCP event ID / CI 日志 URL | `ohos-ci-openharmony-ci-analysis` |

## 延伸阅读

- [Skills 能力吸收基线](/reference/capability-absorption) — 上游能力的保留、吸收和不采用理由
- [Skill 实战](/skill-playbooks/) — 各 skill 的输入输出与配合方式
- [Skill 组合拳](/skill-playbooks/common-combinations) — 典型场景的 skill 组合
- [关键命令](/reference/key-commands) — 各场景的命令速查
