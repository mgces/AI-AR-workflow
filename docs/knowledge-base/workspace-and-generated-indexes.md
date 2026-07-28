# workspace 与生成索引

> 专门说明:generated 索引是什么、哪些文件是机器生成、workflow 使用者什么时候需要去看它们。

## generated 索引是什么

`openharmony-knowledge-base/generated/` 是机器生成的派生索引,从源码仓扫描产出,便于快速定位:

| 文件 | 内容 |
|---|---|
| `components.tsv` | 全仓组件清单 |
| `projects.tsv` | GN 项目清单 |
| `workspace-summary.json` | workspace 依赖关系摘要 |
| `<域>-parts.tsv` | 各域/产品的部件清单 |
| `search-index/` | BM25 检索索引(gitignore,本地重建) |

这些是**派生产物**,不是源真相——源真相在当前 OHOS 源码仓。

## 哪些文件是机器生成

| 路径 | 性质 | gitignore |
|---|---|---|
| `generated/*.tsv` | 机器生成索引 | 是 |
| `generated/workspace-summary.json` | 机器生成依赖摘要 | 是 |
| `generated/search-index/` | BM25 检索索引 | 是 |
| `subsystems/**/README.generated.md` | feature 专题机器生成副本 | 是 |
| `subsystems/**/README.md` | feature 专题手写正文 | 否 |

机器生成的都在 `.gitignore` 里封禁 `generated/search-index/`,本地用 `tools/search/build_index.py` 重建。

## workflow 使用者什么时候需要去看它们

**大多数时候不需要**。workflow 使用者主要在 P1 设计时通过 `kb_search.py` 间接消费索引——编排器自动检索生成 `design_refs.md`,你不必手动翻 `generated/`。

只有这些情况才需要直接看:

- **知识库索引过期**:源码仓有更新,索引未刷新 → 手动跑 `tools/generate-global-index.sh` 等重建
- **想手动检索**:先 `build_index.py` 建搜索索引,再 `search.py "<query>"`
- **想理解依赖关系**:`workspace-summary.json` 看组件下游依赖(评审前影响面分析)
- **想确认产品选入**:`<产品>-parts.tsv` 看部件是否在该产品

## 延伸阅读

- [快速上手](/knowledge-base/getting-started) — BM25 检索用法
- [架构总览](/knowledge-base/architecture-overview) — 层结构与索引层
- [知识库如何支撑 workflow](/knowledge-base/how-it-supports-workflow) — 三个使用时机
