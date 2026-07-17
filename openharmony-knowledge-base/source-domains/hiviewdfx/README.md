# HiviewDFX 源码域

## 定位

`base/hiviewdfx/` 是物理源码域，不是额外的子系统层级。当前 16 个仓和 16 个部件均由 bundle 明确映射到 `hiviewdfx` 子系统。

```text
base/hiviewdfx（物理源码域）
  -> hiviewdfx（子系统）
    -> component / process
      -> capability
        -> feature
```

## 覆盖范围

| 指标 | 数量 |
| --- | ---: |
| Git 子仓 | 16 |
| 部件 | 16 |
| 子系统 | 1 |
| BUILD.gn | 393 |
| 静态目标 | 1190 |
| 运行实体 | 12 |
| rk3568 选入部件 | 10 |
| 未映射目标 | 0 |

## 子系统入口

| 子系统 | 部件 | 运行实体 | 目标 | 产品选入 | 功能说明 | 构建索引 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| hiviewdfx | 16 | 12 | 1190 | 10 | [功能全景](../../subsystems/hiviewdfx/functional-overview.md) | [模块索引](../../subsystems/hiviewdfx/hiviewdfx-index.md) |

## 全量机器索引

| 文件 | 内容 |
| --- | --- |
| [repositories.tsv](../../generated/hiviewdfx/repositories.tsv) | Git 子仓、HEAD、分支和工作树状态 |
| [components.tsv](../../generated/hiviewdfx/components.tsv) | 全部部件元数据与目标统计 |
| [modules.tsv](../../generated/hiviewdfx/modules.tsv) | 全部可静态识别 GN 目标 |
| [runtime-entities.tsv](../../generated/hiviewdfx/runtime-entities.tsv) | daemon、命令、helper 和 SA |
| [subsystems.tsv](../../generated/hiviewdfx/subsystems.tsv) | 子系统聚合 |
| [unmapped-modules.tsv](../../generated/hiviewdfx/unmapped-modules.tsv) | 未映射目标及原因 |
| [summary.json](../../generated/hiviewdfx/summary.json) | 机器摘要、限制和验证入口 |
| [verification.md](../../generated/hiviewdfx/verification.md) | 覆盖率等式、链接、尾随空白和源码工作树检查 |

## 边界和限制

- 排除 `out/`、`interface/sdk_c/hiviewdfx` 和 `test/xts/acts/hiviewdfx`；它们分别属于构建产物、SDK 镜像和跨子系统验收测试。
- 静态目标只识别字面量名称；模板、循环和变量动态目标可能漏计。
- rk3568 选入状态来自 `specs/knowledge-base/generated/rk3568-parts.tsv`，需在产品配置刷新后重新生成。
- `usage_report` 有生产 executable 证据，但缺少本扫描边界内的 init/SA 启动配置，因此生命周期标为 inferred。
- 功能说明是源码语义总结；具体状态机、安全、性能与真机行为仍需专题下钻。

## 刷新方式

```bash
node specs/knowledge-base/tools/generate-hiviewdfx-summary.mjs
node specs/knowledge-base/tools/verify-hiviewdfx-summary.mjs
```
