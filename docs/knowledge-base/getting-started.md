# 快速上手

> 从知识库原 `README.md` 和 `USAGE.md` 提炼:如何开始用知识库、什么是子系统/组件/运行实体/capability/feature。

## 如何开始用知识库

知识库本体在仓内 `openharmony-knowledge-base/` 目录。两种使用方式:

### 方式 A:被 workflow 自动调用

P1 设计固化前,编排器自动跑 `kb_search.py` 检索知识库生成 `design_refs.md`。你通常不需要手动跑。

### 方式 B:手动检索

```bash
# BM25 lexical 检索(需先建索引)
python3 openharmony-knowledge-base/tools/search/build_index.py
python3 openharmony-knowledge-base/tools/search/search.py "<query>"
```

> 搜索索引是机器生成的派生产物(`generated/search-index/`),已 gitignore——本地用 `build_index.py` 重建,不入仓。

## 核心概念

| 概念 | 含义 | 例子 |
|---|---|---|
| **子系统** subsystem | OHOS 顶层分区 | `hiviewdfx`、`kernel`、`graphic` |
| **组件** component | 子系统下的可构建单元 | `hiview`、`hidumper` |
| **运行实体** runnable | 组件产出的可运行二进制 | `hiview` 进程、`.so` 库 |
| **capability** | 组件对外声明的能力 | 维测、日志、崩溃抓取 |
| **feature** | capability 下的具体功能 | 线程泄漏检测、事件阈值 |

## 目录结构概览

```
openharmony-knowledge-base/
├── README.md / USAGE.md                ← 入口与用法
├── INFORMATION_ARCHITECTURE.md         ← 信息架构
├── architecture/                       ← system / build-runtime 架构层
├── source-domains/                     ← 源代码域分类
├── subsystems/                         ← 子系统专题(含 feature 专题)
├── products/                           ← 产品选入(rk3568-parts.tsv)
├── generated/                          ← 机器生成索引(gitignore)
├── templates/                          ← capability / feature 模板
└── tools/                              ← 索引与检索工具
```

## 延伸阅读

- [架构总览](/knowledge-base/architecture-overview) — 层结构导航
- [workspace 与生成索引](/knowledge-base/workspace-and-generated-indexes) — generated 目录说明
- [知识库如何支撑 workflow](/knowledge-base/how-it-supports-workflow) — 三个使用时机
