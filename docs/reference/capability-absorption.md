# OpenHarmony Skills 能力吸收基线

本仓只从 `skills/` 安装技能。`openharmony-skills/` 是对比和吸收来源，不是运行时依赖，也不作为第二真源。

## 本轮取舍

| 领域 | 结论 | 落地 |
|---|---|---|
| 构建诊断 | 当前实现已有产品/target、主日志、独立编译、快速重编和磁盘恢复约束 | 保留 `ohos-dev-build-execution-diagnosis`，不复制上游 `openharmony-build` |
| CI 状态分析 | 当前 DCP/CodeCheck 远端解析更完整 | 保留 `ohos-ci-openharmony-ci-analysis` 作为远端权威 |
| 本地 CodeCheck | 上游能调用 CodeArts，但会自动下载且存在失败后 PASS 风险 | 新增 `ohos-ci-local-precheck`：用户提供引擎、SHA-256 固定、失败闭合、保留日志 |
| C/C++ 规则 | 规则表覆盖面大，但正则和工具并不等价于 CI | `code-ruleset-style-check` 定位为确定性本地子集，语义型正则降为 advisory，并增加 backend 状态、OHOS 工具发现、ignore 支持和清单漂移校验 |
| C++ 通用评审 | Core Guidelines 对所有权、生命周期、特殊成员和类型安全有补充价值 | 并入 `ohos-dev-cpp-coding-style` 的按需 reference |
| 安全评审 | 当前 OpenHarmony IPC/权限/并发/隐私检查更专门 | 保留当前入口，吸收系统组件边界速查到按需 reference |
| 文档质量 | 当前缺少独立的一致性入口 | 新增 `ohos-doc-quality-check` |
| XTS 执行 | 上游组合 Skill 绑定另一套 CLI，直接复制不可运行 | 新增 `ohos-test-xts`，以目标仓真实 build/xdevice/结构化报告为准 |
| XTS 代码质量 | 上游提供 23 条规则规范，但随包确定性 CLI 实际只实现 R004；旧入口会把其余规则“跳过”后错误记为 0 | 吸收为 `check-test-code-quality`，并改为失败闭合：R004 可作为确定性结果，其余规则在扫描器实现前仅作 advisory，不得冒充 23 规则全通过 |
| Native Fuzz | 上游具备生成器、corpus、26 条审查和报告脚本 | 吸收为 `ohos-test-fuzz-generation` |
| 覆盖率 | 上游完整方案较重且含环境专属配置和清理假设 | 新增轻量 `ohos-test-coverage`，复用目标 checkout 工具并保留原始证据 |
| 日志覆盖率 | 上游主要依赖自然语言/正则推断调用链，误报风险高 | 暂不吸收为硬门禁，由语义 review 按需执行 |

## C/C++ backend 标签

- `deterministic-local`：输入和规则确定，可作为本地阻断依据。
- `tool-dependent-local`：只有工具实际成功运行才有 PASS；缺失是 unavailable。
- `advisory`：需要语义判断或当前实现只提供近似提示。
- `ci-only`：仓库级 OAT、FossScan 或远端策略检查。
- `ci-near`：固定版本本地 CodeArts 结果；只有证明配置与远端完全相同时才可升级为 CI 等价。

## Workflow 路由

能力 Skills 服务于统一的“OpenHarmony 需求分析与开发作业线”：需求分析与设计工作流（Requirement workflow）负责需求收敛并生成 `AR.md`，再显式交接给需求开发工作流，由后者在 P2-P8 调用开发、测试、质量与 CI 能力。
