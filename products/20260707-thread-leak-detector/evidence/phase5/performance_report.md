# thread_leak_detector 性能增量报告 (P5)

## 方法
真机 rk3568(序列号 7001005458323933328a01fce1fe3800)上,插件以真实默认阈值
(warning 2000 / fault 3000)常态运行、不触发。连续采样 65.1s(覆盖 2+ 个 30s 轮询周期),
读取 hiview 进程 `/proc/<pid>/stat` 的 utime+stime 增量与 `/proc/<pid>/status` 的 VmRSS。

## 实测数据
- 采样窗口: 65.1 s
- hiview 进程 CPU 时间增量: 9 ticks @ CLK_TCK=100 = 0.090 s(utime+stime)
- **常态 CPU 占用: 0.138%**(单核,均摊到 65.1s;为 hiview 进程全量,线程泄漏插件仅其一小部分)
- VmRSS: 35852 KB → 35856 KB(增量 +4 KB,基本持平)
- 单次轮询主要开销: 遍历 `/proc` 枚举 pid + 读取各 `/proc/<pid>/status` 的 Threads 字段 +
  维护 per-process 状态 map,均为内存/procfs 读,无阻塞 IO、无 IPC。

## 结论
常态(无泄漏)下 hiview 全量 CPU 增量 < 0.15% 单核、RSS 持平,对系统性能影响可忽略。
高开销的触发路径(hidumper SA + 文本栈 DumpStacktrace)仅在越过阈值时一次性发生(one-shot 去重),
其正确性由 P4 真机验证,不构成常态开销。
