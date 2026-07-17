# officeservice：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 1 |
| rk3568 选入部件 | 1 |
| GN 目标 | 105 |
| 生产目标 | 10 |
| 测试目标 | 74 |
| 构建支持目标 | 20 |
| 聚合/代码生成目标 | 1 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| object_editor | yes | foundation/officeservice/object_editor | 105 | 10 | 74 | [查看](components/object_editor/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "officeservice"' specs/knowledge-base/generated/foundation/modules.tsv
```
