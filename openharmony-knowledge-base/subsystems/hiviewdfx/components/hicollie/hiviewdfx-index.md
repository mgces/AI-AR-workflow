# hicollie 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，不承担功能解释。

[返回部件](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `hiviewdfx` |
| component | `hicollie` |
| repository | `base/hiviewdfx/hicollie` |
| bundle | [base/hiviewdfx/hicollie/bundle.json](../../../../../../base/hiviewdfx/hicollie/bundle.json) |
| rk3568 | 已选入 |

## 声明构建和测试入口

- 生产入口：`//base/hiviewdfx/hicollie/interfaces/app:libapp_hicollie`、`//base/hiviewdfx/hicollie/interfaces/native/innerkits:libhicollie`、`//base/hiviewdfx/hicollie/frameworks/native/thread_sampler:libthread_sampler`、`//base/hiviewdfx/hicollie/interfaces/rust:hicollie_rust`、`//base/hiviewdfx/hicollie/interfaces/ndk:ohhicollie`
- 测试入口：`//base/hiviewdfx/hicollie/frameworks/app/test/unittest:unittest`、`//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:unittest`、`//base/hiviewdfx/hicollie/interfaces/ndk/test/unittest:unittest`

## 目标分类统计

| 分类 | 数量 |
| --- | ---: |
| production | 8 |
| test | 20 |
| build-support | 8 |
| aggregate-codegen | 1 |
| total | 37 |

## 全部静态目标

| 分类 | 类型 | Label | 构建文件 | 行号 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//base/hiviewdfx/hicollie/frameworks/app:app_hicollie_include` | [base/hiviewdfx/hicollie/frameworks/app/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/app/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hicollie/frameworks/app:libapp_hicollie_source` | [base/hiviewdfx/hicollie/frameworks/app/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/app/BUILD.gn) | 27 |
| build-support | `config` | `//base/hiviewdfx/hicollie/frameworks/app/test/unittest:module_private_config` | [base/hiviewdfx/hicollie/frameworks/app/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/app/test/unittest/BUILD.gn) | 21 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/app/test/unittest:AppWatchdogInnerTest` | [base/hiviewdfx/hicollie/frameworks/app/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/app/test/unittest/BUILD.gn) | 31 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/app/test/unittest:AppWatchdogTest` | [base/hiviewdfx/hicollie/frameworks/app/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/app/test/unittest/BUILD.gn) | 50 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/app/test/unittest:AppWatchdogUtilsTest` | [base/hiviewdfx/hicollie/frameworks/app/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/app/test/unittest/BUILD.gn) | 68 |
| test | `group` | `//base/hiviewdfx/hicollie/frameworks/app/test/unittest:unittest` | [base/hiviewdfx/hicollie/frameworks/app/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/app/test/unittest/BUILD.gn) | 88 |
| build-support | `config` | `//base/hiviewdfx/hicollie/frameworks/native:hicollie_include` | [base/hiviewdfx/hicollie/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/BUILD.gn) | 16 |
| production | `ohos_source_set` | `//base/hiviewdfx/hicollie/frameworks/native:libhicollie_source` | [base/hiviewdfx/hicollie/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/BUILD.gn) | 27 |
| aggregate-codegen | `group` | `//base/hiviewdfx/hicollie/frameworks/native:libhicollie` | [base/hiviewdfx/hicollie/frameworks/native/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/BUILD.gn) | 106 |
| test | `group` | `//base/hiviewdfx/hicollie/frameworks/native/test:moduletest` | [base/hiviewdfx/hicollie/frameworks/native/test/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/BUILD.gn) | 19 |
| build-support | `config` | `//base/hiviewdfx/hicollie/frameworks/native/test/moduletest/common:module_private_config` | [base/hiviewdfx/hicollie/frameworks/native/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/moduletest/common/BUILD.gn) | 20 |
| test | `ohos_moduletest` | `//base/hiviewdfx/hicollie/frameworks/native/test/moduletest/common:XCollieTimeoutModuleTest` | [base/hiviewdfx/hicollie/frameworks/native/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/moduletest/common/BUILD.gn) | 34 |
| test | `group` | `//base/hiviewdfx/hicollie/frameworks/native/test/moduletest/common:moduletest` | [base/hiviewdfx/hicollie/frameworks/native/test/moduletest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/moduletest/common/BUILD.gn) | 60 |
| build-support | `config` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:module_private_config` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 21 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:XCollieUnitTest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 33 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:IpcFullUnitTest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 54 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:WatchdogUnitTest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 77 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:WatchdogInnerUnitTest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 104 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:WatchdogInnerTaskTest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 139 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:HandlerCheckerTest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 174 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:WatchdogTaskTest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 200 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:ThreadSamplerTest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 232 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:XCollieFfrtTaskTest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 258 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:XcollieMgrTest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 283 |
| test | `group` | `//base/hiviewdfx/hicollie/frameworks/native/test/unittest/common:unittest` | [base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/test/unittest/common/BUILD.gn) | 300 |
| build-support | `config` | `//base/hiviewdfx/hicollie/frameworks/native/thread_sampler:thread_sampler_config` | [base/hiviewdfx/hicollie/frameworks/native/thread_sampler/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/thread_sampler/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hicollie/frameworks/native/thread_sampler:libthread_sampler` | [base/hiviewdfx/hicollie/frameworks/native/thread_sampler/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/thread_sampler/BUILD.gn) | 23 |
| production | `ohos_static_library` | `//base/hiviewdfx/hicollie/frameworks/native/thread_sampler:libthread_sampler_static` | [base/hiviewdfx/hicollie/frameworks/native/thread_sampler/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/frameworks/native/thread_sampler/BUILD.gn) | 64 |
| build-support | `config` | `//base/hiviewdfx/hicollie/interfaces/app:libapp_hicollie_pub_config` | [base/hiviewdfx/hicollie/interfaces/app/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/interfaces/app/BUILD.gn) | 16 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hicollie/interfaces/app:libapp_hicollie` | [base/hiviewdfx/hicollie/interfaces/app/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/interfaces/app/BUILD.gn) | 21 |
| build-support | `config` | `//base/hiviewdfx/hicollie/interfaces/native/innerkits:libhicollie_pub_config` | [base/hiviewdfx/hicollie/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/interfaces/native/innerkits/BUILD.gn) | 17 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hicollie/interfaces/native/innerkits:libhicollie` | [base/hiviewdfx/hicollie/interfaces/native/innerkits/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/interfaces/native/innerkits/BUILD.gn) | 29 |
| production | `ohos_shared_library` | `//base/hiviewdfx/hicollie/interfaces/ndk:ohhicollie` | [base/hiviewdfx/hicollie/interfaces/ndk/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/interfaces/ndk/BUILD.gn) | 17 |
| test | `ohos_unittest` | `//base/hiviewdfx/hicollie/interfaces/ndk/test/unittest:hicollie_test` | [base/hiviewdfx/hicollie/interfaces/ndk/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/interfaces/ndk/test/unittest/BUILD.gn) | 17 |
| test | `group` | `//base/hiviewdfx/hicollie/interfaces/ndk/test/unittest:unittest` | [base/hiviewdfx/hicollie/interfaces/ndk/test/unittest/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/interfaces/ndk/test/unittest/BUILD.gn) | 36 |
| production | `ohos_rust_shared_library` | `//base/hiviewdfx/hicollie/interfaces/rust:hicollie_rust` | [base/hiviewdfx/hicollie/interfaces/rust/BUILD.gn](../../../../../../base/hiviewdfx/hicollie/interfaces/rust/BUILD.gn) | 16 |

## 扫描限制

- 仅统计名称为字符串字面量且声明首行可识别的 GN 目标。
- 变量、循环、模板内部展开和条件分支的实际产品选入状态仍需结合 GN args/out 目录。
- `example/`、`test/`、crasher 和 validator 目标按测试类归档，不视为生产运行实体。
