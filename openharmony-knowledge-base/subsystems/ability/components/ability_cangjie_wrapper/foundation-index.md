# ability_cangjie_wrapper：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `ability` |
| component | `ability_cangjie_wrapper` |
| Git 子仓 | `foundation/ability/ability_cangjie_wrapper` |
| bundle | [foundation/ability/ability_cangjie_wrapper/bundle.json](../../../../../../foundation/ability/ability_cangjie_wrapper/bundle.json) |
| rk3568 selected | no |
| adapted systems | standard |
| component dependencies | 12 |
| third-party dependencies | 0 |
| declared sub_component | 2 |
| inner kits | 8 |
| declared test entries | 0 |

## 依赖

组件依赖：`ability_runtime`, `access_token`, `accesscontrol_cangjie_wrapper`, `cangjie_ark_interop`, `arkui_cangjie_wrapper`, `hiviewdfx_cangjie_wrapper`, `bundlemanager_cangjie_wrapper`, `communication_cangjie_wrapper`, `global_cangjie_wrapper`, `multimedia_cangjie_wrapper`, `window_cangjie_wrapper`, `testfwk_cangjie_wrapper`

三方依赖：无声明

## 声明构建入口

- `//foundation/ability/ability_cangjie_wrapper/ohos:ability_package`
- `//foundation/ability/ability_cangjie_wrapper/kit/AbilityKit:kit.AbilityKit`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 24 |
| test | 1 |
| build-support | 0 |
| aggregate-codegen | 2 |
| total | 27 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/application/error_observer:ohos.application.error_observer` | [foundation/ability/ability_cangjie_wrapper/ohos/application/error_observer/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/application/error_observer/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/application/event_hub:ohos.application.event_hub` | [foundation/ability/ability_cangjie_wrapper/ohos/application/event_hub/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/application/event_hub/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/application:ohos.application` | [foundation/ability/ability_cangjie_wrapper/ohos/application/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/application/BUILD.gn) | 18 |
| test | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/application/test_runner:ohos.application.test_runner` | [foundation/ability/ability_cangjie_wrapper/ohos/application/test_runner/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/application/test_runner/BUILD.gn) | 18 |
| aggregate-codegen | `group` | `//foundation/ability/ability_cangjie_wrapper/ohos:ability_package` | [foundation/ability/ability_cangjie_wrapper/ohos/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app:ohos.app` | [foundation/ability/ability_cangjie_wrapper/ohos/app/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ability_stage:ohos.app.ability.ability_stage` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ability_stage/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ability_stage/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/context_constant:ohos.app.ability.context_constant` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/context_constant/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/context_constant/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ability_delegator_registry:ohos.app.ability.ability_delegator_registry` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ability_delegator_registry/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ability_delegator_registry/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/open_link_options:ohos.app.ability.open_link_options` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/open_link_options/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/open_link_options/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/want_constant:ohos.app.ability.want_constant` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/want_constant/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/want_constant/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ability_constant:ohos.app.ability.ability_constant` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ability_constant/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ability_constant/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/want:ohos.app.ability.want` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/want/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/want/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability:ohos.app.ability` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/common:ohos.app.ability.common` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/common/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/common/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/start_options:ohos.app.ability.start_options` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/start_options/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/start_options/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/dialog_request:ohos.app.ability.dialog_request` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/dialog_request/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/dialog_request/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/error_manager:ohos.app.ability.error_manager` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/error_manager/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/error_manager/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/completion_handler:ohos.app.ability.completion_handler` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/completion_handler/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/completion_handler/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/configuration:ohos.app.ability.configuration` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/configuration/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/configuration/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ui_ability:ohos.app.ability.ui_ability` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ui_ability/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/ui_ability/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/app/ability/app_recovery:ohos.app.ability.app_recovery` | [foundation/ability/ability_cangjie_wrapper/ohos/app/ability/app_recovery/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/app/ability/app_recovery/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/ability/connect_options:ohos.ability.connect_options` | [foundation/ability/ability_cangjie_wrapper/ohos/ability/connect_options/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/ability/connect_options/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/ability:ohos.ability` | [foundation/ability/ability_cangjie_wrapper/ohos/ability/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/ability/BUILD.gn) | 18 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/ohos/ability/ability_result:ohos.ability.ability_result` | [foundation/ability/ability_cangjie_wrapper/ohos/ability/ability_result/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/ohos/ability/ability_result/BUILD.gn) | 18 |
| aggregate-codegen | `copy_ohos_cangjie_sdk_api_lib` | `//foundation/ability/ability_cangjie_wrapper:copy_sdk_ability_cangjie_libs` | [foundation/ability/ability_cangjie_wrapper/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/BUILD.gn) | 45 |
| production | `ohos_cangjie_shared_library` | `//foundation/ability/ability_cangjie_wrapper/kit/AbilityKit:kit.AbilityKit` | [foundation/ability/ability_cangjie_wrapper/kit/AbilityKit/BUILD.gn](../../../../../../foundation/ability/ability_cangjie_wrapper/kit/AbilityKit/BUILD.gn) | 19 |

## 查询命令

```bash
awk -F '\t' '$1 == "ability" && $2 == "ability_cangjie_wrapper"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
