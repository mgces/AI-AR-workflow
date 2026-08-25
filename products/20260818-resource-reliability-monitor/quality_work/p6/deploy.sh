#!/bin/bash
# P6 deploy: install the freshly built libresmon.z.so and restart hiview so the
# new code path is the one under test.
set -e
dev_remount_rw
dev_send /home/qaq/openharmony/code/out/rk3568/hiviewdfx/hiview/libresmon.z.so /system/lib/libresmon.z.so
dev_shell "sync"
# remove any stale cloud config so the plugin boots with /system defaults
dev_shell "rm -f /data/system/hiview/resmon_config.json"
# restart hiview (init respawns it) to load the new .so
dev_shell "kill \$(pidof hiview) 2>/dev/null" || true
sleep 8
dev_shell "pidof hiview"
