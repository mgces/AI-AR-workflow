# camera_lite：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `multimedia` |
| component | `camera_lite` |
| Git 子仓 | `foundation/multimedia/camera_lite` |
| bundle | [foundation/multimedia/camera_lite/bundle.json](../../../../../../foundation/multimedia/camera_lite/bundle.json) |
| rk3568 selected | no |
| adapted systems | mini,small |
| component dependencies | 3 |
| third-party dependencies | 1 |
| declared sub_component | 1 |
| inner kits | 0 |
| declared test entries | 0 |

## 依赖

组件依赖：`hilog_lite`, `permission_lite`, `surface_lite`

三方依赖：`bounds_checking_function`

## 声明构建入口

- `//foundation/multimedia/camera_lite/frameworks:camera_lite`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 2 |
| test | 2 |
| build-support | 2 |
| aggregate-codegen | 0 |
| total | 6 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `shared_library` | `//foundation/multimedia/camera_lite/frameworks:camera_lite` | [foundation/multimedia/camera_lite/frameworks/BUILD.gn](../../../../../../foundation/multimedia/camera_lite/frameworks/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/multimedia/camera_lite/frameworks:camera_client_external_library_config` | [foundation/multimedia/camera_lite/frameworks/BUILD.gn](../../../../../../foundation/multimedia/camera_lite/frameworks/BUILD.gn) | 106 |
| production | `shared_library` | `//foundation/multimedia/camera_lite/services:camera_server` | [foundation/multimedia/camera_lite/services/BUILD.gn](../../../../../../foundation/multimedia/camera_lite/services/BUILD.gn) | 14 |
| build-support | `config` | `//foundation/multimedia/camera_lite/services:external_camera_server_library` | [foundation/multimedia/camera_lite/services/BUILD.gn](../../../../../../foundation/multimedia/camera_lite/services/BUILD.gn) | 54 |
| test | `group` | `//foundation/multimedia/camera_lite/test:lite_camera_test` | [foundation/multimedia/camera_lite/test/BUILD.gn](../../../../../../foundation/multimedia/camera_lite/test/BUILD.gn) | 16 |
| test | `unittest` | `//foundation/multimedia/camera_lite/test:lite_camera_unittest` | [foundation/multimedia/camera_lite/test/BUILD.gn](../../../../../../foundation/multimedia/camera_lite/test/BUILD.gn) | 23 |

## 查询命令

```bash
awk -F '\t' '$1 == "multimedia" && $2 == "camera_lite"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
