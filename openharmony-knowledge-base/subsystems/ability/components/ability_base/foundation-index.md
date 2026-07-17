# ability_base：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `ability` |
| component | `ability_base` |
| Git 子仓 | `foundation/ability/ability_base` |
| bundle | [foundation/ability/ability_base/bundle.json](../../../../../../foundation/ability/ability_base/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 12 |
| third-party dependencies | 0 |
| declared sub_component | 1 |
| inner kits | 10 |
| declared test entries | 2 |

## 依赖

组件依赖：`ability_runtime`, `bundle_framework`, `c_utils`, `hilog`, `hitrace`, `icu`, `ipc`, `resource_management`, `json`, `jsoncpp`, `zlib`, `window_manager`

三方依赖：无声明

## 声明构建入口

- `//foundation/ability/ability_base:base_innerkits_target`

## 声明测试入口

- `//foundation/ability/ability_base/test/unittest:unittest`
- `//foundation/ability/ability_base/test/fuzztest:fuzztest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 10 |
| test | 88 |
| build-support | 24 |
| aggregate-codegen | 1 |
| total | 123 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/ability/ability_base:base_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/ability/ability_base:base_public_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 22 |
| build-support | `config` | `//foundation/ability/ability_base:base_exceptions_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 30 |
| production | `ohos_shared_library` | `//foundation/ability/ability_base:base` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 34 |
| build-support | `config` | `//foundation/ability/ability_base:configuration_sdk_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 73 |
| build-support | `config` | `//foundation/ability/ability_base:configuration_exceptions_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 80 |
| production | `ohos_shared_library` | `//foundation/ability/ability_base:configuration` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 84 |
| build-support | `config` | `//foundation/ability/ability_base:zuri_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 115 |
| build-support | `config` | `//foundation/ability/ability_base:zuri_exceptions` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 124 |
| production | `ohos_shared_library` | `//foundation/ability/ability_base:zuri` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 128 |
| build-support | `config` | `//foundation/ability/ability_base:want_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 153 |
| build-support | `config` | `//foundation/ability/ability_base:want_exceptions_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 165 |
| build-support | `config` | `//foundation/ability/ability_base:want_public_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 169 |
| build-support | `config` | `//foundation/ability/ability_base:want_all_dependent_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 180 |
| production | `ohos_shared_library` | `//foundation/ability/ability_base:want` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 184 |
| build-support | `config` | `//foundation/ability/ability_base:view_data_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 238 |
| production | `ohos_shared_library` | `//foundation/ability/ability_base:view_data` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 245 |
| build-support | `config` | `//foundation/ability/ability_base:session_info_all_dependent_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 268 |
| production | `ohos_shared_library` | `//foundation/ability/ability_base:session_info` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 275 |
| build-support | `config` | `//foundation/ability/ability_base:string_utils_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 301 |
| production | `ohos_shared_library` | `//foundation/ability/ability_base:string_utils` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 305 |
| build-support | `config` | `//foundation/ability/ability_base:ability_extractor_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 332 |
| build-support | `config` | `//foundation/ability/ability_base:exceptions` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 339 |
| production | `ohos_shared_library` | `//foundation/ability/ability_base:extractortool` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 343 |
| build-support | `config` | `//foundation/ability/ability_base:ability_extract_resource_manager_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 386 |
| production | `ohos_shared_library` | `//foundation/ability/ability_base:extractresourcemanager` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 390 |
| build-support | `config` | `//foundation/ability/ability_base:ability_base_ndk_config` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 415 |
| production | `ohos_shared_library` | `//foundation/ability/ability_base:ability_base_want` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 428 |
| aggregate-codegen | `group` | `//foundation/ability/ability_base:base_innerkits_target` | [foundation/ability/ability_base/BUILD.gn](../../../../../../foundation/ability/ability_base/BUILD.gn) | 465 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantsixth_fuzzer:WantSixthFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantsixth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantsixth_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantsixth_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantsixth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantsixth_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/arraywrapperfifth_fuzzer:ArrayWrapperFifthFuzzTest` | [foundation/ability/ability_base/test/fuzztest/arraywrapperfifth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/arraywrapperfifth_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/arraywrapperfifth_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/arraywrapperfifth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/arraywrapperfifth_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/remoteobjectwrapper_fuzzer:RemoteObjectWrapperFuzzTest` | [foundation/ability/ability_base/test/fuzztest/remoteobjectwrapper_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/remoteobjectwrapper_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/remoteobjectwrapper_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/remoteobjectwrapper_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/remoteobjectwrapper_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantparamsfirst_fuzzer:WantParamsFirstFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantparamsfirst_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamsfirst_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantparamsfirst_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantparamsfirst_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamsfirst_fuzzer/BUILD.gn) | 48 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantparamswrapperjson_fuzzer:WantParamsWrapperJsonFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantparamswrapperjson_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamswrapperjson_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantparamswrapperjson_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantparamswrapperjson_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamswrapperjson_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantthird_fuzzer:WantThirdFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantthird_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantthird_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantthird_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantthird_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantthird_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/boolwrapper_fuzzer:BoolWrapperFuzzTest` | [foundation/ability/ability_base/test/fuzztest/boolwrapper_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/boolwrapper_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/boolwrapper_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/boolwrapper_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/boolwrapper_fuzzer/BUILD.gn) | 48 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantparamsfour_fuzzer:WantParamsFourFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantparamsfour_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamsfour_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantparamsfour_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantparamsfour_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamsfour_fuzzer/BUILD.gn) | 48 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/arraywrappersecond_fuzzer:ArrayWrapperSecondFuzzTest` | [foundation/ability/ability_base/test/fuzztest/arraywrappersecond_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/arraywrappersecond_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/arraywrappersecond_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/arraywrappersecond_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/arraywrappersecond_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantninth_fuzzer:WantNinthFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantninth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantninth_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantninth_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantninth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantninth_fuzzer/BUILD.gn) | 48 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest:fuzztest` | [foundation/ability/ability_base/test/fuzztest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/BUILD.gn) | 17 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantfourth_fuzzer:WantFourthFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantfourth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantfourth_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantfourth_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantfourth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantfourth_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantfirst_fuzzer:WantFirstFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantfirst_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantfirst_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantfirst_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantfirst_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantfirst_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/arraywrapperthird_fuzzer:ArrayWrapperThirdFuzzTest` | [foundation/ability/ability_base/test/fuzztest/arraywrapperthird_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/arraywrapperthird_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/arraywrapperthird_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/arraywrapperthird_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/arraywrapperthird_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/stringwrapper_fuzzer:StringWrapperFuzzTest` | [foundation/ability/ability_base/test/fuzztest/stringwrapper_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/stringwrapper_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/stringwrapper_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/stringwrapper_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/stringwrapper_fuzzer/BUILD.gn) | 48 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantseventh_fuzzer:WantSeventhFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantseventh_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantseventh_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantseventh_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantseventh_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantseventh_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/longwrapper_fuzzer:LongWrapperFuzzTest` | [foundation/ability/ability_base/test/fuzztest/longwrapper_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/longwrapper_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/longwrapper_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/longwrapper_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/longwrapper_fuzzer/BUILD.gn) | 48 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantsecond_fuzzer:WantSecondFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantsecond_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantsecond_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantsecond_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantsecond_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantsecond_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/intwrapper_fuzzer:IntWrapperFuzzTest` | [foundation/ability/ability_base/test/fuzztest/intwrapper_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/intwrapper_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/intwrapper_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/intwrapper_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/intwrapper_fuzzer/BUILD.gn) | 48 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantfifth_fuzzer:WantFifthFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantfifth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantfifth_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantfifth_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantfifth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantfifth_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantparamsfifth_fuzzer:WantParamsFifthFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantparamsfifth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamsfifth_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantparamsfifth_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantparamsfifth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamsfifth_fuzzer/BUILD.gn) | 48 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/operationsecond_fuzzer:OperationSecondFuzzTest` | [foundation/ability/ability_base/test/fuzztest/operationsecond_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/operationsecond_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/operationsecond_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/operationsecond_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/operationsecond_fuzzer/BUILD.gn) | 48 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/arraywrapperfirst_fuzzer:ArrayWrapperFirstFuzzTest` | [foundation/ability/ability_base/test/fuzztest/arraywrapperfirst_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/arraywrapperfirst_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/arraywrapperfirst_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/arraywrapperfirst_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/arraywrapperfirst_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/arraywrapperfouth_fuzzer:ArrayWrapperFouthFuzzTest` | [foundation/ability/ability_base/test/fuzztest/arraywrapperfouth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/arraywrapperfouth_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/arraywrapperfouth_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/arraywrapperfouth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/arraywrapperfouth_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantparamssecond_fuzzer:WantParamsSecondFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantparamssecond_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamssecond_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantparamssecond_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantparamssecond_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamssecond_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wantparamsthird_fuzzer:WantParamsThirdFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wantparamsthird_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamsthird_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wantparamsthird_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wantparamsthird_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wantparamsthird_fuzzer/BUILD.gn) | 48 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/wanteighth_fuzzer:WantEighthFuzzTest` | [foundation/ability/ability_base/test/fuzztest/wanteighth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wanteighth_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/wanteighth_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/wanteighth_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/wanteighth_fuzzer/BUILD.gn) | 49 |
| test | `ohos_fuzztest` | `//foundation/ability/ability_base/test/fuzztest/operationfirst_fuzzer:OperationFirstFuzzTest` | [foundation/ability/ability_base/test/fuzztest/operationfirst_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/operationfirst_fuzzer/BUILD.gn) | 19 |
| test | `group` | `//foundation/ability/ability_base/test/fuzztest/operationfirst_fuzzer:fuzztest` | [foundation/ability/ability_base/test/fuzztest/operationfirst_fuzzer/BUILD.gn](../../../../../../foundation/ability/ability_base/test/fuzztest/operationfirst_fuzzer/BUILD.gn) | 48 |
| build-support | `config` | `//foundation/ability/ability_base/test/unittest:base_private_config` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 21 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:base_object_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 25 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:base_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 40 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:bool_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 54 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:byte_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 69 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:double_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 84 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:float_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 99 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:int_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 114 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:long_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 129 |
| build-support | `config` | `//foundation/ability/ability_base/test/unittest:want_private_config` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 148 |
| build-support | `config` | `//foundation/ability/ability_base/test/unittest:module_private_want_param_wrapper_config` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 152 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:operation_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 156 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:patterns_matcher_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 178 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:skills_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 200 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:want_params_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 224 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:want_params_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 247 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:want_params_wrapper_json_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 268 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:want_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 289 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:pac_map_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 313 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:pac_map_second_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 344 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:uri_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 375 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:extra_params_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 398 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:array_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 420 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:zchar_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 443 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:short_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 466 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:string_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 489 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:user_object_wrapper_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 512 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:cwant_manager_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 535 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:cwant_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 562 |
| build-support | `config` | `//foundation/ability/ability_base/test/unittest:extractor_private_config` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 592 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:extractor_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 600 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:session_info_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 623 |
| build-support | `config` | `//foundation/ability/ability_base/test/unittest:viewdata_private_config` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 649 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:view_data_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 657 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:rect_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 684 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:page_node_info_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 711 |
| build-support | `config` | `//foundation/ability/ability_base/test/unittest:configuration_private_config` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 743 |
| test | `ohos_unittest` | `//foundation/ability/ability_base/test/unittest:base_configuration_test` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 751 |
| test | `group` | `//foundation/ability/ability_base/test/unittest:unittest` | [foundation/ability/ability_base/test/unittest/BUILD.gn](../../../../../../foundation/ability/ability_base/test/unittest/BUILD.gn) | 781 |

## 查询命令

```bash
awk -F '\t' '$1 == "ability" && $2 == "ability_base"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
