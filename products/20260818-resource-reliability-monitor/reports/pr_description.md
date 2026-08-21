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
### 2.1 范围内需求(FR 映射)

| REQ | 覆盖的 SRS FR | 需求描述 |
|---|---|---|
| R01 | FR-LC-01 | 以 hiview 标准插件形式注册(PluginFactory),随 hiview 启动自动加载并进入 running |
| R02 | FR-ERR-01/03, FR-LC-04 | 单项采集失败不影响其他项,失败记本地错误计数;插件自身异常经 HiSysEvent/hilog 上报不静默;采集全程防御式解析(越界/缺字段跳过),杜绝插件级崩溃 |
| R03 | FR-CPU-01/02/03 | 周期采集整机 CPU 使用率分项(user/sys/iowait/idle,基于 /proc/stat 两采样差分)、per-process/per-thread CPU Top N(/proc/<pid>/stat utime+stime 差分)、load 1/5/15(/proc/loadavg) |
| R04 | FR-MEM-01/02/03 | 周期采集 /proc/meminfo 关键项;per-process RSS/PSS/USS Top N(/proc/<pid>/smaps_rollup);ION 占用(/sys/kernel/debug/ion 或等价接口,接口缺失时该项跳过并计数,不报错中断) |
| R05 | FR-IO-01/02 | 周期采集磁盘 IO 吞吐/IOPS/延迟(/proc/diskstats 差分,/sys/block/<dev>/stat);存储水位(各挂载分区 statfs: used/avail/inode) |
| R06 | FR-PWR-01 | 周期采集各 thermal zone 当前温度与 trip point(/sys/class/thermal/thermal_zone*/{temp,type,trip_point_*}) |
| R07 | FR-PWR-04 | 温度越过 trip point(或配置阈值)时触发一次温升快照落盘到 pwr/ |
| R08 | FR-NET-01 | 周期采集网络接口 rx/tx 字节/包、错误/丢包计数(/proc/net/dev 两采样差分) |
| R09 | FR-THR-01 | 周期采集 per-thread 状态分布(R/D/S/T 计数),D 状态线程标记并列出(pid/comm) |
| R10 | FR-TRG-01 | 固定周期轮询,周期可配(默认 5s,最小 1s,配置钳制) |
| R11 | FR-TRG-02, FR-STB-01 | 事件触发:插件实现 hiview EventListener(OnUnorderedEvent),订阅配置驱动的 (domain,eventName) 列表;默认订阅稳定性相关事件 |
| R12 | FR-MEM-06 | OOM 类事件到达:立即采集被杀进程信息(事件参数)、当前内存水位、Top 消费者快照,落盘 event/ |
| R13 | FR-THR-02 | ANR 类事件到达:立即采集涉事进程主线程栈(/proc/<pid>/task/<tid>/stack 或 sched 信息按权限尽力)、当前负载/内存现场,落盘 event/ |
| R14 | FR-STB-02/03 | 稳定性事件(panic/watchdog/hungtask)到达:立即落盘综合快照,含事件前最近 N 个周期采样的内存环形缓冲回放(pre-event 现场)+ 涉事进程/线程信息 + 关键资源 Top |
| R15 | FR-TRG-03/04/05 | 阈值触发:cpu 使用率/mem 可用/温度等监控项越阈值触发增强采集;去抖(连续 M 次越限才触发)与最小触发间隔;周期/事件/阈值三机制独立开关 |
| R16 | FR-DSK-01/02/03 | 落盘 /data/log/reliability/resmon/<类别>/;命名 `resmon_<类别>_<YYYYMMDDHHMMSS>.log`(事件快照 `resmon_event_<事件类型>_<YYYYMMDDHHMMSS>.log`);纯文本 key=value 行格式(经批准的 FR-DSK-02 偏差,便于 cat/grep,无解码工具) |
| R17 | FR-DSK-04 | 滚动清理:按每类文件数配额 + 保留时长双维度,周期采集时顺带执行,删旧留新 |
| R18 | FR-CFG-01/02/03 | 配置:本地 JSON 加载、运行时热更新(下一采集周期生效,经 OnConfigUpdate 延迟 reload 模式在 workLoop 序列化执行)、全项默认值(缺省即可工作) |

### 2.2 范围外(跟进项,不进本 AR 契约)

FR-LC-02/03(插件管理命令查询/启停)、FR-CPU-04/05(核数频点/PSI)、FR-MEM-04/05(Slab/PSI memory)、
FR-IO-03/04(per-process IO/大文件 Top)、FR-PWR-02/03(温控策略/电流电压)、FR-NET-02/03(TCP 分布/重传 RTT)、
FR-THR-03(卡顿快照)、FR-DSK-05/06(写限速/存储紧张降频)。

### 2.3 关键设计决策

1. **差分采样**:CPU/NET/IO 均为累计计数器,必须两次采样求差得瞬时值(上一轮 AR 实测教训:单次读数是开机均值,真机上无法触发阈值)。
2. **路径注入**:`/proc`、`/sys` 采集路径全部经配置下发(collector 持有路径串),真机测试用假文件树确定性构造阈值/温控场景;默认路径即真实路径。
3. **延迟配置重载**:沿用 EventValidator 模式——`OnConfigUpdate`(框架配置线程)只置 atomic 脏标记 + mutex 存 pending 路径,真正 Reload 在 workLoop 定时器顶部序列化执行,规避跨线程 shared_ptr/string 竞争(上一轮 AR review 的 B-001 教训)。rk3568 开发机无签名参数包,框架 ParamManager 的 OnConfigUpdate 下发被证书校验(VerifyCertFile)阻塞、不会触发;故插件另以固定周期轮询可写云配置路径 `/data/system/hiview/resmon_config.json` 的 mtime/size 变化作为热更兜底(生产环境走框架推送,开发机走轮询,二者等价收敛到 workLoop 顶部延迟 reload)。
4. **事件快照同步执行**:真机实测确认 hiview 事件通路为 `SysEventSource -> pipeline 规则(未命中走默认 SysEventPipeline)-> SysEventDispatcher -> AddDispatchInfo 匹配插件 OnEventListeningCallback`;`RegisterUnorderedEventListener` 的通路只被 maintenance/export 类事件喂入(真机验证该 build 下真实 sys 事件不经此通路,resmon 是全仓唯一依赖 SYS_EVENT 无序监听的插件)。故事件订阅改用 `AddDispatchInfo` + `OnEventListeningCallback`(回调转发到 EventListener 快照逻辑),回调内直接采集+落盘(不排队),满足「事件后 500ms 内生成快照」验收。
5. **降级**:每个采集项独立 try-防御,文件缺失/解析失败 -> 跳过该项 + errorCount 分类计数,绝不抛出/中断。

## 修改概要
```
(无统计)
```

## 用例概要
- 框架:gtest(ohos_unittest),目标 `ResmonUnitTest`,developer_test part=`hiview`,套件见 contract test_cases。
- 目录:`test/unittest/resource_monitor/`,12 个套件对应 12 个源文件 + BUILD.gn。
- 数据驱动:所有 collector 单测用临时目录伪造 /proc+/sys 文件树(路径注入),两拍数据构造差分与越限;
  Landing/Threshold/RingBuffer 纯逻辑单测;Plugin 级用例验证 tick 编排、单点失败隔离、延迟配置重载。
- P5 执行:`./build.sh --build-target ResmonUnitTest` 后 developer_test
  `--test-target ResmonUnitTest --part hiview --suite ResmonUnitTest`(目标名注意不是 UT 类型)。

## 用例结果总结
- P5 单元测试: PASS — tests=38 failures=0 errors=0 fresh=2026-08-19-13-15-42 gtest_cov=36/36
- P6 端到端功能测试: PASS — nonce=True trigger_window=True marker=True runtime=True e2e=True device_cases=6/6 artifact_hash=True provenance=True artifact_loaded=True side_effect=True negative_control=True uptime 1718531.22->1718712.83 mono=True
- P7 质量验证: PASS — type=UT tests=38 failures=0 errors=0 fresh=2026-08-19-15-05-28 | quality:coverage=evidence/phase7/coverage_report.md; performance=evidence/phase7/performance_report.md; power=evidence/phase7/power_report.md; stability=evidence/phase7/stability_report.md | review:auto_review_issues=0 guard rc=0 metric_findings=0 on 39 file(s) | external_review=not-provided
