# distributeddatamgr：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 9 |
| rk3568 选入部件 | 8 |
| GN 目标 | 1891 |
| 生产目标 | 356 |
| 测试目标 | 1185 |
| 构建支持目标 | 242 |
| 聚合/代码生成目标 | 108 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| data_object | yes | foundation/distributeddatamgr/data_object | 74 | 16 | 34 | [查看](components/data_object/foundation-index.md) |
| data_share | yes | foundation/distributeddatamgr/data_share | 227 | 74 | 119 | [查看](components/data_share/foundation-index.md) |
| datamgr_service | yes | foundation/distributeddatamgr/datamgr_service | 340 | 39 | 263 | [查看](components/datamgr_service/foundation-index.md) |
| distributeddatamgr_cangjie_wrapper | no | foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper | 8 | 7 | 0 | [查看](components/distributeddatamgr_cangjie_wrapper/foundation-index.md) |
| kv_store | yes | foundation/distributeddatamgr/kv_store | 588 | 80 | 402 | [查看](components/kv_store/foundation-index.md) |
| pasteboard | yes | foundation/distributeddatamgr/pasteboard | 112 | 22 | 70 | [查看](components/pasteboard/foundation-index.md) |
| preferences | yes | foundation/distributeddatamgr/preferences | 95 | 18 | 45 | [查看](components/preferences/foundation-index.md) |
| relational_store | yes | foundation/distributeddatamgr/relational_store | 323 | 74 | 175 | [查看](components/relational_store/foundation-index.md) |
| udmf | yes | foundation/distributeddatamgr/udmf | 124 | 26 | 77 | [查看](components/udmf/foundation-index.md) |

## 仅仓库节点

以下 Git 子仓没有 `bundle.json`，也没有可静态识别的字面量 GN 目标，因此只保留物理源码域节点，不虚构部件或模块。

- `foundation/distributeddatamgr/distributedfile`

## 全量查询

```bash
awk -F '\t' '$1 == "distributeddatamgr"' specs/knowledge-base/generated/foundation/modules.tsv
```
