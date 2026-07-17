# work_scheduler 功能说明

> 本文从当前源码、`bundle.json` 和静态 GN 目标生成，解释部件职责和能力边界；完整构建事实见 [模块索引](foundation-index.md)。

[返回部件](README.md) | [返回子系统功能全景](../../functional-overview.md)

## 功能定位

在资源调度子系统中，延迟任务调度部件给应用提供一个可以执行实时性不高的任务的机制。当满足设定条件时，会被放入可执行队列，系统根据设备情况，延迟触发可执行队列内的任务。 接口名\|接口描述\|类型 ---------------------------------------------------------\|-----------------------------------------\|--------------------------------------------------------- workId \| 延迟任务Id（必填）\|number bundleName \| 延迟任务包名（必填）\|string abilityName \| 延迟任务回调通知的组件名（必填）\|string networkType \| 网络条件 \| NetworkType isCharging \| 是否充电 \| bool chargerType \| 充电类型 \| ChargingType batteryLevel \| 电量\| number batteryStatus\| 电池状态\| BatteryStatus storageRequest\|存储状态\| StorageRequest isRepeat\|是否循环任务\| boolean repeatCycleTime \|循环间隔\| number repeatCount \|循环次数\| number parameters \|携带参数信息\| {[key: string]: any}

| 属性 | 说明 |
| --- | --- |
| 所属子系统 | `resourceschedule` |
| 实现形态 | 服务/运行实体 + 系统内部接口 + 框架或基础库 + 聚合/代码生成 |
| 适配系统 | standard |
| rk3568 | 已选入 |
| ROM/RAM 声明 | 2048KB / 10240KB |
| 源码仓 | `foundation/resourceschedule/work_scheduler` |

## 核心能力

- **Resource Schedule Work Scheduler**：提供“re媒体源 schedule work scheduler”能力，系统能力标识为 `SystemCapability.ResourceSchedule.WorkScheduler`。

## 产品功能开关

这些开关决定具体能力是否进入产品构建或采用何种实现路径：

- `work_scheduler_device_enable`：work scheduler device 启用。

## 源码职责区

| 目录 | 职责 | 静态目标 | 主要子目录 |
| --- | --- | ---: | --- |
| [foundation/resourceschedule/work_scheduler/interfaces](../../../../../../foundation/resourceschedule/work_scheduler/interfaces) | 对外或子系统内部接口定义，包括 Kit、Inner Kit、IDL、C/C++/ArkTS 等语言接口。 | 32 | `kits` |
| [foundation/resourceschedule/work_scheduler/frameworks](../../../../../../foundation/resourceschedule/work_scheduler/frameworks) | 客户端框架、公共运行库以及面向上层的能力封装。 | 13 | `extension`, `include`, `src` |
| [foundation/resourceschedule/work_scheduler/services](../../../../../../foundation/resourceschedule/work_scheduler/services) | 服务端核心实现、状态管理、调度逻辑和 IPC Stub。 | 12 | `native`, `plugin`, `zidl` |
| [foundation/resourceschedule/work_scheduler/utils](../../../../../../foundation/resourceschedule/work_scheduler/utils) | 跨模块复用的基础工具和通用数据结构。 | 2 | `native` |
| [foundation/resourceschedule/work_scheduler/sa_profile](../../../../../../foundation/resourceschedule/work_scheduler/sa_profile) | System Ability 注册信息及进程装载配置。 | 1 | - |

## 对外与内部接口

该部件声明 2 个 Inner Kit。下表给出调用方可依赖的接口目标及头文件范围：

| Inner Kit | 头文件根目录 | 代表性头文件 |
| --- | --- | --- |
| `//foundation/resourceschedule/work_scheduler/frameworks:workschedclient` | `//foundation/resourceschedule/work_scheduler/frameworks/include` | `work_condition.h`, `work_info.h`, `workscheduler_srv_client.h` |
| `//foundation/resourceschedule/work_scheduler/interfaces/kits/cj:cj_work_scheduler_ffi` | `//foundation/resourceschedule/work_scheduler/interfaces/kits/cj/work_scheduler` | - |

## 运行实体与交付形态

### 进程归属

下表来自 init 配置和 SA profile，表示该部件由哪些真实进程启动或装载：

| 宿主子系统 | 进程 | 部件角色 | SA ID | 实现库 |
| --- | --- | --- | --- | --- |
| `resourceschedule` | [resource_schedule_service](../../processes/resource_schedule_service/foundation-runtime.md) | SA 实现 | `1904` | `libworkschedservice.z.so` |

同一部件可能向多个进程提供 SA；同一进程也可能装载多个部件的能力。

### 构建交付形态

以下生产目标具有可执行程序、服务、System Ability profile 或应用形态，是分析运行时行为的优先入口：

| 类型 | 目标 | 源码位置 |
| --- | --- | --- |
| `ohos_sa_profile` | `//foundation/resourceschedule/work_scheduler/sa_profile:worksched_sa_profile` | [foundation/resourceschedule/work_scheduler/sa_profile/BUILD.gn](../../../../../../foundation/resourceschedule/work_scheduler/sa_profile/BUILD.gn) |

生产库形态：`ohos_shared_library` 9 个，`ohos_source_set` 5 个，`taihe_shared_library` 2 个，`ohos_static_library` 1 个。

## 依赖与协作边界

该部件声明 33 个组件依赖和 0 个三方依赖。

- 系统组件协作：`thermal_manager`, `bundle_framework`, `safwk`, `os_account`, `common_event_service`, `ipc`, `c_utils`, `ability_runtime`, `hilog`, `samgr`, `hisysevent`, `napi`, `battery_manager`, `ability_base`, `eventhandler`, `ffrt`, `background_task_mgr`, `device_standby`, `device_usage_statistics`, `access_token`, `netmanager_base`, `time_service`, `init`, `data_share`, `config_policy`, `hiview`, `hicollie`, `hitrace`, `power_manager`, `resource_schedule_service`, `runtime_core`, `ets_frontend`, `taihe_ffi_gen`。
- 这些是部件级声明依赖；运行时 IPC、动态加载和 GN 私有依赖仍需结合具体服务与目标分析。

## 测试与验证边界

当前静态索引识别 43 个测试目标，bundle 声明 1 个测试入口。

主要测试形态：`group` 21 个，`ohos_fuzztest` 16 个，`ohos_unittest` 4 个，`ohos_systemtest` 1 个，`ohos_js_unittest` 1 个。

验证该部件时应至少覆盖：公共接口兼容性、生产目标编译、声明测试入口，以及运行实体存在时的启动、IPC、权限和异常恢复。

## 继续深入

- 构建目标、文件与行号：[Foundation 完整模块索引](foundation-index.md)
- 组件声明：[foundation/resourceschedule/work_scheduler/bundle.json](../../../../../../foundation/resourceschedule/work_scheduler/bundle.json)
- 原始源码 README：[foundation/resourceschedule/work_scheduler/README_ZH.md](../../../../../../foundation/resourceschedule/work_scheduler/README_ZH.md)、[foundation/resourceschedule/work_scheduler/README.md](../../../../../../foundation/resourceschedule/work_scheduler/README.md)
- 后续人工细化应继续拆到 `capabilities/<domain>/features/<feature>/`，并补充调用链、状态机、安全边界和真机证据。
