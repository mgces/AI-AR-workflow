# hiperf --tp-filter 稳定性（P5）

## 验证项
1. P4 `gate_device_func`：D1/D2/D3 契约 marker 3/3（nonce + sha256 一致），重复跑通（manifest seq 50）。
2. P3 设备 UT：`hiperf_unittest` 1311 cases，failures=0，连续门禁通过。
3. 本阶段复跑 UT（gate_integration）作为回归。

## 异常路径
- `HIPERF_TP_FILTER_NO_TRACEPOINT` / `HIPERF_TP_FILTER_NOT_TRACE`：命令失败且进程正常退出，无 crash/hung。

## 结论
**稳定性影响：无回归**；错误路径可预期失败，成功路径可重复 record。
