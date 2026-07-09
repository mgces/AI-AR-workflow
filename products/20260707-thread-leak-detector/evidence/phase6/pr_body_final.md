**IssueNo**: #3494

## 功能描述

在 `base/hiviewdfx/hiview/plugins/reliability/` 下新增**线程泄漏检测插件** `thread_leak_detector`,以静态插件形式编入 `bdfr` 可靠性库,由 hiview 加载。

- **周期轮询**:插件 `OnLoad` 时启动 ffrt 循环,每 **30s** 遍历 `/proc` 统计各进程线程数(`/proc/<pid>/status` 的 `Threads:`)。
- **双阈值**:警告 `warning=2000` / 故障 `fault=3000`(默认值,可经 `persist.hiviewdfx.threadleak.*` 系统参数覆写);超过阈值触发一次维测收集。
- **四项维测收集**:
  1. 进程基本信息 —— 进程名、包名、pid、uid、应用前后台状态(经 `AppMgrClient::GetRunningProcessInfoByPid`);
  2. 调用 **hidumper SA**(`IDumpBroker::Request`,等价 `hidumper -p <pid> --thread`)获取进程线程维测汇总;
  3. 各线程运行状态 + 每线程 CPU 运行时间(`/proc/<pid>/task/*/stat` + `ThreadCpuCollector`);
  4. `LogCatcherUtils::DumpStacktrace` 抓取应用**文本**调用栈。
- **日志与上报**:
  - 临时日志按阈值分别落 `data/log/reliability/resource_leak/thread_leak/tmp/`;
  - 警告 + 故障两份合并生成**结论文件**落 `data/log/reliability/resource_leak/thread_leak/`,并经 **hisysevent** 上报 `RELIABILITY / THREAD_LEAK` 故障事件。
- **后台查杀**:进程在故障阈值之上且应用处于后台时,`KillApplication` 查杀该应用。
- **阈值跳变语义**:仅达警告阈值 → 不生成结论、不上报;多次跳变 → 以**最后一次**警告日志合成、丢弃之前;直达故障阈值 → 直接用故障日志生成并上报;故障态一次性去重(`触发一次`)。

主要文件:`thread_leak_plugin.*`(插件与 30s 轮询)、`thread_leak_detector.*`(状态机:警告/故障/合并/去重/查杀)、`thread_leak_collector.*`(四项维测)、`thread_leak_config.*`(阈值)、`thread_leak_util.*`(/proc 解析、日志路径);并在 `hisysevent.yaml` 声明 `THREAD_LEAK` 事件、`bdfr_plugin_config` 注册插件、`plugin_build/BUILD.gn` 接入 `bdfr` 库。

## 测试用例

**单元测试** `ThreadLeakDetectorUnitTest`(真机 9/9 通过):
- `ThreadLeakConfigClassify001/002` —— 真实阈值 2000/3000 分级 + 参数覆写;
- `ThreadLeakDecideNormal/Warning/Fault001/Fault002/FaultOnce001` —— 状态机决策全分支:回落忘记、警告收集不结论、直达故障、警告→故障合并、故障一次性去重;
- `ThreadLeakUtilProc001` —— `/proc` 线程数与运行态解析(含无效 pid);
- `ThreadLeakUtilNaming001` —— 进程名净化与日志路径组装。

**模块测试** `ThreadLeakDetectorModuleTest`(Level2,真机):以**真实阈值 2000/3000**,fork 外部子进程作为 victim,分阶段生长(2100 → 3100 线程),驱动检测器走完 warning→fault 合并路径,断言:警告态不生成结论、故障态生成含 WARNING+FAULT 两段且四项维测齐全的合并结论。仓内附真实阈值样例日志 `test/moduletest/sample_thread_leak_conclusion.txt`。

## 端到端测试结果(真机 rk3568)

真机部署 `libbdfr.z.so` 后,插件在 hiview 进程内加载并 30s 轮询,对 victim 进程实测走通全链路:

```
ThreadLeakDetectorPlugin OnLoad → poll loop start, interval=30s
HandleWarning: pid=<victim> threads=2101 level=WARNING           # 落警告 tmp 日志,不结论
HandleFault:   pid=<victim> threads=3101 level=FAULT             # 越故障阈值
HandleFault:   THREAD_LEAK_CONCLUSION_GENERATED path=.../thread_leak_<name>_<pid>_3.txt
ReportThreadLeakEvent: report THREAD_LEAK event pid=<victim> ret=0
DailyController: event ... domain=RELIABILITY, name=THREAD_LEAK  # hisysevent 入库
```

真实阈值下生成的结论文件(~1.1MB,4413 条线程栈)四项维测均真实采集:
- **[1] 进程基本信息**:processName / pid / uid / 前后台;
- **[2] hidumper 线程维测**:`Thread num: 2101`(警告段)/ `Thread num: 3101`(故障段) + Top thread names;
- **[3] 逐线程运行态 + CPU 时间**:`tid / state / cpuUsage / cpuLoad / name` 全量;
- **[4] 应用调用栈**:`Tid: / #00 pc ... /system/lib/...` 文本栈,逐线程。

合并验证:结论文件含 `WARNING SNAPSHOT`(2101)在前、`FAULT SNAPSHOT`(3101)在后,证明 warning→fault 合并生效。

**质量测试(真机)**:
- 性能:hiview 常态(无泄漏)CPU 增量 **0.138%** 单核,RSS 持平;
- 功耗:CPU 代理 0.138%,ffrt 复用既有工作线程,无新增 wakelock,30s 间隔低唤醒;
- 稳定性:软老化 4+ 轮询周期,hiview 无崩溃/重启,一次性去重仅生成 1 份结论,RSS 稳定;
- 代码 review:格式 guard + 硬规则 + IPC/权限/并发/隐私安全审查,问题清零。
