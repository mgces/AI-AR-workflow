# ai：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 3 |
| rk3568 选入部件 | 2 |
| GN 目标 | 183 |
| 生产目标 | 59 |
| 测试目标 | 88 |
| 构建支持目标 | 19 |
| 聚合/代码生成目标 | 17 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| ai_engine | no | foundation/ai/ai_engine | 57 | 35 | 15 | [查看](components/ai_engine/foundation-index.md) |
| intelligent_voice_framework | yes | foundation/ai/intelligent_voice_framework | 37 | 16 | 15 | [查看](components/intelligent_voice_framework/foundation-index.md) |
| neural_network_runtime | yes | foundation/ai/neural_network_runtime | 89 | 8 | 58 | [查看](components/neural_network_runtime/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "ai"' specs/knowledge-base/generated/foundation/modules.tsv
```
