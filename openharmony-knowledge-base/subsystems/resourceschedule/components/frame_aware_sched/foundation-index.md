# frame_aware_sched：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `resourceschedule` |
| component | `frame_aware_sched` |
| Git 子仓 | `foundation/resourceschedule/frame_aware_sched` |
| bundle | [foundation/resourceschedule/frame_aware_sched/bundle.json](../../../../../../foundation/resourceschedule/frame_aware_sched/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 9 |
| third-party dependencies | 0 |
| declared sub_component | 5 |
| inner kits | 4 |
| declared test entries | 1 |

## 依赖

组件依赖：`bounds_checking_function`, `c_utils`, `eventhandler`, `ffrt`, `hitrace`, `hilog`, `libxml2`, `samgr`, `safwk`

三方依赖：无声明

## 声明构建入口

- `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_ui_intf`
- `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_msg_intf`
- `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_trace_intf`
- `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:rtg_interface`
- `//foundation/resourceschedule/frame_aware_sched/profiles:frame_aware_sched_config`

## 声明测试入口

- `//foundation/resourceschedule/frame_aware_sched/test:frame_unittest`

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 5 |
| test | 5 |
| build-support | 5 |
| aggregate-codegen | 2 |
| total | 17 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `group` | `//foundation/resourceschedule/frame_aware_sched:libintellisensesched_intf` | [foundation/resourceschedule/frame_aware_sched/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/BUILD.gn) | 17 |
| aggregate-codegen | `group` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits:innerkits_target` | [foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_ui_intf_config` | [foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_trace_intf_config` | [foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn) | 27 |
| build-support | `config` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_ui_intf_public_config` | [foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn) | 32 |
| build-support | `config` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:rtg_interface_config` | [foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn) | 41 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_trace_intf` | [foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn) | 49 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_ui_intf` | [foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn) | 63 |
| build-support | `config` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_msg_intf_config` | [foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn) | 95 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:frame_msg_intf` | [foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn) | 107 |
| production | `ohos_shared_library` | `//foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf:rtg_interface` | [foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/interfaces/innerkits/frameintf/BUILD.gn) | 139 |
| test | `ohos_unittest` | `//foundation/resourceschedule/frame_aware_sched/test:frame_ui_intf_test` | [foundation/resourceschedule/frame_aware_sched/test/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/test/BUILD.gn) | 26 |
| test | `ohos_unittest` | `//foundation/resourceschedule/frame_aware_sched/test:frame_msg_intf_test` | [foundation/resourceschedule/frame_aware_sched/test/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/test/BUILD.gn) | 42 |
| test | `ohos_unittest` | `//foundation/resourceschedule/frame_aware_sched/test:rtg_interface_test` | [foundation/resourceschedule/frame_aware_sched/test/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/test/BUILD.gn) | 65 |
| test | `ohos_unittest` | `//foundation/resourceschedule/frame_aware_sched/test:intellisense_server_test` | [foundation/resourceschedule/frame_aware_sched/test/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/test/BUILD.gn) | 85 |
| test | `group` | `//foundation/resourceschedule/frame_aware_sched/test:frame_unittest` | [foundation/resourceschedule/frame_aware_sched/test/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/test/BUILD.gn) | 105 |
| production | `ohos_prebuilt_etc` | `//foundation/resourceschedule/frame_aware_sched/profiles:frame_aware_sched_config` | [foundation/resourceschedule/frame_aware_sched/profiles/BUILD.gn](../../../../../../foundation/resourceschedule/frame_aware_sched/profiles/BUILD.gn) | 16 |

## 查询命令

```bash
awk -F '\t' '$1 == "resourceschedule" && $2 == "frame_aware_sched"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
