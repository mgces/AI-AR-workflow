#!/usr/bin/env bash
# P4 scenario: drive a real, staged thread-leak on the device so the detector exercises the full
# warning -> fault merge path. This script deliberately does NOT contain the runtime/e2e proof
# strings — those are emitted by the changed plugin code running inside hiview (runtime proof) and
# only after a full fault-path success (end-to-end proof). Its own success marker is emitted only
# after it has verified on-device that the conclusion log the plugin produced actually contains the
# merged WARNING + FAULT snapshots.
set -euo pipefail
S="${S:-$HOME/.claude/skills/ohos-ar-dev-phases/scripts}"
# shellcheck source=/dev/null
source "$S/lib/device.sh"

NONCE="${GATE_NONCE:?GATE_NONCE must be exported by the gate}"

# 1. Lower thresholds (warn 50 / fault 100) and clear stale logs.
dev_shell 'param set persist.hiviewdfx.threadleak.warn 50'
dev_shell 'param set persist.hiviewdfx.threadleak.fault 100'
dev_shell 'param set persist.hiviewdfx.threadleak.focuspid 0'
dev_shell 'rm -rf /data/log/reliability/resource_leak/thread_leak 2>/dev/null || true'

# 2. Launch the victim in a staged mode: first ~60 threads (warning band, held 40s so a poll writes
#    a WARNING tmp log), then it grows to ~150 threads (fault band) for the following poll.
dev_shell 'chmod 755 /data/local/tmp/thread_victim 2>/dev/null || true'
dev_shell '/data/local/tmp/thread_victim 150 120 60 40 >/data/local/tmp/victim.out 2>&1 &'
sleep 5
VPID="$(dev_shell 'pidof thread_victim' | tr -d "\r" | awk '{print $1}')"
echo "victim pid=$VPID"
dev_shell "param set persist.hiviewdfx.threadleak.focuspid ${VPID}"

# 3. Tie this run's nonce into the device hilog timeline on the thread-leak path.
dev_shell "log -t THREAD_LEAK_SCENARIO NONCE=${NONCE} victim=${VPID} START"

# 4. Wait through the warning poll, the growth to the fault band, and the fault poll (>= 2 cycles).
sleep 80

# 5. Verify on-device that a conclusion log exists AND that it merged a WARNING snapshot ahead of
#    the FAULT snapshot (the merge behaviour the review asked to see). Only then emit the marker.
CONCLUSION="$(dev_shell 'ls /data/log/reliability/resource_leak/thread_leak/*.txt 2>/dev/null' | tr -d "\r" | head -1)"
echo "conclusion file on device: ${CONCLUSION:-<none>}"
if [ -z "${CONCLUSION}" ]; then
    echo "no conclusion log produced" >&2
    exit 1
fi
HAS_WARN="$(dev_shell "grep -c 'WARNING SNAPSHOT' '${CONCLUSION}'" | tr -d "\r" | awk '{print $1}')"
HAS_FAULT="$(dev_shell "grep -c 'FAULT SNAPSHOT' '${CONCLUSION}'" | tr -d "\r" | awk '{print $1}')"
echo "merge check: WARNING sections=${HAS_WARN} FAULT sections=${HAS_FAULT}"
if [ "${HAS_WARN:-0}" -ge 1 ] && [ "${HAS_FAULT:-0}" -ge 1 ]; then
    dev_shell "log -t THREAD_LEAK_SCENARIO NONCE=${NONCE} THREAD_LEAK_P4_FUNC_OK merged conclusion=${CONCLUSION}"
else
    echo "conclusion did not contain merged warning+fault snapshots" >&2
    exit 1
fi

# Cleanup the victim (leave logs for evidence).
dev_shell 'kill -9 $(pidof thread_victim) 2>/dev/null || true'
echo "scenario done"
