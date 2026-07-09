# AR: 线程泄漏检测插件 (thread leak detector)

在 `base/hiviewdfx/hiview` 下新增一个**线程泄漏检测**插件(归属 `plugins/reliability/leak_detectors`,
新增 `thread_leak` 子检测器,复用现有 fault_detector 状态机框架)。

## 功能需求

1. **周期轮询**:每 30s 轮询检测进程的线程数量情况。

2. **双阈值**:
   - 警告阈值(warning) = **2000**
   - 故障阈值(fault) = **3000**
   - 超过阈值触发一次维测收集。

3. **维测收集内容**(超阈值时收集):
   1. 进程基本信息:进程名、包名、pid、uid、应用前后台信息。
   2. 调用 **hidumper SA** 能力获取进程线程维测(类似 `hidumper -p <pid> --thread`)。
   3. 进程各线程的运行状态,以及各线程在 CPU 上的运行时间。
   4. 通过 `LogCatcherUtils::DumpStacktrace` 抓取当前应用调用栈。

4. **临时日志文件**:不同阈值各保存一份线程泄漏文件到
   `data/log/reliability/resource_leak/thread_leak/tmp` 中。

5. **结论文件 + 上报**:警告和故障两份日志合并生成一份**结论性文件**到
   `data/log/reliability/resource_leak/thread_leak`,并通过 **hisysevent** 上报故障事件。

6. **后台查杀**:若进程在故障阈值之上,且应用在后台,则查杀该应用。

7. **阈值跳变/去重语义**:
   - 只达到警告阈值 → **不**生成结论性文件,**不**生成故障事件(只留 tmp 警告日志)。
   - 阈值多次跳变 → 以**最后一次警告**的日志来合成,前面的警告日志丢弃。
   - 直接达到故障阈值 → 直接用故障阈值生成日志并上报事件。

## 组件信息
- git_dir: `base/hiviewdfx/hiview`
- build_target: `hiview_package`
- part_name / subsystem: `hiview` / `hiviewdfx`
- developer_test part (`-tp`): `hiview`
- product: `rk3568`

## 参考实现(镜像)
- 框架:`plugins/reliability/leak_detectors`(`fault_detector_manager` + `base/` 状态机基类)。
- 子检测器模板:`plugins/reliability/leak_detectors/native_leak`(config/detector/info/state/state_context/util)。
