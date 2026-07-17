# graphics_effect：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `graphic` |
| component | `graphics_effect` |
| Git 子仓 | `foundation/graphic/graphics_effect` |
| bundle | [foundation/graphic/graphics_effect/bundle.json](../../../../../../foundation/graphic/graphics_effect/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 9 |
| third-party dependencies | 0 |
| declared sub_component | 1 |
| inner kits | 1 |
| declared test entries | 1 |

## 依赖

组件依赖：`bounds_checking_function`, `c_utils`, `graphic_2d`, `hitrace`, `hilog`, `init`, `openssl`, `skia`, `libxml2`

三方依赖：无声明

## 声明构建入口

- `//foundation/graphic/graphics_effect:graphics_effect_core`

## 声明测试入口

- `//foundation/graphic/graphics_effect/test:test`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 4 |
| test | 16 |
| build-support | 2 |
| aggregate-codegen | 1 |
| total | 23 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/graphic/graphics_effect:export_config` | [foundation/graphic/graphics_effect/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/BUILD.gn) | 17 |
| production | `ohos_source_set` | `//foundation/graphic/graphics_effect:graphics_effect_src` | [foundation/graphic/graphics_effect/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/BUILD.gn) | 35 |
| production | `ohos_source_set` | `//foundation/graphic/graphics_effect:libgraphics_effect` | [foundation/graphic/graphics_effect/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/BUILD.gn) | 229 |
| production | `ohos_shared_library` | `//foundation/graphic/graphics_effect:graphics_effect_core` | [foundation/graphic/graphics_effect/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/BUILD.gn) | 247 |
| aggregate-codegen | `group` | `//foundation/graphic/graphics_effect:utils` | [foundation/graphic/graphics_effect/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/BUILD.gn) | 270 |
| build-support | `config` | `//foundation/graphic/graphics_effect:utils_config` | [foundation/graphic/graphics_effect/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/BUILD.gn) | 275 |
| production | `ohos_source_set` | `//foundation/graphic/graphics_effect:mock_utils` | [foundation/graphic/graphics_effect/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/BUILD.gn) | 279 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest1_fuzzer:GEVisualEffectTest1FuzzTest` | [foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest1_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest1_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest1_fuzzer:fuzztest` | [foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest1_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest1_fuzzer/BUILD.gn) | 57 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest2_fuzzer:GEVisualEffectTest2FuzzTest` | [foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest2_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest2_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest2_fuzzer:fuzztest` | [foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest2_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/gevisualeffecttest2_fuzzer/BUILD.gn) | 57 |
| test | `group` | `//foundation/graphic/graphics_effect/test/fuzztest:fuzztest` | [foundation/graphic/graphics_effect/test/fuzztest/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/BUILD.gn) | 15 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphics_effect/test/fuzztest/gevisualeffect_fuzzer:GEVisualEffectFuzzTest` | [foundation/graphic/graphics_effect/test/fuzztest/gevisualeffect_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/gevisualeffect_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphics_effect/test/fuzztest/gevisualeffect_fuzzer:fuzztest` | [foundation/graphic/graphics_effect/test/fuzztest/gevisualeffect_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/gevisualeffect_fuzzer/BUILD.gn) | 57 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphics_effect/test/fuzztest/gevisualeffectcontainer_fuzzer:GEVisualEffectContainerFuzzTest` | [foundation/graphic/graphics_effect/test/fuzztest/gevisualeffectcontainer_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/gevisualeffectcontainer_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphics_effect/test/fuzztest/gevisualeffectcontainer_fuzzer:fuzztest` | [foundation/graphic/graphics_effect/test/fuzztest/gevisualeffectcontainer_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/gevisualeffectcontainer_fuzzer/BUILD.gn) | 57 |
| test | `ohos_fuzztest` | `//foundation/graphic/graphics_effect/test/fuzztest/gerender_fuzzer:GERenderFuzzTest` | [foundation/graphic/graphics_effect/test/fuzztest/gerender_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/gerender_fuzzer/BUILD.gn) | 21 |
| test | `group` | `//foundation/graphic/graphics_effect/test/fuzztest/gerender_fuzzer:fuzztest` | [foundation/graphic/graphics_effect/test/fuzztest/gerender_fuzzer/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/fuzztest/gerender_fuzzer/BUILD.gn) | 56 |
| test | `group` | `//foundation/graphic/graphics_effect/test:test` | [foundation/graphic/graphics_effect/test/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/BUILD.gn) | 16 |
| test | `ohos_executable` | `//foundation/graphic/graphics_effect/test:graphics_effect_exe` | [foundation/graphic/graphics_effect/test/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/BUILD.gn) | 25 |
| test | `group` | `//foundation/graphic/graphics_effect/test/unittest:unittest` | [foundation/graphic/graphics_effect/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/unittest/BUILD.gn) | 19 |
| test | `ohos_source_set` | `//foundation/graphic/graphics_effect/test/unittest:graphics_effect_test_src` | [foundation/graphic/graphics_effect/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/unittest/BUILD.gn) | 24 |
| test | `ohos_unittest` | `//foundation/graphic/graphics_effect/test/unittest:GraphicsEffectTest` | [foundation/graphic/graphics_effect/test/unittest/BUILD.gn](../../../../../../foundation/graphic/graphics_effect/test/unittest/BUILD.gn) | 190 |

## 查询命令

```bash
awk -F '\t' '$1 == "graphic" && $2 == "graphics_effect"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
