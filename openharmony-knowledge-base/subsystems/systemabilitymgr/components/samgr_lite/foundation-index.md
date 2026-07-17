# samgr_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `systemabilitymgr` |
| component | `samgr_lite` |
| Git 子仓 | `foundation/systemabilitymgr/samgr_lite` |
| bundle | [foundation/systemabilitymgr/samgr_lite/bundle.json](../../../../../../foundation/systemabilitymgr/samgr_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | mini,small |
| component dependencies | 7 |
| third-party dependencies | 2 |
| declared sub_component | 1 |
| inner kits | 1 |
| declared test entries | 0 |

## 依赖

组件依赖：`hilog_lite`, `ipc`, `liteos_m`, `mksh`, `permission_lite`, `toybox`, `utils_lite`

三方依赖：`bounds_checking_function`, `cJSON`

## 声明构建入口

- `//foundation/systemabilitymgr/samgr_lite:samgr`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 18 |
| test | 0 |
| build-support | 9 |
| aggregate-codegen | 2 |
| total | 29 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `shared_library` | `//foundation/systemabilitymgr/samgr_lite/samgr_server:server` | [foundation/systemabilitymgr/samgr_lite/samgr_server/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_server/BUILD.gn) | 17 |
| production | `static_library` | `//foundation/systemabilitymgr/samgr_lite/samgr_server:server` | [foundation/systemabilitymgr/samgr_lite/samgr_server/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_server/BUILD.gn) | 47 |
| production | `lite_component` | `//foundation/systemabilitymgr/samgr_lite:samgr` | [foundation/systemabilitymgr/samgr_lite/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/BUILD.gn) | 17 |
| aggregate-codegen | `copy` | `//foundation/systemabilitymgr/samgr_lite:ConfigFiles` | [foundation/systemabilitymgr/samgr_lite/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/BUILD.gn) | 44 |
| production | `ndk_lib` | `//foundation/systemabilitymgr/samgr_lite:samgr_lite_ndk` | [foundation/systemabilitymgr/samgr_lite/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/BUILD.gn) | 50 |
| aggregate-codegen | `generate_notice_file` | `//foundation/systemabilitymgr/samgr_lite:samgr_notice_file` | [foundation/systemabilitymgr/samgr_lite/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/BUILD.gn) | 78 |
| production | `source_set` | `//foundation/systemabilitymgr/samgr_lite/samgr_client:client` | [foundation/systemabilitymgr/samgr_lite/samgr_client/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_client/BUILD.gn) | 17 |
| production | `source_set` | `//foundation/systemabilitymgr/samgr_lite/samgr_client:client` | [foundation/systemabilitymgr/samgr_lite/samgr_client/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_client/BUILD.gn) | 40 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr_lite/samgr:external_settings_shared` | [foundation/systemabilitymgr/samgr_lite/samgr/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr/BUILD.gn) | 32 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr_lite/samgr:samgr_public` | [foundation/systemabilitymgr/samgr_lite/samgr/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr/BUILD.gn) | 36 |
| production | `static_library` | `//foundation/systemabilitymgr/samgr_lite/samgr:samgr` | [foundation/systemabilitymgr/samgr_lite/samgr/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr/BUILD.gn) | 47 |
| production | `shared_library` | `//foundation/systemabilitymgr/samgr_lite/samgr:samgr` | [foundation/systemabilitymgr/samgr_lite/samgr/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr/BUILD.gn) | 85 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr_lite/samgr/source:samgr_source_public` | [foundation/systemabilitymgr/samgr_lite/samgr/source/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr/source/BUILD.gn) | 16 |
| production | `static_library` | `//foundation/systemabilitymgr/samgr_lite/samgr/source:samgr_source` | [foundation/systemabilitymgr/samgr_lite/samgr/source/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr/source/BUILD.gn) | 27 |
| production | `source_set` | `//foundation/systemabilitymgr/samgr_lite/samgr/source:samgr_source` | [foundation/systemabilitymgr/samgr_lite/samgr/source/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr/source/BUILD.gn) | 55 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr_lite/samgr/adapter:samgr_adapter_public` | [foundation/systemabilitymgr/samgr_lite/samgr/adapter/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr/adapter/BUILD.gn) | 14 |
| production | `static_library` | `//foundation/systemabilitymgr/samgr_lite/samgr/adapter:samgr_adapter` | [foundation/systemabilitymgr/samgr_lite/samgr/adapter/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr/adapter/BUILD.gn) | 23 |
| production | `source_set` | `//foundation/systemabilitymgr/samgr_lite/samgr/adapter:samgr_adapter` | [foundation/systemabilitymgr/samgr_lite/samgr/adapter/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr/adapter/BUILD.gn) | 43 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr_lite/samgr_endpoint:endpoint_public` | [foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn) | 17 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr_lite/samgr_endpoint:endpoint_internal` | [foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn) | 28 |
| production | `source_set` | `//foundation/systemabilitymgr/samgr_lite/samgr_endpoint:endpoint_source` | [foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn) | 35 |
| production | `source_set` | `//foundation/systemabilitymgr/samgr_lite/samgr_endpoint:store_source` | [foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn) | 69 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr_lite/samgr_endpoint:endpoint_public` | [foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn) | 88 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr_lite/samgr_endpoint:endpoint_internal` | [foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn) | 99 |
| production | `source_set` | `//foundation/systemabilitymgr/samgr_lite/samgr_endpoint:endpoint_source` | [foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn) | 109 |
| production | `source_set` | `//foundation/systemabilitymgr/samgr_lite/samgr_endpoint:store_source` | [foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/samgr_endpoint/BUILD.gn) | 136 |
| build-support | `config` | `//foundation/systemabilitymgr/samgr_lite/communication/broadcast:broadcast_public` | [foundation/systemabilitymgr/samgr_lite/communication/broadcast/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/communication/broadcast/BUILD.gn) | 14 |
| production | `static_library` | `//foundation/systemabilitymgr/samgr_lite/communication/broadcast:broadcast` | [foundation/systemabilitymgr/samgr_lite/communication/broadcast/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/communication/broadcast/BUILD.gn) | 24 |
| production | `shared_library` | `//foundation/systemabilitymgr/samgr_lite/communication/broadcast:broadcast` | [foundation/systemabilitymgr/samgr_lite/communication/broadcast/BUILD.gn](../../../../../../foundation/systemabilitymgr/samgr_lite/communication/broadcast/BUILD.gn) | 36 |

## 查询命令

```bash
awk -F '\t' '$1 == "systemabilitymgr" && $2 == "samgr_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
