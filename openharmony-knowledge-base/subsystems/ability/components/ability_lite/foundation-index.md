# ability_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `ability` |
| component | `ability_lite` |
| Git 子仓 | `foundation/ability/ability_lite` |
| bundle | [foundation/ability/ability_lite/bundle.json](../../../../../../foundation/ability/ability_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | mini,small |
| component dependencies | 7 |
| third-party dependencies | 3 |
| declared sub_component | 3 |
| inner kits | 0 |
| declared test entries | 0 |

## 依赖

组件依赖：`bundle_framework_lite`, `kv_store`, `ui_lite`, `surface_lite`, `hilog`, `samgr_lite`, `window_manager_lite`

三方依赖：`bounds_checking_function`, `cJSON`, `freetype`

## 声明构建入口

- `//foundation/ability/ability_lite/frameworks/ability_lite:aafwk_abilitykit_lite`
- `//foundation/ability/ability_lite/frameworks/abilitymgr_lite:aafwk_abilityManager_lite`
- `//foundation/ability/ability_lite/services/abilitymgr_lite:aafwk_services_lite`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 13 |
| test | 5 |
| build-support | 2 |
| aggregate-codegen | 5 |
| total | 25 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `generate_notice_file` | `//foundation/ability/ability_lite/frameworks/want_lite:want_notice_file` | [foundation/ability/ability_lite/frameworks/want_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/want_lite/BUILD.gn) | 16 |
| production | `static_library` | `//foundation/ability/ability_lite/frameworks/want_lite:want` | [foundation/ability/ability_lite/frameworks/want_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/want_lite/BUILD.gn) | 21 |
| production | `lite_library` | `//foundation/ability/ability_lite/frameworks/abilitymgr_lite:abilitymanager` | [foundation/ability/ability_lite/frameworks/abilitymgr_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/abilitymgr_lite/BUILD.gn) | 18 |
| test | `unittest` | `//foundation/ability/ability_lite/frameworks/abilitymgr_lite:ability_manager_inner_test` | [foundation/ability/ability_lite/frameworks/abilitymgr_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/abilitymgr_lite/BUILD.gn) | 96 |
| production | `lite_component` | `//foundation/ability/ability_lite/frameworks/abilitymgr_lite:aafwk_abilityManager_lite` | [foundation/ability/ability_lite/frameworks/abilitymgr_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/abilitymgr_lite/BUILD.gn) | 103 |
| production | `lite_library` | `//foundation/ability/ability_lite/frameworks/ability_lite/example:hiability` | [foundation/ability/ability_lite/frameworks/ability_lite/example/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/ability_lite/example/BUILD.gn) | 19 |
| aggregate-codegen | `generate_notice_file` | `//foundation/ability/ability_lite/frameworks/ability_lite:ability_notice_file` | [foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn) | 19 |
| build-support | `config` | `//foundation/ability/ability_lite/frameworks/ability_lite:ability_config` | [foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn) | 27 |
| production | `lite_library` | `//foundation/ability/ability_lite/frameworks/ability_lite:ability` | [foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn) | 35 |
| production | `lite_component` | `//foundation/ability/ability_lite/frameworks/ability_lite:aafwk_abilitykit_lite` | [foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn) | 149 |
| test | `unittest` | `//foundation/ability/ability_lite/frameworks/ability_lite:ability_main_test_lv0` | [foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn) | 157 |
| build-support | `config` | `//foundation/ability/ability_lite/frameworks/ability_lite:abilitykit_config` | [foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn) | 166 |
| production | `ndk_lib` | `//foundation/ability/ability_lite/frameworks/ability_lite:ability_notes` | [foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/frameworks/ability_lite/BUILD.gn) | 179 |
| production | `ohos_shared_library` | `//foundation/ability/ability_lite/interfaces/kits/js/napi:aafwk` | [foundation/ability/ability_lite/interfaces/kits/js/napi/BUILD.gn](../../../../../../foundation/ability/ability_lite/interfaces/kits/js/napi/BUILD.gn) | 16 |
| production | `js_declaration` | `//foundation/ability/ability_lite/interfaces/kits/js/declaration:aafwk` | [foundation/ability/ability_lite/interfaces/kits/js/declaration/BUILD.gn](../../../../../../foundation/ability/ability_lite/interfaces/kits/js/declaration/BUILD.gn) | 17 |
| aggregate-codegen | `ohos_copy` | `//foundation/ability/ability_lite/interfaces/kits/js/declaration:aafwk_declaration` | [foundation/ability/ability_lite/interfaces/kits/js/declaration/BUILD.gn](../../../../../../foundation/ability/ability_lite/interfaces/kits/js/declaration/BUILD.gn) | 22 |
| production | `lite_library` | `//foundation/ability/ability_lite/services/abilitymgr_lite:abilityms` | [foundation/ability/ability_lite/services/abilitymgr_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/services/abilitymgr_lite/BUILD.gn) | 19 |
| aggregate-codegen | `generate_notice_file` | `//foundation/ability/ability_lite/services/abilitymgr_lite:abilityms_notice_file` | [foundation/ability/ability_lite/services/abilitymgr_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/services/abilitymgr_lite/BUILD.gn) | 201 |
| production | `lite_component` | `//foundation/ability/ability_lite/services/abilitymgr_lite:aafwk_services_lite` | [foundation/ability/ability_lite/services/abilitymgr_lite/BUILD.gn](../../../../../../foundation/ability/ability_lite/services/abilitymgr_lite/BUILD.gn) | 209 |
| test | `group` | `//foundation/ability/ability_lite/services/abilitymgr_lite/unittest:ability_test` | [foundation/ability/ability_lite/services/abilitymgr_lite/unittest/BUILD.gn](../../../../../../foundation/ability/ability_lite/services/abilitymgr_lite/unittest/BUILD.gn) | 17 |
| test | `unittest` | `//foundation/ability/ability_lite/services/abilitymgr_lite/unittest/test_lv0/page_ability_test:ability_test_pageAbilityTest_lv0` | [foundation/ability/ability_lite/services/abilitymgr_lite/unittest/test_lv0/page_ability_test/BUILD.gn](../../../../../../foundation/ability/ability_lite/services/abilitymgr_lite/unittest/test_lv0/page_ability_test/BUILD.gn) | 18 |
| test | `group` | `//foundation/ability/ability_lite/services/abilitymgr_lite/unittest/test_lv0/page_ability_test:ability_test_pageAbilityTest_group_lv0` | [foundation/ability/ability_lite/services/abilitymgr_lite/unittest/test_lv0/page_ability_test/BUILD.gn](../../../../../../foundation/ability/ability_lite/services/abilitymgr_lite/unittest/test_lv0/page_ability_test/BUILD.gn) | 59 |
| production | `lite_component` | `//foundation/ability/ability_lite/services/abilitymgr_lite/tools:tools_lite` | [foundation/ability/ability_lite/services/abilitymgr_lite/tools/BUILD.gn](../../../../../../foundation/ability/ability_lite/services/abilitymgr_lite/tools/BUILD.gn) | 17 |
| aggregate-codegen | `generate_notice_file` | `//foundation/ability/ability_lite/services/abilitymgr_lite/tools:tools_lite_notice_file` | [foundation/ability/ability_lite/services/abilitymgr_lite/tools/BUILD.gn](../../../../../../foundation/ability/ability_lite/services/abilitymgr_lite/tools/BUILD.gn) | 21 |
| production | `executable` | `//foundation/ability/ability_lite/services/abilitymgr_lite/tools:aa` | [foundation/ability/ability_lite/services/abilitymgr_lite/tools/BUILD.gn](../../../../../../foundation/ability/ability_lite/services/abilitymgr_lite/tools/BUILD.gn) | 29 |

## 查询命令

```bash
awk -F '\t' '$1 == "ability" && $2 == "ability_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
