# HiviewDFX 完整模块索引

> 本文件由 `generate-hiviewdfx-summary.mjs` 生成，请勿手工编辑。

[返回子系统](README.md) | [功能全景](functional-overview.md) | [源码域](../../source-domains/hiviewdfx/README.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| Git 子仓 | 16 |
| 部件 | 16 |
| BUILD.gn | 393 |
| 静态目标 | 1190 |
| 生产目标 | 362 |
| 测试目标 | 506 |
| 未映射目标 | 0 |

## 部件

| 部件 | rk3568 | 静态目标 | 生产 | 测试 | 运行实体 | 索引 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `api_metrics` | yes | 2 | 1 | 0 | 0 | [查看](components/api_metrics/hiviewdfx-index.md) |
| `blackbox_lite` | no | 1 | 1 | 0 | 0 | [查看](components/blackbox_lite/hiviewdfx-index.md) |
| `faultloggerd` | yes | 267 | 79 | 132 | 2 | [查看](components/faultloggerd/hiviewdfx-index.md) |
| `hiappevent` | yes | 42 | 14 | 16 | 0 | [查看](components/hiappevent/hiviewdfx-index.md) |
| `hichecker` | yes | 25 | 10 | 6 | 0 | [查看](components/hichecker/hiviewdfx-index.md) |
| `hicollie` | yes | 37 | 8 | 20 | 0 | [查看](components/hicollie/hiviewdfx-index.md) |
| `hidumper` | yes | 87 | 24 | 48 | 2 | [查看](components/hidumper/hiviewdfx-index.md) |
| `hidumper_lite` | no | 3 | 2 | 0 | 0 | [查看](components/hidumper_lite/hiviewdfx-index.md) |
| `hievent_lite` | no | 3 | 2 | 0 | 0 | [查看](components/hievent_lite/hiviewdfx-index.md) |
| `hilog` | yes | 53 | 17 | 13 | 2 | [查看](components/hilog/hiviewdfx-index.md) |
| `hilog_lite` | no | 24 | 13 | 2 | 0 | [查看](components/hilog_lite/hiviewdfx-index.md) |
| `hisysevent` | yes | 47 | 14 | 22 | 1 | [查看](components/hisysevent/hiviewdfx-index.md) |
| `hitrace` | yes | 81 | 30 | 33 | 1 | [查看](components/hitrace/hiviewdfx-index.md) |
| `hiview` | yes | 509 | 141 | 214 | 4 | [查看](components/hiview/hiviewdfx-index.md) |
| `hiview_lite` | no | 3 | 1 | 0 | 0 | [查看](components/hiview_lite/hiviewdfx-index.md) |
| `hiviewdfx_cangjie_wrapper` | no | 6 | 5 | 0 | 0 | [查看](components/hiviewdfx_cangjie_wrapper/hiviewdfx-index.md) |

## 未映射项

全部可静态识别目标均通过最长 `bundle.json` 目录前缀映射到部件；没有虚构部件或仓库节点。

运行实体表中 `usage_report` 的启动关系标记为 `inferred`；其余条目有 executable、init cfg 或 SA profile 直接证据。

## 查询

```bash
awk -F '\t' '$1 == "hiviewdfx"' specs/knowledge-base/generated/hiviewdfx/modules.tsv
```
