#!/usr/bin/env bash
# P6 upload after: oh-gc auth login --token <GITCODE_PAT>
set -euo pipefail
export OHOS_ROOT="${OHOS_ROOT:-/home/lyk/ohos/openharmony}"
export PATH="$OHOS_ROOT/prebuilts/clang/ohos/linux-x86_64/llvm/bin:$PATH"
PDIR="/home/lyk/ohos/openharmony/specs/pipeline/20260722-hiperf-tp-filter"
SCRIPTS="/home/lyk/ohos/openharmony/.cursor/skills/ohos-ar-dev-phases/scripts"
GDIR="/home/lyk/ohos/openharmony/developtools/hiperf"
ISSUE="${1:?usage: p6_upload.sh <issue_number>}"

git -C "$GDIR" remote get-url origin >/dev/null 2>&1 || \
  git -C "$GDIR" remote add origin git@gitcode.com:meteors117/developtools_hiperf.git

# gate_upload 要求 push 前 pipeline.json 里已有 phase-6 consent 占位；
# 正式 consent 在 gate PASS 后重新绑定 P6 证据再 advance。
python3 << PY
import sys
sys.path.insert(0, "$SCRIPTS/lib")
import gatelib as gl
pdir = "$PDIR"
state = gl.load_state(pdir)
ok, _, ev5 = gl.validate_closing_entry(pdir, 5)
if not ok:
    sys.exit("P5 PASS evidence missing")
rec = gl.make_consent_record(state["run_id"], 6, "lyk", gl.entry_id(ev5))
state.setdefault("consent_tokens", {})["6"] = rec
gl.save_state(pdir, state)
print("pre-upload consent stamp (gate push gate)")
PY

python3 "$SCRIPTS/gate_upload_ci.py" --pipeline-dir "$PDIR" \
  --repo-slug openharmony/developtools_hiperf \
  --branch feature/hiperf-tp-filter --base master \
  --head-owner meteors117 \
  --title "hiperf: add --tp-filter for tracepoint sampling" \
  --issue "$ISSUE" --pr 1062 --allow-push \
  --local-review-report "$PDIR/evidence/phase6_prep/local_code_review.txt" \
  --pr-review-report "$PDIR/evidence/phase6_prep/pr_review.json"

python3 "$SCRIPTS/advance.py" --pipeline-dir "$PDIR" consent --phase 6 --token lyk
python3 "$SCRIPTS/advance.py" --pipeline-dir "$PDIR" advance --phase 6
python3 "$SCRIPTS/advance.py" --pipeline-dir "$PDIR" status
