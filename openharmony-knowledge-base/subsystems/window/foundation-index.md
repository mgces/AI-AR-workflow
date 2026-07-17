# window：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 3 |
| rk3568 选入部件 | 1 |
| GN 目标 | 1000 |
| 生产目标 | 143 |
| 测试目标 | 691 |
| 构建支持目标 | 108 |
| 聚合/代码生成目标 | 58 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| window_cangjie_wrapper | no | foundation/window/window_cangjie_wrapper | 3 | 2 | 0 | [查看](components/window_cangjie_wrapper/foundation-index.md) |
| window_manager | yes | foundation/window/window_manager | 988 | 137 | 687 | [查看](components/window_manager/foundation-index.md) |
| window_manager_lite | no | foundation/window/window_manager_lite | 9 | 4 | 4 | [查看](components/window_manager_lite/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "window"' specs/knowledge-base/generated/foundation/modules.tsv
```
