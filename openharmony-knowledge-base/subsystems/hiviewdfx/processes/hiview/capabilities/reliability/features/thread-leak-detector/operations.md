# 构建、测试与真机运维

[返回功能设计](README.md) | [返回 Reliability 能力域](../../README.md)

## 环境基线

| 属性 | 当前验证环境 |
| --- | --- |
| 源码根目录 | `/home/mgces/openharmony/code` |
| 产品 | `rk3568` |
| 组件 | `hiview` / `hiviewdfx` |
| 生产目标 | `hiview_package` |
| UT 目标 | `ThreadLeakDetectorUnitTest` |
| 模块测试目标 | `ThreadLeakDetectorModuleTest` |
| 真机 | rk3568，证据中使用单台 USB 设备 |

执行以下命令前应位于源码根目录：

```bash
cd /home/mgces/openharmony/code
```

## 构建

### 生产组件

```bash
./build.sh --product-name rk3568 --ccache --build-target hiview_package
```

关键产物：

```text
out/rk3568/hiviewdfx/hiview/libbdfr.z.so
```

该共享库包含 `ThreadLeakDetectorPlugin`，不能只检查独立 object 是否生成；应确认 `libbdfr.z.so` 的时间戳和哈希对应当前提交。

### 单元测试

```bash
./build.sh --product-name rk3568 --ccache --build-target ThreadLeakDetectorUnitTest
```

产物：

```text
out/rk3568/tests/unittest/hiview/hiview/thread_leak_detector/ThreadLeakDetectorUnitTest
```

### 模块测试

```bash
./build.sh --product-name rk3568 --ccache --build-target ThreadLeakDetectorModuleTest
```

产物：

```text
out/rk3568/tests/moduletest/hiview/hiview/thread_leak_detector/ThreadLeakDetectorModuleTest
```

模块测试会创建约 3100 个线程并执行大规模 hidumper/栈抓取，必须确认设备线程上限、内存和测试超时。它不适合作为每次快速回归的默认目标。

## developer_test 执行

### UT

```bash
cd test/testfwk/developer_test
./start.sh run -t UT -tp hiview -ts ThreadLeakDetectorUnitTest -p rk3568
```

当前正式证据：9 tests，0 failures，0 errors。

### 模块测试

```bash
cd test/testfwk/developer_test
./start.sh run -t MST -tp hiview -ts ThreadLeakDetectorModuleTest -p rk3568
```

建议为该测试单独预留设备，并在执行前确认没有遗留的高线程 victim。若测试被中断，应先确认子进程是否仍存活，再继续其他稳定性测试。

当前证据边界：模块测试二进制已构建，流水线历史记录和真实阈值结论产物显示曾执行真实 2000/3000 场景；但最终 phase gate 汇总主要正式记录 UT 和自定义真机场景，没有保存一份独立的 MST `summary_report.xml`。后续应补齐正式 MST 报告。

## 真机目标选择

任何修改设备状态的命令都应显式指定目标：

```bash
hdc list targets -v
hdc -t <connect-key> shell echo ok
```

存在多设备、离线设备或旧 TCP target 时，不应省略 `-t <connect-key>`。

## 运行时参数

读取当前值：

```bash
hdc -t <connect-key> shell param get persist.hiviewdfx.threadleak.warn
hdc -t <connect-key> shell param get persist.hiviewdfx.threadleak.fault
hdc -t <connect-key> shell param get persist.hiviewdfx.threadleak.focuspid
```

测试调参示例：

```bash
hdc -t <connect-key> shell param set persist.hiviewdfx.threadleak.warn 50
hdc -t <connect-key> shell param set persist.hiviewdfx.threadleak.fault 100
hdc -t <connect-key> shell param set persist.hiviewdfx.threadleak.focuspid <victim-pid>
```

测试后恢复：

```bash
hdc -t <connect-key> shell param set persist.hiviewdfx.threadleak.warn 2000
hdc -t <connect-key> shell param set persist.hiviewdfx.threadleak.fault 3000
hdc -t <connect-key> shell param set persist.hiviewdfx.threadleak.focuspid 0
```

这些是 `persist.*` 参数，会跨重启保留。调低阈值而忘记恢复，可能使 Hiview 对正常进程执行重型采集，甚至触发后台应用查杀。

## 日志与产物检查

### 关键 hilog 标记

```text
ThreadLeakDetectorPlugin OnLoad
thread leak poll loop start, interval=30s
THREAD_LEAK_COLLECT_TRIGGERED
THREAD_LEAK_CONCLUSION_GENERATED
report THREAD_LEAK event pid=<pid> ret=<ret>
kill background app bundle=<bundle> pid=<pid> ret=<ret>
```

实时过滤：

```bash
hdc -t <connect-key> hilog | grep -E 'ThreadLeakDetector|THREAD_LEAK'
```

若需留存证据，先启动定向日志捕获，再复现场景，结束后保存完整时间窗。不要只截取成功标记；同时保留插件加载、victim PID、参数值和错误日志。

### 设备文件

```bash
hdc -t <connect-key> shell ls -l /data/log/reliability/resource_leak/thread_leak
hdc -t <connect-key> shell ls -l /data/log/reliability/resource_leak/thread_leak/tmp
```

结论文件应满足：

- WARNING -> FAULT：先出现 `WARNING SNAPSHOT`，后出现 `FAULT SNAPSHOT`。
- 直接 FAULT：只要求 `FAULT SNAPSHOT`。
- 四个维护章节均存在。
- HiSysEvent 的 `LOG_PATH` 应指向实际存在的结论文件。

拉取单个结论前先确认大小：

```bash
hdc -t <connect-key> shell ls -l <remote-conclusion-path>
hdc -t <connect-key> file recv <remote-conclusion-path> <local-output-dir>
```

不要直接拉取整个 `/data/log`。

## 部署说明

当前 rk3568 证据将 host 产物部署为：

```text
host:   out/rk3568/hiviewdfx/hiview/libbdfr.z.so
device: /system/lib/libbdfr.z.so
```

系统库替换涉及 remount、系统分区写入和 Hiview 进程重启。执行前必须：

1. 通过 `hdc list targets -v` 确认唯一目标并使用 `-t`。
2. 检查设备目标路径、位数和原文件信息。
3. 保留原文件或具备可刷机恢复路径。
4. 推送后核对大小和 SHA-256，执行 `sync`。
5. 只重启受影响服务；无法可靠恢复时再考虑重启设备。

已有自动化脚本位于：

```text
specs/pipeline/20260707-thread-leak-detector/p4/deploy.sh
specs/pipeline/20260707-thread-leak-detector/p4/scenario.sh
```

脚本会修改系统库和持久参数，运行前必须审阅目标选择、路径和恢复逻辑，不能在未知设备上直接执行。

## 已有验证证据

### Phase 2：生产构建

- 命令：`./build.sh --product-name rk3568 --ccache --build-target hiview_package`
- 结果：`rk3568 build success`，依赖规则检查通过。
- 证据：[p2_gate_run.log](../../../../../../../../../pipeline/20260707-thread-leak-detector/p2_gate_run.log)

### Phase 3/5：UT

- `ThreadLeakDetectorUnitTest` 9/9 通过。
- 最新正式报告：2026-07-08 19:36:25，0 failure，0 error。
- 证据：[summary_report.xml](../../../../../../../../../pipeline/20260707-thread-leak-detector/evidence/phase5/summary_report.xml)

### Phase 4：真机

- host/device `libbdfr.z.so` SHA-256 一致：`074b8cd662b06311c1be4e8bf0d4eda481882be7fb9232cdf588bd8909d6f414`。
- 自定义场景临时设置 50/100 阈值，对 victim 完成 WARNING + FAULT 合并。
- gate verdict：PASS，包含 marker、runtime、e2e、artifact hash 和 uptime 单调性证明。
- 真实 2000/3000 阈值结论文件也保存在 evidence 中，WARNING 2101、FAULT 3101。
- 证据：[artifact_runtime_proof.txt](../../../../../../../../../pipeline/20260707-thread-leak-detector/evidence/phase4/artifact_runtime_proof.txt)
- 证据：[real_threshold_conclusion_full.txt](../../../../../../../../../pipeline/20260707-thread-leak-detector/evidence/phase4/real_threshold_conclusion_full.txt)

### Phase 5：质量

- 常态 65.1 秒采样：Hiview 全进程 CPU 约 0.138% 单核，RSS +4 KiB。
- 故障软老化：持续 4+ 轮询周期只生成 1 份结论，Hiview PID 不变，RSS 无持续增长。
- C++ 格式检查通过，外部评审报告 issue_count=0。
- 证据：[performance_report.md](../../../../../../../../../pipeline/20260707-thread-leak-detector/evidence/phase5/performance_report.md)
- 证据：[stability_report.md](../../../../../../../../../pipeline/20260707-thread-leak-detector/evidence/phase5/stability_report.md)

质量数据只证明已测场景，不覆盖长期磁盘增长、WARNING 区间重复重采集、多进程同时越阈值或 PID 复用。

### Phase 6：代码评审 CI

- PR：`openharmony/hiviewdfx_hiview` #4328。
- 当前提交：`a6624f1d25522aac18c59c22746cbbc16335026e`。
- 最终 gate：overall success，CI success，PR head 与本地提交一致。
- 本地保存的 2026-07-08 PR 元数据显示其为 open，标签为编译/静态检查/冒烟成功和 `waiting_for_review`；远端状态可能随后变化。
- 证据：[p6_verify_final.log](../../../../../../../../../pipeline/20260707-thread-leak-detector/p6_verify_final.log)

第一次 CI 曾因重复定义已有 `THREAD_LEAK` schema 失败；最终提交移除重复定义并通过。该历史可用于解释为何当前 diff 不包含 `hisysevent.yaml`。

## 常见故障定位

| 现象 | 优先检查 |
| --- | --- |
| 没有 `OnLoad` 日志 | `libbdfr.z.so` 是否为新产物；`bdfr_plugin_config` 是否部署；Hiview 是否加载该库 |
| 有加载、无轮询 | FFRT 任务是否启动；是否在长采集中阻塞；Hiview 是否正在卸载/重启 |
| victim 不触发 | 参数值、`focuspid`、`/proc/<pid>/status` 的 `Threads:`、PID 是否已退出 |
| 只有 WARNING tmp | 尚未达到 FAULT；FAULT 采集卡住；结论写入失败 |
| 结论缺 hidumper | hidumper SA 不可用、LoadSystemAbility 超时、IDumpBroker 参数不兼容 |
| 结论缺栈 | `DumpStacktrace` 失败、目标进程退出、权限或 faultloggerd 状态异常 |
| event 有路径但文件不存在 | 结论写入失败仍执行了事件上报，是当前已知失败路径问题 |
| 后台应用未查杀 | App Manager 未返回状态、bundleName 为空、应用被判定为前台/焦点态 |
| 重复生成大量文件 | 进程在 WARNING/FAULT 间跳变；FAULT episode 重置；缺少日志轮转 |
| Hiview 卸载慢 | poll task 正在采集或处于 30 秒不可中断 sleep |

## 回归最小集合

修改状态机或阈值：

```text
生产构建 + UT + warning->fault 真机场景
```

修改 collector、IPC 或栈抓取：

```text
生产构建 + UT + 模块测试构建 + 真机四章节内容检查
```

修改插件生命周期或并发：

```text
生产构建 + UT + Hiview 重启/卸载时延 + 多轮稳定性
```

修改日志和上报：

```text
生产构建 + UT + 写入失败注入 + 文件存在性/HiSysEvent 路径一致性 + 磁盘配额测试
```
