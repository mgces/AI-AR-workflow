#!/usr/bin/env bash
# Poll PR #1062 CI until green on current head, then run P6 gate.
set -euo pipefail
export LIFECYCLE_SECRET_ROOT="${LIFECYCLE_SECRET_ROOT:-$HOME/.claude/.lifecycle-secret}"
export OHOS_ROOT="${OHOS_ROOT:-/home/lyk/ohos/openharmony}"
export PATH="$OHOS_ROOT/prebuilts/clang/ohos/linux-x86_64/llvm/bin:$PATH"
export HDC_BIN="${HDC_BIN:-/home/lyk/env/bin/hdc}"
export HDC_WIN_PORT="${HDC_WIN_PORT:-10086}"
export DEVICE_SERIAL="${DEVICE_SERIAL:-7001005458323933328a00fce1903800}"
PDIR="$OHOS_ROOT/specs/pipeline/20260722-hiperf-tp-filter"
CI_SCRIPT="$OHOS_ROOT/.cursor/skills/ohos-ci-openharmony-ci-analysis/scripts/openharmony_ci.py"
GDIR="$OHOS_ROOT/developtools/hiperf"
LOG="$PDIR/evidence/poll_ci_p6.log"
STALE_EVENT="6a62cfd664650f998b91a786"
EXPECTED_HEAD="$(git -C "$GDIR" rev-parse HEAD)"
MAX_POLLS=120   # ~2h at 60s interval
INTERVAL=60

exec > >(tee -a "$LOG") 2>&1
echo "=== CI poll start $(date -u +%Y-%m-%dT%H:%M:%SZ) expected_head=${EXPECTED_HEAD:0:12} ==="

for ((i=1; i<=MAX_POLLS; i++)); do
  json=$(python3 "$CI_SCRIPT" --pr 1062 --repo openharmony/developtools_hiperf --json 2>/dev/null || echo '{}')
  read -r event overall ts end_ts pr_head <<< "$(python3 - <<PY
import json, subprocess, sys
d=json.loads('''$json'''.replace("''","\\'"))
pr=subprocess.check_output(['oh-gc','pr','view','1062','--repo','openharmony/developtools_hiperf','--json'], text=True)
head=json.loads(pr).get('head',{}).get('sha','')
print(d.get('event_id',''), d.get('overall_result',''), d.get('timestamp',''), d.get('end_timestamp',''), head[:12])
PY
)"
  echo "[poll $i/$(date -u +%H:%M:%S)] event=$event overall=$overall ts=$ts end=$end_ts pr_head=$pr_head"

  if [[ "$event" == "$STALE_EVENT" ]]; then
    sleep "$INTERVAL"
    continue
  fi

  if [[ "$overall" == "running" || "$overall" == "pending" || -z "$end_ts" || "$end_ts" == "None" ]]; then
    sleep "$INTERVAL"
    continue
  fi

  if [[ "$overall" == "success" || "$overall" == "passed" ]]; then
    if [[ "${pr_head,,}" != "${EXPECTED_HEAD:0:12}" ]]; then
      echo "WARN: CI green but pr_head=$pr_head != expected ${EXPECTED_HEAD:0:12}; waiting..."
      sleep "$INTERVAL"
      continue
    fi
    echo "=== CI GREEN event=$event — running P6 $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
    bash "$PDIR/scripts/p6_upload.sh" 825
    echo "=== P6 COMPLETE $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
    exit 0
  fi

  if [[ "$overall" == "failed" ]]; then
    echo "=== CI FAILED on new event $event — stopping poll ==="
    python3 "$CI_SCRIPT" --pr 1062 --repo openharmony/developtools_hiperf --json > "$PDIR/evidence/phase6/ci_poll_failed.json" 2>/dev/null || true
    exit 1
  fi

  sleep "$INTERVAL"
done

echo "=== CI poll timeout after $MAX_POLLS attempts ==="
exit 2
