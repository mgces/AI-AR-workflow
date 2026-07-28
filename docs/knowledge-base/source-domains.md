# 源代码域

> 给出 `source-domains/` 的二级入口说明,不一上来铺开所有页面。

## source-domains 是什么

`openharmony-knowledge-base/source-domains/` 按源代码域分类组织,每个域下含该域的组件与构建信息。

典型域分类:

- `developtools/` — 开发工具
- `foundation/` — 基础能力
- `hiviewdfx/` — 维测与日志

## 什么时候看这页

- P1 设计时需要确认 AR 改的组件属于哪个域
- P8 评审前需要分析影响面,按域查下游依赖
- 想理解 OHOS 仓的顶层分区时

## 二级入口

各域下不直接展开所有组件页面,而是给入口说明:

- 域的职责边界
- 域下组件清单
- 域的构建与测试约定

具体域页面请直接查 `openharmony-knowledge-base/source-domains/<域>/` 目录。

## 延伸阅读

- [子系统](/knowledge-base/subsystems) — 子系统专题导航
- [架构总览](/knowledge-base/architecture-overview) — 层结构
- [知识库如何支撑 workflow](/knowledge-base/how-it-supports-workflow) — 开发前定位
