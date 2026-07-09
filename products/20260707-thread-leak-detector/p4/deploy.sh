#!/usr/bin/env bash
# P4 deploy: push the freshly built bdfr shared library (which now statically links the
# thread_leak_detector plugin) and the updated plugin config to the device, then restart hiview so
# the new plugin is loaded. Uses the portable device.sh helpers (no hardcoded serial/host).
set -euo pipefail
S="${S:-$HOME/.claude/skills/ohos-ar-dev-phases/scripts}"
# shellcheck source=/dev/null
source "$S/lib/device.sh"

OHOS_ROOT="${OHOS_ROOT:-$(pwd)}"
HOST_LIB="$OHOS_ROOT/out/rk3568/hiviewdfx/hiview/libbdfr.z.so"
HOST_CFG="$OHOS_ROOT/out/rk3568/obj/base/hiviewdfx/hiview/plugins/plugin_build/bdfr_plugin_config"

dev_remount_rw
dev_send "$HOST_LIB" /system/lib/libbdfr.z.so
dev_send "$HOST_CFG" /system/etc/hiview/bdfr_plugin_config
dev_shell 'restorecon /system/lib/libbdfr.z.so /system/etc/hiview/bdfr_plugin_config 2>/dev/null || true'

# Restart hiview so it reloads plugins from the updated library/config.
dev_shell 'kill -9 $(pidof hiview) 2>/dev/null || true'
sleep 3
dev_shell 'pidof hiview'
echo "deploy done"
