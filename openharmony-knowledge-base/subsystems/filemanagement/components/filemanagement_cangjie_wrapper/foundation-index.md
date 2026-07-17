# filemanagement_cangjie_wrapper：Foundation 完整模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回部件节点](README.md) | [功能说明](functional-overview.md) | [返回子系统](../../README.md)

## 部件元数据

| 属性 | 值 |
| --- | --- |
| subsystem | `filemanagement` |
| component | `filemanagement_cangjie_wrapper` |
| Git 子仓 | `foundation/filemanagement/filemanagement_cangjie_wrapper` |
| bundle | [foundation/filemanagement/filemanagement_cangjie_wrapper/bundle.json](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/bundle.json) |
| rk3568 selected | no |
| adapted systems | standard |
| component dependencies | 4 |
| third-party dependencies | 0 |
| declared sub_component | 4 |
| inner kits | 2 |
| declared test entries | 0 |

## 依赖

组件依赖：`app_file_service`, `cangjie_ark_interop`, `hiviewdfx_cangjie_wrapper`, `file_api`

三方依赖：无声明

## 声明构建入口

- `//foundation/filemanagement/filemanagement_cangjie_wrapper/kit/CoreFileKit:kit.CoreFileKit`
- `//foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file:ohos.file`
- `//foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file/fileuri:ohos.file.fileuri`
- `//foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file/fs:ohos.file.fs`

## 声明测试入口

- 无

## GN 目标汇总

| 分类 | 数量 |
| --- | ---: |
| production | 4 |
| test | 0 |
| build-support | 0 |
| aggregate-codegen | 1 |
| total | 5 |

## 全部静态目标

| 分类 | 类型 | GN label | BUILD.gn | 行 |
| --- | --- | --- | --- | ---: |
| production | `ohos_cangjie_shared_library` | `//foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file:ohos.file` | [foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file/BUILD.gn](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file/fileuri:ohos.file.fileuri` | [foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file/fileuri/BUILD.gn](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file/fileuri/BUILD.gn) | 19 |
| production | `ohos_cangjie_shared_library` | `//foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file/fs:ohos.file.fs` | [foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file/fs/BUILD.gn](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/ohos/file/fs/BUILD.gn) | 19 |
| aggregate-codegen | `copy_ohos_cangjie_sdk_api_lib` | `//foundation/filemanagement/filemanagement_cangjie_wrapper:copy_sdk_filemanagement_cangjie_libs` | [foundation/filemanagement/filemanagement_cangjie_wrapper/BUILD.gn](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/BUILD.gn) | 25 |
| production | `ohos_cangjie_shared_library` | `//foundation/filemanagement/filemanagement_cangjie_wrapper/kit/CoreFileKit:kit.CoreFileKit` | [foundation/filemanagement/filemanagement_cangjie_wrapper/kit/CoreFileKit/BUILD.gn](../../../../../../foundation/filemanagement/filemanagement_cangjie_wrapper/kit/CoreFileKit/BUILD.gn) | 19 |

## 查询命令

```bash
awk -F '\t' '$1 == "filemanagement" && $2 == "filemanagement_cangjie_wrapper"'   specs/knowledge-base/generated/foundation/modules.tsv
```

静态索引只识别 `BUILD.gn` 中名称为字符串字面量的目标；循环或变量动态生成的目标仍需阅读 GN 文件。
