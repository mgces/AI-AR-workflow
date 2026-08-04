# 架构总览

> 把 `INFORMATION_ARCHITECTURE.md`、`architecture/system.md`、`architecture/build-runtime.md` 组合成架构层导航。

## 信息架构(INFORMATION_ARCHITECTURE.md)

知识库采用层结构组织:

| 层 | 内容 | 来源 |
|---|---|---|
| 子系统层 | 顶层分区及其组件概览 | 手写 + 机器索引 |
| 组件层 | 组件的 capability / feature / 构建目标 | 手写 + 机器索引 |
| 运行实体层 | 可运行二进制的部署路径与运行关系 | 机器生成 |
| 索引层 | components.tsv / projects.tsv / products.tsv 等 | 机器生成(gitignore) |

## system架构(architecture/system.md)

OHOS 系统的整体架构:子系统分区、组件依赖、运行实体关系。支撑:

- 影响面分析:改动组件的下游依赖
- 仓状态:组件是否独立 git 仓
- 构建与运行关系:组件的构建产物路径

## build-runtime架构(architecture/build-runtime.md)

构建与运行时的对应关系:

- GN 构建目标 → 产物路径
- developer_test testpart → suite 归属
- 真机部署路径 → 设备运行实体

支撑 P4 编译与 P6 端到端功能测试阶段的产物路径确定。

## 与 workflow 的关系

| 阶段 | 用到哪层 |
|---|---|
| P1 设计 | 子系统层 + 组件层(定位 build target / test part) |
| P3~P7 验证 | build-runtime 架构(产物路径 + 测试边界) |
| P8 上库 | system 架构(影响面 + 仓状态) |

## 延伸阅读

- [源代码域](/knowledge-base/source-domains) — 源代码分类
- [workspace 与生成索引](/knowledge-base/workspace-and-generated-indexes) — 机器生成索引说明
- [知识库如何支撑 workflow](/knowledge-base/how-it-supports-workflow) — 三个使用时机
