# HiviewDFX 组件索引

[返回 HiviewDFX](../README.md)

全部 16 个部件（包括 rk3568 未选入的 lite 与仓颉封装部件）见：

- [部件功能全景](../functional-overview.md)
- [部件机器索引](../../../generated/hiviewdfx/components.tsv)
- [完整模块索引](../hiviewdfx-index.md)

## 当前产品组件

```text
api_metrics
faultloggerd
hiappevent
hichecker
hicollie
hidumper
hilog
hisysevent
hitrace
hiview
```

查询组件元数据：

```bash
awk -F '\t' '$1 == "hiviewdfx"' \
  specs/knowledge-base/generated/hiviewdfx/components.tsv
```

查询 rk3568 实际选入：

```bash
awk -F '\t' '$1 == "hiviewdfx"' \
  specs/knowledge-base/generated/rk3568-parts.tsv
```

## 继续细分方式

当需要深度分析某个组件时新增：

```text
components/<component>/README.md
```

如果功能是库/API 能力，再建立：

```text
components/<component>/capabilities/<domain>/features/<feature>/
```

如果功能主要运行在独立进程，应改放到 `processes/<process>/`，组件节点只保留构建和接口边界。
