# hiperf --tp-filter 性能影响（P5）

## 方法
- 设备：rk3568（HDC 172.22.208.1:10086）
- 命令：`hiperf record -e sched:sched_switch --tp-filter 'prev_comm != sleep' -a -d 3 -o /data/local/tmp/tp_filter_bench.data`
- 度量：主机侧 wall time（含 HDC + 3s 采样 + 落盘）

## 结果（2026-07-23）
| 项 | 值 |
|----|-----|
| 采样时长 | 3.0 s（配置） |
| 端到端 wall | ~5.86 s |
| perf.data 大小 | 2 528 855 bytes (~2.41 MB) |
| Sample records | 666 |

## 结论
`--tp-filter` 仅在 open/enable 前增加 filter 校验与 `PERF_EVENT_IOC_SET_FILTER`；3s tracepoint 采样耗时与无 filter 的同类 record 同量级，**无额外长驻开销**。
