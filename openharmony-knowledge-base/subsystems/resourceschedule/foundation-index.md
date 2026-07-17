# resourceschedule：Foundation 部件与模块索引

> 本文件由 `generate-foundation-index.sh` 生成，请勿手工编辑。

[返回子系统节点](README.md) | [功能全景](functional-overview.md)

## 汇总

| 指标 | 数量 |
| --- | ---: |
| 部件 | 10 |
| rk3568 选入部件 | 10 |
| GN 目标 | 639 |
| 生产目标 | 163 |
| 测试目标 | 333 |
| 构建支持目标 | 91 |
| 聚合/代码生成目标 | 52 |

## 部件

| 部件 | rk3568 | Git 子仓 | GN 目标 | 生产 | 测试 | 索引 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| background_task_mgr | yes | foundation/resourceschedule/background_task_mgr | 99 | 22 | 64 | [查看](components/background_task_mgr/foundation-index.md) |
| device_standby | yes | foundation/resourceschedule/device_standby | 53 | 18 | 22 | [查看](components/device_standby/foundation-index.md) |
| device_usage_statistics | yes | foundation/resourceschedule/device_usage_statistics | 64 | 17 | 31 | [查看](components/device_usage_statistics/foundation-index.md) |
| ffrt | yes | foundation/resourceschedule/ffrt | 38 | 3 | 31 | [查看](components/ffrt/foundation-index.md) |
| frame_aware_sched | yes | foundation/resourceschedule/frame_aware_sched | 17 | 5 | 5 | [查看](components/frame_aware_sched/foundation-index.md) |
| memmgr | yes | foundation/resourceschedule/memmgr | 32 | 7 | 23 | [查看](components/memmgr/foundation-index.md) |
| qos_manager | yes | foundation/resourceschedule/qos_manager | 41 | 13 | 22 | [查看](components/qos_manager/foundation-index.md) |
| resource_schedule_service | yes | foundation/resourceschedule/resource_schedule_service | 130 | 42 | 55 | [查看](components/resource_schedule_service/foundation-index.md) |
| soc_perf | yes | foundation/resourceschedule/soc_perf | 53 | 8 | 37 | [查看](components/soc_perf/foundation-index.md) |
| work_scheduler | yes | foundation/resourceschedule/work_scheduler | 112 | 28 | 43 | [查看](components/work_scheduler/foundation-index.md) |

## 全量查询

```bash
awk -F '\t' '$1 == "resourceschedule"' specs/knowledge-base/generated/foundation/modules.tsv
```
