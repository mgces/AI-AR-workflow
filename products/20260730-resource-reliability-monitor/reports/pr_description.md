## 背景介绍
# 鸿蒙资源维测插件 软件需求规格说明书(SRS)

| 项 | 内容 |
|---|---|
| 文档名称 | 鸿蒙资源维测插件 软件需求规格说明书 |
| 文档版本 | V1.0(DRAFT) |
| 所属模块 | `base/hiviewdfx/hiview` |
| 新增插件 | 资源维测插件(Resource Reliability Monitor Plugin) |
| 落盘根路径 | `/data/log/reliability/` |
| 适用阶段 | 研发测试期 + 现网运维期 |
| 运行形态 | 系统级 native 服务(hiview 插件) |

---

## 1. 引言

### 1.1 目的

本需求描述在 OpenHarmony / 鸿蒙系统的 `base/hiviewdfx/hiview` 框架下,**新增一个资源维测插件**,对设备系统资源进行周期性监控、采集、异常发现与本地落盘,为问题定位、性能调优、现网运维提供基础数据支撑。

### 1.2 范围

- **包含**:
  - CPU / 负载、内存 / ION / Slab、IO / 存储、功耗 / 温控、网络 / 连接性、线程 / 卡顿 / ANR、稳定性事件 七大类的资源维测信息采集。
  - 固定周期轮询、事件触发采集、阈值触发采集 三种触发方式。
  - 采集数据按 hiview 通用做法落盘到 `/data/log/reliability/`。
  - 插件生命周期管理(加载、启动、停止、卸载)。
- **不包含**:
  - 云端汇聚、远程上报、看板可视化(本期纯设备端侧)。
  - 数据上报触发的"异常/定时/手动"中的云端上报路径。
  - 对采集数据的事后深度分析算法(仅提供原始/半结构化数据)。

### 1.3 术语与缩略语

| 术语 | 含义 |
|---|---|
| hiview | 鸿蒙系统级维测框架,承载插件化的日志/事件/维测能力 |
| Plugin | hiview 框架中以动态库或静态注册形式加载的功能单元 |
| Reliability | 可靠性维测域,落盘根路径 `/data/log/reliability/` |
| ANR | Application Not Responding,应用主线程无响应 |
| OOM | Out Of Memory,内存不足杀进程 |
| ION | Linux 内存分配器(鸿蒙沿用),管理大块物理内存 |
| Slab | Linux 内核小对象缓存分配器 |
| hungtask | 任务长时间处于 D 状态(不可中断睡眠)的内核检测机制 |

### 1.4 参考资料

- OpenHarmony hiview 设计文档:`base/hiviewdfx/hiview`
- OpenHarmony 可靠性维测落盘约定:`/data/log/reliability/`
- Linux procfs / sysfs:`/proc/stat`、`/proc/meminfo`、`/proc/pressure/*`、`/sys/class/thermal/*`
-鸿蒙 HiSysEvent 事件规范

---

## 2. 总体描述

### 2.1 产品定位

资源维测插件是 hiview 框架下的一个常驻 native 插件,负责对设备系统资源进行周期性、事件驱动、阈值驱动的多维采集,并将结果按统一约定落盘,供后续本地查询、导出或(后续版本)上报使用。

### 2.2 运行环境

| 项 | 约束 |
|---|---|
| 运行进程 | hiview 系统进程 |
| 运行权限 | system / root 级,可访问 `/proc`、`/sys`、内核接口 |
| 启动时机 | 随 hiview 进程启动加载 |
| 停止时机 | 随 hiview 进程退出,或被插件管理命令显式停止 |
| 存储位置 | `/data/log/reliability/`(插件子目录见 3.4) |
| 存储配额 | 单类数据滚动落盘,总配额可配(默认见 3.5) |

### 2.3 用户与使用场景

| 场景 | 角色 | 描述 |
|---|---|---|
| 研发期问题定位 | 开发/测试 | 通过本地落盘文件,定位 CPU 占用、内存泄漏、IO 卡顿、温升、ANR 等问题 |
| 回归测试 | 测试 | 周期采集数据作为性能回归基线 |
| 现网运维 | 运维/售后 | 设备异常时本地已有维测快照,可导出供售后分析 |

## 3. 功能需求

### 3.1 插件生命周期管理

| 需求 ID | 需求描述 | 优先级 |
|---|---|---|
| FR-LC-01 | 插件须以 hiview 标准插件形式注册,支持随 hiview 启动自动加载 | 高 |
| FR-LC-02 | 支持通过 hiview 插件管理命令查询插件状态(loaded/running/stopped) | 中 |
| FR-LC-03 | 支持通过插件管理命令启动/停止本插件,停止后不再采集与落盘 | 中 |
| FR-LC-04 | 插件异常崩溃时,须由 hiview 框架感知并按策略重启,重启后恢复默认采集配置 | 高 |
| FR-LC-05 | 支持热更新采集配置(周期、阈值、开关项),无需重启 hiview | 中 |

### 3.2 采集能力 —— CPU / 负载

| 需求 ID | 需求描述 | 优先级 |
|---|---|---|
| FR-CPU-01 | 周期采集整机 CPU 使用率(用户/系统/io等待/空闲分项) | 高 |
| FR-CPU-02 | 周期采集 per-process / per-thread CPU 占用 Top N | 高 |
| FR-CPU-03 | 周期采集系统 load(1/5/15min) | 高 |
| FR-CPU-04 | 周期采集 CPU 在线核数、频点、调度策略相关信息 | 中 |
| FR-CPU-05 | 支持 PSI(Pressure Stall Information)cpu 压力采集 | 中 |

### 3.3 采集能力 —— 内存 / ION / Slab

| 需求 ID | 需求描述 | 优先级 |
|---|---|---|
| FR-MEM-01 | 周期采集 `/proc/meminfo` 关键项(MemTotal/Free/Available/Cached/Buffers/Swap 等) | 高 |
| FR-MEM-02 | 周期采集 per-process RSS/PSS/USS Top N | 高 |
| FR-MEM-03 | 周期采集 ION 占用(总/分堆/Top 消费者) | 高 |
| FR-MEM-04 | 周期采集 Slab/Slob 占用(分项 Top) | 中 |
| FR-MEM-05 | 周期采集 PSI memory 压力 | 中 |
| FR-MEM-06 | OOM 事件触发时,采集被杀进程信息、当前内存水位、Top 消费者快照 | 高 |

### 3.4 采集能力 —— IO / 存储

| 需求 ID | 需求描述 | 优先级 |
|---|---|---|
| FR-IO-01 | 周期采集磁盘 IO 吞吐/IOPS/延迟(按设备) | 高 |
| FR-IO-02 | 周期采集存储水位(各分区 used/avail/inode) | 高 |
| FR-IO-03 | 周期采集 per-process IO Top N(读写字节/IO 等待时间) | 中 |
| FR-IO-04 | 存储水位超阈值时,触发一次增强采集(列出大文件 Top) | 中 |

### 3.5 采集能力 —— 功耗 / 温控

| 需求 ID | 需求描述 | 优先级 |
|---|---|---|
| FR-PWR-01 | 周期采集温度(各 thermal zone 当前温度、trip point) | 高 |
| FR-PWR-02 | 周期采集温控策略当前状态(限频/降亮/关核是否生效) | 中 |
| FR-PWR-03 | 周期采集电流电压(若硬件接口可用) | 中 |
| FR-PWR-04 | 温度越过 trip point 时,触发一次温升快照采集 | 高 |

### 3.6 采集能力 —— 网络 / 连接性

| 需求 ID | 需求描述 | 优先级 |
|---|---|---|
| FR-NET-01 | 周期采集网络接口流量(rx/tx 字节/包)、错误包/丢包计数 | 高 |
| FR-NET-02 | 周期采集 TCP 连接数状态分布(ESTABLISHED/TIME_WAIT 等) | 中 |
| FR-NET-03 | 周期采集重传率、RTT 统计(若内核接口可用) | 中 |

### 3.7 采集能力 —— 线程 / 卡顿 / ANR

| 需求 ID | 需求描述 | 优先级 |
|---|---|---|
| FR-THR-01 | 周期采集 per-thread 状态分布(R/D/S/T),标记 D 状态线程 | 高 |
| FR-THR-02 | ANR 事件触发时,采集涉事进程主线程栈、锁等待信息、当前负载/内存现场 | 高 |
| FR-THR-03 | 主线程卡顿(基于帧率/调度延迟)超阈值时,触发一次卡顿快照 | 中

## 设计思路
本 MVP 对应 SRS 的以下 FR,收敛为 9 条需求:

| 需求 ID | 描述 | 对应 SRS FR |
|---|---|---|
| REQ-001 | 插件以 hiview 动态插件注册,`OnLoad` 绑定 WorkLoop 并启动周期采集定时器,`OnUnload` 停止并释放资源;`ReadyToLoad` 返回 true(始终加载) | FR-LC-01 |
| REQ-002 | 周期采集整机 CPU 使用率(用户/系统/io等待/空闲)与系统 load(1/5/15min),**直接解析 `/proc/stat`+`/proc/loadavg`**;周期可配,默认 5s,最小 1s。采集结果供阈值判定,默认不落盘 | FR-CPU-01, FR-CPU-03, FR-TRG-01 |
| REQ-003 | 周期采集内存关键项(MemTotal/Free/Available/Cached/Buffers),**直接解析 `/proc/meminfo`**。供阈值判定,默认不落盘 | FR-MEM-01 |
| REQ-008 | 周期采集设备温度(各 thermal zone 当前温度),**直接读 `/sys/class/thermal/thermal_zone*/temp`**。供阈值判定,默认不落盘 | FR-PWR-01 |
| REQ-009 | 周期采集网络接口流量(rx/tx 字节/包)与 TCP 重传率,**直接解析 `/proc/net/dev`+`/proc/net/snmp`**。供阈值判定,默认不落盘 | FR-NET-01, FR-NET-03 |
| REQ-004 | **阈值触发落盘**:CPU 使用率 > `cpuThresholdPct`、可用内存 < `memAvailThresholdMB`、温度 > `tempThresholdC`、或重传率 > `retransRateThresholdPct` 时,落盘对应类别快照到 `/data/log/reliability/resmon/{cpu,mem,thermal,net}/`,文件名 `resmon_<类别>_<YYYYMMDDHHMMSS>.log`;具备去抖与最小触发间隔(`minTriggerIntervalSec`);CPU/内存/温度/网络分别打印 `AR_RESMON_CPU_OVERLIMIT_OK`/`AR_RESMON_MEM_OVERLIMIT_OK`/`AR_RESMON_TEMP_OVERLIMIT_OK`/`AR_RESMON_NET_OVERLIMIT_OK` | FR-TRG-03, FR-TRG-05, FR-DSK-01, FR-DSK-03, FR-PWR-04 |
| REQ-005 | 从 `/system/etc/hiview/resmon_config.json` 加载配置(周期、类别开关、四类阈值、TopN、配额、最小触发间隔),缺省可用;`OnConfigUpdate` 支持热更,下一周期生效,热更成功打印 marker `AR_RESMON_CONFIG_RELOAD_OK` | FR-CFG-01, FR-CFG-03, FR-LC-05 |
| REQ-006 | 对 `resmon/` 各子目录按文件数+保留时长滚动清理,参数可配,超限自动删除最旧文件 | FR-DSK-04 |
| REQ-007 | 单项采集/判定/落盘失败被捕获并记本地错误计数,不影响其他项,不致插件崩溃 | FR-ERR-01 |

明确不在本契约范围(后续迭代):IO/存储、线程/卡顿/ANR、稳定性事件采集类别;事件触发采集(OOM/panic/ANR 订阅);
温控策略/电流电压;二进制 protobuf 格式与配套解码工具;HiSysEvent 上报;存储水位降级。
明确不依赖:unified_collection(`CpuCollector`/`MemoryCollector`/`ThermalCollector` 等),一律直接读 `/proc`/`/sys`。

## 修改概要
```
base=428e80c18ff172dc857066dd2ec5686044fe6dde

 BUILD.gn                                           |   1 +
 plugins/reliability/resource_monitor/.clang-format |  48 ++++
 plugins/reliability/resource_monitor/BUILD.gn      |  69 ++++++
 .../resource_monitor/config/resmon_config.json     |  15 ++
 .../resource_monitor/include/resmon_collector.h    |  98 ++++++++
 .../resource_monitor/include/resmon_config.h       |  53 ++++
 .../resource_monitor/include/resmon_landing.h      |  37 +++
 .../resource_monitor/include/resmon_threshold.h    |  55 +++++
 .../include/resource_monitor_plugin.h              |  66 +++++
 .../resource_monitor/resmon_collector.cpp          | 274 +++++++++++++++++++++
 .../reliability/resource_monitor/resmon_config.cpp | 116 +++++++++
 .../resource_monitor/resmon_landing.cpp            | 102 ++++++++
 .../resource_monitor/resmon_plugin_config          |   4 +
 .../resource_monitor/resmon_threshold.cpp          |  58 +++++
 .../resource_monitor/resource_monitor_plugin.cpp   | 200 +++++++++++++++
 test/BUILD.gn                                      |   1 +
 test/unittest/resource_monitor/.clang-format       |  48 ++++
 test/unittest/resource_monitor/BUILD.gn            |  41 +++
 .../resource_monitor/resmon_collector_test.cpp     | 164 ++++++++++++
 .../resource_monitor/resmon_config_test.cpp        | 111 +++++++++
 .../resource_monitor/resmon_landing_test.cpp       | 181 ++++++++++++++
 .../resource_monitor/resmon_threshold_test.cpp     | 129 ++++++++++
 .../resource_monitor_plugin_test.cpp               |  44 ++++
 23 files changed, 1915 insertions(+)
```

## 用例概要
- 框架:OHOS gtest,`ohos_unittest`,part=`hiview`。
- 目录:`plugins/reliability/resource_monitor/test/unittest/common/`、`test/BUILD.gn`。
- 套件:`ResmonConfigTest`、`ResmonThresholdTest`、`ResmonLandingTest`、`ResmonCollectorTest`、`ResourceMonitorPluginTest`。
- 采集器单测通过 `Set*Path` 注入**构造的临时 `/proc`/`/sys` 样本文件**,验证解析字段映射与异常隔离,不依赖真机。
- 阈值判定器单测注入构造的各类 Snapshot 与时间,验证四类越限触发与去抖,纯逻辑。
- 落盘单测用临时目录验证文件命名、内容字段、滚动清理。
- 生命周期单测验证 `OnLoad` 绑定循环并注册定时器、`OnUnload` 停止。

## 用例结果总结
- P3 单元测试: PASS — test-develop authorship: contract=ok, required=19 authored=19, new_test_files=7
- P4 真机功能: PASS — exit=0 and success banner in build output (target=hiview_package) artifacts 1/1 present [metric: PASS; clang-tidy: clang-tidy not executed by guard (clang-tidy not found in PATH); CI will still scan]
- P5 质量验证: PASS — tests=19 failures=0 errors=0 fresh=2026-08-03-10-09-54 gtest_cov=19/19
