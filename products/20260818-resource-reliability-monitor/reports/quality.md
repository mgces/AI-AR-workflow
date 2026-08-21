# 质量验证报告

run=20260818-resource-reliability-monitor  target=hiview_package

**✅ PASS** type=UT tests=38 failures=0 errors=0 fresh=2026-08-20-19-44-51 | quality:coverage=evidence/phase7/coverage_report.md; performance=evidence/phase7/performance_report.md; power=evidence/phase7/power_report.md; stability=evidence/phase7/stability_report.md | review:auto_review_issues=0 guard rc=0 metric_findings=0 on 39 file(s) | external_review=not-provided

## 覆盖率报告

```
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

```

## 性能报告

```
# 性能影响报告 - resource_monitor(修复重走轮,2026-08-20)

测量环境:rk3568 真机(4 核,hiview PID 16644,本轮 codecheck 修复后构建),`/proc/<pid>/stat`
utime+stime 采样(CLK_TCK=100),每 10s 一采、每窗口 13 点。

## 1. A/B 对照实测(配置热更开关插件,两窗口背靠背,各 ~130s)

| 窗口 | 配置 | hiview 平均 CPU(单核) | RSS |
|---|---|---|---|
| OFF | 三机制全关(云配置热更) | **0.06%** | 25212-25228 kB |
| ON | 默认配置恢复(periodSec=5,全开) | **4.92%** | 24860-25268 kB |

- **插件增量开销 ~4.9% 单核 ≈ 1.2% 整机**,与修复前一轮(0.05%/4.73%)一致--重构
  (枚举命名/参数收敛/函数拆分/常量化)行为保持,无可测性能回归。
- 每 tick 成本:6.36s CPU / ~26 tick ≈ 0.24s CPU / 5s tick(全 /proc 扫描,277 进程量级)。
- 内存:窗口内 RSS 波动 <410 kB(含采集瞬时对象),无增长趋势。
- 调优:`periodSec` 可配(默认 5s),开销随周期线性缩放。

原始采样:quality_work/ab_cpu_off.txt、ab_cpu_on.txt。

```

## 功耗报告

```
# 功耗影响报告 - resource_monitor(修复重走轮,2026-08-20)

## 1. 测量口径(如实声明)

rk3568 开发板无电池/燃料计(`/sys/class/power_supply/` 为空),无法直接 mAh/mW 计量。
采用 CPU 时间能耗代理口径,辅以机温观测。

## 2. 增量 CPU(能耗代理)

- A/B 实测插件增量:**4.92% 单核**(OFF 0.06% vs ON 4.92%,~130s 窗口)。
- 折合 ~0.049 核时/小时,相对 4 核整机容量 1.2%;与修复前(4.73%)一致。
- **温升**:OFF 窗口 41.9-43.1 °C,ON 窗口 42.5-43.1 °C,无可测差异。

## 3. 唤醒影响(残余风险)

固定 5s 定时器周期性唤醒 CPU(每 tick ~0.24s),影响深睡驻留;本板无 idle 域计数器
可量化。缓解:periodSec 可配热更;事件订阅被动;阈值触发有去抖+最小间隔。

```

## 稳定性报告

```
# 稳定性影响报告 - resource_monitor(修复重走轮,2026-08-20)

观测窗口:2026-08-20 19:34-19:43(P6 门控 + A/B 采样,含两轮配置热切换)。

## 1. 进程与崩溃

- hiview PID 16644 全程不变(P6 部署重启后持续存活);`/data/log/faultlog/` 计数
  5/6 与基线一致:**零新增崩溃/冻结日志**。
- hilog 扫描 resmon 相关 error/fatal/fail:**0 条真实命中**(仅 HDC 命令回显自匹配)。

## 2. 资源有界性

- 磁盘:resmon 文件总数稳定 52(A/B OFF/ON 窗口前后均 52->52),配额滚动持续生效;
- 内存:A/B 两窗口 RSS 24860-25268 kB,无增长趋势;环形缓冲定长 12 拍。

## 3. 配置热切换健壮性

本轮经 P6 场景(激进配置->默认恢复->删除)与 A/B(关->开)共四次热切换,
hiview 无重启、无异常日志,落盘行为正确跟随(停止/恢复/按配额滚动)。

## 4. 测试重复执行

本轮修复后 UT 重跑两轮(P5 门控 38/38 + 前置验证 38/38),无 flaky。
结论:零崩溃、零错误日志、磁盘/内存有界,稳定性无回归证据。

```

## 代码 review 报告

```
review_issue_count=0
changed C/C++ (39):
plugins/reliability/resource_monitor/resmon_collector.h
plugins/reliability/resource_monitor/resmon_config.cpp
plugins/reliability/resource_monitor/resmon_config.h
plugins/reliability/resource_monitor/resmon_cpu_collector.cpp
plugins/reliability/resource_monitor/resmon_cpu_collector.h
plugins/reliability/resource_monitor/resmon_event_listener.cpp
plugins/reliability/resource_monitor/resmon_event_listener.h
plugins/reliability/resource_monitor/resmon_io_collector.cpp
plugins/reliability/resource_monitor/resmon_io_collector.h
plugins/reliability/resource_monitor/resmon_landing.cpp
plugins/reliability/resource_monitor/resmon_landing.h
plugins/reliability/resource_monitor/resmon_mem_collector.cpp
plugins/reliability/resource_monitor/resmon_mem_collector.h
plugins/reliability/resource_monitor/resmon_net_collector.cpp
plugins/reliability/resource_monitor/resmon_net_collector.h
plugins/reliability/resource_monitor/resmon_pwr_collector.cpp
plugins/reliability/resource_monitor/resmon_pwr_collector.h
plugins/reliability/resource_monitor/resmon_ring_buffer.cpp
plugins/reliability/resource_monitor/resmon_ring_buffer.h
plugins/reliability/resource_monitor/resmon_thr_collector.cpp
plugins/reliability/resource_monitor/resmon_thr_collector.h
plugins/reliability/resource_monitor/resmon_threshold.cpp
plugins/reliability/resource_monitor/resmon_threshold.h
plugins/reliability/resource_monitor/resmon_types.h
plugins/reliability/resource_monitor/resource_monitor_plugin.cpp
plugins/reliability/resource_monitor/resource_monitor_plugin.h
plugins/reliability/resource_monitor/test/unittest/common/resmon_config_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resmon_cpu_collector_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resmon_event_listener_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resmon_io_collector_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resmon_landing_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resmon_mem_collector_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resmon_net_collector_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resmon_pwr_collector_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resmon_ring_buffer_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resmon_test_util.h
plugins/reliability/resource_monitor/test/unittest/common/resmon_thr_collector_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resmon_threshold_test.cpp
plugins/reliability/resource_monitor/test/unittest/common/resource_monitor_plugin_test.cpp

--- code_ruleset_guard (format+rules) ---
rc=0
code_ruleset PASS: 39 file(s), 93 regex rule(s) + 307 sensitive word(s) + 26 clang-format checked


```
