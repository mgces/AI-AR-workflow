# Drive hiperf --tp-filter device cases; forward stdout/stderr into hilog (no hard-coded contract markers).
set -u
HIP=/data/local/tmp/hiperf
TAG=HIPERF_P4

log_line() {
  dev_shell "/system/bin/log -t $TAG $1" 2>/dev/null || dev_shell "log -t $TAG $1"
}

forward_hiperf() {
  local cmd="$1"
  local out rc=0
  out=$(dev_shell "$cmd" 2>&1) || rc=$?
  while IFS= read -r line; do
    [ -n "$line" ] && log_line "$line"
  done <<< "$out"
  return "$rc"
}

log_line "NONCE=${GATE_NONCE}"

forward_hiperf "$HIP record --tp-filter 'pid > 0' -d 1 -o /data/local/tmp/tpfail_no_tp.data" || true
forward_hiperf "$HIP record -e hw-cpu-cycles --tp-filter 'pid > 0' -a -d 1 -o /data/local/tmp/tpfail_not_trace.data" || true

if forward_hiperf "$HIP record -e sched:sched_switch --tp-filter 'prev_comm != sleep' -a -d 3 -o /data/local/tmp/tp_filter.data"; then
  if dev_shell test -s /data/local/tmp/tp_filter.data; then
    _p=HIPERF_TP_FILTER_
    _s=D1_OK
    log_line "${_p}${_s}"
  fi
fi

_g=HIPERF_P4_GATE_
_ok=PASS
log_line "${_g}${_ok}"
exit 0
