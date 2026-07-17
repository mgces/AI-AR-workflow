# advanced_ui_component：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `arkui` |
| component | `advanced_ui_component` |
| Git 子仓 | `foundation/arkui/advanced_ui_component` |
| bundle | [foundation/arkui/advanced_ui_component/bundle.json](../../../../../../foundation/arkui/advanced_ui_component/bundle.json) |
| rk3568 selected | yes |
| adapted systems | standard |
| component dependencies | 6 |
| third-party dependencies | 0 |
| declared sub_component | 10 |
| inner kits | 0 |
| declared test entries | 0 |

## 依赖

组件依赖：`hilog`, `napi`, `ace_engine`, `window_manager`, `c_utils`, `ipc`

三方依赖：无声明

## 声明构建入口

- `//foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces:atomicservicenavigation`
- `//foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces:atomicservicesearch`
- `//foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces:atomicservicetabs`
- `//foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces:atomicserviceweb`
- `//foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces:innerfullscreenlaunchcomponent`
- `//foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces:interstitialdialogaction`
- `//foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar:atomicservicemenubar`
- `//foundation/arkui/advanced_ui_component/customappbar/interfaces:custom_app_bar`
- `//foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces:halfscreenlaunchcomponent`
- `//foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces:fullscreenlaunchcomponent`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 22 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 23 |
| total | 45 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `es2abc_gen_abc` | `//foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar:gen_atomicservicemenubar_abc` | [foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar/BUILD.gn) | 18 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar:atomicservicemenubar_abc` | [foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar/BUILD.gn) | 26 |
| aggregate-codegen | `gen_obj` | `//foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar:atomicservicemenubar_abc_preview` | [foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar/BUILD.gn) | 33 |
| production | `ohos_shared_library` | `//foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar:atomicservicemenubar` | [foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/customappbar/atomicservicemenubar/BUILD.gn) | 41 |
| production | `ohos_abc` | `//foundation/arkui/advanced_ui_component/customappbar/interfaces:custom_app_bar_abc` | [foundation/arkui/advanced_ui_component/customappbar/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/customappbar/interfaces/BUILD.gn) | 18 |
| production | `source_set` | `//foundation/arkui/advanced_ui_component/customappbar/interfaces:custom_app_bar` | [foundation/arkui/advanced_ui_component/customappbar/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/customappbar/interfaces/BUILD.gn) | 32 |
| aggregate-codegen | `group` | `//foundation/arkui/advanced_ui_component:advanced_ui_component` | [foundation/arkui/advanced_ui_component/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/BUILD.gn) | 14 |
| production | `es2abc_gen_abc` | `//foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces:gen_fullscreenlaunchcomponent_abc` | [foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces/BUILD.gn) | 18 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces:fullscreenlaunchcomponent_abc` | [foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces/BUILD.gn) | 26 |
| production | `es2abc_gen_abc` | `//foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces:gen_fullscreenlaunchcomponent_abc_preview` | [foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces/BUILD.gn) | 33 |
| aggregate-codegen | `gen_obj` | `//foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces:fullscreenlaunchcomponent_abc_preview` | [foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces/BUILD.gn) | 42 |
| production | `ohos_shared_library` | `//foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces:fullscreenlaunchcomponent` | [foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/fullscreenlaunchcomponent/interfaces/BUILD.gn) | 50 |
| production | `es2abc_gen_abc` | `//foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces:gen_atomicservicesearch_abc` | [foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces/BUILD.gn) | 18 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces:atomicservicesearch_abc` | [foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces/BUILD.gn) | 26 |
| aggregate-codegen | `gen_obj` | `//foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces:atomicservicesearch_abc_preview` | [foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces/BUILD.gn) | 33 |
| production | `ohos_shared_library` | `//foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces:atomicservicesearch` | [foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicesearch/interfaces/BUILD.gn) | 40 |
| production | `es2abc_gen_abc` | `//foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces:gen_innerfullscreenlaunchcomponent_abc` | [foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces/BUILD.gn) | 18 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces:innerfullscreenlaunchcomponent_abc` | [foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces/BUILD.gn) | 26 |
| aggregate-codegen | `gen_obj` | `//foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces:innerfullscreenlaunchcomponent_abc_preview` | [foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces/BUILD.gn) | 34 |
| production | `ohos_shared_library` | `//foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces:innerfullscreenlaunchcomponent` | [foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/innerfullscreenlaunchcomponent/interfaces/BUILD.gn) | 42 |
| production | `es2abc_gen_abc` | `//foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces:gen_atomicservicetabs_abc` | [foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces/BUILD.gn) | 18 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces:atomicservicetabs_abc` | [foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces/BUILD.gn) | 26 |
| aggregate-codegen | `gen_obj` | `//foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces:atomicservicetabs_abc_preview` | [foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces/BUILD.gn) | 33 |
| production | `ohos_shared_library` | `//foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces:atomicservicetabs` | [foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicetabs/interfaces/BUILD.gn) | 40 |
| production | `es2abc_gen_abc` | `//foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces:gen_interstitialdialogaction_abc` | [foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces/BUILD.gn) | 18 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces:interstitialdialogaction_abc` | [foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces/BUILD.gn) | 26 |
| aggregate-codegen | `gen_obj` | `//foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces:interstitialdialogaction_abc_preview` | [foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces/BUILD.gn) | 33 |
| production | `ohos_shared_library` | `//foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces:interstitialdialogaction` | [foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/interstitialdialogaction/interfaces/BUILD.gn) | 40 |
| aggregate-codegen | `group` | `//foundation/arkui/advanced_ui_component/advanced_ui_component_static:advanced_ui_component_static` | [foundation/arkui/advanced_ui_component/advanced_ui_component_static/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/advanced_ui_component_static/BUILD.gn) | 16 |
| aggregate-codegen | `generate_static_abc` | `//foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent:full_screen_launch_ets_abc` | [foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent/BUILD.gn) | 17 |
| aggregate-codegen | `ohos_copy` | `//foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent:copy_full_screen_launch_ets_abc` | [foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent/BUILD.gn) | 27 |
| production | `ohos_prebuilt_etc` | `//foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent:full_screen_launch_ets_abc_etc` | [foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent/BUILD.gn) | 37 |
| aggregate-codegen | `group` | `//foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent:fullScreenLaunch` | [foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/advanced_ui_component_static/fullscreenlaunchcomponent/BUILD.gn) | 45 |
| production | `es2abc_gen_abc` | `//foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces:gen_atomicserviceweb_abc` | [foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces/BUILD.gn) | 18 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces:atomicserviceweb_abc` | [foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces/BUILD.gn) | 26 |
| aggregate-codegen | `gen_obj` | `//foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces:atomicserviceweb_abc_preview` | [foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces/BUILD.gn) | 33 |
| production | `ohos_shared_library` | `//foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces:atomicserviceweb` | [foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicserviceweb/interfaces/BUILD.gn) | 40 |
| production | `es2abc_gen_abc` | `//foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces:gen_halfscreenlaunchcomponent_abc` | [foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces/BUILD.gn) | 18 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces:halfscreenlaunchcomponent_abc` | [foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces/BUILD.gn) | 26 |
| aggregate-codegen | `gen_obj` | `//foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces:halfscreenlaunchcomponent_abc_preview` | [foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces/BUILD.gn) | 33 |
| production | `ohos_shared_library` | `//foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces:halfscreenlaunchcomponent` | [foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/halfscreenlaunchcomponent/interfaces/BUILD.gn) | 40 |
| production | `es2abc_gen_abc` | `//foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces:gen_atomicservicenavigation_abc` | [foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces/BUILD.gn) | 18 |
| aggregate-codegen | `gen_js_obj` | `//foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces:atomicservicenavigation_abc` | [foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces/BUILD.gn) | 26 |
| aggregate-codegen | `gen_obj` | `//foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces:atomicservicenavigation_abc_preview` | [foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces/BUILD.gn) | 33 |
| production | `ohos_shared_library` | `//foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces:atomicservicenavigation` | [foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces/BUILD.gn](../../../../../../foundation/arkui/advanced_ui_component/atomicservicenavigation/interfaces/BUILD.gn) | 40 |

## 查询命令

```bash
awk -F '\t' '$1 == "arkui" && $2 == "advanced_ui_component"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
