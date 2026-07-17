# ability：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 8 |
| rk3568 选入部件 | 5 |
| GN 目标 | 5044 |
| 生产目标 | 716 |
| 测试目标 | 3677 |
| 构建支持目标 | 312 |
| 聚合/代码生成目标 | 339 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| ability_base | yes | foundation/ability/ability_base | 123 | 10 | 88 | [查看](components/ability_base/foundation-index.md) |
| ability_cangjie_wrapper | no | foundation/ability/ability_cangjie_wrapper | 27 | 24 | 1 | [查看](components/ability_cangjie_wrapper/foundation-index.md) |
| ability_lite | no | foundation/ability/ability_lite | 25 | 13 | 5 | [查看](components/ability_lite/foundation-index.md) |
| ability_runtime | yes | foundation/ability/ability_runtime | 3810 | 558 | 2771 | [查看](components/ability_runtime/foundation-index.md) |
| dmsfwk | yes | foundation/ability/dmsfwk | 233 | 36 | 156 | [查看](components/dmsfwk/foundation-index.md) |
| dmsfwk_lite | no | foundation/ability/dmsfwk_lite | 5 | 2 | 2 | [查看](components/dmsfwk_lite/foundation-index.md) |
| form_fwk | yes | foundation/ability/form_fwk | 675 | 72 | 531 | [查看](components/form_fwk/foundation-index.md) |
| idl_tool | yes | foundation/ability/idl_tool | 146 | 1 | 123 | [查看](components/idl_tool/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "ability"' specs/knowledge-base/generated/foundation/modules.tsv
```
