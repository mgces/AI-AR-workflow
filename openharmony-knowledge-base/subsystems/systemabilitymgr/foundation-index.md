# systemabilitymgr：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 5 |
| rk3568 选入部件 | 3 |
| GN 目标 | 221 |
| 生产目标 | 75 |
| 测试目标 | 72 |
| 构建支持目标 | 55 |
| 聚合/代码生成目标 | 19 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| safwk | yes | foundation/systemabilitymgr/safwk | 61 | 13 | 26 | [查看](components/safwk/foundation-index.md) |
| safwk_lite | no | foundation/systemabilitymgr/safwk_lite | 2 | 2 | 0 | [查看](components/safwk_lite/foundation-index.md) |
| samgr | yes | foundation/systemabilitymgr/samgr | 68 | 11 | 37 | [查看](components/samgr/foundation-index.md) |
| samgr_lite | no | foundation/systemabilitymgr/samgr_lite | 29 | 18 | 0 | [查看](components/samgr_lite/foundation-index.md) |
| selectionfwk | yes | foundation/systemabilitymgr/selectionfwk | 61 | 31 | 9 | [查看](components/selectionfwk/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "systemabilitymgr"' specs/knowledge-base/generated/foundation/modules.tsv
```
