# thread_leak_detector 稳定性影响报告 (P5)

## 方法
真机 rk3568 上做软老化(soak):将阈值临时降至 warning 50 / fault 100,启动一个 150 线程的
victim 进程并将检测器 focuspid 指向它,持续 ~135s(4+ 个 30s 轮询周期),观测:
(1) hiview 是否崩溃/重启;(2) 一次性触发去重是否生效;(3) hiview RSS 是否稳定。

## 实测数据
- hiview 进程存活: 老化前后同为 **pid 5637**,且与本阶段性能采样为同一 pid ——
  整个 P5 阶段(含多次触发)**无崩溃、无重启**。
- 一次性去重: 4+ 个轮询周期内 victim 持续处于故障带,`data/log/reliability/resource_leak/thread_leak`
  下**仅生成 1 份结论文件**(期望=1),`faultReported` 去重逻辑正确,未产生重复抓取风暴。
- VmRSS: 35852 KB(常态)→ 35912 KB(触发后),增量 +60 KB(一次性抓取 hidumper/文本栈的缓冲,
  随后稳定),无持续增长趋势。
- 死进程清理: victim 退出后 `focuspid` 归零、`trackMap_` 经 `CleanupDeadProcesses` 清理,无残留。

## 结论
连续多周期触发场景下 hiview 稳定无崩溃;一次性去重防止了重复抓取风暴;RSS 无持续增长,
对系统稳定性无负面影响。
