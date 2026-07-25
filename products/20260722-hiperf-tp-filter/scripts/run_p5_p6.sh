#!/usr/bin/env bash
set -euo pipefail
export LIFECYCLE_SECRET_ROOT="${LIFECYCLE_SECRET_ROOT:-$HOME/.claude/.lifecycle-secret}"
export HDC_BIN="${HDC_BIN:-/home/lyk/env/bin/hdc}"
export HDC_WIN_PORT="${HDC_WIN_PORT:-10086}"
export DEVICE_SERIAL="${DEVICE_SERIAL:-7001005458323933328a00fce1903800}"
export OHOS_ROOT="${OHOS_ROOT:-/home/lyk/ohos/openharmony}"
export PATH="$OHOS_ROOT/prebuilts/clang/ohos/linux-x86_64/llvm/bin:$PATH"
PDIR="$OHOS_ROOT/specs/pipeline/20260722-hiperf-tp-filter"
S="$OHOS_ROOT/.cursor/skills/ohos-ar-dev-phases/scripts"
WF="$OHOS_ROOT/.cursor/skills/ohos-ar-dev-workflow/scripts"
LOG="$PDIR/evidence/run_p5_p6.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== P5 quality-verify $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
python3 "$S/gate_integration.py" --pipeline-dir "$PDIR" \
  --testtype UT --part hiperf --suites hiperf_unittest \
  --coverage-report "$PDIR/quality_reports/coverage_report.html" \
  --performance-report "$PDIR/quality_reports/performance_report.md" \
  --power-report "$PDIR/quality_reports/power_report.md" \
  --stability-report "$PDIR/quality_reports/stability_report.md"
python3 "$S/advance.py" --pipeline-dir "$PDIR" consent --phase 5 --token lyk
python3 "$S/advance.py" --pipeline-dir "$PDIR" advance --phase 5
python3 "$WF/render_report.py" --pipeline-dir "$PDIR" --kind quality || true

echo "=== P6 upload-review $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
python3 "$WF/render_report.py" --pipeline-dir "$PDIR" --kind summary || true
bash "$PDIR/scripts/p6_upload.sh" 825

echo "=== PIPELINE COMPLETE $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
python3 "$S/advance.py" --pipeline-dir "$PDIR" status
