# AR_design:资源维测插件(Resource Reliability Monitor,插件名 Resmon)

> 源 AR:《鸿蒙资源维测插件 软件需求规格说明书 V1.0》(`$PDIR/ar.md`)。
> 范围决策(用户已确认):实现 SRS 全部「高」优先级 FR + 验收所需的中优先级 FR(FR-TRG-03/04/05、FR-CFG-02);
> 其余「中」优先级记为跟进项。落盘格式采用纯文本(与 FR-DSK-02 的 protobuf 描述存在经用户批准的偏差)。

## 1. 目标组件

| 项 | 值 |
|---|---|
| 源码仓 | `base/hiviewdfx/hiview`(gitcode: openharmony/hiviewdfx_hiview) |
| 插件目录 | `plugins/reliability/resource_monitor/`(与 bbox_detectors/leak_detectors 同级) |
| 单元测试目录 | `test/unittest/resource_monitor/` |
| GN 目标 | `hiview_package` 内新增静态依赖 `$hiview_plugin/reliability/resource_monitor:libresmon` |
| 产物 | `out/rk3568/hiviewdfx/hiview/libresmon.z.so`(部署到设备 `/system/lib/libresmon.z.so`) |
| 运行进程 | hiview 系统进程(插件随进程加载) |
| 落盘根路径 | `/data/log/reliability/resmon/`,子目录 `cpu/ mem/ io/ pwr/ net/ thr/ event/` |
| 配置文件 | 部署态 `/system/etc/hiview/resmon_config.json`;插件注册配置 `resmon_plugin_config` |
| 环境 | openharmony(rk3568 真机,serial 7001005458323933328a01fce1fe3800) |
| base_commit | 428e80c18ff172dc857066dd2ec5686044fe6dde |

依赖(external_deps,继承既有插件惯例):`hilog:libhilog`、`c_utils:utils`(unique_fd 等)、
`hisysevent:libhisysevent`(事件订阅与自身异常上报)。hiview 框架层依赖(base/)以 static 方式链接,不需额外声明。

## 2. 详细功能需求

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

## 3. 完整代码框架

### 3.1 文件清单(每个文件的功能)

| 文件(相对 `plugins/reliability/resource_monitor/`) | 功能 |
|---|---|
| `BUILD.gn` | 定义 `libresmon` ohos_shared_library(ohos_part_name = hiviewdfx),external_deps: hilog/c_utils/hisysevent |
| `resource_monitor_plugin.h/.cpp` | 插件主体:PluginFactory 注册(名 `Resmon`)、ReadyToLoad/OnLoad/OnUnload、EventLoop 定时器(周期 tick)、OnConfigUpdate 延迟重载、tick 编排(依次调 6 collector -> 阈值判定 -> 落盘 -> 滚动清理 -> 环形缓冲 push)、DFX marker 打点 |
| `resmon_types.h` | 公共类型:各类别 Sample 结构、错误计数枚举、Snapshots 聚合 |
| `resmon_collector.h` | 采集器抽象基类(接口:Collect(out Sample),名字,路径注入 SetProcRoot/SetSysRoot) |
| `resmon_cpu_collector.h/.cpp` | R03:ParseProcStat/差分/TopN/LoadAvg |
| `resmon_mem_collector.h/.cpp` | R04:Meminfo/ProcMemTopN(smaps_rollup)/ION 尽力+降级 |
| `resmon_io_collector.h/.cpp` | R05:Diskstats 差分/分区 statfs 水位 |
| `resmon_pwr_collector.h/.cpp` | R06:thermal zone 遍历(type/temp/trip_point) |
| `resmon_net_collector.h/.cpp` | R08:NetDev 解析+差分 |
| `resmon_thr_collector.h/.cpp` | R09:遍历 /proc/<pid>/task/<tid>/stat 状态统计与 D 态列表 |
| `resmon_threshold.h/.cpp` | R15:阈值判定、去抖(M 连续)、最小间隔、独立开关、temp trip 比对(R07) |
| `resmon_ring_buffer.h/.cpp` | R14:最近 N 个周期聚合采样的定长环形缓冲 + DrainContext 导出 |
| `resmon_landing.h/.cpp` | R16/R17:文件命名、追加写、按类别目录落盘、配额+保留时长滚动清理 |
| `resmon_event_listener.h/.cpp` | R11/R12/R13/R14:EventListener 实现,配置驱动 (domain,name) 订阅表;OnUnorderedEvent 按事件类别(OOM/ANR/STABILITY/通用)组装综合快照(含环形缓冲回放)并落盘 event/ |
| `config/resmon_config.json` | 默认配置(周期 5s、各类开关、阈值、TopN、配额、路径) |
| `resmon_plugin_config` | hiview 插件注册配置(pipelines: Resmon;按 bdfr_plugin_config 格式) |
| `.clang-format` | 插件局部格式(4 空格,hiview 风格;仓根无 .clang-format) |
| (根)`BUILD.gn`(组件根,改动) | hiview_package deps 增加 `$hiview_plugin/reliability/resource_monitor:libresmon` |

测试文件(P3 新增,`test/unittest/resource_monitor/`):`BUILD.gn`(ohos_unittest `ResmonUnitTest`,part=hiview)+
12 个 gtest 源文件(见第 4 节)+ 本目录 `.clang-format`(拷贝插件局部格式)。

### 3.2 代码骨架(核心交互)

```cpp
// resource_monitor_plugin.h(骨架)
class ResourceMonitorPlugin : public Plugin {
public:
    bool ReadyToLoad() override;
    bool OnLoad() override;     // 读配置 -> 构建 collectors/threshold/landing -> AddDispatchInfo(事件表)+ RegisterUnorderedEventListener
    void OnUnload() override;
    void OnConfigUpdate(const std::string& local, const std::string& cloud) override; // 只置 dirty+pending 路径
    void OnEventListeningCallback(const Event& msg) override; // SysEventDispatcher 通路:转发 EventListener 快照逻辑
    void Dump(int fd, const std::vector<std::string>& cmds) override;
private:
    void OnTimerTick();         // workLoop:PollCloudConfig() -> exchange(configDirty_) -> ApplyConfig();6 类采集 -> 阈值 -> 落盘 -> 滚动清理 -> ring push
    void PollCloudConfig();     // 轮询可写云配置路径 mtime/size 变化 -> 置 dirty+pending(开发机 OnConfigUpdate 被证书阻塞的兜底)
    void ApplyConfig(const ResmonConfig& cfg);
    ResmonConfig config_;
    std::unique_ptr<ResmonEventListener> listener_;  // 事件快照逻辑(OnUnorderedEvent)
    std::atomic<bool> configDirty_{false};
    std::mutex cfgPathMutex_;   // 保护 pendingCfgPath_
    uint64_t cloudCfgMtime_ = 0; uint64_t cloudCfgSize_ = 0;
};
```

```json
// config/resmon_config.json(骨架,全默认值)
{ "periodSec": 5, "minPeriodSec": 1,
  "trigger": { "periodic": true, "event": true, "threshold": true },
  "thresholds": { "cpuPct": 90.0, "memAvailableMB": 200, "tempTripDeltaC": 0,
                  "debounce": 2, "minIntervalSec": 30 },
  "topN": 10, "quota": { "perCategoryFiles": 10, "retentionHours": 24 },
  "procRoot": "/proc", "sysRoot": "/sys",
  "events": [ {"domain":"AAFWK","name":"THREAD_BLOCK_3S","kind":"ANR"},
              {"domain":"MEM_MGR","name":"KILL_PROCESS","kind":"OOM"},
              {"domain":"STABILITY","name":"HUNGTASK","kind":"STABILITY"} ] }
```

事件表最终以实现期仓内 hisysevent.def 实际域名为准核对(订阅表配置驱动,默认项在 P2 编码时对齐
仓内既有事件定义;真机用例 d4 依赖的 `POWER.SCREEN_ON` 已核实由 power_state_machine.cpp 真实发出)。

## 4. 完整测试框架

- 框架:gtest(ohos_unittest),目标 `ResmonUnitTest`,developer_test part=`hiview`,套件见 contract test_cases。
- 目录:`test/unittest/resource_monitor/`,12 个套件对应 12 个源文件 + BUILD.gn。
- 数据驱动:所有 collector 单测用临时目录伪造 /proc+/sys 文件树(路径注入),两拍数据构造差分与越限;
  Landing/Threshold/RingBuffer 纯逻辑单测;Plugin 级用例验证 tick 编排、单点失败隔离、延迟配置重载。
- P5 执行:`./build.sh --build-target ResmonUnitTest` 后 developer_test
  `--test-target ResmonUnitTest --part hiview --suite ResmonUnitTest`(目标名注意不是 UT 类型)。

## 5. 需测试的功能点

| 功能点 | 套件 | 关键用例 |
|---|---|---|
| 配置默认值/文件加载/坏文件回退 | ResmonConfigTest | LoadDefaults / LoadFromJson / InvalidFileKeepsDefaults |
| CPU 三源解析与差分 | ResmonCpuCollectorTest | ParseProcStat / CpuUsageDelta / ProcCpuTopN / LoadAvg |
| 内存三源+ION 降级 | ResmonMemCollectorTest | ParseMeminfo / ProcMemTopN / IonDegradeWhenAbsent |
| IO 差分+水位 | ResmonIoCollectorTest | ParseDiskstats / PartitionWater |
| thermal zone/trip | ResmonPwrCollectorTest | ThermalZones / TripPoints |
| netdev 差分 | ResmonNetCollectorTest | ParseNetDev / NetDevDelta |
| 线程状态/D 标记 | ResmonThrCollectorTest | ThreadStateDistribution / DStateMarked |
| 阈值/去抖/最小间隔/独立开关 | ResmonThresholdTest | OverThresholdTrigger / DebounceSuppress / MinInterval / IndependentSwitches |
| 环形缓冲滚动与导出 | ResmonRingBufferTest | PushRoll / DrainSnapshotContext |
| 命名/追加写/双维滚动 | ResmonLandingTest | FileNameConvention / AppendWrite / RollingByQuota / RollingByAge |
| 事件到达触发快照与过滤 | ResmonEventListenerTest | OnUnorderedEventTriggersSnapshot / EventNameFiltered / OomSnapshotContent / AnrSnapshotContent / StabilitySnapshotWithRingContext |
| 插件编排/失败隔离/延迟重载 | ResourceMonitorPluginTest | PeriodicTickLands / SingleItemFailureIsolated / DeferredConfigReload |

## 6. 真机测试用例构造(rk3568,沿用上一轮 AR 已验证的构造手法)

部署:`libresmon.z.so` -> `/system/lib/`;`resmon_plugin_config`+`config/resmon_config.json` ->
`/system/etc/hiview/`;把 `Resmon` 加入 `/system/etc/hiview/bundle/plugin_bundle.json` bundle 列表
(不加入则 hiview 不加载);重启 hiview 用 `hdc shell 'kill -9 $(pidof hiview)'`(单引号,$ 在设备端展开)。
假文件树放 `/data/log/hiview/` 下(hiview SELinux 域可读;`/data/local/tmp` 会被拒);采集前 `hilog -p off`
(否则 `%s` 参数被脱敏为 `<private>`,marker 不可见)。

| 用例 | marker | 构造 |
|---|---|---|
| d1 周期采集 | AR_RESMON_PERIODIC_OK | 部署+配置 procRoot/sysRoot 指向假文件树,等 2 个 tick;side_effect `ls /data/log/reliability/resmon/cpu/ \| grep -o resmon_cpu \| head -1` 精确输出 `resmon_cpu`;negative control:tick 前 cpu/ 目录无 resmon 文件 |
| d2 CPU 阈值增强采集 | AR_RESMON_THRESH_CPU_OK | 假 /proc/stat 两拍差分 >90% 连续 debounce 次 -> 快照+marker |
| d3 温度 trip 快照 | AR_RESMON_TEMP_TRIP_OK | 假 thermal_zone temp > trip_point_0 -> pwr/ 快照+marker |
| d4 事件触发综合快照 | AR_RESMON_EVT_SNAPSHOT_OK | 测试配置订阅表含 `POWER.SCREEN_ON`(power_state_machine.cpp 真实发出);插件经 AddDispatchInfo 注册为 sys-event dispatcher,`hdc shell power-shell wakeup` 触发真实事件 -> 默认 SysEventPipeline -> SysEventDispatcher -> 插件 OnEventListeningCallback -> event/ 综合快照(含环形缓冲回放段)+marker |
| d5 滚动清理 | AR_RESMON_ROLLING_OK | 预置配额+3 个旧时间戳文件,等 tick 清理;side_effect `ls .../cpu/ \| grep -c resmon_cpu` 精确输出配额值 |
| d6 配置热更 | AR_RESMON_HOTCFG_OK | 运行中覆写可写云配置 `/data/system/hiview/resmon_config.json` 周期项(开发机无签名参数包、OnConfigUpdate 被证书阻塞,由插件轮询 mtime/size 兜底) -> 下一周期新值生效(落盘节奏变化)+marker |

所有 marker 由插件 HIVIEW_LOGI 打点(component_log),场景脚本把 6 个用例在同一个 hilog 窗口内顺序触发。
d4 的 `power-shell wakeup` 是设备端真实工具、真实 HiSysEvent 总线路径,非仿真。

## 7. DFX设计

**可观测性**:插件统一 tag `Resmon`。周期路径:每个 tick 结束打一行摘要(level=INFO,含各类 sample 关键值);
触发路径:阈值/事件触发时打 `AR_RESMON_*_OK` marker(常量字符串经 `%s` 传参,真机验证需 `hilog -p off`);
错误路径:每类采集失败 HIVIEW_LOGW + `errorCount_[category]` 累计,并在超阈值次数时经
`HiSysEventWrite`(statistic 类事件 `RESMON_SELF_ERROR`)上报自身异常(FR-ERR-03,不静默)。
落盘文件本身即运行时证据:文件名含类别+秒级时间戳,内容 key=value 文本可直接 grep。

**可测试性**:/proc+/sys 路径全量配置注入(单测临时目录 + 真机假文件树同构);阈值去抖/间隔参数化;
事件订阅表配置驱动(真机注入 `POWER.SCREEN_ON` 而不需要内核故障);配置对象整体重建、workLoop 串行应用,
使「热更下一周期生效」可被确定性观测(落盘节奏/阈值行为变化)。

**可维护性**:采集器一类别一文件、统一抽象基类;新类别=新 collector+配置项,不触碰插件主体编排;
常量全部 UPPER_CASE 具名(仓内惯例,CI codecheck 强制);无裸魔法数字;函数按解析/差分/TopN 拆小
(CI 查函数长度与圈复杂度);.h/.cpp 成对、4 空格缩进(插件局部 .clang-format)。

```ar-contract
{
  "contract_version": "2.0",
  "requirements": [
    {"id": "R01", "desc": "FR-LC-01 插件标准注册自动加载"},
    {"id": "R02", "desc": "FR-ERR-01/03 FR-LC-04 单项失败隔离+错误计数+自身异常上报"},
    {"id": "R03", "desc": "FR-CPU-01/02/03 整机CPU分项+进程线程CPU TopN+load"},
    {"id": "R04", "desc": "FR-MEM-01/02/03 meminfo+进程内存TopN+ION尽力降级"},
    {"id": "R05", "desc": "FR-IO-01/02 磁盘IO差分+分区存储水位"},
    {"id": "R06", "desc": "FR-PWR-01 thermal zone 温度与trip采集"},
    {"id": "R07", "desc": "FR-PWR-04 温度越trip触发温升快照"},
    {"id": "R08", "desc": "FR-NET-01 网口流量差分采集"},
    {"id": "R09", "desc": "FR-THR-01 线程状态分布+D态标记"},
    {"id": "R10", "desc": "FR-TRG-01 周期轮询可配默认5s最小1s"},
    {"id": "R11", "desc": "FR-TRG-02 FR-STB-01 EventListener配置驱动订阅"},
    {"id": "R12", "desc": "FR-MEM-06 OOM事件快照"},
    {"id": "R13", "desc": "FR-THR-02 ANR事件快照"},
    {"id": "R14", "desc": "FR-STB-02/03 稳定性事件综合快照+环形缓冲现场回放"},
    {"id": "R15", "desc": "FR-TRG-03/04/05 阈值触发+去抖+最小间隔+独立开关"},
    {"id": "R16", "desc": "FR-DSK-01/02/03 落盘目录/命名/纯文本格式"},
    {"id": "R17", "desc": "FR-DSK-04 配额+保留时长双维滚动清理"},
    {"id": "R18", "desc": "FR-CFG-01/02/03 配置加载/热更下一周期生效/默认值"}
  ],
  "changed_files": [
    {"id": "cf01", "path": "base/hiviewdfx/hiview/BUILD.gn", "for_requirements": ["R01"]},
    {"id": "cf02", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/BUILD.gn", "for_requirements": ["R01"]},
    {"id": "cf03", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resource_monitor_plugin.h", "for_requirements": ["R01", "R02", "R10", "R18"]},
    {"id": "cf04", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resource_monitor_plugin.cpp", "for_requirements": ["R01", "R02", "R10", "R18"]},
    {"id": "cf05", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_types.h", "for_requirements": ["R02"]},
    {"id": "cf06", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_collector.h", "for_requirements": ["R02"]},
    {"id": "cf07", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_cpu_collector.h", "for_requirements": ["R03"]},
    {"id": "cf08", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_cpu_collector.cpp", "for_requirements": ["R03"]},
    {"id": "cf09", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_mem_collector.h", "for_requirements": ["R04"]},
    {"id": "cf10", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_mem_collector.cpp", "for_requirements": ["R04"]},
    {"id": "cf11", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_io_collector.h", "for_requirements": ["R05"]},
    {"id": "cf12", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_io_collector.cpp", "for_requirements": ["R05"]},
    {"id": "cf13", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_pwr_collector.h", "for_requirements": ["R06", "R07"]},
    {"id": "cf14", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_pwr_collector.cpp", "for_requirements": ["R06", "R07"]},
    {"id": "cf15", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_net_collector.h", "for_requirements": ["R08"]},
    {"id": "cf16", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_net_collector.cpp", "for_requirements": ["R08"]},
    {"id": "cf17", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_thr_collector.h", "for_requirements": ["R09"]},
    {"id": "cf18", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_thr_collector.cpp", "for_requirements": ["R09"]},
    {"id": "cf19", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_threshold.h", "for_requirements": ["R07", "R15"]},
    {"id": "cf20", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_threshold.cpp", "for_requirements": ["R07", "R15"]},
    {"id": "cf21", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_ring_buffer.h", "for_requirements": ["R14"]},
    {"id": "cf22", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_ring_buffer.cpp", "for_requirements": ["R14"]},
    {"id": "cf23", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_landing.h", "for_requirements": ["R16", "R17"]},
    {"id": "cf24", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_landing.cpp", "for_requirements": ["R16", "R17"]},
    {"id": "cf25", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_event_listener.h", "for_requirements": ["R11", "R12", "R13", "R14"]},
    {"id": "cf26", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_event_listener.cpp", "for_requirements": ["R11", "R12", "R13", "R14"]},
    {"id": "cf27", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/config/resmon_config.json", "for_requirements": ["R18"]},
    {"id": "cf28", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/resmon_plugin_config", "for_requirements": ["R01"]},
    {"id": "cf29", "path": "base/hiviewdfx/hiview/plugins/reliability/resource_monitor/.clang-format", "for_requirements": ["R02"]}
  ],
  "build_artifacts": [
    {"id": "ba01", "path": "out/rk3568/hiviewdfx/hiview/libresmon.z.so", "for_requirements": ["R01"]}
  ],
  "test_cases": [
    {"id": "t01", "point": "配置默认值完整可工作", "gtest": "ResmonConfigTest.LoadDefaults", "for_requirements": ["R18"]},
    {"id": "t02", "point": "JSON 配置文件加载覆盖默认值", "gtest": "ResmonConfigTest.LoadFromJson", "for_requirements": ["R18"]},
    {"id": "t03", "point": "坏配置文件回退默认值", "gtest": "ResmonConfigTest.InvalidFileKeepsDefaults", "for_requirements": ["R18"]},
    {"id": "t04", "point": "proc/stat 分项解析", "gtest": "ResmonCpuCollectorTest.ParseProcStat", "for_requirements": ["R03"]},
    {"id": "t05", "point": "两拍差分得到整机 CPU 使用率", "gtest": "ResmonCpuCollectorTest.CpuUsageDelta", "for_requirements": ["R03", "R15"]},
    {"id": "t06", "point": "进程 CPU TopN 排序", "gtest": "ResmonCpuCollectorTest.ProcCpuTopN", "for_requirements": ["R03"]},
    {"id": "t07", "point": "loadavg 解析", "gtest": "ResmonCpuCollectorTest.LoadAvg", "for_requirements": ["R03"]},
    {"id": "t08", "point": "meminfo 关键项解析", "gtest": "ResmonMemCollectorTest.ParseMeminfo", "for_requirements": ["R04"]},
    {"id": "t09", "point": "进程 RSS/PSS/USS TopN", "gtest": "ResmonMemCollectorTest.ProcMemTopN", "for_requirements": ["R04"]},
    {"id": "t10", "point": "ION 接口缺失时跳过且计数", "gtest": "ResmonMemCollectorTest.IonDegradeWhenAbsent", "for_requirements": ["R04", "R02"]},
    {"id": "t11", "point": "diskstats 解析与差分", "gtest": "ResmonIoCollectorTest.ParseDiskstats", "for_requirements": ["R05"]},
    {"id": "t12", "point": "分区 used/avail/inode 水位", "gtest": "ResmonIoCollectorTest.PartitionWater", "for_requirements": ["R05"]},
    {"id": "t13", "point": "thermal zone 温度遍历", "gtest": "ResmonPwrCollectorTest.ThermalZones", "for_requirements": ["R06"]},
    {"id": "t14", "point": "trip point 读取与越限判定输入", "gtest": "ResmonPwrCollectorTest.TripPoints", "for_requirements": ["R06", "R07"]},
    {"id": "t15", "point": "netdev 解析", "gtest": "ResmonNetCollectorTest.ParseNetDev", "for_requirements": ["R08"]},
    {"id": "t16", "point": "netdev 两拍差分", "gtest": "ResmonNetCollectorTest.NetDevDelta", "for_requirements": ["R08"]},
    {"id": "t17", "point": "线程状态分布统计", "gtest": "ResmonThrCollectorTest.ThreadStateDistribution", "for_requirements": ["R09"]},
    {"id": "t18", "point": "D 状态线程标记与列表", "gtest": "ResmonThrCollectorTest.DStateMarked", "for_requirements": ["R09"]},
    {"id": "t19", "point": "越阈值触发增强采集判定", "gtest": "ResmonThresholdTest.OverThresholdTrigger", "for_requirements": ["R15"]},
    {"id": "t20", "point": "去抖:M 次连续越限才触发", "gtest": "ResmonThresholdTest.DebounceSuppress", "for_requirements": ["R15"]},
    {"id": "t21", "point": "最小触发间隔限制", "gtest": "ResmonThresholdTest.MinInterval", "for_requirements": ["R15"]},
    {"id": "t22", "point": "三触发机制独立开关", "gtest": "ResmonThresholdTest.IndependentSwitches", "for_requirements": ["R15"]},
    {"id": "t23", "point": "环形缓冲定长滚动", "gtest": "ResmonRingBufferTest.PushRoll", "for_requirements": ["R14"]},
    {"id": "t24", "point": "导出事件前 N 拍现场", "gtest": "ResmonRingBufferTest.DrainSnapshotContext", "for_requirements": ["R14"]},
    {"id": "t25", "point": "落盘文件命名约定", "gtest": "ResmonLandingTest.FileNameConvention", "for_requirements": ["R16"]},
    {"id": "t26", "point": "追加写与目录归类", "gtest": "ResmonLandingTest.AppendWrite", "for_requirements": ["R16"]},
    {"id": "t27", "point": "按配额滚动清理", "gtest": "ResmonLandingTest.RollingByQuota", "for_requirements": ["R17"]},
    {"id": "t28", "point": "按保留时长滚动清理", "gtest": "ResmonLandingTest.RollingByAge", "for_requirements": ["R17"]},
    {"id": "t29", "point": "事件到达触发综合快照落盘", "gtest": "ResmonEventListenerTest.OnUnorderedEventTriggersSnapshot", "for_requirements": ["R11"]},
    {"id": "t30", "point": "订阅表外事件被过滤", "gtest": "ResmonEventListenerTest.EventNameFiltered", "for_requirements": ["R11"]},
    {"id": "t31", "point": "OOM 快照含水位与Top消费者", "gtest": "ResmonEventListenerTest.OomSnapshotContent", "for_requirements": ["R12"]},
    {"id": "t32", "point": "ANR 快照含涉事进程现场", "gtest": "ResmonEventListenerTest.AnrSnapshotContent", "for_requirements": ["R13"]},
    {"id": "t33", "point": "稳定性快照含环形缓冲回放", "gtest": "ResmonEventListenerTest.StabilitySnapshotWithRingContext", "for_requirements": ["R14"]},
    {"id": "t34", "point": "周期tick产生6类落盘", "gtest": "ResourceMonitorPluginTest.PeriodicTickLands", "for_requirements": ["R10", "R16"]},
    {"id": "t35", "point": "单项采集失败不影响其他项", "gtest": "ResourceMonitorPluginTest.SingleItemFailureIsolated", "for_requirements": ["R02"]},
    {"id": "t36", "point": "配置热更延迟到workLoop串行生效", "gtest": "ResourceMonitorPluginTest.DeferredConfigReload", "for_requirements": ["R18"]}
  ],
  "device_cases": [
    {"id": "d1", "desc": "周期采集:2个tick后6类目录均有resmon文件", "marker": "AR_RESMON_PERIODIC_OK",
     "process": "hiview", "artifact_loaded": "/system/lib/libresmon.z.so", "absent_before_trigger": true,
     "side_effect": {"type": "shell_assert", "command": "ls /data/log/reliability/resmon/cpu/ | grep -o resmon_cpu | head -1", "expect": "resmon_cpu"},
     "for_requirements": ["R10", "R16"]},
    {"id": "d2", "desc": "CPU持续越阈值触发增强采集快照", "marker": "AR_RESMON_THRESH_CPU_OK",
     "process": "hiview", "artifact_loaded": "/system/lib/libresmon.z.so", "absent_before_trigger": true,
     "side_effect": {"type": "shell_assert", "command": "ls /data/log/reliability/resmon/cpu/ | grep -o resmon_cpu_enhanced | head -1", "expect": "resmon_cpu_enhanced"},
     "for_requirements": ["R15"]},
    {"id": "d3", "desc": "温度越过trip point触发温升快照", "marker": "AR_RESMON_TEMP_TRIP_OK",
     "process": "hiview", "artifact_loaded": "/system/lib/libresmon.z.so", "absent_before_trigger": true,
     "side_effect": {"type": "shell_assert", "command": "ls /data/log/reliability/resmon/pwr/ | grep -o resmon_pwr_trip | head -1", "expect": "resmon_pwr_trip"},
     "for_requirements": ["R07"]},
    {"id": "d4", "desc": "power-shell wakeup真实POWER.SCREEN_ON事件触发综合快照", "marker": "AR_RESMON_EVT_SNAPSHOT_OK",
     "process": "hiview", "artifact_loaded": "/system/lib/libresmon.z.so", "absent_before_trigger": true,
     "side_effect": {"type": "shell_assert", "command": "ls /data/log/reliability/resmon/event/ | grep -o resmon_event_screen | head -1", "expect": "resmon_event_screen"},
     "for_requirements": ["R11", "R14"]},
    {"id": "d5", "desc": "超出配额后旧文件被滚动清理", "marker": "AR_RESMON_ROLLING_OK",
     "process": "hiview", "artifact_loaded": "/system/lib/libresmon.z.so", "absent_before_trigger": false,
     "side_effect": {"type": "shell_assert", "command": "ls /data/log/reliability/resmon/cpu/ | grep -c resmon_cpu | head -1", "expect": "10"},
     "for_requirements": ["R17"]},
    {"id": "d6", "desc": "运行中修改配置下一周期生效", "marker": "AR_RESMON_HOTCFG_OK",
     "process": "hiview", "artifact_loaded": "/system/lib/libresmon.z.so", "absent_before_trigger": true,
     "for_requirements": ["R18"]}
  ]
}
```
