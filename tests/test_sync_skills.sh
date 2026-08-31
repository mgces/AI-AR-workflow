#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

TARGET="$TMP_DIR/agent/skills"

help_output="$(bash "$ROOT/sync-skills.sh" --help)"
grep -q -- "--target DIR" <<<"$help_output"
grep -q -- "--agent NAME" <<<"$help_output"

bash "$ROOT/sync-skills.sh" --agent custom-agent --target "$TARGET" >/dev/null
test -f "$TARGET/ohos-ar-dev-workflow/SKILL.md"
test -f "$TARGET/ohos-ar-dev-phases/scripts/advance.py"
test -f "$TARGET/ohos-req-intake-orchestration/SKILL.md"
test -f "$TARGET/ohos-req-intake-orchestration/reference/ar.md"
test -f "$TARGET/ohos-req-proposal-to-sr/SKILL.md"
test -f "$TARGET/ohos-ci-local-precheck/scripts/codearts_precheck.py"
test -f "$TARGET/ohos-test-xts/SKILL.md"
test -f "$TARGET/check-test-code-quality/scripts/main.py"
test -f "$TARGET/check-test-code-quality/tests/test_scanner_fail_closed.py"
test ! -e "$TARGET/check-test-code-quality/guides/R012_p7b_signature/signature_tools"
test -f "$TARGET/ohos-test-fuzz-generation/tools/fuzz_check.py"
test -f "$TARGET/ohos-test-coverage/SKILL.md"
test -f "$TARGET/ohos-doc-quality-check/SKILL.md"

CODEX_TARGET="$TMP_DIR/codex/skills"
AGENT_HOME="$TMP_DIR/codex" bash "$ROOT/sync-skills.sh" --agent codex >/dev/null
test -f "$CODEX_TARGET/ohos-ar-dev-workflow/SKILL.md"
test -f "$CODEX_TARGET/ohos-req-intake-orchestration/SKILL.md"

# An unrelated Agent skill must survive an update.
mkdir -p "$TARGET/unrelated-skill"
touch "$TARGET/unrelated-skill/SKILL.md"
bash "$ROOT/sync-skills.sh" --target "$TARGET" >/dev/null
test -f "$TARGET/unrelated-skill/SKILL.md"

before=0
bash "$ROOT/sync-skills.sh" --target "$TMP_DIR/dry-run-target" --dry-run >/dev/null
after=0
if [ -e "$TMP_DIR/dry-run-target" ]; then
  after="$(find "$TMP_DIR/dry-run-target" -mindepth 1 -print | wc -l)"
fi
test "$before" -eq 0
test "$after" -eq 0

secret_root="$(AGENT_SKILLS_DIR="$TARGET" PYTHONPATH="$TARGET/ohos-ar-dev-phases/scripts/lib" \
  python3 -c 'import gatelib; print(gatelib.SECRET_ROOT)')"
test "$secret_root" = "$TMP_DIR/agent/.lifecycle-secret"

# Workflow docs must use installed canonical skill names and the SDD bundle
# must not retain its old comparison-repository install source.
grep -q 'ohos-dev-cpp-coding-style' "$ROOT/skills/ohos-ar-dev-workflow/SKILL.md"
! grep -q 'openharmony-skills' "$ROOT/skills/ohos-req-intake-orchestration/SKILL.md"
! grep -q 'openharmony-skills' "$ROOT/skills/ohos-req-intake-orchestration/scripts/install_related_skills.py"

echo "sync-skills.sh tests passed"
