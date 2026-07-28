# 知识库

> 用知识库支撑 workflow 的代码定位、构建边界和验证范围判断——这里不再以知识库自身为中心，而是先回答它在 workflow 什么时候能帮你。

## 在 workflow 什么时候需要知识库

| 时机 | 知识库帮你什么 |
|---|---|
| **开发前** | 定位子系统、组件、build target、test part |
| **验证前** | 确定依赖范围、测试边界、产品选入情况 |
| **评审前** | 分析影响面、仓状态、构建与运行关系 |

详见 [知识库如何支撑 workflow](/knowledge-base/how-it-supports-workflow)。

## 如果只是想跑 workflow,哪些值得先看

- [如何支撑 workflow](/knowledge-base/how-it-supports-workflow) — 三个使用时机
- [快速上手](/knowledge-base/getting-started) — 子系统/组件/运行实体/capability/feature 概念
- [workspace 与生成索引](/knowledge-base/workspace-and-generated-indexes) — 哪些是机器生成、什么时候需要看

## 本栏目各页

- [如何支撑 workflow](/knowledge-base/how-it-supports-workflow) — 开发前/验证前/评审前
- [快速上手](/knowledge-base/getting-started) — 核心概念
- [架构总览](/knowledge-base/architecture-overview) — INFORMATION_ARCHITECTURE / system / build-runtime
- [源代码域](/knowledge-base/source-domains) — 二级入口说明
- [子系统](/knowledge-base/subsystems) — 二级入口说明
- [产品](/knowledge-base/products) — 二级入口说明
- [workspace 与生成索引](/knowledge-base/workspace-and-generated-indexes) — generated 索引是什么

## 知识库不替代源码真相

知识库为 workflow 提供代码定位、依赖分析、构建目标和验证边界支撑，**但不替代当前源码与真实运行证据**。门控只认 `evidence/` 真实证据，知识库内容是 advisory 不进门控。

## 延伸阅读

- [Skill 映射参考](/reference/skill-map) — kb_search.py 的调用位置
- [FAQ](/reference/faq) — "为什么知识库不是源码真相"
