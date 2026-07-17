# Hiview 进程

[返回 HiviewDFX](../../README.md)

## 运行身份

| 属性 | 当前值 |
| --- | --- |
| executable | `/system/bin/hiview` |
| init service | `hiview` |
| start mode | boot |
| uid | `hiview` |
| SELinux domain | `u:r:hiview:s0` |
| component | `hiviewdfx:hiview` |
| config | `base/hiviewdfx/hiview/service/config/hiview.cfg` |

进程持有 `hisysevent` 和 `hisysevent_fast` Unix datagram socket，并具备读取进程、采集日志、抓栈、管理部分系统资源所需的权限和 capabilities。

## 代码结构

| 目录 | 职责 |
| --- | --- |
| [adapter](../../../../../../base/hiviewdfx/hiview/adapter) | 系统服务适配 |
| [base](../../../../../../base/hiviewdfx/hiview/base) | 插件、事件和工具基础类型 |
| [core](../../../../../../base/hiviewdfx/hiview/core) | 插件加载、事件循环和运行核心 |
| [service](../../../../../../base/hiviewdfx/hiview/service) | 进程入口和 init 配置 |
| [plugins](../../../../../../base/hiviewdfx/hiview/plugins) | 事件、故障、可靠性、性能等业务插件 |
| [framework](../../../../../../base/hiviewdfx/hiview/framework) | 统一采集等框架实现 |
| [interfaces](../../../../../../base/hiviewdfx/hiview/interfaces) | Inner API、NAPI、ANI 等接口 |
| [hiretrieval](../../../../../../base/hiviewdfx/hiview/hiretrieval) | 维测检索能力 |

## 插件能力树

```text
hiview process
├── event-processing
│   ├── sysevent_source
│   ├── event_validator
│   ├── privacy_controller
│   ├── sys_dispatcher
│   └── event_store / event_export
├── reliability
│   ├── faultlogger
│   ├── eventlogger
│   ├── freeze_detector
│   ├── crash_validator
│   ├── bbox_detectors
│   ├── native leak detectors
│   └── thread leak detector
├── performance
│   ├── unified_collector
│   ├── performance monitor
│   ├── perfmonitor
│   └── xperf service integration
└── reporting
    └── usage_event_report
```

## 能力域目录

- [reliability](capabilities/reliability/README.md)

后续应继续创建：

```text
capabilities/event-processing/
capabilities/performance/
capabilities/reporting/
```

每个能力域只列稳定能力分类；具体插件继续下沉到 `features/`。

## 构建与装载

生产组件入口：

```text
//base/hiviewdfx/hiview:hiview_package
```

插件可以静态编入插件共享库，也可以由配置和动态库管理机制装载。分析单个插件时必须同时确认：

1. 插件源代码目标。
2. 插件共享库依赖。
3. plugin config 注册。
4. 产品 feature 是否启用。
5. init/SELinux/文件目录是否满足运行要求。
