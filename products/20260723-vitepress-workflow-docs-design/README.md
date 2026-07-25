# 本目录说明

本目录保存的是 **AI-AR-workflow 文档站（VitePress 方向）设计方案**，用于后续搭建文档站时参考。

## 文件

- `vitepress_workflow_docs_design_proposal.md`
  - 面向 workflow 主线、skill 实战重点、知识库次级展示的完整文档站设计方案

## 设计原则摘要

- 不改动现有仓内 README / SKILL / 知识库文件
- 后续若实施，建议通过新的 `docs/` 目录重组内容
- 文档站首页与主导航优先展示：
  1. 如何开始使用 workflow
  2. 如何按阶段推进代码开发
  3. 各阶段 skill 的典型使用示例
- 知识库作为辅助能力与二级入口展示

## 后续实施建议

真正开始搭建时，建议先做：

1. 首页
2. `getting-started/`
3. `workflow/`
4. `skill-playbooks/`

然后再补：

5. `examples/`
6. `knowledge-base/`
7. `reference/`
8. `cases/`

当前仅保存设计方案，未对原工程做任何结构改动。
