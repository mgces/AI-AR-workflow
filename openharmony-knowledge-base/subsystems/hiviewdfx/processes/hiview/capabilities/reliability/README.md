# Hiview Reliability 能力域

[返回 Hiview 进程](../../README.md)

## 边界

本能力域承载 Hiview 进程内与故障检测、可靠性诊断、结论生成和故障处置相关的插件能力。

## 当前代码区域

| 能力 | 代码入口 | 状态 |
| --- | --- | --- |
| Fault Logger 插件 | `plugins/faultlogger` | 已有能力 |
| Event Logger | `plugins/eventlogger` | 已有能力 |
| Freeze Detector | `plugins/freeze_detector` | 已有能力 |
| Crash Validator | `plugins/crash_validator` | 已有能力 |
| BBox Detector | `plugins/reliability/bbox_detectors` | 已有能力 |
| Native Leak Detector | `plugins/reliability/leak_detectors` | 已有能力 |
| Thread Leak Detector | `plugins/reliability/thread_leak_detector` | 当前功能分支新增 |

## 功能节点

- [Thread Leak Detector](features/thread-leak-detector/README.md)

后续可以继续增加：

```text
features/native-memory-leak/
features/bbox-detector/
features/freeze-detector/
features/crash-validator/
```

每个功能节点记录自身状态机、数据采集、产物、事件、控制动作、测试和风险。跨功能的公共限流、目录治理或故障策略应写在本能力域，不要复制到每个 feature。
