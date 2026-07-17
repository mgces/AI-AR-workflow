# bundlemanager_cangjie_wrapper：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `bundlemanager` |
| component | `bundlemanager_cangjie_wrapper` |
| Git 子仓 | `foundation/bundlemanager/bundlemanager_cangjie_wrapper` |
| bundle | [foundation/bundlemanager/bundlemanager_cangjie_wrapper/bundle.json](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/bundle.json) |
| rk3568 selected | no |
| adapted systems | standard |
| component dependencies | 5 |
| third-party dependencies | 0 |
| declared sub_component | 4 |
| inner kits | 3 |
| declared test entries | 0 |

## 依赖

组件依赖：`cangjie_ark_interop`, `global_cangjie_wrapper`, `hiviewdfx_cangjie_wrapper`, `bundle_framework`, `ability_runtime`

三方依赖：无声明

## 声明构建入口

- `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/bundle/bundle_manager:ohos.bundle.bundle_manager`
- `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/element_name:ohos.element_name`
- `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/metadata:ohos.metadata`
- `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/skill:ohos.skill`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 5 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 1 |
| total | 6 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_cangjie_shared_library` | `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/element_name:ohos.element_name` | [foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/element_name/BUILD.gn](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/element_name/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/bundle:ohos.bundle` | [foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/bundle/BUILD.gn](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/bundle/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/bundle/bundle_manager:ohos.bundle.bundle_manager` | [foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/bundle/bundle_manager/BUILD.gn](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/bundle/bundle_manager/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/metadata:ohos.metadata` | [foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/metadata/BUILD.gn](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/metadata/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/skill:ohos.skill` | [foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/skill/BUILD.gn](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/ohos/skill/BUILD.gn) | 18 |
| aggregate-codegen | `copy_ohos_cangjie_sdk_api_lib` | `//foundation/bundlemanager/bundlemanager_cangjie_wrapper:copy_sdk_bundlemanager_cangjie_libs` | [foundation/bundlemanager/bundlemanager_cangjie_wrapper/BUILD.gn](../../../../../../foundation/bundlemanager/bundlemanager_cangjie_wrapper/BUILD.gn) | 23 |

## 查询命令

```bash
awk -F '\t' '$1 == "bundlemanager" && $2 == "bundlemanager_cangjie_wrapper"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
