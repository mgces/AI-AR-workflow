# graphic：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 7 |
| rk3568 选入部件 | 5 |
| GN 目标 | 2476 |
| 生产目标 | 251 |
| 测试目标 | 1851 |
| 构建支持目标 | 309 |
| 聚合/代码生成目标 | 65 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| graphic_2d | yes | foundation/graphic/graphic_2d | 2085 | 145 | 1670 | [查看](components/graphic_2d/foundation-index.md) |
| graphic_3d | yes | foundation/graphic/graphic_3d | 230 | 78 | 77 | [查看](components/graphic_3d/foundation-index.md) |
| graphic_cangjie_wrapper | no | foundation/graphic/graphic_cangjie_wrapper | 4 | 3 | 0 | [查看](components/graphic_cangjie_wrapper/foundation-index.md) |
| graphic_surface | yes | foundation/graphic/graphic_surface | 114 | 11 | 83 | [查看](components/graphic_surface/foundation-index.md) |
| graphic_utils_lite | yes | foundation/graphic/graphic_utils_lite | 14 | 7 | 3 | [查看](components/graphic_utils_lite/foundation-index.md) |
| graphics_effect | yes | foundation/graphic/graphics_effect | 23 | 4 | 16 | [查看](components/graphics_effect/foundation-index.md) |
| surface_lite | no | foundation/graphic/surface_lite | 6 | 3 | 2 | [查看](components/surface_lite/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "graphic"' specs/knowledge-base/generated/foundation/modules.tsv
```
