# bundle_framework_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `bundlemanager` |
| component | `bundle_framework_lite` |
| Git 子仓 | `foundation/bundlemanager/bundle_framework_lite` |
| bundle | [foundation/bundlemanager/bundle_framework_lite/bundle.json](../../../../../../foundation/bundlemanager/bundle_framework_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | mini,small |
| component dependencies | 7 |
| third-party dependencies | 4 |
| declared sub_component | 2 |
| inner kits | 2 |
| declared test entries | 0 |

## 依赖

组件依赖：`ability_lite`, `utils_lite`, `hilog_lite`, `permission_lite`, `samgr_lite`, `resource_management_lite`, `appverify`

三方依赖：`zlib`, `bounds_checking_function`, `cJSON`, `jerryscript`

## 声明构建入口

- `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite:appexecfwk_services_lite`
- `//foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite:appexecfwk_kits_lite`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 11 |
| test | 0 |
| build-support | 1 |
| aggregate-codegen | 4 |
| total | 16 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| aggregate-codegen | `generate_notice_file` | `//foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite:bundle_notice_file` | [foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite/BUILD.gn) | 18 |
| production | `lite_component` | `//foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite:appexecfwk_kits_lite` | [foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite/BUILD.gn) | 26 |
| production | `lite_library` | `//foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite:bundle` | [foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite/BUILD.gn) | 30 |
| production | `ndk_lib` | `//foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite:bundle_notes` | [foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/frameworks/bundle_lite/BUILD.gn) | 134 |
| production | `static_library` | `//foundation/bundlemanager/bundle_framework_lite/interfaces/kits/bundle_lite/js/builtin:capability_api_simulator` | [foundation/bundlemanager/bundle_framework_lite/interfaces/kits/bundle_lite/js/builtin/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/interfaces/kits/bundle_lite/js/builtin/BUILD.gn) | 18 |
| production | `shared_library` | `//foundation/bundlemanager/bundle_framework_lite/interfaces/kits/bundle_lite/js/builtin:capability_api` | [foundation/bundlemanager/bundle_framework_lite/interfaces/kits/bundle_lite/js/builtin/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/interfaces/kits/bundle_lite/js/builtin/BUILD.gn) | 33 |
| aggregate-codegen | `generate_notice_file` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/bundle_daemon:bundle_daemon_lite_notice_file` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/bundle_daemon/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/bundle_daemon/BUILD.gn) | 17 |
| production | `executable` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/bundle_daemon:bundle_daemon` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/bundle_daemon/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/bundle_daemon/BUILD.gn) | 25 |
| build-support | `config` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite:bundle_config` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn) | 17 |
| production | `static_library` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite:bundlems` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn) | 23 |
| production | `lite_component` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite:appexecfwk_services_lite` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn) | 101 |
| production | `shared_library` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite:bundlems` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn) | 105 |
| production | `lite_component` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite:appexecfwk_services_lite` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn) | 168 |
| aggregate-codegen | `generate_notice_file` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite:appexecfwk_services_lite_notice_file` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/BUILD.gn) | 177 |
| aggregate-codegen | `generate_notice_file` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/tools:bm_notice_file` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/tools/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/tools/BUILD.gn) | 17 |
| production | `executable` | `//foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/tools:bm` | [foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/tools/BUILD.gn](../../../../../../foundation/bundlemanager/bundle_framework_lite/services/bundlemgr_lite/tools/BUILD.gn) | 22 |

## 查询命令

```bash
awk -F '\t' '$1 == "bundlemanager" && $2 == "bundle_framework_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
