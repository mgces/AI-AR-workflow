# bundle_tool：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `bundlemanager` |
| component | `bundle_tool` |
| Git 子仓 | `foundation/bundlemanager/bundle_tool` |
| bundle | [foundation/bundlemanager/bundle_tool/bundle.json](../../../../../../foundation/bundlemanager/bundle_tool/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 21 |
| third-party dependencies | 0 |
| declared sub_component | 2 |
| inner kits | 0 |
| declared test entries | 3 |

## 依赖

组件依赖：`ability_base`, `access_token`, `ability_runtime`, `bundle_framework`, `common_event_service`, `c_utils`, `cJSON`, `device_manager`, `distributed_bundle_framework`, `hilog`, `init`, `ipc`, `os_account`, `samgr`, `selinux_adapter`, `json`, `jsoncpp`, `access_token`, `appverify`, `ffrt`, `kv_store`

三方依赖：无声明

## 声明构建入口

- `//foundation/bundlemanager/bundle_tool:bm`
- `//foundation/bundlemanager/bundle_tool/ohos_bm:cli_tools_bm`

## 声明测试入口

- `//foundation/bundlemanager/bundle_tool/test:moduletest`
- `//foundation/bundlemanager/bundle_tool/test:systemtest`
- `//foundation/bundlemanager/bundle_tool/test:unittest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 4 |
| test | 31 |
| build-support | 5 |
| aggregate-codegen | 3 |
| total | 43 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/bundlemanager/bundle_tool:bm` | [foundation/bundlemanager/bundle_tool/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/bundlemanager/bundle_tool/frameworks:tools_bm_config` | [foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn) | 17 |
| production | `ohos_source_set` | `//foundation/bundlemanager/bundle_tool/frameworks:tools_bm_source_set` | [foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn) | 29 |
| production | `ohos_executable` | `//foundation/bundlemanager/bundle_tool/frameworks:bm` | [foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn) | 102 |
| test | `ohos_source_set` | `//foundation/bundlemanager/bundle_tool/frameworks:tools_test_bm_source_set` | [foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn) | 118 |
| test | `ohos_executable` | `//foundation/bundlemanager/bundle_tool/frameworks:bundle_test_tool` | [foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn) | 203 |
| aggregate-codegen | `group` | `//foundation/bundlemanager/bundle_tool/frameworks:tools_bm` | [foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/frameworks/BUILD.gn) | 214 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/test:systemtest` | [foundation/bundlemanager/bundle_tool/test/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/BUILD.gn) | 14 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/test:moduletest` | [foundation/bundlemanager/bundle_tool/test/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/BUILD.gn) | 24 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/test:unittest` | [foundation/bundlemanager/bundle_tool/test/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/BUILD.gn) | 30 |
| build-support | `config` | `//foundation/bundlemanager/bundle_tool/test/systemtest/bm:tools_bm_config_systemtest` | [foundation/bundlemanager/bundle_tool/test/systemtest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/systemtest/bm/BUILD.gn) | 19 |
| test | `ohos_systemtest` | `//foundation/bundlemanager/bundle_tool/test/systemtest/bm:bm_command_install_system_test` | [foundation/bundlemanager/bundle_tool/test/systemtest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/systemtest/bm/BUILD.gn) | 23 |
| test | `ohos_systemtest` | `//foundation/bundlemanager/bundle_tool/test/systemtest/bm:bm_command_uninstall_system_test` | [foundation/bundlemanager/bundle_tool/test/systemtest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/systemtest/bm/BUILD.gn) | 62 |
| test | `ohos_systemtest` | `//foundation/bundlemanager/bundle_tool/test/systemtest/bm:bm_command_dump_system_test` | [foundation/bundlemanager/bundle_tool/test/systemtest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/systemtest/bm/BUILD.gn) | 101 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/test/systemtest/bm:systemtest` | [foundation/bundlemanager/bundle_tool/test/systemtest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/systemtest/bm/BUILD.gn) | 140 |
| test | `ohos_copy` | `//foundation/bundlemanager/bundle_tool/test/systemtest/bm/ohos_test:copy_ohos_test` | [foundation/bundlemanager/bundle_tool/test/systemtest/bm/ohos_test/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/systemtest/bm/ohos_test/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/bundlemanager/bundle_tool/test/unittest/bm:tools_bm_config_unittest` | [foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn) | 19 |
| test | `ohos_unittest` | `//foundation/bundlemanager/bundle_tool/test/unittest/bm:bm_command_dump_test` | [foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn) | 28 |
| test | `ohos_unittest` | `//foundation/bundlemanager/bundle_tool/test/unittest/bm:bm_command_dump_dependencies_test` | [foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn) | 85 |
| test | `ohos_unittest` | `//foundation/bundlemanager/bundle_tool/test/unittest/bm:bm_command_install_test` | [foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn) | 137 |
| test | `ohos_unittest` | `//foundation/bundlemanager/bundle_tool/test/unittest/bm:bm_command_test` | [foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn) | 191 |
| test | `ohos_unittest` | `//foundation/bundlemanager/bundle_tool/test/unittest/bm:bm_command_uninstall_test` | [foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn) | 250 |
| test | `ohos_unittest` | `//foundation/bundlemanager/bundle_tool/test/unittest/bm:bm_command_quickfix_test` | [foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn) | 304 |
| test | `ohos_unittest` | `//foundation/bundlemanager/bundle_tool/test/unittest/bm:bm_command_overlay_test` | [foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn) | 356 |
| test | `ohos_unittest` | `//foundation/bundlemanager/bundle_tool/test/unittest/bm:bundle_test_tool_cache_stat_test` | [foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn) | 415 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/test/unittest/bm:unittest` | [foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/unittest/bm/BUILD.gn) | 467 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/test/sceneProject:test_hap` | [foundation/bundlemanager/bundle_tool/test/sceneProject/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/sceneProject/BUILD.gn) | 14 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/test/sceneProject/tools:tooltest_hap` | [foundation/bundlemanager/bundle_tool/test/sceneProject/tools/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/sceneProject/tools/BUILD.gn) | 14 |
| test | `ohos_copy` | `//foundation/bundlemanager/bundle_tool/test/sceneProject/tools/ohos_test:copy_ohos_test` | [foundation/bundlemanager/bundle_tool/test/sceneProject/tools/ohos_test/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/sceneProject/tools/ohos_test/BUILD.gn) | 17 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/test/sceneProject/tools/bm/test_app_one:test_app` | [foundation/bundlemanager/bundle_tool/test/sceneProject/tools/bm/test_app_one/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/sceneProject/tools/bm/test_app_one/BUILD.gn) | 16 |
| test | `ohos_app` | `//foundation/bundlemanager/bundle_tool/test/sceneProject/tools/bm/test_app_one:test_app_one` | [foundation/bundlemanager/bundle_tool/test/sceneProject/tools/bm/test_app_one/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/sceneProject/tools/bm/test_app_one/BUILD.gn) | 20 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/test/sceneProject/tools/bm:bm_tool` | [foundation/bundlemanager/bundle_tool/test/sceneProject/tools/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/sceneProject/tools/bm/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/bundlemanager/bundle_tool/test/moduletest/bm:tools_bm_config_moduletest` | [foundation/bundlemanager/bundle_tool/test/moduletest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/moduletest/bm/BUILD.gn) | 19 |
| test | `ohos_moduletest` | `//foundation/bundlemanager/bundle_tool/test/moduletest/bm:bm_command_dump_module_test` | [foundation/bundlemanager/bundle_tool/test/moduletest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/moduletest/bm/BUILD.gn) | 28 |
| test | `ohos_moduletest` | `//foundation/bundlemanager/bundle_tool/test/moduletest/bm:bm_command_install_module_test` | [foundation/bundlemanager/bundle_tool/test/moduletest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/moduletest/bm/BUILD.gn) | 79 |
| test | `ohos_moduletest` | `//foundation/bundlemanager/bundle_tool/test/moduletest/bm:bm_command_uninstall_module_test` | [foundation/bundlemanager/bundle_tool/test/moduletest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/moduletest/bm/BUILD.gn) | 130 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/test/moduletest/bm:moduletest` | [foundation/bundlemanager/bundle_tool/test/moduletest/bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/test/moduletest/bm/BUILD.gn) | 181 |
| build-support | `config` | `//foundation/bundlemanager/bundle_tool/ohos_bm:tools_ohos_bm_config` | [foundation/bundlemanager/bundle_tool/ohos_bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/ohos_bm/BUILD.gn) | 18 |
| production | `ohos_source_set` | `//foundation/bundlemanager/bundle_tool/ohos_bm:tools_ohos_bm_source_set` | [foundation/bundlemanager/bundle_tool/ohos_bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/ohos_bm/BUILD.gn) | 31 |
| production | `ohos_cli_executable` | `//foundation/bundlemanager/bundle_tool/ohos_bm:ohos-bm` | [foundation/bundlemanager/bundle_tool/ohos_bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/ohos_bm/BUILD.gn) | 95 |
| aggregate-codegen | `group` | `//foundation/bundlemanager/bundle_tool/ohos_bm:cli_tools_bm` | [foundation/bundlemanager/bundle_tool/ohos_bm/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/ohos_bm/BUILD.gn) | 110 |
| test | `ohos_unittest` | `//foundation/bundlemanager/bundle_tool/ohos_bm/test:ohos_bm_unittest` | [foundation/bundlemanager/bundle_tool/ohos_bm/test/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/ohos_bm/test/BUILD.gn) | 17 |
| test | `group` | `//foundation/bundlemanager/bundle_tool/ohos_bm/test:unittest` | [foundation/bundlemanager/bundle_tool/ohos_bm/test/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_tool/ohos_bm/test/BUILD.gn) | 73 |

## 查询命令

```bash
awk -F '\t' '$1 == "bundlemanager" && $2 == "bundle_tool"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
