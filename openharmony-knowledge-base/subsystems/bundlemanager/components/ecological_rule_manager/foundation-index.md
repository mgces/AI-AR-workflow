# ecological_rule_manager：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `bundlemanager` |
| component | `ecological_rule_manager` |
| Git 子仓 | `foundation/bundlemanager/ecological_rule_manager` |
| bundle | [foundation/bundlemanager/ecological_rule_manager/bundle.json](../../../../../../foundation/bundlemanager/ecological_rule_manager/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 10 |
| third-party dependencies | 0 |
| declared sub_component | 1 |
| inner kits | 2 |
| declared test entries | 1 |

## 依赖

组件依赖：`ability_base`, `ability_runtime`, `bundle_framework`, `c_utils`, `eventhandler`, `hilog`, `ipc`, `safwk`, `samgr`, `access_token`

三方依赖：无声明

## 声明构建入口

- `//foundation/bundlemanager/ecological_rule_manager:ecological_rule_mgr_packages`

## 声明测试入口

- `//foundation/bundlemanager/ecological_rule_manager/test/unittest:unittest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 4 |
| test | 2 |
| build-support | 4 |
| aggregate-codegen | 1 |
| total | 11 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/bundlemanager/ecological_rule_manager:ecological_rule_mgr_packages` | [foundation/bundlemanager/ecological_rule_manager/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/bundlemanager/ecological_rule_manager/utils:utils_config` | [foundation/bundlemanager/ecological_rule_manager/utils/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/utils/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//foundation/bundlemanager/ecological_rule_manager/utils:ecologicalrulemgrservice_utils` | [foundation/bundlemanager/ecological_rule_manager/utils/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/utils/BUILD.gn) | 20 |
| build-support | `config` | `//foundation/bundlemanager/ecological_rule_manager/interfaces/innerkits:ecologicalrulemgrservice_client_config` | [foundation/bundlemanager/ecological_rule_manager/interfaces/innerkits/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/interfaces/innerkits/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/bundlemanager/ecological_rule_manager/interfaces/innerkits:erms_client` | [foundation/bundlemanager/ecological_rule_manager/interfaces/innerkits/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/interfaces/innerkits/BUILD.gn) | 25 |
| build-support | `config` | `//foundation/bundlemanager/ecological_rule_manager/services:ecologicalrulemgrservice_config` | [foundation/bundlemanager/ecological_rule_manager/services/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/services/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//foundation/bundlemanager/ecological_rule_manager/services:ecologicalrulemgr_service` | [foundation/bundlemanager/ecological_rule_manager/services/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/services/BUILD.gn) | 26 |
| build-support | `config` | `//foundation/bundlemanager/ecological_rule_manager/test/unittest:module_private_config` | [foundation/bundlemanager/ecological_rule_manager/test/unittest/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/test/unittest/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//foundation/bundlemanager/ecological_rule_manager/test/unittest:EcologicalRuleMgrServiceClientTest` | [foundation/bundlemanager/ecological_rule_manager/test/unittest/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/test/unittest/BUILD.gn) | 32 |
| test | `group` | `//foundation/bundlemanager/ecological_rule_manager/test/unittest:unittest` | [foundation/bundlemanager/ecological_rule_manager/test/unittest/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/test/unittest/BUILD.gn) | 59 |
| production | `ohos_sa_profile` | `//foundation/bundlemanager/ecological_rule_manager/profile:ecologicalrulemgrservice_sa_profiles` | [foundation/bundlemanager/ecological_rule_manager/profile/BUILD.gn](../../../../../../foundation/bundlemanager/ecological_rule_manager/profile/BUILD.gn) | 17 |

## 查询命令

```bash
awk -F '\t' '$1 == "bundlemanager" && $2 == "ecological_rule_manager"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
