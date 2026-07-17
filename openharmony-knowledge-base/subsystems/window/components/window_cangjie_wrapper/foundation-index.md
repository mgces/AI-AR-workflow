# window_cangjie_wrapper：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `window` |
| component | `window_cangjie_wrapper` |
| Git 子仓 | `foundation/window/window_cangjie_wrapper` |
| bundle | [foundation/window/window_cangjie_wrapper/bundle.json](../../../../../../foundation/window/window_cangjie_wrapper/bundle.json) |
| rk3568 selected | no |
| adapted systems | standard |
| component dependencies | 7 |
| third-party dependencies | 0 |
| declared sub_component | 2 |
| inner kits | 3 |
| declared test entries | 0 |

## 依赖

组件依赖：`ability_cangjie_wrapper`, `arkui_cangjie_wrapper`, `cangjie_ark_interop`, `hiviewdfx_cangjie_wrapper`, `multimedia_cangjie_wrapper`, `ability_runtime`, `window_manager`

三方依赖：无声明

## 声明构建入口

- `//foundation/window/window_cangjie_wrapper/ohos/window:ohos.window`
- `//foundation/window/window_cangjie_wrapper/ohos/display:ohos.display`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 2 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 1 |
| total | 3 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_cangjie_shared_library` | `//foundation/window/window_cangjie_wrapper/ohos/window:ohos.window` | [foundation/window/window_cangjie_wrapper/ohos/window/BUILD.gn](../../../../../../foundation/window/window_cangjie_wrapper/ohos/window/BUILD.gn) | 16 |
| production | `ohos_cangjie_shared_library` | `//foundation/window/window_cangjie_wrapper/ohos/display:ohos.display` | [foundation/window/window_cangjie_wrapper/ohos/display/BUILD.gn](../../../../../../foundation/window/window_cangjie_wrapper/ohos/display/BUILD.gn) | 16 |
| aggregate-codegen | `copy_ohos_cangjie_sdk_api_lib` | `//foundation/window/window_cangjie_wrapper:copy_sdk_window_cangjie_libs` | [foundation/window/window_cangjie_wrapper/BUILD.gn](../../../../../../foundation/window/window_cangjie_wrapper/BUILD.gn) | 21 |

## 查询命令

```bash
awk -F '\t' '$1 == "window" && $2 == "window_cangjie_wrapper"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
