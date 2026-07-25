# AI-AR-workflow 文档站设计方案（VitePress 方向）

- 日期：2026-07-23
- 状态：设计方案，未实施
- 范围：只产出文档站信息架构与页面设计，不改动仓库现有文件
- 目标：打造一个层级清晰、官网风格、以 **workflow 使用与代码开发流程** 为核心的文档站；知识库作为次级展示内容

---

## 1. 设计目标

本方案的核心不是“把仓库里的 README 全部搬到 VitePress”，而是把现有项目重组为一个 **面向使用者、面向开发流程、面向落地操作** 的文档官网。

优先级明确如下：

1. **第一优先级：用户如何使用 workflow 开发代码**
2. **第二优先级：相关 skill 如何配合使用**
3. **第三优先级：知识库如何辅助定位代码和验证**
4. **第四优先级：历史产物、案例和扩展资料**

换句话说，这个站点不是“文件目录导航器”，而是：

> **一个让用户快速理解：怎么初始化环境、怎么用 workflow 推进开发、怎么在每一阶段调用 skill、怎么验证、怎么上库的产品化文档站。**

---

## 2. 设计原则

### 2.1 面向“用户任务”组织，而不是面向“仓库目录”组织

站点主导航不应该直接映射：

- `skills/`
- `products/`
- `openharmony-knowledge-base/`

而应首先回答用户最关心的问题：

- 我该怎么开始？
- 我怎么用这套 workflow 开发一个功能？
- 每个阶段需要做什么？
- 我在某一步卡住了怎么办？
- 需要哪个 skill，何时调用？
- 知识库在什么时候帮助我？

### 2.2 首页要有“产品感”和“官网感”

首页不能是 README 原文直出，而应具备：

1. Hero 标题与一句话价值说明
2. 三到六个核心能力卡片
3. 三条典型用户路径
4. 快速开始 CTA（Call to Action）
5. workflow 图示入口

### 2.3 文档层级必须控制深度

虽然仓库内存在大量 README，但文档站层级建议控制为：

- 顶层栏目
- 栏目首页
- 核心流程页
- 深入参考页

避免一上来就暴露 200+ README 形成“文件树型站点”。

### 2.4 知识库作为“辅助能力”而不是“首页中心”

`openharmony-knowledge-base` 很强，但它服务于 workflow 的代码定位、依赖分析、验证范围判断，不应盖过主产品定位。

在站点中，知识库应表现为：

- 辅助导航系统
- 开发前 / 评审前 / 排障前 的支撑工具
- 深入阅读的二级入口

而不是首页主线。

### 2.5 保持原仓内容为真源，不改原文件

本方案明确：

- **不修改现有 README / SKILL / 知识库文件**
- 后续如实施，应在新的 `docs/` 目录中重组内容
- 原仓 Markdown 继续作为事实真源
- 文档站只做映射、提炼、二次组织和导航增强

---

## 3. 用户视角下的站点定位

站点目标用户可分为三类：

### 3.1 主用户：想用 workflow 推进 OHOS 代码开发的人

他们最关心：

- 初始化环境
- 给一个 AR 后怎么推进代码开发
- 每一阶段怎么做
- 如何判断当前阶段有没有完成
- 真机和质量验证怎么接上
- 最后怎么上库

### 3.2 次用户：想复用 skill 的开发者

他们最关心：

- skill 解决什么问题
- skill 什么时候调用
- skill 输入输出是什么
- skill 与 workflow 如何衔接

### 3.3 次级用户：想借助知识库理解 OpenHarmony 代码结构的人

他们最关心：

- 从子系统/组件/产品找到代码
- 确认构建、测试和依赖边界
- 为 workflow 或人工开发做前置分析

因此，整个站点的文案和信息架构应明显偏向前两类用户。

---

## 4. 目标站点结构（建议）

建议新建 `docs/` 作为站点入口，但当前仅设计，不实际创建。

目标结构如下：

```text
docs/
├── index.md
├── getting-started/
│   ├── index.md
│   ├── what-is-ai-ar-workflow.md
│   ├── quick-start.md
│   ├── environment-init.md
│   └── first-ar-run.md
├── workflow/
│   ├── index.md
│   ├── lifecycle-overview.md
│   ├── phase-0-init.md
│   ├── phase-1-design-and-develop.md
│   ├── phase-2-build.md
│   ├── phase-3-test.md
│   ├── phase-4-device.md
│   ├── phase-5-quality.md
│   ├── phase-6-upload.md
│   ├── consent-and-reset.md
│   └── evidence-and-gates.md
├── skill-playbooks/
│   ├── index.md
│   ├── workflow-orchestration.md
│   ├── environment-init.md
│   ├── build-and-diagnosis.md
│   ├── unit-test-generation.md
│   ├── device-debug-and-hdc.md
│   ├── build-and-flash.md
│   ├── gitcode-pr-and-review.md
│   └── common-combinations.md
├── examples/
│   ├── index.md
│   ├── new-feature-end-to-end.md
│   ├── code-fix-and-rewalk.md
│   ├── test-only-follow-up.md
│   ├── device-verification-example.md
│   └── upload-ci-example.md
├── knowledge-base/
│   ├── index.md
│   ├── how-it-supports-workflow.md
│   ├── getting-started.md
│   ├── architecture-overview.md
│   ├── source-domains.md
│   ├── subsystems.md
│   ├── products.md
│   └── workspace-and-generated-indexes.md
├── reference/
│   ├── index.md
│   ├── workflow-state-machine.md
│   ├── gate-contract.md
│   ├── pipeline-layout.md
│   ├── key-commands.md
│   ├── skill-map.md
│   └── faq.md
└── cases/
    ├── index.md
    ├── thread-leak-detector.md
    ├── appfreeze-recovery-barrier.md
    └── weak-model-optimization.md
```

---

## 5. 顶层导航设计

建议文档站顶层导航如下：

1. **开始使用**
2. **开发 Workflow**
3. **Skill 实战**
4. **示例**
5. **知识库**
6. **参考**
7. **案例归档**

推荐排序理由：

- “开始使用”必须最前，降低首次使用门槛
- “开发 Workflow”是主产品核心
- “Skill 实战”体现能力组合方式
- “示例”帮助用户快速模仿
- “知识库”放在中后部，体现次级但重要地位
- “参考”用于进阶查阅
- “案例归档”作为成果展示和设计记录

---

## 6. 首页（`docs/index.md`）设计

首页应采用明显的官网风格，而不是 README 目录风格。

### 6.1 Hero 区

建议文案方向：

- 标题：`AI-AR Workflow`
- 副标题：`面向 OpenHarmony / OHOS 研发的证据门控代码开发流水线`
- 简介：
  - 从已澄清 AR 出发
  - 自动推进设计、开发、编译、测试、真机验证、质量验证、上库 review
  - 每一阶段由真实证据与门控脚本决定是否通过

CTA：

- `5 分钟快速开始`
- `查看完整开发流程`
- `查看 Skill 实战示例`

### 6.2 核心能力卡片

建议 4~6 张卡片：

1. **证据门控**
   - 阶段推进只认 gate 和真实产物
2. **端到端开发流程**
   - 从设计到上库的完整闭环
3. **Skill 编排协作**
   - 构建、测试、真机、PR review 等能力复用
4. **真机与质量验证**
   - hilog、MST、覆盖率、性能、功耗、稳定性
5. **GitCode 上库流程**
   - issue、PR、review、CI 联动
6. **OpenHarmony 知识库支撑**
   - 帮助定位代码、构建目标和验证范围

### 6.3 三条推荐路径

首页应显式给出用户路径：

#### 路径 A：第一次使用 workflow
- 认识 workflow
- 初始化环境
- 跑第一次 AR

#### 路径 B：已经在做代码开发
- 进入 Phase 1 开发
- 编译与测试
- 真机验证

#### 路径 C：想单独复用某个 skill
- 查 build skill
- 查 test skill
- 查 hdc / flash / PR review skill

### 6.4 页面底部推荐入口

- 完整生命周期图
- 第一个示例
- FAQ

---

## 7. 核心栏目设计：开始使用

目标：让新用户快速完成“认知 → 初始化 → 首次运行”。

### 7.1 `getting-started/index.md`

作为栏目首页，回答：

- 这是什么
- 适合谁
- 与普通 README / skill 集合的区别
- 如何开始

### 7.2 `what-is-ai-ar-workflow.md`

内容建议：

- 一句话定义
- 为什么不是普通 prompt
- 为什么不是纯脚本系统
- 为什么强调 evidence gate
- 为什么适合 OHOS 研发

可提炼来源：
- 根 README 的整体定位
- `ohos-ar-dev-workflow/SKILL.md` 的编排定位

### 7.3 `quick-start.md`

这是最关键的一页之一。

应给出一个 **最短可执行路径**：

1. 安装 / 同步 skills
2. 初始化环境
3. 准备一个 AR
4. 调用 `/ohos-ar-dev-workflow`
5. 看状态推进方式
6. 哪些阶段会停下等人工确认

这个页面应极简，适合第一次使用。

### 7.4 `environment-init.md`

重点解释：

- `ohos-ar-dev-init` 的作用
- 为什么需要 P0
- `build.sh` / `developer_test` / `hdc` / 真机 / `oh-gc` 的校验逻辑
- 环境变量与设备连接方式

核心来源：
- `skills/ohos-ar-dev-init/SKILL.md:9`

### 7.5 `first-ar-run.md`

通过一个最小 AR 示例带用户第一次看懂：

- run 目录如何创建
- PDIR 是什么
- evidence / reports / pipeline.json 的关系
- first run 的典型用户动作有哪些

---

## 8. 核心栏目设计：开发 Workflow（主栏目）

这是整个站点的中心。

### 8.1 `workflow/index.md`

栏目首页目标：

- 给出完整生命周期图
- 说明 7 个阶段（P0~P6）
- 明确“做事”和“过 gate”是两层概念
- 明确 consent / reset / verify-all 的意义

### 8.2 `lifecycle-overview.md`

把当前 README 的流程图重构成更适合官网展示的页面：

- 一张总图
- 每个阶段一句话定义
- 每个阶段的输入、产物、是否会停下人工确认

### 8.3 每阶段单独一页

#### `phase-0-init.md`
- 初始化检查目标
- 产出什么证据
- 通过条件
- 常见失败
- 对应 skill

#### `phase-1-design-and-develop.md`
这是最重要页面之一。
应拆解：
- P1a 设计固化
- P1 consent
- P1b 代码开发
- `AR_design.md` 与 `ar-contract` 是什么
- 为什么后续都依赖签名设计
- 哪些 skill 常参与 P1

#### `phase-2-build.md`
- 编译目标
- 成功横幅和 artifact 检查
- 失败如何诊断
- `ohos-dev-build-execution-diagnosis` 何时使用

#### `phase-3-test.md`
- 为什么只能新增独立测试文件
- 如何生成 UT
- 如何验证 `test_cases[].gtest`
- `ohos-test-ut-generation` 如何配合 workflow

#### `phase-4-device.md`
- 真机阶段如何理解
- deploy/scenario/runtime/e2e marker
- 为什么必须人工确认
- `hdc` skill 与 `flash` skill 怎样协作

#### `phase-5-quality.md`
- 功能 summary
- 覆盖率 / 性能 / 功耗 / 稳定性
- review 报告为何是 gate 条件

#### `phase-6-upload.md`
- 本地 review / PR review / issue / PR / CI / consent
- 不可逆动作的边界
- GitCode skill 组合方式

### 8.4 `consent-and-reset.md`

这页应单独存在，因为它是 workflow 思维最容易误解的部分。

内容包括：

- 为什么 P1/P4/P5/P6 要人工确认
- 什么情况下必须 `reset` 回 P1
- 什么情况下 `verify-all`
- 功能指纹意味着什么

### 8.5 `evidence-and-gates.md`

面向理解系统设计的人：

- gate 不是建议，而是唯一 PASS 来源
- `advance.py` 的唯一状态写入器角色
- manifest / HMAC / artifact sha256
- evidence 与 reports 的分离

---

## 9. 核心栏目设计：Skill 实战

这个栏目不是简单列 skill README，而是突出：

- **什么时候用**
- **怎么和 workflow 配合**
- **给什么输入**
- **会解决什么问题**

### 9.1 `skill-playbooks/index.md`

应先给一张 skill map：

| 阶段 | 常用 skill | 作用 |
|---|---|---|
| P0 | `ohos-ar-dev-init` | 初始化环境 |
| P1 | `ohos-ar-dev-workflow` / `ohos-dev-sa-codegen` / `ohos-dev-napi-module` / `code-ruleset-style-check` | 设计与开发 |
| P2 | `ohos-dev-build-execution-diagnosis` / `ohos-build-flash` | 编译与构建诊断 |
| P3 | `ohos-test-ut-generation` / `tdd-enforcer` | 单测生成与校验 |
| P4 | `ohos-dev-hdc-command-usage` / `ohos-build-flash` | 真机部署与验证 |
| P5 | `ohos-test-ut-generation` / `ohos-dev-security-code-review` / `code-ruleset-style-check` | 质量验证 |
| P6 | `ohos-ci-gitcode-cli-usage` / `ohos-dev-gitcode-pr-review` | 上库与 review |

### 9.2 `workflow-orchestration.md`

说明：

- `ohos-ar-dev-workflow` 作为“大脑”是什么角色
- 它不宣布 PASS，只调度做事与 gate
- 它与 phase skill 的关系

### 9.3 `environment-init.md`

围绕 `ohos-ar-dev-init`：

- 适合何时调用
- 最常见用户命令
- 初始化后用户会得到什么

### 9.4 `build-and-diagnosis.md`

重点围绕：
- `ohos-dev-build-execution-diagnosis`
- `ohos-build-flash`

展示典型场景：

- 编某个 target
- 定位 build.log
- 全量整编
- 局部失败后如何 narrow rebuild
- 镜像刷机什么时候需要

### 9.5 `unit-test-generation.md`

重点围绕：
- `ohos-test-ut-generation`
- 为什么适合 P3
- 典型输入
- 典型输出
- 如何与 `gate_test_ut.py` 协作

### 9.6 `device-debug-and-hdc.md`

重点围绕：
- `ohos-dev-hdc-command-usage`
- 设备连接、target 选择、日志抓取、文件推送、系统组件替换
- 哪些是真机阶段常见路径

### 9.7 `build-and-flash.md`

从 `ohos-build-flash` 提炼：

- 增量构建
- updater 模式刷机
- send + dd 路径
- 刷后验证

### 9.8 `gitcode-pr-and-review.md`

围绕：
- `ohos-ci-gitcode-cli-usage`
- `ohos-dev-gitcode-pr-review`

展示：

- issue / PR 的最小路径
- review 草稿与显式确认提交
- PR URL / head / repo 的常见坑

### 9.9 `common-combinations.md`

这页很重要，要总结“技能组合拳”。

例如：

#### 场景 A：新增功能
- `ohos-ar-dev-init`
- `ohos-ar-dev-workflow`
- `ohos-dev-build-execution-diagnosis`
- `ohos-test-ut-generation`
- `ohos-dev-hdc-command-usage`

#### 场景 B：编译失败排查
- `ohos-dev-build-execution-diagnosis`
- 必要时 `ohos-build-flash`

#### 场景 C：上库前自检
- `code-ruleset-style-check`
- `ohos-dev-security-code-review`
- `ohos-ci-gitcode-cli-usage`
- `ohos-dev-gitcode-pr-review`

---

## 10. 核心栏目设计：示例

这一栏是把抽象文档变成“能模仿”的内容。

### 10.1 `examples/index.md`

作为示例导航页，说明：

- 这些示例不是协议全文，而是典型工作流路径
- 用户可以按场景选择阅读

### 10.2 `new-feature-end-to-end.md`

主打示例：

> 从一个新 AR 开始，到设计、开发、编译、测试、真机、质量、上库的完整路线。

页面应强调：

- 每一步用户做什么
- 每一步 workflow 做什么
- 每一步 gate 检查什么
- 何时停下人工确认

### 10.3 `code-fix-and-rewalk.md`

解释一个极关键但容易误解的场景：

- 在 P3/P4/P5 发现功能问题
- 为什么必须 reset 回 P1
- 重新走流程意味着什么

### 10.4 `test-only-follow-up.md`

说明：

- 什么是“只补测试”
- 何时允许不改功能代码继续 P3
- 何时会被功能指纹拒绝

### 10.5 `device-verification-example.md`

给一个真机验证页面：

- deploy script
- scenario script
- marker 思路
- 人工 review 点

### 10.6 `upload-ci-example.md`

给一个 P6 示例：

- issue → dry run → local review → consent → push → PR review → CI

---

## 11. 核心栏目设计：知识库（次级展示）

知识库不应消失，但必须换成“支撑 workflow 的姿态”。

### 11.1 `knowledge-base/index.md`

标题建议：

> 用知识库支撑 workflow 的代码定位、构建边界和验证范围判断

这里不再以知识库自身为中心，而是先回答：

- 在 workflow 什么时候需要知识库
- 它帮你解决什么问题
- 如果只是想跑 workflow，哪些知识库页面值得先看

### 11.2 `how-it-supports-workflow.md`

建议明确三个使用时机：

1. **开发前**：定位子系统、组件、build target、test part
2. **验证前**：确定依赖范围、测试边界、产品选入情况
3. **评审前**：分析影响面、仓状态、构建与运行关系

### 11.3 `getting-started.md`

从知识库原 `README.md` 和 `USAGE.md` 提炼：

- 如何开始用知识库
- 什么是子系统 / 组件 / 运行实体 / capability / feature

### 11.4 `architecture-overview.md`

把：
- `INFORMATION_ARCHITECTURE.md`
- `architecture/system.md`
- `architecture/build-runtime.md`

组合成架构层导航。

### 11.5 `source-domains.md` / `subsystems.md` / `products.md`

给出二级入口说明，不一上来铺开所有页面。

### 11.6 `workspace-and-generated-indexes.md`

专门说明：

- generated 索引是什么
- 哪些文件是机器生成
- workflow 使用者什么时候需要去看它们

---

## 12. 核心栏目设计：参考

Reference 栏目不是新手入口，而是“用到时查”。

### 12.1 `reference/index.md`

定位：

- 命令、结构、契约、FAQ 集中入口

### 12.2 `workflow-state-machine.md`

说明：

- `current_phase`
- `consent`
- `verify-all`
- `reset`
- `advance`

### 12.3 `gate-contract.md`

提炼门控契约文档核心内容，不一定要原文照搬。

### 12.4 `pipeline-layout.md`

解释 run-state 目录结构：

- `pipeline.json`
- `AR_design.md`
- `todo.md`
- `evidence/`
- `reports/`

### 12.5 `key-commands.md`

按场景列关键命令：

- init
- advance
- consent
- reset
- verify-all
- 各 gate 调用

### 12.6 `skill-map.md`

做成查表页：

- 阶段 → 技能
- 任务 → 技能
- 输入类型 → 技能

### 12.7 `faq.md`

收录高频误解：

- 为什么 gate PASS 了还不能前进
- 为什么改了代码必须回 P1
- 为什么不允许只看文本报告
- 为什么需要 issue 才建 PR
- 为什么知识库不是源码真相

---

## 13. 核心栏目设计：案例归档

用途：

- 展示真实案例
- 展示方案和设计记录
- 不挤占主流程页面

建议包括：

- `thread-leak-detector.md`
- `appfreeze-recovery-barrier.md`
- `weak-model-optimization.md`

这些页面适合做成：

- 背景
- 目标
- 方案
- 流程使用情况
- 产出与经验

---

## 14. 页面风格建议（官网感设计）

### 14.1 文档风格

整体风格建议：

- 首页偏产品官网
- 栏目首页偏导航门户
- 详细页偏技术文档
- 示例页偏教程风格

### 14.2 每类页面的写法

#### 首页
- 少表格
- 多卡片
- 多 CTA
- 强调价值和路径

#### Workflow 页
- 强流程图
- 强阶段说明
- 强“输入 / 动作 / gate / 人工确认 / 产物”结构

#### Skill 页
- 强示例
- 强“什么时候用”
- 强与 workflow 关系

#### Knowledge Base 页
- 强“怎么辅助 workflow”
- 减少自我中心描述

### 14.3 版式建议

每个核心页面建议遵循统一结构：

1. 本页解决什么问题
2. 什么时候看这页
3. 核心概念 / 流程
4. 关键操作示例
5. 常见误区
6. 延伸阅读

这样整站阅读体验会统一很多。

---

## 15. 与现有仓内容的映射建议

以下是“文档站页面”与“仓内现有内容”之间的建议映射，不代表原文直搬。

### 15.1 根 workflow 相关

来源：
- `README.md`
- `skills/ohos-ar-dev-workflow/SKILL.md`
- `skills/ohos-ar-dev-phases/SKILL.md`
- `skills/ohos-ar-dev-phases/phase1-develop.md` ~ `phase6-upload-review.md`

适合生成：
- Workflow 首页
- Lifecycle Overview
- 各 phase 页
- Consent / Reset 页
- Evidence / Gates 页

### 15.2 Skill 相关

来源：
- `skills/ohos-ar-dev-init/SKILL.md`
- `skills/ohos-dev-build-execution-diagnosis/SKILL.md`
- `skills/ohos-test-ut-generation/SKILL.md`
- `skills/ohos-dev-hdc-command-usage/SKILL.md`
- `skills/ohos-build-flash/SKILL.md`
- `skills/ohos-ci-gitcode-cli-usage/SKILL.md`
- `skills/ohos-dev-gitcode-pr-review/SKILL.md`

适合生成：
- Skill Playbooks 各页
- 组合拳页
- 命令参考页中的精选片段

### 15.3 知识库相关

来源：
- `openharmony-knowledge-base/README.md`
- `openharmony-knowledge-base/USAGE.md`
- `openharmony-knowledge-base/INFORMATION_ARCHITECTURE.md`
- `architecture/*`
- `source-domains/*`
- `subsystems/*`
- `products/*`

适合生成：
- Knowledge Base 栏目
- Workflow 支撑说明页
- 分域导航页

### 15.4 案例相关

来源：
- `products/20260707-thread-leak-detector/*`
- `products/20260715-appfreeze-recovery-barrier/*`
- `products/20260723-weak-model-optimization/*`

适合生成：
- Cases 栏目
- 项目演进记录
- 方法论沉淀页

---

## 16. 首批落地建议（后续实施时）

虽然现在不实施，但建议未来真正开始搭站时分三批推进。

### 第一批：先搭“主产品骨架”

先做：

1. 首页
2. 开始使用
3. Workflow 栏目
4. Skill 实战首页
5. 一个最关键示例页

这样就已经能向外展示这套系统的核心价值。

### 第二批：补全 skill 和典型示例

再做：

1. build / test / hdc / flash / GitCode review 页面
2. common combinations
3. examples 完整化

### 第三批：引入知识库二级导航

最后再做：

1. Knowledge Base 首页
2. how-it-supports-workflow
3. architecture / subsystems / products / generated 入口页

这样可以避免一开始就被知识库体量吞掉站点主线。

---

## 17. 推荐首页文案方向（简稿）

以下是后续可直接用于首页的文案方向草案。

### Hero 标题

**AI-AR Workflow**

### Hero 副标题

面向 OpenHarmony / OHOS 研发的证据门控开发流水线

### Hero 描述

从已澄清 AR 出发，自动推进设计、开发、编译、测试、真机验证、质量验证与上库 review。每个阶段只能由真实证据与确定性门控脚本判定通过，而不是由模型文本“宣布完成”。

### 首页三大入口

- **快速开始**：第一次使用 workflow 的最短路径
- **完整开发流程**：从 P0 到 P6 的全生命周期说明
- **Skill 实战**：查看各阶段常用 skill 的调用示例与组合方式

### 首页说明知识库的方式

OpenHarmony 知识库为 workflow 提供代码定位、依赖分析、构建目标和验证边界支撑，但不替代当前源码与真实运行证据。

---

## 18. 方案总结

本方案的关键判断是：

1. 文档站主线必须从“如何使用 workflow 开发代码”展开
2. workflow 生命周期是站点绝对核心
3. skill 不应作为零散工具展示，而应作为开发流程中的能力节点展示
4. 知识库应作为 workflow 的支撑能力，而不是与主线并列争夺首页重心
5. 原仓内容应保留为真源，后续通过新的 docs 目录重组，而不是改原文件

最终目标不是把 Markdown 搬上站，而是把项目升级成一个：

> **用户一看就知道怎么开始、一用就知道每阶段怎么推进、一查就知道对应 skill 怎么配合的 workflow 官网。**

---

## 19. 后续实施建议（未来开始实时落地时）

建议未来真正实施时按以下顺序：

1. 先建 `docs/index.md` 和顶层栏目骨架
2. 先完成 `getting-started/` 与 `workflow/`
3. 再补 `skill-playbooks/`
4. 再补 `examples/`
5. 最后再引入 `knowledge-base/` 二级栏目
6. 再补 `reference/` 和 `cases/`

原因很简单：

- 先把用户最关心的主路径搭好
- 再补技能使用方式
- 知识库后置，避免信息重心偏移
- 参考和归档最后补，避免早期站点显得“内容多但主线不清”

---

## 20. 本文档定位

本文件是：

- VitePress 文档站信息架构与页面设计方案
- workflow 优先、skill 重点、知识库次级的重构方案
- 后续实施阶段的导航蓝图

当前仅为设计方案，不代表任何站点文件已创建或现有仓内容已修改。
