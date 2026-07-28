# Skill 组合拳

> 这页很重要——总结典型场景的"技能组合拳",回答用户在某场景下该调用哪些 skill、按什么顺序、每个 skill 做什么。

## 场景 A:新增功能端到端

从新增一个功能到上库的完整路线,按阶段组合 skill:

| 阶段 | skill | 做什么 |
|---|---|---|
| P0 | [`ohos-ar-dev-init`](/skill-playbooks/environment-init) | 校验环境与真机就绪 |
| P1 | [`ohos-ar-dev-workflow`](/skill-playbooks/workflow-orchestration) | 编排器调度:kb_search 检索知识库 → 写 AR_design → consent |
| P2 | `ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `code-ruleset-style-check` / `tdd-enforcer` / `ohos-code-skeletons` | 按签名设计写代码 |
| P3 | [`ohos-test-ut-generation`](/skill-playbooks/unit-test-generation) / `tdd-enforcer` | 生成测试,只新增独立测试文件 |
| P4 | [`ohos-dev-build-execution-diagnosis`](/skill-playbooks/build-and-diagnosis) | 真跑 build.sh,校验成功横幅 |
| P5 | [`ohos-test-ut-generation`](/skill-playbooks/unit-test-generation) | developer_test 跑单测 |
| P6 | [`ohos-build-flash`](/skill-playbooks/build-and-flash) / [`ohos-dev-hdc-command-usage`](/skill-playbooks/device-debug-and-hdc) | 部署到真机 + scenario 触发 + hilog 抓取 |
| P7 | coverage / performance / power / stability / [`code-ruleset-style-check`](/skill-playbooks/build-and-diagnosis) / `ohos-dev-security-code-review` | 质量验证 + review |
| P8 | [`ohos-ci-gitcode-cli-usage`](/skill-playbooks/gitcode-pr-and-review) / [`ohos-dev-gitcode-pr-review`](/skill-playbooks/gitcode-pr-and-review) | commit → PR → CI |

详见 [新增功能端到端示例](/examples/new-feature-end-to-end)。

## 场景 B:编译失败排查

只想排查编译失败,不需要端到端:

| 步骤 | skill | 做什么 |
|---|---|---|
| 1 | [`ohos-dev-build-execution-diagnosis`](/skill-playbooks/build-and-diagnosis) | 定位 build.log 失败行,分析根因 |
| 2 | 必要时 [`ohos-build-flash`](/skill-playbooks/build-and-flash) | 镜像刷机(若失败与设备镜像版本相关) |
| 3 | 改代码 → `advance.py reset` 回 P1 重走 | 编译失败改了代码,必须回 P1 重走完整流程 |

> 编译失败若改了功能代码,不能只补跑当前阶段——功能指纹漂移会被拒,必须 reset 回 P1。

## 场景 C:上库前自检

上库前的安全自检组合,不跑端到端:

| 步骤 | skill | 做什么 |
|---|---|---|
| 1 | `code-ruleset-style-check` | C/C++ 格式与强规则门控 |
| 2 | `ohos-dev-security-code-review` | 安全 review(IPC Stub / MessageParcel / AccessToken / 隐私日志) |
| 3 | [`ohos-ci-gitcode-cli-usage`](/skill-playbooks/gitcode-pr-and-review) | 建 issue / PR / 管 review / label / release |
| 4 | [`ohos-dev-gitcode-pr-review`](/skill-playbooks/gitcode-pr-and-review) | PR review 草稿与显式确认提交 |

产出两道 review 报告(机器可读问题计数):

- A 本地自检零问题报告(commit 前硬控)
- B PR review 零问题报告(建 PR 后、CI 前硬控)

## 场景 D:只补测试

只在 P3/P5/P6/P7 补测试,不改功能代码:

| 步骤 | skill | 做什么 |
|---|---|---|
| 1 | [`ohos-test-ut-generation`](/skill-playbooks/unit-test-generation) | 生成新增独立测试文件 |
| 2 | `tdd-enforcer` | 约束测试质量 |
| 3 | 跑 gate_test_develop / gate_test_ut | 校验编写覆盖 + 执行覆盖 |

**关键约束**:只允许**新增独立测试文件**(`TEST_ONLY_PHASES=(3,5,6,7)`);改功能代码仍要 reset 回 P1。详见 [只补测试示例](/examples/test-only-follow-up)。

## 场景 E:真机验证

真机功能验证组合:

| 步骤 | skill | 做什么 |
|---|---|---|
| 1 | [`ohos-build-flash`](/skill-playbooks/build-and-flash) | 增量构建 + 部署到设备 |
| 2 | [`ohos-dev-hdc-command-usage`](/skill-playbooks/device-debug-and-hdc) | 设备连接 + scenario 触发 + hilog 抓取 |
| 3 | 跑 gate_device_func | 校验 sha256 一致 + nonce/marker + 抗伪造三层 |
| 4 | 人工核对真机结果 → `consent --phase 6` | 证据 PASS 后停下等人工确认 |

详见 [真机验证示例](/examples/device-verification-example)。

## 延伸阅读

- [Skill 映射参考](/reference/skill-map) — 阶段→技能 / 任务→技能 / 输入类型→技能 查表
- [新增功能端到端示例](/examples/new-feature-end-to-end) — 场景 A 的完整路线演示
- [各 skill 实战页](/skill-playbooks/) — 单个 skill 的输入输出与配合方式
