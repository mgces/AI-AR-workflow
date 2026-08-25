# 覆盖率报告 - resource_monitor(AR: 20260818-resource-reliability-monitor,修复重走轮)

- 测试执行: developer_test `run -t UT -tp hiview -ts <12 契约套件> -p rk3568`(真机 rk3568,
  报告目录 `2026-08-20-10-18-52`,starttime=2026-08-20 10:18:52 endtime=2026-08-20 10:18:56)
- 结果: **tests=38 failures=0 errors=0**
- 本轮为 codecheck 修复(enum 命名/函数拆分/常量化,行为保持)后的重走验证。
- 测量口径: 构建未开 gcov 插桩,口径为**契约测试点执行覆盖**(ar-contract 每个 gtest 本轮真实执行并通过),非行覆盖率。

## 1. 契约测试点执行覆盖

- 声明测试点 36,本轮真实执行且通过 **36,覆盖 100.0%**

## 2. 按需求(R01-R18)的测试覆盖

| 需求 | 描述 | 测试点(全部通过) |
|---|---|---|
| R01 | FR-LC-01 插件标准注册自动加载 | 无直接测试点 |
| R02 | FR-ERR-01/03 FR-LC-04 单项失败隔离+错误计数+自身异常上报 | IonDegradeWhenAbsent; SingleItemFailureIsolated |
| R03 | FR-CPU-01/02/03 整机CPU分项+进程线程CPU TopN+load | ParseProcStat; CpuUsageDelta; ProcCpuTopN; LoadAvg |
| R04 | FR-MEM-01/02/03 meminfo+进程内存TopN+ION尽力降级 | ParseMeminfo; ProcMemTopN; IonDegradeWhenAbsent |
| R05 | FR-IO-01/02 磁盘IO差分+分区存储水位 | ParseDiskstats; PartitionWater |
| R06 | FR-PWR-01 thermal zone 温度与trip采集 | ThermalZones; TripPoints |
| R07 | FR-PWR-04 温度越trip触发温升快照 | TripPoints |
| R08 | FR-NET-01 网口流量差分采集 | ParseNetDev; NetDevDelta |
| R09 | FR-THR-01 线程状态分布+D态标记 | ThreadStateDistribution; DStateMarked |
| R10 | FR-TRG-01 周期轮询可配默认5s最小1s | PeriodicTickLands |
| R11 | FR-TRG-02 FR-STB-01 EventListener配置驱动订阅 | OnUnorderedEventTriggersSnapshot; EventNameFiltered |
| R12 | FR-MEM-06 OOM事件快照 | OomSnapshotContent |
| R13 | FR-THR-02 ANR事件快照 | AnrSnapshotContent |
| R14 | FR-STB-02/03 稳定性事件综合快照+环形缓冲现场回放 | PushRoll; DrainSnapshotContext; StabilitySnapshotWithRingContext |
| R15 | FR-TRG-03/04/05 阈值触发+去抖+最小间隔+独立开关 | CpuUsageDelta; OverThresholdTrigger; DebounceSuppress; MinInterval; IndependentSwitches |
| R16 | FR-DSK-01/02/03 落盘目录/命名/纯文本格式 | FileNameConvention; AppendWrite; PeriodicTickLands |
| R17 | FR-DSK-04 配额+保留时长双维滚动清理 | RollingByQuota; RollingByAge |
| R18 | FR-CFG-01/02/03 配置加载/热更下一周期生效/默认值 | LoadDefaults; LoadFromJson; InvalidFileKeepsDefaults; DeferredConfigReload |

## 3. 每套件实测(本轮 result XML)

| 套件 | 用例数 | 实测总耗时 |
|---|---|---|
| ResmonConfigTest | 3 | 0.001s |
| ResmonCpuCollectorTest | 4 | 0.007s |
| ResmonEventListenerTest | 5 | 0.009s |
| ResmonIoCollectorTest | 2 | 0.001s |
| ResmonLandingTest | 4 | 0.009s |
| ResmonMemCollectorTest | 3 | 0.005s |
| ResmonNetCollectorTest | 2 | 0.002s |
| ResmonPwrCollectorTest | 2 | 0.005s |
| ResmonRingBufferTest | 2 | 0.000s |
| ResmonThrCollectorTest | 2 | 0.007s |
| ResmonThresholdTest | 4 | 0.000s |
| ResourceMonitorPluginTest | 5 | 0.040s |
