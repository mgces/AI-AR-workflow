# ffrt：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `resourceschedule` |
| component | `ffrt` |
| Git 子仓 | `foundation/resourceschedule/ffrt` |
| bundle | [foundation/resourceschedule/ffrt/bundle.json](../../../../../../foundation/resourceschedule/ffrt/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 6 |
| third-party dependencies | 0 |
| declared sub_component | 2 |
| inner kits | 1 |
| declared test entries | 1 |

## 依赖

组件依赖：`bounds_checking_function`, `c_utils`, `hilog`, `hisysevent`, `faultloggerd`, `napi`

三方依赖：无声明

## 声明构建入口

- `//foundation/resourceschedule/ffrt:libffrt`
- `//foundation/resourceschedule/ffrt:ffrt_ndk`

## 声明测试入口

- `//foundation/resourceschedule/ffrt/test/ut:ffrt_unittest_ffrt`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 3 |
| test | 31 |
| build-support | 3 |
| aggregate-codegen | 1 |
| total | 38 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| build-support | `config` | `//foundation/resourceschedule/ffrt:ffrt_config` | [foundation/resourceschedule/ffrt/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/BUILD.gn) | 18 |
| build-support | `config` | `//foundation/resourceschedule/ffrt:ffrt_inner_config` | [foundation/resourceschedule/ffrt/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/BUILD.gn) | 58 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/ffrt:libffrt` | [foundation/resourceschedule/ffrt/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/BUILD.gn) | 124 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/ffrt:whitelist_cfg` | [foundation/resourceschedule/ffrt/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/BUILD.gn) | 257 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/ffrt:ffrt_ndk` | [foundation/resourceschedule/ffrt/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/BUILD.gn) | 269 |
| production | `ohos_executable` | `//foundation/resourceschedule/ffrt/examples:ffrt_submit` | [foundation/resourceschedule/ffrt/examples/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/examples/BUILD.gn) | 16 |
| build-support | `config` | `//foundation/resourceschedule/ffrt/test/ut:ffrt_test_config` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 134 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:frame_interval_test` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 221 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:deadline_test` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 246 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:task_ctx_test` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 271 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_coroutine` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 296 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_cpu_worker` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 321 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:inherit_test` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 347 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:multi_workgroup_test` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 372 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:qos_convert_test` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 394 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:qos_interface_test` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 418 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_cgroup_qos` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 443 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_condition` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 469 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_core` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 491 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_csync` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 516 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_deadline` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 541 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_dependency` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 566 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_execute_unit` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 591 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_ffrt_io` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 616 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_graphCheck` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 644 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_interval` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 666 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_whitelist` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 691 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_loop` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 715 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_queue` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 740 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_rtg` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 765 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_scheduler` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 787 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_thread` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 812 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_mem` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 834 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_queue_dump` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 861 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_dump` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 883 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_qos_convert` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 905 |
| test | `ohos_unittest` | `//foundation/resourceschedule/ffrt/test/ut:ut_cpu_boost` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 930 |
| test | `group` | `//foundation/resourceschedule/ffrt/test/ut:ffrt_unittest_ffrt` | [foundation/resourceschedule/ffrt/test/ut/BUILD.gn](../../../../../../foundation/resourceschedule/ffrt/test/ut/BUILD.gn) | 957 |

## 查询命令

```bash
awk -F '\t' '$1 == "resourceschedule" && $2 == "ffrt"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
