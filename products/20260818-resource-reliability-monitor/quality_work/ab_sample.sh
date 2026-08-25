#!/bin/bash
HDC_BIN=/home/qaq/openharmony/code/prebuilts/ohos-sdk/linux/26.0.0/toolchains/hdc
SER=7001005458323933328a01fce1fe3800
QW=/home/qaq/openharmony/code/specs/pipeline/20260818-resource-reliability-monitor/quality_work
h() { $HDC_BIN -t "$SER" shell "$@"; }
PID=$(h pidof hiview | tr -d '\r\n ')
echo "hiview_pid=$PID"

sample_window() { # $1 = output file
  : > "$1"
  for i in $(seq 0 12); do
    U=$(h cat /proc/uptime | awk '{print $1}')
    S=$(h cat /proc/$PID/stat | awk '{print $14+$15}')
    R=$(h cat /proc/$PID/status | grep VmRSS | awk '{print $2}')
    T=$(h cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
    echo "$i $U $S $R $T" >> "$1"
    [ $i -lt 12 ] && sleep 10
  done
}

# --- window B: resmon OFF ---
$HDC_BIN -t "$SER" file send $QW/resmon_cfg_off.json /data/system/hiview/resmon_config.json
sleep 12   # wait >= 1 tick for hot-reload to apply
h "find /data/log/reliability/resmon -type f | wc -l" > $QW/ab_files_off_start.txt
sample_window $QW/ab_cpu_off.txt
h "find /data/log/reliability/resmon -type f | wc -l" > $QW/ab_files_off_end.txt

# --- window A: resmon ON (restore) ---
$HDC_BIN -t "$SER" file send $QW/resmon_cfg_on.json /data/system/hiview/resmon_config.json
sleep 12
h "find /data/log/reliability/resmon -type f | wc -l" > $QW/ab_files_on_start.txt
sample_window $QW/ab_cpu_on.txt
h "find /data/log/reliability/resmon -type f | wc -l" > $QW/ab_files_on_end.txt
h pidof hiview > $QW/ab_hiview_alive.txt
echo "AB sampling done"
$HDC_BIN -t "$SER" shell "rm -f /data/system/hiview/resmon_config.json"
