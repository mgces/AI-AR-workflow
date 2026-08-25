#!/bin/bash
# P7 device-side quality sampling on rk3568 (real measurements via hdc)
HDC_BIN=/home/qaq/openharmony/code/prebuilts/ohos-sdk/linux/26.0.0/toolchains/hdc
SER=7001005458323933328a01fce1fe3800
OUT=/home/qaq/openharmony/code/specs/pipeline/20260818-resource-reliability-monitor/quality_work
h() { $HDC_BIN -t "$SER" shell "$@"; }

PID=$(h pidof hiview | tr -d '\r\n ')
echo "hiview_pid=$PID"
[ -z "$PID" ] && { echo "FATAL: hiview not running"; exit 1; }

# baseline (t0)
h cat /proc/uptime                    > "$OUT/dev_uptime_t0.txt"
h cat /proc/$PID/stat                 > "$OUT/dev_hiview_stat_t0.txt"
h cat /proc/$PID/status               > "$OUT/dev_hiview_status_t0.txt"
h "ls /data/log/faultlog/ 2>/dev/null | wc -l"       > "$OUT/dev_faultlog_count_t0.txt"
h "ls /data/log/faultlog/temp/ 2>/dev/null | wc -l"  >> "$OUT/dev_faultlog_count_t0.txt"
h "find /data/log/reliability/resmon -type f 2>/dev/null | wc -l"        > "$OUT/dev_resmon_files_t0.txt"
h "du -k /data/log/reliability/resmon 2>/dev/null | tail -1"            >> "$OUT/dev_resmon_files_t0.txt"
h "cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null" > "$OUT/dev_thermal_t0.txt"

# 120s window, sample every 10s
: > "$OUT/dev_cpu_samples.txt"
for i in $(seq 0 12); do
  U=$(h cat /proc/uptime | awk '{print $1}')
  S=$(h cat /proc/$PID/stat | awk '{print $14+$15}')
  R=$(h cat /proc/$PID/status | grep VmRSS | awk '{print $2}')
  T=$(h cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
  echo "$i $U $S $R $T" >> "$OUT/dev_cpu_samples.txt"
  [ $i -lt 12 ] && sleep 10
done

# end (t1)
h cat /proc/uptime                    > "$OUT/dev_uptime_t1.txt"
h cat /proc/$PID/stat                 > "$OUT/dev_hiview_stat_t1.txt"
h cat /proc/$PID/status               > "$OUT/dev_hiview_status_t1.txt"
h "ls /data/log/faultlog/ 2>/dev/null | wc -l"       > "$OUT/dev_faultlog_count_t1.txt"
h "ls /data/log/faultlog/temp/ 2>/dev/null | wc -l"  >> "$OUT/dev_faultlog_count_t1.txt"
h "find /data/log/reliability/resmon -type f 2>/dev/null | wc -l"        > "$OUT/dev_resmon_files_t1.txt"
h "du -k /data/log/reliability/resmon 2>/dev/null | tail -1"            >> "$OUT/dev_resmon_files_t1.txt"
h pidof hiview                        > "$OUT/dev_hiview_alive_t1.txt"
# newest resmon file mtime proves landing continued through the window
h "ls -lt /data/log/reliability/resmon/cpu/ 2>/dev/null | head -3" > "$OUT/dev_resmon_latest.txt"
echo "sampling done"
