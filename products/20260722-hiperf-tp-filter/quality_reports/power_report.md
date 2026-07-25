# hiperf --tp-filter 功耗影响（P5）

## 范围
`hiperf` 为按需调用的命令行工具，非常驻服务。`--tp-filter` 仅影响 `record` 启动阶段（解析 + ioctl），不增加后台采样线程或唤醒。

## 评估
- 无新增 SA/后台进程
- 无周期性 timer 或 wakelock 路径
- D1 真机 3s record 完成后进程退出

## 结论
相对基线 `hiperf record`（同 tracepoint / 同 `-d`），**预期无 measurable 持续功耗增量**；增量可忽略（一次性用户态 + 单次 ioctl）。
