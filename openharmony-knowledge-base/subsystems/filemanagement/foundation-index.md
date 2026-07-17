# filemanagement：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 7 |
| rk3568 选入部件 | 6 |
| GN 目标 | 1647 |
| 生产目标 | 246 |
| 测试目标 | 1210 |
| 构建支持目标 | 109 |
| 聚合/代码生成目标 | 82 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| app_file_service | yes | foundation/filemanagement/app_file_service | 222 | 53 | 135 | [查看](components/app_file_service/foundation-index.md) |
| dfs_service | yes | foundation/filemanagement/dfs_service | 429 | 54 | 316 | [查看](components/dfs_service/foundation-index.md) |
| disk_manager | yes | foundation/filemanagement/disk_manager | 51 | 12 | 27 | [查看](components/disk_manager/foundation-index.md) |
| file_api | yes | foundation/filemanagement/file_api | 105 | 47 | 25 | [查看](components/file_api/foundation-index.md) |
| filemanagement_cangjie_wrapper | no | foundation/filemanagement/filemanagement_cangjie_wrapper | 5 | 4 | 0 | [查看](components/filemanagement_cangjie_wrapper/foundation-index.md) |
| storage_service | yes | foundation/filemanagement/storage_service | 689 | 44 | 612 | [查看](components/storage_service/foundation-index.md) |
| user_file_service | yes | foundation/filemanagement/user_file_service | 146 | 32 | 95 | [查看](components/user_file_service/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "filemanagement"' specs/knowledge-base/generated/foundation/modules.tsv
```
