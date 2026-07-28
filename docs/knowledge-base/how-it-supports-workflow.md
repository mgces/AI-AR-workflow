# 知识库如何支撑 workflow

> 建议明确三个使用时机:开发前定位、验证前确定边界、评审前分析影响面。

## 开发前:定位子系统、组件、build target、test part

P1 设计固化前,编排器先用 `kb_search.py` 检索知识库生成 `design_refs.md`(advisory,失败不阻断)。

知识库帮你:

- 从 AR 描述定位到**子系统**(如 `hiviewdfx`)→**组件**(如 `hiview`)
- 确定 GN **build target**(如 `hiview_package`)
- 确定 developer_test **test part**(如 `hiviewdfx`)与套件名
- 参考已有 feature 专题的代码结构与测试模式

产出 `design_refs.md` 供写 `AR_design.md` 参考,但**不进门控**——设计门只校验 AR_design 格式与签名。

## 验证前:确定依赖范围、测试边界、产品选入情况

P3~P7 验证阶段,知识库帮你:

- **依赖范围**:组件的 subsystems 依赖、构建依赖
- **测试边界**:testpart 与 suite 的归属,避免把测试写到错误组件
- **产品选入**:rk3568 产品选入了哪些子系统/组件(`products/rk3568-parts.tsv`)

这影响 `build_artifacts` / `test_cases` / `device_cases` 契约的完整性。

## 评审前:分析影响面、仓状态、构建与运行关系

P8 上库前,知识库帮你:

- **影响面**:改动组件的下游依赖(`workspace-summary.json`)
- **仓状态**:组件是否独立 git 仓、HEAD 状态
- **构建与运行关系**:组件的构建产物路径、运行实体、capability

支撑本地自检与 PR review 的影响面分析。

## 知识库是 advisory 不进门控

关键边界:

- 知识库内容**不替代**当前源码与真实运行证据
- 门控只认 `evidence/` 真实证据,知识库是 advisory
- P1 的 `kb_search.py` 失败不阻断——advisory,不是必需
- 知识库可能滞后于源码,以当前源码为准

## 延伸阅读

- [快速上手](/knowledge-base/getting-started) — 核心概念
- [架构总览](/knowledge-base/architecture-overview) — 知识库的层结构
- [P1 设计与开发](/workflow/phase-1-design-and-develop) — kb_search 在 P1 的位置
- [FAQ](/reference/faq) — "为什么知识库不是源码真理"
