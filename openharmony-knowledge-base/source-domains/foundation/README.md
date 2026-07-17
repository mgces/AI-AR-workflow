# Foundation 源码域

## 定位

`foundation/` 是源码仓物理目录，不是一个 OpenHarmony 子系统。这里提供 Foundation 全域入口，将物理代码映射回统一的所有权层级：

```text
Foundation 源码域（物理视图）
  -> 子系统（产品与架构边界）
    -> 部件或运行进程
      -> 能力域
        -> 具体功能
```

因此，本页只负责全量覆盖和导航；部件能力、进程和具体功能继续在 `subsystems/` 下细分。

## 覆盖范围

| 指标 | 数量 |
| --- | ---: |
| Git 子仓 | 117 |
| `bundle.json` 部件 | 115 |
| 子系统 | 18 |
| `BUILD.gn` 文件 | 10,970 |
| 含静态字面量目标的 `BUILD.gn` | 10,942 |
| 静态字面量 GN 目标 | 27,239 |
| 运行进程 | 68 |
| init 服务配置项 | 79 |
| System Ability 配置项 | 108 |
| rk3568 选入部件 | 87 |
| 未归属 `bundle.json` 的目标 | 12 |
| 只有仓库级目标、无部件声明的仓 | 1 |
| 无部件声明且无静态目标的仓 | 1 |

“静态字面量 GN 目标”只统计形如 `ohos_shared_library("name")` 的声明。通过变量、循环或模板动态生成的目标仍需回到对应 `BUILD.gn` 分析。

## 子系统入口

| 子系统 | 部件 | 宿主进程 | GN 目标 | rk3568 部件 | 导航 |
| --- | ---: | ---: | ---: | ---: | --- |
| ability | 8 | 4 | 5,044 | 5 | [功能](../../subsystems/ability/functional-overview.md) / [进程](../../subsystems/ability/foundation-processes.md) / [模块](../../subsystems/ability/foundation-index.md) |
| ai | 3 | 1 | 183 | 2 | [功能](../../subsystems/ai/functional-overview.md) / [进程](../../subsystems/ai/foundation-processes.md) / [模块](../../subsystems/ai/foundation-index.md) |
| arkui | 7 | 2 | 1,773 | 5 | [功能](../../subsystems/arkui/functional-overview.md) / [进程](../../subsystems/arkui/foundation-processes.md) / [模块](../../subsystems/arkui/foundation-index.md) |
| barrierfree | 1 | 1 | 199 | 1 | [功能](../../subsystems/barrierfree/functional-overview.md) / [进程](../../subsystems/barrierfree/foundation-processes.md) / [模块](../../subsystems/barrierfree/foundation-index.md) |
| bundlemanager | 7 | 3 | 1,722 | 5 | [功能](../../subsystems/bundlemanager/functional-overview.md) / [进程](../../subsystems/bundlemanager/foundation-processes.md) / [模块](../../subsystems/bundlemanager/foundation-index.md) |
| castplus | 2 | 2 | 189 | 2 | [功能](../../subsystems/castplus/functional-overview.md) / [进程](../../subsystems/castplus/foundation-processes.md) / [模块](../../subsystems/castplus/foundation-index.md) |
| communication | 18 | 11 | 2,736 | 11 | [功能](../../subsystems/communication/functional-overview.md) / [进程](../../subsystems/communication/foundation-processes.md) / [模块](../../subsystems/communication/foundation-index.md) |
| deviceprofile | 1 | 1 | 92 | 1 | [功能](../../subsystems/deviceprofile/functional-overview.md) / [进程](../../subsystems/deviceprofile/foundation-processes.md) / [模块](../../subsystems/deviceprofile/foundation-index.md) |
| distributeddatamgr | 9 | 2 | 1,891 | 8 | [功能](../../subsystems/distributeddatamgr/functional-overview.md) / [进程](../../subsystems/distributeddatamgr/foundation-processes.md) / [模块](../../subsystems/distributeddatamgr/foundation-index.md) |
| distributedhardware | 7 | 7 | 1,665 | 7 | [功能](../../subsystems/distributedhardware/functional-overview.md) / [进程](../../subsystems/distributedhardware/foundation-processes.md) / [模块](../../subsystems/distributedhardware/foundation-index.md) |
| filemanagement | 7 | 10 | 1,647 | 6 | [功能](../../subsystems/filemanagement/functional-overview.md) / [进程](../../subsystems/filemanagement/foundation-processes.md) / [模块](../../subsystems/filemanagement/foundation-index.md) |
| graphic | 7 | 2 | 2,476 | 5 | [功能](../../subsystems/graphic/functional-overview.md) / [进程](../../subsystems/graphic/foundation-processes.md) / [模块](../../subsystems/graphic/foundation-index.md) |
| multimedia | 18 | 10 | 4,285 | 13 | [功能](../../subsystems/multimedia/functional-overview.md) / [进程](../../subsystems/multimedia/foundation-processes.md) / [模块](../../subsystems/multimedia/foundation-index.md) |
| multimodalinput | 1 | 2 | 1,372 | 1 | [功能](../../subsystems/multimodalinput/functional-overview.md) / [进程](../../subsystems/multimodalinput/foundation-processes.md) / [模块](../../subsystems/multimodalinput/foundation-index.md) |
| officeservice | 1 | 1 | 105 | 1 | [功能](../../subsystems/officeservice/functional-overview.md) / [进程](../../subsystems/officeservice/foundation-processes.md) / [模块](../../subsystems/officeservice/foundation-index.md) |
| resourceschedule | 10 | 6 | 639 | 10 | [功能](../../subsystems/resourceschedule/functional-overview.md) / [进程](../../subsystems/resourceschedule/foundation-processes.md) / [模块](../../subsystems/resourceschedule/foundation-index.md) |
| systemabilitymgr | 5 | 3 | 221 | 3 | [功能](../../subsystems/systemabilitymgr/functional-overview.md) / [进程](../../subsystems/systemabilitymgr/foundation-processes.md) / [模块](../../subsystems/systemabilitymgr/foundation-index.md) |
| window | 3 | 0 | 1,000 | 1 | [功能](../../subsystems/window/functional-overview.md) / 跨宿主进程见功能页 / [模块](../../subsystems/window/foundation-index.md) |

## 全量机器索引

| 文件 | 粒度 |
| --- | --- |
| [repositories.tsv](../../generated/foundation/repositories.tsv) | 一个 Foundation Git 子仓 |
| [components.tsv](../../generated/foundation/components.tsv) | 一个 Foundation 部件及目标统计 |
| [modules.tsv](../../generated/foundation/modules.tsv) | 一个静态 GN 目标 |
| [processes.tsv](../../generated/foundation/processes.tsv) | 一个有 init/SA 强证据的运行进程 |
| [runtime-entities.tsv](../../generated/foundation/runtime-entities.tsv) | 一条 init 服务或 System Ability 运行证据 |
| [subsystems.tsv](../../generated/foundation/subsystems.tsv) | 一个子系统的聚合统计 |
| [unmapped-modules.tsv](../../generated/foundation/unmapped-modules.tsv) | 没有映射到 `bundle.json` 的 GN 目标 |
| [summary.json](../../generated/foundation/summary.json) | Foundation 聚合摘要 |

`repositories.tsv` 的 `coverage_status` 用于识别边界仓：

- `component-and-targets`：同时有部件声明和静态 GN 目标。
- `repository-targets-only`：没有部件声明，但存在仓库级 GN 目标。
- `repository-only`：没有部件声明，也没有可静态识别的字面量目标。
- `component-only`：有部件声明，但没有可静态识别的字面量目标。

## 继续细分

生成索引解决“全部覆盖”，人工文档解决“架构解释”。细化某个部件时：

1. 从对应子系统的 `functional-overview.md` 理解部件功能分工。
2. 在 `components/<component>/functional-overview.md` 查看边界、接口和运行关系。
3. 独立运行实体放入子系统的 `processes/<process>/`。
4. 稳定业务分类放入 `capabilities/<domain>/`。
5. 插件、协议、算法或独立需求放入 `features/<feature>/`。

不要把 Git 子仓、部件、进程和小功能平铺在同一级。

## 刷新方式

按依赖顺序执行：

```bash
bash specs/knowledge-base/tools/generate-global-index.sh
bash specs/knowledge-base/tools/generate-foundation-index.sh
bash specs/knowledge-base/tools/generate-foundation-process-docs.sh
bash specs/knowledge-base/tools/generate-foundation-functional-docs.sh
```

进程生成器必须位于模块索引之后、功能说明之前，这样功能页才能建立“部件 -> 宿主进程 -> SA/实现库”的反向链接。
