# hilog 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。

[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `hiviewdfx` |
| component | `hilog` |
| repository | `base/hiviewdfx/hilog` |
| bundle | [base/hiviewdfx/hilog/bundle.json](../../../../../../base/hiviewdfx/hilog/bundle.json) |
| rk3568 | 已选入 |

## 声明构建和测试入口

- 生产入口：`//base/hiviewdfx/hilog/services/hilogtool:hilog`、`//base/hiviewdfx/hilog/services/hilogd:hilogd`、`//base/hiviewdfx/hilog/interfaces/js:hilog_napi`、`//base/hiviewdfx/hilog/interfaces/cj:cj_hilog_ffi`、`//base/hiviewdfx/hilog/frameworks/hilog_ndk:hilog_ndk`、`//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_base`、`//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_snapshot`、`//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog`、`//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_host`、`//base/hiviewdfx/hilog/interfaces/rust:hilog_rust`、`//base/hiviewdfx/hilog/interfaces/ets/ani:ani_hilog_package`、`//base/hiviewdfx/hilog/interfaces/sandbox_log:libsandboxlog`
- 测试入口：`//base/hiviewdfx/hilog/test:hilog_unittest`、`//base/hiviewdfx/hilog/test:hilog_moduletest`、`//base/hiviewdfx/hilog/test:fuzztest`

## 目标分类统计

| 分类 | 数量 |
| --- | ---: |
| production | 17 |
| test | 13 |
| build-support | 17 |
| aggregate-codegen | 6 |
| total | 53 |

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |
| production | `ohos_shared_library` | `//base/hiviewdfx/hilog/frameworks/hilog_ndk:hilog_ndk` | [base/hiviewdfx/hilog/frameworks/hilog_ndk/BUILD.gn](../../../../../../base/hiviewdfx/hilog/frameworks/hilog_ndk/BUILD.gn) | 16 |
| build-support | `config` | `//base/hiviewdfx/hilog/frameworks/libhilog:libhilog_config` | [base/hiviewdfx/hilog/frameworks/libhilog/BUILD.gn](../../../../../../base/hiviewdfx/hilog/frameworks/libhilog/BUILD.gn) | 25 |
| build-support | `template` | `//base/hiviewdfx/hilog/frameworks/libhilog:libhilog_source` | [base/hiviewdfx/hilog/frameworks/libhilog/BUILD.gn](../../../../../../base/hiviewdfx/hilog/frameworks/libhilog/BUILD.gn) | 41 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hilog/interfaces/cj:cj_hilog_ffi` | [base/hiviewdfx/hilog/interfaces/cj/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/cj/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hilog/interfaces/ets/ani:ani_hilog_package` | [base/hiviewdfx/hilog/interfaces/ets/ani/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/ets/ani/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hilog/interfaces/ets/ani/hilog:hilog_ani` | [base/hiviewdfx/hilog/interfaces/ets/ani/hilog/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/ets/ani/hilog/BUILD.gn) | 18 |
| aggregate-codegen | `generate_static_abc` | `//base/hiviewdfx/hilog/interfaces/ets/ani/hilog:hilog` | [base/hiviewdfx/hilog/interfaces/ets/ani/hilog/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/ets/ani/hilog/BUILD.gn) | 65 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hilog/interfaces/ets/ani/hilog:hilog_etc` | [base/hiviewdfx/hilog/interfaces/ets/ani/hilog/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/ets/ani/hilog/BUILD.gn) | 72 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hilog/interfaces/js:hilog_napi` | [base/hiviewdfx/hilog/interfaces/js/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/js/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hilog/interfaces/js/kits/napi:libhilognapi_src` | [base/hiviewdfx/hilog/interfaces/js/kits/napi/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/js/kits/napi/BUILD.gn) | 17 |
| build-support | `config` | `//base/hiviewdfx/hilog/interfaces/js/kits/napi:libhilog_js_cfg` | [base/hiviewdfx/hilog/interfaces/js/kits/napi/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/js/kits/napi/BUILD.gn) | 70 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hilog/interfaces/js/kits/napi:libhilognapi` | [base/hiviewdfx/hilog/interfaces/js/kits/napi/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/js/kits/napi/BUILD.gn) | 75 |
| build-support | `config` | `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_pub_config` | [base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn) | 23 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_host` | [base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn) | 28 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog` | [base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn) | 33 |
| build-support | `template` | `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog` | [base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn) | 71 |
| build-support | `config` | `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_base_pub_cfg` | [base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn) | 125 |
| build-support | `config` | `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_base_config` | [base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn) | 134 |
| production | `ohos_static_library` | `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_base_for_musl` | [base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn) | 158 |
| production | `ohos_static_library` | `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_base` | [base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn) | 169 |
| build-support | `config` | `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_snapshot_cfg` | [base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn) | 198 |
| production | `ohos_static_library` | `//base/hiviewdfx/hilog/interfaces/native/innerkits:libhilog_snapshot` | [base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/native/innerkits/BUILD.gn) | 206 |
| production | `ohos_rust_shared_library` | `//base/hiviewdfx/hilog/interfaces/rust:hilog_rust` | [base/hiviewdfx/hilog/interfaces/rust/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/rust/BUILD.gn) | 16 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hilog/interfaces/rust:rust_hilog_component` | [base/hiviewdfx/hilog/interfaces/rust/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/rust/BUILD.gn) | 29 |
| build-support | `config` | `//base/hiviewdfx/hilog/interfaces/sandbox_log:libsandboxlog_pub_config` | [base/hiviewdfx/hilog/interfaces/sandbox_log/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/sandbox_log/BUILD.gn) | 19 |
| build-support | `config` | `//base/hiviewdfx/hilog/interfaces/sandbox_log:libsandboxlog_config` | [base/hiviewdfx/hilog/interfaces/sandbox_log/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/sandbox_log/BUILD.gn) | 24 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hilog/interfaces/sandbox_log:libsandboxlog` | [base/hiviewdfx/hilog/interfaces/sandbox_log/BUILD.gn](../../../../../../base/hiviewdfx/hilog/interfaces/sandbox_log/BUILD.gn) | 32 |
| build-support | `template` | `//base/hiviewdfx/hilog/platform:libhilog_platform_source` | [base/hiviewdfx/hilog/platform/BUILD.gn](../../../../../../base/hiviewdfx/hilog/platform/BUILD.gn) | 18 |
| build-support | `config` | `//base/hiviewdfx/hilog/services/hilogd:hilogd_config` | [base/hiviewdfx/hilog/services/hilogd/BUILD.gn](../../../../../../base/hiviewdfx/hilog/services/hilogd/BUILD.gn) | 16 |
| production | `ohos_executable` | `//base/hiviewdfx/hilog/services/hilogd:hilogd` | [base/hiviewdfx/hilog/services/hilogd/BUILD.gn](../../../../../../base/hiviewdfx/hilog/services/hilogd/BUILD.gn) | 22 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hilog/services/hilogd/etc:hilogd_etc` | [base/hiviewdfx/hilog/services/hilogd/etc/BUILD.gn](../../../../../../base/hiviewdfx/hilog/services/hilogd/etc/BUILD.gn) | 16 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hilog/services/hilogd/etc:hilogd.cfg` | [base/hiviewdfx/hilog/services/hilogd/etc/BUILD.gn](../../../../../../base/hiviewdfx/hilog/services/hilogd/etc/BUILD.gn) | 24 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hilog/services/hilogd/etc:hilog.para` | [base/hiviewdfx/hilog/services/hilogd/etc/BUILD.gn](../../../../../../base/hiviewdfx/hilog/services/hilogd/etc/BUILD.gn) | 35 |
| production | `ohos_prebuilt_etc` | `//base/hiviewdfx/hilog/services/hilogd/etc:hilog.para.dac` | [base/hiviewdfx/hilog/services/hilogd/etc/BUILD.gn](../../../../../../base/hiviewdfx/hilog/services/hilogd/etc/BUILD.gn) | 46 |
| build-support | `config` | `//base/hiviewdfx/hilog/services/hilogtool:hilog_config` | [base/hiviewdfx/hilog/services/hilogtool/BUILD.gn](../../../../../../base/hiviewdfx/hilog/services/hilogtool/BUILD.gn) | 17 |
| production | `ohos_executable` | `//base/hiviewdfx/hilog/services/hilogtool:hilog` | [base/hiviewdfx/hilog/services/hilogtool/BUILD.gn](../../../../../../base/hiviewdfx/hilog/services/hilogtool/BUILD.gn) | 23 |
| build-support | `config` | `//base/hiviewdfx/hilog/test:module_private_config` | [base/hiviewdfx/hilog/test/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/BUILD.gn) | 18 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hilog/test:HiLogNDKTest` | [base/hiviewdfx/hilog/test/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/BUILD.gn) | 22 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hilog/test:HiLogNDKZTest` | [base/hiviewdfx/hilog/test/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/BUILD.gn) | 48 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hilog/test:HiLogAdapterTest` | [base/hiviewdfx/hilog/test/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/BUILD.gn) | 66 |
| test | `group` | `//base/hiviewdfx/hilog/test:hilog_moduletest` | [base/hiviewdfx/hilog/test/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/BUILD.gn) | 85 |
| test | `group` | `//base/hiviewdfx/hilog/test:hilog_unittest` | [base/hiviewdfx/hilog/test/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/BUILD.gn) | 95 |
| test | `group` | `//base/hiviewdfx/hilog/test:fuzztest` | [base/hiviewdfx/hilog/test/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/BUILD.gn) | 104 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hilog/test/fuzztest/hilogclient_fuzzer:HiLogClientFuzzTest` | [base/hiviewdfx/hilog/test/fuzztest/hilogclient_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/fuzztest/hilogclient_fuzzer/BUILD.gn) | 18 |
| test | `ohos_fuzztest` | `//base/hiviewdfx/hilog/test/fuzztest/hilogserver_fuzzer:HiLogServerFuzzTest` | [base/hiviewdfx/hilog/test/fuzztest/hilogserver_fuzzer/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/fuzztest/hilogserver_fuzzer/BUILD.gn) | 18 |
| build-support | `config` | `//base/hiviewdfx/hilog/test/moduletest:module_private_config` | [base/hiviewdfx/hilog/test/moduletest/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/moduletest/BUILD.gn) | 18 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hilog/test/moduletest:HilogCommandTest` | [base/hiviewdfx/hilog/test/moduletest/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/moduletest/BUILD.gn) | 22 |
| build-support | `config` | `//base/hiviewdfx/hilog/test/unittest/common:module_private_config` | [base/hiviewdfx/hilog/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/unittest/common/BUILD.gn) | 18 |
| test | `ohos_unittest` | `//base/hiviewdfx/hilog/test/unittest/common:HilogToolTest` | [base/hiviewdfx/hilog/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/unittest/common/BUILD.gn) | 22 |
| test | `ohos_unittest` | `//base/hiviewdfx/hilog/test/unittest/common:HilogUtilsTest` | [base/hiviewdfx/hilog/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/unittest/common/BUILD.gn) | 38 |
| test | `ohos_unittest` | `//base/hiviewdfx/hilog/test/unittest/common:HilogPrintTest` | [base/hiviewdfx/hilog/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/unittest/common/BUILD.gn) | 54 |
| build-support | `config` | `//base/hiviewdfx/hilog/test/utils:test_utils_config` | [base/hiviewdfx/hilog/test/utils/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/utils/BUILD.gn) | 16 |
| test | `ohos_source_set` | `//base/hiviewdfx/hilog/test/utils:test_utils` | [base/hiviewdfx/hilog/test/utils/BUILD.gn](../../../../../../base/hiviewdfx/hilog/test/utils/BUILD.gn) | 21 |

## 扫描限制

- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。
- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。
- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。
