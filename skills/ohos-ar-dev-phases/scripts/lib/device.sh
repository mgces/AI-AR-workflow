#!/usr/bin/env bash
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
#
# device.sh — portable hdc helpers, sourced by gate scripts.
#
# Nothing machine-specific is hardcoded. Connection + device are resolved at
# runtime from the environment, in this order of preference:
#
#   hdc binary :  $HDC_BIN  ->  `hdc` on PATH  ->  ~/.local/hdc/hdc
#   server     :  $HDC_HOST_OVERRIDE (host:port)            # explicit
#              :  else if $HDC_WIN_PORT set: <WSL default-gateway IP>:$HDC_WIN_PORT
#              :  else: native hdc (USB / local daemon, no -s)
#   device     :  $DEVICE_SERIAL                            # explicit
#              :  else: the single Connected target from `hdc list targets`
#                       (fails if zero or more-than-one — caller must configure)
#
# So: native USB Linux works out-of-the-box; a WSL->Windows hdc bridge works by
# exporting HDC_WIN_PORT=10086; any host/port/serial can be pinned via env.

HDC_BIN="${HDC_BIN:-$(command -v hdc 2>/dev/null || echo "$HOME/.local/hdc/hdc")}"
HDC_WIN_PORT="${HDC_WIN_PORT:-}"
HDC_HOST_OVERRIDE="${HDC_HOST_OVERRIDE:-}"
DEVICE_SERIAL="${DEVICE_SERIAL:-}"

# Emit the "-s host:port" server args (empty for native hdc).
_hdc_server_args() {
  if [ -n "$HDC_HOST_OVERRIDE" ]; then
    printf -- '-s %s' "$HDC_HOST_OVERRIDE"
  elif [ -n "$HDC_WIN_PORT" ]; then
    local ip
    ip="$(ip route show default 2>/dev/null | awk '{print $3; exit}')"
    [ -n "$ip" ] && printf -- '-s %s:%s' "$ip" "$HDC_WIN_PORT"
  fi
}

# Raw hdc with the resolved server args.
hdcw() {
  # shellcheck disable=SC2046
  "$HDC_BIN" $(_hdc_server_args) "$@"
}

# Print the connect-key list (one per line), blanks/placeholders stripped.
dev_list_targets() {
  hdcw list targets 2>/dev/null | tr -d '\r' \
    | grep -viE 'empty|^\[empty\]' | awk 'NF'
}

# Resolve the device serial: explicit env, else the unique connected target.
# Exit 0 + print serial on success; exit 3 (none) / 4 (multiple) on failure.
dev_serial() {
  if [ -n "$DEVICE_SERIAL" ]; then echo "$DEVICE_SERIAL"; return 0; fi
  local list n
  list="$(dev_list_targets)"
  n="$(printf '%s\n' "$list" | awk 'NF' | wc -l | tr -d ' ')"
  if [ "$n" = "1" ]; then printf '%s\n' "$list"; return 0; fi
  if [ "$n" = "0" ]; then return 3; fi
  return 4
}

# Run a device shell command, pinning -t to the resolved serial so a stale
# extra target can never silently receive a mutating command.
dev_shell() {
  local s
  s="$(dev_serial)" || { echo "device-not-unique (set DEVICE_SERIAL)" >&2; return 3; }
  hdcw -t "$s" shell "$@"
}

dev_send() { local s; s="$(dev_serial)" || return 3; hdcw -t "$s" file send "$1" "$2"; }
dev_recv() { local s; s="$(dev_serial)" || return 3; hdcw -t "$s" file recv "$1" "$2"; }

# Confirm a uniquely-identified device is reachable. Prints the serial on success.
dev_assert_online() {
  local s
  if ! s="$(dev_serial)"; then
    echo "no unique device reachable via $(_hdc_server_args || echo 'native hdc'); "\
"set DEVICE_SERIAL or fix the connection" >&2
    return 1
  fi
  local got
  got="$(hdcw -t "$s" shell 'echo __DEV_OK__' 2>/dev/null | tr -d '\r')"
  case "$got" in
    *__DEV_OK__*) echo "$s"; return 0 ;;
    *) echo "device $s not responding to shell" >&2; return 1 ;;
  esac
}

# Monotonic boot anchor (device RTC is unreliable; uptime is not).
dev_uptime() { dev_shell 'cat /proc/uptime' | tr -d '\r' | awk '{print $1}'; }

# Host-observed device wall-clock in hilog's "MM-DD HH:MM:SS.mmm" shape. hilog
# stamps its lines from CLOCK_REALTIME and so does `date`, so three host-controlled
# reads of this clock bracket exactly the lines hilog emitted between them — the
# same trigger-window guarantee the old injected fence lines gave, but without a
# device `log` command (OHOS ships hilog, not the Android `log`). The RTC may be
# wrong in absolute terms; we only require it be internally consistent during the
# run. hdc shell returns rc=0 even when `date` is absent, so the caller validates
# the OUTPUT SHAPE (a real timestamp) rather than the exit code.
dev_now() { dev_shell 'date +"%m-%d %H:%M:%S.%N"' | tr -d '\r'; }

# Remount / as rw for /system writes (rooted board).
dev_remount_rw() { dev_shell 'mount -o remount,rw /'; }
