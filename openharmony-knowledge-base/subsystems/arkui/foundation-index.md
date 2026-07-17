# arkui：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 7 |
| rk3568 选入部件 | 5 |
| GN 目标 | 1773 |
| 生产目标 | 713 |
| 测试目标 | 609 |
| 构建支持目标 | 174 |
| 聚合/代码生成目标 | 277 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| ace_engine | yes | foundation/arkui/ace_engine | 1358 | 479 | 496 | [查看](components/ace_engine/foundation-index.md) |
| ace_engine_lite | no | foundation/arkui/ace_engine_lite | 79 | 9 | 62 | [查看](components/ace_engine_lite/foundation-index.md) |
| advanced_ui_component | yes | foundation/arkui/advanced_ui_component | 45 | 22 | 0 | [查看](components/advanced_ui_component/foundation-index.md) |
| arkui_cangjie_wrapper | no | foundation/arkui/arkui_cangjie_wrapper | 96 | 94 | 0 | [查看](components/arkui_cangjie_wrapper/foundation-index.md) |
| napi | yes | foundation/arkui/napi | 139 | 92 | 34 | [查看](components/napi/foundation-index.md) |
| ui_appearance | yes | foundation/arkui/ui_appearance | 28 | 11 | 10 | [查看](components/ui_appearance/foundation-index.md) |
| ui_lite | yes | foundation/arkui/ui_lite | 28 | 6 | 7 | [查看](components/ui_lite/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "arkui"' specs/knowledge-base/generated/foundation/modules.tsv
```
