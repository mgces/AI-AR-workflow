#!/bin/bash
# P6 scenario: drive all six device-case markers through the real plugin.
set -e
dev_shell "echo $GATE_NONCE resmon-start"
# Aggressive cloud config: short period, low temp threshold, default quota ->
# periodic / temp-trip / rolling markers fire within a few ticks.
dev_shell "mkdir -p /data/system/hiview"
cat > /tmp/resmon_aggr.json <<'CFG'
{
  "periodSec": 2, "topN": 5, "quotaFiles": 10, "retentionSec": 3600, "ringCapacity": 12,
  "procRoot": "/proc", "sysRoot": "/sys", "ionUsagePath": "", "mountPoints": ["/", "/data"],
  "periodicEnabled": true, "eventEnabled": true, "thresholdEnabled": true,
  "cpuThresholdPct": 15, "memAvailThresholdMB": 1, "tempThresholdC": 1,
  "debounce": 1, "minIntervalSec": 2,
  "events": [
    {"domain": "AAFWK", "name": "THREAD_BLOCK_3S", "kind": "freeze", "suffix": "freeze"},
    {"domain": "AAFWK", "name": "LIFECYCLE_HALF_TIMEOUT", "kind": "freeze", "suffix": "freeze"},
    {"domain": "POWER", "name": "SCREEN_ON", "kind": "GENERIC", "suffix": "screen"}
  ]
}
CFG
dev_send /tmp/resmon_aggr.json /data/system/hiview/resmon_config.json
sleep 30
# Real POWER.SCREEN_ON sys event -> event snapshot marker.
dev_shell "power-shell wakeup" || true
dev_shell "echo $GATE_NONCE resmon-cooldown"
sleep 20
# Deterministic CPU spike (busy core ~25% whole-machine on 4 cores > 15% threshold)
# late in the window so the enhanced snapshot file survives the quota rolling.
dev_shell "timeout 6 sh -c 'while :; do :; done'" || true
sleep 4
# Restore default behavior, then remove the cloud config file.
dev_send /tmp/resmon_default.json /data/system/hiview/resmon_config.json
sleep 8
dev_shell "rm -f /data/system/hiview/resmon_config.json"
dev_shell "echo $GATE_NONCE resmon-end"
