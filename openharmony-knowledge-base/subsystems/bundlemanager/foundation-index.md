# bundlemanager：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 7 |
| rk3568 选入部件 | 5 |
| GN 目标 | 1722 |
| 生产目标 | 148 |
| 测试目标 | 1407 |
| 构建支持目标 | 98 |
| 聚合/代码生成目标 | 69 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| app_domain_verify | yes | foundation/bundlemanager/app_domain_verify | 80 | 16 | 27 | [查看](components/app_domain_verify/foundation-index.md) |
| bundle_framework | yes | foundation/bundlemanager/bundle_framework | 1530 | 98 | 1334 | [查看](components/bundle_framework/foundation-index.md) |
| bundle_framework_lite | no | foundation/bundlemanager/bundle_framework_lite | 16 | 11 | 0 | [查看](components/bundle_framework_lite/foundation-index.md) |
| bundle_tool | yes | foundation/bundlemanager/bundle_tool | 43 | 4 | 31 | [查看](components/bundle_tool/foundation-index.md) |
| bundlemanager_cangjie_wrapper | no | foundation/bundlemanager/bundlemanager_cangjie_wrapper | 6 | 5 | 0 | [查看](components/bundlemanager_cangjie_wrapper/foundation-index.md) |
| distributed_bundle_framework | yes | foundation/bundlemanager/distributed_bundle_framework | 36 | 10 | 13 | [查看](components/distributed_bundle_framework/foundation-index.md) |
| ecological_rule_manager | yes | foundation/bundlemanager/ecological_rule_manager | 11 | 4 | 2 | [查看](components/ecological_rule_manager/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "bundlemanager"' specs/knowledge-base/generated/foundation/modules.tsv
```
