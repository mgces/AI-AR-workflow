# 子系统

> 给出 `subsystems/` 的二级入口说明,不一上来铺开所有页面。

## subsystems 是什么

`openharmony-knowledge-base/subsystems/` 按子系统专题组织,每个子系统下含:

- 子系统概览(`README.md`)
- 组件清单与构建目标
- capability / feature 专题(手写或机器生成)

典型子系统:`ability` / `ai` / `arkui` / `bundlemanager` / `communication` / `developtools` / `deviceprofile` / `distributeddatamgr` / `filemanagement` / `graphic` / `hiviewdfx` / `kernel` / `multimedia` / `multimodalinput` / `officeservice` / `resourceschedule` / `systemabilitymgr` / `window`。

## 什么时候看这页

- P1 设计时需要定位 AR 改的子系统与组件
- P1 设计时想参考已有 feature 专题的代码结构与测试模式
- P8 评审前需要分析改动组件的下游依赖

## 二级入口

各子系统下不直接展开所有 feature 页面,而是给入口说明:

- 子系统的职责边界
- 子系统下组件清单
- 子系统的构建与测试约定
- feature 专题回填说明

具体子系统页面请直接查 `openharmony-knowledge-base/subsystems/<子系统>/` 目录。

## feature 专题回填

workflow 完成后,按需把某次 run 沉淀成知识库 feature 专题——**不是**常规完成步骤,只在手动触发时:

```bash
archive_product.py --sink-feature <subsystem>/<component>/<feature>
```

写到 `openharmony-knowledge-base/subsystems/.../features/<feature>/README.md`,目标已存在则写 `README.generated.md` 不覆盖。知识库更新后,P1 的 `kb_search.py` 会在下次检索时自动增量刷新索引。

## 延伸阅读

- [源代码域](/knowledge-base/source-domains) — 源代码分类
- [workspace 与生成索引](/knowledge-base/workspace-and-generated-indexes) — generated 目录
- [知识库如何支撑 workflow](/knowledge-base/how-it-supports-workflow) — 开发前定位
