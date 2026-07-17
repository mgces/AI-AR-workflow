# distributeddatamgr_cangjie_wrapper：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `distributeddatamgr` |
| component | `distributeddatamgr_cangjie_wrapper` |
| Git 子仓 | `foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper` |
| bundle | [foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/bundle.json](../../../../../../foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/bundle.json) |
| rk3568 selected | no |
| adapted systems | standard |
| component dependencies | 7 |
| third-party dependencies | 0 |
| declared sub_component | 6 |
| inner kits | 3 |
| declared test entries | 0 |

## 依赖

组件依赖：`ability_cangjie_wrapper`, `cangjie_ark_interop`, `data_share`, `hiviewdfx_cangjie_wrapper`, `kv_store`, `preferences`, `relational_store`

三方依赖：无声明

## 声明构建入口

- `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/data_share_predicates:ohos.data.data_share_predicates`
- `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/distributed_kv_store:ohos.data.distributed_kv_store`
- `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/preferences:ohos.data.preferences`
- `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/relational_store:ohos.data.relational_store`
- `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/values_bucket:ohos.data.values_bucket`
- `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/kit/ArkData:kit.ArkData`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 7 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 1 |
| total | 8 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_cangjie_shared_library` | `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/data_share_predicates:ohos.data.data_share_predicates` | [foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/data_share_predicates/BUILD.gn](../../../../../../foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/data_share_predicates/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/distributed_kv_store:ohos.data.distributed_kv_store` | [foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/distributed_kv_store/BUILD.gn](../../../../../../foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/distributed_kv_store/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data:ohos.data` | [foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/BUILD.gn](../../../../../../foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/relational_store:ohos.data.relational_store` | [foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/relational_store/BUILD.gn](../../../../../../foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/relational_store/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/values_bucket:ohos.data.values_bucket` | [foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/values_bucket/BUILD.gn](../../../../../../foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/values_bucket/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/preferences:ohos.data.preferences` | [foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/preferences/BUILD.gn](../../../../../../foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/ohos/data/preferences/BUILD.gn) | 19 |
| aggregate-codegen | `copy_ohos_cangjie_sdk_api_lib` | `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper:copy_sdk_distributeddatamgr_cangjie_libs` | [foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/BUILD.gn](../../../../../../foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/BUILD.gn) | 25 |
| production | `ohos_cangjie_shared_library` | `//foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/kit/ArkData:kit.ArkData` | [foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/kit/ArkData/BUILD.gn](../../../../../../foundation/distributeddatamgr/distributeddatamgr_cangjie_wrapper/kit/ArkData/BUILD.gn) | 19 |

## 查询命令

```bash
awk -F '\t' '$1 == "distributeddatamgr" && $2 == "distributeddatamgr_cangjie_wrapper"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
