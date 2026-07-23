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

CODEX_TARGET="$TMP_DIR/codex/skills"
AGENT_HOME="$TMP_DIR/codex" bash "$ROOT/sync-skills.sh" --agent codex >/dev/null
test -f "$CODEX_TARGET/ohos-ar-dev-workflow/SKILL.md"

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

echo "sync-skills.sh tests passed"
